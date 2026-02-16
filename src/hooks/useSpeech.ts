import { useCallback, useRef, useState } from 'react';
import { SupportedLanguage } from '../types';

const BCP47_MAP: Record<SupportedLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

interface UseSpeechReturn {
  speak: (text: string) => void;
  speakAudio: (audioPath: string) => void;
  speaking: boolean;
  stop: () => void;
}

export function useSpeech(language: SupportedLanguage = 'fr'): UseSpeechReturn {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Stop Web Speech API
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakAudio = useCallback((audioPath: string) => {
    stop();

    const audio = new Audio(audioPath);
    audioRef.current = audio;

    audio.onplay = () => setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => {
      setSpeaking(false);
      console.warn(`Failed to play audio: ${audioPath}`);
    };

    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
      setSpeaking(false);
    });
  }, [stop]);

  const speak = useCallback((text: string) => {
    // Fallback to Web Speech API
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    stop();

    const bcp47 = BCP47_MAP[language];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a matching voice
    const langPrefix = language;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      voice => voice.lang.startsWith(langPrefix) && voice.localService
    ) || voices.find(
      voice => voice.lang.startsWith(langPrefix)
    );

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [stop, language]);

  return { speak, speakAudio, speaking, stop };
}
