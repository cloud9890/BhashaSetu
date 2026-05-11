import { useState, useRef, useCallback } from 'react';

export function useCamera() {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Store stream in a ref so stopCamera never needs it as a dependency
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      streamRef.current = stream;
      setCameraStream(stream);
      setShowCamera(true);
    } catch (err) {
      throw new Error("Camera access denied or not available. Please allow camera permissions.");
    }
  };

  // stopCamera is now stable — no dependencies on cameraStream state
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setShowCamera(false);
  }, []);

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg').split(',')[1];
  };

  const startRecording = (onComplete: (chunks: Blob[]) => void) => {
    if (!streamRef.current) return;
    
    let mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
    
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    let chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      setIsRecording(false);
      onComplete(chunks);
    };
    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);

    // Auto-stop after 4 seconds for sign language
    setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, 4000);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  return {
    showCamera,
    cameraStream,
    isRecording,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureFrame,
    startRecording,
    stopRecording
  };
}
