#!/usr/bin/env python3
"""
Generate assets for the Dictée app using local open-source models.

Pipeline (two phases):
  Phase 1 — Sentences (sequential, CPU):
    Words → Ollama/gemma3:12b (English sentences)
          → [NLLB-200 if lang=fr] (English → French)

  Phase 2 — Assets (per word, parallelized):
    ┬─ SDXL + StorybookRedmond LoRA  → image  (GPU)
    ├─ Piper TTS word pronunciation  → audio  (CPU)
    └─ Piper TTS sentence            → audio  (CPU)

Usage:
    pip install -r local_requirements.txt
    python local_model_generate.py --sounds Short_e --week-start 2026-03-21 --week-end 2026-03-28 --language en

Prerequisites:
    1. Ollama running locally: ollama pull gemma3:12b
    2. StorybookRedmond LoRA .safetensors file (from CivitAI), pass via --lora-path
    3. Piper voice models downloaded to --piper-voices-dir
    4. NLLB-200 and SDXL: auto-downloaded from HuggingFace on first run
"""

import os
import json
import subprocess
import argparse
import shutil
import yaml
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
PUBLIC_DIR = PROJECT_DIR / "public"
METADATA_FILE = PUBLIC_DIR / "metadata.yaml"

DEFAULT_PIPER_VOICES_DIR = Path.home() / ".local" / "share" / "piper-voices"

# Language-specific config
LANGUAGE_CONFIG = {
    "fr": {
        "sentence_fallback": "Le mot est {word}.",
        "piper_default_voice": "fr_FR-siwis-medium",
    },
    "en": {
        "sentence_fallback": "The word is {word}.",
        "piper_default_voice": "en_US-lessac-medium",
    },
}

OLLAMA_SENTENCE_PROMPT = (
    'Write a single sentence of 5 to 10 words for a 7-year-old. Use present tense. '
    'Use the word "{word}" naturally in the sentence. Return only the sentence, nothing else.'
)


# ---------------------------------------------------------------------------
# Local model clients (loaded once, reused for all words)
# ---------------------------------------------------------------------------

class LocalModelClients:
    """Holds all lazily-initialized local model handles."""

    def __init__(self, args):
        self.args = args
        self._translator = None
        self._tokenizer = None
        self._sdxl_pipe = None

    def get_translator(self):
        if self._translator is None:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            model_id = self.args.translation_model
            print(f"Loading translation model: {model_id} (first run downloads ~1.2 GB)...")
            self._tokenizer = AutoTokenizer.from_pretrained(model_id)
            self._translator = AutoModelForSeq2SeqLM.from_pretrained(model_id)
            print("Translation model loaded.")
        return self._tokenizer, self._translator

    def translate_en_to_fr(self, text: str) -> str:
        tokenizer, model = self.get_translator()
        inputs = tokenizer(text, return_tensors="pt", padding=True)
        translated = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids("fra_Latn"),
            max_length=256,
        )
        return tokenizer.batch_decode(translated, skip_special_tokens=True)[0]

    def get_sdxl_pipe(self):
        if self._sdxl_pipe is None:
            import torch
            from diffusers import StableDiffusionXLPipeline

            model_id = self.args.sdxl_model
            print(f"Loading SDXL pipeline: {model_id} (first run downloads ~6.5 GB)...")

            device = _best_device()
            dtype = _best_dtype(device)

            pipe = StableDiffusionXLPipeline.from_pretrained(
                model_id,
                torch_dtype=dtype,
                use_safetensors=True,
            )

            if self.args.lora_path:
                lora = Path(self.args.lora_path)
                if not lora.exists():
                    print(f"  Warning: LoRA file not found: {lora}. Skipping LoRA.")
                else:
                    print(f"  Loading LoRA: {lora.name}")
                    pipe.load_lora_weights(str(lora.parent), weight_name=lora.name)

            pipe = pipe.to(device)
            self._sdxl_pipe = pipe
            print(f"SDXL pipeline ready on {device}.")
        return self._sdxl_pipe


def _best_device() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def _best_dtype(device: str):
    import torch
    if device in ("cuda", "mps"):
        return torch.float16
    return torch.float32


# ---------------------------------------------------------------------------
# Phase 1: Sentence generation (Ollama + NLLB, sequential)
# ---------------------------------------------------------------------------

def generate_sentence_ollama(word: str, args) -> str:
    """Call Ollama to produce an English sentence containing the word."""
    import ollama

    prompt = OLLAMA_SENTENCE_PROMPT.format(word=word)
    response = ollama.chat(
        model=args.ollama_model,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.7},
    )
    sentence = response["message"]["content"].strip()
    if len(sentence) >= 2 and sentence[0] in ('"', "'") and sentence[-1] == sentence[0]:
        sentence = sentence[1:-1]
    return sentence


def generate_all_sentences(
    words: list[str],
    existing_manifest: dict,
    language: str,
    args,
    clients: LocalModelClients,
) -> dict[str, dict]:
    """
    Phase 1: Generate sentences for all words that need them.

    Returns a dict keyed by word: {"sentence": ..., "sentenceEn": ...}
    For French, sentenceEn is the original English before translation.
    For English, sentenceEn is omitted (same as sentence).
    """
    print("\n--- Phase 1: Sentence generation ---")
    sentences = {}

    for word in words:
        existing = existing_manifest.get(word)
        if existing and existing.get("sentence"):
            sentences[word] = {
                "sentence": existing["sentence"],
                "sentenceEn": existing.get("sentenceEn"),
            }
            en_hint = f" (EN: {existing['sentenceEn']})" if existing.get("sentenceEn") else ""
            print(f"  {word}: [existing] {existing['sentence']}{en_hint}")
            continue

        try:
            en_sentence = generate_sentence_ollama(word, args)

            if language == "fr" and not args.no_translate:
                fr_sentence = clients.translate_en_to_fr(en_sentence)
                sentences[word] = {"sentence": fr_sentence, "sentenceEn": en_sentence}
                print(f"  {word}:")
                print(f"    EN: {en_sentence}")
                print(f"    FR: {fr_sentence}")
            else:
                sentences[word] = {"sentence": en_sentence, "sentenceEn": None}
                print(f"  {word}: {en_sentence}")

        except Exception as e:
            print(f"  {word}: ERROR — {e}")
            fallback = LANGUAGE_CONFIG[language]["sentence_fallback"].format(word=word)
            sentences[word] = {"sentence": fallback, "sentenceEn": None}

    return sentences


# ---------------------------------------------------------------------------
# Phase 2: Asset generation (image + audio in parallel)
# ---------------------------------------------------------------------------

def generate_image(word: str, sentence: str, output_path: Path, clients: LocalModelClients) -> bool:
    """Generate an image with SDXL (+ optional LoRA) and save as PNG."""
    try:
        pipe = clients.get_sdxl_pipe()

        lora_prefix = "StorybookRedmond style, " if clients.args.lora_path else ""
        prompt = (
            f"{lora_prefix}bright friendly children's picture-book illustration of {word}, "
            f"{sentence}. Flat colors, simple shapes, no text, clean white background."
        )
        negative_prompt = (
            "text, watermark, logo, signature, words, letters, dark, scary, realistic photo"
        )

        generator = None
        try:
            import torch
            generator = torch.Generator(device=_best_device()).manual_seed(42)
        except Exception:
            pass

        result = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=clients.args.image_steps,
            guidance_scale=7.5,
            width=1024,
            height=1024,
            generator=generator,
        )

        result.images[0].save(str(output_path), format="PNG")
        return True

    except Exception as e:
        print(f"  [{word}] Image error: {e}")
        return False


def _piper_binary() -> str | None:
    return shutil.which("piper") or shutil.which("piper-tts")


def generate_audio_piper(
    text: str,
    output_path: Path,
    voice: str,
    voices_dir: Path,
    slow: bool = False,
) -> bool:
    """Run piper TTS subprocess to produce a WAV file."""
    piper_bin = _piper_binary()
    if not piper_bin:
        print("  Error: piper binary not found. Install piper-tts and ensure it's on PATH.")
        return False

    voice_dir = voices_dir / voice
    onnx_path = voice_dir / f"{voice}.onnx"
    config_path = voice_dir / f"{voice}.onnx.json"

    if not onnx_path.exists():
        print(f"  Piper voice not found: {onnx_path}")
        print(f"  Download voices to: {voices_dir}")
        print(f"  See: https://github.com/rhasspy/piper/blob/master/VOICES.md")
        return False

    cmd = [
        piper_bin,
        "--model", str(onnx_path),
        "--config", str(config_path),
        "--length_scale", "1.4" if slow else "1.0",
        "--output_file", str(output_path),
    ]

    try:
        proc = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True, timeout=60)
        if proc.returncode != 0:
            print(f"  Piper error: {proc.stderr.decode('utf-8', errors='replace')}")
            return False
        return output_path.exists()
    except subprocess.TimeoutExpired:
        print("  Piper timed out.")
        return False
    except Exception as e:
        print(f"  Piper error: {e}")
        return False


def check_existing_assets(
    word: str,
    existing_data: dict | None,
    audio_dir: Path,
    images_dir: Path,
) -> dict:
    needs = {"audioWord": True, "audioSentence": True, "image": True}
    if (audio_dir / f"{word}_word.wav").exists():
        needs["audioWord"] = False
    if (audio_dir / f"{word}_sentence.wav").exists():
        needs["audioSentence"] = False
    if (images_dir / f"{word}.png").exists():
        needs["image"] = False
    return needs


def generate_assets_for_word(
    word: str,
    week_path: str,
    existing_data: dict | None,
    sentence_data: dict,
    audio_dir: Path,
    images_dir: Path,
    language: str,
    clients: LocalModelClients,
) -> dict:
    """
    Phase 2: Generate image (GPU) and both audio files (CPU) in parallel,
    then collect results.
    """
    print(f"\n  {word}: generating assets...")

    args = clients.args
    lang_config = LANGUAGE_CONFIG[language]

    result = existing_data.copy() if existing_data else {"id": word, "text": word}
    result["sentence"] = sentence_data["sentence"]
    if sentence_data.get("sentenceEn"):
        result["sentenceEn"] = sentence_data["sentenceEn"]

    needs = check_existing_assets(word, existing_data, audio_dir, images_dir)

    if language == "fr":
        tts_voice = args.tts_voice_fr or lang_config["piper_default_voice"]
    else:
        tts_voice = args.tts_voice_en or lang_config["piper_default_voice"]
    voices_dir = Path(args.piper_voices_dir)

    image_path = images_dir / f"{word}.png"
    word_audio_path = audio_dir / f"{word}_word.wav"
    sentence_audio_path = audio_dir / f"{word}_sentence.wav"

    skipped = []
    generated = []
    errors = []

    # Fan out: SDXL (GPU) + Piper word (CPU) + Piper sentence (CPU)
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {}

        if needs["image"]:
            futures["image"] = executor.submit(
                generate_image, word, result["sentence"], image_path, clients
            )
        else:
            skipped.append("image")

        if needs["audioWord"]:
            futures["audioWord"] = executor.submit(
                generate_audio_piper, word, word_audio_path, tts_voice, voices_dir, True
            )
        else:
            skipped.append("audioWord")

        if needs["audioSentence"]:
            futures["audioSentence"] = executor.submit(
                generate_audio_piper, result["sentence"], sentence_audio_path, tts_voice, voices_dir, False
            )
        else:
            skipped.append("audioSentence")

        for asset, future in futures.items():
            try:
                if future.result():
                    generated.append(asset)
                else:
                    errors.append(asset)
            except Exception as e:
                print(f"    {asset} error: {e}")
                errors.append(asset)

    # Set manifest paths for everything that exists (generated or pre-existing)
    result["image"] = f"/{week_path}/images/{word}.png"
    result["audioWord"] = f"/{week_path}/audio/{word}_word.wav"
    result["audioSentence"] = f"/{week_path}/audio/{word}_sentence.wav"

    if skipped:
        print(f"    Skipped (exist)  : {', '.join(skipped)}")
    if generated:
        print(f"    Generated        : {', '.join(generated)}")
    if errors:
        print(f"    Failed           : {', '.join(errors)}")
    if not generated and not errors:
        print(f"    All assets already exist!")

    return result


# ---------------------------------------------------------------------------
# Metadata helpers (identical to generate_assets.py)
# ---------------------------------------------------------------------------

def read_words(words_file: Path) -> list[str]:
    if not words_file.exists():
        raise FileNotFoundError(f"Words file not found: {words_file}")
    with open(words_file, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    seen = set()
    unique = []
    for w in words:
        if w.lower() not in seen:
            seen.add(w.lower())
            unique.append(w)
    return unique


def load_existing_manifest(manifest_file: Path) -> dict:
    if not manifest_file.exists():
        return {}
    try:
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return {w["text"]: w for w in manifest.get("words", [])}
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Warning: Could not parse existing manifest: {e}")
        return {}


def update_metadata(sounds: str, week_path: str, week_start: str, week_end: str, language: str) -> None:
    if METADATA_FILE.exists():
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
    else:
        raw = {}

    weeks = raw.get("dictee", [])
    if not isinstance(weeks, list):
        weeks = [weeks] if weeks else []

    entry = {
        "sounds": sounds,
        "path": week_path,
        "week_start": week_start,
        "week_end": week_end,
        "date_of_generation": date.today().isoformat(),
        "source": "words_of_week.txt",
        "language": language,
    }

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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Generate Dictée assets using local models (Ollama, NLLB-200, SDXL, Piper)"
    )
    parser.add_argument("--sounds", required=True, help="Sound theme (e.g. Short_e, ez)")
    parser.add_argument("--week-start", required=True, help="Week start date (YYYY-MM-DD)")
    parser.add_argument("--week-end", required=True, help="Week end date (YYYY-MM-DD)")
    parser.add_argument("--path", default=None, help="Subdirectory name (defaults to --sounds)")
    parser.add_argument(
        "--language", default="fr", choices=list(LANGUAGE_CONFIG.keys()),
        help="Target language (default: fr)"
    )

    parser.add_argument("--ollama-model", default="gemma3:12b", help="Ollama model (default: gemma3:12b)")
    parser.add_argument("--ollama-url", default="http://localhost:11434", help="Ollama server URL")

    parser.add_argument(
        "--translation-model", default="facebook/nllb-200-distilled-600M",
        help="HuggingFace NLLB model ID"
    )
    parser.add_argument(
        "--no-translate", action="store_true",
        help="Skip NLLB translation; use English sentences as-is"
    )

    parser.add_argument(
        "--sdxl-model", default="stabilityai/stable-diffusion-xl-base-1.0",
        help="SDXL model ID or local path"
    )
    parser.add_argument("--lora-path", default=None, help="Path to StorybookRedmond .safetensors LoRA")
    parser.add_argument("--image-steps", type=int, default=30, help="SDXL inference steps (default: 30)")

    parser.add_argument("--tts-voice-fr", default=None, help="Piper voice for French (default: fr_FR-siwis-medium)")
    parser.add_argument("--tts-voice-en", default=None, help="Piper voice for English (default: en_US-lessac-medium)")
    parser.add_argument(
        "--piper-voices-dir", default=str(DEFAULT_PIPER_VOICES_DIR),
        help=f"Directory containing Piper voice models (default: {DEFAULT_PIPER_VOICES_DIR})"
    )

    args = parser.parse_args()

    sounds = args.sounds
    week_path = args.path or sounds
    week_start = args.week_start
    week_end = args.week_end
    language = args.language

    if args.ollama_url != "http://localhost:11434":
        os.environ["OLLAMA_HOST"] = args.ollama_url

    week_dir = PUBLIC_DIR / week_path
    audio_dir = week_dir / "audio"
    images_dir = week_dir / "images"
    words_file = week_dir / "words_of_week.txt"
    manifest_file = week_dir / "manifest.json"

    audio_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("Dictée Asset Generator — Local Models")
    print("=" * 60)
    print(f"Sound theme  : {sounds}")
    print(f"Week path    : {week_path}")
    print(f"Week         : {week_start} to {week_end}")
    print(f"Language     : {language}")
    print(f"Ollama model : {args.ollama_model}")
    print(f"SDXL model   : {args.sdxl_model}")
    if args.lora_path:
        print(f"LoRA         : {args.lora_path}")
    print(f"Piper voices : {args.piper_voices_dir}")

    existing_manifest = load_existing_manifest(manifest_file)
    if existing_manifest:
        print(f"\nFound existing manifest with {len(existing_manifest)} words")
    else:
        print("\nNo existing manifest found, generating all assets")

    words = read_words(words_file)
    print(f"\nFound {len(words)} words in {words_file.name}:")
    for w in words:
        status = "✓ exists" if w in existing_manifest else "○ new"
        print(f"  - {w} ({status})")

    clients = LocalModelClients(args)

    # Phase 1: generate all sentences first so you can review before images start
    all_sentences = generate_all_sentences(words, existing_manifest, language, args, clients)

    # Phase 2: generate image + audio for each word (GPU + CPU in parallel per word)
    print("\n--- Phase 2: Asset generation ---")
    results = []
    new_count = 0
    updated_count = 0
    skipped_count = 0

    for word in words:
        existing_data = existing_manifest.get(word)
        needs = check_existing_assets(word, existing_data, audio_dir, images_dir)

        result = generate_assets_for_word(
            word, week_path, existing_data, all_sentences[word],
            audio_dir, images_dir, language, clients,
        )
        results.append(result)

        if any(needs.values()):
            if existing_data:
                updated_count += 1
            else:
                new_count += 1
        else:
            skipped_count += 1

    manifest = {
        "generatedAt": datetime.now().isoformat(),
        "generatedBy": "local_model_generate",
        "words": results,
    }
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    update_metadata(sounds, week_path, week_start, week_end, language)

    print("\n" + "=" * 60)
    print(f"Generated manifest: {manifest_file}")
    print("Summary:")
    print(f"  New words      : {new_count}")
    print(f"  Updated words  : {updated_count}")
    print(f"  Skipped        : {skipped_count}")
    print(f"  Total          : {len(results)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
