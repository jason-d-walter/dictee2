#!/usr/bin/env python3
"""
Generate assets for the Dictée app.

This script reads words from words_of_week.txt and generates:
- Kid-friendly French sentences using Google Gemini
- Audio files for words and sentences using Google Cloud TTS
- Images representing the sentences using Google Gemini (Imagen)

Usage:
    pip install -r requirements.txt
    export GOOGLE_PROJECT_NAME=project_name
    python generate_assets.py --sounds ez --week-start 2026-02-09 --week-end 2026-02-12
"""

import os
import json
import base64
import argparse
import time
import requests
import yaml
from pathlib import Path
from datetime import datetime, date
from dotenv import load_dotenv

from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# Load environment variables
load_dotenv()

# Configuration
GOOGLE_PROJECT_NAME = os.getenv("GOOGLE_PROJECT_NAME")
if not GOOGLE_PROJECT_NAME:
    raise ValueError("GOOGLE_PROJECT_NAME environment variable is required")

language_model = "gemini-2.5-flash"
image_model = "imagen-3.0-generate-002"
speech_model= "gemini-2.5-flash-tts"

# 1. Setup the Client for Vertex AI
# Ensure you have 'GOOGLE_CLOUD_PROJECT' set in your environment
client = genai.Client(
    vertexai=True,
    project=GOOGLE_PROJECT_NAME,
    location="us-central1"
)

# Paths (base paths, week_path applied dynamically)
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_DIR / "public"
METADATA_FILE = PUBLIC_DIR / "metadata.yaml"

# Rate limiting for image generation
last_image_time = 0
image_rate_limit = 60  # seconds between image requests (default: 1 per minute)


def read_words(words_file: Path) -> list[str]:
    """Read words from the words file."""
    if not words_file.exists():
        raise FileNotFoundError(f"Words file not found: {words_file}")

    with open(words_file, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]

    # Remove duplicates while preserving order
    seen = set()
    unique_words = []
    for word in words:
        if word.lower() not in seen:
            seen.add(word.lower())
            unique_words.append(word)

    return unique_words


def load_existing_manifest(manifest_file: Path) -> dict:
    """Load existing manifest and return a dict keyed by word text."""
    if not manifest_file.exists():
        return {}

    try:
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return {w["text"]: w for w in manifest.get("words", [])}
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Warning: Could not parse existing manifest: {e}")
        return {}


def check_existing_assets(word: str, existing_data: dict | None, audio_dir: Path, images_dir: Path) -> dict:
    """
    Check which assets already exist for a word.
    Returns a dict with what needs to be generated.
    """
    needs = {
        "sentence": True,
        "audioWord": True,
        "audioSentence": True,
        "image": True,
    }

    # Check files on disk
    word_audio_path = audio_dir / f"{word}_word.wav"
    sentence_audio_path = audio_dir / f"{word}_sentence.wav"
    image_path = images_dir / f"{word}.png"

    if word_audio_path.exists():
        needs["audioWord"] = False
    if sentence_audio_path.exists():
        needs["audioSentence"] = False
    if image_path.exists():
        needs["image"] = False

    # Check manifest for sentence (can't verify from file)
    if existing_data and existing_data.get("sentence"):
        needs["sentence"] = False

    return needs


def generate_sentence(word: str) -> str:
    """Generate a kid-friendly French sentence using the word."""
    the_prompt = f"""Create a simple, kid-friendly French sentence using the word "{word}".

Requirements:
- The sentence should be appropriate for a 7-year-old child
- Use simple vocabulary and grammar
- The sentence should be fun or interesting for a child
- Keep it short (5-10 words maximum)
- The word "{word}" must appear in the sentence exactly as written
- Avoid using the 'passé composé' if possible; stick to the 'présent de l'indicatif'.

Return ONLY the French sentence, nothing else."""

    text_response = client.models.generate_content(
        model=language_model,
        contents=the_prompt
    )

    sentence = text_response.text.strip()

    # Remove quotes if present
    if sentence.startswith('"') and sentence.endswith('"'):
        sentence = sentence[1:-1]
    if sentence.startswith("'") and sentence.endswith("'"):
        sentence = sentence[1:-1]

    return sentence

import wave

def generate_audio_tts(text: str, output_path: Path, slow: bool = False) -> bool:
    """Safe version that saves raw PCM as a playable WAV file."""

    # Natural language steering for speed
    prompt = f"Dites d'une voix féminine {'lentement' if slow else ''} : {text}"

    minimal_config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {"voice_name": "Aoede"}
            }
        }
    }

    try:
        response = client.models.generate_content(
            model=speech_model,
            contents=prompt,
            config=minimal_config
        )

        # Get raw bytes
        pcm_data = response.candidates[0].content.parts[0].inline_data.data

        # Gemini TTS defaults: 24kHz, Mono, 16-bit PCM
        # We must save this as a .wav for afplay to understand it
        wav_path = output_path.with_suffix('.wav')

        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(1)          # Mono
            wf.setsampwidth(2)          # 16-bit (2 bytes)
            wf.setframerate(24000)      # 24kHz is standard for Gemini-TTS
            wf.writeframes(pcm_data)

        print(f"  Audio saved as WAV: {wav_path.name}")
        return True

    except Exception as e:
        print(f"  Audio error: {e}")
        return False

def generate_image(sentence: str, word: str, output_path: Path) -> bool:
    """Generate an image with a fallback strategy if the first attempt is blocked."""
    global last_image_time

    # Rate limiting
    if image_rate_limit > 0:
        elapsed = time.time() - last_image_time
        if elapsed < image_rate_limit:
            wait_time = image_rate_limit - elapsed
            print(f"    Rate limit: waiting {wait_time:.0f}s before image generation...")
            time.sleep(wait_time)

    # Use 'ALLOW_ALL' for person_generation to permit images of children
    image_config = {
        "number_of_images": 1,
        "person_generation": "ALLOW_ALL",
        "aspect_ratio": "1:1",
        "safety_filter_level": "BLOCK_ONLY_HIGH" # Least restrictive setting
    }

    # Attempt 1: The original creative prompt
    prompts_to_try = [
        f"A whimsical, child-friendly cartoon illustration representing: {sentence}. Bright colors, simple shapes. IMPORTANT: Do not include any text, letters, words, or writing in the image. Pure illustration only, no typography.",
        f"A simple, cheerful drawing of: {word}. High quality 2D cartoon art. IMPORTANT: Do not include any text, letters, words, or writing in the image. Pure illustration only, no typography."
    ]

    for attempt, prompt in enumerate(prompts_to_try):
        try:
            print(f"    Image attempt {attempt + 1}...")
            last_image_time = time.time()  # Update before request
            response = client.models.generate_images(
                model=image_model,
                prompt=prompt,
                config=image_config
            )

            if response.generated_images:
                image_bytes = response.generated_images[0].image.image_bytes
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                return True
            else:
                print(f"    Attempt {attempt + 1} was blocked by safety filters.")

        except Exception as e:
            print(f"    Attempt {attempt + 1} error: {e}")
            continue

    # Level 3 Fallback: If both fail, you could copy a local 'placeholder.png' here
    print(f"  CRITICAL: All image generation attempts failed for '{word}'.")
    return False

def process_word(word: str, week_path: str, existing_data: dict | None, audio_dir: Path, images_dir: Path) -> dict:
    """Process a single word and generate only missing assets."""
    print(f"\nProcessing: {word}")

    # Check what already exists
    needs = check_existing_assets(word, existing_data, audio_dir, images_dir)

    # Start with existing data or create new
    if existing_data:
        result = existing_data.copy()
        print(f"  Found existing data, checking for missing assets...")
    else:
        result = {
            "id": word,
            "text": word,
        }

    # Track what we're skipping vs generating
    skipped = []
    generated = []

    # Generate sentence (only if needed)
    if needs["sentence"]:
        print(f"  Generating sentence...")
        try:
            sentence = generate_sentence(word)
            result["sentence"] = sentence
            print(f"  Sentence: {sentence}")
            generated.append("sentence")
        except Exception as e:
            print(f"  Error generating sentence: {e}")
            result["sentence"] = f"Le mot est {word}."  # Fallback
    else:
        skipped.append("sentence")
        print(f"  Sentence exists: {result.get('sentence', 'N/A')}")

    # Generate word audio (only if needed)
    word_audio_path = audio_dir / f"{word}_word.wav"
    if needs["audioWord"]:
        print(f"  Generating word audio...")
        if generate_audio_tts(word, word_audio_path, slow=True):
            result["audioWord"] = f"/{week_path}/audio/{word}_word.wav"
            generated.append("audioWord")
        else:
            print(f"  Failed to generate word audio")
    else:
        result["audioWord"] = f"/{week_path}/audio/{word}_word.wav"
        skipped.append("audioWord")

    # Generate sentence audio (only if needed)
    sentence_audio_path = audio_dir / f"{word}_sentence.wav"
    if needs["audioSentence"]:
        print(f"  Generating sentence audio...")
        if generate_audio_tts(result.get("sentence", word), sentence_audio_path):
            result["audioSentence"] = f"/{week_path}/audio/{word}_sentence.wav"
            generated.append("audioSentence")
        else:
            print(f"  Failed to generate sentence audio")
    else:
        result["audioSentence"] = f"/{week_path}/audio/{word}_sentence.wav"
        skipped.append("audioSentence")

    # Generate image (only if needed)
    image_path = images_dir / f"{word}.png"
    if needs["image"]:
        print(f"  Generating image...")
        if generate_image(result.get("sentence", word), word, image_path):
            result["image"] = f"/{week_path}/images/{word}.png"
            generated.append("image")
        else:
            print(f"  Failed to generate image (continuing without it)")
    else:
        result["image"] = f"/{week_path}/images/{word}.png"
        skipped.append("image")

    # Summary
    if skipped:
        print(f"  Skipped (already exist): {', '.join(skipped)}")
    if generated:
        print(f"  Generated: {', '.join(generated)}")
    if not generated:
        print(f"  All assets already exist!")

    return result


def update_metadata(sounds: str, week_path: str, week_start: str, week_end: str) -> None:
    """Append or update an entry in metadata.yaml."""
    # Load existing metadata
    if METADATA_FILE.exists():
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
    else:
        raw = {}

    weeks = raw.get("dictee", [])
    if not isinstance(weeks, list):
        # Backward compat: convert old single-object format
        weeks = [weeks] if weeks else []

    entry = {
        "sounds": sounds,
        "path": week_path,
        "week_start": week_start,
        "week_end": week_end,
        "date_of_generation": date.today().isoformat(),
        "source": "words_of_week.txt",
    }

    # Replace existing entry with same sounds+week_start, or append
    replaced = False
    for i, existing in enumerate(weeks):
        if existing.get("sounds") == sounds and existing.get("week_start") == week_start:
            weeks[i] = entry
            replaced = True
            break

    if not replaced:
        weeks.append(entry)

    raw["dictee"] = weeks

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        yaml.dump(raw, f, default_flow_style=False, allow_unicode=True)

    print(f"\n{'Updated' if replaced else 'Added'} metadata entry in: {METADATA_FILE}")


def main():
    """Main function to generate all assets."""
    global image_rate_limit

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Generate assets for the Dictée app")
    parser.add_argument(
        "--sounds",
        required=True,
        help="Sound theme for this week's words (e.g., ez, ou)"
    )
    parser.add_argument(
        "--week-start",
        required=True,
        help="Start date of the week (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--week-end",
        required=True,
        help="End date of the week (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--path",
        default=None,
        help="Subdirectory name (defaults to --sounds value)"
    )
    parser.add_argument(
        "--image-rate-limit",
        type=int,
        default=60,
        help="Seconds between image generation requests (default: 60, set to 0 to disable)"
    )
    args = parser.parse_args()

    image_rate_limit = args.image_rate_limit
    sounds = args.sounds
    week_path = args.path or sounds
    week_start = args.week_start
    week_end = args.week_end

    # Compute output paths
    week_dir = PUBLIC_DIR / week_path
    audio_dir = week_dir / "audio"
    images_dir = week_dir / "images"
    words_file = week_dir / "words_of_week.txt"
    manifest_file = week_dir / "manifest.json"

    # Ensure directories exist
    audio_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 50)
    print("Dictée Asset Generator (Incremental)")
    print("=" * 50)
    print(f"Sound theme: {sounds}")
    print(f"Week path: {week_path}")
    print(f"Week: {week_start} to {week_end}")
    if image_rate_limit > 0:
        print(f"Image rate limit: {image_rate_limit}s between requests")

    # Load existing manifest
    existing_manifest = load_existing_manifest(manifest_file)
    if existing_manifest:
        print(f"\nFound existing manifest with {len(existing_manifest)} words")
    else:
        print("\nNo existing manifest found, generating all assets")

    # Read words
    words = read_words(words_file)
    print(f"\nFound {len(words)} words in {words_file.name}:")
    for word in words:
        status = "✓ exists" if word in existing_manifest else "○ new"
        print(f"  - {word} ({status})")

    # Process each word (with existing data if available)
    results = []
    new_count = 0
    updated_count = 0
    skipped_count = 0

    for word in words:
        existing_data = existing_manifest.get(word)
        result = process_word(word, week_path, existing_data, audio_dir, images_dir)
        results.append(result)

        # Track stats
        needs = check_existing_assets(word, existing_data, audio_dir, images_dir)
        if any(needs.values()):
            if existing_data:
                updated_count += 1
            else:
                new_count += 1
        else:
            skipped_count += 1

    # Generate manifest
    manifest = {
        "generatedAt": datetime.now().isoformat(),
        "words": results
    }

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Update metadata.yaml (append/update, not overwrite)
    update_metadata(sounds, week_path, week_start, week_end)

    print("\n" + "=" * 50)
    print(f"Generated manifest: {manifest_file}")
    print(f"Summary:")
    print(f"  - New words: {new_count}")
    print(f"  - Updated words: {updated_count}")
    print(f"  - Skipped (complete): {skipped_count}")
    print(f"  - Total in manifest: {len(results)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
