import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Users, Sparkles, Check, Copy, Volume2, BookOpen, Info, Languages, StopCircle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { Tab } from '../../types';

interface OutputDisplayProps {
  result: any;
  error: string | null;
  setError: (v: string | null) => void;
  activeTab: Tab;
  loading: boolean;
  copied: boolean;
  handleCopy: () => void;
  handleSpeech: (text: string) => void;
  isSpeaking: boolean;
  simplifyDomain?: string;
  targetScript?: string;
}

export function OutputDisplay({
  result, error, setError, activeTab, loading, copied, handleCopy, handleSpeech, isSpeaking, simplifyDomain = 'legal', targetScript = 'Devanagari'
}: OutputDisplayProps) {

  const determineTextToSpeak = () => {
    let textToSpeak = "";
    if (activeTab === 'translate') textToSpeak = result.translation;
    else if (activeTab === 'codeswitch') textToSpeak = result.normalizedText;
    else if (activeTab === 'sign') textToSpeak = result.meaning;
    else if (activeTab === 'idioms') textToSpeak = result.idiomaticEquivalent;
    else if (activeTab === 'docubridge') textToSpeak = typeof result === 'string' ? result : result.simplifiedText;
    else if (activeTab === 'transliterate') textToSpeak = result.transliteratedText;
    else if (activeTab === 'dialect') textToSpeak = result.standardizedText;
    else if (activeTab === 'video') textToSpeak = result.result;
    else if (activeTab === 'sentiment') textToSpeak = result.explanation;
    else textToSpeak = typeof result === 'string' ? result : JSON.stringify(result);
    return textToSpeak;
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <label className="text-[10px] font-mono uppercase opacity-50">Output Result</label>
      <div className="flex-1 border border-[var(--app-fg)] border-dashed p-4 md:p-6 bg-white/30 relative overflow-auto min-h-[250px] md:min-h-[300px] group">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 z-30 bg-[var(--app-bg)]/90 backdrop-blur-sm"
            >
              <AlertCircle className="w-12 h-12 mb-4 text-red-600" />
              <p className="text-sm font-bold text-red-600 uppercase mb-2">Error Occurred</p>
              <p className="text-xs opacity-70 max-w-[200px]">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-6 px-4 py-2 bg-[var(--app-fg)] text-[var(--app-bg)] text-[10px] font-mono uppercase tracking-widest"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {!result && !loading && !error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 opacity-30"
            >
              {activeTab === 'conversation' ? <Users className="w-12 h-12 mb-4" /> : <Sparkles className="w-12 h-12 mb-4" />}
              <p className="text-sm font-mono uppercase tracking-tighter">
                {activeTab === 'conversation' ? 'Conversation Mode' : 'Waiting for input'}
              </p>
              {activeTab === 'conversation' && (
                <p className="text-[10px] mt-2 uppercase tracking-widest">Chat history will be preserved here</p>
              )}
            </motion.div>
          )}

          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-6"
            >
              <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                <div className="h-3 w-24 bg-[var(--app-fg)]/10 rounded animate-pulse" />
                <div className="h-4 w-16 bg-[var(--app-fg)]/10 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-[var(--app-fg)]/10 rounded animate-pulse" />
                <div className="h-4 w-[90%] bg-[var(--app-fg)]/10 rounded animate-pulse" />
                <div className="h-4 w-[95%] bg-[var(--app-fg)]/10 rounded animate-pulse" />
                <div className="h-4 w-[85%] bg-[var(--app-fg)]/10 rounded animate-pulse" />
              </div>
              
              <div className="mt-8 p-4 bg-[var(--app-fg)]/5 rounded-sm border-l-2 border-[var(--app-fg)]/20 space-y-3">
                <div className="h-3 w-40 bg-[var(--app-fg)]/10 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-[var(--app-fg)]/10 rounded animate-pulse" />
                  <div className="h-3 w-[80%] bg-[var(--app-fg)]/10 rounded animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}

          {result && !error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm leading-relaxed pb-10"
            >
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 bg-[var(--app-fg)] text-[var(--app-bg)] rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-md z-20"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
              
              {activeTab === 'translate' ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Translation</span>
                    <p className="text-lg font-medium leading-snug">{result.translation}</p>
                  </div>
                  
                  <div className="p-3 bg-[var(--app-fg)]/5 rounded-sm border-l-2 border-[var(--app-fg)]">
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-1 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Phonetic Pronunciation
                    </span>
                    <p className="text-xs font-mono italic">{result.transliteration}</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-sm border border-amber-200">
                    <span className="text-[9px] font-mono uppercase text-amber-800 block mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Cultural Context & Nuance
                    </span>
                    <p className="text-xs text-amber-900 leading-relaxed">{result.culturalContext}</p>
                  </div>
                </div>
              ) : activeTab === 'codeswitch' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Normalized Text</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] uppercase font-bold">
                      {result.detectedMix}
                    </span>
                  </div>
                  <p className="text-lg font-medium">{result.normalizedText}</p>
                </div>
              ) : activeTab === 'docubridge' ? (
                typeof result === 'string' ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-4">
                      <span className="font-mono text-xs uppercase opacity-60">Translated Document</span>
                      <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-[var(--app-fg)] text-[var(--app-bg)] px-3 py-1.5 rounded-sm text-[10px] uppercase font-mono hover:opacity-90 transition-opacity"
                      >
                        <FileText className="w-3 h-3" />
                        Save as PDF
                      </button>
                    </div>
                    <div className="prose prose-sm max-w-none text-[var(--app-fg)]">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                      <span className="font-mono text-xs uppercase opacity-60">Simplified {simplifyDomain}</span>
                      <Info className="w-3 h-3" />
                    </div>
                    <p className="text-lg font-medium leading-relaxed">{result.simplifiedText}</p>
                    
                    {result.keyTerms && result.keyTerms.length > 0 && (
                      <div className="mt-4">
                        <span className="text-[9px] font-mono uppercase opacity-50 block mb-3">Key Terms Explained</span>
                        <div className="grid grid-cols-1 gap-3">
                          {result.keyTerms.map((item: any, i: number) => (
                            <div key={i} className="p-3 bg-[var(--app-fg)]/5 rounded-sm border-l-2 border-[var(--app-fg)]">
                              <p className="text-xs font-bold mb-1">{item.term}</p>
                              <p className="text-[11px] opacity-70">{item.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : activeTab === 'transliterate' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Transliterated Text ({targetScript})</span>
                    <Languages className="w-3 h-3" />
                  </div>
                  <p className="text-2xl font-bold text-center py-6 leading-relaxed">{result.transliteratedText}</p>
                </div>
              ) : activeTab === 'dialect' ? (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Dialect Detection</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[9px] uppercase font-bold">
                      {result.detectedDialect}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Standardized Version</span>
                    <p className="text-lg font-medium">{result.standardizedText}</p>
                  </div>

                  <div className="p-4 bg-[var(--app-fg)] text-[var(--app-bg)] rounded-sm">
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Dialectal Nuances</span>
                    <p className="text-xs leading-relaxed italic">"{result.nuances}"</p>
                  </div>
                </div>
              ) : activeTab === 'idioms' ? (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Cultural Equivalent</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                  
                  <div>
                    <p className="text-2xl font-bold text-[var(--app-fg)] mb-1">{result.idiomaticEquivalent}</p>
                    <p className="text-[10px] font-mono opacity-50 italic">Literal: {result.literalTranslation}</p>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-sm border border-amber-200">
                    <span className="text-[9px] font-mono uppercase text-amber-800 block mb-2">Original Meaning</span>
                    <p className="text-xs text-amber-900 leading-relaxed">{result.originalMeaning}</p>
                  </div>

                  <div className="p-4 bg-[var(--app-fg)] text-[var(--app-bg)] rounded-sm">
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Cultural Context & Origin</span>
                    <p className="text-xs leading-relaxed">{result.culturalOrigin}</p>
                  </div>
                </div>
              ) : activeTab === 'sign' ? (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Sign Meaning</span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] uppercase font-bold">
                      {(result.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-center py-6">{result.meaning}</p>
                </div>
              ) : activeTab === 'video' ? (
                <div className="flex flex-col gap-6">
                  <div>
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Video Summary</span>
                    <p className="leading-relaxed">{result.summary}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase opacity-50 block mb-2">Key Insights</span>
                    <ul className="space-y-2">
                      {result.keyPoints?.map((point: string, i: number) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <span className="text-[var(--app-fg)] font-bold">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : activeTab === 'sentiment' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[var(--app-fg)]/10 pb-2">
                    <span className="font-mono text-xs uppercase opacity-60">Sentiment</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                      result.sentiment === 'positive' ? "bg-green-100 text-green-700" :
                      result.sentiment === 'negative' ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {result.sentiment}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs uppercase opacity-60">Confidence Score</span>
                    <span className="font-mono text-xs">{(result.score * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[var(--app-fg)]/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.score * 100}%` }}
                      className="bg-[var(--app-fg)] h-full"
                    />
                  </div>
                  {result.explanation && (
                    <div className="mt-4 p-4 bg-[var(--app-fg)]/5 rounded-sm border-l-2 border-[var(--app-fg)]">
                      <span className="text-[9px] font-mono uppercase opacity-50 block mb-1">Analysis</span>
                      <p className="text-xs italic opacity-80">{result.explanation}</p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'augmentation' ? (
                <ul className="space-y-4">
                  {Array.isArray(result) && result.map((item, i) => (
                    <li key={i} className="flex gap-3 p-3 bg-white/50 border border-[var(--app-fg)]/5 rounded-sm">
                      <span className="font-mono text-[10px] opacity-30">{String(i + 1).padStart(2, '0')}</span>
                      <p>{item}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-wrap break-words">{result}</p>
              )}

              {/* Audio Playback Button */}
              {result && !error && (activeTab === 'translate' || activeTab === 'codeswitch' || activeTab === 'summarize' || activeTab === 'sign' || activeTab === 'video') && (
                <div className="mt-6 pt-6 border-t border-[var(--app-fg)]/10">
                  <button 
                    onClick={() => handleSpeech(determineTextToSpeak())}
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-mono uppercase px-3 py-2 rounded-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                      isSpeaking 
                        ? "bg-red-500 text-white hover:bg-red-600" 
                        : "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90"
                    )}
                  >
                    {isSpeaking ? <StopCircle className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    {isSpeaking ? 'Stop Speech' : 'Listen to Output'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
