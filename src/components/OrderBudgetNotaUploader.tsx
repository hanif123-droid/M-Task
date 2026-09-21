import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, FileText, Play, Eye, Trash2, X, Plus, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderBudgetNotaUploaderProps {
  files: File[];
  onChangeFiles: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function OrderBudgetNotaUploader({
  files,
  onChangeFiles,
  disabled = false,
  label = "Nota Belanja / Bukti",
  required = true,
}: OrderBudgetNotaUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewFile, setPreviewFile] = useState<{ file: File; index: number } | null>(null);

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      onChangeFiles([...files, ...selected]);
    }
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      onChangeFiles([...files, ...selected]);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    if (disabled) return;
    const updated = files.filter((_, idx) => idx !== indexToRemove);
    onChangeFiles(updated);
    if (previewFile?.index === indexToRemove) {
      setPreviewFile(null);
    }
  };

  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {files.length > 0 && (
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {files.length} File Terlampir
          </span>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleCameraChange}
        className="hidden"
        disabled={disabled}
      />
      <input
        type="file"
        multiple
        accept="image/*,video/*,application/pdf,.pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Action Buttons (Kamera / Pilih File) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => !disabled && cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <Camera className="w-4 h-4 text-blue-600" />
          <span>{files.length > 0 ? "Tambah Foto (Kamera)" : "Ambil Foto"}</span>
        </button>

        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-gray-500" />
          <span>{files.length > 0 ? "Tambah File Galeri" : "Pilih File / Galeri"}</span>
        </button>
      </div>

      {/* File List */}
      {files.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {files.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            const isVideo = file.type.startsWith("video/");
            const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-all shadow-xs group"
              >
                {/* Thumbnail Preview */}
                <div
                  onClick={() => setPreviewFile({ file, index: idx })}
                  className="w-12 h-12 shrink-0 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer relative group/thumb"
                  title="Klik untuk melihat preview"
                >
                  {isImage ? (
                    <img
                      src={URL.createObjectURL(file)}
                      className="w-full h-full object-cover"
                      alt="preview"
                    />
                  ) : isVideo ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <Play className="w-4 h-4 text-white absolute inset-0 m-auto" />
                    </div>
                  ) : isPdf ? (
                    <FileText className="w-6 h-6 text-rose-500" />
                  ) : (
                    <FileText className="w-6 h-6 text-gray-400" />
                  )}

                  <div className="absolute inset-0 bg-blue-600/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>

                {/* File Metadata */}
                <div
                  onClick={() => setPreviewFile({ file, index: idx })}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <p className="text-xs font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                      {isVideo ? "Video" : isPdf ? "PDF" : isImage ? "Foto" : "Dokumen"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFile({ file, index: idx })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Pratinjau File"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    disabled={disabled}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="Hapus File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 border border-dashed border-gray-300 rounded-xl bg-gray-50/50 text-center">
          <p className="text-xs text-gray-400 font-medium">
            Belum ada nota / bukti terlampir. Anda dapat mengunggah beberapa foto, video, atau dokumen PDF.
          </p>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[200] flex items-center justify-center p-4"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {previewFile.file.name}
                  </h4>
                  <p className="text-[10px] text-gray-500">
                    {(previewFile.file.size / 1024).toFixed(1)} KB • Lampiran #{previewFile.index + 1}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[250px]">
                {previewFile.file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(previewFile.file)}
                    alt="Preview"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                ) : previewFile.file.type.startsWith("video/") ? (
                  <video
                    src={URL.createObjectURL(previewFile.file)}
                    controls
                    className="max-w-full max-h-[60vh] rounded-lg"
                  />
                ) : (
                  <iframe
                    src={URL.createObjectURL(previewFile.file)}
                    className="w-full h-[50vh] rounded-lg bg-white"
                    title="PDF Preview"
                  />
                )}
              </div>

              <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleRemoveFile(previewFile.index)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus File Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="text-xs font-bold text-gray-700 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
