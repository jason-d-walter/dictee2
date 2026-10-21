import { Sentence } from '../../types';

export interface LevelProps {
  sentence: Sentence;
  focus: string;
  rate: number;
  onDone: (score: number) => void;
}
