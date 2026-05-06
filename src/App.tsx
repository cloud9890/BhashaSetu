import React, { useState } from 'react';
import { 
  Languages, FileText, BarChart3, Database, Search, Video, Shuffle, BookOpen, Hand, Info, Users
} from 'lucide-react';

import { useHistory } from './hooks/useHistory';
import { useCamera } from './hooks/useCamera';
import { useAudio } from './hooks/useAudio';
import { Tab, Message } from './types';

import { 
  SUPPORTED_LANGUAGES, translateText, summarizeText, analyzeSentiment, generateSyntheticData,
  detectLanguage, extractTextFromImage, normalizeCodeSwitching, exploreIdioms, simplifyComplexText,
  transliterateScript, detectDialect, analyzeVideo, translateSignLanguage, translateSignVideo,
  translateConversation, VideoAnalysisType, NLPError, translateDocument
} from './services/geminiService';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { HistoryOverlay } from './components/features/HistoryOverlay';
import { CameraOverlay } from './components/features/CameraOverlay';
import { TabPanels } from './components/tabs/TabPanels';
import { OutputDisplay } from './components/tabs/OutputDisplay';

const APP_TABS = [
  { id: 'translate', label: 'Cultural Bridge', icon: BookOpen, description: 'Context-aware translation with cultural nuances.' },
  { id: 'docubridge', label: 'DocuBridge', icon: FileText, description: 'Translate PDFs or simplify legal/medical text.' },
  { id: 'summarize', label: 'Summarization', icon: FileText, description: 'Condense long text into concise summaries.' },
  { id: 'sentiment', label: 'Sentiment', icon: BarChart3, description: 'Analyze emotional tone and confidence.' },
  { id: 'codeswitch', label: 'Code-Switch', icon: Shuffle, description: 'Normalize mixed-language text (e.g. Hinglish).' },
  { id: 'idioms', label: 'Cultural Idioms', icon: BookOpen, description: 'Find regional proverbs and cultural equivalents.' },
  { id: 'transliterate', label: 'Script-to-Script', icon: Languages, description: 'Convert text between different Indian scripts.' },
  { id: 'dialect', label: 'Dialect Detector', icon: Search, description: 'Identify regional dialects and standardize them.' },
  { id: 'conversation', label: 'Conversation', icon: Users, description: 'Real-time bilingual chat with instant translation.' },
  { id: 'video', label: 'Video Insight', icon: Video, description: 'Extract summaries and insights from video files.' },
  { id: 'sign', label: 'Sign Language', icon: Hand, description: 'Translate hand gestures via camera or video.' },
  { id: 'augmentation', label: 'Augmentation', icon: Database, description: 'Generate synthetic data for NLP training.' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('translate');
  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('as');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [syntheticCount, setSyntheticCount] = useState(5);
  const [videoAnalysisType, setVideoAnalysisType] = useState<VideoAnalysisType>('summarization');
  const [simplifyDomain, setSimplifyDomain] = useState<'legal' | 'medical'>('legal');
  const [targetScript, setTargetScript] = useState('Devanagari');
  
  const [messages, setMessages] = useState<Message[]>([]);


  const handleDetectLanguage = async () => {
    if (!inputText) return;
    setDetecting(true);
    setError(null);
    try {
      const detection = await detectLanguage(inputText);
      const matchedLang = SUPPORTED_LANGUAGES.find(l => 
        l.name.toLowerCase() === detection.languageName.toLowerCase() || 
        l.code === detection.languageCode
      );
      if (matchedLang) setSourceLang(matchedLang.code);
    } catch (err: any) {
      setError(err instanceof NLPError ? err.message : "Language detection failed.");
    } finally {
      setDetecting(false);
    }
  };
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const { history, showHistory, setShowHistory, saveToHistory, clearHistory } = useHistory();
  const { isListening, isSpeaking, startListening, stopListening, playSpeech, stopSpeech } = useAudio();
  const { 
    showCamera, cameraStream, isRecording, videoRef, canvasRef,
    startCamera, stopCamera, captureFrame, startRecording, stopRecording 
  } = useCamera();

  const handleAction = async () => {
    if (activeTab === 'conversation') return;
    if (activeTab !== 'augmentation' && activeTab !== 'video' && activeTab !== 'sign' && activeTab !== 'docubridge' && (!inputText || inputText.trim().length < 2)) return;
    
    setLoading(true);
    setError(null);
    try {
      let data;
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Assamese';

      switch (activeTab) {
        case 'translate': data = await translateText(inputText, langName); break;
        case 'summarize': data = await summarizeText(inputText, langName, summaryLength); break;
        case 'sentiment': data = await analyzeSentiment(inputText, langName); break;
        case 'augmentation': data = await generateSyntheticData(topic || inputText, langName, syntheticCount); break;
        case 'codeswitch': data = await normalizeCodeSwitching(inputText, langName); break;
        case 'idioms': data = await exploreIdioms(inputText, langName); break;
        case 'transliterate': data = await transliterateScript(inputText, targetScript); break;
        case 'dialect': data = await detectDialect(inputText); break;
        case 'docubridge':
          if (documentFile) {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
               reader.onload = () => resolve((reader.result as string).split(',')[1]);
               reader.readAsDataURL(documentFile);
            });
            const base64 = await base64Promise;
            data = await translateDocument(base64, documentFile.type, langName);
          } else if (inputText.trim().length >= 2) {
            data = await simplifyComplexText(inputText, langName, simplifyDomain);
          } else {
            throw new Error("Please upload a document or enter text to simplify.");
          }
          break;
        case 'sign':
          setError("Please use the camera to capture sign language.");
          return;
        case 'video':
          if (videoFile) {
            setLoading(true);
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(videoFile);
            });
            const base64 = await base64Promise;
            data = await analyzeVideo(base64, videoFile.type, langName, videoAnalysisType);
          } else {
            throw new Error("Please upload a video first.");
          }
          break;
        default: return;
      }
      setResult(data);
      saveToHistory(activeTab, activeTab === 'video' ? `Video: ${videoFile?.name}` : activeTab === 'docubridge' && documentFile ? `Doc: ${documentFile.name}` : (topic || inputText), data);
    } catch (err: any) {
      setError(err instanceof NLPError ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text: string, role: 'user' | 'assistant' = 'user') => {
    if (!text.trim()) return;
    
    const newMsg: Message = { role, text };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText('');
    
    setLoading(true);
    try {
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Assamese';
      const translationData = await translateConversation(updatedMessages, langName);
      
      setMessages(prev => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { 
          ...last, 
          translation: translationData.translation, 
          pronunciation: translationData.pronunciation 
        }];
      });
    } catch (err) {
      setError("Failed to translate message.");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError("Video file too large. Please upload under 20MB.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleCopy = () => {
    let textToCopy = '';
    if (activeTab === 'translate') textToCopy = result.translation;
    else if (activeTab === 'codeswitch') textToCopy = result.normalizedText;
    else if (activeTab === 'idioms') textToCopy = `${result.idiomaticEquivalent}\n${result.culturalOrigin}`;
    else if (activeTab === 'docubridge') textToCopy = typeof result === 'string' ? result : result.simplifiedText;
    else if (activeTab === 'transliterate') textToCopy = result.transliteratedText;
    else if (activeTab === 'dialect') textToCopy = result.standardizedText;
    else if (activeTab === 'video') textToCopy = result.result;
    else if (activeTab === 'sign') textToCopy = result.meaning;
    else if (activeTab === 'augmentation') textToCopy = Array.isArray(result) ? result.join('\n') : '';
    else if (activeTab === 'sentiment') textToCopy = `${result.sentiment}: ${result.explanation}`;
    else textToCopy = typeof result === 'string' ? result : JSON.stringify(result);
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onCaptureImage = async (base64Data: string) => {
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Assamese';
    stopCamera();
    setLoading(true);
    try {
      if (activeTab === 'sign') {
        const signResult = await translateSignLanguage(base64Data, 'image/jpeg', langName);
        setResult(signResult);
        saveToHistory('sign', 'Sign Language Capture', signResult);
      } else {
        const extractedText = await extractTextFromImage(base64Data, 'image/jpeg');
        if (extractedText && extractedText.trim()) {
          setInputText(prev => prev + (prev ? '\n' : '') + extractedText.trim());
        } else {
          setError("No text found in the image.");
        }
      }
    } catch (err: any) {
      setError(err instanceof NLPError ? err.message : "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = () => {
    startRecording(async (chunks) => {
      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || 'Assamese';
        stopCamera();
        setLoading(true);
        try {
          const signResult = await translateSignVideo(base64Data, 'video/webm', langName);
          setResult(signResult);
          saveToHistory('sign', 'Sign Language Video', signResult);
        } catch (err: any) {
          setError(err instanceof NLPError ? err.message : "Failed to process sign video.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleSelectHistory = (type: Tab, output: any) => {
    setActiveTab(type);
    setResult(output);
    setShowHistory(false);
  };

  const safeStartCamera = async () => {
    try {
      await startCamera();
    } catch (err: any) {
      setError(err.message || "Could not access camera. Please allow camera permissions in your browser.");
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      <Header showHistory={showHistory} setShowHistory={setShowHistory} />

      <main className="flex flex-col md:flex-row min-h-[calc(100vh-73px)] md:minh-[calc(100vh-89px)] relative">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setResult(null);
            setError(null);
          }} 
          tabs={APP_TABS as any} 
        />

        <CameraOverlay 
          showCamera={showCamera} cameraStream={cameraStream} activeTab={activeTab} loading={loading}
          stopCamera={stopCamera} videoRef={videoRef} canvasRef={canvasRef}
          isRecording={isRecording} startRecording={handleStartRecording} stopRecording={stopRecording}
          captureFrame={captureFrame} onCaptureImage={onCaptureImage}
        />

        <HistoryOverlay 
          showHistory={showHistory} setShowHistory={setShowHistory}
          history={history} clearHistory={clearHistory} onSelectHistory={handleSelectHistory}
        />

        <section className="flex-1 p-4 md:p-6 lg:p-10 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
            {/* Input Side */}
            <div className="flex flex-col gap-6">
              <TabPanels 
                activeTab={activeTab} sourceLang={sourceLang} setSourceLang={setSourceLang}
                targetLang={targetLang} setTargetLang={setTargetLang}
                detecting={detecting} handleDetectLanguage={handleDetectLanguage}
                inputText={inputText} setInputText={setInputText}
                simplifyDomain={simplifyDomain} setSimplifyDomain={setSimplifyDomain}
                targetScript={targetScript} setTargetScript={setTargetScript}
                summaryLength={summaryLength} setSummaryLength={setSummaryLength}
                syntheticCount={syntheticCount} setSyntheticCount={setSyntheticCount}
                topic={topic} setTopic={setTopic}
                handleVideoUpload={handleVideoUpload} videoPreview={videoPreview}
                videoFile={videoFile} setVideoPreview={setVideoPreview} setVideoFile={setVideoFile}
                documentFile={documentFile} setDocumentFile={setDocumentFile}
                messages={messages} setMessages={setMessages} sendMessage={sendMessage}
                startCamera={safeStartCamera} startListening={startListening} stopListening={stopListening} isListening={isListening}
                handleAction={handleAction} loading={loading} setError={setError}
              />
            </div>

            {/* Output Side */}
            <div className="flex flex-col gap-6">
              <OutputDisplay 
                result={result} error={error} setError={setError}
                activeTab={activeTab} loading={loading}
                copied={copied} handleCopy={handleCopy}
                handleSpeech={(t) => playSpeech(t, setError, targetLang)} isSpeaking={isSpeaking}
                simplifyDomain={simplifyDomain} targetScript={targetScript}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
