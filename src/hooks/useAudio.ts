import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Google Translate language code mapping ───────────────────────────────────
// Maps internal lang codes to Google Translate TTS language tags
const GOOGLE_TTS_LANG: Record<string, string> = {
  en: 'en', hi: 'hi', bn: 'bn', ta: 'ta', te: 'te',
  mr: 'mr', gu: 'gu', kn: 'kn', ml: 'ml', pa: 'pa',
  or: 'or', as: 'as', mni: 'mni', sat: 'hi', doi: 'hi',
  mai: 'mai', kok: 'kok', brx: 'hi', ks: 'ur', sa: 'sa',
  ne: 'ne', sd: 'sd', ur: 'ur', bho: 'bho', awa: 'hi',
  mag: 'hi', raj: 'hi', mwr: 'hi', bgc: 'hi', hne: 'hi',
  bhb: 'hi', gon: 'hi', tcy: 'kn', kha: 'en', lus: 'en',
  grt: 'bn', trp: 'bn',
};

// ─── Web Speech BCP-47 fallback map (used if Google proxy fails) ──────────────
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

// ─── Google TTS API via our Vercel proxy ──────────────────────────────────────
async function speakViaGoogleTTS(
  text: string,
  langCode: string,
  onEnd: () => void,
  onError: (msg: string) => void
): Promise<boolean> {
  const googleLang = GOOGLE_TTS_LANG[langCode] || 'hi';

  // Google TTS has a limit of ~200 chars per request — split if needed
  const chunks = text.length > 180
    ? (text.match(/[^.!?,;\n]{1,180}[.!?,;\n]*/g) || [text])
    : [text];

  try {
    // Fetch all chunks in parallel
    const audioBuffers = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `/api/tts?text=${encodeURIComponent(chunk.trim())}&lang=${encodeURIComponent(googleLang)}`
        );
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.arrayBuffer();
      })
    );

    // Concatenate all audio buffers
    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Decode and play via Web Audio API
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const decoded = await audioCtx.decodeAudioData(combined.buffer);
    const source = audioCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(audioCtx.destination);
    source.onended = () => {
      audioCtx.close();
      onEnd();
    };
    source.start();
    return true;
  } catch (err) {
    console.warn('Google TTS failed, falling back to Web Speech:', err);
    return false;
  }
}

// ─── Web Speech fallback ───────────────────────────────────────────────────────
function speakViaWebSpeech(
  text: string,
  langCode: string,
  onEnd: () => void,
  onError: (msg: string) => void
) {
  if (!('speechSynthesis' in window)) {
    onError('TTS not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();
  const lang = WEB_SPEECH_LANG[langCode] || 'hi-IN';

  const speakChunk = (chunk: string, isLast: boolean) => {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    u.lang = lang;
    u.rate = 0.9;
    if (isLast) u.onend = onEnd;
    u.onerror = (e: any) => {
      if (e.error !== 'interrupted') onError(`Audio error: ${e.error || 'Unknown'}`);
    };
    window.speechSynthesis.speak(u);
  };

  if (text.length > 200) {
    const chunks = text.match(/[^.!?\n]{1,200}[.!?\n]*/g) || [text];
    chunks.forEach((chunk, i) => speakChunk(chunk, i === chunks.length - 1));
  } else {
    speakChunk(text, true);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAudio() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

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
    const computedLang = langCode.includes('-') ? langCode : `${langCode}-IN`;
    recognition.lang = computedLang;
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

  // ─── TTS ──────────────────────────────────────────────────────────────────
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

    // 1. Try Google TTS proxy (supports all Indian languages)
    const success = await speakViaGoogleTTS(text, langCode, onEnd, onError);

    // 2. If that fails (network, quota), fall back to browser Web Speech API
    if (!success) {
      speakViaWebSpeech(text, langCode, onEnd, onError);
    }
  };

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    playSpeech,
    stopSpeech,
  };
}
