import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Star,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Briefcase,
  FileText,
  SwitchCamera,
  Loader2,
  Award,
  CreditCard,
  Activity,
  X,
  Settings as SettingsIcon,
  Building2,
  File as FileIcon,
  MessageSquare,
  ShoppingCart,
  ExternalLink,
  Camera,
  Check,
  Edit3,
  Plus,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSheetData,
  updateSheetData,
  getSheetDataFromId,
  updateSheetDataFromId,
  appendSheetDataFromId,
} from "../lib/api";
import {
  AddProductDropdown,
  ProductOption,
  DraftProductItem,
} from "../components/AddProductDropdown";
import { cn, formatImageUrl } from "../lib/utils";
import { CameraModal } from "../components/CameraModal";
import { NotaMediaViewer } from "../components/NotaMediaViewer";
import { DriveService } from "../lib/driveService";
import { getStars } from "./Users";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function formatIDR(amount: number | string) {
  const num =
    typeof amount === "string"
      ? parseFloat(amount.replace(/\D/g, "")) || 0
      : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

function calculateDuration(joinDateStr: string) {
  if (!joinDateStr || joinDateStr === "-") return "-";
  const parts = joinDateStr.split("/");
  if (parts.length !== 3) return "-";

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);

  const joinDate = new Date(year, month, day);
  const now = new Date();

  let years = now.getFullYear() - joinDate.getFullYear();
  let months = now.getMonth() - joinDate.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < joinDate.getDate())) {
    years--;
    months += 12;
  }

  if (years > 0) return `${years} tahun`;
  if (months > 0) return `${months} bulan`;
  return "Baru bergabung";
}

function formatDateMMDDYY(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function getDueDaysLeft(dueDateStr: string): {
  label: string;
  days: number;
  isOverdue: boolean;
} {
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return { label: "", days: 0, isOverdue: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Days Overdue", days: Math.abs(diffDays), isOverdue: true };
  } else {
    return { label: "Days Left", days: diffDays, isOverdue: false };
  }
}

function colIndexToLetter(index: number): string {
  let temp,
    letter = "";
  let i = index;
  while (i >= 0) {
    temp = i % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    i = (i - temp) / 26 - 1;
  }
  return letter;
}

function parseCatatan(text: string) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > -1) {
        const sender = trimmed.substring(0, colonIdx).trim();
        const message = trimmed.substring(colonIdx + 1).trim();
        return { sender, message, raw: trimmed };
      }
      return { sender: "System", message: trimmed, raw: trimmed };
    })
    .filter(Boolean) as { sender: string; message: string; raw: string }[];
}

function formatDateToMMDDYYYY(dateStr: string) {
  if (!dateStr || dateStr === "-") return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
}

function getColLetter(colIdx: number) {
  let temp,
    letter = "";
  while (colIdx >= 0) {
    temp = colIdx % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIdx = (colIdx - temp) / 26 - 1;
  }
  return letter;
}

export function UserDetail({
  userEmail,
  isProfile,
}: { userEmail?: string; isProfile?: boolean } = {}) {
  const navigate = useNavigate();
  const { id } = useParams(); // id is encoded email
  const decodedEmail = userEmail || (id ? decodeURIComponent(id) : "");
  const currentUserEmail = localStorage.getItem("mtask_user_email") || "";

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [unitMap, setUnitMap] = useState<
    Map<string, { name: string; logo: string }>
  >(new Map());
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [boganathaOrders, setBoganathaOrders] = useState<any[]>([]);
  const [boganathaDetailsMap, setBoganathaDetailsMap] = useState<
    Map<string, any[]>
  >(new Map());
  const [showBoganathaOrders, setShowBoganathaOrders] = useState(false);
  const [selectedBoganathaOrder, setSelectedBoganathaOrder] =
    useState<any>(null);
  const [allProductsList, setAllProductsList] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [projectMap, setProjectMap] = useState<Map<string, string>>(new Map());
  const [taskMap, setTaskMap] = useState<Map<string, string>>(new Map());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);
  const [showSilhouette, setShowSilhouette] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [receiveItem, setReceiveItem] = useState<any>(null);
  const [receiveKeterangan, setReceiveKeterangan] = useState("");
  const [receivePhotoBlob, setReceivePhotoBlob] = useState<Blob | null>(null);
  const [receivePhotoPreview, setReceivePhotoPreview] = useState<string | null>(
    null,
  );
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any>(null);

  const location = useLocation();

  useEffect(() => {
    if (orders.length > 0 && location.state?.openOrderRowIndex) {
      const targetOrder = orders.find(
        (o) => o.rowIndex === location.state.openOrderRowIndex,
      );
      if (targetOrder) {
        setSelectedOrder(targetOrder);
      }
      // Remove it from state so it won't reopen if they close it and somehow re-render
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, openOrderRowIndex: undefined },
      });
    }
  }, [orders, location.state, navigate, location.pathname]);

  useEffect(() => {
    if (boganathaOrders.length > 0 && location.state?.openBoganathaOrderId) {
      const targetOrder = boganathaOrders.find(
        (o) => o.idPesanan === location.state.openBoganathaOrderId,
      );
      if (targetOrder) {
        setSelectedBoganathaOrder(targetOrder);
        setShowBoganathaOrders(true);
      }
      // Remove it from state
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, openBoganathaOrderId: undefined },
      });
    }
  }, [boganathaOrders, location.state, navigate, location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [showProjects, setShowProjects] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  const handleToggleSilhouette = async () => {
    if (!userData || isToggleLoading) return;
    const currentSilhouette = showSilhouette;
    const newSilhouette = !currentSilhouette;
    const newAvail = !newSilhouette; // If silhouette is ON, avail is FALSE. If silhouette is OFF, avail is TRUE.

    // Optimistic update
    setShowSilhouette(newSilhouette);
    setIsToggleLoading(true);

    try {
      // 1. Get column letter
      const colLetter = colIndexToLetter(userData.availColIndex);
      const range = `User!${colLetter}${userData.rowIndex}`;
      const headersRange = `User!${colLetter}1`;

      // In case we are appending the column, let's just make sure we update the header too
      // But updateSheetData on a single cell is easiest
      await updateSheetData(headersRange, [["AVAIL"]]);
      await updateSheetData(range, [[newAvail ? "TRUE" : "FALSE"]]);

      setUserData({ ...userData, avail: newAvail });

      // Update localStorage avatar to reflect the change dynamically across pages immediately
      const savedEmail = localStorage.getItem("mtask_user_email");
      if (
        savedEmail &&
        savedEmail.toLowerCase() === userData.email.toLowerCase()
      ) {
        if (newAvail) {
          localStorage.setItem(
            "mtask_user_avatar",
            formatImageUrl(userData.photo || ""),
          );
        } else {
          localStorage.setItem("mtask_user_avatar", "");
        }
        window.dispatchEvent(new Event("mtask_user_changed"));
      }
    } catch (error) {
      console.error("Failed to update toggle", error);
      // Revert optimistic update
      setShowSilhouette(currentSilhouette);
    } finally {
      setIsToggleLoading(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [
          userRes,
          unitRes,
          projectRes,
          taskRes,
          orderRes1,
          orderRes2,
          boganathaRes,
          boganathaDetailRes,
          boganathaProdukRes,
        ] = await Promise.all([
          getSheetDataFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "User!A1:Z500",
          ).catch(() => null),
          getSheetData("Unit!A1:Z500").catch(() => null),
          getSheetData("Project!A1:Z1000").catch(() => null),
          getSheetData("Task!A1:Z2000").catch(() => null),
          getSheetData("Order Budget!A1:Z2000").catch(() => null),
          getSheetData("OrderBudget!A1:Z2000").catch(() => null),
          getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Pesanan!A1:Z1000",
          ).catch(() => null),
          getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Detail_Pesanan!A1:Z2000",
          ).catch(() => null),
          getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Produk!A1:Z1000",
          ).catch(() => null),
        ]);

        // Units
        const units = new Map<string, { name: string; logo: string }>();
        if (unitRes?.values?.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ID" ||
              h?.trim().toUpperCase() === "UNIT ID",
          );
          const nameIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "UNIT NAME",
          );
          const logoIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "IMAGE" ||
              h?.trim().toUpperCase() === "LOGO",
          );
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((row: any[]) => {
              const idx = row[idIdx]?.trim();
              if (idx) {
                units.set(idx, {
                  name: nameIdx > -1 ? row[nameIdx] || idx : idx,
                  logo: logoIdx > -1 ? row[logoIdx] || "" : "",
                });
              }
            });
          }
        }
        setUnitMap(units);

        // User
        let foundUser = null;
        let parsedUsers: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "EMAIL",
          );
          const nameIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "NAME" || key === "NAMA" || key === "NAMA LENGKAP";
          });
          const fullnameIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "FULL NAME" || key === "NAMA LENGKAP";
          });
          const idIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "ID" ||
              key === "KTA" ||
              key === "KTA ID" ||
              key === "KTA_ID" ||
              key === "NIK" ||
              key === "CONTACT ID"
            );
          });
          const photoIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "PHOTO" ||
              key === "AVATAR" ||
              key === "FOTO" ||
              key === "IMAGE" ||
              key === "PHOTO KTP"
            );
          });
          const poinIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "POIN" || key === "POINT" || key === "POINTS";
          });
          const performanceIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "PERFORMANCE";
          });
          const unitIdIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "UNIT ID" ||
              key === "UNIT BUSINESS" ||
              key === "UNIT_BUSINESS" ||
              key === "UNITID" ||
              key === "KODE UNIT" ||
              key === "UNITKODE" ||
              key === "UNIT"
            );
          });
          const phoneIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "PHONE" ||
              key === "NO HP" ||
              key === "NOHP" ||
              key === "TELEPON" ||
              key === "WHATSAPP"
            );
          });
          const alamatIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "ALAMAT" || key === "ADDRESS";
          });
          const joinIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "JOIN DATE" ||
              key === "TANGGAL GABUNG" ||
              key === "TIMESTAMP"
            );
          });
          const availIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "AVAIL" || key === "AVAILABLE" || key === "STATUS";
          });
          const mapIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "MAP" || key === "MAPS" || key === "LOCATION";
          });

          userRes.values.slice(1).forEach((row: any[], i: number) => {
            const email = emailIdx > -1 ? row[emailIdx]?.trim() : "";
            const userObj = {
              email,
              name: nameIdx > -1 ? row[nameIdx] : "-",
              fullName: fullnameIdx > -1 ? row[fullnameIdx] : "-",
              ktaId: idIdx > -1 ? row[idIdx] : "-",
              photo: photoIdx > -1 ? row[photoIdx] || "" : "",
              poin: poinIdx > -1 ? parseInt(row[poinIdx], 10) || 0 : 0,
              performance: performanceIdx > -1 ? parseInt(row[performanceIdx], 10) || 0 : 0,
              unitId: unitIdIdx > -1 ? row[unitIdIdx] : "",
              phone: phoneIdx > -1 ? row[phoneIdx] : "-",
              alamat: alamatIdx > -1 ? row[alamatIdx] : "-",
              joinDate: joinIdx > -1 ? row[joinIdx] : "-",
              mapUrl: mapIdx > -1 ? row[mapIdx] || "" : "",
              avail:
                availIdx > -1
                  ? row[availIdx]?.trim().toUpperCase() !== "FALSE"
                  : true, // default True unless FALSE
              rowIndex: i + 2, // 1-based header + 1-based index (0 mapped to 2)
              availColIndex: availIdx > -1 ? availIdx : headers.length, // append col if not exists
            };
            if (email && userObj.ktaId !== "XXX") parsedUsers.push(userObj);

            if (email && email.toLowerCase() === decodedEmail.toLowerCase()) {
              foundUser = userObj;
            }
          });
        }

        setAllUsers(parsedUsers);

        if (!foundUser && decodedEmail) {
          foundUser = {
            email: decodedEmail,
            name: decodedEmail.split("@")[0],
            fullName: decodedEmail.split("@")[0].toUpperCase(),
            ktaId: "USER-TEMP",
            photo: "",
            poin: 0,
            performance: 0,
            unitId: "",
            phone: "-",
            alamat: "-",
            joinDate: new Date().toLocaleDateString("id-ID"),
            mapUrl: "",
            avail: true,
            rowIndex: -1,
            availColIndex: -1,
          };
        }

        setUserData(foundUser);
        if (foundUser) {
          setShowSilhouette(!foundUser.avail);
        }

        // Projects
        const pMap = new Map<string, string>();
        const projStatusMap = new Map<string, string>();
        const hiddenProjectIds = new Set<string>();

        if (projectRes?.values?.length > 0) {
          const headers = projectRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "ID",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT NAME" ||
              h?.trim().toUpperCase() === "PROJECT TITLE",
          );
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS" || h?.trim().toUpperCase() === "PROJECT STATUS",
          );

          projectRes.values.slice(1).forEach((row: any[]) => {
            const pId = idIdx > -1 ? row[idIdx]?.trim() : "";
            const pname = nameIdx > -1 ? row[nameIdx] : "Unknown";
            const pStatus = statusIdx > -1 ? (row[statusIdx] || "").trim() : "Active";
            const normStatus = pStatus.toLowerCase().replace(/[\s_-]+/g, "");
            
            if (pId) {
              pMap.set(pId, pname);
              projStatusMap.set(pId, pStatus);
              if (normStatus === "notstarted" || pStatus.toLowerCase() === "not started" || normStatus === "canceled" || normStatus === "cancelled" || normStatus === "cancel") {
                hiddenProjectIds.add(pId);
              }
            }
          });
        }
        setProjectMap(pMap);

        // Tasks
        const userProjectIds = new Set<string>();
        const tMap = new Map<string, string>();
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "TASK_ID" ||
              h?.trim().toUpperCase() === "TASK ID" ||
              h?.trim().toUpperCase() === "ID",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "TASK TITLE" ||
              h?.trim().toUpperCase() === "TASK NAME" ||
              h?.trim().toUpperCase() === "TASK_TITLE",
          );
          const userIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "USER",
          );
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS",
          );
          const dueIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "DUE DATE",
          );
          const taskProjIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "PROJECT" ||
              h?.trim().toUpperCase() === "ID PROJECT",
          );

          const usrTask = [];
          taskRes.values.slice(1).forEach((row: any[], i: number) => {
            const tid = taskIdIdx > -1 ? row[taskIdIdx]?.trim() : "";
            const tname = nameIdx > -1 ? row[nameIdx] : "Unknown";
            if (tid) tMap.set(tid, tname);

            const u = userIdx > -1 ? row[userIdx]?.trim() : "";
            if (u && u.toLowerCase() === decodedEmail.toLowerCase()) {
              const projectId =
                taskProjIdIdx > -1 ? row[taskProjIdIdx]?.trim() : "";
              
              // Skip task if its project status is Not Started
              if (projectId && hiddenProjectIds.has(projectId)) {
                return;
              }

              if (projectId) userProjectIds.add(projectId);

              usrTask.push({
                id: tid || `t-${i}`,
                name: tname,
                status: statusIdx > -1 ? row[statusIdx] : "Todo",
                dueDate: dueIdx > -1 ? row[dueIdx] : "-",
              });
            }
          });
          setTasks(usrTask);
        }
        setTaskMap(tMap);

        // Filter user projects for display
        if (projectRes?.values?.length > 0) {
          const headers = projectRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "ID",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT NAME" ||
              h?.trim().toUpperCase() === "PROJECT TITLE",
          );
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS" || h?.trim().toUpperCase() === "PROJECT STATUS",
          );

          const usrProj = [];
          projectRes.values.slice(1).forEach((row: any[], i: number) => {
            const pId = idIdx > -1 ? row[idIdx]?.trim() : "";
            const pname = nameIdx > -1 ? row[nameIdx] : "Unknown";
            if (pId && userProjectIds.has(pId)) {
              usrProj.push({
                id: pId,
                name: pname,
                status: statusIdx > -1 ? row[statusIdx] : "Active",
              });
            }
          });
          setProjects(usrProj);
        }

        // Orders
        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const headers = orderRes.values[0] as string[];
          const findIdx = (keyTerms: string[]) =>
            headers.findIndex((h) => {
              const norm = h?.trim().toUpperCase() || "";
              return keyTerms.some(
                (fk) =>
                  norm === fk.toUpperCase() ||
                  norm.replace(/[^A-Z0-9]/g, "") ===
                    fk.replace(/[^A-Z0-9]/g, "").toUpperCase(),
              );
            });

          const userIdx = findIdx(["EMAIL USER", "EMAIL", "USER"]);
          const roIdx = findIdx([
            "RO_Number",
            "RO_NUMBER",
            "RO NUMBER",
            "RO NO",
            "RO",
          ]);
          const nameIdx = findIdx([
            "Order Detail",
            "ORDER DETAIL",
            "DETAIL",
            "ORDER NAME",
            "ORDER_DETAIL",
          ]);
          const amountIdx = findIdx(["Amount", "AMOUNT", "TOTAL", "NILAI"]);
          const tierIdx = findIdx([
            "Review Tier",
            "REVIEW TIER",
            "TIER",
            "STATUS",
          ]);
          const dateIdx = findIdx(["Date", "DATE", "TANGGAL", "TIMESTAMP"]);
          const unitIdx = findIdx([
            "Unit Business",
            "UNIT BUSINESS",
            "UNIT ID",
            "UNIT",
            "UNIT_BUSINESS",
          ]);
          const projectIdx = findIdx([
            "Project_id",
            "PROJECT_ID",
            "PROJECT ID",
            "PROJECT",
            "ID PROJECT",
          ]);
          const taskIdx = findIdx([
            "Task_id",
            "TASK_ID",
            "TASK ID",
            "TASK",
            "ID TASK",
          ]);
          const contactIdx = findIdx([
            "Contact_ID",
            "CONTACT_ID",
            "CONTACT ID",
            "CONTACT",
            "NAMA",
          ]);
          const orderTypeIdx = findIdx([
            "Order Type",
            "ORDER TYPE",
            "TYPE",
            "UNTUK PEMBAYARAN",
          ]);
          const viaIdx = findIdx(["Via", "VIA", "DENGAN CARA"]);
          const viaNamaIdx = findIdx([
            "via_nama",
            "VIA_NAMA",
            "VIA NAMA",
            "BANK",
            "PENERIMA",
            "VIA_RECEIVER",
          ]);
          const rekNoIdx = findIdx([
            "Rek No",
            "REK NO",
            "REK_NO",
            "REKENING",
            "NOMOR REKENING",
          ]);
          const anIdx = findIdx(["A n", "A N", "A_N", "ATAS NAMA"]);
          const t1rIdx = findIdx([
            "Tier 1 Review",
            "TIER 1 REVIEW",
            "TIER 1",
            "ADMIN",
            "ADMIN_REVIEW",
          ]);
          const dt1Idx = findIdx([
            "Date Tier 1",
            "DATE TIER 1",
            "DATE_TIER_1",
            "DATE TIER1",
          ]);
          const t2rIdx = findIdx([
            "Tier 2 Review",
            "TIER 2 REVIEW",
            "TIER 2",
            "BOARD",
            "BOARD_REVIEW",
          ]);
          const dt2Idx = findIdx([
            "Date Tier 2",
            "DATE TIER 2",
            "DATE_TIER_2",
            "DATE TIER2",
          ]);
          const t3rIdx = findIdx([
            "Tier 3 Review",
            "TIER 3 REVIEW",
            "TIER 3",
            "BOSS",
            "BOSS_REVIEW",
          ]);
          const dt3Idx = findIdx([
            "Date Tier 3",
            "DATE TIER 3",
            "DATE_TIER_3",
            "DATE TIER3",
          ]);
          const buktiIdx = findIdx([
            "Bukti Transfer",
            "BUKTI_TRANSFER",
            "BUKTI_BAYAR",
            "BUKTI",
          ]);
          const catatanIdx = findIdx([
            "Catatan",
            "CATATAN",
            "NOTE",
            "MEMO",
            "KETERANGAN",
          ]);
          const notaIdx = findIdx([
            "Nota Belanja",
            "NOTA_BELANJA",
            "NOTA",
            "NOTA BELANJA",
            "BUKTI_NOTA",
          ]);
          const readIdx = findIdx(["Read", "READ", "DIBACA", "TERBACA"]);

          // To find the original row index, we'll map before filtering, or just keep track.
          // orderRes.values has header at 0, data starts at 1. so rowIndex = i + 2

          const usrOrder: any[] = [];
          orderRes.values.slice(1).forEach((row: any[], i: number) => {
            const u = userIdx > -1 ? row[userIdx]?.trim() : "";
            if (u && u.toLowerCase() === decodedEmail.toLowerCase()) {
              usrOrder.push({
                id: `o-${i}`,
                rowIndex: i + 2,
                ro: roIdx > -1 ? row[roIdx] : "-",
                detail: nameIdx > -1 ? row[nameIdx] : "-",
                amount: amountIdx > -1 ? row[amountIdx] : "0",
                status: tierIdx > -1 ? row[tierIdx] : "-",
                date: dateIdx > -1 ? row[dateIdx] : "-",
                unitBusiness: unitIdx > -1 ? row[unitIdx] : "-",
                projectId: projectIdx > -1 ? row[projectIdx] : "-",
                taskId: taskIdx > -1 ? row[taskIdx] : "-",
                contactId: contactIdx > -1 ? row[contactIdx] : "-",
                orderType: orderTypeIdx > -1 ? row[orderTypeIdx] : "-",
                via: viaIdx > -1 ? row[viaIdx] : "-",
                viaNama: viaNamaIdx > -1 ? row[viaNamaIdx] : "-",
                rekNo: rekNoIdx > -1 ? row[rekNoIdx] : "-",
                an: anIdx > -1 ? row[anIdx] : "-",
                t1r: t1rIdx > -1 ? row[t1rIdx] : "-",
                dt1: dt1Idx > -1 ? row[dt1Idx] : "-",
                t2r: t2rIdx > -1 ? row[t2rIdx] : "-",
                dt2: dt2Idx > -1 ? row[dt2Idx] : "-",
                t3r: t3rIdx > -1 ? row[t3rIdx] : "-",
                dt3: dt3Idx > -1 ? row[dt3Idx] : "-",
                bukti: buktiIdx > -1 ? row[buktiIdx] : "-",
                nota: notaIdx > -1 ? row[notaIdx] : "-",
                catatan: catatanIdx > -1 ? row[catatanIdx] : "",
                read: readIdx > -1 ? row[readIdx] : "FALSE",
              });
            }
          });

          usrOrder.sort((a, b) => (b.rowIndex || 0) - (a.rowIndex || 0));
          setOrders(usrOrder);
        }

        // Boganatha Orders
        if (
          boganathaRes &&
          boganathaRes.values &&
          boganathaRes.values.length > 1
        ) {
          const headers = boganathaRes.values[0] as string[];
          const findIdx = (terms: string[]) =>
            headers.findIndex((h) => {
              const norm = h?.trim().toUpperCase() || "";
              return terms.some((t) => norm === t || norm.includes(t));
            });
          const idIdx = findIdx(["ID_PESANAN", "ID PESANAN", "ORDER ID"]);
          const tglIdx = findIdx(["TANGGAL_PESANAN", "TANGGAL", "DATE"]);
          const emailIdx = findIdx(["USER", "EMAIL", "PELANGGAN"]);
          const totalIdx = findIdx(["TOTAL_BAYAR", "TOTAL BAYAR"]);
          const statusIdx = findIdx(["STATUS_PESANAN", "STATUS"]);
          const statusPaidIdx = findIdx(["STATUS_PAID", "STATUSPAID"]);
          const subtotalIdx = findIdx(["TOTAL_HARGA"]);
          const ongkirIdx = findIdx(["ONGKOS_KIRIM"]);
          const diskonIdx = findIdx(["DISKON"]);
          const voucherIdx = findIdx(["VOUCHER"]);
          const poinIdx = findIdx(["POIN"]);
          const alamatIdx = findIdx(["ALAMAT_KIRIM", "ALAMAT KIRIM"]);
          const unitIdx = findIdx(["UNIT"]);

          let usrBogOrd: any[] = [];
          boganathaRes.values.slice(1).forEach((row: any[], i: number) => {
            const uEmail = emailIdx > -1 ? row[emailIdx]?.trim() : "";
            const unitVal = unitIdx > -1 ? row[unitIdx]?.trim() || "" : "";
            if (
              uEmail &&
              uEmail.toLowerCase() === decodedEmail.toLowerCase() &&
              unitVal === ""
            ) {
              usrBogOrd.push({
                rowIndex: i + 2,
                idPesanan: idIdx > -1 ? row[idIdx] : `BOG-${i}`,
                tanggal: tglIdx > -1 ? row[tglIdx] : "-",
                total:
                  totalIdx > -1
                    ? parseFloat(
                        String(row[totalIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                subtotal:
                  subtotalIdx > -1
                    ? parseFloat(
                        String(row[subtotalIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                ongkir:
                  ongkirIdx > -1
                    ? parseFloat(
                        String(row[ongkirIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                diskon:
                  diskonIdx > -1
                    ? parseFloat(
                        String(row[diskonIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                voucher:
                  voucherIdx > -1
                    ? parseFloat(
                        String(row[voucherIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                poin:
                  poinIdx > -1
                    ? parseFloat(
                        String(row[poinIdx]).replace(/[^\d.-]/g, ""),
                      ) || 0
                    : 0,
                alamat: alamatIdx > -1 ? row[alamatIdx] : "",
                unit: unitIdx > -1 ? row[unitIdx] : "",
                status: statusIdx > -1 ? row[statusIdx] : "Send",
                statusIdx: statusIdx,
                statusPaid: statusPaidIdx > -1 ? row[statusPaidIdx] : "",
                statusPaidColIdx: statusPaidIdx,
                userEmail: uEmail,
                rawRow: row, // Pass the row if needed later
                headers: headers, // Pass headers
              });
            }
          });
          setBoganathaOrders(usrBogOrd);
        }

        // Boganatha Details & Products
        if (
          boganathaDetailRes &&
          boganathaDetailRes.values &&
          boganathaDetailRes.values.length > 0 &&
          boganathaProdukRes &&
          boganathaProdukRes.values &&
          boganathaProdukRes.values.length > 0
        ) {
          const prodHeaders = boganathaProdukRes.values[0] as string[];
          const prodIdIdx = prodHeaders.findIndex((h) =>
            h?.trim().toLowerCase().includes("id"),
          );
          const prodNameIdx = prodHeaders.findIndex((h) =>
            h?.trim().toLowerCase().includes("nama"),
          );
          const prodPhotoIdx = prodHeaders.findIndex(
            (h) =>
              h?.trim().toLowerCase().includes("foto") ||
              h?.trim().toLowerCase().includes("gambar") ||
              h?.trim().toLowerCase().includes("image"),
          );
          const prodPriceIdx = prodHeaders.findIndex(
            (h) =>
              h?.trim().toLowerCase().includes("harga") ||
              h?.trim().toLowerCase().includes("price"),
          );

          const prodMap = new Map<string, any>();
          const prodsList: ProductOption[] = [];
          boganathaProdukRes.values.slice(1).forEach((row: any[]) => {
            const id = prodIdIdx > -1 ? row[prodIdIdx] : null;
            const name = prodNameIdx > -1 ? row[prodNameIdx] : "";
            const image = prodPhotoIdx > -1 ? row[prodPhotoIdx] : "";
            const rawPrice = prodPriceIdx > -1 ? row[prodPriceIdx] : 0;
            const price =
              typeof rawPrice === "number"
                ? rawPrice
                : parseFloat(String(rawPrice || 0).replace(/[^0-9.-]+/g, "")) || 0;
            if (id) {
              if (name) prodsList.push({ id, name, price, image });
              prodMap.set(id, {
                name: name || "-",
                image: image || "",
                harga: price,
              });
            }
          });
          setAllProductsList(prodsList);

          const detHeaders = boganathaDetailRes.values[0] as string[];
          const detOrderIdIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "id_pesanan",
          );
          const detProdIdIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "id_produk",
          );
          const detQtyIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "jumlah",
          );
          const detPriceIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "harga_satuan",
          );
          const detSubtotalIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "subtotal",
          );
          const detStatusKirimIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "status_kirim",
          );
          const detPenerimaIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "penerima",
          );
          const detTimestampIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "timestamp",
          );
          const detPhotoIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "photo",
          );
           const detKeteranganIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "keterangan",
          );
          const detIdDetailIdx = detHeaders.findIndex(
            (h) => h?.trim().toLowerCase() === "id_detail",
          );
          const detStatusPesananIdx = detHeaders.findIndex((h) => {
            if (!h) return false;
            const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
            return norm === "statuspesanan" || norm === "statusitem" || norm === "statusdetail" || norm === "status";
          });
          const defaultStatusPesananColIdx = detStatusPesananIdx > -1 ? detStatusPesananIdx : 10;

          const detailsMap = new Map<string, any[]>();
          boganathaDetailRes.values
            .slice(1)
            .forEach((row: any[], i: number) => {
              const orderId = detOrderIdIdx > -1 ? row[detOrderIdIdx] : null;
              if (orderId) {
                const prodId = detProdIdIdx > -1 ? row[detProdIdIdx] : null;
                const product = prodId ? prodMap.get(prodId) : null;
                const itemStatusPesanan = detStatusPesananIdx > -1 && row[detStatusPesananIdx] ? row[detStatusPesananIdx]?.trim() || "" : "";
                const item = {
                  rowIndex: i + 2, // 0-based to 1-based, plus 1 for header
                  idDetail: detIdDetailIdx > -1 ? row[detIdDetailIdx] : "",
                  prodId,
                  statusPesananColIdx: defaultStatusPesananColIdx,
                  statusPesanan: itemStatusPesanan,
                  name: product?.name || "Unknown Product",
                  image: product?.image || "",
                  qty:
                    detQtyIdx > -1
                      ? parseFloat(String(row[detQtyIdx])) || 0
                      : 0,
                  price:
                    detPriceIdx > -1
                      ? parseFloat(String(row[detPriceIdx])) || 0
                      : 0,
                  subtotal:
                    detSubtotalIdx > -1
                      ? parseFloat(String(row[detSubtotalIdx])) || 0
                      : 0,
                  statusKirim:
                    detStatusKirimIdx > -1
                      ? row[detStatusKirimIdx]?.trim() || ""
                      : "",
                  penerima:
                    detPenerimaIdx > -1
                      ? row[detPenerimaIdx]?.trim() || ""
                      : "",
                  timestamp:
                    detTimestampIdx > -1
                      ? row[detTimestampIdx]?.trim() || ""
                      : "",
                  photo: detPhotoIdx > -1 ? row[detPhotoIdx]?.trim() || "" : "",
                  keterangan:
                    detKeteranganIdx > -1
                      ? row[detKeteranganIdx]?.trim() || ""
                      : "",
                };
                if (!detailsMap.has(orderId)) detailsMap.set(orderId, []);
                detailsMap.get(orderId)!.push(item);
              }
            });
          setBoganathaDetailsMap(detailsMap);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [decodedEmail]);

  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;
    try {
      setIsUpdatingOrder(true);
      const headersRes = await getSheetData("Order Budget!A1:Z1").catch(
        () => null,
      );
      let sheetToUpdate = "Order Budget";
      let hHeaders = headersRes?.values?.[0];
      if (!hHeaders) {
        const headersRes2 = await getSheetData("OrderBudget!A1:Z1").catch(
          () => null,
        );
        sheetToUpdate = "OrderBudget";
        hHeaders = headersRes2?.values?.[0] || [];
      }
      if (!hHeaders) throw new Error("Could not fetch Order Budget headers");

      let rIdx = -1;
      const terms = ["Read", "READ", "DIBACA", "TERBACA"];
      rIdx = hHeaders.findIndex((h: string) => {
        const norm = h?.trim().toUpperCase() || "";
        return terms.some(
          (fk) =>
            norm === fk.toUpperCase() ||
            norm.replace(/[^A-Z0-9]/g, "") ===
              fk.replace(/[^A-Z0-9]/g, "").toUpperCase(),
        );
      });
      if (rIdx === -1) {
        rIdx = hHeaders.length;
        await updateSheetData(`${sheetToUpdate}!${colIndexToLetter(rIdx)}1`, [
          ["Read"],
        ]);
      }

      await updateSheetData(
        `${sheetToUpdate}!${colIndexToLetter(rIdx)}${selectedOrder.rowIndex}`,
        [["TRUE"]],
      );

      setSelectedOrder({ ...selectedOrder, read: "TRUE" });
      const newOrders = orders.map((o) =>
        o.id === selectedOrder.id ? { ...o, read: "TRUE" } : o,
      );
      setOrders(newOrders);
    } catch (err: any) {
      alert("Gagal mengupdate status: " + err?.message);
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleSubmitReceive = async () => {
    if (!receiveItem || !receiveItem.rowIndex) return;
    setIsSubmittingReceive(true);
    try {
      let photoUrl = "";
      if (receivePhotoBlob) {
        const file = new File([receivePhotoBlob], `terima_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const res = await DriveService.uploadFile(file);
        photoUrl = res.url || "";
      }

      const detRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Detail_Pesanan!A1:Z1",
      ).catch(() => null);

      if (detRes?.values?.length > 0) {
        const headers = detRes.values[0] as string[];
        const statusKirimIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "status_kirim" ||
            h?.trim().toLowerCase() === "status_kiriman",
        );
        const penerimaIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "penerima",
        );
        const timestampIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "timestamp",
        );
        const keteranganIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "keterangan",
        );
        const photoIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "photo",
        );

        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });
        const timeStr = now
          .toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase();
        const timestampStr = `${dateStr}, ${timeStr}`;

        if (statusKirimIdx > -1) {
          const colLetter = getColLetter(statusKirimIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${receiveItem.rowIndex}`,
            [["Di Terima"]],
          );
          receiveItem.statusKirim = "Di Terima";
          setBoganathaDetailsMap(new Map(boganathaDetailsMap));
        }
        if (penerimaIdx > -1) {
          const colLetter = getColLetter(penerimaIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${receiveItem.rowIndex}`,
            [[decodedEmail]],
          );
        }
        if (timestampIdx > -1) {
          const colLetter = getColLetter(timestampIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${receiveItem.rowIndex}`,
            [[timestampStr]],
          );
        }
        if (keteranganIdx > -1) {
          const colLetter = getColLetter(keteranganIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${receiveItem.rowIndex}`,
            [[receiveKeterangan]],
          );
        }
        if (photoIdx > -1 && photoUrl) {
          const colLetter = getColLetter(photoIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${receiveItem.rowIndex}`,
            [[photoUrl]],
          );
        }
      }

      setReceiveItem(null);
      setReceiveKeterangan("");
      setReceivePhotoBlob(null);
      setReceivePhotoPreview(null);
    } catch (err: any) {
      console.error(err);
      alert("Gagal memproses penerimaan: " + err.message);
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  const handleUpdateItemStatusBoganatha = async (item: any, newStatus: string) => {
    if (!item || !item.rowIndex) return;
    const colIdx = item.statusPesananColIdx ?? 10;
    const colLetter = getColLetter(colIdx);
    const range = `Detail_Pesanan!${colLetter}${item.rowIndex}`;

    try {
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[newStatus]],
      );
    } catch (err) {
      console.error("Failed to update status_pesanan in Detail_Pesanan:", err);
    }

    if (selectedBoganathaOrder) {
      const list = boganathaDetailsMap.get(selectedBoganathaOrder.idPesanan) || [];
      const updatedList = list.map((it: any) => {
        if (it.rowIndex === item.rowIndex || (it.prodId && it.prodId === item.prodId)) {
          return { ...it, statusPesanan: newStatus, statusPesananColIdx: colIdx };
        }
        return it;
      });
      const newMap = new Map(boganathaDetailsMap);
      newMap.set(selectedBoganathaOrder.idPesanan, updatedList);
      setBoganathaDetailsMap(newMap);
    }
  };

  const handleCancelDeleteProductItemBoganatha = async (item: any) => {
    if (!item || !selectedBoganathaOrder) return;
    try {
      setIsUpdatingTx(true);
      const spreadsheetId = "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk";
      const res = await getSheetDataFromId(spreadsheetId, "Detail_Pesanan!A1:Z5000");
      let deletedRowIndex = -1;
      if (res && res.values && res.values.length > 0) {
        const headers = res.values[0] as string[];
        const idDetailIdx = headers.findIndex(h => h?.trim().toLowerCase() === "id_detail");
        const orderIdIdx = headers.findIndex(h => h?.trim().toLowerCase() === "id_pesanan");
        const prodIdIdx = headers.findIndex(h => h?.trim().toLowerCase() === "id_produk");

        let targetRowIndex = -1;
        
        if (idDetailIdx > -1 && item.idDetail) {
          targetRowIndex = res.values.findIndex(
            (row, idx) => idx > 0 && row[idDetailIdx]?.trim() === item.idDetail?.trim()
          );
        }

        if (targetRowIndex === -1) {
          const currentOrderId = selectedBoganathaOrder?.idPesanan;
          if (currentOrderId && prodIdIdx > -1) {
            targetRowIndex = res.values.findIndex(
              (row, idx) => idx > 0 && 
                row[orderIdIdx]?.trim() === currentOrderId && 
                row[prodIdIdx]?.trim() === item.prodId
            );
          }
        }

        if (targetRowIndex === -1 && item.rowIndex) {
          targetRowIndex = item.rowIndex - 1;
        }

        if (targetRowIndex > 0 && targetRowIndex < res.values.length) {
          deletedRowIndex = targetRowIndex + 1;
          const updatedValues = [...res.values];
          updatedValues.splice(targetRowIndex, 1);

          const emptyRow = Array(Math.max(headers.length, 26)).fill("");
          updatedValues.push(emptyRow);

          const totalRowsToWrite = updatedValues.length;
          const rangeToWrite = `Detail_Pesanan!A1:Z${totalRowsToWrite}`;
          await updateSheetDataFromId(spreadsheetId, rangeToWrite, updatedValues);
        }
      }

      const list = boganathaDetailsMap.get(selectedBoganathaOrder.idPesanan) || [];
      const updatedList = list.filter((it: any) => {
        if (item.idDetail && it.idDetail) {
          return it.idDetail !== item.idDetail;
        }
        return it.prodId !== item.prodId;
      }).map((it: any) => {
        if (deletedRowIndex > 0 && it.rowIndex && it.rowIndex > deletedRowIndex) {
          return { ...it, rowIndex: it.rowIndex - 1 };
        }
        return it;
      });

      const newMap = new Map(boganathaDetailsMap);
      newMap.set(selectedBoganathaOrder.idPesanan, updatedList);
      setBoganathaDetailsMap(newMap);

      const newSubtotal = updatedList.reduce(
        (acc: number, it: any) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)),
        0
      );
      const ongkir = Number(selectedBoganathaOrder.ongkir) || 0;
      const diskon = Number(selectedBoganathaOrder.diskon) || 0;
      const voucher = Number(selectedBoganathaOrder.voucher) || 0;
      const poin = Number(selectedBoganathaOrder.poin) || 0;
      const finalTotal = Math.max(0, newSubtotal + ongkir - diskon - voucher - poin);

      const updatedOrder = {
        ...selectedBoganathaOrder,
        subtotal: newSubtotal,
        total: finalTotal,
      };
      setSelectedBoganathaOrder(updatedOrder);
      setBoganathaOrders((prev) =>
        prev.map((o) => (o.idPesanan === updatedOrder.idPesanan ? updatedOrder : o)),
      );

      const pesananRes = await getSheetDataFromId(
        spreadsheetId,
        "Pesanan!A1:Z2000",
      ).catch(() => null);

      if (pesananRes?.values?.length > 0) {
        const headers = pesananRes.values[0] as string[];
        const getIdx = (names: string[]) =>
          headers.findIndex((h) =>
            names.includes(
              (h || "")
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, ""),
            ),
          );
        const idIdx = getIdx(["IDPESANAN", "ORDERID"]);
        const totalHargaIdx = getIdx(["TOTALHARGA", "TOTAL_HARGA"]);
        const totalBayarIdx = getIdx(["TOTALBAYAR", "TOTAL_BAYAR", "TOTAL"]);

        if (idIdx > -1) {
          const currentOrderId = selectedBoganathaOrder.idPesanan;
          const pesRowIndex = pesananRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === currentOrderId,
          );
          if (pesRowIndex > -1) {
            const actualRowIndex = pesRowIndex + 1;
            if (totalHargaIdx > -1) {
              const colL = getColLetter(totalHargaIdx);
              await updateSheetDataFromId(
                spreadsheetId,
                `Pesanan!${colL}${actualRowIndex}`,
                [[newSubtotal]],
              );
            }
            if (totalBayarIdx > -1) {
              const colL = getColLetter(totalBayarIdx);
              await updateSheetDataFromId(
                spreadsheetId,
                `Pesanan!${colL}${actualRowIndex}`,
                [[finalTotal]],
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete and shift row in Detail_Pesanan for Boganatha order:", err);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSaveAddProductsBoganatha = async (draftItems: DraftProductItem[]) => {
    if (!selectedBoganathaOrder || draftItems.length === 0) return;
    const orderId = selectedBoganathaOrder.idPesanan;

    const detFullRes = await getSheetDataFromId(
      "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
      "Detail_Pesanan!A1:Z5000"
    ).catch(() => null);

    const allRows = detFullRes?.values || [];
    const headers = (allRows[0] as string[]) || [
      "id_detail",
      "id_pesanan",
      "id_produk",
      "jumlah",
      "harga_beli",
      "Vendor",
      "%jual",
      "harga_satuan",
      "Ongkir",
      "subtotal",
      "status_pesanan",
      "Status_kirim",
      "Penerima",
      "Timestamp",
      "Photo",
      "Keterangan",
      "Margin Profit",
    ];

    // Temukan baris terakhir yang memiliki data pada tabel Detail_Pesanan
    let lastDataRow = 1;
    for (let r = allRows.length - 1; r >= 0; r--) {
      const row = allRows[r];
      if (
        row &&
        row.some(
          (cell: any) =>
            cell !== undefined &&
            cell !== null &&
            String(cell).trim() !== ""
        )
      ) {
        lastDataRow = r + 1;
        break;
      }
    }

    const startRow = lastDataRow + 1;

    const findCol = (candidates: string[], defaultIdx: number) => {
      const idx = headers.findIndex((h) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return candidates.some((c) => norm === c.toLowerCase().replace(/[\s._-]+/g, ""));
      });
      return idx > -1 ? idx : defaultIdx;
    };

    const idDetailIdx = findCol(["id_detail", "iddetail", "id_det"], 0);
    const idPesananIdx = findCol(["id_pesanan", "idpesanan", "order_id"], 1);
    const idProdukIdx = findCol(["id_produk", "idproduk", "product_id"], 2);
    const jumlahIdx = findCol(["jumlah", "qty", "quantity"], 3);
    const hargaBeliIdx = findCol(["harga_beli", "hargabeli", "modal", "beli"], 4);
    const vendorIdx = findCol(["vendor", "pemasok", "suplier", "supplier"], 5);
    const persenJualIdx = findCol(["%jual", "persen_jual", "persenjual", "margin"], 6);
    const hargaSatuanIdx = findCol(["harga_satuan", "hargasatuan", "price", "harga"], 7);
    const ongkirIdx = findCol(["ongkir", "ongkos_kirim", "ongkoskirim"], 8);
    const subtotalIdx = findCol(["subtotal", "total_harga", "total"], 9);
    const statusPesananIdx = findCol(["status_pesanan", "statuspesanan", "statusitem", "statusdetail", "status"], 10);
    const statusKirimIdx = findCol(["status_kirim", "statuskirim", "kirim"], 11);
    const penerimaIdx = findCol(["penerima", "recipient", "receiver"], 12);
    const timestampIdx = findCol(["timestamp", "waktu", "tanggal", "created_at"], 13);
    const photoIdx = findCol(["photo", "foto", "image", "gambar"], 14);
    const keteranganIdx = findCol(["keterangan", "notes", "catatan", "ket"], 15);
    const marginProfitIdx = findCol(["margin profit", "marginprofit", "profit"], 16);

    const numCols = Math.max(17, headers.length);
    const rowsToAppend: any[][] = [];
    const nowIso = new Date().toISOString();
    const currentList = [...(boganathaDetailsMap.get(orderId) || [])];

    for (let i = 0; i < draftItems.length; i++) {
      const item = draftItems[i];
      const itemRowIndex = startRow + i;
      const dtlId = `DTL${Date.now().toString().slice(-6)}${i}`;
      const singleRow = Array(numCols).fill("");

      singleRow[idDetailIdx] = dtlId;
      singleRow[idPesananIdx] = orderId;
      singleRow[idProdukIdx] = item.id;
      singleRow[jumlahIdx] = item.qty;
      singleRow[hargaBeliIdx] = "";
      singleRow[vendorIdx] = "";
      singleRow[persenJualIdx] = "";
      singleRow[hargaSatuanIdx] = item.price;
      singleRow[ongkirIdx] = "";
      singleRow[subtotalIdx] = item.qty * item.price;
      singleRow[statusPesananIdx] = "";
      singleRow[statusKirimIdx] = "";
      singleRow[penerimaIdx] = "";
      singleRow[timestampIdx] = "";
      singleRow[photoIdx] = "";
      singleRow[keteranganIdx] = "";
      singleRow[marginProfitIdx] = "";

      rowsToAppend.push(singleRow);

      currentList.push({
        rowIndex: itemRowIndex,
        idDetail: dtlId,
        prodId: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        subtotal: item.qty * item.price,
        statusPesanan: "",
        statusPesananColIdx: statusPesananIdx,
        image: "",
      });
    }

    if (rowsToAppend.length > 0) {
      const endColLetter = getColLetter(numCols - 1);
      const endRow = startRow + rowsToAppend.length - 1;
      const targetRange = `Detail_Pesanan!A${startRow}:${endColLetter}${endRow}`;

      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        targetRange,
        rowsToAppend,
      );
    }

    const newMap = new Map(boganathaDetailsMap);
    newMap.set(orderId, currentList);
    setBoganathaDetailsMap(newMap);

    const newSubtotal = currentList.reduce(
      (acc: number, it: any) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)),
      0
    );
    const ongkir = Number(selectedBoganathaOrder.ongkir) || 0;
    const diskon = Number(selectedBoganathaOrder.diskon) || 0;
    const voucher = Number(selectedBoganathaOrder.voucher) || 0;
    const poin = Number(selectedBoganathaOrder.poin) || 0;
    const finalTotal = Math.max(0, newSubtotal + ongkir - diskon - voucher - poin);

    const updatedOrder = {
      ...selectedBoganathaOrder,
      subtotal: newSubtotal,
      total: finalTotal,
    };

    try {
      const pesananRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Pesanan!A1:Z2000",
      ).catch(() => null);

      if (pesananRes?.values?.length > 0) {
        const headers = pesananRes.values[0] as string[];
        const getIdx = (names: string[]) =>
          headers.findIndex((h) =>
            names.includes(
              (h || "")
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, ""),
            ),
          );
        const idIdx = getIdx(["IDPESANAN", "ORDERID"]);
        const totalHargaIdx = getIdx(["TOTALHARGA", "TOTAL_HARGA"]);
        const totalBayarIdx = getIdx(["TOTALBAYAR", "TOTAL_BAYAR", "TOTAL"]);

        if (idIdx > -1) {
          const currentOrderId = selectedBoganathaOrder.idPesanan;
          const pesRowIndex = pesananRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === currentOrderId,
          );
          if (pesRowIndex > -1) {
            const actualRowIndex = pesRowIndex + 1;
            if (totalHargaIdx > -1) {
              const colL = getColLetter(totalHargaIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colL}${actualRowIndex}`,
                [[newSubtotal]],
              );
            }
            if (totalBayarIdx > -1) {
              const colL = getColLetter(totalBayarIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colL}${actualRowIndex}`,
                [[finalTotal]],
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to update Pesanan totals on add products:", err);
    }

    setSelectedBoganathaOrder(updatedOrder);
    setBoganathaOrders((prev) =>
      prev.map((o) => (o.idPesanan === updatedOrder.idPesanan ? updatedOrder : o)),
    );
  };

  const handleSetToSendBoganatha = async () => {
    if (!selectedBoganathaOrder || selectedBoganathaOrder.statusIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const isReview = selectedBoganathaOrder.status?.toUpperCase() === "REVIEW";
      const targetStatus = isReview ? "REVIEW" : "SEND";
      const colLetter = getColLetter(selectedBoganathaOrder.statusIdx);
      const range = `Pesanan!${colLetter}${selectedBoganathaOrder.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[targetStatus]],
      );

      const updatedTx = { ...selectedBoganathaOrder, status: targetStatus };
      setSelectedBoganathaOrder(updatedTx);
      setBoganathaOrders((prev) =>
        prev.map((tx) =>
          tx.idPesanan === updatedTx.idPesanan ? updatedTx : tx,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Gagal merubah status pesanan: " + (e as Error).message);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetToProcessBoganatha = async () => {
    if (!selectedBoganathaOrder || selectedBoganathaOrder.statusIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedBoganathaOrder.statusIdx);
      const range = `Pesanan!${colLetter}${selectedBoganathaOrder.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["PROCESS"]],
      );

      // Update local state
      const updatedTx = { ...selectedBoganathaOrder, status: "PROCESS" };
      setSelectedBoganathaOrder(updatedTx);
      setBoganathaOrders((prev) =>
        prev.map((tx) =>
          tx.idPesanan === updatedTx.idPesanan ? updatedTx : tx,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Gagal memproses pesanan: " + (e as Error).message);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetToDoneBoganatha = async () => {
    if (!selectedBoganathaOrder || selectedBoganathaOrder.statusIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedBoganathaOrder.statusIdx);
      const range = `Pesanan!${colLetter}${selectedBoganathaOrder.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["DONE"]],
      );

      // Update local state
      const updatedTx = { ...selectedBoganathaOrder, status: "DONE" };
      setSelectedBoganathaOrder(updatedTx);
      setBoganathaOrders((prev) =>
        prev.map((tx) =>
          tx.idPesanan === updatedTx.idPesanan ? updatedTx : tx,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Gagal menyelesaikan pesanan: " + (e as Error).message);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetPaidBoganatha = async () => {
    if (
      !selectedBoganathaOrder ||
      selectedBoganathaOrder.statusPaidColIdx == null
    )
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedBoganathaOrder.statusPaidColIdx);
      const range = `Pesanan!${colLetter}${selectedBoganathaOrder.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["PAID"]],
      );

      // Update local state
      const updatedTx = { ...selectedBoganathaOrder, statusPaid: "PAID" };
      setSelectedBoganathaOrder(updatedTx);
      setBoganathaOrders((prev) =>
        prev.map((tx) =>
          tx.idPesanan === updatedTx.idPesanan ? updatedTx : tx,
        ),
      );
    } catch (e) {
      console.error(e);
      alert("Gagal set paid pesanan: " + (e as Error).message);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="pb-24 bg-gray-50 min-h-screen relative">
        <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isProfile && (
              <button
                onClick={() => navigate(-1)}
                className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight">
              {isProfile ? "My Profile" : "User Detail"}
            </h1>
          </div>
        </header>
        <div className="p-10 text-center text-gray-500">User not found</div>
      </div>
    );
  }

  const unitRef = unitMap.get(userData.unitId);
  const unitName = unitRef?.name || userData.unitId || "-";
  const unitLogo = unitRef?.logo || "";
  const stars = getStars(userData.performance);
  const duration = calculateDuration(userData.joinDate);

  const doneTasksCount = tasks.filter((t) =>
    t.status.toLowerCase().includes("done"),
  ).length;

  // Pie chart data
  const pieData =
    tasks.length > 0
      ? [
          { name: "Done", value: doneTasksCount, color: "#10b981" },
          {
            name: "Todo",
            value: tasks.length - doneTasksCount,
            color: "#e2e8f0",
          },
        ]
      : [{ name: "No Tasks", value: 1, color: "#e2e8f0" }];

  return (
    <div className="pb-8 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isProfile && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">
            {isProfile ? "My Profile" : "User Detail"}
          </h1>
        </div>
        {isProfile && (
          <button
            onClick={async () => {
              try {
                if ('caches' in window) {
                  const names = await caches.keys();
                  await Promise.all(names.map(name => caches.delete(name)));
                }
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (let registration of registrations) {
                    await registration.unregister();
                  }
                }
                // Clear local storage except email
                const userEmail = localStorage.getItem('mtask_user_email');
                localStorage.clear();
                sessionStorage.clear();
                if (userEmail) localStorage.setItem('mtask_user_email', userEmail);
                
                // Fetch the root HTML to invalidate browser HTTP cache
                await fetch('/', { cache: 'reload', mode: 'no-cors' }).catch(() => null);
                
                // Hard reload
                // @ts-ignore
                if (window.location.reload.length) {
                  // @ts-ignore
                  window.location.reload(true);
                } else {
                  window.location.href = window.location.pathname + '?refresh=' + new Date().getTime();
                }
              } catch (e) {
                console.error(e);
                window.location.href = window.location.pathname + '?refresh=' + new Date().getTime();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-full cursor-pointer text-xs font-bold shadow-sm"
            title="Clear Cache & Reload"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>Clear Cache</span>
          </button>
        )}
      </header>
      <div className="px-4 space-y-4 max-w-md mx-auto">
        {/* Card 1: Main Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
          {isProfile && (
            <div className="absolute top-4 right-4 z-10 flex items-center">
              <button
                onClick={handleToggleSilhouette}
                disabled={isToggleLoading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!showSilhouette ? "bg-emerald-500" : "bg-rose-500"} ${isToggleLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Toggle Silhouette Avatar"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${!showSilhouette ? "translate-x-5" : "translate-x-0"}`}
                >
                  {isToggleLoading && (
                    <Loader2 className="w-2.5 h-2.5 text-blue-500 animate-spin" />
                  )}
                </span>
              </button>
            </div>
          )}

          <div className="flex flex-col items-center mb-6 pt-2">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={`star-${i}`}
                  className={`w-5 h-5 ${i < stars ? "fill-yellow-400 text-yellow-500 drop-shadow-sm" : "text-gray-200"}`}
                />
              ))}
            </div>

            <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg overflow-hidden mb-4 relative flex items-center justify-center">
              {showSilhouette ? (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              ) : (
                <img
                  src={formatImageUrl(userData.photo) || undefined}
                  alt={userData.name}
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=eff6ff&color=3b82f6`;
                  }}
                />
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-900 leading-tight text-center">
              {userData.name}
            </h2>
            <p className="text-sm text-gray-500 font-medium text-center">
              {userData.fullName}
            </p>
          </div>

          <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 font-medium whitespace-nowrap">
                KTA ID
              </span>
              <span className="font-semibold text-gray-900 truncate">
                {userData.ktaId}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-gray-500 font-medium whitespace-nowrap">
                Unit Business
              </span>
              <div className="flex items-center gap-2 max-w-[60%] justify-end">
                {unitLogo && (
                  <img
                    src={unitLogo || undefined}
                    alt={unitName}
                    className="w-5 h-5 rounded-full object-cover shadow-sm bg-white border border-gray-100 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(unitName)}&background=eff6ff&color=3b82f6`;
                    }}
                  />
                )}
                <span className="font-semibold text-gray-900 truncate text-right">
                  {unitName}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm gap-4 pt-1">
              <span className="text-gray-500 font-medium whitespace-nowrap">
                Email
              </span>
              <a
                href={`mailto:${userData.email}`}
                className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate"
              >
                <span className="truncate">{userData.email}</span>
                <Mail className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
            <div className="flex justify-between items-center text-sm gap-4 pt-1">
              <span className="text-gray-500 font-medium whitespace-nowrap">
                Phone
              </span>
              <a
                href={`https://wa.me/${userData.phone ? userData.phone.replace(/[^0-9]/g, "").replace(/^0/, "62") : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 hover:underline truncate"
              >
                <span className="truncate">{userData.phone}</span>
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Card 2: Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div
            className={`flex items-start gap-3 ${userData.mapUrl ? "cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-xl transition-colors" : ""}`}
            onClick={() => {
              if (userData.mapUrl) setShowMapPopup(true);
            }}
          >
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Alamat</p>
              <p
                className={`text-sm font-semibold leading-snug ${userData.mapUrl ? "text-blue-600 underline decoration-blue-200 underline-offset-2" : "text-gray-900"}`}
              >
                {userData.alamat}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex justify-between items-center pr-2">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">
                  Join Date
                </p>
                <p className="text-sm font-semibold text-gray-900 leading-snug">
                  {userData.joinDate}
                </p>
              </div>
              <div className="text-right flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Overviews */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Project Overview */}
          <div className="border-b border-gray-100">
            <div
              onClick={() => setShowProjects(!showProjects)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm text-gray-900">
                  Project Overview
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">
                  {projects.length}
                </span>
              </div>
              {showProjects ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <AnimatePresence>
              {showProjects && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-2">
                    {projects.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        No projects
                      </p>
                    )}
                    {projects.map((p, idx) => (
                      <div
                        key={`${p.id}-${idx}`}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-sm hover:shadow active:scale-[0.99]"
                      >
                        <span className="font-medium text-gray-800 truncate pr-3">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-700 shrink-0">
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Task Overview */}
          <div className="border-b border-gray-100">
            <div
              onClick={() => setShowTasks(!showTasks)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-sm text-gray-900">
                  Task Overview
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">
                  {doneTasksCount}/{tasks.length} Done
                </span>
              </div>
              {showTasks ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <AnimatePresence>
              {showTasks && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 space-y-2">
                    {tasks.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        No tasks
                      </p>
                    )}
                    {tasks.map((t, idx) => {
                      const isDone = t.status.toLowerCase().includes("done");
                      const dueInfo = getDueDaysLeft(t.dueDate);
                      return (
                        <div
                          key={`${t.id}-${idx}`}
                          onClick={() => navigate(`/tasks/${t.id}`)}
                          className="flex flex-col text-sm p-3 bg-gray-50 rounded-xl border border-gray-100 gap-1.5 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-colors shadow-sm hover:shadow active:scale-[0.99]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                              )}
                              <span
                                className={`font-semibold truncate ${isDone ? "text-gray-500 line-through" : "text-gray-800"}`}
                              >
                                {t.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700 shrink-0 uppercase">
                              {t.status}
                            </span>
                          </div>
                          {t.dueDate && t.dueDate !== "-" && (
                            <div className="mt-1 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">
                                  {formatDateMMDDYY(t.dueDate)}
                                </span>
                              </div>
                              <div
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dueInfo.isOverdue ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}
                              >
                                {dueInfo.days} {dueInfo.label}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Budget Overview */}
          <div>
            <div
              onClick={() => setShowOrders(!showOrders)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-sm text-gray-900">
                  Order Budget Overview
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">
                  {
                    orders.filter(
                      (o) =>
                        (o.read || "").toString().trim().toUpperCase() !==
                        "TRUE",
                    ).length
                  }
                </span>
              </div>
              {showOrders ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <AnimatePresence>
              {showOrders && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 pt-0 space-y-2 border-t border-gray-50 mt-1">
                    {orders.filter(
                      (o) =>
                        (o.read || "").toString().trim().toUpperCase() !==
                        "TRUE",
                    ).length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        No orders
                      </p>
                    )}
                    {orders
                      .filter(
                        (o) =>
                          (o.read || "").toString().trim().toUpperCase() !==
                          "TRUE",
                      )
                      .map((o, idx) => (
                        <div
                          key={`${o.id}-${idx}`}
                          className="text-sm p-3 bg-white shadow-sm rounded-xl border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-700 text-xs">
                              RO: {o.ro}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-md shrink-0 uppercase">
                              {o.status}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-1">
                            {o.detail}
                          </p>
                          <p className="font-bold text-blue-600">
                            {formatIDR(o.amount)}
                          </p>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Boganatha Pesanan Overview */}
          <div className="border-t border-gray-100">
            <div
              onClick={() => setShowBoganathaOrders(!showBoganathaOrders)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-sm text-gray-900">
                  Pesanan Belanja
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md ml-1">
                  {boganathaOrders.length}
                </span>
              </div>
              {showBoganathaOrders ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <AnimatePresence>
              {showBoganathaOrders && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden bg-white"
                >
                  <div className="p-4 pt-0 space-y-2 border-t border-gray-50 mt-1">
                    {boganathaOrders.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        Tidak ada pesanan
                      </p>
                    )}
                    {boganathaOrders.map((o, idx) => (
                      <div
                        key={`${o.idPesanan}-${idx}`}
                        onClick={() => setSelectedBoganathaOrder(o)}
                        className="text-sm p-3 bg-white shadow-sm rounded-xl border border-gray-100 hover:border-teal-500 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-gray-700 text-xs">
                            ID: {o.idPesanan}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 border rounded-md shrink-0 uppercase",
                              o.status === "Send"
                                ? "bg-blue-50 text-blue-700 border-blue-100"
                                : o.status === "Review"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                  : o.status === "Delivered"
                                    ? "bg-purple-50 text-purple-700 border-purple-100"
                                    : o.status === "Done"
                                      ? "bg-green-50 text-green-700 border-green-100"
                                      : "bg-gray-50 text-gray-700 border-gray-100",
                            )}
                          >
                            {o.status}
                          </span>
                        </div>
                        <p className="font-medium text-gray-500 text-xs mb-1">
                          {o.tanggal}
                        </p>
                        <p className="font-bold text-teal-600">
                          {formatIDR(o.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Card 4: Daftar Tagihan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Daftar Tagihan
            </h3>
          </div>
          <div className="bg-gray-50 text-center p-6 rounded-xl border border-gray-100 border-dashed">
            <p className="text-sm text-gray-400 italic">Tidak ada tagihan</p>
          </div>
        </div>

        {/* Card 5: Index Performance & Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-violet-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Index Performance
            </h3>
          </div>

          <div className="mt-6 flex flex-col items-center pb-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Task Completion
            </h4>

            {tasks.length > 0 ? (
              <div className="w-full h-[180px] relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow:
                          "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{
                        color: "#111827",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-gray-900 leading-none">
                    {Math.round((doneTasksCount / tasks.length) * 100)}%
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                    Done
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100 border-dashed mt-2">
                <p className="text-sm text-gray-400 italic">Belum ada task</p>
              </div>
            )}

            {/* Legend */}
            {tasks.length > 0 && (
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5"></div>
                  <span className="text-xs font-medium text-gray-600">
                    Done ({doneTasksCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-200 mt-0.5"></div>
                  <span className="text-xs font-medium text-gray-600">
                    Todo ({tasks.length - doneTasksCount})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 6: Daftar Reward */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Daftar Reward
            </h3>
          </div>
          <div className="bg-amber-50/50 text-center p-6 rounded-xl border border-amber-100 border-dashed">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 relative overflow-hidden">
              <Award className="w-5 h-5 text-amber-500 z-10" />
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/40 to-transparent"></div>
            </div>
            <p className="text-sm text-amber-700/60 font-medium">
              Belum ada reward
            </p>
          </div>
        </div>
      </div>
      {/* Map Popup Modal */}
      <AnimatePresence>
        {showMapPopup && userData?.mapUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMapPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-white z-10">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  Lokasi Address
                </h3>
                <button
                  onClick={() => setShowMapPopup(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="w-full h-[60vh] sm:h-[400px] bg-gray-100 flex items-center justify-center relative">
                {(() => {
                  let url = userData.mapUrl || "";
                  const srcMatch = url.match(/src="([^"]+)"/);
                  if (srcMatch && srcMatch[1]) {
                    url = srcMatch[1];
                  } else if (url && !url.startsWith("http")) {
                    url = `https://maps.google.com/maps?q=${encodeURIComponent(url)}&z=15&output=embed`;
                  }

                  return (
                    <iframe
                      src={url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 w-full h-full"
                    />
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full sm:max-w-xl bg-gray-50 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 shrink-0 sticky top-0 z-10">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Detail Order Budget
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 font-sans relative">
                {/* Card 1 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md uppercase tracking-wider">
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase">
                        RO Number
                      </p>
                      <p className="font-semibold text-gray-900">
                        {selectedOrder.ro}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-0.5 font-medium">
                      Date
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatDateToMMDDYYYY(selectedOrder.date)}
                    </p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-0.5 font-medium">
                      Order Detail
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {selectedOrder.detail}
                    </p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-0.5 font-medium">
                      Amount
                    </p>
                    <p className="text-lg font-bold text-blue-600 tracking-tight">
                      {formatIDR(selectedOrder.amount)}
                    </p>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1 font-medium">
                      Unit Business
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const unit = unitMap.get(selectedOrder.unitBusiness);
                        return (
                          <>
                            <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                              {unit?.logo ? (
                                <img
                                  src={unit.logo}
                                  alt="unit"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                            <span className="font-medium text-sm text-gray-900">
                              {unit?.name || selectedOrder.unitBusiness || "-"}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {((selectedOrder.projectId &&
                    selectedOrder.projectId !== "-") ||
                    (selectedOrder.taskId && selectedOrder.taskId !== "-")) && (
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      {selectedOrder.projectId &&
                        selectedOrder.projectId !== "-" && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 text-xs shadow-sm bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                              Project :{" "}
                              {projectMap.get(selectedOrder.projectId) ||
                                selectedOrder.projectId}
                            </span>
                          </div>
                        )}
                      {selectedOrder.taskId && selectedOrder.taskId !== "-" && (
                        <div
                          className={`flex items-center gap-2 ${selectedOrder.projectId && selectedOrder.projectId !== "-" ? "mt-2" : ""}`}
                        >
                          <span className="font-semibold text-gray-700 text-xs shadow-sm bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                            Task :{" "}
                            {taskMap.get(selectedOrder.taskId) ||
                              selectedOrder.taskId}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card 2 Pembayaran */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Informasi Pembayaran
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="font-semibold">Pembayaran</span>{" "}
                    {selectedOrder.contactId} ({selectedOrder.orderType}){" "}
                    <span className="font-semibold">via</span>{" "}
                    {selectedOrder.via} {selectedOrder.viaNama}{" "}
                    {selectedOrder.rekNo}{" "}
                    <span className="font-semibold">an.</span>{" "}
                    {selectedOrder.an}
                  </p>
                </div>

                {/* Nota Belanja Card */}
                {(selectedOrder.nota || selectedOrder.orderType === "Reimburse" || selectedOrder.orderType === "Operational") && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">
                      Nota Belanja
                    </h3>
                    <NotaMediaViewer url={selectedOrder.nota} />
                  </div>
                )}

                {/* Card 3 Approval */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Status Persetujuan
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        u: "Admin",
                        s: selectedOrder.t1r,
                        d: selectedOrder.dt1,
                      },
                      {
                        u: "Board",
                        s: selectedOrder.t2r,
                        d: selectedOrder.dt2,
                      },
                      { u: "Boss", s: selectedOrder.t3r, d: selectedOrder.dt3 },
                    ]
                      .filter((t, i) => {
                        if (i === 1)
                          return selectedOrder.t1r
                            ?.toUpperCase()
                            .includes("APPROVE");
                        if (i === 2)
                          return selectedOrder.t2r
                            ?.toUpperCase()
                            .includes("APPROVE");
                        return true;
                      })
                      .map((tier, i) => {
                        return (
                          <div
                            key={`tier-${i}`}
                            className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 font-medium"
                          >
                            {tier.u} {tier.s || "PENDING"} @{" "}
                            {formatDateToMMDDYYYY(tier.d)}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Card 4 Bukti Transfer */}
                {selectedOrder.bukti && selectedOrder.bukti !== "-" && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">
                      Bukti Transfer
                    </h3>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-2 overflow-hidden flex items-center justify-center min-h-[150px]">
                      {selectedOrder.bukti.match(/\.(jpeg|jpg|gif|png)$/i) ||
                      selectedOrder.bukti.includes("drive.google.com") ? (
                        <img
                          src={selectedOrder.bukti}
                          alt="Bukti Transfer"
                          className="w-full h-auto object-contain max-h-[300px] rounded-lg"
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
                        />
                      ) : (
                        <a
                          href={selectedOrder.bukti}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-medium text-sm flex items-center gap-2 hover:underline"
                        >
                          <FileIcon className="w-4 h-4" /> Lihat Bukti
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Card 5 Catatan */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    Catatan
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[100px] shadow-inner mb-4">
                    {parseCatatan(selectedOrder.catatan).length > 0 ? (
                      <div className="space-y-3">
                        {parseCatatan(selectedOrder.catatan).map((c, i) => (
                          <div
                            key={`catatan-${i}`}
                            className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                          >
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                              {c.sender}
                            </p>
                            <p className="text-sm text-gray-800">{c.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic text-center py-4">
                        Belum ada catatan
                      </p>
                    )}
                  </div>
                  {selectedOrder.status === "DISBURSED" && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      {selectedOrder.read === "TRUE" ? (
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-75 bg-gray-100 text-gray-500 border border-gray-200"
                        >
                          sudah di terima
                        </button>
                      ) : (
                        <button
                          onClick={handleAcceptOrder}
                          disabled={isUpdatingOrder}
                          className="w-full py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-75 bg-[#f68b1f] hover:bg-[#e07a16] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center"
                        >
                          {isUpdatingOrder ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                              Menyimpan...
                            </>
                          ) : (
                            "Terima"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Boganatha Order Detail Modal */}
      <AnimatePresence>
        {selectedBoganathaOrder && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    Detail Pesanan
                  </h2>
                  <p className="text-xs font-medium text-gray-500">
                    ID: {selectedBoganathaOrder.idPesanan}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBoganathaOrder(null)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-gray-50/50">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-1 border rounded-md uppercase",
                          selectedBoganathaOrder.status === "Send"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : selectedBoganathaOrder.status === "Review"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                              : selectedBoganathaOrder.status === "Delivered"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : selectedBoganathaOrder.status === "Done"
                                  ? "bg-green-50 text-green-700 border-green-100"
                                  : "bg-gray-50 text-gray-700 border-gray-100",
                        )}
                      >
                        {selectedBoganathaOrder.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">
                        Tanggal Pesanan
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedBoganathaOrder.tanggal}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Informasi Pengiriman
                    </p>
                    {selectedBoganathaOrder.unit ? (
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const unit = unitMap.get(selectedBoganathaOrder.unit);
                          return (
                            <>
                              <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                {unit?.logo ? (
                                  <img
                                    src={unit.logo}
                                    alt="unit"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Building2 className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                              <span className="font-medium text-sm text-gray-900">
                                {unit?.name || selectedBoganathaOrder.unit}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">
                        {selectedBoganathaOrder.alamat || "-"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Rincian Pembayaran
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal Produk</span>
                      <span className="font-semibold text-gray-800">
                        {formatIDR(selectedBoganathaOrder.subtotal)}
                      </span>
                    </div>
                    {selectedBoganathaOrder.ongkir > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Ongkos Kirim</span>
                        <span className="font-semibold text-gray-800">
                          {formatIDR(selectedBoganathaOrder.ongkir)}
                        </span>
                      </div>
                    )}
                    {selectedBoganathaOrder.diskon > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">Diskon</span>
                        <span className="font-semibold">
                          - {formatIDR(selectedBoganathaOrder.diskon)}
                        </span>
                      </div>
                    )}
                    {selectedBoganathaOrder.voucher > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">Voucher</span>
                        <span className="font-semibold">
                          - {formatIDR(selectedBoganathaOrder.voucher)}
                        </span>
                      </div>
                    )}
                    {selectedBoganathaOrder.poin > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Poin Digunakan</span>
                        <span className="font-semibold text-gray-800">
                          - {formatIDR(selectedBoganathaOrder.poin)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-end mt-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-500">
                          Total Tagihan
                        </span>
                      </div>
                      <span className="text-xl font-bold text-teal-600">
                        {formatIDR(selectedBoganathaOrder.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Daftar Produk
                  </h3>
                  <div className="space-y-3">
                    {boganathaDetailsMap.get(
                      selectedBoganathaOrder.idPesanan,
                    ) ? (
                      boganathaDetailsMap
                        .get(selectedBoganathaOrder.idPesanan)!
                        .map((item: any, idx: number) => (
                          <div
                            key={`boganatha-item-${idx}`}
                            className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setSelectedProductDetail(item)}
                          >
                            <div className="flex flex-col gap-2 shrink-0">
                              <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border border-gray-200 relative">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              {selectedBoganathaOrder.status
                                ?.trim()
                                .toUpperCase() === "PROCESS" &&
                                item.statusKirim &&
                                item.statusKirim.trim() !== "" && (
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded text-center whitespace-nowrap",
                                      item.statusKirim.trim().toUpperCase() ===
                                        "DI TERIMA"
                                        ? "text-emerald-700 bg-emerald-50"
                                        : "text-blue-600 bg-blue-50",
                                    )}
                                  >
                                    {item.statusKirim}
                                  </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-sm font-bold text-gray-900 truncate flex-1">
                                  {item.name}
                                </p>
                                {selectedBoganathaOrder.status
                                  ?.trim()
                                  .toUpperCase() === "PROCESS" &&
                                  item.statusKirim?.trim().toLowerCase() ===
                                    "terkirim" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReceiveItem(item);
                                      }}
                                      className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                                    >
                                      Terima
                                    </button>
                                  )}
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500">
                                  {item.qty} x {formatIDR(item.price)}
                                </p>
                                <p className="text-xs font-bold text-teal-600">
                                  {formatIDR(item.subtotal)}
                                </p>
                              </div>

                              {selectedBoganathaOrder.status?.trim().toUpperCase() === "REVIEW" && (
                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100 flex-wrap">
                                  <span className="text-[11px] font-medium text-gray-500 mr-auto">Status Item:</span>
                                  {item.statusPesanan && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase mr-1",
                                        item.statusPesanan.trim().toUpperCase() === "OK"
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : item.statusPesanan.trim().toUpperCase() === "EDIT"
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : item.statusPesanan.trim().toUpperCase() === "CANCEL"
                                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                                          : "bg-gray-100 text-gray-700"
                                      )}
                                    >
                                      {item.statusPesanan}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateItemStatusBoganatha(item, "OK");
                                    }}
                                    title="Set Status OK"
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer border",
                                      item.statusPesanan?.trim().toUpperCase() === "OK"
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    )}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>OK</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateItemStatusBoganatha(item, "EDIT");
                                    }}
                                    title="Set Status Edit"
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer border",
                                      item.statusPesanan?.trim().toUpperCase() === "EDIT"
                                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                    )}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelDeleteProductItemBoganatha(item);
                                    }}
                                    title="Set Status Cancel"
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer border",
                                      item.statusPesanan?.trim().toUpperCase() === "CANCEL"
                                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                    )}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                        Detail produk tidak ditemukan
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                {selectedBoganathaOrder.status?.trim().toUpperCase() === "SEND" && (
                  <button
                    onClick={handleSetToProcessBoganatha}
                    disabled={isUpdatingTx}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdatingTx && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Proses
                  </button>
                )}
                {selectedBoganathaOrder.status?.trim().toUpperCase() === "REVIEW" && (
                  <>
                    {boganathaDetailsMap.get(selectedBoganathaOrder.idPesanan) &&
                    boganathaDetailsMap.get(selectedBoganathaOrder.idPesanan)!.length > 0 &&
                    boganathaDetailsMap.get(selectedBoganathaOrder.idPesanan)!.every(
                      (it: any) => it.statusPesanan?.trim().toUpperCase() === "OK"
                    ) ? (
                      <button
                        onClick={handleSetToProcessBoganatha}
                        disabled={isUpdatingTx}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      >
                        {isUpdatingTx && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Proses
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddProduct(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Tambah produk</span>
                        </button>
                        <button
                          onClick={handleSetToSendBoganatha}
                          disabled={isUpdatingTx}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                          {isUpdatingTx && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          SEND
                        </button>
                      </div>
                    )}
                  </>
                )}
                {selectedBoganathaOrder.status?.trim().toUpperCase() ===
                  "PROCESS" &&
                  currentUserEmail.toLowerCase() ===
                    (selectedBoganathaOrder.userEmail?.toLowerCase() ||
                      decodedEmail.toLowerCase()) &&
                  boganathaDetailsMap
                    .get(selectedBoganathaOrder.idPesanan)
                    ?.every(
                      (it: any) =>
                        it.statusKirim?.trim().toUpperCase() === "DI TERIMA",
                    ) && (
                    <button
                      onClick={handleSetToDoneBoganatha}
                      disabled={isUpdatingTx}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingTx && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Done
                    </button>
                  )}
                {selectedBoganathaOrder.statusPaid?.trim().toUpperCase() !==
                  "PAID" &&
                  selectedBoganathaOrder.status?.trim().toUpperCase() ===
                    "DONE" &&
                  currentUserEmail.toLowerCase() ===
                    "vonyloselia@gmail.com" && (
                    <button
                      onClick={handleSetPaidBoganatha}
                      disabled={isUpdatingTx}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingTx && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Paid
                    </button>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAddProduct && (
        <AddProductDropdown
          products={allProductsList}
          onSave={handleSaveAddProductsBoganatha}
          onClose={() => setShowAddProduct(false)}
        />
      )}

      <AnimatePresence>
        {receiveItem && !isCameraOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">Terima Pesanan</h3>
                <button
                  onClick={() => {
                    setReceiveItem(null);
                    setReceiveKeterangan("");
                    setReceivePhotoBlob(null);
                    setReceivePhotoPreview(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Photo Penerimaan
                  </p>
                  {receivePhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 group">
                      <img
                        src={receivePhotoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setReceivePhotoBlob(null);
                          setReceivePhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                    >
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Buka Kamera</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Keterangan
                  </label>
                  <textarea
                    value={receiveKeterangan}
                    onChange={(e) => setReceiveKeterangan(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none"
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    setReceiveItem(null);
                    setReceiveKeterangan("");
                    setReceivePhotoBlob(null);
                    setReceivePhotoPreview(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmitReceive}
                  disabled={isSubmittingReceive}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReceive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProductDetail && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">
                  Detail Pesanan Produk
                </h3>
                <button
                  onClick={() => setSelectedProductDetail(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="w-16 h-16 rounded-xl bg-white overflow-hidden border border-gray-200 relative shrink-0">
                    {selectedProductDetail.image ? (
                      <img
                        src={selectedProductDetail.image}
                        alt={selectedProductDetail.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">
                      {selectedProductDetail.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      ID: {selectedProductDetail.prodId}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Jumlah
                    </p>
                    <p className="font-bold text-gray-900">
                      {selectedProductDetail.qty}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Harga Satuan
                    </p>
                    <p className="font-bold text-gray-900">
                      {formatIDR(selectedProductDetail.price)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <p className="text-xs font-medium text-gray-500">
                      Subtotal
                    </p>
                    <p className="font-bold text-teal-600 text-lg">
                      {formatIDR(
                        selectedProductDetail.subtotal ||
                          selectedProductDetail.amount,
                      )}
                    </p>
                  </div>
                </div>

                {selectedProductDetail.statusKirim &&
                  selectedProductDetail.statusKirim.trim() !== "" && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-900">
                          Status Pengiriman
                        </p>
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-1 rounded-md text-center whitespace-nowrap",
                            selectedProductDetail.statusKirim
                              .trim()
                              .toUpperCase() === "DI TERIMA"
                              ? "text-emerald-700 bg-emerald-100"
                              : "text-blue-700 bg-blue-100",
                          )}
                        >
                          {selectedProductDetail.statusKirim}
                        </span>
                      </div>

                      {selectedProductDetail.penerima && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-100/50">
                          {(() => {
                            const userObj = allUsers.find(
                              (u) =>
                                u.email ===
                                selectedProductDetail.penerima.toLowerCase(),
                            );
                            const displayName = userObj
                              ? userObj.fullName || userObj.name
                              : selectedProductDetail.penerima;
                            const initial = displayName
                              ? displayName.substring(0, 2).toUpperCase()
                              : "U";
                            return (
                              <>
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0 overflow-hidden">
                                  {userObj?.photo ? (
                                    <img
                                      src={userObj.photo}
                                      alt={displayName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    initial
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {selectedProductDetail.timestamp}
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {selectedProductDetail.photo && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Bukti Penerimaan
                          </p>
                          <div className="rounded-xl overflow-hidden border border-gray-200">
                            <img
                              src={selectedProductDetail.photo}
                              alt="Bukti Penerimaan"
                              className="w-full h-auto object-cover max-h-48"
                            />
                          </div>
                        </div>
                      )}

                      {selectedProductDetail.keterangan && (
                        <div className="mt-3 bg-white p-3 rounded-lg border border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Keterangan
                          </p>
                          <p className="text-sm text-gray-800">
                            {selectedProductDetail.keterangan}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isCameraOpen && (
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onCapture={(blob) => {
            setReceivePhotoBlob(blob);
            setReceivePhotoPreview(URL.createObjectURL(blob));
            setIsCameraOpen(false);
          }}
          onGallerySelect={() => {
            // Optional: fallback to file input if needed
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e: any) => {
              const file = e.target.files[0];
              if (file) {
                setReceivePhotoBlob(file);
                setReceivePhotoPreview(URL.createObjectURL(file));
                setIsCameraOpen(false);
              }
            };
            input.click();
          }}
        />
      )}
    </div>
  );
}
