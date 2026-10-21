#!/usr/bin/env python3
"""
Generate audio and word timings for a week of Grade 3 dictée sentences.

Reads  public/weeks/<week>/dictee.yaml
Writes public/weeks/<week>/audio/<sentence>_<voice>.wav
       public/weeks/<week>/manifest.json
       public/weeks/index.json

Two voices are supported so they can be compared by ear:
  gemini  Gemini TTS; word timings recovered with faster-whisper alignment
  cloud   Cloud Text-to-Speech; word timings from SSML <mark> timepoints

Usage:
    python scripts/generate_sentences.py --week 2026-10-19-oi
    python scripts/generate_sentences.py --week 2026-10-19-oi --voices cloud --force
"""

import argparse
import difflib
import io
import json
import os
import re
import unicodedata
import wave
from datetime import datetime
from html import escape
from pathlib import Path

import yaml
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent.parent
WEEKS_DIR = PROJECT_DIR / "public" / "weeks"

GEMINI_TTS_MODEL = "gemini-2.5-flash-tts"
GEMINI_VOICE = "Aoede"
GEMINI_PROMPT = (
    "Lisez lentement et clairement, en articulant chaque mot et en marquant les pauses "
    "de la ponctuation, comme une enseignante qui fait une dictée : {text}"
)
CLOUD_SPEAKING_RATE = 0.9
WHISPER_MODEL = "small"
SAMPLE_RATE = 24000

TOKEN_RE = re.compile(r"([\w'’-]+|[^\w\s])(\s*)")


# ---------- sentence parsing ----------

def parse_sentence(raw: str, focus: str) -> dict:
    """Split '/'-delimited source text into display text and tokens tagged with their segment."""
    tokens = []
    for segment_index, segment in enumerate(raw.split("/")):
        for match in TOKEN_RE.finditer(segment.strip()):
            text = match.group(1)
            is_word = bool(re.match(r"\w", text))
            token = {"text": text, "space": bool(match.group(2)), "segment": segment_index}
            if is_word:
                token["word"] = True
                if focus.lower() in text.lower():
                    token["focus"] = True
            tokens.append(token)
        if tokens:
            tokens[-1]["space"] = True
    tokens[-1]["space"] = False
    return {"text": display_text(tokens), "tokens": tokens}


def display_text(tokens: list[dict]) -> str:
    return "".join(t["text"] + (" " if t["space"] else "") for t in tokens)


def words_of(tokens: list[dict]) -> list[str]:
    return [t["text"] for t in tokens if t.get("word")]


def normalize(word: str) -> str:
    stripped = unicodedata.normalize("NFD", word.lower().replace("’", "'"))
    return "".join(c for c in stripped if c.isalnum() or c == "'")


# ---------- audio helpers ----------

def pcm_to_wav(pcm: bytes) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    return buffer.getvalue()


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / wf.getframerate()


def load_wav_16k(path: Path):
    """Whisper wants 16 kHz float mono; decoding ourselves avoids faster-whisper's PyAV dependency."""
    import numpy as np

    with wave.open(str(path), "rb") as wf:
        rate = wf.getframerate()
        samples = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    target = np.arange(0, len(samples) / rate, 1 / 16000)
    return np.interp(target, np.arange(len(samples)) / rate, samples).astype(np.float32)


def fill_missing(timings: list, duration: float) -> list[list[float]]:
    """Give unmatched words a slot between their matched neighbours."""
    filled = list(timings)
    i = 0
    while i < len(filled):
        if filled[i] is not None:
            i += 1
            continue
        run_end = i
        while run_end < len(filled) and filled[run_end] is None:
            run_end += 1
        start = filled[i - 1][1] if i > 0 else 0.0
        end = filled[run_end][0] if run_end < len(filled) else duration
        step = (end - start) / (run_end - i)
        for k in range(i, run_end):
            filled[k] = [start + step * (k - i), start + step * (k - i + 1)]
        i = run_end
    return [[round(float(s), 3), round(float(e), 3)] for s, e in filled]


# ---------- gemini voice ----------

def synthesize_gemini(text: str, locale: str) -> bytes:
    from google import genai

    client = genai.Client(vertexai=True, project=os.environ["GOOGLE_PROJECT_NAME"], location="us-central1")
    response = client.models.generate_content(
        model=GEMINI_TTS_MODEL,
        contents=GEMINI_PROMPT.format(text=text),
        config={
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "language_code": locale,
                "voice_config": {"prebuilt_voice_config": {"voice_name": GEMINI_VOICE}},
            },
        },
    )
    return pcm_to_wav(response.candidates[0].content.parts[0].inline_data.data)


_whisper = None


def align_with_whisper(audio_path: Path, words: list[str]) -> list[list[float]]:
    global _whisper
    from faster_whisper import WhisperModel

    if _whisper is None:
        _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segments, _ = _whisper.transcribe(
        load_wav_16k(audio_path), language="fr", word_timestamps=True, initial_prompt=" ".join(words)
    )
    heard = [w for seg in segments for w in seg.words]
    heard_norm = [normalize(w.word) for w in heard]
    expected_norm = [normalize(w) for w in words]

    matcher = difflib.SequenceMatcher(a=expected_norm, b=heard_norm, autojunk=False)
    if matcher.ratio() < 0.8:
        print(f"    ⚠ Whisper heard: {' '.join(w.word.strip() for w in heard)}")

    timings = [None] * len(words)
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                timings[i1 + k] = [heard[j1 + k].start, heard[j1 + k].end]
        elif op == "replace":
            start, end = heard[j1].start, heard[j2 - 1].end
            step = (end - start) / (i2 - i1)
            for k in range(i2 - i1):
                timings[i1 + k] = [start + step * k, start + step * (k + 1)]
    return fill_missing(timings, wav_duration(audio_path))


def generate_gemini(tokens: list[dict], audio_path: Path, locale: str) -> list[list[float]]:
    audio_path.write_bytes(synthesize_gemini(display_text(tokens), locale))
    return align_with_whisper(audio_path, words_of(tokens))


# ---------- cloud voice ----------

def build_ssml(tokens: list[dict]) -> str:
    parts = []
    word_index = 0
    for token in tokens:
        if token.get("word"):
            parts.append(f'<mark name="{word_index}"/>')
            word_index += 1
        parts.append(escape(token["text"], quote=False) + (" " if token["space"] else ""))
    return f"<speak>{''.join(parts)}</speak>"


def generate_cloud(tokens: list[dict], audio_path: Path, locale: str, voice: str) -> list[list[float]]:
    from google.cloud import texttospeech_v1beta1 as tts

    client = tts.TextToSpeechClient(client_options={"quota_project_id": os.environ["GOOGLE_PROJECT_NAME"]})
    response = client.synthesize_speech(
        request=tts.SynthesizeSpeechRequest(
            input=tts.SynthesisInput(ssml=build_ssml(tokens)),
            voice=tts.VoiceSelectionParams(language_code=locale, name=voice),
            audio_config=tts.AudioConfig(
                audio_encoding=tts.AudioEncoding.LINEAR16,
                sample_rate_hertz=SAMPLE_RATE,
                speaking_rate=CLOUD_SPEAKING_RATE,
            ),
            enable_time_pointing=[tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK],
        )
    )
    audio_path.write_bytes(response.audio_content)
    if not response.timepoints:
        raise RuntimeError(f"voice {voice} returned no timepoints; it may not support SSML marks")

    starts = {int(tp.mark_name): tp.time_seconds for tp in response.timepoints}
    word_count = len(words_of(tokens))
    duration = wav_duration(audio_path)
    timings = [None] * word_count
    for i in range(word_count):
        if i in starts:
            end = starts.get(i + 1, duration)
            timings[i] = [starts[i], end]
    return fill_missing(timings, duration)


def list_cloud_voices(locale: str) -> None:
    from google.cloud import texttospeech_v1beta1 as tts

    client = tts.TextToSpeechClient(client_options={"quota_project_id": os.environ["GOOGLE_PROJECT_NAME"]})
    for v in client.list_voices(language_code=locale).voices:
        print(f"{v.name:32} {tts.SsmlVoiceGender(v.ssml_gender).name}")


# ---------- manifest ----------

def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_sentence(index: int, source: dict, focus: str, previous: dict, args, week_dir: Path) -> dict:
    sentence_id = f"s{index + 1}"
    parsed = parse_sentence(source["text"], focus)
    old = previous.get(sentence_id, {})
    unchanged = old.get("tokens") == parsed["tokens"]
    voices = dict(old.get("voices", {})) if unchanged else {}

    print(f"  {sentence_id}: {parsed['text']}")
    for voice in args.voices:
        audio_path = week_dir / "audio" / f"{sentence_id}_{voice}.wav"
        if voice in voices and audio_path.exists() and not args.force:
            print(f"    {voice}: up to date")
            continue
        try:
            if voice == "gemini":
                words = generate_gemini(parsed["tokens"], audio_path, args.locale)
            else:
                words = generate_cloud(parsed["tokens"], audio_path, args.locale, args.cloud_voice)
        except Exception as e:
            print(f"    {voice}: FAILED — {e}")
            continue
        voices[voice] = {"audio": f"audio/{audio_path.name}", "duration": round(wav_duration(audio_path), 3), "words": words}
        print(f"    {voice}: {voices[voice]['duration']}s")

    return {"id": sentence_id, "day": source.get("day"), **parsed, "voices": voices}


def update_index(week: str, source: dict) -> None:
    index_path = WEEKS_DIR / "index.json"
    weeks = [w for w in load_json(index_path).get("weeks", []) if w["path"] != week]
    weeks.append({"path": week, "focus": source["focus"], "week_start": source["week_start"], "week_end": source["week_end"]})
    weeks.sort(key=lambda w: w["week_start"], reverse=True)
    write_json(index_path, {"weeks": weeks})


def main() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    parser = argparse.ArgumentParser(description="Generate dictée sentence audio and word timings")
    parser.add_argument("--week", help="folder name under public/weeks")
    parser.add_argument("--voices", nargs="+", choices=["gemini", "cloud"], default=["gemini", "cloud"])
    parser.add_argument("--locale", default="fr-FR", help="e.g. fr-FR or fr-CA")
    parser.add_argument("--cloud-voice", default="fr-FR-Neural2-F")
    parser.add_argument("--force", action="store_true", help="regenerate audio that already exists")
    parser.add_argument("--list-cloud-voices", action="store_true")
    args = parser.parse_args()

    if "GOOGLE_PROJECT_NAME" not in os.environ:
        parser.error("GOOGLE_PROJECT_NAME must be set (in .env or the environment)")
    if args.list_cloud_voices:
        list_cloud_voices(args.locale)
        return
    if not args.week:
        parser.error("--week is required")

    week_dir = WEEKS_DIR / args.week
    source = yaml.safe_load((week_dir / "dictee.yaml").read_text(encoding="utf-8"))
    (week_dir / "audio").mkdir(exist_ok=True)
    manifest_path = week_dir / "manifest.json"
    previous = {s["id"]: s for s in load_json(manifest_path).get("sentences", [])}

    print(f"Week {args.week} — focus « {source['focus']} »")
    sentences = [build_sentence(i, s, source["focus"], previous, args, week_dir) for i, s in enumerate(source["sentences"])]
    write_json(manifest_path, {"focus": source["focus"], "generatedAt": datetime.now().isoformat(timespec="seconds"), "sentences": sentences})
    update_index(args.week, source)
    print(f"Wrote {manifest_path.relative_to(PROJECT_DIR)}")


if __name__ == "__main__":
    main()
