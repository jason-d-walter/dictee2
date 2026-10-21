import { ReactNode } from 'react';
import { Token } from '../../types';
import { splitFocus } from '../../utils/text';
import { wordIndexes } from '../../utils/sentence';

const GROUP_COLORS = ['border-sky', 'border-lavender', 'border-bubblegum', 'border-mint'];

interface SentenceTextProps {
  tokens: Token[];
  focus: string;
  activeWord?: number;
  showFocus?: boolean;
  showGroups?: boolean;
  onWordTap?: (wordIndex: number) => void;
  /** Replace how a word is drawn, e.g. with a blank slot. Return undefined to keep the default. */
  renderWord?: (tokenIndex: number, wordIndex: number) => ReactNode | undefined;
}

export default function SentenceText({
  tokens,
  focus,
  activeWord = -1,
  showFocus = false,
  showGroups = false,
  onWordTap,
  renderWord,
}: SentenceTextProps) {
  const indexes = wordIndexes(tokens);

  return (
    <p className="text-3xl md:text-4xl leading-[2.4] text-slate-800 font-bold text-center">
      {tokens.map((token, tokenIndex) => {
        const wordIndex = indexes[tokenIndex];
        const custom = wordIndex >= 0 ? renderWord?.(tokenIndex, wordIndex) : undefined;
        const groupBorder = showGroups ? `border-b-4 ${GROUP_COLORS[token.segment % GROUP_COLORS.length]}` : '';

        return (
          <span key={tokenIndex} className={`${groupBorder} pb-1`}>
            {custom ?? (
              <Word
                token={token}
                focus={focus}
                active={wordIndex >= 0 && wordIndex === activeWord}
                showFocus={showFocus}
                onTap={wordIndex >= 0 && onWordTap ? () => onWordTap(wordIndex) : undefined}
              />
            )}
            {token.space && ' '}
          </span>
        );
      })}
    </p>
  );
}

interface WordProps {
  token: Token;
  focus: string;
  active: boolean;
  showFocus: boolean;
  onTap?: () => void;
}

function Word({ token, focus, active, showFocus, onTap }: WordProps) {
  if (!token.word) return <>{token.text}</>;

  const parts = showFocus && token.focus ? splitFocus(token.text, focus) : [{ text: token.text, focus: false }];
  const content = parts.map((part, i) =>
    part.focus ? (
      <span key={i} className="text-orange-500 underline decoration-4 underline-offset-8 decoration-orange-400">
        {part.text}
      </span>
    ) : (
      part.text
    ),
  );
  const highlight = active ? 'bg-sunshine shadow-md' : '';

  if (!onTap) return <span className={`inline-block rounded-xl px-1 transition-all ${highlight}`}>{content}</span>;

  return (
    <button
      onClick={onTap}
      className={`inline-block rounded-xl px-1 transition-all active:scale-95 hover:bg-yellow-100 ${highlight}`}
    >
      {content}
    </button>
  );
}
