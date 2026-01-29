#!/usr/bin/env python3
"""
Generate assets for the Dictée app.

This script reads words from words_of_week.txt and generates:
- Kid-friendly French sentences using Google Gemini
- Audio files for words and sentences using Google Cloud TTS
- Images representing the sentences using Google Gemini (Imagen)

Usage:
    pip install -r requirements.txt
    export GOOGLE_API_KEY=your_api_key
    python generate_assets.py
"""

import os
import json
import base64
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_DIR / "public"
AUDIO_DIR = PUBLIC_DIR / "audio"
IMAGES_DIR = PUBLIC_DIR / "images"
WORDS_FILE = PUBLIC_DIR / "words_of_week.txt"
MANIFEST_FILE = PUBLIC_DIR / "manifest.json"

# Ensure directories exist
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)


def read_words() -> list[str]:
    """Read words from the words file."""
    if not WORDS_FILE.exists():
        raise FileNotFoundError(f"Words file not found: {WORDS_FILE}")

    with open(WORDS_FILE, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]

    # Remove duplicates while preserving order
    seen = set()
    unique_words = []
    for word in words:
        if word.lower() not in seen:
            seen.add(word.lower())
            unique_words.append(word)

    return unique_words


def generate_sentence(word: str) -> str:
    """Generate a kid-friendly French sentence using the word."""
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = f"""Create a simple, kid-friendly French sentence using the word "{word}".

Requirements:
- The sentence should be appropriate for a 7-year-old child
- Use simple vocabulary and grammar
- The sentence should be fun or interesting for a child
- Keep it short (5-10 words maximum)
- The word "{word}" must appear in the sentence exactly as written

Return ONLY the French sentence, nothing else."""

    response = model.generate_content(prompt)
    sentence = response.text.strip()

    # Remove quotes if present
    if sentence.startswith('"') and sentence.endswith('"'):
        sentence = sentence[1:-1]
    if sentence.startswith("'") and sentence.endswith("'"):
        sentence = sentence[1:-1]

    return sentence


def generate_audio_tts(text: str, output_path: Path, slow: bool = False) -> bool:
    """Generate audio using Google Cloud TTS REST API."""
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_API_KEY}"

    # Use a French voice
    payload = {
        "input": {"text": text},
        "voice": {
            "languageCode": "fr-FR",
            "name": "fr-FR-Wavenet-A",  # Female French voice
            "ssmlGender": "FEMALE"
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": 0.85 if slow else 0.95,  # Slightly slower for kids
            "pitch": 0.0
        }
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()

        audio_content = response.json().get("audioContent")
        if audio_content:
            audio_bytes = base64.b64decode(audio_content)
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
            return True
    except requests.exceptions.RequestException as e:
        print(f"  TTS API error: {e}")
        return False

    return False


def generate_image(sentence: str, word: str, output_path: Path) -> bool:
    """Generate an image representing the sentence using Gemini."""
    try:
        # Use Imagen 3 through the Gemini API
        model = genai.ImageGenerationModel("imagen-3.0-generate-002")

        prompt = f"""Create a colorful, child-friendly illustration for a French learning app.

The image should represent this French sentence: "{sentence}"
The key word is: "{word}"

Style requirements:
- Bright, cheerful colors
- Simple, cartoon-like illustration style suitable for children aged 7
- No text in the image
- Safe and appropriate for young children
- Clear and easy to understand visual"""

        result = model.generate_images(
            prompt=prompt,
            number_of_images=1,
            aspect_ratio="1:1",
            safety_filter_level="block_most",
            person_generation="dont_allow"
        )

        if result.images:
            # Save the image
            image = result.images[0]
            image._pil_image.save(output_path, "PNG")
            return True

    except Exception as e:
        print(f"  Image generation error: {e}")
        # Create a placeholder - we'll continue without the image
        return False

    return False


def process_word(word: str) -> dict:
    """Process a single word and generate all assets."""
    print(f"\nProcessing: {word}")

    result = {
        "id": word,
        "text": word,
    }

    # Generate sentence
    print(f"  Generating sentence...")
    try:
        sentence = generate_sentence(word)
        result["sentence"] = sentence
        print(f"  Sentence: {sentence}")
    except Exception as e:
        print(f"  Error generating sentence: {e}")
        result["sentence"] = f"Le mot est {word}."  # Fallback

    # Generate word audio
    word_audio_path = AUDIO_DIR / f"{word}_word.mp3"
    print(f"  Generating word audio...")
    if generate_audio_tts(word, word_audio_path, slow=True):
        result["audioWord"] = f"/audio/{word}_word.mp3"
        print(f"  Word audio saved: {word_audio_path.name}")
    else:
        print(f"  Failed to generate word audio")

    # Generate sentence audio
    sentence_audio_path = AUDIO_DIR / f"{word}_sentence.mp3"
    print(f"  Generating sentence audio...")
    if generate_audio_tts(result.get("sentence", word), sentence_audio_path):
        result["audioSentence"] = f"/audio/{word}_sentence.mp3"
        print(f"  Sentence audio saved: {sentence_audio_path.name}")
    else:
        print(f"  Failed to generate sentence audio")

    # Generate image
    image_path = IMAGES_DIR / f"{word}.png"
    print(f"  Generating image...")
    if generate_image(result.get("sentence", word), word, image_path):
        result["image"] = f"/images/{word}.png"
        print(f"  Image saved: {image_path.name}")
    else:
        print(f"  Failed to generate image (continuing without it)")

    return result


def main():
    """Main function to generate all assets."""
    print("=" * 50)
    print("Dictée Asset Generator")
    print("=" * 50)

    # Read words
    words = read_words()
    print(f"\nFound {len(words)} words to process:")
    for word in words:
        print(f"  - {word}")

    # Process each word
    results = []
    for word in words:
        result = process_word(word)
        results.append(result)

    # Generate manifest
    manifest = {
        "generatedAt": datetime.now().isoformat(),
        "words": results
    }

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print(f"Generated manifest: {MANIFEST_FILE}")
    print(f"Total words processed: {len(results)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
