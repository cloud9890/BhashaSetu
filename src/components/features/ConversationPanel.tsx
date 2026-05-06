import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SUPPORTED_LANGUAGES, translateText } from '../../services/geminiService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConvoMessage {
  speaker: 'A' | 'B';
  original: string;
  translated: string;
  langA: string;
  langB: string;
}

// ─── TTS helper (synchronous, must be called in click context) ────────────────
function speakText(text: string, langCode: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const lang = langCode.includes('-') ? langCode : `${langCode}-IN`;
  const chunks = text.length > 200
    ? (text.match(/[^.!?\n]{1,200}[.!?\n]*/g) || [text])
    : [text];
  chunks.forEach(chunk => {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  });
}

// ─── STT helper ───────────────────────────────────────────────────────────────
function createRecognition(
  langCode: string,
  onInterim: (t: string) => void,
  onFinal: (t: string) => void,
  onEnd: () => void,
  onError: (e: string) => void
) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { onError('Speech recognition unavailable. Use Chrome.'); return null; }

  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = langCode.includes('-') ? langCode : `${langCode}-IN`;
  r.maxAlternatives = 1;

  r.onresult = (e: any) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    if (interim) onInterim(interim);
    if (final) onFinal(final);
  };

  r.onerror = (e: any) => {
    if (e.error === 'no-speech') return;
    onError(`Mic error: ${e.error}`);
    onEnd();
  };

  r.onend = onEnd;
  return r;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ConversationPanelProps {
  setError: (e: string) => void;
}

export function ConversationPanel({ setError }: ConversationPanelProps) {
  const [langA, setLangA] = useState('en');
  const [langB, setLangB] = useState('hi');
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [activeListener, setActiveListener] = useState<'A' | 'B' | null>(null);
  const [interimTextA, setInterimTextA] = useState('');
  const [interimTextB, setInterimTextB] = useState('');
  const [translating, setTranslating] = useState(false);

  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTextA, interimTextB]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recogRef.current) {
        try { recogRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  const stopCurrent = () => {
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch (_) {}
      recogRef.current = null;
    }
    setInterimTextA('');
    setInterimTextB('');
    setActiveListener(null);
  };

  const handleFinishedUtterance = async (speaker: 'A' | 'B', text: string) => {
    if (!text.trim()) return;
    stopCurrent();
    setTranslating(true);

    const sourceLang = speaker === 'A' ? langA : langB;
    const targetLang = speaker === 'A' ? langB : langA;
    const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Hindi';

    try {
      const result = await translateText(text.trim(), targetLangName);
      const translated = result.translation || text;

      const newMsg: ConvoMessage = {
        speaker,
        original: text.trim(),
        translated,
        langA,
        langB,
      };

      setMessages(prev => [...prev, newMsg]);

      // Automatically speak the translation to the other person
      speakText(translated, targetLang);
    } catch (e) {
      setError('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const toggleMic = (speaker: 'A' | 'B') => {
    // If already listening for this speaker, stop
    if (activeListener === speaker) {
      stopCurrent();
      return;
    }

    // Stop previous listener if switching
    stopCurrent();

    const lang = speaker === 'A' ? langA : langB;
    const setInterim = speaker === 'A' ? setInterimTextA : setInterimTextB;

    const recog = createRecognition(
      lang,
      (t) => setInterim(t),
      (t) => handleFinishedUtterance(speaker, t),
      () => {
        setActiveListener(null);
        setInterim('');
      },
      (e) => {
        setError(e);
        setActiveListener(null);
        setInterim('');
      }
    );

    if (recog) {
      recog.start();
      recogRef.current = recog;
      setActiveListener(speaker);
    }
  };

  const langAName = SUPPORTED_LANGUAGES.find(l => l.code === langA)?.name || 'English';
  const langBName = SUPPORTED_LANGUAGES.find(l => l.code === langB)?.name || 'Hindi';

  return (
    <div className="flex flex-col h-[580px] border border-[#141414] overflow-hidden bg-white/10">
      {/* ── Language selectors ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 border-b border-[#141414]">
        {/* Speaker A language */}
        <div className="flex flex-col border-r border-[#141414]">
          <div className="px-4 py-2 bg-[#141414] text-[#E4E3E0] flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-70">Speaker A</span>
          </div>
          <div className="relative">
            <select
              value={langA}
              onChange={(e) => setLangA(e.target.value)}
              className="w-full bg-transparent p-3 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
          </div>
        </div>

        {/* Speaker B language */}
        <div className="flex flex-col">
          <div className="px-4 py-2 bg-white/50 border-b border-[#141414]/10 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-70">Speaker B</span>
            <button
              onClick={() => setMessages([])}
              title="Clear conversation"
              className="text-[9px] font-mono uppercase text-red-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Clear
            </button>
          </div>
          <div className="relative">
            <select
              value={langB}
              onChange={(e) => setLangB(e.target.value)}
              className="w-full bg-transparent p-3 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Message feed ───────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.length === 0 && !interimTextA && !interimTextB && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20 select-none">
            <Mic className="w-14 h-14 mb-4" />
            <p className="text-xs font-mono uppercase">
              Press a mic button below to start speaking
            </p>
            <p className="text-[9px] mt-2 uppercase tracking-widest">
              Translation is spoken automatically
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isA = msg.speaker === 'A';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex flex-col gap-1', isA ? 'items-start' : 'items-end')}
              >
                <span className="text-[8px] font-mono uppercase opacity-40 px-1">
                  Speaker {msg.speaker} · {isA ? langAName : langBName}
                </span>
                {/* Original */}
                <div className={cn(
                  'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed',
                  isA
                    ? 'bg-[#141414] text-[#E4E3E0] rounded-br-lg rounded-tr-lg rounded-bl-sm'
                    : 'bg-white border border-[#141414]/20 text-[#141414] rounded-bl-lg rounded-tl-lg rounded-br-sm'
                )}>
                  {msg.original}
                </div>
                {/* Translation */}
                <div className={cn(
                  'max-w-[85%] px-3 py-1.5 text-[11px] italic flex items-center gap-2',
                  isA ? 'text-amber-700' : 'text-blue-700'
                )}>
                  <Volume2 className="w-2.5 h-2.5 opacity-60 shrink-0" />
                  {msg.translated}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Interim text previews */}
        {interimTextA && (
          <div className="flex flex-col items-start gap-1">
            <span className="text-[8px] font-mono uppercase opacity-40 px-1">Speaker A · speaking...</span>
            <div className="max-w-[85%] px-4 py-2.5 bg-[#141414]/40 text-[#141414] text-sm italic rounded-br-lg rounded-tr-lg opacity-60">
              {interimTextA}
            </div>
          </div>
        )}
        {interimTextB && (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[8px] font-mono uppercase opacity-40 px-1">Speaker B · speaking...</span>
            <div className="max-w-[85%] px-4 py-2.5 bg-white/70 border border-[#141414]/10 text-[#141414] text-sm italic rounded-bl-lg rounded-tl-lg opacity-60">
              {interimTextB}
            </div>
          </div>
        )}

        {translating && (
          <div className="flex justify-center">
            <span className="text-[9px] font-mono uppercase opacity-40 animate-pulse">Translating...</span>
          </div>
        )}
      </div>

      {/* ── Mic buttons ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 border-t border-[#141414]">
        {/* Speaker A mic */}
        <button
          onClick={() => toggleMic('A')}
          disabled={translating || (activeListener === 'B')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-5 border-r border-[#141414] transition-all duration-200 disabled:opacity-30',
            activeListener === 'A'
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-transparent text-[#141414] hover:bg-[#141414]/5'
          )}
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
            activeListener === 'A'
              ? 'border-[#E4E3E0] animate-pulse bg-[#E4E3E0]/10'
              : 'border-[#141414]'
          )}>
            {activeListener === 'A' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest">
              {activeListener === 'A' ? 'Tap to Stop' : 'Speaker A'}
            </p>
            <p className="text-[8px] opacity-50">{langAName}</p>
          </div>
        </button>

        {/* Speaker B mic */}
        <button
          onClick={() => toggleMic('B')}
          disabled={translating || (activeListener === 'A')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-5 transition-all duration-200 disabled:opacity-30',
            activeListener === 'B'
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-transparent text-[#141414] hover:bg-[#141414]/5'
          )}
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
            activeListener === 'B'
              ? 'border-[#E4E3E0] animate-pulse bg-[#E4E3E0]/10'
              : 'border-[#141414]'
          )}>
            {activeListener === 'B' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
          <div className="text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest">
              {activeListener === 'B' ? 'Tap to Stop' : 'Speaker B'}
            </p>
            <p className="text-[8px] opacity-50">{langBName}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
