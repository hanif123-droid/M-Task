import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, Image as ImageIcon, X, RefreshCw, Square, AlertCircle } from 'lucide-react';

export function CameraModal({ 
  onClose, 
  onCapture,
  onVideoCapture,
  onGallerySelect,
  initialMode = 'photo'
}: { 
  onClose: () => void; 
  onCapture: (blob: Blob, mediaType?: 'image' | 'video') => void;
  onVideoCapture?: (blob: Blob) => void;
  onGallerySelect: () => void;
  initialMode?: 'photo' | 'video';
}) {
  const [mode, setMode] = useState<'photo' | 'video'>(initialMode);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState('');
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Start or restart camera whenever mode or facingMode changes
  useEffect(() => {
    let isCancelled = false;

    async function startCamera() {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setError('');

      try {
        const constraints: MediaStreamConstraints = {
          video: { facingMode: facingMode },
          audio: mode === 'video',
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr: any) {
          // If audio failed in video mode, fallback to video only
          if (mode === 'video') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facingMode },
              audio: false,
            });
          } else {
            throw mediaErr;
          }
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError('Gagal mengakses kamera/mikrofon: ' + (err.message || 'Izin ditolak'));
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [mode, facingMode]);

  // Handle Photo Capture
  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flash animation effect
        setFlashEffect(true);
        setTimeout(() => setFlashEffect(false), 200);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              onCapture(blob, 'image');
            }
          },
          'image/jpeg',
          0.85
        );
      }
    }
  };

  // Start Video Recording
  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else {
        mimeType = '';
      }
    }

    try {
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(streamRef.current, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalType = mimeType || recordedChunksRef.current[0]?.type || 'video/webm';
        const videoBlob = new Blob(recordedChunksRef.current, { type: finalType });
        if (onVideoCapture) {
          onVideoCapture(videoBlob);
        } else {
          onCapture(videoBlob, 'video');
        }
      };

      recorder.start(500); // 500ms chunk interval
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setError('Gagal memulai perekaman video: ' + err.message);
    }
  };

  // Stop Video Recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Toggle Camera Front / Back
  const toggleFacingMode = () => {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Format recording timer: mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col font-sans select-none">
      {/* Top Bar Header */}
      <div className="flex justify-between items-center px-4 py-3 text-white bg-gradient-to-b from-black/80 via-black/40 to-transparent absolute top-0 w-full z-20">
        <button
          type="button"
          onClick={() => {
            if (isRecording) stopRecording();
            onClose();
          }}
          className="p-2 bg-black/40 backdrop-blur-md rounded-full cursor-pointer hover:bg-black/60 transition active:scale-95 text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Recording Live Badge */}
        {isRecording ? (
          <div className="flex items-center gap-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-full font-mono text-sm font-bold shadow-lg animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>REC {formatTimer(recordingSeconds)}</span>
          </div>
        ) : (
          <div className="text-xs font-semibold tracking-wider uppercase text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            {mode === 'photo' ? 'Mode Foto' : 'Mode Video'}
          </div>
        )}

        {/* Switch Camera Button */}
        <button
          type="button"
          disabled={isRecording}
          onClick={toggleFacingMode}
          className="p-2 bg-black/40 backdrop-blur-md rounded-full cursor-pointer hover:bg-black/60 transition active:scale-95 disabled:opacity-30 text-white"
          title="Putar Kamera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Video Viewport */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white p-6 text-center max-w-sm flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
              facingMode === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />
        )}

        {/* Flash Effect on Photo Shutter */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-200 opacity-90" />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls Area */}
      <div className="bg-black/95 text-white pb-safe pt-2 border-t border-white/10 z-20">
        {/* Mode Switcher Tabs */}
        {!isRecording && (
          <div className="flex justify-center items-center gap-8 mb-3 text-xs font-bold tracking-wider">
            <button
              type="button"
              onClick={() => setMode('photo')}
              className={`py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'photo'
                  ? 'text-yellow-400 bg-white/10 shadow-sm font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              FOTO
            </button>
            <button
              type="button"
              onClick={() => setMode('video')}
              className={`py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'video'
                  ? 'text-red-400 bg-white/10 shadow-sm font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              VIDEO
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-8 pb-6 pt-1 h-28">
          {/* Gallery Button */}
          {!isRecording ? (
            <button
              type="button"
              onClick={onGallerySelect}
              className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center text-white cursor-pointer hover:bg-white/20 transition active:scale-95"
              title="Pilih dari Galeri"
            >
              <ImageIcon className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}

          {/* Shutter / Record Button */}
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 cursor-pointer hover:scale-105 active:scale-95 transition"
              title="Ambil Foto"
            >
              <div className="w-full h-full bg-white rounded-full hover:bg-gray-200 transition shadow-inner" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full border-4 ${
                isRecording ? 'border-red-500' : 'border-white'
              } flex items-center justify-center p-1.5 cursor-pointer hover:scale-105 active:scale-95 transition`}
              title={isRecording ? 'Berhenti Rekam' : 'Mulai Rekam Video'}
            >
              {isRecording ? (
                <div className="w-7 h-7 bg-red-600 rounded-md transition shadow-md" />
              ) : (
                <div className="w-full h-full bg-red-600 rounded-full hover:bg-red-500 transition shadow-inner flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-white/30" />
                </div>
              )}
            </button>
          )}

          {/* Empty Space / Mode indicator for Balance */}
          <div className="w-12 h-12 flex items-center justify-center">
            {isRecording && (
              <span className="text-[10px] text-red-400 font-bold animate-pulse">● LIVE</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
