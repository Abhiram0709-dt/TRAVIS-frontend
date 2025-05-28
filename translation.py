# FULL OFFLINE TRANSLATION EXECUTION CODE
# No training, only loading the pre-trained .pth model and running inference

import torch
import re
import math
import os
import torch.nn as nn
from collections import Counter

# Special tokens
PAD_TOKEN = "<pad>"
SOS_TOKEN = "<sos>"
EOS_TOKEN = "<eos>"
UNK_TOKEN = "<unk>"
SPECIAL_TOKENS = [PAD_TOKEN, SOS_TOKEN, EOS_TOKEN, UNK_TOKEN]

# Use CUDA if available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ------------------ Tokenizer and Vocab ------------------
def load_data(path):
    english_sentences = []
    telugu_sentences = []
    if not os.path.exists(path):
        print(f"Error: Data file not found at {path}")
        return [], []
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("++++$++++")
            if len(parts) == 2:
                en, te = parts
                english_sentences.append(tokenize(en, 'en'))
                telugu_sentences.append(tokenize(te, 'te'))
    return english_sentences, telugu_sentences

def tokenize(sentence, language='en'):
    sentence = sentence.lower().strip()
    sentence = re.sub(r"([?.!,¿])", r" \1 ", sentence)
    sentence = re.sub(r'[" "]+', " ", sentence)
    if language == 'en':
        sentence = re.sub(r"[^a-zA-Z0-9'\-?.!,¿]+", " ", sentence)
    else:
        sentence = re.sub(r"[^\u0C00-\u0C7F0-9'\-?.!,¿ ]+", " ", sentence)
    return sentence.strip().split()

def build_vocab(sentences, max_vocab_size=10000):
    counter = Counter()
    for sentence in sentences:
        counter.update(sentence)
    most_common = counter.most_common(max_vocab_size - len(SPECIAL_TOKENS))
    idx2word = SPECIAL_TOKENS + [word for word, _ in most_common]
    word2idx = {word: idx for idx, word in enumerate(idx2word)}
    return word2idx, idx2word

def sentence_to_indices(sentence, word2idx, max_len, add_sos_eos=True):
    idxs = [word2idx.get(word, word2idx[UNK_TOKEN]) for word in sentence]
    if add_sos_eos:
        idxs = [word2idx[SOS_TOKEN]] + idxs + [word2idx[EOS_TOKEN]]
    if len(idxs) < max_len:
        idxs += [word2idx[PAD_TOKEN]] * (max_len - len(idxs))
    else:
        idxs = idxs[:max_len]
    return idxs

def tokenize_sentence(sentence, word2idx, lang='en', max_len=250):
    tokens = tokenize(sentence, lang)
    ids = sentence_to_indices(tokens, word2idx, max_len)
    return torch.tensor(ids).unsqueeze(0)

# ------------------ Transformer Model ------------------
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]

def scaled_dot_product(q, k, v, mask=None):
    d_k = q.size(-1)
    scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    attn = torch.softmax(scores, dim=-1)
    return torch.matmul(attn, v), attn

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        assert d_model % num_heads == 0
        self.d_k = d_model // num_heads
        self.num_heads = num_heads
        self.q_linear = nn.Linear(d_model, d_model)
        self.k_linear = nn.Linear(d_model, d_model)
        self.v_linear = nn.Linear(d_model, d_model)
        self.out = nn.Linear(d_model, d_model)

    def forward(self, q, k, v, mask=None):
        bs = q.size(0)
        q = self.q_linear(q).view(bs, -1, self.num_heads, self.d_k).transpose(1,2)
        k = self.k_linear(k).view(bs, -1, self.num_heads, self.d_k).transpose(1,2)
        v = self.v_linear(v).view(bs, -1, self.num_heads, self.d_k).transpose(1,2)
        scores, _ = scaled_dot_product(q, k, v, mask)
        concat = scores.transpose(1,2).contiguous().view(bs, -1, self.num_heads * self.d_k)
        return self.out(concat)

class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff=2048):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)

    def forward(self, x):
        return self.linear2(torch.relu(self.linear1(x)))

class EncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(d_model, num_heads)
        self.ff = FeedForward(d_model, d_ff)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, mask):
        x = self.norm1(x + self.dropout(self.attn(x, x, x, mask)))
        x = self.norm2(x + self.dropout(self.ff(x)))
        return x

class DecoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.self_attn = MultiHeadAttention(d_model, num_heads)
        self.enc_dec_attn = MultiHeadAttention(d_model, num_heads)
        self.ff = FeedForward(d_model, d_ff)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, enc_out, src_mask, tgt_mask):
        x = self.norm1(x + self.dropout(self.self_attn(x, x, x, tgt_mask)))
        x = self.norm2(x + self.dropout(self.enc_dec_attn(x, enc_out, enc_out, src_mask)))
        x = self.norm3(x + self.dropout(self.ff(x)))
        return x

class Transformer(nn.Module):
    def __init__(self, src_vocab_size, tgt_vocab_size, d_model=512, num_heads=8, num_layers=6, d_ff=2048, dropout=0.1, max_len=250):
        super().__init__()
        self.src_embed = nn.Embedding(src_vocab_size, d_model)
        self.tgt_embed = nn.Embedding(tgt_vocab_size, d_model)
        self.pos_enc = PositionalEncoding(d_model, max_len)
        self.encoder_layers = nn.ModuleList([EncoderLayer(d_model, num_heads, d_ff, dropout) for _ in range(num_layers)])
        self.decoder_layers = nn.ModuleList([DecoderLayer(d_model, num_heads, d_ff, dropout) for _ in range(num_layers)])
        self.fc_out = nn.Linear(d_model, tgt_vocab_size)

    def encode(self, src, src_mask):
        x = self.pos_enc(self.src_embed(src))
        for layer in self.encoder_layers:
            x = layer(x, src_mask)
        return x

    def decode(self, tgt, enc_out, src_mask, tgt_mask):
        x = self.pos_enc(self.tgt_embed(tgt))
        for layer in self.decoder_layers:
            x = layer(x, enc_out, src_mask, tgt_mask)
        return x

    def forward(self, src, tgt, src_mask, tgt_mask):
        return self.fc_out(self.decode(tgt, self.encode(src, src_mask), src_mask, tgt_mask))

# ------------------ Mask Utilities ------------------
def create_padding_mask(seq, pad_idx):
    return (seq != pad_idx).unsqueeze(1).unsqueeze(2)

def create_look_ahead_mask(size):
    return torch.triu(torch.ones((size, size)), diagonal=1).type(torch.bool)

def create_target_mask(tgt_seq, pad_idx):
    tgt_pad_mask = create_padding_mask(tgt_seq, pad_idx)
    look_ahead_mask = create_look_ahead_mask(tgt_seq.size(1)).to(tgt_seq.device)
    return tgt_pad_mask & ~look_ahead_mask.unsqueeze(0).unsqueeze(1)

# ------------------ Greedy Decode ------------------
def greedy_decode(model, sentence, word2idx_en, word2idx_te, idx2word_te, max_len=250, device='cpu'):
    model.eval()
    src = tokenize_sentence(sentence, word2idx_en, 'en', max_len).to(device)
    src_mask = create_padding_mask(src, word2idx_en[PAD_TOKEN]).to(device)
    enc_output = model.encode(src, src_mask)
    tgt_indices = [word2idx_te[SOS_TOKEN]]
    for _ in range(max_len):
        tgt_tensor = torch.tensor(tgt_indices).unsqueeze(0).to(device)
        tgt_mask = create_target_mask(tgt_tensor, word2idx_te[PAD_TOKEN]).to(device)
        output = model.decode(tgt_tensor, enc_output, src_mask, tgt_mask)
        prediction = model.fc_out(output)
        next_token = prediction[:, -1, :].argmax(dim=-1).item()
        if next_token == word2idx_te[EOS_TOKEN]:
            break
        tgt_indices.append(next_token)
    translated = [idx2word_te[idx] if idx < len(idx2word_te) else UNK_TOKEN for idx in tgt_indices[1:]]
    return " ".join(translated)

# ------------------ Load Model and Translate ------------------
en_sentences, te_sentences = load_data("OneLineAns.txt")
word2idx_en, idx2word_en = build_vocab(en_sentences)
word2idx_te, idx2word_te = build_vocab(te_sentences)

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

translate_model.load_state_dict(torch.load("transformer_en_te.pth", map_location=device))
translate_model.eval()

