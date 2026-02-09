# Dictée

A French spelling practice app for Grade 2 students. Built with React + TypeScript + Vite.

## Quick Start

### Run the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at **http://localhost:5173**

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build
```

## Project Structure

Each week's assets live in a subdirectory under `public/` named by sound theme:

```
public/
├── metadata.yaml              # Registry of all weeks
├── ez/                        # Sound theme "ez"
│   ├── manifest.json          # Word metadata (sentences, file paths)
│   ├── words_of_week.txt      # Source word list
│   ├── audio/                 # Word and sentence audio files
│   └── images/                # Word illustrations
├── er-oi/                     # Sound theme "er-oi"
│   ├── manifest.json
│   ├── words_of_week.txt
│   ├── audio/
│   └── images/
```

The `metadata.yaml` file registers all available weeks:

```yaml
dictee:
  - sounds: ez
    path: ez
    week_start: '2026-02-09'
    week_end: '2026-02-12'
    date_of_generation: '2026-02-08'
    source: words_of_week.txt
  - sounds: er-oi
    path: er-oi
    week_start: '2026-02-02'
    week_end: '2026-02-07'
    date_of_generation: '2026-02-01'
    source: words_of_week.txt
```

The app auto-selects the most recent week and provides a dropdown to switch between weeks.

## Asset Generation

The app uses pre-generated audio and images. To generate assets for a new week:

### 1. Create the Word List

Create `public/<sound>/words_of_week.txt` with one word per line:

```bash
mkdir -p public/ou/audio public/ou/images
cat > public/ou/words_of_week.txt << 'EOF'
cou
fou
loup
EOF
```

### 2. Set Up Python Environment

```bash
cd scripts

# Create virtual environment (first time only)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Google Cloud

Create a `.env` file in the project root:

```
GOOGLE_PROJECT_NAME=your-gcp-project-id
```

Make sure you have:
- Google Cloud CLI installed and authenticated (`gcloud auth application-default login`)
- Vertex AI API enabled in your project
- Appropriate permissions for Gemini and Imagen APIs

### 4. Generate Assets

```bash
# From project root, with venv activated
python scripts/generate_assets.py --sounds ou --week-start 2026-02-16 --week-end 2026-02-19
```

**Options:**

```bash
# Custom subdirectory name (defaults to --sounds value)
python scripts/generate_assets.py --sounds ou --week-start 2026-02-16 --week-end 2026-02-19 --path ou-week2

# Custom rate limit for image generation (default: 60 seconds)
python scripts/generate_assets.py --sounds ou --week-start 2026-02-16 --week-end 2026-02-19 --image-rate-limit 90

# Disable rate limiting
python scripts/generate_assets.py --sounds ou --week-start 2026-02-16 --week-end 2026-02-19 --image-rate-limit 0
```

The script is **incremental** - it only generates missing assets. Re-running for the same week will skip already-generated files.

**Generated files per week:**
- `public/<sound>/manifest.json` - Word metadata (sentences, file paths)
- `public/<sound>/audio/{word}_word.wav` - Word pronunciation
- `public/<sound>/audio/{word}_sentence.wav` - Sentence pronunciation
- `public/<sound>/images/{word}.png` - Illustration for the word

The script also appends/updates the week entry in `public/metadata.yaml`.

## Game Modes

1. **Exploration** - Browse words with images and sentences
2. **Audio Match** - Hear a word, tap the matching bubble
3. **Lettres Perdues** - Fill in missing letters by dragging
4. **Dictée Fantôme** - Type the word from audio only

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Google Vertex AI (Gemini for text/TTS, Imagen for images)
