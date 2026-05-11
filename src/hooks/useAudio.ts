import { useState, useCallback, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';

// ─── Google Translate language code mapping ───────────────────────────────────
const GOOGLE_TTS_LANG: Record<string, string> = {
  en: 'en', hi: 'hi', bn: 'bn', ta: 'ta', te: 'te',
  mr: 'mr', gu: 'gu', kn: 'kn', ml: 'ml', pa: 'pa',
  or: 'or', as: 'as', mni: 'hi', sat: 'hi', doi: 'hi',
  mai: 'hi', kok: 'hi', brx: 'hi', ks: 'ur', sa: 'hi',
  ne: 'ne', sd: 'sd', ur: 'ur', bho: 'hi', awa: 'hi',
  mag: 'hi', raj: 'hi', mwr: 'hi', bgc: 'hi', hne: 'hi',
  bhb: 'hi', gon: 'hi', tcy: 'kn', kha: 'en', lus: 'en',
  grt: 'bn', trp: 'bn',
};

// ─── Web Speech BCP-47 fallback map ──────────────────────────────────────────
const WEB_SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN',
  mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN',
  or: 'or-IN', as: 'bn-IN', mni: 'bn-IN', sat: 'hi-IN', doi: 'hi-IN',
  mai: 'hi-IN', kok: 'mr-IN', brx: 'hi-IN', ks: 'ur-IN', sa: 'hi-IN',
  ne: 'ne-NP', sd: 'ur-IN', ur: 'ur-IN', bho: 'hi-IN', awa: 'hi-IN',
  mag: 'hi-IN', raj: 'hi-IN', mwr: 'hi-IN', bgc: 'hi-IN', hne: 'hi-IN',
  bhb: 'hi-IN', gon: 'hi-IN', tcy: 'kn-IN', kha: 'en-IN', lus: 'en-IN',
  grt: 'bn-IN', trp: 'bn-IN',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAudio() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // ─── STT ──────────────────────────────────────────────────────────────────
  const startListening = (
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    langCode: string = 'en'
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError('Speech recognition unavailable. Use Chrome.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langCode.includes('-') ? langCode : `${langCode}-IN`;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      onError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (interim) onResult(interim, false);
      if (final) onResult(final, true);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // ─── TTS Logic ──────────────────────────────────────────────────────────

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (_) {}
      audioSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const playSpeech = async (
    text: string,
    onError: (err: string) => void,
    langCode: string = 'en'
  ) => {
    if (!text.trim()) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    setIsSpeaking(true);
    const onEnd = () => setIsSpeaking(false);

    try {
      // 1. Try Gemini Native TTS (High Quality, Multilingual)
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0)).buffer;
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const decodedBuffer = await audioContextRef.current.decodeAudioData(audioData);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = onEnd;
        audioSourceRef.current = source;
        source.start(0);
        return;
      }
    } catch (err) {
      console.warn("Gemini TTS failed, trying fallbacks...");
    }

    // 2. Fallback: Google Translate TTS via Proxy
    try {
      const googleLang = GOOGLE_TTS_LANG[langCode] || 'hi';
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text.slice(0, 200))}&lang=${googleLang}`);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const decoded = await audioContextRef.current.decodeAudioData(buffer);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = decoded;
        source.connect(audioContextRef.current.destination);
        source.onended = onEnd;
        audioSourceRef.current = source;
        source.start(0);
        return;
      }
    } catch (err) {
      console.warn("Proxy TTS failed, using Web Speech API...");
    }

    // 3. Last Resort: Web Speech API
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = WEB_SPEECH_LANG[langCode] || 'hi-IN';
      u.onend = onEnd;
      u.onerror = () => {
        onError("TTS Output failed across all engines.");
        onEnd();
      };
      window.speechSynthesis.speak(u);
    } else {
      onError("TTS not supported in this browser.");
      onEnd();
    }
  };

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    playSpeech,
    stopSpeech,
  };
}
