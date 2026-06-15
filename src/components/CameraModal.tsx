import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

export function CameraModal({ 
  onClose, 
  onCapture, 
  onGallerySelect 
}: { 
  onClose: () => void, 
  onCapture: (blob: Blob) => void,
  onGallerySelect: () => void 
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        setError('Gagal mengakses kamera: ' + err.message);
      }
    }
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            onCapture(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/50 to-transparent absolute top-0 w-full z-10">
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full cursor-pointer hover:bg-black/70">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center">
        {error ? (
          <div className="text-white p-4 text-center text-sm">{error}</div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="bg-black pb-safe">
        <div className="flex items-center justify-between px-8 py-6 h-32">
          {/* Gallery Button */}
          <button 
            onClick={onGallerySelect}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white cursor-pointer hover:bg-gray-700 transition"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Capture Button */}
          <button 
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer"
          >
            <div className="w-full h-full bg-white rounded-full hover:bg-gray-200 transition" />
          </button>

          {/* Empty Space for Balance */}
          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
}
