import torch
import torch.nn as nn
import torch.nn.functional as F
from sentence_transformers import SentenceTransformer
import joblib
from answer_generator import TransformerQA, Tokenizer, QADataset, pad_collate
import pandas as pd
from sklearn.model_selection import train_test_split
from translation import load_translation_model, load_vocabularies
import os
import requests
import gdown

class ModelCache:
    def __init__(self):
        self.model = None
        self.embedder = None
        self.label_encoder = None
        self.intent_classifier = None
        self.src_tokenizer = None
        self.tgt_tokenizer = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Translation components
        self.translate_model = None
        self.word2idx_en = None
        self.word2idx_te = None
        self.idx2word_te = None

        # Download only missing models
        self.download_missing_models()

    def download_missing_models(self):
        # Create necessary directories
        os.makedirs('models', exist_ok=True)
        os.makedirs('sentence_transformer_model', exist_ok=True)
        
        # Only download missing files
        missing_files = {
            'transformer_en_te.pth': 'YOUR_GOOGLE_DRIVE_URL_FOR_TRANSFORMER',
            'sentence_transformer_model/model.safetensors': 'YOUR_GOOGLE_DRIVE_URL_FOR_SAFETENSORS'
        }
        
        # Download only if files don't exist
        for file_path, url in missing_files.items():
            if not os.path.exists(file_path):
                print(f"Downloading missing file: {file_path}...")
                try:
                    # Create directory if it doesn't exist
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    gdown.download(url, file_path, quiet=False)
                except Exception as e:
                    print(f"Error downloading {file_path}: {str(e)}")
                    raise

    def get_model(self, model_name):
        if model_name not in self.models:
            if model_name == 'sentence_transformer':
                self.models[model_name] = SentenceTransformer('sentence_transformer_model')
            elif model_name == 'transformer':
                self.models[model_name] = torch.load('transformer_en_te.pth', map_location=self.device)
            # Add other model loading logic here
        return self.models[model_name]

    def load_models(self):
        """Load all models and components"""
        print("Loading models...")
        
        # Load dataset for tokenizers
        df = pd.read_csv("cleaned_paraphrased_answers.csv")
        train_df, val_df = train_test_split(df, test_size=0.1, random_state=42)
        
        # Prepare data for tokenizers
        train_src = [f"<intent_{intent.lower()}> | {question}" for question, intent in zip(train_df['question'], train_df['intent'])]
        train_tgt = train_df['cleaned_answer'].tolist()
        
        # Initialize tokenizers
        self.src_tokenizer = Tokenizer(train_src)
        self.tgt_tokenizer = Tokenizer(train_tgt)
        
        # Load QA model
        self.model = TransformerQA(self.src_tokenizer.vocab_size(), self.tgt_tokenizer.vocab_size()).to(self.device)
        self.model.load_state_dict(torch.load('models/best_model.pt', map_location=self.device))
        self.model.eval()
        
        # Load intent classification components
        self.embedder = SentenceTransformer('sentence_transformer_model')
        self.label_encoder = joblib.load("models/label_encoder.pkl")
        self.intent_classifier = joblib.load("models/intent_classifier.pkl")
        
        # Load translation model and vocabularies
        print("Loading translation model...")
        self.translate_model = torch.load('transformer_en_te.pth', map_location=self.device)
        self.word2idx_en, self.word2idx_te, self.idx2word_te = load_vocabularies()
        
        print("All models loaded successfully!")

    def generate_answer(self, question, intent, max_len=125, beam_size=3):
        """Generate answer using cached model"""
        self.model.eval()
        input_ids = torch.tensor(self.src_tokenizer.encode(question, intent_label=intent)).unsqueeze(0).to(self.device)
        sequences = [(torch.tensor([[self.tgt_tokenizer.word2idx['<sos>']]], device=self.device), 0)]

        for _ in range(max_len):
            all_candidates = []
            for seq, score in sequences:
                out = self.model(input_ids, seq)
                logits = out[:, -1, :]
                probs = F.log_softmax(logits, dim=-1)
                topv, topi = probs.topk(beam_size)

                for i in range(beam_size):
                    token = topi[0][i].item()
                    new_seq = torch.cat([seq, torch.tensor([[token]], device=self.device)], dim=1)
                    new_score = score + topv[0][i].item()
                    all_candidates.append((new_seq, new_score))

            ordered = sorted(all_candidates, key=lambda tup: tup[1], reverse=True)
            sequences = ordered[:beam_size]
            if sequences[0][0][0, -1].item() == self.tgt_tokenizer.word2idx["<eos>"]:
                break

        best_seq = sequences[0][0].squeeze(0).tolist()
        if best_seq[-1] != self.tgt_tokenizer.word2idx["<eos>"]:
            best_seq.append(self.tgt_tokenizer.word2idx["<eos>"])
        return self.tgt_tokenizer.decode(best_seq)

    def predict_intent(self, question):
        """Predict intent using cached models"""
        embedding = self.embedder.encode([question], show_progress_bar=False)
        pred_label_idx = self.intent_classifier.predict(embedding)[0]
        return self.label_encoder.inverse_transform([pred_label_idx])[0]

    def translate_text(self, text):
        """Translate text using cached translation model"""
        from translation import greedy_decode
        return greedy_decode(self.translate_model, text, self.word2idx_en, self.word2idx_te, self.idx2word_te)

# Create a global instance
model_cache = ModelCache() 