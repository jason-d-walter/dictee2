import { useCallback, useRef, useState } from 'react';

interface UseSpeechReturn {
  speak: (text: string) => void;
  speakAudio: (audioPath: string) => void;
  speaking: boolean;
  stop: () => void;
}

export function useSpeech(): UseSpeechReturn {
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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a French voice
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      voice => voice.lang.startsWith('fr') && voice.localService
    ) || voices.find(
      voice => voice.lang.startsWith('fr')
    );

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [stop]);

  return { speak, speakAudio, speaking, stop };
}
