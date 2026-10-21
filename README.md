# Ma dictée

A French dictée practice app for Grade 3: understanding and writing whole sentences, built
around the week's sound (e.g. « oi »). React + TypeScript + Vite + Tailwind, deployed on Vercel.

The Grade 2 word-based version is archived at the `grade2-words-archive` tag.

## Levels

1. **J'explore** — listen with word-by-word highlighting, tap a word to hear it, show the
   week's sound and the word groups, then rebuild the sentence from shuffled groups.
2. **Les mots manquants** — put missing words back from a word bank that includes
   sound-alike traps (toi / toit). Step 1 hides the focus-sound words, step 2 a few more,
   step 3 half the sentence.
3. **La dictée** — hear the whole sentence or one group at a time and type it. Marking is
   word by word: missing accents or capitals count as « presque ».

Playback speed (🐢 0.6× to 🐇 1×) applies everywhere and is remembered on the device.

## Run the app

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests for marking and blanks
npm run build
```

## Adding a week

Each week lives in `public/weeks/<week>/`. Write the teacher's sentences in `dictee.yaml`;
`/` marks where the teacher pauses when dictating (it isn't shown in the app):

```yaml
focus: oi
week_start: '2026-10-19'
week_end: '2026-10-23'
sentences:
  - day: 2
    text: "Parfois, / ils n'ont pas le droit / de se promener / car ils ont froid."
```

Then generate audio and word timings, all offline:

```bash
python -m venv scripts/venv
scripts/venv/bin/pip install -r scripts/requirements.txt
scripts/venv/bin/python scripts/generate_sentences.py --week 2026-10-19-oi
```

This needs the Piper voice `fr_FR-siwis-medium` in `~/.local/share/piper-voices/`:

```bash
mkdir -p ~/.local/share/piper-voices/fr_FR-siwis-medium && cd $_
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx
curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json
```

The script writes `audio/s<n>.wav` and `manifest.json` for the week and registers it in
`public/weeks/index.json`. Word timings come from aligning the audio with faster-whisper
(the `small` model downloads on first run). It only regenerates sentences whose text
changed; use `--force` to redo everything and `--length-scale 1.3` for a slower voice.
