import { Word, WordManifest } from '../types';

/**
 * Fetches words from the generated manifest file.
 * Falls back to plain text file if manifest doesn't exist.
 */
export async function fetchWords(weekPath?: string): Promise<Word[]> {
  const base = weekPath ? `/${weekPath}` : '';

  // Try to load the generated manifest first
  try {
    const manifestResponse = await fetch(`${base}/manifest.json`);
    if (manifestResponse.ok) {
      const manifest: WordManifest = await manifestResponse.json();
      return manifest.words;
    }
  } catch (error) {
    console.log('Manifest not found, falling back to text file');
  }

  // Fallback: load plain text file (for development or if script hasn't run)
  try {
    const response = await fetch(`${base}/words_of_week.txt`);
    if (!response.ok) {
      throw new Error('Failed to fetch words');
    }

    const text = await response.text();
    const uniqueTexts = [...new Set(
      text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    )];

    return uniqueTexts.map((text) => ({
      id: text,
      text,
    }));
  } catch (error) {
    console.error('Error fetching words:', error);
    return [];
  }
}
