"""
AI Content Generation Services for Nexora's Living AI System.

Supports multiple LLM providers:
  1. Groq (FREE — 30 RPM, 14K RPD) — recommended default
  2. Gemini (FREE — 15 RPM, rate-limited)

Also uses Unsplash for images.
Each bot has a unique personality that shapes their content.

Setup:
  Add to .env:  GROQ_API_KEY=gsk_xxxx   (get free at console.groq.com)
  Or keep:      GEMINI_API_KEY=AIzaxxxx  (fallback)
"""
import random
import logging
import time
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# API endpoints
GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
UNSPLASH_URL = 'https://api.unsplash.com/photos/random'


def _call_groq(prompt, max_tokens=300):
    """Call Groq API (OpenAI-compatible, FREE tier: 30 RPM)."""
    api_key = getattr(settings, 'GROQ_API_KEY', None) or ''
    if not api_key:
        return None

    for attempt in range(3):
        try:
            resp = requests.post(
                GROQ_URL,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'llama-3.1-8b-instant',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': max_tokens,
                    'temperature': 0.9,
                },
                timeout=30,
            )
            if resp.status_code == 429:
                wait = (attempt + 1) * 3
                logger.info(f'Groq rate limited, waiting {wait}s')
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.error(f'Groq API error: {e}')
            if attempt < 2:
                time.sleep(2)
    return None


def _call_gemini(prompt, max_tokens=300):
    """Call Gemini API (FREE tier: 15 RPM)."""
    api_key = getattr(settings, 'GEMINI_API_KEY', None) or ''
    if not api_key:
        return None

    for attempt in range(3):
        try:
            resp = requests.post(
                f'{GEMINI_URL}?key={api_key}',
                json={
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {'maxOutputTokens': max_tokens, 'temperature': 0.9},
                },
                timeout=30,
            )
            if resp.status_code == 429:
                wait = (attempt + 1) * 5
                logger.info(f'Gemini rate limited, waiting {wait}s')
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            time.sleep(2)
            return data['candidates'][0]['content']['parts'][0]['text'].strip()
        except Exception as e:
            logger.error(f'Gemini API error: {e}')
            if attempt < 2:
                time.sleep(3)
    return None


def call_llm(prompt, max_tokens=300):
    """
    Call the best available LLM provider.
    Priority: Groq (free, fast) → Gemini (free, slower) → None
    """
    # Try Groq first (better free tier)
    result = _call_groq(prompt, max_tokens)
    if result:
        return result

    # Fallback to Gemini
    result = _call_gemini(prompt, max_tokens)
    if result:
        return result

    logger.warning('No LLM provider available (set GROQ_API_KEY or GEMINI_API_KEY)')
    return None


def get_unsplash_image(query):
    """Fetch a random image URL from Unsplash matching the query."""
    key = getattr(settings, 'UNSPLASH_ACCESS_KEY', None) or ''
    if not key:
        return None

    try:
        resp = requests.get(UNSPLASH_URL, params={
            'query': query, 'orientation': 'landscape', 'client_id': key,
        }, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get('urls', {}).get('regular')
    except Exception as e:
        logger.error(f'Unsplash API error: {e}')
        return None


# ═══════════════════════════════════════════════════════════════
# Content Generators
# ═══════════════════════════════════════════════════════════════

def generate_social_post(personality):
    """Generate a social feed post in the bot's voice."""
    topics = [
        'a coding tip you learned today',
        'something you\'re building right now',
        'a mistake you made and what you learned',
        'a question for the community',
        'something you find cool about programming',
        'a motivational message for fellow coders',
        'a fun fact about your favorite language',
        'your opinion on a coding debate',
    ]
    topic = random.choice(topics)

    prompt = f"""{personality.personality_prompt}

Write a short social media post (under 200 characters) about: {topic}

Rules:
- Be authentic to your personality
- Keep it casual but interesting
- Include 1-2 relevant emojis
- Don't use hashtags
- Make it feel real, not AI-generated
- Just return the post text, nothing else"""

    return call_llm(prompt, max_tokens=100)


def generate_blog_post(personality):
    """Generate a blog post in the bot's voice."""
    if personality.bot_role == 'teacher':
        topics = [
            f'A beginner-friendly tutorial on {personality.specialty}',
            f'Common mistakes in {personality.teaches_subject}',
            f'How to think like a programmer: {personality.specialty} edition',
            f'5 tips for mastering {personality.teaches_subject}',
            f'Step-by-step: solving a {personality.quiz_difficulty} {personality.teaches_subject} problem',
        ]
    else:
        topics = [
            f'My journey learning {personality.specialty}',
            f'Cool things I built with {personality.specialty.split(",")[0].strip()}',
            f'Tips and tricks for {personality.specialty.split(",")[0].strip()} developers',
            f'What I wish I knew when starting {personality.specialty.split(",")[0].strip()}',
            f'How {personality.specialty.split(",")[0].strip()} changed the way I code',
        ]

    topic = random.choice(topics)

    prompt = f"""{personality.personality_prompt}

Write a blog post about: {topic}

Format:
- Title on the first line (no # symbol)
- Then a blank line
- Then 3-5 paragraphs of content
- Include code examples if relevant (use ``` for code blocks)
- Keep it under 800 words
- Make it educational and engaging
- Write in your unique voice"""

    text = call_llm(prompt, max_tokens=1000)
    if not text:
        return None, None

    lines = text.strip().split('\n', 1)
    title = lines[0].strip().strip('#').strip()
    content = lines[1].strip() if len(lines) > 1 else text

    return title, content


def generate_comment(personality, post_content):
    """Generate a comment on someone else's post."""
    prompt = f"""{personality.personality_prompt}

Someone posted this on the social feed:
"{post_content[:200]}"

Write a short, authentic comment (under 100 characters). Be supportive, add value, or ask a thoughtful question. Stay in character. Just return the comment text."""

    return call_llm(prompt, max_tokens=60)


def generate_quiz_question(personality, subject, difficulty):
    """Generate a quiz question for teacher bots."""
    prompt = f"""{personality.personality_prompt}

Create a coding quiz question about {subject} at {difficulty} difficulty.

Return in this EXACT format (one question):
QUESTION: [the question]
A) [option a]
B) [option b]
C) [option c]
D) [option d]
ANSWER: [correct letter]
EXPLANATION: [brief explanation]"""

    return call_llm(prompt, max_tokens=300)
