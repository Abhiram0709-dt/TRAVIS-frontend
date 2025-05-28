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

# Set device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load dataset
df = pd.read_csv("cleaned_paraphrased_answers.csv")

# ---------------- Tokenizer ---------------- #
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

# ---------------- Dataset ---------------- #
class QADataset(Dataset):
    def __init__(self, src_texts, tgt_texts, intents, src_tok, tgt_tok, max_len=120):
        self.src = [src_tok.encode(q, intent_label=cls)[:max_len] for q, cls in zip(src_texts, intents)]
        self.tgt = [tgt_tok.encode(t)[:max_len] for t in tgt_texts]

    def __len__(self):
        return len(self.src)

    def __getitem__(self, idx):
        return torch.tensor(self.src[idx]), torch.tensor(self.tgt[idx])

def pad_collate(batch):
    src_batch, tgt_batch = zip(*batch)
    src_padded = nn.utils.rnn.pad_sequence(src_batch, padding_value=0, batch_first=True)
    tgt_padded = nn.utils.rnn.pad_sequence(tgt_batch, padding_value=0, batch_first=True)
    return src_padded, tgt_padded

# ---------------- Data Preparation ---------------- #
train_df, val_df = train_test_split(df, test_size=0.1, random_state=42)
train_src = [f"<intent_{intent.lower()}> | {question}" for question, intent in zip(train_df['question'], train_df['intent'])]
val_src = [f"<intent_{intent.lower()}> | {question}" for question, intent in zip(val_df['question'], val_df['intent'])]
train_tgt = train_df['cleaned_answer'].tolist()
val_tgt = val_df['cleaned_answer'].tolist()

src_tokenizer = Tokenizer(train_src)
tgt_tokenizer = Tokenizer(train_tgt)
train_dataset = QADataset(train_src, train_tgt, train_df['intent'], src_tokenizer, tgt_tokenizer)
val_dataset = QADataset(val_src, val_tgt, val_df['intent'], src_tokenizer, tgt_tokenizer)
train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, collate_fn=pad_collate)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, collate_fn=pad_collate)

# ---------------- Model ---------------- #
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

# ---------------- Load Model ---------------- #
model = TransformerQA(src_tokenizer.vocab_size(), tgt_tokenizer.vocab_size()).to(device)
model.load_state_dict(torch.load('models/best_model.pt', map_location=device))
model.eval()


# ---------------- Beam Search ---------------- #
def generate_answer(model, question, intent, max_len=125, beam_size=3):
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

def clean_answer(answer):
    return answer.replace("<sos>", "").replace("<eos>", "").strip()

def remove_repeated_steps(answer):
    lines = answer.strip().split('\n')
    seen = set()
    result = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            result.append(line)
    return '\n'.join(result)


# ---------------- Load Classifier Once ---------------- #
embedder = SentenceTransformer('sentence_transformer_model')
label_encoder = joblib.load("models\label_encoder.pkl")
intent_classifier = joblib.load("models\intent_classifier.pkl")

def predict_intent(question):
    embedding = embedder.encode([question])
    pred_label_idx = intent_classifier.predict(embedding)[0]
    return label_encoder.inverse_transform([pred_label_idx])[0]

