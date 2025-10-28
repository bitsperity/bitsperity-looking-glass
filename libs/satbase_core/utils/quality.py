"""
Content Quality Scoring für News-Artikel.

Basiert auf wissenschaftlichen Metriken (Kohlschütter et al., Dragnet, Trafilatura).
Erkennt Boilerplate, Junk, Paywalls ohne ML.
"""
from __future__ import annotations
import re


BOILERPLATE_PHRASES = [
    "skip to", "sign in", "log in", "log out", "subscribe", "register",
    "contact us", "privacy policy", "terms of service", "cookie policy",
    "all rights reserved", "©", "powered by", "share this", "follow us",
    "newsletter", "trending now", "most popular", "recommended for you",
    "advertisement", "sponsored content", "read more", "load more",
]


def calculate_quality_score(text: str) -> dict:
    """
    Berechnet Quality Score (0.0-1.0) für Text-Content.
    
    Returns:
        {
            "score": float,  # 0.0 (worst) - 1.0 (best)
            "metrics": {...},
            "verdict": "good" | "unsure" | "junk"
        }
    """
    if not text or len(text.strip()) < 50:
        return {"score": 0.0, "metrics": {}, "verdict": "junk"}
    
    text = text.strip()
    text_lower = text.lower()
    
    # === METRIC 1: Length ===
    char_count = len(text)
    word_count = len(text.split())
    
    # === METRIC 2: Paragraph Count ===
    # Heuristic: Split on double newlines or long spacing
    paragraphs = [p for p in re.split(r'\n\s*\n', text) if len(p.strip()) > 30]
    paragraph_count = len(paragraphs)
    avg_paragraph_length = char_count / max(paragraph_count, 1)
    
    # === METRIC 3: Sentence Count ===
    sentences = re.split(r'[.!?]+\s', text)
    sentence_count = len([s for s in sentences if len(s.strip()) > 10])
    avg_words_per_sentence = word_count / max(sentence_count, 1)
    
    # === METRIC 4: Stopword Ratio (English, approximation) ===
    STOPWORDS = set([
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
        "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
        "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
        "or", "an", "will", "my", "one", "all", "would", "there", "their", "what"
    ])
    words_lower = [w.strip(",.!?;:\"'") for w in text_lower.split()]
    stopword_count = sum(1 for w in words_lower if w in STOPWORDS)
    stopword_ratio = stopword_count / max(word_count, 1)
    
    # === METRIC 5: Token Diversity ===
    unique_words = set(words_lower)
    token_diversity = len(unique_words) / max(word_count, 1)
    
    # === METRIC 6: Boilerplate Phrase Count ===
    boilerplate_count = sum(1 for phrase in BOILERPLATE_PHRASES if phrase in text_lower)
    
    # === METRIC 7: Link-like Text (heuristic for "Click here", URLs, etc.) ===
    # Count words that look like navigation: "home", "menu", "search", "contact", etc.
    nav_keywords = ["home", "menu", "search", "contact", "about", "services", "products", "blog"]
    nav_count = sum(1 for kw in nav_keywords if f" {kw} " in text_lower)
    
    # === METRIC 8: Repetition (same sentence multiple times?) ===
    sentence_set = set(s.strip().lower() for s in sentences if len(s.strip()) > 20)
    repetition_ratio = 1.0 - (len(sentence_set) / max(sentence_count, 1))
    
    # === NORMALIZE TO SCORES (0-1, higher = better) ===
    scores = {}
    
    # Length score (optimal: 500-5000 chars)
    if char_count < 200:
        scores['length'] = char_count / 200
    elif char_count > 10000:
        scores['length'] = 1.0 - min((char_count - 10000) / 10000, 0.5)
    else:
        scores['length'] = 1.0
    
    # Paragraph score (optimal: 3-20 paragraphs)
    scores['paragraphs'] = min(paragraph_count / 5, 1.0)
    
    # Avg paragraph length (optimal: 150-500 chars)
    if avg_paragraph_length < 80:
        scores['para_length'] = avg_paragraph_length / 80
    elif avg_paragraph_length > 800:
        scores['para_length'] = 0.7
    else:
        scores['para_length'] = 1.0
    
    # Sentence score (optimal: 5-50 sentences)
    scores['sentences'] = min(sentence_count / 8, 1.0)
    
    # Avg words per sentence (optimal: 12-25)
    if avg_words_per_sentence < 8:
        scores['avg_words'] = avg_words_per_sentence / 8
    elif avg_words_per_sentence > 35:
        scores['avg_words'] = 0.6
    else:
        scores['avg_words'] = 1.0
    
    # Stopword ratio (optimal: 0.35-0.55)
    scores['stopwords'] = 1.0 - abs(0.45 - stopword_ratio) / 0.45
    scores['stopwords'] = max(0.0, min(scores['stopwords'], 1.0))
    
    # Token diversity (optimal: >0.4)
    scores['diversity'] = min(token_diversity / 0.5, 1.0)
    
    # Boilerplate phrases (penalty: 0-10 phrases)
    scores['boilerplate'] = 1.0 - min(boilerplate_count / 10, 1.0)
    
    # Navigation keywords (penalty)
    scores['navigation'] = 1.0 - min(nav_count / 8, 1.0)
    
    # Repetition penalty
    scores['repetition'] = 1.0 - repetition_ratio
    
    # === WEIGHTED FINAL SCORE ===
    weights = {
        'boilerplate': 0.25,    # Strongest signal
        'paragraphs': 0.15,
        'sentences': 0.12,
        'stopwords': 0.12,
        'diversity': 0.10,
        'navigation': 0.10,
        'length': 0.08,
        'para_length': 0.05,
        'avg_words': 0.05,
        'repetition': 0.08,
    }
    
    final_score = sum(scores[k] * weights[k] for k in weights)
    
    # === VERDICT ===
    if final_score >= 0.55:
        verdict = "good"
    elif final_score >= 0.35:
        verdict = "unsure"
    else:
        verdict = "junk"
    
    return {
        "score": round(final_score, 3),
        "verdict": verdict,
        "metrics": {
            "char_count": char_count,
            "word_count": word_count,
            "paragraph_count": paragraph_count,
            "sentence_count": sentence_count,
            "stopword_ratio": round(stopword_ratio, 3),
            "token_diversity": round(token_diversity, 3),
            "boilerplate_count": boilerplate_count,
            "nav_count": nav_count,
            "repetition_ratio": round(repetition_ratio, 3),
        },
        "scores": {k: round(v, 3) for k, v in scores.items()}
    }

