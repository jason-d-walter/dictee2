import { GradeResult, GradedWord, WordStatus } from '../../utils/grading';

const STYLES: Record<WordStatus, string> = {
  correct: 'bg-green-100 text-green-700',
  almost: 'bg-amber-100 text-amber-700',
  wrong: 'bg-red-100 text-red-700',
  missing: 'border-4 border-dashed border-slate-300 text-slate-400',
};

const LEGEND: [WordStatus, string][] = [
  ['correct', '✓ Bien écrit'],
  ['almost', '≈ Attention aux accents ou majuscules'],
  ['wrong', '✗ À corriger'],
  ['missing', '… Oublié'],
];

/** Each expected word, coloured by how well it was written, with her spelling shown above mistakes. */
export default function GradedSentence({ result }: { result: GradeResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-4">
        {result.words.map((word, i) => (
          <GradedChip key={i} word={word} />
        ))}
      </div>
      {result.extra.length > 0 && (
        <p className="text-center text-slate-500">
          Mots en trop : <span className="line-through text-red-500">{result.extra.join(' ')}</span>
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        {LEGEND.map(([status, label]) => (
          <span key={status} className={`px-2 py-1 rounded-lg ${STYLES[status]}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function GradedChip({ word }: { word: GradedWord }) {
  const showTyped = word.status === 'wrong' || word.status === 'almost';
  return (
    <span className="inline-flex flex-col items-center">
      <span className={`text-lg line-through text-slate-400 ${showTyped ? '' : 'invisible'}`}>{word.typed ?? '-'}</span>
      <span className={`text-3xl font-bold px-2 py-1 rounded-xl ${STYLES[word.status]}`}>{word.expected}</span>
    </span>
  );
}
