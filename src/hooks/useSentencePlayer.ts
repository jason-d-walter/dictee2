import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sentence } from '../types';
import { segmentRanges } from '../utils/sentence';

const GROUP_PAUSE_SECONDS = 0.8;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Plays a sentence's audio at a chosen speed and reports which word is being spoken.
 * Word times come from the manifest, so highlighting stays in sync at any playback rate.
 */
export function useSentencePlayer(sentence: Sentence, rate: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef(0);
  const resolveRef = useRef<(() => void) | null>(null);
  const sequenceRef = useRef(0);  // bumped to cancel a running group-by-group sequence
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const ranges = useMemo(() => segmentRanges(sentence), [sentence]);

  const finish = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    audioRef.current?.pause();
    setPlaying(false);
    setActiveWord(-1);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    const audio = new Audio(sentence.audio);
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      sequenceRef.current++;
      finish();
      audioRef.current = null;
    };
  }, [sentence.audio, finish]);

  const playRange = useCallback(
    (start: number, end: number) => {
      finish();
      const audio = audioRef.current;
      if (!audio) return Promise.resolve();

      return new Promise<void>(resolve => {
        resolveRef.current = resolve;
        const tick = () => {
          const time = audio.currentTime;
          if (time >= end || audio.ended) {
            finish();
            return;
          }
          setActiveWord(sentence.words.findIndex(([s, e]) => time >= s && time < e));
          frameRef.current = requestAnimationFrame(tick);
        };
        audio.currentTime = start;
        audio.playbackRate = rate;
        audio.preservesPitch = true;
        setPlaying(true);
        audio.play().then(tick, finish);
      });
    },
    [finish, rate, sentence.words],
  );

  const stop = useCallback(() => {
    sequenceRef.current++;
    finish();
  }, [finish]);

  const playAll = useCallback(() => {
    sequenceRef.current++;
    return playRange(0, sentence.duration);
  }, [playRange, sentence.duration]);

  const playWord = useCallback(
    (wordIndex: number) => {
      sequenceRef.current++;
      const [start, end] = sentence.words[wordIndex];
      return playRange(start, end);
    },
    [playRange, sentence.words],
  );

  const playSegment = useCallback(
    (segment: number) => {
      sequenceRef.current++;
      return playRange(...ranges[segment]);
    },
    [playRange, ranges],
  );

  /** Read group by group with a pause after each, like a teacher dictating. */
  const playInGroups = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    for (const [start, end] of ranges) {
      await playRange(start, end);
      if (sequenceRef.current !== sequence) return;
      await sleep((GROUP_PAUSE_SECONDS / rate) * 1000);
      if (sequenceRef.current !== sequence) return;
    }
  }, [playRange, ranges, rate]);

  return { playing, activeWord, playAll, playWord, playSegment, playInGroups, stop, segmentCount: ranges.length };
}
