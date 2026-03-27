# Local Model Asset Generation

Generates Dictée assets using local open-source models — no cloud API keys or per-request costs.

## Pipeline

```
Phase 1 — Sentences (sequential, CPU):
  Words → Ollama/gemma3:12b (English sentences)
        → [NLLB-200 if lang=fr] (English → French)

Phase 2 — Assets (per word, parallelized):
  ┬─ SDXL + StorybookRedmond LoRA  → image  (GPU)
  ├─ Piper TTS word pronunciation  → audio  (CPU)
  └─ Piper TTS sentence            → audio  (CPU)
```

Phase 1 completes fully before Phase 2 starts, so you can review all EN→FR sentence
pairs and abort before the slow GPU work begins.

## Prerequisites

### 1. Ollama (required)

Ollama is a native server application that runs LLMs locally. The `ollama` Python package
in `local_requirements.txt` is only the HTTP client — the server must be installed separately.

**Install:**
```bash
brew install ollama
```

Or via the install script:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Start the server and pull the model (~8 GB download):**
```bash
ollama serve
ollama pull gemma3:12b
```

On macOS after `brew install`, the server starts automatically. You can verify it's running at
`http://localhost:11434`.

### 2. Python dependencies

```bash
pip install -r local_requirements.txt
```

> **Note on PyTorch:** The default PyPI wheel works for CPU and Apple Silicon (MPS).
> For CUDA, install torch separately first:
> ```bash
> pip install torch --index-url https://download.pytorch.org/whl/cu121
> pip install -r local_requirements.txt
> ```

### 3. SDXL model (auto-downloaded)

Downloaded from HuggingFace on first run (~6.5 GB). Cached in `~/.cache/huggingface/`.
No action required.

### 4. StorybookRedmond LoRA (optional)

Improves image quality with a children's storybook style.

1. Go to **civitai.com** and search for `StorybookRedmond`
2. Filter by **LoRA** and **SDXL** to find the correct variant
3. Click the model and hit **Download** — you'll get a `.safetensors` file (~100–300 MB)
4. Save it somewhere convenient, e.g. `~/models/StorybookRedmond.safetensors`

Then pass it to the script via `--lora-path ~/models/StorybookRedmond.safetensors`.

Without a LoRA the script still generates images using SDXL base.

### 5. NLLB-200 translation model (auto-downloaded, French only)

Downloaded from HuggingFace on first run (~1.2 GB). Only used when `--language fr` and
`--no-translate` is not set.

### 6. Piper TTS

Piper is a fast local TTS engine. Two steps: install the binary, then download voice models.

**Install the binary:**
```bash
# macOS via pip (installs the piper binary alongside the Python package)
pip install piper-tts

# Or download a pre-built binary from:
# https://github.com/rhasspy/piper/releases
```

**Download voice models:**

Voice models are not bundled — download them manually to `~/.local/share/piper-voices/`.
Each voice needs two files: `<voice>.onnx` and `<voice>.onnx.json`.

```bash
# Example: French voice
mkdir -p ~/.local/share/piper-voices/fr_FR-siwis-medium
cd ~/.local/share/piper-voices/fr_FR-siwis-medium
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json

# Example: English voice
mkdir -p ~/.local/share/piper-voices/en_US-lessac-medium
cd ~/.local/share/piper-voices/en_US-lessac-medium
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
```

Full voice list: https://github.com/rhasspy/piper/blob/master/VOICES.md

## Usage

```bash
cd scripts
python local_model_generate.py \
  --sounds Short_e \
  --week-start 2026-03-21 \
  --week-end 2026-03-28 \
  --language en
```

French with LoRA:
```bash
python local_model_generate.py \
  --sounds syllables_pluriel \
  --week-start 2026-03-21 \
  --week-end 2026-03-28 \
  --language fr \
  --lora-path ~/models/StorybookRedmond.safetensors
```

## All flags

| Flag | Default | Description |
|------|---------|-------------|
| `--sounds` | *(required)* | Sound theme, used as subdirectory name |
| `--week-start` | *(required)* | Week start date (YYYY-MM-DD) |
| `--week-end` | *(required)* | Week end date (YYYY-MM-DD) |
| `--path` | same as `--sounds` | Override subdirectory name |
| `--language` | `fr` | `fr` or `en` |
| `--ollama-model` | `gemma3:12b` | Any model available in your Ollama install |
| `--ollama-url` | `http://localhost:11434` | Ollama server URL |
| `--translation-model` | `facebook/nllb-200-distilled-600M` | HuggingFace NLLB model ID |
| `--no-translate` | off | Use English sentences as-is (skip NLLB) |
| `--sdxl-model` | `stabilityai/stable-diffusion-xl-base-1.0` | HuggingFace model ID or local path |
| `--lora-path` | none | Path to StorybookRedmond `.safetensors` file |
| `--image-steps` | `30` | SDXL denoising steps (more = slower + sharper) |
| `--tts-voice-fr` | `fr_FR-siwis-medium` | Piper voice name for French |
| `--tts-voice-en` | `en_US-lessac-medium` | Piper voice name for English |
| `--piper-voices-dir` | `~/.local/share/piper-voices` | Directory containing Piper voice models |

## Output

Same `manifest.json` format as `generate_assets.py`, compatible with the React frontend.
French runs also include `sentenceEn` (the original English before translation) so you can
evaluate the translation quality without being a native French speaker.

```json
{
  "generatedAt": "...",
  "generatedBy": "local_model_generate",
  "words": [
    {
      "id": "agneaux",
      "text": "agneaux",
      "sentence": "Les agneaux sautent dans le pré.",
      "sentenceEn": "The lambs jump in the meadow.",
      "audioWord": "/syllables_pluriel/audio/agneaux_word.wav",
      "audioSentence": "/syllables_pluriel/audio/agneaux_sentence.wav",
      "image": "/syllables_pluriel/images/agneaux.png"
    }
  ]
}
```

## Incremental runs

Re-running is safe. The script skips any word where all three assets already exist on disk.
To regenerate a specific asset, delete the file and re-run.

## Hardware notes

- **GPU:** CUDA (8+ GB VRAM) recommended for SDXL. Apple Silicon MPS is supported but slower.
  CPU-only works but image generation will take several minutes per word.
- **RAM:** NLLB-200 (~1.2 GB) + SDXL (~6.5 GB in fp16) need to fit in VRAM/RAM.
  On CPU, SDXL loads in fp32 (~13 GB RAM).
- **Ollama:** Runs independently and manages its own GPU/memory allocation.
