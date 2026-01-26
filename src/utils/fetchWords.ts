import { Word } from '../types';

const GOOGLE_SHEETS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQz9TGMjgnv1ORLuTHmDjS68nkGIdeiCIhQU-dLOhh7m8PuUyCuBAdXsj0i5UyQeUTKaVeEIWCJ35oc/pub?gid=0&single=true&output=csv';

export async function fetchWordsFromGoogleSheets(): Promise<Word[]> {
  try {
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch words');
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');

    // Skip header row, filter empty lines, deduplicate, create Word objects
    const uniqueTexts = [...new Set(
      lines
        .slice(1) // Skip header
        .map(line => line.trim())
        .filter(line => line.length > 0)
    )];

    const words: Word[] = uniqueTexts.map((text) => ({
      id: text, // Use word text as ID (unique after deduplication)
      text,
    }));

    return words;
  } catch (error) {
    console.error('Error fetching words from Google Sheets:', error);
    return [];
  }
}

// URL for editing the Google Sheet (opens in browser)
export const GOOGLE_SHEETS_EDIT_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQz9TGMjgnv1ORLuTHmDjS68nkGIdeiCIhQU-dLOhh7m8PuUyCuBAdXsj0i5UyQeUTKaVeEIWCJ35oc/pubhtml';
