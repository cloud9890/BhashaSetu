import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Video, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tab } from '../../types';

interface CameraOverlayProps {
  showCamera: boolean;
  cameraStream: MediaStream | null;
  activeTab: Tab;
  loading: boolean;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  captureFrame: () => string | null;
  onCaptureImage: (base64: string) => void;
}

export function CameraOverlay({
  showCamera, cameraStream, activeTab, loading, stopCamera, videoRef, canvasRef,
  isRecording, startRecording, stopRecording, captureFrame, onCaptureImage
}: CameraOverlayProps) {
  
  // Callback ref: attach stream the moment the <video> element mounts
  const videoCallbackRef = (node: HTMLVideoElement | null) => {
    if (node && cameraStream) {
      node.srcObject = cameraStream;
    }
    // Also keep the passed videoRef in sync for captureFrame
    if (videoRef && typeof videoRef === 'object') {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    }
  };

  const handleCapture = () => {
    const base64 = captureFrame();
    if (base64) onCaptureImage(base64);
  };

  return (
    <AnimatePresence>
      {showCamera && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
        >
          {/* Video Background */}
          <div className="absolute inset-0 z-0">
            <video 
              ref={videoCallbackRef}
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover opacity-80"
            />
          </div>

          {/* Camera UI Overlay */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Top Bar */}
            <div className="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">Vision Mode</span>
                <span className="text-white font-mono text-xs uppercase">
                  {activeTab === 'sign' ? 'Sign Language Detection' : 'Document Text Capture'}
                </span>
              </div>
              <button 
                onClick={stopCamera}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all pointer-events-auto"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scanning Frame */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-10">
              <div className="relative w-full max-w-md aspect-[3/4] border-2 border-white/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                
                {/* Scanning Animation */}
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-white/50 shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col items-center gap-4 bg-gradient-to-t from-black/90 to-transparent z-20">
              {activeTab === 'sign' ? (
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={handleCapture}
                      disabled={loading}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.4)] pointer-events-auto"
                    >
                      <Camera className="w-8 h-8 text-black" />
                    </button>
                    <span className="text-[9px] text-white font-mono uppercase font-bold">Capture</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all border-4 shadow-lg pointer-events-auto",
                        isRecording ? "bg-red-500 border-white animate-pulse" : "bg-transparent border-white hover:bg-white/10"
                      )}
                    >
                      {isRecording ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Video className="w-8 h-8 text-white" />}
                    </button>
                    <span className="text-[9px] text-white font-mono uppercase font-bold">{isRecording ? 'Stop' : 'Record'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={handleCapture}
                    disabled={loading}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.5)] pointer-events-auto"
                  >
                    {loading ? <Loader2 className="w-10 h-10 text-black animate-spin" /> : <Camera className="w-10 h-10 text-black" />}
                  </button>
                  <span className="text-[10px] text-white font-mono uppercase tracking-widest font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Capture Text</span>
                </div>
              )}
              <p className="text-white/60 text-[10px] font-mono uppercase tracking-[0.3em] text-center max-w-xs">
                {loading ? 'Processing Visual Data...' : (activeTab === 'sign' ? 'Photo or 4s Video' : 'Align document and capture')}
              </p>
            </div>
          </div>
          <canvas ref={canvasRef as any} className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
