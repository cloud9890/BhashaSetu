import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Settings2, Upload, Video, Mic, MicOff, Hand, Camera, Loader2, Send, FileText, ArrowLeftRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tab, Message } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../services/geminiService';
import { ConversationPanel } from '../features/ConversationPanel';

interface TabPanelsProps {
  activeTab: Tab;
  sourceLang: string;
  setSourceLang: (v: string) => void;
  targetLang: string;
  setTargetLang: (v: string) => void;
  detecting: boolean;
  handleDetectLanguage: () => void;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  
  simplifyDomain: 'legal' | 'medical';
  setSimplifyDomain: (v: 'legal' | 'medical') => void;
  targetScript: string;
  setTargetScript: (v: string) => void;
  summaryLength: 'short' | 'medium' | 'long';
  setSummaryLength: (v: 'short' | 'medium' | 'long') => void;
  syntheticCount: number;
  setSyntheticCount: (v: number) => void;

  topic: string;
  setTopic: (v: string) => void;

  handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  videoPreview: string | null;
  videoFile: File | null;
  setVideoPreview: (v: string | null) => void;
  setVideoFile: (v: File | null) => void;

  documentFile: File | null;
  setDocumentFile: (v: File | null) => void;

  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendMessage: (text: string, role: 'user' | 'assistant') => void;

  startCamera: () => Promise<void>;
  startListening: (onResult: (t: string, isFinal: boolean) => void, onError: (e: string) => void, langCode?: string) => void;
  stopListening: () => void;
  isListening: boolean;

  handleAction: () => void;
  loading: boolean;
  
  setError: (err: string) => void;
}

export function TabPanels({
  activeTab, sourceLang, setSourceLang, targetLang, setTargetLang, detecting, handleDetectLanguage,
  inputText, setInputText, simplifyDomain, setSimplifyDomain,
  targetScript, setTargetScript, summaryLength, setSummaryLength,
  syntheticCount, setSyntheticCount, topic, setTopic,
  handleVideoUpload, videoPreview, videoFile, setVideoPreview, setVideoFile,
  documentFile, setDocumentFile,
  messages, setMessages, sendMessage, startCamera, startListening, stopListening, isListening,
  handleAction, loading, setError
}: TabPanelsProps) {

  // Live interim text for STT display in the textarea
  const [interimText, setInterimText] = useState('');

  const handleStartListening = () => {
    if (isListening) {
      stopListening();
      setInterimText('');
      return;
    }
    // Use source lang (English default), since we are capturing user's input
    startListening(
      (transcript, isFinal) => {
        if (isFinal) {
          setInputText(prev => (prev ? prev + ' ' : '') + transcript);
          setInterimText('');
        } else {
          setInterimText(transcript);
        }
      },
      (err) => setError(err),
      'en' // Default STT in English; can be changed
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">

        {/* ── Google Translate-style language bar ──────────────────────── */}
        {activeTab !== 'conversation' && activeTab !== 'augmentation' && activeTab !== 'transliterate' && (
          <div className="flex items-stretch border border-[#141414] overflow-hidden">
            {/* Source language */}
            <div className="flex-1 relative">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full h-full bg-[#141414] text-[#E4E3E0] px-3 py-2.5 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-8"
              >
                <option value="detect" className="bg-[#141414]">Detect language</option>
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-[#141414]">{l.name}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                {detecting
                  ? <Loader2 className="w-3 h-3 text-[#E4E3E0] animate-spin" />
                  : <Search className="w-3 h-3 text-[#E4E3E0] opacity-50" />
                }
              </div>
            </div>

            {/* Swap button */}
            <button
              onClick={() => {
                const prev = sourceLang === 'detect' ? 'en' : sourceLang;
                setSourceLang(targetLang);
                setTargetLang(prev);
              }}
              title="Swap languages"
              className="px-3 border-x border-[#141414]/30 bg-[#141414] text-[#E4E3E0] hover:opacity-70 transition-opacity flex items-center"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            {/* Target language */}
            <div className="flex-1 relative">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full h-full bg-[#E4E3E0] text-[#141414] px-3 py-2.5 text-sm font-medium focus:outline-none appearance-none cursor-pointer pr-6"
              >
                {SUPPORTED_LANGUAGES.filter(l => l.code !== 'en' || targetLang === 'en').map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
              </div>
            </div>
          </div>
        )}

        {/* Feature Specific Controls */}
        <AnimatePresence mode="wait">
          {activeTab === 'docubridge' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2"
            >
              <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                Text Mode: Domain
              </label>
              <div className="flex gap-2">
                {(['legal', 'medical'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setSimplifyDomain(d)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-mono uppercase border border-[#141414] rounded-sm transition-all",
                      simplifyDomain === d ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-[9px] opacity-40 uppercase">Only applies when simplifying text. Ignored for document uploads.</p>
            </motion.div>
          )}

          {activeTab === 'transliterate' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2"
            >
              <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                Target Script
              </label>
              <select 
                value={targetScript}
                onChange={(e) => setTargetScript(e.target.value)}
                className="w-full bg-transparent border border-[#141414] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all"
              >
                {['Devanagari', 'Bengali', 'Gujarati', 'Gurmukhi', 'Kannada', 'Malayalam', 'Odia', 'Tamil', 'Telugu', 'Latin'].map(script => (
                  <option key={script} value={script}>{script}</option>
                ))}
              </select>
            </motion.div>
          )}

          {activeTab === 'summarize' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2"
            >
              <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                Summary Length
              </label>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as const).map((len) => (
                  <button
                    key={len}
                    onClick={() => setSummaryLength(len)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-mono uppercase border border-[#141414] rounded-sm transition-all",
                      summaryLength === len ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-[#141414]/5"
                    )}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'augmentation' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2"
            >
              <label className="text-[10px] font-mono uppercase opacity-50 flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                Sentence Count: {syntheticCount}
              </label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={syntheticCount}
                onChange={(e) => setSyntheticCount(parseInt(e.target.value))}
                className="w-full accent-[#141414]"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeTab === 'video' ? (
        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-mono uppercase opacity-50">Upload Video Content</label>
          <div className="border-2 border-dashed border-[#141414]/20 p-8 rounded-sm text-center hover:border-[#141414] transition-all relative">
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleVideoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {videoPreview ? (
              <div className="flex flex-col items-center gap-2">
                <Video className="w-8 h-8 opacity-40" />
                <p className="text-xs font-mono">{videoFile?.name}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setVideoPreview(null); setVideoFile(null); }}
                  className="text-[10px] text-red-600 uppercase font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 opacity-20" />
                <p className="text-xs opacity-50">Click or drag video to analyze</p>
                <p className="text-[9px] opacity-30 uppercase">Max 20MB recommended</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'docubridge' ? (
        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-mono uppercase opacity-50">Upload Document (optional)</label>
          <div className="border-2 border-dashed border-[#141414]/20 p-6 rounded-sm text-center hover:border-[#141414] transition-all relative">
            <input 
              type="file" 
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDocumentFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {documentFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 opacity-40 text-blue-600" />
                <p className="text-xs font-mono">{documentFile.name}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDocumentFile(null); }}
                  className="text-[10px] text-red-600 uppercase font-bold hover:underline relative z-10"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 opacity-20" />
                <p className="text-xs opacity-50">Drop PDF / Word Doc to translate</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <div className="flex-1 h-px bg-[#141414]" />
            <span className="text-[9px] font-mono uppercase">or simplify text below</span>
            <div className="flex-1 h-px bg-[#141414]" />
          </div>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste legal or medical text to simplify..."
            disabled={!!documentFile}
            className="w-full h-32 bg-transparent border border-[#141414] p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all resize-none disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      ) : activeTab === 'conversation' ? (
        <ConversationPanel setError={setError} />
      ) : activeTab === 'sign' ? (
        <div className="flex flex-col gap-6 items-center justify-center py-10 border-2 border-dashed border-[#141414]/20 rounded-sm bg-white/10">
          <Hand className="w-16 h-16 opacity-20 mb-4" />
          <p className="text-xs font-mono uppercase opacity-50 text-center px-6">
            Use your camera to identify and translate hand sign language gestures in real-time.
          </p>
          <button 
            onClick={startCamera}
            className="mt-6 bg-[#141414] text-[#E4E3E0] px-6 py-3 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all rounded-sm"
          >
            <Camera className="w-4 h-4" />
            Open Sign Camera
          </button>
        </div>
      ) : activeTab === 'augmentation' ? (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono uppercase opacity-50">Topic for Generation</label>
          <input 
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Agriculture, Education, Local Governance"
            className="w-full bg-transparent border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 relative">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase opacity-50">Input Text</label>
            <div className="flex gap-2">
              <button 
                onClick={startCamera}
                className="p-1.5 rounded-full transition-all bg-[#141414]/5 text-[#141414] hover:bg-[#141414]/10"
                title="Extract text from camera"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleStartListening}
                className={cn(
                  "p-1.5 rounded-full transition-all",
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-[#141414]/5 text-[#141414] hover:bg-[#141414]/10"
                )}
                title={isListening ? "Listening..." : "Start Speech-to-Text"}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <textarea 
            value={isListening && interimText ? inputText + ' ' + interimText : inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'Listening... speak now' : 'Enter text to process...'}
            className={cn(
              'w-full h-48 bg-transparent border border-[#141414] p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] transition-all resize-none',
              isListening && 'border-red-500/50 ring-1 ring-red-500/30'
            )}
          />
          {isListening && (
            <p className="text-[9px] font-mono uppercase text-red-600 opacity-70 animate-pulse">Listening... tap mic to stop</p>
          )}
        </div>
      )}

      {activeTab !== 'conversation' && (
        <button
          onClick={handleAction}
          disabled={loading}
          className="w-full bg-[#141414] text-[#E4E3E0] py-4 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Execute {activeTab}
            </>
          )}
        </button>
      )}
    </div>
  );
}
