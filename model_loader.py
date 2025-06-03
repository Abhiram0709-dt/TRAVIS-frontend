import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import math
from collections import Counter
from sklearn.model_selection import train_test_split
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import joblib
import logging
import os
from translation import load_data, build_vocab, Transformer

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Global variables to store loaded models and components
model = None
src_tokenizer = None
tgt_tokenizer = None
embedder = None
label_encoder = None
intent_classifier = None
translate_model = None
word2idx_en = None
word2idx_te = None
idx2word_te = None

# Dataset paths
DATASET_PATHS = {
    'qa': "cleaned_paraphrased_answers.csv",
    'translation': "OneLineAns.txt",  # This file exists in root directory
    'intent': "intent_dataset.csv"
}

# Model paths
MODEL_PATHS = {
    'qa': 'models/best_model.pt',
    'translation': 'transformer_en_te.pth',  # This file exists in root directory
    'intent_classifier': 'models/intent_classifier.pkl',
    'label_encoder': 'models/label_encoder.pkl',
    'sentence_transformer': 'sentence_transformer_model'
}

class QADataset(Dataset):
    def __init__(self, questions, answers, intents, src_tokenizer, tgt_tokenizer):
        self.questions = questions
        self.answers = answers
        self.intents = intents
        self.src_tokenizer = src_tokenizer
        self.tgt_tokenizer = tgt_tokenizer

    def __len__(self):
        return len(self.questions)

    def __getitem__(self, idx):
        question = self.questions[idx]
        answer = self.answers[idx]
        intent = self.intents[idx]
        
        src = self.src_tokenizer.encode(question, intent_label=intent)
        tgt = self.tgt_tokenizer.encode(answer)
        
        return {
            'src': torch.tensor(src),
            'tgt': torch.tensor(tgt),
            'intent': intent
        }

def load_qa_dataset():
    """Load and preprocess the QA dataset"""
    try:
        df = pd.read_csv(DATASET_PATHS['qa'])
        train_df, val_df = train_test_split(df, test_size=0.1, random_state=42)
        
        # Initialize tokenizers
        train_src = [f"<intent_{intent.lower()}> | {question}" 
                    for question, intent in zip(train_df['question'], train_df['intent'])]
        train_tgt = train_df['cleaned_answer'].tolist()
        
        src_tokenizer = Tokenizer(train_src)
        tgt_tokenizer = Tokenizer(train_tgt)
        
        # Create datasets
        train_dataset = QADataset(
            train_df['question'].tolist(),
            train_df['cleaned_answer'].tolist(),
            train_df['intent'].tolist(),
            src_tokenizer,
            tgt_tokenizer
        )
        
        val_dataset = QADataset(
            val_df['question'].tolist(),
            val_df['cleaned_answer'].tolist(),
            val_df['intent'].tolist(),
            src_tokenizer,
            tgt_tokenizer
        )
        
        return train_dataset, val_dataset, src_tokenizer, tgt_tokenizer
    except Exception as e:
        logger.error(f"Error loading QA dataset: {str(e)}")
        raise

def load_translation_dataset():
    """Load and preprocess the translation dataset"""
    try:
        logger.info("Loading translation dataset...")
        en_sentences, te_sentences = load_data(DATASET_PATHS['translation'])
        logger.info(f"Loaded {len(en_sentences)} translation pairs")
        
        # Build vocabulary
        word2idx_en, idx2word_en = build_vocab(en_sentences)
        word2idx_te, idx2word_te = build_vocab(te_sentences)
        
        logger.info(f"Built English vocabulary with {len(word2idx_en)} words")
        logger.info(f"Built Telugu vocabulary with {len(word2idx_te)} words")
        
        # Verify vocabulary
        if len(word2idx_en) == 0 or len(word2idx_te) == 0:
            raise ValueError("Empty vocabulary built from translation dataset")
        
        return en_sentences, te_sentences, word2idx_en, word2idx_te, idx2word_te
    except Exception as e:
        logger.error(f"Error loading translation dataset: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

def load_models():
    """Load all models and components"""
    global model, src_tokenizer, tgt_tokenizer, embedder, label_encoder, intent_classifier
    global translate_model, word2idx_en, word2idx_te, idx2word_te
    
    try:
        # Load QA components
        train_dataset, val_dataset, src_tokenizer, tgt_tokenizer = load_qa_dataset()
        model = TransformerQA(src_tokenizer.vocab_size(), tgt_tokenizer.vocab_size()).to(device)
        model.load_state_dict(torch.load(MODEL_PATHS['qa'], map_location=device))
        model.eval()
        logger.info("QA model loaded successfully")
        
        # Load intent classification components
        embedder = SentenceTransformer(MODEL_PATHS['sentence_transformer'])
        label_encoder = joblib.load(MODEL_PATHS['label_encoder'])
        intent_classifier = joblib.load(MODEL_PATHS['intent_classifier'])
        logger.info("Intent classification models loaded successfully")
        
        # Load translation components
        logger.info("Loading translation components...")
        
        # Load translation dataset and build vocabulary
        en_sentences, te_sentences, word2idx_en, word2idx_te, idx2word_te = load_translation_dataset()
        logger.info(f"Loaded translation dataset with {len(en_sentences)} pairs")
        
        # Initialize translation model
        logger.info("Initializing translation model...")
        translate_model = Transformer(
            src_vocab_size=len(word2idx_en),
            tgt_vocab_size=len(word2idx_te),
            d_model=512,
            num_heads=8,
            num_layers=6,
            d_ff=2048,
            dropout=0.1,
            max_len=250
        ).to(device)
        
        # Load model weights
        logger.info("Loading translation model weights...")
        translate_model.load_state_dict(torch.load(MODEL_PATHS['translation'], map_location=device))
        translate_model.eval()
        
        # Verify model and vocabulary
        logger.info("Translation model loaded successfully")
        logger.info(f"Translation vocabulary sizes - English: {len(word2idx_en)}, Telugu: {len(word2idx_te)}")
        
        # Verify global variables are set
        logger.info("Verifying translation components:")
        logger.info(f"translate_model: {translate_model is not None}")
        logger.info(f"word2idx_en: {word2idx_en is not None}")
        logger.info(f"word2idx_te: {word2idx_te is not None}")
        logger.info(f"idx2word_te: {idx2word_te is not None}")
        
        return model  # Return the loaded model
        
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

# Tokenizer class
class Tokenizer:
    def __init__(self, texts, min_freq=1):
        tokens = [t.lower().split() for t in texts]
        counter = Counter(word for sent in tokens for word in sent)
        self.word2idx = {"<pad>": 0, "<sos>": 1, "<eos>": 2, "<unk>": 3}
        for word, freq in counter.items():
            if freq >= min_freq:
                self.word2idx[word] = len(self.word2idx)
        self.idx2word = {i: w for w, i in self.word2idx.items()}

    def encode(self, text, intent_label=None, add_special=True):
        if intent_label:
            text = f"<intent_{intent_label.lower()}> | {text}"
        tokens = text.lower().split()
        if add_special:
            tokens = ['<sos>'] + tokens + ['<eos>']
        return [self.word2idx.get(w, self.word2idx["<unk>"]) for w in tokens]

    def decode(self, indices):
        words = [self.idx2word.get(i, '<unk>') for i in indices]
        return ' '.join(words).replace('<eos>', '').replace('<pad>', '').strip()

    def vocab_size(self):
        return len(self.word2idx)

# Transformer model classes
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(0, max_len).unsqueeze(1)
        div = torch.exp(torch.arange(0, d_model, 2) * -math.log(10000.0) / d_model)
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.pe = pe.unsqueeze(0)

    def forward(self, x):
        return x + self.pe[:, :x.size(1)].to(x.device)

class TransformerQA(nn.Module):
    def __init__(self, src_vocab, tgt_vocab, d_model=384, nhead=6, num_layers=4):
        super().__init__()
        self.src_embed = nn.Embedding(src_vocab, d_model)
        self.tgt_embed = nn.Embedding(tgt_vocab, d_model)
        self.pos_enc = PositionalEncoding(d_model)
        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_layers,
            num_decoder_layers=num_layers,
            batch_first=True
        )
        self.fc_out = nn.Linear(d_model, tgt_vocab)

    def forward(self, src, tgt):
        src_pad_mask = (src == 0)
        tgt_pad_mask = (tgt == 0)
        tgt_mask = self._generate_square_subsequent_mask(tgt.size(1)).to(tgt.device)

        src_embed = self.pos_enc(self.src_embed(src))
        tgt_embed = self.pos_enc(self.tgt_embed(tgt))

        out = self.transformer(
            src_embed, tgt_embed,
            src_key_padding_mask=src_pad_mask,
            tgt_key_padding_mask=tgt_pad_mask,
            tgt_mask=tgt_mask
        )
        return self.fc_out(out)

    def _generate_square_subsequent_mask(self, sz):
        return torch.triu(torch.ones(sz, sz) * float('-inf'), diagonal=1)

def generate_answer(question, intent, max_len=125, beam_size=3):
    """Generate answer using the loaded model"""
    global model, src_tokenizer, tgt_tokenizer
    
    if model is None or src_tokenizer is None or tgt_tokenizer is None:
        raise RuntimeError("Models not initialized. Call initialize_models() first.")
    
    model.eval()
    input_ids = torch.tensor(src_tokenizer.encode(question, intent_label=intent)).unsqueeze(0).to(device)
    sequences = [(torch.tensor([[tgt_tokenizer.word2idx['<sos>']]], device=device), 0)]

    for _ in range(max_len):
        all_candidates = []
        for seq, score in sequences:
            out = model(input_ids, seq)
            logits = out[:, -1, :]
            probs = F.log_softmax(logits, dim=-1)
            topv, topi = probs.topk(beam_size)

            for i in range(beam_size):
                token = topi[0][i].item()
                new_seq = torch.cat([seq, torch.tensor([[token]], device=device)], dim=1)
                new_score = score + topv[0][i].item()
                all_candidates.append((new_seq, new_score))

        ordered = sorted(all_candidates, key=lambda tup: tup[1], reverse=True)
        sequences = ordered[:beam_size]
        if sequences[0][0][0, -1].item() == tgt_tokenizer.word2idx["<eos>"]:
            break

    best_seq = sequences[0][0].squeeze(0).tolist()
    if best_seq[-1] != tgt_tokenizer.word2idx["<eos>"]:
        best_seq.append(tgt_tokenizer.word2idx["<eos>"])
    return tgt_tokenizer.decode(best_seq)

def predict_intent(question):
    """Predict intent using the loaded classifier"""
    global embedder, label_encoder, intent_classifier
    
    if embedder is None or label_encoder is None or intent_classifier is None:
        print("Intent classification not available. Using default intent.")
        return "general"  # Return a default intent
    
    embedding = embedder.encode([question])
    pred_label_idx = intent_classifier.predict(embedding)[0]
    return label_encoder.inverse_transform([pred_label_idx])[0]

def clean_answer(answer):
    """Clean the generated answer"""
    return answer.replace("<sos>", "").replace("<eos>", "").strip()

def remove_repeated_steps(answer):
    """Remove repeated steps from the answer"""
    lines = answer.strip().split('\n')
    seen = set()
    result = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            result.append(line)
    return '\n'.join(result)

def greedy_decode(model, sentence, word2idx_en, word2idx_te, idx2word_te, max_len=250, device='cpu'):
    model.eval()
    src = tokenize_sentence(sentence, word2idx_en, 'en', max_len).to(device)
    src_mask = create_padding_mask(src, word2idx_en[PAD_TOKEN]).to(device)
    enc_output = model.encode(src, src_mask)
    tgt_indices = [word2idx_te[SOS_TOKEN]]
    
    for _ in range(max_len):
        tgt_tensor = torch.tensor(tgt_indices).unsqueeze(0).to(device)
        tgt_mask = create_target_mask(tgt_tensor, word2idx_te[PAD_TOKEN]).to(device)
        
        with torch.no_grad():
            out = model.decode(tgt_tensor, enc_output, src_mask, tgt_mask)
            out = model.fc_out(out)
            next_token = torch.argmax(out[:, -1, :], dim=-1)
            tgt_indices.append(next_token.item())
            
            if next_token.item() == word2idx_te[EOS_TOKEN]:
                break
    
    return ' '.join([idx2word_te[idx] for idx in tgt_indices[1:-1]])

def get_translation_components():
    """Get the translation components, ensuring they are loaded"""
    global translate_model, word2idx_en, word2idx_te, idx2word_te
    
    # If components are not loaded, load them
    if translate_model is None or word2idx_en is None or word2idx_te is None or idx2word_te is None:
        logger.info("Translation components not loaded, loading now...")
        load_models()
    
    # Verify components are loaded
    if translate_model is None or word2idx_en is None or word2idx_te is None or idx2word_te is None:
        raise ValueError("Failed to load translation components")
    
    logger.info("Translation components loaded successfully")
    return translate_model, word2idx_en, word2idx_te, idx2word_te 