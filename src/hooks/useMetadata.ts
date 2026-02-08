import { useState, useEffect } from 'react';
import { DicteeMetadata } from '../types';
import { fetchMetadata } from '../utils/fetchMetadata';

export function useMetadata() {
  const [metadata, setMetadata] = useState<DicteeMetadata | null>(null);

  useEffect(() => {
    fetchMetadata().then(setMetadata);
  }, []);

  return metadata;
}
