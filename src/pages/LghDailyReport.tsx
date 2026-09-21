import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  Camera, 
  Video, 
  Image as ImageIcon, 
  Loader2, 
  Send, 
  Eye, 
  Trash2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Play 
} from "lucide-react";
import { appendSheetData, getSheetData, updateSheetData } from "../lib/api";
import { DriveService } from "../lib/driveService";
import { logActivity } from '../lib/activityLogger';
import { CameraModal } from "../components/CameraModal";

interface PreviewModalData {
  file: File;
  url: string;
  isVideo: boolean;
  index: number;
}

export function LghDailyReport() {
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state as {
    rowIdx?: number;
    area?: string;
    timestamp?: string;
    description?: string;
    email?: string;
    id?: string;
    isFromNotification?: boolean;
  } | null;

  const parseNavData = (st: { area?: string; description?: string } | null) => {
    let rawArea = st?.area || "";
    let rawDesc = st?.description || "";

    let areaVal = rawArea;
    let ketVal = rawDesc;

    if (rawArea.includes(":")) {
      const parts = rawArea.split(":");
      areaVal = parts[0].trim();
      if (!ketVal) {
        ketVal = parts.slice(1).join(":").trim();
      }
    } else if (rawArea.toLowerCase().includes("request cleaning [") && rawArea.includes("]:")) {
      const match = rawArea.match(/request cleaning \[([^\]]+)\]:\s*(.*)/i);
      if (match) {
        areaVal = match[1].trim();
        if (!ketVal) ketVal = match[2].trim();
      }
    }

    return { area: areaVal, keterangan: ketVal };
  };

  const initialNav = parseNavData(navState);
  
  const parseTimestamp = (ts: string) => {
    if (!ts) return { date: "", time: "" };
    // mm/dd/yyyy hh:mm:ss
    const parts = ts.split(" ");
    if (parts.length >= 2) {
      const dParts = parts[0].split("/");
      const tParts = parts[1].split(":");
      if (dParts.length === 3 && tParts.length >= 2) {
        const yyyy = dParts[2];
        const mm = dParts[0].padStart(2, "0");
        const dd = dParts[1].padStart(2, "0");
        const hh = tParts[0].padStart(2, "0");
        const min = tParts[1].padStart(2, "0");
        return {
          date: `${yyyy}-${mm}-${dd}`,
          time: `${hh}:${min}`,
        };
      }
    }
    return { date: "", time: "" };
  };

  const [description, setDescription] = useState(initialNav.area);
  const [keterangan, setKeterangan] = useState(initialNav.keterangan);
  const [initialComment, setInitialComment] = useState("");
  
  const [reportDate, setReportDate] = useState(() => {
    if (navState?.timestamp) {
      const { date } = parseTimestamp(navState.timestamp);
      if (date) return date;
    }
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  });
  
  const [reportTime, setReportTime] = useState(() => {
    if (navState?.timestamp) {
      const { time } = parseTimestamp(navState.timestamp);
      if (time) return time;
    }
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  });

  const isReadOnly = !!navState?.isFromNotification;

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<PreviewModalData | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [activeUserName, setActiveUserName] = useState<string>(() => {
    return localStorage.getItem("mtask_user_name") || "";
  });

  useEffect(() => {
    if (location.state) {
      const st = location.state as { area?: string; timestamp?: string; description?: string };
      const parsed = parseNavData(st);
      if (parsed.area) setDescription(parsed.area);
      if (parsed.keterangan) setKeterangan(parsed.keterangan);
      if (st.timestamp) {
        const { date, time } = parseTimestamp(st.timestamp);
        if (date) setReportDate(date);
        if (time) setReportTime(time);
      }
    }
  }, [location.state]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserEmail = localStorage.getItem("mtask_user_email") || "unknown@kipapola.com";

  // Fetch real user name from User sheet if not in localStorage or to ensure accuracy
  useEffect(() => {
    async function fetchUserName() {
      try {
        const emailToFind = (localStorage.getItem("mtask_user_email") || "").trim().toLowerCase();
        if (!emailToFind) return;

        const userRes = await getSheetData("User!A1:Z500").catch(() => null);
        if (userRes?.values && userRes.values.length > 0) {
          const headers = (userRes.values[0] as string[]).map((h) => (h || "").trim().toUpperCase());
          const emailIdx = headers.findIndex((h) => h === "EMAIL" || h === "EMAIL ADDRESS");
          const nameIdx = headers.findIndex(
            (h) => h === "NAME" || h === "NAMA" || h === "FULL NAME" || h === "NAMA LENGKAP"
          );

          if (emailIdx > -1 && nameIdx > -1) {
            for (let i = 1; i < userRes.values.length; i++) {
              const row = userRes.values[i];
              const rowEmail = (row[emailIdx] || "").trim().toLowerCase();
              const rowName = (row[nameIdx] || "").trim();
              if (rowEmail === emailToFind && rowName) {
                setActiveUserName(rowName);
                localStorage.setItem("mtask_user_name", rowName);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn("Error fetching user name:", err);
      }
    }
    fetchUserName();
  }, []);

  // Cleanup object URLs when preview closes or files change
  useEffect(() => {
    return () => {
      if (previewItem?.url) {
        URL.revokeObjectURL(previewItem.url);
      }
    };
  }, [previewItem]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    if (previewItem?.index === index) {
      setPreviewItem(null);
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenPreview = (file: File, index: number) => {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    setZoomScale(1);
    setPreviewItem({ file, url, isVideo, index });
  };

  const handleClosePreview = () => {
    if (previewItem?.url) {
      URL.revokeObjectURL(previewItem.url);
    }
    setPreviewItem(null);
    setZoomScale(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      alert("Area (Text Field) tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload files
      const uploadedUrls = [];
      for (const file of files) {
        try {
          const res = await DriveService.uploadFile(file);
          uploadedUrls.push(res.url);
        } catch (uploadErr) {
          console.warn("Upload file failed", uploadErr);
        }
      }

      // Format urls as space-separated string
      const filesFormatted = uploadedUrls.length > 0 ? uploadedUrls.join(" ") : "";

      const now = new Date();
      let finalDateTime = "";
      if (reportDate && reportTime) {
        const [yyyy, mm, dd] = reportDate.split("-");
        finalDateTime = `${mm}/${dd}/${yyyy} ${reportTime}:00`;
      } else {
        finalDateTime = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      }
      const formDateTime = finalDateTime;
      
      const currentTimestamp = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      // 2. Prepare Chat / Keterangan value
      let chatArr: any[] = [];
      if (keterangan.trim()) {
        try {
          if (keterangan.trim().startsWith('[') && keterangan.trim().endsWith(']')) {
            chatArr = JSON.parse(keterangan);
          } else {
            chatArr.push({
              email: navState?.email || "System",
              message: keterangan.trim(),
              timestamp: formDateTime
            });
          }
        } catch(e) {
          chatArr.push({
            email: navState?.email || "System",
            message: keterangan.trim(),
            timestamp: formDateTime
          });
        }
      }

      if (initialComment.trim()) {
        chatArr.push({
          email: currentUserEmail,
          message: initialComment.trim(),
          timestamp: currentTimestamp,
        });
      }

      const colFValue = JSON.stringify(chatArr);

      const submitterName =
        activeUserName ||
        localStorage.getItem("mtask_user_name") ||
        (currentUserEmail.includes("@") ? currentUserEmail.split("@")[0] : currentUserEmail) ||
        "User";

      // Check if this was opened from a notification (existing report update)
      const isFromNotif = Boolean(navState?.isFromNotification || navState?.rowIdx || navState?.id);

      if (isFromNotif) {
        // CASE 1: Opened via notification -> UPDATE EXISTING ROW, DO NOT ADD NEW ROW
        let targetRow = navState?.rowIdx;

        // If ID is available, look up the exact row index dynamically in the sheet to prevent any desync
        if (navState?.id) {
          try {
            const sheetCheck = await getSheetData("lgh daily report!A1:A500");
            if (sheetCheck?.values) {
              const foundIdx = sheetCheck.values.findIndex(
                (r: any[]) => (r[0] || "").trim() === navState.id!.trim()
              );
              if (foundIdx > -1) {
                targetRow = foundIdx + 1; // Google Sheet 1-indexed row number
              }
            }
          } catch (err) {
            console.warn("Could not re-verify row index by ID:", err);
          }
        }

        if (targetRow) {
          // Update columns:
          // Kolom B: Area (description)
          // Kolom C: Tanggal dan Jam (formDateTime)
          // Kolom E: Status ("Review")
          // Kolom F: Keterangan / Chat (colFValue)
          // Kolom G: Timestamp saat klik kirim laporan (currentTimestamp)
          // Kolom H: Lampiran/files if any
          await updateSheetData(`lgh daily report!B${targetRow}:C${targetRow}`, [[description, formDateTime]]);
          await updateSheetData(`lgh daily report!E${targetRow}`, [["Review"]]);
          await updateSheetData(`lgh daily report!F${targetRow}`, [[colFValue]]);
          await updateSheetData(`lgh daily report!G${targetRow}`, [[currentTimestamp]]);
          await updateSheetData(`lgh daily report!H${targetRow}`, [[filesFormatted]]);
          await updateSheetData(`lgh daily report!I${targetRow}`, [["TRUE"]]);

          logActivity(
            "Form",
            "LGH Daily Report",
            `${submitterName} menyelesaikan tugas Request Cleaning "${description}"`
          );

          alert("LGH Daily Report berhasil diperbarui (Status: Review)!");
        } else {
          throw new Error("Row data laporan tidak ditemukan.");
        }
      } else {
        // CASE 2: Opened from Quick Action / Directly -> APPEND AS NEW ROW
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const uniqueId = `lgh-rpt-${randomDigits}`;

        await appendSheetData("lgh daily report!A:I", [
          [
            uniqueId, // A: ID
            description, // B: Area
            formDateTime, // C: Tanggal dan Jam
            currentUserEmail, // D: User
            "Review", // E: Status
            colFValue, // F: Keterangan / Chat
            currentTimestamp, // G: Timestamp
            filesFormatted, // H: Lampiran
            "TRUE", // I: Notification trigger (TRUE since already submitted)
          ],
        ]);

        logActivity(
          "Form",
          "LGH Daily Report",
          `${submitterName} mensubmit LGH Daily Report: ${description.substring(0, 30)}...`
        );

        alert("LGH Daily Report berhasil dikirim!");
      }

      // Redirect to Dashboard
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim laporan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Camera Capture / Video Record Modal */}
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onCapture={(blob, mediaType) => {
            const isVideo = mediaType === "video" || blob.type.startsWith("video/");
            const ext = isVideo ? (blob.type.includes("mp4") ? "mp4" : "webm") : "jpg";
            const mimeType = isVideo ? blob.type || "video/mp4" : "image/jpeg";
            const file = new File(
              [blob],
              `capture_lgh_${Date.now()}.${ext}`,
              { type: mimeType }
            );
            setFiles((prev) => [...prev, file]);
            setShowCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowCameraModal(false);
            fileInputRef.current?.click();
          }}
        />
      )}

      {/* File Pre-Submission Lightbox Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[160] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4"
          onClick={handleClosePreview}
        >
          {/* Header */}
          <div
            className="w-full max-w-2xl flex justify-between items-center text-white bg-black/40 px-4 py-3 rounded-2xl border border-white/10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1 pr-3">
              <p className="text-sm font-bold truncate">{previewItem.file.name}</p>
              <p className="text-xs text-gray-400">
                {(previewItem.file.size / 1024).toFixed(1)} KB • File {previewItem.index + 1} dari {files.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!previewItem.isVideo && (
                <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono px-1">{Math.round(zoomScale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleClosePreview}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition active:scale-95 cursor-pointer"
                title="Tutup Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div
            className="flex-1 w-full max-w-2xl flex items-center justify-center p-2 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {previewItem.isVideo ? (
              <video
                src={previewItem.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl bg-black border border-white/10 object-contain"
              />
            ) : (
              <div className="overflow-auto max-w-full max-h-[70vh] flex items-center justify-center">
                <img
                  src={previewItem.url}
                  alt="Preview"
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                />
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div
            className="w-full max-w-2xl flex justify-between items-center gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                removeFile(previewItem.index);
              }}
              className="flex items-center gap-2 bg-red-600/90 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-lg"
            >
              <Trash2 className="w-4 h-4" />
              Hapus File Ini
            </button>
            <button
              type="button"
              onClick={handleClosePreview}
              className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="bg-white px-5 py-4 sticky top-0 z-30 flex justify-between items-center border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">LGH Daily Report</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Lovissa Guest House</p>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  readOnly={isReadOnly}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 ${isReadOnly ? "opacity-70 cursor-not-allowed bg-gray-100" : "bg-gray-50"}`}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Jam
                </label>
                <input
                  type="time"
                  value={reportTime}
                  onChange={(e) => setReportTime(e.target.value)}
                  readOnly={isReadOnly}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 ${isReadOnly ? "opacity-70 cursor-not-allowed bg-gray-100" : "bg-gray-50"}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Area <span className="text-red-500">*</span>
              </label>
              {isCustomArea ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Tulis area..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    readOnly={isReadOnly}
                    className={`flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 placeholder-gray-400 ${isReadOnly ? "opacity-70 cursor-not-allowed bg-gray-100" : "bg-gray-50"}`}
                  />
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomArea(false);
                        setDescription("");
                      }}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              ) : (
                <select
                  required
                  value={description}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    if (e.target.value === "Lainnya") {
                      setIsCustomArea(true);
                      setDescription("");
                    } else {
                      setDescription(e.target.value);
                    }
                  }}
                  className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 ${isReadOnly ? "opacity-70 cursor-not-allowed bg-gray-100" : "bg-gray-50"}`}
                >
                  <option value="">-- Pilih Area --</option>
                  <option value="Kamar 1">Kamar 1</option>
                  <option value="Kamar 2">Kamar 2</option>
                  <option value="Kamar 3">Kamar 3</option>
                  <option value="Kamar 4">Kamar 4</option>
                  <option value="Kamar 5">Kamar 5</option>
                  <option value="Kamar 6">Kamar 6</option>
                  <option value="Kamar 7">Kamar 7</option>
                  <option value="Kamar 8">Kamar 8</option>
                  <option value="Balkon Kamar">Balkon Kamar</option>
                  <option value="Kamar Mandi">Kamar Mandi</option>
                  <option value="Lobi Utama">Lobi Utama</option>
                  <option value="Dapur">Dapur</option>
                  <option value="Toilet Lantai Dasar">Toilet Lantai Dasar</option>
                  <option value="Area Parkir">Area Parkir</option>
                  <option value="Rooftop">Rooftop</option>
                  {description && ![
                    "Kamar 1", "Kamar 2", "Kamar 3", "Kamar 4",
                    "Kamar 5", "Kamar 6", "Kamar 7", "Kamar 8",
                    "Balkon Kamar", "Kamar Mandi", "Lobi Utama",
                    "Dapur", "Toilet Lantai Dasar", "Area Parkir", "Rooftop"
                  ].includes(description) && (
                    <option value={description}>{description}</option>
                  )}
                  <option value="Lainnya">Area Lainnya...</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Keterangan
              </label>
              <textarea
                rows={2}
                placeholder="Detail keterangan..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                readOnly={isReadOnly}
                className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 placeholder-gray-400 ${isReadOnly ? "opacity-70 cursor-not-allowed bg-gray-100" : "bg-gray-50"}`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Komentar / Pesan Chat (Opsional)
              </label>
              <p className="text-xs text-gray-500 mb-2">Pesan ini akan tampil di kolom chat.</p>
              <textarea
                rows={2}
                placeholder="Tulis pesan chat..."
                value={initialComment}
                onChange={(e) => setInitialComment(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-gray-800 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lampiran (Foto / Video / File)
              </label>

              <input
                type="file"
                multiple
                accept="image/*,video/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 border border-indigo-200 hover:border-indigo-400 rounded-xl py-3 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-all bg-white"
                >
                  <Camera className="w-4 h-4 text-indigo-500" />
                  Kamera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                >
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  Pilih File Galeri
                </button>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1 flex items-center justify-between">
                    <span>File Terlampir ({files.length})</span>
                    <span className="text-indigo-600 text-[10px]">Klik gambar/file untuk preview</span>
                  </p>
                  {files.map((file, idx) => {
                    const isVideo = file.type.startsWith("video/");
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200/80 hover:border-indigo-200 rounded-xl transition-colors group"
                      >
                        {/* Thumbnail clickable */}
                        <div
                          onClick={() => handleOpenPreview(file, idx)}
                          className="w-12 h-12 shrink-0 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer relative group/thumb shadow-xs"
                          title="Klik untuk melihat preview"
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              className="w-full h-full object-cover"
                              alt="preview"
                            />
                          ) : isVideo ? (
                            <>
                              <video
                                src={URL.createObjectURL(file)}
                                className="w-full h-full object-cover pointer-events-none"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center pl-0.5">
                                  <Play className="w-2.5 h-2.5 text-indigo-600 fill-indigo-600" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          )}
                          <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>

                        {/* File Details clickable */}
                        <div
                          onClick={() => handleOpenPreview(file, idx)}
                          className="flex-1 min-w-0 cursor-pointer"
                          title="Klik untuk melihat preview"
                        >
                          <p className="text-xs font-bold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                            <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                              {isVideo ? "Video" : "Foto"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(file, idx)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Preview File"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Mengirim Laporan...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Kirim Laporan</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
