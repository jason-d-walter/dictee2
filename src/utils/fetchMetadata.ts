import yaml from 'js-yaml';
import { DicteeMetadata } from '../types';

export async function fetchMetadata(): Promise<DicteeMetadata | null> {
  try {
    const response = await fetch('/metadata.yaml');
    if (!response.ok) return null;
    const text = await response.text();
    return yaml.load(text) as DicteeMetadata;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}
