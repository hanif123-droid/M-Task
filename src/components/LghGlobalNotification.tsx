import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Clock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { getSheetData, updateSheetData } from "../lib/api";
import { triggerNotificationFeedback } from "../utils/feedback";

function getColLetter(n: number) {
  let res = "";
  while (n >= 0) {
    res = String.fromCharCode((n % 26) + 65) + res;
    n = Math.floor(n / 26) - 1;
  }
  return res;
}

export function LghGlobalNotification() {
  const navigate = useNavigate();
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await getSheetData("User!A1:Z500").catch(() => null);
        if (res?.values?.length > 0) {
          const headers = (res.values[0] as string[]).map(h => h?.trim().toUpperCase());
          const emailIdx = headers.findIndex(h => h === "EMAIL" || h === "EMAIL ADDRESS");
          const nameIdx = headers.findIndex(h => h === "NAME" || h === "NAMA" || h === "FULL NAME" || h === "NAMA LENGKAP");
          
          if (emailIdx > -1 && nameIdx > -1) {
            const mapping: Record<string, string> = {};
            res.values.slice(1).forEach((row: any[]) => {
              const email = String(row[emailIdx] || "").trim().toLowerCase();
              const name = String(row[nameIdx] || "").trim();
              if (email && name) {
                mapping[email] = name;
              }
            });
            setUserMap(mapping);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user mapping for notifications:", err);
      }
    }
    fetchUsers();
  }, []);

  const resolveReporterName = (emailStr: string) => {
    if (!emailStr) return "User";
    let targetEmail = emailStr.trim().toLowerCase();
    
    // Handle "Name (email@example.com)" format
    if (targetEmail.includes("(") && targetEmail.includes(")")) {
      const match = targetEmail.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        targetEmail = match[1].trim();
      }
    }

    const email = targetEmail;
    
    // Explicit requested mapping
    if (email === "abdhan1000@gmail.com" || email === "abdhan1000") return "Hanif";
    if (email === "prawinaputu@gmail.com" || email === "prawinaputu") return "Putu";
    
    // Mapping from sheet
    if (userMap[email]) return userMap[email];
    
    // Fallback logic
    const prefix = email.includes("@") ? email.split("@")[0] : email;
    if (prefix.toLowerCase().includes("putu") || prefix.toLowerCase().includes("prawina")) return "Putu";
    if (prefix.toLowerCase().includes("pandu")) return "Pandu";
    
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  useEffect(() => {
    let intervalId: any;

    const checkNotifications = async () => {
      const activeEmail = (localStorage.getItem("mtask_user_email") || "").toLowerCase().trim();
      if (!activeEmail) return;

      const isPandu = activeEmail === "pandusuryo69@gmail.com";
      const isPrawina = activeEmail === "prawinaputu@gmail.com";

      if (!isPandu && !isPrawina) return;

      try {
        const res = await getSheetData("lgh daily report!A1:Z500").catch(() => null);
        if (res && res.values && res.values.length > 0) {
          const headerRow = (res.values[0] || []).map((h: any) => String(h || "").trim());
          const findHeaderIdx = (...names: string[]) => {
            return headerRow.findIndex((h: string) => {
              const hLower = h.toLowerCase();
              return names.some((n) => hLower === n.toLowerCase() || hLower.includes(n.toLowerCase()));
            });
          };

          const idIdx = findHeaderIdx("id");
          const areaIdx = findHeaderIdx("area", "deskripsi");
          const timeIdx = findHeaderIdx("tanggal", "timestamp", "waktu", "date");
          const userIdx = findHeaderIdx("user", "email", "pelapor", "oleh");
          const statusIdx = findHeaderIdx("status");
          const descIdx = findHeaderIdx("keterangan", "chat", "catatan");
          const readIdx = findHeaderIdx("read", "isread", "baca", "status read");

          const readColIdx = readIdx > -1 ? readIdx : 8; // Column I by default
          const readColLetter = getColLetter(readColIdx);

          const rows = res.values.slice(1);
          const parsedRows = rows.map((row: any[], index: number) => {
            const rowId = (idIdx > -1 ? row[idIdx] : row[0]) || `lgh-${index + 2}`;
            const rowArea = (areaIdx > -1 ? row[areaIdx] : row[1]) || "";
            const rowTime = (timeIdx > -1 ? row[timeIdx] : row[2]) || "";
            const rowEmail = (userIdx > -1 ? row[userIdx] : row[3]) || "";
            const rowStatus = (statusIdx > -1 ? row[statusIdx] : row[4]) || "";
            const rowDesc = (descIdx > -1 ? row[descIdx] : row[5]) || "";
            const rowRead = String(row[readColIdx] != null ? row[readColIdx] : (row[8] || "")).trim();

            return {
              rowIdx: index + 2,
              id: rowId,
              area: rowArea,
              timestamp: rowTime,
              email: rowEmail,
              status: rowStatus,
              description: rowDesc,
              readVal: rowRead,
              readColLetter: readColLetter,
            };
          }).reverse();

          if (isPandu) {
            // Pandu: Trigger if status = Review AND Read = TRUE
            const reviewNotification = parsedRows.find(
              (r) =>
                r.status.trim().toLowerCase() === "review" &&
                r.readVal.trim().toUpperCase() === "TRUE"
            );

            if (reviewNotification) {
              setActiveNotification((prev: any) => {
                if (!prev || prev.id !== reviewNotification.id || prev.type !== "pandu_review") {
                  if (!notifiedIdsRef.current.has(reviewNotification.id)) {
                    notifiedIdsRef.current.add(reviewNotification.id);
                    triggerNotificationFeedback();
                  }
                  return {
                    ...reviewNotification,
                    type: "pandu_review",
                    title: "LGH Daily report",
                    nextReadValue: "OK",
                  };
                }
                return prev;
              });
            } else {
              setActiveNotification((prev: any) => (prev?.type === "pandu_review" ? null : prev));
            }
          } else if (isPrawina) {
            // Prawina: Trigger if Read = FALSE (New cleaning request)
            const unreadRequest = parsedRows.find(
              (r) => r.readVal.trim().toUpperCase() === "FALSE"
            );

            if (unreadRequest) {
              setActiveNotification((prev: any) => {
                if (!prev || prev.id !== unreadRequest.id || prev.type !== "prawina_request") {
                  if (!notifiedIdsRef.current.has(unreadRequest.id)) {
                    notifiedIdsRef.current.add(unreadRequest.id);
                    triggerNotificationFeedback();
                  }
                  return {
                    ...unreadRequest,
                    type: "prawina_request",
                    title: "Request cleaning baru",
                    nextReadValue: "TRUE",
                  };
                }
                return prev;
              });
            } else {
              setActiveNotification((prev: any) => (prev?.type === "prawina_request" ? null : prev));
            }
          }
        }
      } catch (err) {
        console.error("Error checking LGH notifications:", err);
      }
    };

    // Check immediately, then every 8 seconds
    checkNotifications();
    intervalId = setInterval(checkNotifications, 8000);

    return () => clearInterval(intervalId);
  }, []);

  const handleNotificationClick = async (report: any) => {
    try {
      // Optimistically dismiss
      setActiveNotification(null);
      const colLetter = report.readColLetter || "I";
      const nextValue = report.nextReadValue || (report.type === "pandu_review" ? "OK" : "TRUE");
      
      // Update the Read column to "OK" (for Pandu) or "TRUE" (for Prawina)
      await updateSheetData(`lgh daily report!${colLetter}${report.rowIdx}`, [[nextValue]]);
    } catch (err) {
      console.error("Failed to update Read column:", err);
    }

    // Navigate based on type
    if (report.type === "prawina_request") {
      navigate("/lgh-daily-report", {
        state: {
          rowIdx: report.rowIdx,
          area: report.area,
          timestamp: report.timestamp,
          description: report.description,
          email: report.email,
          id: report.id,
          isFromNotification: true,
        },
      });
    } else {
      // Pandu review: Navigate to related detail page (/units/UNT19 for Lovissa Guest House detail)
      navigate("/units/UNT19", {
        state: {
          openLghReportId: report.id,
          rowIdx: report.rowIdx,
          area: report.area,
          timestamp: report.timestamp,
          description: report.description,
          email: report.email,
          id: report.id,
          isFromNotification: true,
        },
      });
    }
  };

  return (
    <AnimatePresence>
      {activeNotification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-indigo-100 overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {activeNotification.title || "LGH Daily report"}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    ID: #{activeNotification.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveNotification(null)}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Card Content */}
            <div
              onClick={() => handleNotificationClick(activeNotification)}
              className="bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-100/80 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all space-y-3 group"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  Status Laporan
                </span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shadow-2xs">
                  {activeNotification.status || "Review"}
                </span>
              </div>

              {activeNotification.area && (
                <div className="text-xs text-gray-700">
                  <span className="text-gray-400 font-medium">Area: </span>
                  <span className="text-gray-900 font-bold text-sm ml-1">
                    {activeNotification.area}
                  </span>
                </div>
              )}

              {activeNotification.email && (
                <div className="text-xs text-gray-600">
                  <span className="text-gray-400 font-medium">Pelapor: </span>
                  <span className="text-gray-800 font-semibold ml-1">
                    {resolveReporterName(activeNotification.email)}
                  </span>
                </div>
              )}

              {activeNotification.description && (
                <p className="text-xs text-gray-700 bg-white/70 rounded-lg p-2.5 border border-indigo-50 line-clamp-3 leading-relaxed">
                  {activeNotification.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-indigo-100/60">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-medium">{activeNotification.timestamp}</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                  <span>Buka Detail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Bottom Button Action */}
            <div className="mt-4">
              <button
                onClick={() => handleNotificationClick(activeNotification)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                {activeNotification.type === "prawina_request" 
                  ? "Buka Form Cleaning & Tandai Dibaca" 
                  : "Buka Detail & Tandai Selesai (OK)"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
