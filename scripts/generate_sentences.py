#!/usr/bin/env python3
"""
Generate audio and word timings for a week of Grade 3 dictée sentences, fully offline.

Reads  public/weeks/<week>/dictee.yaml
Writes public/weeks/<week>/audio/<sentence>.wav
       public/weeks/<week>/manifest.json
       public/weeks/index.json

Audio comes from a local Piper voice; word timings for highlighting come from aligning
the audio with faster-whisper.

Usage:
    python scripts/generate_sentences.py --week 2026-10-19-oi
    python scripts/generate_sentences.py --week 2026-10-19-oi --length-scale 1.4 --force
"""

import argparse
import dataclasses
import difflib
import json
import re
import unicodedata
import wave
from datetime import datetime
from pathlib import Path

import yaml

PROJECT_DIR = Path(__file__).resolve().parent.parent
WEEKS_DIR = PROJECT_DIR / "public" / "weeks"
PIPER_VOICES_DIR = Path.home() / ".local" / "share" / "piper-voices"

PIPER_VOICE = "fr_FR-siwis-medium"
WHISPER_MODEL = "small"

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


# ---------- audio ----------

_piper = None


def synthesize(text: str, audio_path: Path, length_scale: float) -> None:
    global _piper
    from piper import PiperVoice, SynthesisConfig

    if _piper is None:
        _piper = PiperVoice.load(PIPER_VOICES_DIR / PIPER_VOICE / f"{PIPER_VOICE}.onnx")
    with wave.open(str(audio_path), "wb") as wf:
        _piper.synthesize_wav(text, wf, syn_config=SynthesisConfig(length_scale=length_scale))


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


# ---------- word timings ----------

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


def merge_elisions(heard: list) -> list:
    """Whisper sometimes splits elisions ("n'ont" -> "n", "'ont"); rejoin them to match our tokens."""
    merged = []
    for w in heard:
        if merged and w.word.strip().startswith(("'", "’")):
            prev = merged[-1]
            merged[-1] = dataclasses.replace(prev, word=prev.word + w.word.strip(), end=w.end)
        else:
            merged.append(w)
    return merged


_whisper = None


def align_with_whisper(audio_path: Path, words: list[str]) -> list[list[float]]:
    global _whisper
    from faster_whisper import WhisperModel

    if _whisper is None:
        _whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segments, _ = _whisper.transcribe(
        load_wav_16k(audio_path), language="fr", word_timestamps=True, initial_prompt=" ".join(words)
    )
    heard = merge_elisions([w for seg in segments for w in seg.words])
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


# ---------- manifest ----------

def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_sentence(index: int, source: dict, focus: str, previous: dict, args, week_dir: Path) -> dict:
    sentence_id = f"s{index + 1}"
    parsed = parse_sentence(source["text"], focus)
    old = previous.get(sentence_id, {})
    audio_path = week_dir / "audio" / f"{sentence_id}.wav"

    print(f"  {sentence_id}: {parsed['text']}")
    if old.get("tokens") == parsed["tokens"] and audio_path.exists() and not args.force:
        print("    up to date")
        return old

    synthesize(parsed["text"], audio_path, args.length_scale)
    duration = round(wav_duration(audio_path), 3)
    words = align_with_whisper(audio_path, words_of(parsed["tokens"]))
    print(f"    {duration}s")
    return {"id": sentence_id, "day": source.get("day"), **parsed, "audio": f"audio/{audio_path.name}", "duration": duration, "words": words}


def update_index(week: str, source: dict) -> None:
    index_path = WEEKS_DIR / "index.json"
    weeks = [w for w in load_json(index_path).get("weeks", []) if w["path"] != week]
    weeks.append({"path": week, "focus": source["focus"], "week_start": source["week_start"], "week_end": source["week_end"]})
    weeks.sort(key=lambda w: w["week_start"], reverse=True)
    write_json(index_path, {"weeks": weeks})


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate dictée sentence audio and word timings")
    parser.add_argument("--week", required=True, help="folder name under public/weeks")
    parser.add_argument("--length-scale", type=float, default=1.27, help="> 1 speaks slower and more deliberately")
    parser.add_argument("--force", action="store_true", help="regenerate audio that already exists")
    args = parser.parse_args()

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
