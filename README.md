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

## Asset Generation

The app uses pre-generated audio and images for better quality. To generate assets for new words:

### 1. Add Words

Edit `public/words_of_week.txt` with one word per line:

```
air
faire
jamais
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
python scripts/generate_assets.py
```

**Options:**

```bash
# Custom rate limit for image generation (default: 60 seconds)
python scripts/generate_assets.py --image-rate-limit 90

# Disable rate limiting
python scripts/generate_assets.py --image-rate-limit 0
```

The script is **incremental** - it only generates missing assets. If you add new words to `words_of_week.txt`, only those new words will be processed.

**Generated files:**
- `public/manifest.json` - Word metadata (sentences, file paths)
- `public/audio/{word}_word.wav` - Word pronunciation
- `public/audio/{word}_sentence.wav` - Sentence pronunciation
- `public/images/{word}.png` - Illustration for the word

## Game Modes

1. **Audio Match** - Hear a word, tap the matching bubble
2. **Lettres Perdues** - Fill in missing letters by dragging
3. **Dictée Fantôme** - Type the word from audio only
4. **Exploration** - Browse words with images and sentences

## Admin

Access the admin panel to manage words at `/admin` (password: `dictee2024`)

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Google Vertex AI (Gemini for text/TTS, Imagen for images)
