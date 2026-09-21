import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Video, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  X,
  Eye,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatImageUrl } from '../lib/utils';

export function getFileType(url: string): 'image' | 'video' | 'pdf' | 'drive' | 'unknown' {
  if (!url) return 'unknown';
  const cleanUrl = url.trim().toLowerCase();
  
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
    return 'drive';
  }
  
  if (
    cleanUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic|jfif)(\?.*)?$/i.test(cleanUrl)
  ) {
    return 'image';
  }
  
  if (
    cleanUrl.startsWith('data:video/') ||
    /\.(mp4|webm|ogg|mov|m4v|mkv|3gp|avi)(\?.*)?$/i.test(cleanUrl)
  ) {
    return 'video';
  }
  
  if (
    cleanUrl.startsWith('data:application/pdf') ||
    /\.pdf(\?.*)?$/i.test(cleanUrl)
  ) {
    return 'pdf';
  }
  
  return 'unknown';
}

export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface NotaMediaViewerProps {
  url: string;
  onZoomImage?: (imgUrl: string) => void;
  title?: string;
}

export function SingleNotaMediaViewer({ url, onZoomImage, title }: NotaMediaViewerProps) {
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);
  const [imgScale, setImgScale] = useState(1);

  useEffect(() => {
    if (!zoomedImg) setImgScale(1);
  }, [zoomedImg]);

  if (!url || url.trim() === '' || url === '-') return null;

  const type = getFileType(url);
  const driveId = getDriveFileId(url);

  const handleZoom = (imageToZoom: string) => {
    if (onZoomImage) {
      onZoomImage(imageToZoom);
    } else {
      setZoomedImg(imageToZoom);
    }
  };

  // Google Drive File (Handles Photos, Videos, PDFs natively)
  if (type === 'drive' && driveId) {
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;

    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 overflow-hidden shadow-sm space-y-3 font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <FileText className="w-4 h-4 text-[#429dbb]" />
            <span>{title || 'Nota Belanja (Google Drive)'}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#429dbb] hover:text-[#317991] flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka di Tab Baru</span>
          </a>
        </div>

        <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-900 border border-gray-200 shadow-inner">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Preview Nota Belanja Google Drive"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        <p className="text-[11px] text-gray-400 italic text-center">
          Pratinjau otomatis dari Google Drive (Foto, Video, atau PDF).
        </p>
      </div>
    );
  }

  // Video File
  if (type === 'video') {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 overflow-hidden shadow-sm space-y-3 font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <Video className="w-4 h-4 text-purple-600" />
            <span>{title || 'Video Nota Belanja'}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 bg-purple-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Video</span>
          </a>
        </div>

        <div className="relative w-full rounded-xl overflow-hidden bg-black max-h-80 flex items-center justify-center shadow-inner">
          <video
            src={url}
            controls
            preload="metadata"
            className="w-full max-h-80 object-contain"
          >
            Browser Anda tidak mendukung pemutaran video.
          </video>
        </div>
      </div>
    );
  }

  // PDF Document
  if (type === 'pdf') {
    const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 overflow-hidden shadow-sm space-y-3 font-sans">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
            <FileText className="w-4 h-4 text-rose-500" />
            <span>{title || 'Dokumen PDF Nota Belanja'}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Unduh / Buka PDF</span>
          </a>
        </div>

        <div className="relative w-full h-80 rounded-xl overflow-hidden bg-slate-100 border border-gray-200 shadow-inner">
          <iframe
            src={url.startsWith('http') ? googleDocsViewerUrl : url}
            className="w-full h-full border-0"
            title="PDF Preview Nota Belanja"
          />
        </div>
      </div>
    );
  }

  // Image File
  const imgUrl = formatImageUrl(url);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 overflow-hidden shadow-sm flex flex-col items-center gap-3 font-sans">
      <div
        onClick={() => handleZoom(imgUrl)}
        className="block relative group max-w-sm w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm cursor-pointer bg-slate-50"
      >
        <img
          src={imgUrl}
          alt="Nota Belanja"
          className="w-full max-h-72 object-contain object-center group-hover:scale-105 transition-transform"
          onError={(e) => {
            // Fallback if image load fails
            const target = e.target as HTMLElement;
            target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1 text-white">
          <ZoomIn className="w-4 h-4" />
          <span className="text-xs font-bold font-sans">Perbesar Foto</span>
        </div>
      </div>

      <div className="flex items-center justify-between w-full pt-1 px-1 border-t border-gray-100">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title || 'Pratinjau Foto'}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#429dbb] hover:text-[#317991] flex items-center gap-1 bg-sky-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Buka Gambar Penuh</span>
        </a>
      </div>

      {/* Internal Zoom Modal if onZoomImage is not passed */}
      <AnimatePresence>
        {zoomedImg && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImg(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-neutral-900 overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950 shrink-0 text-white">
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                  Pratinjau Foto Nota Belanja
                </span>
                <button
                  onClick={() => setZoomedImg(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                  aria-label="Tutup foto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-auto flex-1 p-6 flex items-center justify-center bg-neutral-900/50 min-h-[350px] max-h-[70vh]">
                <div className="relative overflow-visible p-12 flex items-center justify-center">
                  <img
                    src={formatImageUrl(zoomedImg)}
                    alt="Zoomed"
                    style={{
                      transform: `scale(${imgScale})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="bg-neutral-950 border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs text-gray-400 font-medium hidden sm:block">
                  Gunakan tombol di bawah untuk memperbesar atau memperkecil gambar.
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10 mx-auto sm:mx-0">
                  <button
                    onClick={() => setImgScale((s) => Math.max(0.5, s - 0.25))}
                    disabled={imgScale <= 0.5}
                    className="p-1 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-white min-w-[3rem] text-center select-none">
                    {Math.round(imgScale * 100)}%
                  </span>
                  <button
                    onClick={() => setImgScale((s) => Math.min(3, s + 0.25))}
                    disabled={imgScale >= 3.0}
                    className="p-1 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 self-center mx-1" />
                  <button
                    onClick={() => setImgScale(1)}
                    className="text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NotaMediaViewer({ url, onZoomImage, title }: NotaMediaViewerProps) {
  if (!url || url.trim() === '' || url === '-') {
    return (
      <div className="h-28 flex flex-col items-center justify-center text-center bg-slate-50 border border-slate-100 rounded-2xl p-3.5 shadow-inner font-sans">
        <FileText className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-gray-400 text-xs font-medium">Belum ada nota belanja.</p>
      </div>
    );
  }

  // Support multiple URLs separated by space, comma, or newline
  const urls = url.trim().split(/[\s,\n]+/).map(u => u.trim()).filter(u => u && u !== '-');

  if (urls.length > 1) {
    return (
      <div className="space-y-4 font-sans">
        {urls.map((singleUrl, idx) => (
          <div key={idx} className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Lampiran #{idx + 1}
            </span>
            <SingleNotaMediaViewer url={singleUrl} onZoomImage={onZoomImage} title={title} />
          </div>
        ))}
      </div>
    );
  }

  return <SingleNotaMediaViewer url={urls[0]} onZoomImage={onZoomImage} title={title} />;
}
