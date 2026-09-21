import React, { useState, useEffect, FormEvent } from "react";
import { toPng } from "html-to-image";
import {
  ArrowLeft,
  Loader2,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Briefcase,
  Plus,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Calendar,
  X,
  Mail,
  Phone,
  Clock,
  Award,
  CreditCard,
  Bookmark,
  ShieldAlert,
  Image as ImageIcon,
  Download,
  Share2,
  MessageCircle,
  Filter,
  AlertTriangle,
  ChevronRight,
  Search,
  User as UserIcon,
  ZoomIn,
  Check,
  Edit3,
  ZoomOut,
  Globe,
  Sparkles,
  Bell,
  Database,
  Paperclip,
  StickyNote,
  Link as LinkIcon,
  Printer,
  Coins,
  Package,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatImageUrl } from "../lib/utils";
import {
  getSheetData,
  updateSheetData,
  getSheetDataFromId,
  getSheetDataAnonymouslyFromId,
  updateSheetDataFromId,
  appendSheetData,
  appendSheetDataFromId,
} from "../lib/api";
import {
  AddProductDropdown,
  ProductOption,
  DraftProductItem,
} from "../components/AddProductDropdown";
import { logActivity } from "../lib/activityLogger";
import { NotaMediaViewer } from "../components/NotaMediaViewer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { jsPDF } from "jspdf";
import { DriveService } from "../lib/driveService";
import { CameraModal } from "../components/CameraModal";
import { getCurrentUser } from "../lib/supabaseAuth";

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

function formatThermalIDR(amount: number | string) {
  const num =
    typeof amount === "string"
      ? parseFloat(amount.replace(/\D/g, "")) || 0
      : amount;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
  return `Rp. ${formatted}`;
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

function parseDate(dateStr: string, defaultFormat: "MM/DD/YYYY" | "DD/MM/YYYY" = "MM/DD/YYYY"): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Try custom regex for DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const parts = cleaned.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    // Check if first part looks like YYYY (4 digits)
    if (parts[0].length === 4 && !isNaN(p0)) {
      return new Date(p0, p1 - 1, p2);
    }

    // If third part is 4 digits (e.g. DD/MM/YYYY or MM/DD/YYYY)
    if (parts[2].length === 4 && !isNaN(p2)) {
      if (p1 > 12) {
        // MM/DD/YYYY since p1 is > 12
        return new Date(p2, p0 - 1, p1);
      } else if (p0 > 12) {
        // DD/MM/YYYY since p0 is > 12
        return new Date(p2, p1 - 1, p0);
      } else {
        // Default to provided defaultFormat
        if (defaultFormat === "DD/MM/YYYY") {
          return new Date(p2, p1 - 1, p0);
        }
        return new Date(p2, p0 - 1, p1);
      }
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  return null;
}

function getWitaParts(d: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(d);
  let year = d.getFullYear(),
    month = d.getMonth() + 1,
    day = d.getDate(),
    hour = d.getHours(),
    minute = d.getMinutes(),
    second = d.getSeconds();

  for (const p of parts) {
    if (p.type === "year") year = parseInt(p.value, 10);
    if (p.type === "month") month = parseInt(p.value, 10);
    if (p.type === "day") day = parseInt(p.value, 10);
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "second") second = parseInt(p.value, 10);
  }
  return { year, month, day, hour, minute, second };
}

function getImgUrl(urlStr: any): string {
  if (!urlStr) return "";
  const str = typeof urlStr === 'string' ? urlStr : (urlStr.url || urlStr.toString?.() || "");
  const trimmed = typeof str === 'string' ? str.trim() : "";
  if (!trimmed) return "";
  const gdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(gdRegex);
  if (match && match[1]) {
    return `https://docs.google.com/uc?export=view&id=${match[1]}`;
  }
  const gdIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(gdIdRegex);
  if (matchId && matchId[1] && trimmed.includes("drive.google.com")) {
    return `https://docs.google.com/uc?export=view&id=${matchId[1]}`;
  }
  return trimmed;
}

function getDrivePreviewUrl(urlStr: any): string | null {
  if (!urlStr) return null;
  const str = typeof urlStr === 'string' ? urlStr : (urlStr.url || urlStr.toString?.() || "");
  const trimmed = typeof str === 'string' ? str.trim() : "";
  if (!trimmed) return null;
  const gdRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = trimmed.match(gdRegex);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  const gdIdRegex = /[?&]id=([a-zA-Z0-9_-]+)/;
  const matchId = trimmed.match(gdIdRegex);
  if (matchId && matchId[1] && trimmed.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${matchId[1]}/preview`;
  }
  return null;
}

function parseMediaUrls(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.flatMap(item => parseMediaUrls(item));
  }
  const str = String(val).trim();
  if (!str) return [];

  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.flatMap(item => parseMediaUrls(typeof item === 'string' ? item : item?.url || ''));
      }
    } catch (e) {}
  }

  const urlRegex = /(https?:\/\/[^\s,]+)/g;
  const matches = str.match(urlRegex);
  if (matches && matches.length > 0) {
    return matches.map(m => m.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }

  return str.split(/[\s,\n\r]+/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

const mockChartData = [
  { name: "Jan", revenue: 4000, value: 4000 },
  { name: "Feb", revenue: 3000, value: 3000 },
  { name: "Mar", revenue: 5000, value: 5000 },
  { name: "Apr", revenue: 4500, value: 4500 },
  { name: "May", revenue: 6000, value: 6000 },
  { name: "Jun", revenue: 5500, value: 5500 },
];

function getColLetter(n: number) {
  let res = "";
  while (n >= 0) {
    res = String.fromCharCode((n % 26) + 65) + res;
    n = Math.floor(n / 26) - 1;
  }
  return res;
}

export function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const [unit, setUnit] = useState<any>(null);

  // States for toggle cards
  const [showUsers, setShowUsers] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [dataDocs, setDataDocs] = useState<any[]>([]);
  const [dataListModalOpen, setDataListModalOpen] = useState(false);

  // Additional stats
  const [expenses, setExpenses] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [chillhubSales, setChillhubSales] = useState<any[]>([]);
  const [lovissaTransactions, setLovissaTransactions] = useState<any[]>([]);
  const [lghDailyReports, setLghDailyReports] = useState<any[]>([]);
  const [lionParcelTransactions, setLionParcelTransactions] = useState<any[]>(
    [],
  );
  const [hqTransactions, setHqTransactions] = useState<any[]>([]);
  const [boganathaTransactions, setBoganathaTransactions] = useState<any[]>([]);
  const [occupancyDate, setOccupancyDate] = useState<string>(() => {
    const w = getWitaParts();
    const year = w.year;
    const month = String(w.month).padStart(2, "0");
    const day = String(w.day).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  const autoInvoiceRef = React.useRef<HTMLDivElement>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imgScale, setImgScale] = useState(1);

  // Request Cleaning States
  const [clickedEmptyRoom, setClickedEmptyRoom] = useState<string | null>(null);
  const [showCleaningBreakdown, setShowCleaningBreakdown] = useState(false);
  const [cleaningDate, setCleaningDate] = useState("");
  const [cleaningTime, setCleaningTime] = useState("");
  const [cleaningArea, setCleaningArea] = useState("Balkon Kamar");
  const [cleaningUser, setCleaningUser] = useState("Putu (prawinaputu@gmail.com)");
  const [cleaningKeterangan, setCleaningKeterangan] = useState("");
  const [isSubmittingCleaning, setIsSubmittingCleaning] = useState(false);

  const handleProcessCleaning = async (roomName: string) => {
    if (!cleaningKeterangan.trim()) {
      alert("Keterangan tidak boleh kosong.");
      return;
    }

    setIsSubmittingCleaning(true);
    try {
      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      const uniqueId = `lgh-rpt-${randomDigits}`;

      const areaFormatted = cleaningArea;

      const [year, month, day] = cleaningDate ? cleaningDate.split("-") : ["", "", ""];
      const finalDateTime = (year && month && day && cleaningTime)
        ? `${month}/${day}/${year} ${cleaningTime}:00`
        : `${(new Date().getMonth() + 1).toString().padStart(2, "0")}/${new Date().getDate().toString().padStart(2, "0")}/${new Date().getFullYear()} ${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")}:${new Date().getSeconds().toString().padStart(2, "0")}`;

      const currentUserEmail = localStorage.getItem("mtask_user_email") || "User";
      const initialChat = [
        {
          email: currentUserEmail,
          message: cleaningKeterangan.trim(),
          timestamp: finalDateTime,
        }
      ];
      const descriptionText = JSON.stringify(initialChat);

      await appendSheetData("lgh daily report!A:I", [
        [
          uniqueId,
          cleaningArea,
          finalDateTime,
          cleaningUser,
          "To Do",
          descriptionText,
          "",
          "",
          "FALSE",
        ],
      ]);

      const targetUserObj = getSystemUserByEmail(cleaningUser);
      const targetUserName = targetUserObj?.name || (cleaningUser.includes("@") ? cleaningUser.split("@")[0] : cleaningUser) || "User";

      logActivity(
        "Form",
        "LGH Daily Report",
        `${targetUserName} mendapat Request Cleaning "${cleaningArea}"`
      );

      alert("Request Cleaning berhasil dikirim!");

      const lghReportsRes = await getSheetData("lgh daily report!A1:Z500").catch(() => null);
      if (lghReportsRes?.values && lghReportsRes.values.length > 0) {
        const headerRow = (lghReportsRes.values[0] || []).map((h: any) => String(h || '').trim());
        const findHeaderIdx = (...names: string[]) => {
          return headerRow.findIndex((h: string) => {
            const hLower = h.toLowerCase();
            return names.some(n => hLower === n.toLowerCase() || hLower.includes(n.toLowerCase()));
          });
        };

        const mediaHeaderIdx = findHeaderIdx('media', 'foto', 'video', 'lampiran', 'file', 'image', 'bukti');
        const idHeaderIdx = findHeaderIdx('id');
        const areaHeaderIdx = findHeaderIdx('area', 'deskripsi');
        const timeHeaderIdx = findHeaderIdx('tanggal', 'timestamp', 'waktu', 'date');
        const userHeaderIdx = findHeaderIdx('user', 'email', 'pelapor', 'oleh');
        const statusHeaderIdx = findHeaderIdx('status');
        const descHeaderIdx = findHeaderIdx('keterangan', 'chat', 'catatan');

        const lghReportsData = lghReportsRes.values.slice(1).map((row: any[], i: number) => {
          const idVal = (idHeaderIdx > -1 ? row[idHeaderIdx] : row[0]) || "";
          const areaVal = (areaHeaderIdx > -1 ? row[areaHeaderIdx] : row[1]) || "";
          const timeVal = (timeHeaderIdx > -1 ? row[timeHeaderIdx] : row[2]) || "";
          const uEmail = (userHeaderIdx > -1 ? row[userHeaderIdx] : row[3]) || "";
          const statusVal = (statusHeaderIdx > -1 ? row[statusHeaderIdx] : row[4]) || "";

          let chat = [];
          let description = (descHeaderIdx > -1 ? row[descHeaderIdx] : row[5]) || "";
          try {
            if (description.trim().startsWith('[') && description.trim().endsWith(']')) {
              chat = JSON.parse(description);
              description = '';
            }
          } catch(e) {}

          let mediaRaw = '';
          if (mediaHeaderIdx > -1) {
            mediaRaw = row[mediaHeaderIdx] || '';
          } else if (row[7] && String(row[7]).includes('http')) {
            mediaRaw = row[7];
          } else if (row[6] && String(row[6]).includes('http')) {
            mediaRaw = row[6];
          }

          const files = parseMediaUrls(mediaRaw);

          return {
            rowIdx: i + 2,
            id: idVal,
            area: areaVal,
            timestamp: timeVal,
            email: uEmail,
            status: statusVal,
            description: description,
            columnG: row[6] || "",
            columnH: row[7] || "",
            columnI: row[8] || "",
            chat: chat,
            files: files
          };
        }).reverse();
        setLghDailyReports(lghReportsData);
      }

      setClickedEmptyRoom(null);
      setShowCleaningBreakdown(false);
      setSelectedTransaction(null);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim Request Cleaning. Silakan coba lagi.");
    } finally {
      setIsSubmittingCleaning(false);
    }
  };

  useEffect(() => {
    if (!zoomedImage) {
      setImgScale(1);
    }
  }, [zoomedImage]);
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);
  const [editBiayaLain, setEditBiayaLain] = useState<string>("");
  const [editHargaSatuan, setEditHargaSatuan] = useState<
    Record<number, string>
  >({});
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(
    null,
  );
  const [allProductsList, setAllProductsList] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [openCameraForItemIdx, setOpenCameraForItemIdx] = useState<
    number | null
  >(null);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const currentUserEmail = (localStorage.getItem("mtask_user_email") || "")
    .trim()
    .toLowerCase();

  useEffect(() => {
    if (selectedTransaction) {
      setEditBiayaLain(selectedTransaction.ongkir?.toString() || "");
      const hargas: Record<number, string> = {};
      selectedTransaction.items?.forEach((it: any, idx: number) => {
        hargas[idx] = it.price?.toString() || "";
      });
      setEditHargaSatuan(hargas);
    }
  }, [selectedTransaction]);

  // Chart filter
  const [chartFilter, setChartFilter] = useState("Year"); // Default to Year as per requirement 4
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>("");
  const [lionParcelSearch, setLionParcelSearch] = useState<string>("");
  const [hqSearch, setHqSearch] = useState<string>("");

  // Boganatha filters
  const [boganathaSearch, setBoganathaSearch] = useState<string>("");
  const [showBoganathaFilterMenu, setShowBoganathaFilterMenu] = useState(false);
  const [boganathaFilterStatusPesanan, setBoganathaFilterStatusPesanan] =
    useState<string>("All");
  const [boganathaFilterUnit, setBoganathaFilterUnit] = useState<string>("All");
  const [boganathaFilterStatusPaid, setBoganathaFilterStatusPaid] =
    useState<string>("All");

  const [expandBoganathaTrans, setExpandBoganathaTrans] = useState(false);
  const [expandHqTrans, setExpandHqTrans] = useState(false);
  const [expandLionParcelTrans, setExpandLionParcelTrans] = useState(false);
  const [expandLionParcelLayanan, setExpandLionParcelLayanan] = useState(false);
  const [expandLionParcelPayment, setExpandLionParcelPayment] = useState(false);
  const [expandChillhubSales, setExpandChillhubSales] = useState(false);
  const [expandLovissaTrans, setExpandLovissaTrans] = useState(false);
  const [expandLovissaOccupancy, setExpandLovissaOccupancy] = useState(true);
  const [expandRoomContribution, setExpandRoomContribution] = useState(false);
  const [expandBookingSourceContribution, setExpandBookingSourceContribution] = useState(false);
  const [expandUnitShopping, setExpandUnitShopping] = useState(false);
  const [expandLghDailyReport, setExpandLghDailyReport] = useState(false);
  const [selectedLghReport, setSelectedLghReport] = useState<any>(null);
  const [lghChatInput, setLghChatInput] = useState("");
  const [isLghUpdating, setIsLghUpdating] = useState(false);

  const [revenueSearchQuery, setRevenueSearchQuery] = useState<string>("");
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemUnits, setSystemUnits] = useState<Map<string, any>>(new Map());

  // States for handling high-fidelity popup list & detail modals
  const [userListModalOpen, setUserListModalOpen] = useState(false);
  const [contactListModalOpen, setContactListModalOpen] = useState(false);
  const [orderListModalOpen, setOrderListModalOpen] = useState(false);
  const [issueListModalOpen, setIssueListModalOpen] = useState(false);

  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(
    null,
  );
  const [selectedContactDetail, setSelectedContactDetail] = useState<
    any | null
  >(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(
    null,
  );
  const [selectedIssueDetail, setSelectedIssueDetail] = useState<any | null>(
    null,
  );

  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [allObers, setAllObers] = useState<any[]>([]);

  function parseGoogleSheetsTime(timeStr: string): string {
    if (!timeStr) return "";
    const cleaned = timeStr.trim();
    const match = cleaned.match(
      /Date\(\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)?\)/,
    );
    if (match) {
      const hours = match[1].padStart(2, "0");
      const minutes = match[2].padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return cleaned;
  }

  function getAvatarUrl(photoStr: string, name: string): string {
    if (!photoStr) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=eff6ff&color=3b82f6`;
    }
    const trimmed = photoStr.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      "https://unhwnznhwltgpyzdzfah.supabase.co";
    return `${supabaseUrl}/storage/v1/object/public/Mtask/${trimmed}`;
  }

  const getSystemUserByEmail = (emailStr: string) => {
    if (!emailStr) {
      return {
        name: "User",
        avatar: `https://ui-avatars.com/api/?name=User&background=eff6ff&color=3b82f6`,
      };
    }
    
    // Handle "Name (email@example.com)" format
    let targetEmail = emailStr.trim().toLowerCase();
    if (targetEmail.includes("(") && targetEmail.includes(")")) {
      const match = targetEmail.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        targetEmail = match[1].trim();
      }
    }
    
    const email = targetEmail;
    const prefix = email.includes("@") ? email.split("@")[0] : email;

    const found = systemUsers.find((u) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      const uPrefix = uEmail.includes("@") ? uEmail.split("@")[0] : uEmail;
      return (
        uEmail === email ||
        uPrefix === prefix ||
        (u.nameOrEmail && u.nameOrEmail.trim().toLowerCase() === email) ||
        (u.fullName && u.fullName.trim().toLowerCase() === email)
      );
    });

    if (found) {
      let displayName =
        found.nameOrEmail &&
        found.nameOrEmail !== "-" &&
        found.nameOrEmail !== "Unknown"
          ? found.nameOrEmail
          : found.fullName && found.fullName !== "-"
            ? found.fullName
            : "";
      if (!displayName || displayName === emailStr) {
        if (email === "abdhan1000@gmail.com" || prefix === "abdhan1000") {
          displayName = "Hanif";
        } else {
          displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }
      }
      return {
        name: displayName,
        avatar: getAvatarUrl(found.photo, displayName),
      };
    }

    const foundInUsers = (users || [])
      .concat(allUsersList || [])
      .find((u) => {
        const uEmail = (u.email || "").trim().toLowerCase();
        const uPrefix = uEmail.includes("@") ? uEmail.split("@")[0] : uEmail;
        return (
          uEmail === email ||
          uPrefix === prefix ||
          (u.name && u.name.trim().toLowerCase() === email)
        );
      });

    if (foundInUsers) {
      const displayName =
        foundInUsers.name || foundInUsers.fullName || (email === "abdhan1000@gmail.com" || prefix === "abdhan1000" ? "Hanif" : prefix.charAt(0).toUpperCase() + prefix.slice(1));
      return {
        name: displayName,
        avatar: getAvatarUrl(foundInUsers.photo, displayName),
      };
    }

    if (email === "abdhan1000@gmail.com" || prefix === "abdhan1000") {
      return {
        name: "Hanif",
        avatar: `https://ui-avatars.com/api/?name=Hanif&background=eff6ff&color=3b82f6`,
      };
    }

    const fallbackName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    return {
      name: fallbackName,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=eff6ff&color=3b82f6`,
    };
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [
          unitRes,
          projRes,
          taskRes,
          userRes,
          subRes1,
          subRes2,
          issueRes,
          orderRes1,
          orderRes2,
          dokRes1,
          dokRes2,
          contactRes,
        ] = await Promise.all([
          getSheetDataAnonymouslyFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "Unit!A1:Z500",
          ).catch(() => null),
          getSheetData("Project!A1:Z1000").catch(() => null),
          getSheetData("Task!A1:Z2000").catch(() => null),
          getSheetDataAnonymouslyFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "User!A1:Z500",
          ).catch(() => null),
          getSheetData("Subtask!A1:Z3000").catch(() => null),
          getSheetData("Sub Task!A1:Z3000").catch(() => null),
          getSheetData("Issue!A1:Z1000").catch(() => null),
          getSheetData("Order Budget!A1:Z1000").catch(() => null),
          getSheetData("OrderBudget!A1:Z1000").catch(() => null),
          getSheetData("Dok Sub Task!A1:Z3000").catch(() => null),
          getSheetData("Dok Subtask!A1:Z3000").catch(() => null),
          getSheetData("Contact!A1:Z3000").catch(() => null),
        ]);

        let fetchedUnitName = "";
        // 1. Find Unit
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
          const akaIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "AKA",
          );
          const logoIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "LOGO" ||
              h?.trim().toUpperCase() === "IMAGE",
          );
          const typeIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TYPE",
          );

          if (idIdx > -1) {
            const unitMap = new Map<string, any>();
            unitRes.values.slice(1).forEach((r: any[]) => {
              const uId = r[idIdx]?.trim();
              const uName =
                akaIdx > -1 && r[akaIdx]
                  ? r[akaIdx]
                  : nameIdx > -1
                    ? r[nameIdx] || "Unknown Unit"
                    : "Unknown Unit";
              const uLogo = logoIdx > -1 ? r[logoIdx] : "";
              if (uId) {
                unitMap.set(uId.toUpperCase(), { name: uName, logo: uLogo });
              }
            });
            setSystemUnits(unitMap);

            const row = unitRes.values
              .slice(1)
              .find((r: any[]) => r[idIdx]?.trim() === id);
            if (row) {
              fetchedUnitName = nameIdx > -1 ? row[nameIdx] || "" : "";
              setUnit({
                id,
                name:
                  nameIdx > -1
                    ? row[nameIdx] || "Unknown Unit"
                    : "Unknown Unit",
                logo: logoIdx > -1 ? row[logoIdx] || "" : "",
                type: typeIdx > -1 ? row[typeIdx] || "General" : "General",
              });
            }
          }
        }

        const checkUnit = (idMatch: string, nameMatch: string) =>
          id?.trim().toUpperCase() === idMatch ||
          fetchedUnitName.toLowerCase().includes(nameMatch);

        // 2. Fetch Users associated with this unit
        let fetchedUsers: any[] = [];
        if (userRes?.values?.length > 0) {
          const headers = userRes.values[0] as string[];
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "NAME" ||
              h?.trim().toUpperCase() === "NAMA",
          );
          const emailIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "EMAIL",
          );
          const unitIdIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "UNIT ID" ||
              key === "UNIT BUSINESS" ||
              key === "UNIT_BUSINESS" ||
              key === "UNITID" ||
              key === "KODE UNIT" ||
              key === "UNIT"
            );
          });
          const photoIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "PHOTO" ||
              key === "AVATAR" ||
              key === "FOTO" ||
              key === "IMAGE"
            );
          });
          const fullNameIdx = headers.findIndex((h) => {
            const k = (h || "").trim().toUpperCase();
            return (
              k === "FULL NAME" ||
              k === "FULLNAME" ||
              k === "NAMA ASLI" ||
              k === "NAMA LENGKAP"
            );
          });
          const poinIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "POIN" || key === "POINT" || key === "POINTS";
          });
          const idIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "ID" ||
              key === "KTA" ||
              key === "KTA ID" ||
              key === "KTA_ID" ||
              key === "NIK"
            );
          });
          const telpIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "TELP" ||
              key === "PHONE" ||
              key === "TELEPON" ||
              key === "MOBILE" ||
              key === "NO HP" ||
              key === "NOHP"
            );
          });
          const joinIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return (
              key === "JOIN DATE" ||
              key === "JOIN_DATE" ||
              key === "JOIN" ||
              key === "TANGGAL DAFTAR" ||
              key === "TANGGAL BERGABUNG"
            );
          });
          const availIdx = headers.findIndex((h) => {
            const key = h?.trim().toUpperCase() || "";
            return key === "AVAIL";
          });
          const typeIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "TYPE" ||
              h?.trim().toUpperCase() === "TIPE",
          );
          const jenisIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "JENIS" ||
              h?.trim().toUpperCase() === "JABATAN",
          );
          const usecaseIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "USECASE",
          );
          const roleIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ROLE" ||
              h?.trim().toUpperCase() === "ROLES",
          );

          if (unitIdIdx > -1) {
            const mappedRows = userRes.values
              .slice(1)
              .map((r: any[]) => {
                const matchesUnit = r[unitIdIdx]?.trim() === id;
                const hasId = idIdx > -1 && r[idIdx];
                const isNotXXX =
                  !hasId || r[idIdx]?.toString().trim().toUpperCase() !== "XXX";
                if (!(matchesUnit && isNotXXX)) return null;

                const availVal =
                  availIdx > -1 && r[availIdx]
                    ? r[availIdx].toString().trim().toUpperCase()
                    : "";
                const n =
                  nameIdx > -1 && r[nameIdx]
                    ? r[nameIdx].toString().trim()
                    : emailIdx > -1 && r[emailIdx]
                      ? r[emailIdx].toString().trim()
                      : "Unknown";
                const emailValue =
                  emailIdx > -1 && r[emailIdx]
                    ? r[emailIdx].toString().trim()
                    : "";
                const photoVal =
                  photoIdx > -1 && r[photoIdx]
                    ? r[photoIdx].toString().trim()
                    : "";
                const poinVal =
                  poinIdx > -1 && r[poinIdx] ? parseInt(r[poinIdx], 10) : 0;
                const poin = isNaN(poinVal) ? 0 : poinVal;
                const kta =
                  idIdx > -1 && r[idIdx] ? r[idIdx].toString().trim() : "-";
                const telp =
                  telpIdx > -1 && r[telpIdx]
                    ? r[telpIdx].toString().trim()
                    : "-";
                const join =
                  joinIdx > -1 && r[joinIdx]
                    ? r[joinIdx].toString().trim()
                    : "-";
                const full =
                  fullNameIdx > -1 && r[fullNameIdx]
                    ? r[fullNameIdx].toString().trim()
                    : "";
                const type =
                  typeIdx > -1 && r[typeIdx]
                    ? r[typeIdx].toString().trim()
                    : "General";
                const jenis =
                  jenisIdx > -1 && r[jenisIdx]
                    ? r[jenisIdx].toString().trim()
                    : "-";
                const usecase =
                  usecaseIdx > -1 && r[usecaseIdx]
                    ? r[usecaseIdx].toString().trim()
                    : "";
                const role =
                  roleIdx > -1 && r[roleIdx]
                    ? r[roleIdx].toString().trim()
                    : "";

                return {
                  id: emailValue || Math.random().toString(),
                  name: n,
                  email: emailValue,
                  photo: getAvatarUrl(photoVal, n),
                  points: poin,
                  ktaId: kta,
                  phone: telp,
                  joinDate: join,
                  fullName: full && full !== "-" ? full : n,
                  avail: availVal,
                  type: type,
                  jenis: jenis,
                  usecase: usecase,
                  role: role,
                };
              })
              .filter(Boolean);

            fetchedUsers = mappedRows.filter((u: any) => u.avail !== "CNT");
            const fetchedContacts = mappedRows.filter(
              (u: any) => u.avail === "CNT",
            );

            setUsers(fetchedUsers);
            setContacts(fetchedContacts);
            setAllUsersList(fetchedUsers);
          }

          // Populate systemUsers with all database users, filtering out ID = "XXX"
          const allSystemUsers = userRes.values
            .slice(1)
            .filter((r: any[]) => {
              const hasId = idIdx > -1 && r[idIdx];
              return (
                !hasId || r[idIdx]?.toString().trim().toUpperCase() !== "XXX"
              );
            })
            .map((r: any[]) => {
              const email = (emailIdx > -1 ? r[emailIdx]?.trim() : "") || "";
              const name =
                (nameIdx > -1 ? r[nameIdx]?.trim() : "") || "Unknown";
              const fullName =
                (fullNameIdx > -1 ? r[fullNameIdx]?.trim() : "") || "";
              const photo = (photoIdx > -1 ? r[photoIdx]?.trim() : "") || "";
              return {
                email: email.toLowerCase(),
                nameOrEmail: name,
                fullName: fullName && fullName !== "-" ? fullName : name,
                photo: photo,
              };
            });
          setSystemUsers(allSystemUsers);
        }

        // 3. Fetch Projects
        let fetchedProjects: any[] = [];
        const projIds = new Set<string>();
        const validProjIdsForTasks = new Set<string>();
        if (projRes?.values?.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "PROJECT ID",
          );
          const nameIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "PROJECT NAME",
          );
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS" || h?.trim().toUpperCase() === "PROJECT STATUS",
          );
          const unitIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "UNIT" ||
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "ID UNIT",
          );

          const startIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "START DATE" || h?.trim().toUpperCase() === "START",
          );
          const endIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "END DATE" || h?.trim().toUpperCase() === "END",
          );
          const pTsIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TIMESTAMP" || h?.trim().toUpperCase() === "DATE",
          );

          if (idIdx > -1 && unitIdIdx > -1) {
            const currentYear = new Date().getFullYear();
            fetchedProjects = projRes.values
              .slice(1)
              .filter((r: any[]) => r[unitIdIdx]?.trim() === id)
              .map((r: any[]) => {
                const pId = r[idIdx]?.trim();
                const dateVal = startIdx > -1 && r[startIdx] ? r[startIdx]?.trim() : (pTsIdx > -1 && r[pTsIdx] ? r[pTsIdx]?.trim() : "");
                const parsedPDate = parseDate(dateVal);
                const pYear = parsedPDate ? parsedPDate.getFullYear() : null;

                if (pId) {
                  projIds.add(pId);
                  const pStatus = statusIdx > -1 ? (r[statusIdx] || "").trim().toLowerCase() : "";
                  const norm = pStatus.replace(/[\s_-]+/g, "");
                  if (norm !== "notstarted" && pStatus !== "not started" && norm !== "canceled" && norm !== "cancelled" && norm !== "cancel") {
                    validProjIdsForTasks.add(pId);
                  }
                }
                return {
                  id: pId,
                  name: nameIdx > -1 ? r[nameIdx] : pId,
                  year: pYear,
                };
              })
              .filter((p: any) => !p.year || p.year === currentYear);

            const filteredProjIds = new Set(fetchedProjects.map(p => p.id));
            [...validProjIdsForTasks].forEach(pid => {
              if (!filteredProjIds.has(pid)) {
                validProjIdsForTasks.delete(pid);
              }
            });

            setProjects(fetchedProjects);
          }
        }

        // 4. Fetch Tasks
        let fetchedTasks: any[] = [];
        let doneTasksCount = 0;
        const taskIds = new Set<string>();
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TASK ID",
          );
          const taskNameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "TASK NAME" ||
              h?.trim().toUpperCase() === "TITLE",
          );
          const pIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "PROJECT",
          );
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS",
          );

          const taskDateIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "TASK DUE DATE" ||
              h?.trim().toUpperCase() === "DUE DATE" ||
              h?.trim().toUpperCase() === "TASK ASSIGN DATE" ||
              h?.trim().toUpperCase() === "ASSIGN DATE" ||
              h?.trim().toUpperCase() === "DATE" ||
              h?.trim().toUpperCase() === "TIMESTAMP",
          );

          if (taskIdIdx > -1 && pIdIdx > -1) {
            const currentYear = new Date().getFullYear();
            taskRes.values.slice(1).forEach((r: any[]) => {
              const pId = r[pIdIdx]?.trim();
              if (validProjIdsForTasks.has(pId)) {
                const tId = r[taskIdIdx]?.trim();
                if (tId) taskIds.add(tId);
                const st = (statusIdx > -1 ? r[statusIdx] : "").toLowerCase();
                
                const taskDateVal = taskDateIdx > -1 && r[taskDateIdx] ? r[taskDateIdx]?.trim() : "";
                const parsedTDate = parseDate(taskDateVal);
                const tYear = parsedTDate ? parsedTDate.getFullYear() : null;

                if (!tYear || tYear === currentYear) {
                  if (
                    st.includes("done") ||
                    st.includes("complete") ||
                    st.includes("selesai")
                  ) {
                    doneTasksCount++;
                  }
                  fetchedTasks.push({
                    id: tId,
                    name: taskNameIdx > -1 ? r[taskNameIdx] : tId,
                    status: statusIdx > -1 ? r[statusIdx] : "Unknown",
                  });
                }
              }
            });
            setTasks(fetchedTasks);
          }
        }

        // 5. Calculate Expenses from Order Budget below

        // 6. Fetch Orders (Order Budget)
        let fetchedOrders: any[] = [];
        let totalDisbursedExpenses = 0;
        const orderRes = orderRes1?.values ? orderRes1 : orderRes2;
        if (orderRes?.values?.length > 0) {
          const headers = orderRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ORDER ID" ||
              h?.trim().toUpperCase() === "ID",
          );
          const roIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "RO_NUMBER" ||
              h?.trim().toUpperCase() === "RO NUMBER" ||
              h?.trim().toUpperCase() === "RO",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ORDER DETAIL" ||
              h?.trim().toUpperCase() === "DETAIL" ||
              h?.trim().toUpperCase() === "ORDER NAME",
          );
          const unitIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "UNIT" ||
              h?.trim().toUpperCase() === "UNIT BUSINESS" ||
              h?.trim().toUpperCase() === "UNIT_BUSINESS",
          );
          const amountIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "AMOUNT" ||
              h?.trim().toUpperCase() === "TOTAL",
          );
          const tierIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "REVIEW TIER" ||
              h?.trim().toUpperCase() === "TIER" ||
              h?.trim().toUpperCase() === "STATUS",
          );
          const userIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "EMAIL USER" ||
              h?.trim().toUpperCase() === "EMAIL" ||
              h?.trim().toUpperCase() === "USER",
          );
          const dateIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "DATE" ||
              h?.trim().toUpperCase() === "TANGGAL" ||
              h?.trim().toUpperCase() === "TIMESTAMP",
          );
          const bankIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "BANK",
          );
          const rekNoIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "REK NO" ||
              h?.trim().toUpperCase() === "REK_NO" ||
              h?.trim().toUpperCase() === "REKENING",
          );
          const anIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "A N" ||
              h?.trim().toUpperCase() === "ATAS NAMA" ||
              h?.trim().toUpperCase() === "A_N",
          );
          const catatanIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "CATATAN" ||
              h?.trim().toUpperCase() === "NOTE" ||
              h?.trim().toUpperCase() === "MEMO",
          );
          const viaIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "VIA",
          );
          const typeIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ORDER TYPE" ||
              h?.trim().toUpperCase() === "TYPE",
          );
          const notaIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "NOTA BELANJA" ||
              h?.trim().toUpperCase() === "NOTA_BELANJA" ||
              h?.trim().toUpperCase() === "NOTA",
          );

          const t1rIdx = headers.findIndex((h) =>
            ["TIER 1 REVIEW", "TIER 1", "ADMIN", "ADMIN_REVIEW"].includes(
              h?.trim().toUpperCase(),
            ),
          );
          const dt1Idx = headers.findIndex((h) =>
            ["DATE TIER 1", "DATE_TIER_1", "DATE TIER1"].includes(
              h?.trim().toUpperCase(),
            ),
          );
          const t2rIdx = headers.findIndex((h) =>
            ["TIER 2 REVIEW", "TIER 2", "BOARD", "BOARD_REVIEW"].includes(
              h?.trim().toUpperCase(),
            ),
          );
          const dt2Idx = headers.findIndex((h) =>
            ["DATE TIER 2", "DATE_TIER_2", "DATE TIER2"].includes(
              h?.trim().toUpperCase(),
            ),
          );
          const t3rIdx = headers.findIndex((h) =>
            ["TIER 3 REVIEW", "TIER 3", "BOSS", "BOSS_REVIEW"].includes(
              h?.trim().toUpperCase(),
            ),
          );
          const dt3Idx = headers.findIndex((h) =>
            ["DATE TIER 3", "DATE_TIER_3", "DATE TIER3"].includes(
              h?.trim().toUpperCase(),
            ),
          );

          if (unitIdIdx > -1) {
            const currentYear = new Date().getFullYear();
            const matchedRows = orderRes.values
              .slice(1)
              .filter(
                (r: any[]) =>
                  r[unitIdIdx]?.trim().toUpperCase() === id.toUpperCase(),
              );
            fetchedOrders = matchedRows
              .map((r: any[], idx: number) => {
                const oId =
                  idIdx > -1 && r[idIdx] ? r[idIdx]?.trim() : `order-${idx}`;
                const oDetail =
                  nameIdx > -1 && r[nameIdx]
                    ? r[nameIdx]?.trim()
                    : "Unknown Detail";
                const amtStr =
                  amountIdx > -1 && r[amountIdx] ? r[amountIdx]?.trim() : "0";
                const oAmount = parseFloat(amtStr.replace(/[^0-9.-]/g, "")) || 0;
                const oTier =
                  tierIdx > -1 && r[tierIdx] ? r[tierIdx]?.trim() : "Review";
                const oDate =
                  dateIdx > -1 && r[dateIdx] ? r[dateIdx]?.trim() : "-";
                const oUser =
                  userIdx > -1 && r[userIdx] ? r[userIdx]?.trim() : "";
                const oRo = roIdx > -1 && r[roIdx] ? r[roIdx]?.trim() : "-";
                const oBank =
                  bankIdx > -1 && r[bankIdx] ? r[bankIdx]?.trim() : "-";
                const oRekNo =
                  rekNoIdx > -1 && r[rekNoIdx] ? r[rekNoIdx]?.trim() : "-";
                const oAn = anIdx > -1 && r[anIdx] ? r[anIdx]?.trim() : "-";
                const oCatatan =
                  catatanIdx > -1 && r[catatanIdx] ? r[catatanIdx]?.trim() : "-";
                const oVia = viaIdx > -1 && r[viaIdx] ? r[viaIdx]?.trim() : "-";
                const oType =
                  typeIdx > -1 && r[typeIdx] ? r[typeIdx]?.trim() : "-";
                const oNota =
                  notaIdx > -1 && r[notaIdx] ? r[notaIdx]?.trim() : "-";

                const oT1r = t1rIdx > -1 && r[t1rIdx] ? r[t1rIdx]?.trim() : "-";
                const oDt1 = dt1Idx > -1 && r[dt1Idx] ? r[dt1Idx]?.trim() : "-";
                const oT2r = t2rIdx > -1 && r[t2rIdx] ? r[t2rIdx]?.trim() : "-";
                const oDt2 = dt2Idx > -1 && r[dt2Idx] ? r[dt2Idx]?.trim() : "-";
                const oT3r = t3rIdx > -1 && r[t3rIdx] ? r[t3rIdx]?.trim() : "-";
                const oDt3 = dt3Idx > -1 && r[dt3Idx] ? r[dt3Idx]?.trim() : "-";

                const parsedODate = parseDate(oDate);
                const oYear = parsedODate ? parsedODate.getFullYear() : null;

                return {
                  id: oId,
                  name: oDetail,
                  ro: oRo,
                  detail: oDetail,
                  amount: oAmount,
                  tier: oTier,
                  date: oDate,
                  year: oYear,
                  userEmail: oUser,
                  bank: oBank,
                  rekNo: oRekNo,
                  an: oAn,
                  catatan: oCatatan,
                  via: oVia,
                  type: oType,
                  nota: oNota,
                  t1r: oT1r,
                  dt1: oDt1,
                  t2r: oT2r,
                  dt2: oDt2,
                  t3r: oT3r,
                  dt3: oDt3,
                };
              })
              .filter((o: any) => !o.year || o.year === currentYear);

            fetchedOrders.forEach((o: any) => {
              if (o.tier.toUpperCase() === "DISBURSED") {
                totalDisbursedExpenses += o.amount;
              }
            });

            setOrders(fetchedOrders);
            setAllObers(fetchedOrders);
            setExpenses(totalDisbursedExpenses);
          }
        }

        // 7. Parse issues for this unit
        let fetchedIssues: any[] = [];
        if (issueRes?.values && issueRes.values.length > 0) {
          const headers = issueRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ISSUE_ID" ||
              h?.trim().toUpperCase() === "ISSUEID" ||
              h?.trim().toUpperCase() === "ID",
          );
          const unitIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "UNIT",
          );
          const ketIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "KETERANGAN" ||
              h?.trim().toUpperCase() === "ISSUE" ||
              h?.trim().toUpperCase() === "DETAIL",
          );
          const tsIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TIMESTAMP",
          );
          const statIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "STATUS",
          );
          const usrIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "USER" ||
              h?.trim().toUpperCase() === "EMAIL",
          );

          issueRes.values.slice(1).forEach((row: any[]) => {
            const uVal = unitIdx > -1 ? row[unitIdx]?.trim() : "";
            if (uVal === id || uVal === unit?.name || uVal === unit?.id) {
              const issueStatus = statIdx > -1 ? row[statIdx]?.trim() || "SEND" : "SEND";
              if (issueStatus.toUpperCase() !== "DONE") {
                fetchedIssues.push({
                  id: idIdx > -1 ? row[idIdx]?.trim() || "" : "",
                  keterangan: ketIdx > -1 ? row[ketIdx]?.trim() || "" : "",
                  timestamp: tsIdx > -1 ? row[tsIdx]?.trim() || "" : "",
                  status: issueStatus,
                  user: usrIdx > -1 ? row[usrIdx]?.trim() || "" : "",
                  unit: uVal,
                });
              }
            }
          });
        }
        setIssues(fetchedIssues.reverse());

        // 7.5 Parse subtasks of this unit to filter documents with DATA = TRUE
        const projIdToUnitIdMap = new Map<string, string>();
        if (projRes?.values && projRes.values.length > 0) {
          const headers = projRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ID" ||
              h?.trim().toUpperCase() === "PROJECT ID",
          );
          const unitIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "UNIT" ||
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "ID UNIT",
          );
          if (idIdx > -1 && unitIdIdx > -1) {
            projRes.values.slice(1).forEach((r: any[]) => {
              const pId = r[idIdx]?.trim()?.toUpperCase();
              const uId = r[unitIdIdx]?.trim()?.toUpperCase();
              if (pId && uId) {
                const cleanUId = uId.split('/')[0].trim().toUpperCase();
                projIdToUnitIdMap.set(pId, cleanUId);
              }
            });
          }
        }

        const taskIdToProjIdMap = new Map<string, string>();
        if (taskRes?.values && taskRes.values.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TASK ID",
          );
          const pIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "PROJECT",
          );
          if (taskIdIdx > -1 && pIdIdx > -1) {
            taskRes.values.slice(1).forEach((r: any[]) => {
              const tId = r[taskIdIdx]?.trim()?.toUpperCase();
              const pId = r[pIdIdx]?.trim()?.toUpperCase();
              if (tId && pId) {
                taskIdToProjIdMap.set(tId, pId);
              }
            });
          }
        }

        const allTaskIdsOfUnit = new Set<string>();
        if (taskRes?.values?.length > 0) {
          const headers = taskRes.values[0] as string[];
          const taskIdIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "TASK ID",
          );
          const pIdIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PROJECT ID" ||
              h?.trim().toUpperCase() === "PROJECT",
          );
          if (taskIdIdx > -1 && pIdIdx > -1) {
            taskRes.values.slice(1).forEach((r: any[]) => {
              const pId = r[pIdIdx]?.trim();
              if (pId && projIds.has(pId)) {
                const tId = r[taskIdIdx]?.trim();
                if (tId) allTaskIdsOfUnit.add(tId.toUpperCase());
              }
            });
          }
        }

        const subtaskIdsOfUnit = new Set<string>();
        const subtaskIdToUnitIdMap = new Map<string, string>();

        const parseSubtaskRes = (res: any) => {
          if (!res?.values || res.values.length === 0) return;
          const headers = res.values[0] as string[];
          const subIdIdx = headers.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "SUBTASK ID" ||
              (h || "").trim().toUpperCase() === "ID" ||
              (h || "").trim().toUpperCase() === "SUBTASK_ID",
          );
          const parentTaskIdIdx = headers.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "TASK ID" ||
              (h || "").trim().toUpperCase() === "TASK_ID" ||
              (h || "").trim().toUpperCase() === "TASK",
          );
          const subUnitIdx = headers.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "UNIT" ||
              (h || "").trim().toUpperCase() === "UNIT ID" ||
              (h || "").trim().toUpperCase() === "ID UNIT" ||
              (h || "").trim().toUpperCase() === "ID_UNIT",
          );

          if (subIdIdx > -1) {
            res.values.slice(1).forEach((row: any[]) => {
              const sId = row[subIdIdx]?.trim();
              if (!sId) return;
              const key = sId.replace(/[\s_-]+/g, '').toUpperCase();
              const pTaskId = parentTaskIdIdx > -1 ? (row[parentTaskIdIdx]?.trim() || "").toUpperCase() : "";
              const sUnitId = subUnitIdx > -1 ? (row[subUnitIdx]?.trim() || "").toUpperCase() : "";

              const matchesUnitDirect = sUnitId === id.toUpperCase() || 
                                        (fetchedUnitName && sUnitId === fetchedUnitName.toUpperCase()) ||
                                        (fetchedUnitName && sUnitId.includes(id.toUpperCase()));
                                        
              if (allTaskIdsOfUnit.has(pTaskId) || matchesUnitDirect) {
                subtaskIdsOfUnit.add(key);
              }

              // Build mapping
              let resolvedUnitId = '';
              if (subUnitIdx > -1 && row[subUnitIdx]) {
                const uVal = row[subUnitIdx].trim().toUpperCase();
                const match = uVal.match(/^(UNT\d+)/i);
                if (match) {
                  resolvedUnitId = match[1].toUpperCase();
                } else {
                  resolvedUnitId = uVal;
                }
              }

              if (!resolvedUnitId && pTaskId) {
                const pProjId = taskIdToProjIdMap.get(pTaskId);
                if (pProjId) {
                  const pUnitId = projIdToUnitIdMap.get(pProjId);
                  if (pUnitId) {
                    resolvedUnitId = pUnitId;
                  }
                }
              }

              if (resolvedUnitId) {
                subtaskIdToUnitIdMap.set(key, resolvedUnitId);
              }
            });
          }
        };

        parseSubtaskRes(subRes1);
        parseSubtaskRes(subRes2);

        let fetchedDataDocs: any[] = [];
        
        const parseDokRes = (res: any) => {
          if (!res?.values || res.values.length === 0) return;
          const headers = res.values[0] as string[];
          const dokIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK SUB ID' || h?.trim().toUpperCase() === 'ID');
          const subIdIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'SUB_ID' || h?.trim().toUpperCase() === 'SUB ID' || h?.trim().toUpperCase() === 'SUBTASK ID');
          const nameIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TITLE_DOK' || h?.trim().toUpperCase() === 'JUDUL' || h?.trim().toUpperCase() === 'TITLE DOK' || h?.trim().toUpperCase() === 'NAME' || h?.trim().toUpperCase() === 'FILE NAME' || h?.trim().toUpperCase() === 'TITLE');
          const typeIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DOK_TYPE' || h?.trim().toUpperCase() === 'DOK TYPE' || h?.trim().toUpperCase() === 'TYPE');
          const tsIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'TIMESTAMP' || h?.trim().toUpperCase() === 'TIME' || h?.trim().toUpperCase() === 'DATE');
          const image01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'IMAGE_01' || h?.trim().toUpperCase() === 'IMAGE 01' || h?.trim().toUpperCase() === 'IMAGE');
          const noteIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'NOTE');
          const file01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'FILE_01' || h?.trim().toUpperCase() === 'FILE 01' || h?.trim().toUpperCase() === 'FILE');
          const url01Idx = headers.findIndex(h => h?.trim().toUpperCase() === 'URL_01' || h?.trim().toUpperCase() === 'URL 01' || h?.trim().toUpperCase() === 'URL');
          const dataColIdx = headers.findIndex(h => h?.trim().toUpperCase() === 'DATA');

          if (subIdIdx > -1) {
            res.values.slice(1).forEach((row: any[]) => {
              const rowSubId = row[subIdIdx]?.toString()?.trim() || '';
              const cleanSubId = rowSubId.replace(/[\s_-]+/g, '').toUpperCase();
              const isDataValue = dataColIdx > -1 ? (row[dataColIdx]?.toString()?.trim()?.toUpperCase() === 'TRUE') : false;
              
              if (isDataValue) {
                const resolvedUnitId = subtaskIdToUnitIdMap.get(cleanSubId);
                let isMatch = false;

                if (resolvedUnitId) {
                  const cleanMatchedUnitId = resolvedUnitId.split('/')[0].trim().toUpperCase();
                  const currentUnitId = id.toUpperCase().trim();
                  
                  isMatch = cleanMatchedUnitId === currentUnitId || 
                            cleanMatchedUnitId.includes(currentUnitId) || 
                            (fetchedUnitName && cleanMatchedUnitId === fetchedUnitName.toUpperCase()) ||
                            (fetchedUnitName && fetchedUnitName.toUpperCase().includes(cleanMatchedUnitId));
                } else {
                  isMatch = subtaskIdsOfUnit.has(cleanSubId);
                }

                if (isMatch) {
                  const docId = dokIdIdx > -1 && row[dokIdIdx] ? row[dokIdIdx] : Math.random().toString();
                  if (!fetchedDataDocs.some(d => d.id === docId)) {
                    fetchedDataDocs.push({
                      id: docId,
                      name: nameIdx > -1 ? row[nameIdx] : 'Unknown Document',
                      type: typeIdx > -1 ? row[typeIdx]?.trim() : 'File',
                      timestamp: tsIdx > -1 ? row[tsIdx] : '',
                      image01: image01Idx > -1 ? row[image01Idx] : '',
                      note: noteIdx > -1 ? row[noteIdx] : '',
                      file01: file01Idx > -1 ? row[file01Idx] : '',
                      url01: url01Idx > -1 ? row[url01Idx] : '',
                      isFromAddDocument: true,
                      activityId: rowSubId,
                    });
                  }
                }
              }
            });
          }
        };

        parseDokRes(dokRes1);
        parseDokRes(dokRes2);

        // Also parse issues that are marked as Data
        if (issueRes?.values && issueRes.values.length > 0) {
          const headers = issueRes.values[0] as string[];
          const idIdx = headers.findIndex(h => h?.trim().toUpperCase() === "ISSUE_ID" || h?.trim().toUpperCase() === "ISSUEID" || h?.trim().toUpperCase() === "ID");
          const unitIdx = headers.findIndex(h => h?.trim().toUpperCase() === "UNIT");
          const ketIdx = headers.findIndex(h => h?.trim().toUpperCase() === "KETERANGAN" || h?.trim().toUpperCase() === "ISSUE" || h?.trim().toUpperCase() === "DETAIL");
          const tsIdx = headers.findIndex(h => h?.trim().toUpperCase() === "TIMESTAMP");
          const dataColIdx = headers.findIndex(h => h?.trim().toUpperCase() === "DATA");
          const cat1Idx = headers.findIndex(h => h?.trim().toUpperCase() === "CATATAN");
          const cat2Idx = headers.findIndex(h => h?.trim().toUpperCase() === "CATATAN2" || h?.trim().toUpperCase() === "CATATAN_2");

          issueRes.values.slice(1).forEach((row: any[]) => {
            const uVal = unitIdx > -1 ? row[unitIdx]?.trim() : "";
            const isDataValue = dataColIdx > -1 ? (row[dataColIdx]?.toString()?.trim()?.toUpperCase() === 'TRUE') : false;
            
            if (isDataValue && (uVal === id || uVal === unit?.name || uVal === unit?.id)) {
              const issueIdVal = idIdx > -1 ? row[idIdx]?.trim() || "" : "";
              const issueKet = ketIdx > -1 ? row[ketIdx]?.trim() || "Issue Data" : "Issue Data";
              const issueTsVal = tsIdx > -1 ? row[tsIdx]?.trim() || "" : "";
              
              const cat1 = cat1Idx > -1 ? row[cat1Idx]?.trim() || "" : "";
              const cat2 = cat2Idx > -1 ? row[cat2Idx]?.trim() || "" : "";

              const isImage = !!(cat1.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || cat1.startsWith('data:image') || cat1.startsWith('blob:'));
              const isUrl = cat1.startsWith('http://') || cat1.startsWith('https://');

              fetchedDataDocs.push({
                id: issueIdVal || `iss-data-${Math.random()}`,
                name: issueKet,
                type: isImage ? 'Photo' : (isUrl ? 'Link' : 'Note'),
                timestamp: issueTsVal,
                image01: isImage ? cat1 : '',
                note: !isImage && !isUrl ? cat1 : (cat2 || ''),
                file01: isUrl ? cat1 : '',
                url01: isUrl ? cat1 : '',
                isFromIssue: true,
                issueId: issueIdVal,
              });
            }
          });
        }

        setDataDocs(fetchedDataDocs);

        // 8. Fetch Sales data for Chillhub Surabaya (UNT15)
        let salesData: any[] = [];
        if (checkUnit("UNT15", "chillhub")) {
          const salesRes = await getSheetDataAnonymouslyFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "Chillhub Surabaya!A1:Z500",
          ).catch(() => null);
          if (salesRes && salesRes.values && salesRes.values.length > 0) {
            const headers = salesRes.values[0] as string[];
            
            const findHeaderIdx = (keys: string[]) => {
              return headers.findIndex((h) => {
                const normalized = h?.trim().toUpperCase() || "";
                return keys.some(
                  (k) => normalized === k || normalized.includes(k),
                );
              });
            };

            const dateIdx = findHeaderIdx(["DATE", "TANGGAL", "TGL"]);
            const actIdx = findHeaderIdx(["ACTIVITIES", "ACTIVITY", "KEGIATAN", "DESKRIPSI", "DESCRIPTION", "KETERANGAN", "KET"]);
            const priceIdx = findHeaderIdx(["PRICE", "PRICE IDR", "HARGA", "AMOUNT", "NOMINAL", "TOTAL", "JUMLAH"]);
            const timeIdx = findHeaderIdx(["TIME", "WAKTU", "JAM"]);
            const userEmailIdx = findHeaderIdx(["USER", "EMAIL", "KLIEN", "PELANGGAN", "CUSTOMER", "NAMA"]);
            const notaIdx = findHeaderIdx(["NOTA", "BUKTI", "BUKTI BAYAR", "FILE", "PHOTO", "FOTO", "IMAGE"]);

            if (dateIdx > -1 && actIdx > -1 && priceIdx > -1) {
              salesRes.values.slice(1).forEach((row: any[]) => {
                const dateStr = row[dateIdx]?.trim() || "";
                const activityStr = row[actIdx]?.trim() || "";
                const priceStr = row[priceIdx]?.trim() || "";
                const timeStr = timeIdx > -1 ? row[timeIdx]?.trim() || "" : "";
                const userEmailStr =
                  userEmailIdx > -1 ? row[userEmailIdx]?.trim() || "" : "";
                const notaStr = notaIdx > -1 ? row[notaIdx]?.trim() || "" : "";

                // Parse Price as a number safely
                const priceNum =
                  parseFloat(priceStr.replace(/[^0-9.-]/g, "")) || 0;

                if (dateStr || activityStr || priceNum > 0) {
                  salesData.push({
                    date: dateStr,
                    rawDate: parseDate(dateStr),
                    activity: activityStr || "Activity",
                    price: priceNum,
                    time: parseGoogleSheetsTime(timeStr),
                    userEmail: userEmailStr,
                    nota: notaStr,
                  });
                }
              });
            }
          }
        }
        setChillhubSales(salesData);

        // 9. Fetch Transactions for Lovissa Guest House (UNT19)
        let lovissaData: any[] = [];
        if (checkUnit("UNT19", "lovissa")) {
          const lovissaRes = await getSheetData(
            "Lovissa Guest House!A1:Z500",
          ).catch(() => null);
          if (lovissaRes && lovissaRes.values && lovissaRes.values.length > 0) {
            const headers = lovissaRes.values[0] as string[];
            const checkInIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "CHECK IN" ||
                h?.trim().toUpperCase() === "CHECK-IN" ||
                h?.trim().toUpperCase() === "CHECKIN",
            );
            const checkOutIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "CHECK OUT" ||
                h?.trim().toUpperCase() === "CHECK-OUT" ||
                h?.trim().toUpperCase() === "CHECKOUT",
            );
            const durIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "DUR" ||
                h?.trim().toUpperCase() === "DURATION" ||
                h?.trim().toUpperCase() === "DURASI",
            );
            const typeIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "TYPE" ||
                h?.trim().toUpperCase() === "TIPE",
            );
            const roomIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "ROOM" ||
                h?.trim().toUpperCase() === "KAMAR",
            );
            const priceIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "PRICE" ||
                h?.trim().toUpperCase() === "HARGA",
            );
            const amountIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "AMOUNT" ||
                h?.trim().toUpperCase() === "TOTAL" ||
                h?.trim().toUpperCase() === "JUMLAH",
            );
            const ketIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "KETERANGAN" ||
                h?.trim().toUpperCase() === "NOTE" ||
                h?.trim().toUpperCase() === "NOTES",
            );
            const nameIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "NAME" ||
                h?.trim().toUpperCase() === "NAMA" ||
                h?.trim().toUpperCase() === "CONTACT ID" ||
                h?.trim().toUpperCase() === "CONTACTID" ||
                h?.trim().toUpperCase() === "KONTAK",
            );
            const noIdIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "NO.ID" ||
                h?.trim().toUpperCase() === "NO ID" ||
                h?.trim().toUpperCase() === "NO. ID" ||
                h?.trim().toUpperCase() === "IDENTITY NO",
            );
            const emailIdx = headers.findIndex(
              (h) => h?.trim().toUpperCase() === "EMAIL",
            );
            const phoneIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "PHONE" ||
                h?.trim().toUpperCase() === "TELEPON" ||
                h?.trim().toUpperCase() === "NO HP" ||
                h?.trim().toUpperCase() === "NO. HP",
            );
            const paymentIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "PAYMENT" ||
                h?.trim().toUpperCase() === "PEMBAYARAN" ||
                h?.trim().toUpperCase() === "PAYMENT METHOD",
            );
            const photoIdIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "PHOTO ID" ||
                h?.trim().toUpperCase() === "FOTO ID" ||
                h?.trim().toUpperCase() === "PHOTOID" ||
                h?.trim().toUpperCase() === "FOTO KTP",
            );
            const buktiIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "BUKTI TRANSFER" ||
                h?.trim().toUpperCase() === "BUKTI" ||
                h?.trim().toUpperCase() === "BUKTI BAYAR" ||
                h?.trim().toUpperCase() === "TRANSFER PROOF",
            );
            const sourceIdx = headers.findIndex((h) => {
              const norm =
                h?.trim().toUpperCase().replace(/[\s._-]+/g, "") || "";
              return (
                norm === "BOOKINGSOURCE" ||
                norm === "SOURCE" ||
                norm === "CHANNEL" ||
                norm === "OTA" ||
                norm === "SUMBER" ||
                norm === "BOOKING SOURCE"
              );
            });
            let printIdx = headers.findIndex(
              (h) => h?.trim().toUpperCase() === "PRINT",
            );
            let printColLetter = "";

            if (printIdx === -1) {
              // Add a new column if Print isn't found
              printIdx = headers.length;
              headers.push("Print");
              // Optionally update the headers in the sheet to reflect the new column
              const getColName = (n: number) => {
                let res = "";
                while (n >= 0) {
                  res = String.fromCharCode((n % 26) + 65) + res;
                  n = Math.floor(n / 26) - 1;
                }
                return res;
              };
              const colName = getColName(printIdx);
              // Fire & forget update for the header
              updateSheetData(`Lovissa Guest House!${colName}1`, [
                ["Print"],
              ]).catch(() => {});
            }

            const getColName2 = (n: number) => {
              let res = "";
              while (n >= 0) {
                res = String.fromCharCode((n % 26) + 65) + res;
                n = Math.floor(n / 26) - 1;
              }
              return res;
            };
            printColLetter = getColName2(printIdx);

            const findContactDetails = (idOrName: string) => {
              if (!userRes || !userRes.values || userRes.values.length < 2)
                return null;
              const headers = userRes.values[0] as string[];
              const cIdIdx = headers.findIndex((h: string) => {
                const upper = h?.trim().toUpperCase() || "";
                return upper.startsWith("CONTACT ID") || upper === "ID";
              });
              if (cIdIdx > -1) {
                const found = userRes.values
                  .slice(1)
                  .find(
                    (r: any[]) =>
                      r[cIdIdx]?.trim().toUpperCase() ===
                      idOrName.trim().toUpperCase(),
                  );
                if (found) {
                  const getVal = (keys: string[]) => {
                    const idx = headers.findIndex((h: string) => {
                      const upp = h?.trim().toUpperCase() || "";
                      const noSpaceUpp = upp.replace(/[\s._-]+/g, "");
                      return keys.some(
                        (k) =>
                          upp.startsWith(k) ||
                          upp === k ||
                          noSpaceUpp === k.replace(/[\s._-]+/g, ""),
                      );
                    });
                    return idx > -1 ? found[idx]?.trim() : null;
                  };
                  return {
                    name: getVal(["NAME", "NAMA"]),
                    noId: getVal([
                      "NO. ID",
                      "NO ID",
                      "NO.ID",
                      "NO KTP",
                      "NOKTP",
                    ]),
                    email: getVal(["EMAIL"]),
                    phone: getVal(["PHONE", "TELEPON", "NO HP"]),
                    photoId: getVal([
                      "PHOTO ID",
                      "PHOTOID",
                      "FOTO KTP",
                      "PHOTOKTP",
                      "PHOTO KTP",
                    ]),
                  };
                }
              }
              return null;
            };

            lovissaRes.values.slice(1).forEach((row: any[], i: number) => {
              const checkInStr =
                checkInIdx > -1 ? row[checkInIdx]?.trim() || "" : "";
              const checkOutStr =
                checkOutIdx > -1 ? row[checkOutIdx]?.trim() || "" : "";
              const durStr = durIdx > -1 ? row[durIdx]?.trim() || "" : "";
              const typeStr = typeIdx > -1 ? row[typeIdx]?.trim() || "" : "";
              let roomStr = roomIdx > -1 ? row[roomIdx]?.trim() || "" : "";
              // Remove "Room " prefix if present
              roomStr = roomStr.replace(/^Room\s+/i, "").trim();

              const priceStr = priceIdx > -1 ? row[priceIdx]?.trim() || "" : "";
              const amountStr =
                amountIdx > -1 ? row[amountIdx]?.trim() || "" : "";
              const ketStr = ketIdx > -1 ? row[ketIdx]?.trim() || "" : "";

              let rawNameStr = nameIdx > -1 ? row[nameIdx]?.trim() || "" : "";
              let contactDetails = findContactDetails(rawNameStr);
              const nameStr = contactDetails?.name || rawNameStr;
              const noIdStr =
                contactDetails?.noId ||
                (noIdIdx > -1 ? row[noIdIdx]?.trim() || "" : "");
              const emailStr =
                contactDetails?.email ||
                (emailIdx > -1 ? row[emailIdx]?.trim() || "" : "");
              const phoneStr =
                contactDetails?.phone ||
                (phoneIdx > -1 ? row[phoneIdx]?.trim() || "" : "");
              const paymentStr =
                paymentIdx > -1 ? row[paymentIdx]?.trim() || "" : "";
              const bookingSourceStr =
                sourceIdx > -1 ? row[sourceIdx]?.trim() || "" : "";
              const photoIdStr =
                contactDetails?.photoId ||
                (photoIdIdx > -1 ? row[photoIdIdx]?.trim() || "" : "");
              const buktiStr = buktiIdx > -1 ? row[buktiIdx]?.trim() || "" : "";
              const printUrl = printIdx > -1 ? row[printIdx]?.trim() || "" : "";

              const priceNum =
                parseFloat(priceStr.replace(/[^0-9.-]/g, "")) || 0;
              const amountNum =
                parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;

              if (checkInStr || nameStr || amountNum > 0) {
                lovissaData.push({
                  checkIn: checkInStr,
                  checkOut: checkOutStr,
                  rawDate: parseDate(checkInStr),
                  dur: durStr,
                  type: typeStr,
                  room: roomStr,
                  price: priceNum,
                  amount: amountNum,
                  keterangan: ketStr,
                  name: nameStr,
                  noId: noIdStr,
                  email: emailStr,
                  phone: phoneStr,
                  payment: paymentStr,
                  bookingSource: bookingSourceStr,
                  photoId: photoIdStr,
                  buktiTransfer: buktiStr,
                  printUrl: printUrl,
                  rowNumber: i + 2,
                  printColLetter: printColLetter,
                });
              }
            });
          }
        }
        setLovissaTransactions(lovissaData);
        
        let lghReportsData: any[] = [];
        if (checkUnit("UNT19", "lovissa")) {
          const lghReportsRes = await getSheetData("lgh daily report!A1:Z500").catch(() => null);
          if (lghReportsRes?.values && lghReportsRes.values.length > 0) {
            const headerRow = (lghReportsRes.values[0] || []).map((h: any) => String(h || '').trim());
            const findHeaderIdx = (...names: string[]) => {
              return headerRow.findIndex((h: string) => {
                const hLower = h.toLowerCase();
                return names.some(n => hLower === n.toLowerCase() || hLower.includes(n.toLowerCase()));
              });
            };

            const mediaHeaderIdx = findHeaderIdx('media', 'foto', 'video', 'lampiran', 'file', 'image', 'bukti');
            const idHeaderIdx = findHeaderIdx('id');
            const areaHeaderIdx = findHeaderIdx('area', 'deskripsi');
            const timeHeaderIdx = findHeaderIdx('tanggal', 'timestamp', 'waktu', 'date');
            const userHeaderIdx = findHeaderIdx('user', 'email', 'pelapor', 'oleh');
            const statusHeaderIdx = findHeaderIdx('status');
            const descHeaderIdx = findHeaderIdx('keterangan', 'chat', 'catatan');

            const currentYear = new Date().getFullYear();
            lghReportsData = lghReportsRes.values.slice(1).map((row: any[], i: number) => {
              const idVal = (idHeaderIdx > -1 ? row[idHeaderIdx] : row[0]) || "";
              const areaVal = (areaHeaderIdx > -1 ? row[areaHeaderIdx] : row[1]) || "";
              const timeVal = (timeHeaderIdx > -1 ? row[timeHeaderIdx] : row[2]) || "";
              const uEmail = (userHeaderIdx > -1 ? row[userHeaderIdx] : row[3]) || "";
              const statusVal = (statusHeaderIdx > -1 ? row[statusHeaderIdx] : row[4]) || "";

              let chat = [];
              let description = (descHeaderIdx > -1 ? row[descHeaderIdx] : row[5]) || "";
              try {
                if (description.trim().startsWith('[') && description.trim().endsWith(']')) {
                  chat = JSON.parse(description);
                  description = '';
                }
              } catch(e) {}

              let mediaRaw = '';
              if (mediaHeaderIdx > -1) {
                mediaRaw = row[mediaHeaderIdx] || '';
              } else if (row[7] && String(row[7]).includes('http')) {
                mediaRaw = row[7];
              } else if (row[6] && String(row[6]).includes('http')) {
                mediaRaw = row[6];
              }

              const files = parseMediaUrls(mediaRaw);

              const parsedLghDate = parseDate(timeVal);
              const lghYear = parsedLghDate ? parsedLghDate.getFullYear() : null;

              return {
                rowIdx: i + 2,
                id: idVal,
                area: areaVal,
                timestamp: timeVal,
                year: lghYear,
                email: uEmail,
                status: statusVal,
                description: description,
                columnG: row[6] || "",
                columnH: row[7] || "",
                columnI: row[8] || "",
                chat: chat,
                files: files
              };
            })
            .filter((r: any) => !r.year || r.year === currentYear)
            .reverse();
          }
        }
        setLghDailyReports(lghReportsData);

        // 9.5 Fetch Transactions for Head Quarter (UNT01)
        let hqData: any[] = [];
        if (checkUnit("UNT01", "head quarter")) {
          const hqRes = await getSheetDataFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "Head Quarter!A1:Z500",
          ).catch(() => null);
          if (hqRes && hqRes.values && hqRes.values.length > 0) {
            const headers = hqRes.values[0] as string[];
            const findHeaderIdx = (keys: string[]) => {
              return headers.findIndex((h) => {
                const normalized = h?.trim().toUpperCase() || "";
                return keys.some(
                  (k) => normalized === k || normalized.includes(k),
                );
              });
            };

            const dateIdx = findHeaderIdx(["DATE", "TANGGAL", "TGL"]);
            const activitiesIdx = findHeaderIdx([
              "ACTIVITIES",
              "ACTIVITY",
              "KEGIATAN",
              "DESKRIPSI",
              "DESCRIPTION",
              "KETERANGAN",
              "KET",
            ]);
            const amountIdx = findHeaderIdx([
              "AMOUNT",
              "JUMLAH",
              "NOMINAL",
              "TOTAL",
              "HARGA",
            ]);
            const clientIdx = findHeaderIdx([
              "CLIENT",
              "KLIEN",
              "PELANGGAN",
              "USER",
              "CUSTOMER",
              "NAMA",
            ]);
            const fileIdx = findHeaderIdx(["FILE", "PHOTO", "FOTO", "IMAGE"]);

            hqRes.values.slice(1).forEach((row: any[]) => {
              const dateStr = dateIdx > -1 ? row[dateIdx] : "";
              if (dateStr) {
                let amt = 0;
                if (amountIdx > -1 && row[amountIdx]) {
                  amt = Number(
                    String(row[amountIdx]).replace(/[^0-9.-]+/g, ""),
                  );
                }
                hqData.push({
                  date: dateStr,
                  rawDate: parseDate(dateStr),
                  activities: activitiesIdx > -1 ? row[activitiesIdx] : "",
                  amount: amt,
                  client: clientIdx > -1 ? row[clientIdx] : "",
                  file: fileIdx > -1 ? row[fileIdx] : "",
                  isHqTx: true,
                });
              }
            });
          }
        }
        setHqTransactions(hqData);

        // 10. Fetch Transactions for Lion Parcel (UNT12)
        let lionParcelData: any[] = [];
        if (checkUnit("UNT12", "lion parcel")) {
          const lionParcelRes = await getSheetDataFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "Lion Parcel!A1:Z500",
          ).catch(() => null);
          if (
            lionParcelRes &&
            lionParcelRes.values &&
            lionParcelRes.values.length > 0
          ) {
            const headers = lionParcelRes.values[0] as string[];
            const dateIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "DATE" ||
                h?.trim().toUpperCase() === "TANGGAL" ||
                h?.trim().toUpperCase() === "TGL",
            );
            const noResiIdx = headers.findIndex((h) => {
              if (!h) return false;
              const normalized = h
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, "");
              return normalized === "NORESI" || normalized === "RESI";
            });
            const layananIdx = headers.findIndex(
              (h) => h?.trim().toUpperCase() === "LAYANAN",
            );
            const tujuanIdx = headers.findIndex(
              (h) => h?.trim().toUpperCase() === "TUJUAN",
            );
            const tarifMasukIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "TARIF MASUK" ||
                h?.trim().toUpperCase() === "TARIF" ||
                h?.trim().toUpperCase() === "TARIF_MASUK" ||
                h?.trim().toUpperCase() === "JUMLAH" ||
                h?.trim().toUpperCase() === "PRICE" ||
                h?.trim().toUpperCase() === "AMOUNT",
            );

            // extra details for popup
            const pengirimIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "NAMA PENGIRIM" ||
                h?.trim().toUpperCase() === "PENGIRIM" ||
                h?.trim().toUpperCase() === "SENDER",
            );
            const beratIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "BERAT" ||
                h?.trim().toUpperCase() === "BERAT (KG)" ||
                h?.trim().toUpperCase() === "WEIGHT",
            );
            const jenisBarangIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "JENIS BARANG" ||
                h?.trim().toUpperCase() === "BARANG" ||
                h?.trim().toUpperCase() === "JENIS",
            );
            const keteranganIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "KETERANGAN" ||
                h?.trim().toUpperCase() === "NOTE" ||
                h?.trim().toUpperCase() === "NOTES",
            );
            const buktiBayarIdx = headers.findIndex(
              (h) =>
                h?.trim().toUpperCase() === "BUKTI BAYAR" ||
                h?.trim().toUpperCase() === "BUKTI" ||
                h?.trim().toUpperCase() === "BUKTI BAYARAN" ||
                h?.trim().toUpperCase() === "PAYMENT PROOF" ||
                h?.trim().toUpperCase() === "FOTO" ||
                h?.trim().toUpperCase() === "BUKTI TRANSFER",
            );
            const caraPembayaranIdx = headers.findIndex((h) => {
              if (!h) return false;
              const normalized = h
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, "");
              return (
                normalized === "CARAPEMBAYARAN" ||
                normalized === "METODEPEMBAYARAN" ||
                normalized === "PEMBAYARAN" ||
                normalized === "PAYMENT" ||
                normalized === "PAYMENTMETHOD" ||
                normalized.includes("PEMBAYARAN") ||
                normalized.includes("PAYMENT")
              );
            });

              lionParcelRes.values.slice(1).forEach((row: any[], index: number) => {
                const dateStr = dateIdx > -1 ? row[dateIdx]?.trim() || "" : "";
                const noResiStr =
                  noResiIdx > -1 ? row[noResiIdx]?.trim() || "" : "";
                const layananStr =
                  layananIdx > -1 ? row[layananIdx]?.trim() || "" : "";
                const tujuanStr =
                  tujuanIdx > -1 ? row[tujuanIdx]?.trim() || "" : "";
                const tarifMasukStr =
                  tarifMasukIdx > -1 ? row[tarifMasukIdx]?.trim() || "" : "";
                const pengirimStr =
                  pengirimIdx > -1 ? row[pengirimIdx]?.trim() || "" : "";
                const beratStr = beratIdx > -1 ? row[beratIdx]?.trim() || "" : "";
                const jenisBarangStr =
                  jenisBarangIdx > -1 ? row[jenisBarangIdx]?.trim() || "" : "";
                const keteranganStr =
                  keteranganIdx > -1 ? row[keteranganIdx]?.trim() || "" : "";
                const buktiBayarStr =
                  buktiBayarIdx > -1 ? row[buktiBayarIdx]?.trim() || "" : "";
                const caraPembayaranStr =
                  caraPembayaranIdx > -1 ? row[caraPembayaranIdx]?.trim() || "" : "";

                const tarifMasukNum =
                  parseFloat(tarifMasukStr.replace(/[^0-9.-]/g, "")) || 0;

                if (dateStr || noResiStr || tarifMasukNum > 0) {
                  lionParcelData.push({
                    date: dateStr,
                    rawDate: parseDate(dateStr, "MM/DD/YYYY"),
                    noResi: noResiStr,
                    layanan: layananStr,
                    tujuan: tujuanStr,
                    tarifMasuk: tarifMasukNum,
                    pengirim: pengirimStr,
                    berat: beratStr,
                    jenisBarang: jenisBarangStr,
                    keterangan: keteranganStr,
                    buktiBayar: buktiBayarStr,
                    caraPembayaran: caraPembayaranStr,
                    rowIndex: index + 2,
                    keteranganColIdx: keteranganIdx,
                  });
                }
              });
          }
        }
        setLionParcelTransactions(lionParcelData);

        // 11. Fetch Transactions for Boganatha (UNT09) / Unit Shopping List
        let boganathaData: any[] = [];
        if (id) {
          const boganathaRes = await getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Pesanan!A1:Z1000",
          ).catch(() => null);
          const detailRes = await getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Detail_Pesanan!A1:Z2000",
          ).catch(() => null);
          const produkRes = await getSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            "Produk!A1:Z1000",
          ).catch(() => null);

          if (
            boganathaRes &&
            boganathaRes.values &&
            boganathaRes.values.length > 0
          ) {
            const headers = boganathaRes.values[0] as string[];

            const getIndex = (names: string[]) => {
              return headers.findIndex((h) => {
                if (!h) return false;
                const normalized = h
                  .trim()
                  .toUpperCase()
                  .replace(/[\s._-]+/g, "");
                return names.some(
                  (n) =>
                    normalized === n.toUpperCase().replace(/[\s._-]+/g, ""),
                );
              });
            };

            const idIdx = getIndex(["ID_PESANAN", "IDPESANAN", "ORDERID"]);
            const dateIdx = getIndex([
              "TANGGAL_PESANAN",
              "TANGGALPESANAN",
              "TANGGAL_PESAN",
              "TANGGALPESAN",
              "TANGGAL",
              "DATE",
            ]);
            const userIdx = getIndex(["USER", "EMAIL", "PELANGGAN"]);
            const totalIdx = getIndex(["TOTAL_BAYAR", "TOTALBAYAR", "TOTAL"]);
            const statusPesananIdx = getIndex([
              "STATUS_PESANAN",
              "STATUSPESANAN",
              "STATUS",
            ]);
            const statusPaidIdx = getIndex(["STATUS_PAID", "STATUSPAID"]);
            const unitIdx = getIndex(["UNIT"]);
            const subtotalIdx = getIndex(["TOTAL_HARGA"]);
            const ongkirIdx = getIndex(["ONGKOS_KIRIM"]);
            const diskonIdx = getIndex(["DISKON"]);
            const voucherIdx = getIndex(["VOUCHER"]);
            const poinIdx = getIndex(["POIN"]);
            const alamatIdx = getIndex(["ALAMAT_KIRIM"]);
            const metodeBayarIdx = getIndex(["METODE_BAYAR", "METODEBAYAR"]);
            const buktiBayarIdx = getIndex(["BUKTI_BAYAR", "BUKTIBAYAR"]);
            const dueDateIdx = getIndex(["DUE_DATE", "DUEDATE"]);
            const timePaidIdx = getIndex(["TIME_PAID", "TIMEPAID"]);
            const invIdx = getIndex(["INV", "INV.", "INVOICE", "BUKTI_INVOICE", "BUKTIINVOICE"]);

            const parsedRows: any[] = [];
            boganathaRes.values
              .slice(1)
              .forEach((row: any[], index: number) => {
                const notaVal = idIdx > -1 ? row[idIdx]?.trim() || "" : "";
                if (!notaVal) return; // skip row if no ID is provided

                const dateVal = dateIdx > -1 ? row[dateIdx]?.trim() || "" : "";
                const clientVal =
                  userIdx > -1 ? row[userIdx]?.trim() || "" : "";
                const statusPesananVal =
                  statusPesananIdx > -1
                    ? row[statusPesananIdx]?.trim() || ""
                    : "";
                const statusPaidVal =
                  statusPaidIdx > -1 ? row[statusPaidIdx]?.trim() || "" : "";
                const totalVal = totalIdx > -1 ? row[totalIdx]?.trim() : "";
                const unitVal = unitIdx > -1 ? row[unitIdx]?.trim() || "" : "";

                const totalNum =
                  parseFloat((totalVal || "").replace(/[^0-9.-]/g, "")) || 0;

                const subtotalVal =
                  subtotalIdx > -1
                    ? parseFloat(String(row[subtotalIdx])) || 0
                    : 0;
                const ongkirVal =
                  ongkirIdx > -1 ? parseFloat(String(row[ongkirIdx])) || 0 : 0;
                const diskonVal =
                  diskonIdx > -1 ? parseFloat(String(row[diskonIdx])) || 0 : 0;
                const voucherVal =
                  voucherIdx > -1
                    ? parseFloat(String(row[voucherIdx])) || 0
                    : 0;
                const poinVal =
                  poinIdx > -1 ? parseFloat(String(row[poinIdx])) || 0 : 0;
                const alamatVal =
                  alamatIdx > -1 ? row[alamatIdx]?.trim() || "" : "";
                const metodeBayarVal =
                  metodeBayarIdx > -1 ? row[metodeBayarIdx]?.trim() || "" : "";
                const buktiBayarVal =
                  buktiBayarIdx > -1 ? row[buktiBayarIdx]?.trim() || "" : "";
                const dueDateVal =
                  dueDateIdx > -1 ? row[dueDateIdx]?.trim() || "" : "";
                const timePaidVal =
                  timePaidIdx > -1 ? row[timePaidIdx]?.trim() || "" : "";
                const invUrlVal =
                  invIdx > -1 ? row[invIdx]?.trim() || "" : "";

                parsedRows.push({
                  rowIndex: index + 2,
                  ongkirColIdx: ongkirIdx,
                  statusPesananColIdx: statusPesananIdx,
                  statusPaidColIdx: statusPaidIdx,
                  totalColIdx: totalIdx,
                  metodeBayarColIdx: metodeBayarIdx,
                  buktiBayarColIdx: buktiBayarIdx,
                  dueDateColIdx: dueDateIdx,
                  timePaidColIdx: timePaidIdx,
                  invColIdx: invIdx,
                  nota: notaVal,
                  idPesanan: notaVal,
                  date: dateVal,
                  tanggal: dateVal,
                  rawDate: parseDate(dateVal),
                  client: clientVal,
                  statusPesanan: statusPesananVal,
                  statusPaid: statusPaidVal,
                  status: statusPesananVal, // fallback mapping
                  unit: unitVal,
                  totalSum: totalNum,
                  total: totalNum,
                  subtotal: subtotalVal,
                  ongkir: ongkirVal,
                  diskon: diskonVal,
                  voucher: voucherVal,
                  poin: poinVal,
                  alamat: alamatVal,
                  alamatKirim: alamatVal,
                  metodeBayar: metodeBayarVal,
                  buktiBayar: buktiBayarVal,
                  dueDate: dueDateVal,
                  timePaid: timePaidVal,
                  invUrl: invUrlVal,
                  items: [],
                });
              });

            // Group parsedRows by "Nota" (They might already be unique, but this makes it a map)
            const groupedMap: { [key: string]: any } = {};
            parsedRows.forEach((row) => {
              groupedMap[row.nota] = row;
            });

            // Populate Items if Details exist
            if (
              detailRes &&
              detailRes.values &&
              detailRes.values.length > 0 &&
              produkRes &&
              produkRes.values &&
              produkRes.values.length > 0
            ) {
              const prodHeaders = produkRes.values[0] as string[];
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
                  h?.trim().toLowerCase().includes("url_gambar") ||
                  h?.trim().toLowerCase().includes("image"),
              );
              const prodHargaIdx = prodHeaders.findIndex(
                (h) => h?.trim().toLowerCase() === "harga",
              );
              const prodSatuanIdx = prodHeaders.findIndex(
                (h) => h?.trim().toLowerCase() === "satuan",
              );

              const prodMap = new Map<string, any>();
              const prodsList: ProductOption[] = [];
              produkRes.values.slice(1).forEach((row: any[]) => {
                const id = prodIdIdx > -1 ? row[prodIdIdx] : null;
                const name = prodNameIdx > -1 ? row[prodNameIdx] : "";
                const image = prodPhotoIdx > -1 ? row[prodPhotoIdx] : "";
                const harga =
                  prodHargaIdx > -1
                    ? parseFloat(String(row[prodHargaIdx])) || 0
                    : 0;
                if (id) {
                  if (name) prodsList.push({ id, name, price: harga, image });
                  prodMap.set(id, {
                    name: name || "-",
                    image: image || "",
                    harga,
                    satuan: prodSatuanIdx > -1 ? row[prodSatuanIdx] : "Pcs",
                  });
                }
              });
              setAllProductsList(prodsList);

              const detHeaders = detailRes.values[0] as string[];
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
              const detIdDetailIdx = detHeaders.findIndex(
                (h) => h?.trim().toLowerCase() === "id_detail",
              );
              const detStatusPesananIdx = detHeaders.findIndex((h) => {
                if (!h) return false;
                const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
                return norm === "statuspesanan" || norm === "statusitem" || norm === "statusdetail" || norm === "status";
              });
              const defaultStatusPesananColIdx = detStatusPesananIdx > -1 ? detStatusPesananIdx : 10;

              detailRes.values.slice(1).forEach((row: any[], index: number) => {
                const orderId = detOrderIdIdx > -1 ? row[detOrderIdIdx] : null;
                if (orderId && groupedMap[orderId]) {
                  const prodId = detProdIdIdx > -1 ? row[detProdIdIdx] : null;
                  const product = prodId ? prodMap.get(prodId) : null;
                  const productName = product?.name || "Unknown Product";
                  const itemStatusPesanan = detStatusPesananIdx > -1 && row[detStatusPesananIdx] ? row[detStatusPesananIdx]?.trim() || "" : "";
                  groupedMap[orderId].items.push({
                    rowIndex: index + 2,
                    idDetail: detIdDetailIdx > -1 ? row[detIdDetailIdx] : "",
                    priceColIdx: detPriceIdx,
                    statusKirimColIdx: detStatusKirimIdx,
                    statusPesananColIdx: defaultStatusPesananColIdx,
                    statusPesanan: itemStatusPesanan,
                    penerimaColIdx: detPenerimaIdx,
                    timestampColIdx: detTimestampIdx,
                    photoColIdx: detPhotoIdx,
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
                    photo:
                      detPhotoIdx > -1 ? row[detPhotoIdx]?.trim() || "" : "",
                    prodId,
                    name: productName,
                    image: product?.image || "",
                    item: productName,
                    qty:
                      detQtyIdx > -1
                        ? parseFloat(String(row[detQtyIdx])) || 0
                        : 0,
                    uom: product?.satuan || "Pcs",
                    satuan: product?.satuan || "Pcs",
                    price:
                      product?.harga ||
                      (detPriceIdx > -1
                        ? parseFloat(String(row[detPriceIdx])) || 0
                        : 0),
                    amount:
                      detSubtotalIdx > -1
                        ? parseFloat(String(row[detSubtotalIdx])) || 0
                        : 0,
                    subtotal:
                      detSubtotalIdx > -1
                        ? parseFloat(String(row[detSubtotalIdx])) || 0
                        : 0,
                    biayaLain: 0,
                    total:
                      detSubtotalIdx > -1
                        ? parseFloat(String(row[detSubtotalIdx])) || 0
                        : 0,
                  });
                }
              });
            }

            boganathaData = Object.values(groupedMap);
          }
        }
        setBoganathaTransactions(boganathaData);
      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    if (location.state && lghDailyReports.length > 0) {
      const st = location.state as { openLghReportId?: string; rowIdx?: number; id?: string };
      const targetId = st.openLghReportId || st.id;
      const found = lghDailyReports.find(
        (r) => (targetId && r.id === targetId) || (st.rowIdx && r.rowIdx === st.rowIdx)
      );
      if (found) {
        setSelectedLghReport(found);
        setExpandLghDailyReport(true);
      }
    }
  }, [location.state, lghDailyReports]);

  const handleUpdateOngkir = async (newVal: string) => {
    if (!selectedTransaction || selectedTransaction.ongkirColIdx == null)
      return;
    const numericVal = parseFloat(newVal.replace(/[^0-9]/g, "")) || 0;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.ongkirColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[numericVal]],
      );

      const updatedTx = { ...selectedTransaction, ongkir: numericVal };
      updatedTx.total =
        updatedTx.subtotal +
        numericVal -
        updatedTx.diskon -
        updatedTx.voucher -
        updatedTx.poin;
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleUpdateLionParcelKeterangan = async (newKeterangan: string) => {
    if (!selectedTransaction || selectedTransaction.keteranganColIdx == null || selectedTransaction.rowIndex == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.keteranganColIdx);
      const range = `Lion Parcel!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
        range,
        [[newKeterangan]],
      );

      const updatedTx = { ...selectedTransaction, keterangan: newKeterangan };
      setSelectedTransaction(updatedTx);
      setLionParcelTransactions((prev) =>
        prev.map((tx) => (tx.noResi === updatedTx.noResi && tx.rowIndex === updatedTx.rowIndex ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleUpdateHargaSatuan = async (
    rowIndex: number,
    colIdx: number,
    newVal: string,
    itemIdx: number,
  ) => {
    if (!selectedTransaction) return;
    const numericVal = parseFloat(newVal.replace(/[^0-9]/g, "")) || 0;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(colIdx);
      const range = `Detail_Pesanan!${colLetter}${rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[numericVal]],
      );

      // Also update subtotal column in Detail_Pesanan
      const detRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Detail_Pesanan!A1:Z1",
      ).catch(() => null);
      if (detRes?.values?.length > 0) {
        const headers = detRes.values[0] as string[];
        const subtotalIdx = headers.findIndex((h) => {
          const norm = (h || "")
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          return ["SUBTOTAL", "TOTAL", "TOTAL_HARGA"].includes(norm);
        });
        if (subtotalIdx > -1) {
          const subtotalColLetter = getColLetter(subtotalIdx);
          const subtotalRange = `Detail_Pesanan!${subtotalColLetter}${rowIndex}`;
          const computedSubtotal = numericVal * (selectedTransaction.items[itemIdx]?.qty || 1);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            subtotalRange,
            [[computedSubtotal]],
          );
        }
      }

      const newItems = [...selectedTransaction.items];
      newItems[itemIdx] = { ...newItems[itemIdx], price: numericVal };
      newItems[itemIdx].subtotal = numericVal * newItems[itemIdx].qty;
      newItems[itemIdx].amount = numericVal * newItems[itemIdx].qty;

      let newSubtotal = 0;
      newItems.forEach((i) => (newSubtotal += i.subtotal));

      const updatedTx = {
        ...selectedTransaction,
        items: newItems,
        subtotal: newSubtotal,
      };
      const finalTotal =
        newSubtotal +
        updatedTx.ongkir -
        updatedTx.diskon -
        updatedTx.voucher -
        updatedTx.poin;
      updatedTx.total = finalTotal;
      updatedTx.totalSum = finalTotal;

      // Update Pesanan sheet SUBTOTAL (TOTAL_HARGA) & TOTAL_BAYAR!
      const pesananRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Pesanan!A1:Z1000",
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
          const pesRowIndex = pesananRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === selectedTransaction.nota,
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

      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleLghChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lghChatInput.trim() || !selectedLghReport) return;
    
    setIsLghUpdating(true);
    try {
      const now = new Date();
      const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      const newChat = {
        email: currentUserEmail,
        message: lghChatInput.trim(),
        timestamp
      };
      
      const currentChat = selectedLghReport.chat || [];
      const updatedChat = [...currentChat, newChat];
      const chatJson = JSON.stringify(updatedChat);
      
      await updateSheetData(`lgh daily report!F${selectedLghReport.rowIdx}`, [[chatJson]]);
      
      const updatedReport = { ...selectedLghReport, chat: updatedChat };
      setSelectedLghReport(updatedReport);
      setLghDailyReports((prev) =>
        prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
      );
      setLghChatInput("");
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pesan.");
    } finally {
      setIsLghUpdating(false);
    }
  };

  const handleLghDone = async () => {
    if (!selectedLghReport) return;
    setIsLghUpdating(true);
    try {
      await updateSheetData(`lgh daily report!E${selectedLghReport.rowIdx}`, [["Done"]]);
      const updatedReport = { ...selectedLghReport, status: "Done" };
      setSelectedLghReport(updatedReport);
      setLghDailyReports((prev) =>
        prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
      );
      
      const userObj = getSystemUserByEmail(selectedLghReport.email);
      let userName = userObj?.name;
      if (!userName || userName === "User" || userName.includes("@")) {
        const currentObj = getSystemUserByEmail(currentUserEmail);
        userName = currentObj?.name;
      }
      if (!userName || userName === "User" || userName.includes("@")) {
        const emailToUse = selectedLghReport.email || currentUserEmail || "";
        const prefix = emailToUse.includes("@") ? emailToUse.split("@")[0] : emailToUse;
        if (prefix.toLowerCase().includes("putu") || prefix.toLowerCase().includes("prawina")) {
          userName = "Putu";
        } else if (prefix.toLowerCase().includes("hanif") || prefix.toLowerCase().includes("abdhan")) {
          userName = "Hanif";
        } else if (prefix) {
          userName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        } else {
          userName = "User";
        }
      }

      const areaKolomB = selectedLghReport.area || "";

      await logActivity(
        "Status Update",
        "LGH Daily Report",
        `Request cleaning "${areaKolomB}" | ${userName} | Done`
      );
    } catch (err) {
      console.error(err);
      alert("Gagal merubah status.");
    } finally {
      setIsLghUpdating(false);
    }
  };

  const generateAndUploadInvoice = async (): Promise<string | null> => {
    const element = autoInvoiceRef.current || invoiceRef.current;
    if (!element) {
      console.warn("No invoice element found for capture.");
      return null;
    }
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const actualWidth = 380;
      const actualHeight = element.scrollHeight || 600;
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        width: actualWidth,
        height: actualHeight,
        quality: 0.9,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          width: `${actualWidth}px`,
          height: `${actualHeight}px`,
          maxWidth: "none",
          transform: "none",
          margin: "0",
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Invoice-Auto-${selectedTransaction?.nota || "order"}.png`, {
        type: "image/png",
      });

      const uploadRes = await DriveService.uploadFile(file);
      return uploadRes.url;
    } catch (err) {
      console.error("Failed to generate and upload auto invoice:", err);
      return null;
    }
  };

  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingImage(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = invoiceRef.current;
      const actualWidth = element.offsetWidth || 380;
      const actualHeight = element.scrollHeight;
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        width: actualWidth,
        height: actualHeight,
        quality: 1.0,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          width: `${actualWidth}px`,
          height: `${actualHeight}px`,
          maxWidth: "none",
          transform: "none",
          margin: "0",
        },
      });
      const link = document.createElement("a");
      link.download = `Invoice-Boganatha-${selectedTransaction?.nota || "order"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Error generating invoice PNG:", err);
      alert("Gagal mengunduh invoice: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const shareInvoice = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingImage(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const element = invoiceRef.current;
      const actualWidth = element.offsetWidth || 380;
      const actualHeight = element.scrollHeight;
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        width: actualWidth,
        height: actualHeight,
        quality: 1.0,
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          width: `${actualWidth}px`,
          height: `${actualHeight}px`,
          maxWidth: "none",
          transform: "none",
          margin: "0",
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `Invoice-Boganatha-${selectedTransaction?.nota || "order"}.png`, {
        type: "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice Boganatha - ${selectedTransaction?.nota}`,
          text: `Berikut adalah invoice pesanan Boganatha dengan nomor nota ${selectedTransaction?.nota}.`,
        });
      } else {
        try {
          await navigator.clipboard.writeText(selectedTransaction?.nota || "");
          alert("Sharing tidak didukung pada peramban ini. Nomor nota telah disalin ke papan klip.");
        } catch {
          alert("Sharing tidak didukung pada peramban ini.");
        }
      }
    } catch (err: any) {
      console.error("Error sharing invoice:", err);
      alert("Gagal membagikan invoice: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSetToReview = async () => {
    if (!selectedTransaction || selectedTransaction.statusPesananColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.statusPesananColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["REVIEW"]],
      );

      if (
        selectedTransaction.totalColIdx != null &&
        selectedTransaction.totalColIdx > -1
      ) {
        const totalColLetter = getColLetter(selectedTransaction.totalColIdx);
        const totalRange = `Pesanan!${totalColLetter}${selectedTransaction.rowIndex}`;
        await updateSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          totalRange,
          [[selectedTransaction.total]],
        );
      }

      const updatedTx = {
        ...selectedTransaction,
        status: "REVIEW",
        statusPesanan: "REVIEW",
      };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleUpdateItemStatus = async (item: any, newStatus: string) => {
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

    if (selectedTransaction) {
      const updatedItems = (selectedTransaction.items || []).map((it: any) => {
        if (it.rowIndex === item.rowIndex || (it.prodId && it.prodId === item.prodId)) {
          return { ...it, statusPesanan: newStatus, statusPesananColIdx: colIdx };
        }
        return it;
      });
      const updatedTx = { ...selectedTransaction, items: updatedItems };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((t) => (t.nota === updatedTx.nota ? updatedTx : t)),
      );
    }
  };

  const handleCancelDeleteProductItem = async (item: any) => {
    if (!item || !selectedTransaction) return;
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
          const currentOrderId = selectedTransaction?.idPesanan || selectedTransaction?.nota;
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

      const updatedItems = (selectedTransaction.items || []).filter((it: any) => {
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

      const newSubtotal = updatedItems.reduce(
        (acc: number, it: any) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)),
        0
      );
      const ongkir = Number(selectedTransaction.ongkir) || 0;
      const diskon = Number(selectedTransaction.diskon) || 0;
      const voucher = Number(selectedTransaction.voucher) || 0;
      const poin = Number(selectedTransaction.poin) || 0;
      const finalTotal = Math.max(0, newSubtotal + ongkir - diskon - voucher - poin);

      const updatedTx = {
        ...selectedTransaction,
        items: updatedItems,
        subtotal: newSubtotal,
        total: finalTotal,
        totalSum: finalTotal,
      };

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
          const currentOrderId = selectedTransaction.idPesanan || selectedTransaction.nota;
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

      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((t) => (t.nota === updatedTx.nota ? updatedTx : t)),
      );
    } catch (err) {
      console.error("Failed to delete and shift row in Detail_Pesanan:", err);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetToSend = async () => {
    if (!selectedTransaction || selectedTransaction.statusPesananColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const isReview = selectedTransaction.statusPesanan?.toUpperCase() === "REVIEW" || selectedTransaction.status?.toUpperCase() === "REVIEW";
      const targetStatus = isReview ? "REVIEW" : "SEND";
      const colLetter = getColLetter(selectedTransaction.statusPesananColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[targetStatus]],
      );

      const updatedTx = {
        ...selectedTransaction,
        status: targetStatus,
        statusPesanan: targetStatus,
      };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSaveAddProducts = async (draftItems: DraftProductItem[]) => {
    if (!selectedTransaction || draftItems.length === 0) return;
    const orderId = selectedTransaction.idPesanan || selectedTransaction.nota;

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
    const currentItems = [...(selectedTransaction.items || [])];

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

      currentItems.push({
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

    const newSubtotal = currentItems.reduce(
      (acc: number, it: any) => acc + ((Number(it.qty) || 0) * (Number(it.price) || 0)),
      0
    );
    const ongkir = Number(selectedTransaction.ongkir) || 0;
    const diskon = Number(selectedTransaction.diskon) || 0;
    const voucher = Number(selectedTransaction.voucher) || 0;
    const poin = Number(selectedTransaction.poin) || 0;
    const finalTotal = Math.max(0, newSubtotal + ongkir - diskon - voucher - poin);

    const updatedTx = {
      ...selectedTransaction,
      items: currentItems,
      subtotal: newSubtotal,
      total: finalTotal,
      totalSum: finalTotal,
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
          const currentOrderId = selectedTransaction.idPesanan || selectedTransaction.nota;
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

    setSelectedTransaction(updatedTx);
    setBoganathaTransactions((prev) =>
      prev.map((t) => (t.nota === updatedTx.nota ? updatedTx : t)),
    );
  };

  const handleSetToProcess = async () => {
    if (!selectedTransaction || selectedTransaction.statusPesananColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.statusPesananColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["PROCESS"]],
      );

      const updatedTx = {
        ...selectedTransaction,
        status: "PROCESS",
        statusPesanan: "PROCESS",
      };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetMetodeBayar = async (metode: string) => {
    if (!selectedTransaction || selectedTransaction.metodeBayarColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.metodeBayarColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[metode]],
      );

      const updatedTx = { ...selectedTransaction, metodeBayar: metode };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetStatusKirim = async (itemIdx: number) => {
    if (!selectedTransaction) return;
    const item = selectedTransaction.items[itemIdx];
    if (item.statusKirimColIdx == null) return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(item.statusKirimColIdx);
      const range = `Detail_Pesanan!${colLetter}${item.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["Terkirim"]],
      );

      const newItems = [...selectedTransaction.items];
      newItems[itemIdx] = { ...item, statusKirim: "Terkirim" };
      const updatedTx = { ...selectedTransaction, items: newItems };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetDiTerima = async (blob: Blob) => {
    if (openCameraForItemIdx === null || !selectedTransaction) return;
    const itemIdx = openCameraForItemIdx;
    const item = selectedTransaction.items[itemIdx];
    if (
      item.statusKirimColIdx == null ||
      item.penerimaColIdx == null ||
      item.timestampColIdx == null ||
      item.photoColIdx == null
    )
      return;

    setIsUpdatingTx(true);
    setOpenCameraForItemIdx(null); // close camera
    try {
      // get user
      let penerimaEmail = localStorage.getItem("mtask_user_email");
      if (!penerimaEmail) {
        const user = await getCurrentUser();
        penerimaEmail = user?.email || "Unknown User";
      }

      // format date as mm/dd/yyyy
      const now = new Date();
      const formattedDate = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;

      // upload photo
      const { url } = await DriveService.uploadFile(
        new File([blob], "photo.jpg", { type: "image/jpeg" }),
      );

      // update sheet (multiple columns)
      const maxColIdx = Math.max(
        item.statusKirimColIdx,
        item.penerimaColIdx,
        item.timestampColIdx,
        item.photoColIdx,
      );
      const minColIdx = Math.min(
        item.statusKirimColIdx,
        item.penerimaColIdx,
        item.timestampColIdx,
        item.photoColIdx,
      );

      const colRangeStr = `${getColLetter(minColIdx)}${item.rowIndex}:${getColLetter(maxColIdx)}${item.rowIndex}`;

      // We will do single updates to be safe
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Detail_Pesanan!${getColLetter(item.statusKirimColIdx)}${item.rowIndex}`,
        [["Di Terima"]],
      );
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Detail_Pesanan!${getColLetter(item.penerimaColIdx)}${item.rowIndex}`,
        [[penerimaEmail]],
      );
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Detail_Pesanan!${getColLetter(item.timestampColIdx)}${item.rowIndex}`,
        [[formattedDate]],
      );
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Detail_Pesanan!${getColLetter(item.photoColIdx)}${item.rowIndex}`,
        [[url]],
      );

      const newItems = [...selectedTransaction.items];
      newItems[itemIdx] = {
        ...item,
        statusKirim: "Di Terima",
        penerima: penerimaEmail,
        timestamp: formattedDate,
        photo: url,
      };
      const updatedTx = { ...selectedTransaction, items: newItems };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetPesananDone = async () => {
    if (!selectedTransaction || selectedTransaction.statusPesananColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);

      // 1. Generate and upload invoice image to Supabase Storage
      let uploadedInvoiceUrl = "";
      try {
        uploadedInvoiceUrl = await generateAndUploadInvoice() || "";
      } catch (uploadErr) {
        console.error("Error during auto invoice generation/upload:", uploadErr);
      }

      // 2. Prepare update statements
      const colLetterStatus = getColLetter(selectedTransaction.statusPesananColIdx);
      const rangeStatus = `Pesanan!${colLetterStatus}${selectedTransaction.rowIndex}`;
      const updatePromises: Promise<any>[] = [
        updateSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          rangeStatus,
          [["DONE"]],
        )
      ];

      // 3. Write INV Url to Sheet if index is valid
      if (uploadedInvoiceUrl && selectedTransaction.invColIdx != null && selectedTransaction.invColIdx > -1) {
        const colLetterInv = getColLetter(selectedTransaction.invColIdx);
        const rangeInv = `Pesanan!${colLetterInv}${selectedTransaction.rowIndex}`;
        updatePromises.push(
          updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            rangeInv,
            [[uploadedInvoiceUrl]],
          )
        );
      }

      await Promise.all(updatePromises);

      const updatedTx = {
        ...selectedTransaction,
        status: "DONE",
        statusPesanan: "DONE",
        invUrl: uploadedInvoiceUrl || selectedTransaction.invUrl,
      };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetPaid = async () => {
    if (
      !selectedTransaction ||
      selectedTransaction.statusPaidColIdx == null ||
      selectedTransaction.timePaidColIdx == null
    )
      return;
    try {
      setIsUpdatingTx(true);
      const now = new Date();
      const formattedTimestamp = `${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const colLetterStatus = getColLetter(
        selectedTransaction.statusPaidColIdx,
      );
      const colLetterTime = getColLetter(selectedTransaction.timePaidColIdx);

      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Pesanan!${colLetterStatus}${selectedTransaction.rowIndex}`,
        [["PAID"]],
      );
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `Pesanan!${colLetterTime}${selectedTransaction.rowIndex}`,
        [[formattedTimestamp]],
      );

      const updatedTx = {
        ...selectedTransaction,
        statusPaid: "PAID",
        timePaid: formattedTimestamp,
      };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetDueDate = async (date: string) => {
    if (!selectedTransaction || selectedTransaction.dueDateColIdx == null)
      return;
    let formattedDate = date;
    if (date) {
      const [y, m, d] = date.split("-");
      if (y && m && d) formattedDate = `${m}/${d}/${y}`;
    }

    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.dueDateColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[formattedDate]],
      );

      const updatedTx = { ...selectedTransaction, dueDate: formattedDate };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetBuktiBayar = async (url: string) => {
    if (!selectedTransaction || selectedTransaction.buktiBayarColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.buktiBayarColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [[url]],
      );

      const updatedTx = { ...selectedTransaction, buktiBayar: url };
      setSelectedTransaction(updatedTx);
      setBoganathaTransactions((prev) =>
        prev.map((tx) => (tx.nota === updatedTx.nota ? updatedTx : tx)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedTransaction) return;
    setIsPdfLoading(true);
    try {
      const {
        name = "-",
        noId = "-",
        checkIn = "-",
        checkOut = "-",
        room = "-",
        dur = "-",
        type = "",

        email = "-",
        phone = "-",
        bookingSource = "-",
        price = 0,
        amount = 0,
        payment = "-",
        keterangan = "-",
        rowNumber,
      } = selectedTransaction;

      // Initialize jsPDF A4 layout
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // 1. Sleek Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("TRANSACTION RECEIPT", 105, 20, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text("LOVISSA GUESTHOUSE - BALI", 105, 25, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        `Lovissa ID Reference: UNT19-R${room || "Kamar"}-${rowNumber || "Doc"}`,
        105,
        30,
        { align: "center" },
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 34, 190, 34);

      // 2. Sections - Guest Details
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("REGISTRATION & GUEST DETAILS", 20, 45);
      doc.line(20, 47, 190, 47);

      doc.setFontSize(9);
      doc.setFont("Helvetica", "bold");
      doc.text("Full Name:", 20, 54);
      doc.setFont("Helvetica", "normal");
      doc.text(name || "-", 60, 54);

      doc.setFont("Helvetica", "bold");
      doc.text("ID / Passport Number:", 20, 60);
      doc.setFont("Helvetica", "normal");
      doc.text(noId || "-", 60, 60);

      doc.setFont("Helvetica", "bold");
      doc.text("WhatsApp / Phone:", 20, 66);
      doc.setFont("Helvetica", "normal");
      doc.text(phone || "-", 60, 66);

      doc.setFont("Helvetica", "bold");
      doc.text("Email Address:", 20, 72);
      doc.setFont("Helvetica", "normal");
      doc.text(email || "-", 60, 72);

      // 3. Stay Period Info
      doc.setFont("Helvetica", "bold");
      doc.text("STAY PERIOD DETAILS", 20, 82);
      doc.line(20, 84, 190, 84);

      doc.setFont("Helvetica", "bold");
      doc.text("Stay Period:", 20, 90);
      doc.setFont("Helvetica", "normal");
      doc.text(`${checkIn || "-"} s/d ${checkOut || "-"}`, 60, 90);

      doc.setFont("Helvetica", "bold");
      doc.text("Room Assigned:", 20, 96);
      doc.setFont("Helvetica", "normal");
      doc.text(`Room ${room || "-"}`, 60, 96);

      doc.setFont("Helvetica", "bold");
      doc.text("Duration of Stay:", 20, 102);
      doc.setFont("Helvetica", "normal");
      doc.text(`${dur || "-"} ${type || "Malam"}`, 60, 102);

      doc.setFont("Helvetica", "bold");
      doc.text("Price per Night:", 20, 108);
      doc.setFont("Helvetica", "normal");
      doc.text(`Rp ${price.toLocaleString("id-ID")}`, 60, 108);

      if (bookingSource && bookingSource !== "-") {
        doc.setFont("Helvetica", "bold");
        doc.text("Booking Source:", 120, 108);
        doc.setFont("Helvetica", "normal");
        doc.text(bookingSource, 155, 108);
      }

      // 4. Payment Block (Emerald Styled Backdrop)
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 116, 170, 12, "F");
      doc.setDrawColor(241, 245, 249);
      doc.rect(20, 116, 170, 12, "S");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(6, 78, 59); // emerald-900
      doc.text(`TOTAL AMOUNT PAID via ${payment.toUpperCase()}:`, 24, 124);
      doc.text(`Rp ${amount.toLocaleString("id-ID")}`, 186, 124, {
        align: "right",
      });

      // 5. Notes Segment
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("NOTES / EXTRA DETAILS", 20, 138);
      doc.line(20, 140, 190, 140);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const splitNote = doc.splitTextToSize(
        keterangan || "Tidak ada keterangan tambahan.",
        170,
      );
      doc.text(splitNote, 20, 146);

      // 6. Styled Signature Areas
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Guest Signature,", 35, 190);
      doc.line(30, 220, 75, 220);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text(name, 52.5, 224, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Management Officer,", 135, 190);
      doc.line(130, 220, 175, 220);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Lovissa Guest House", 152.5, 224, { align: "center" });

      // Decorative Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        "Thank you for choosing Lovissa Guesthouse Bali. Have a beautiful day!",
        105,
        280,
        { align: "center" },
      );

      // Save locally to user's browser
      doc.save(`Lovissa_Receipt_R${room}_${name.replace(/\s+/g, "_")}.pdf`);

      // Convert to blob and Upload via DriveService
      const pdfBlob = doc.output("blob");
      const pdfFile = new File(
        [pdfBlob],
        `Lovissa_Receipt_R${room}_${Date.now()}.pdf`,
        { type: "application/pdf" },
      );

      let finalPdfUrl = "";
      try {
        const uploadRes = await DriveService.uploadFile(pdfFile);
        if (uploadRes && uploadRes.url) {
          finalPdfUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        console.warn(
          "Google Drive Upload failed, but local copy downloaded.",
          uploadErr,
        );
      }

      // Synchronize back to "Lovissa Guest House" spreadsheet inside column "Print"
      if (rowNumber) {
        let colLetter = selectedTransaction.printColLetter;
        if (!colLetter) {
          // Fallback to fetch sheet headers and locate 'Print' index dynamically
          const lovissaRes = await getSheetData(
            "Lovissa Guest House!A1:Z500",
          ).catch(() => null);
          if (lovissaRes && lovissaRes.values && lovissaRes.values.length > 0) {
            const headers = lovissaRes.values[0] as string[];
            let printIdx = headers.findIndex(
              (h) => h?.trim().toUpperCase() === "PRINT",
            );
            if (printIdx === -1) {
              printIdx = headers.length;
              headers.push("Print");
              const getColLetter = (n: number) => {
                let res = "";
                while (n >= 0) {
                  res = String.fromCharCode((n % 26) + 65) + res;
                  n = Math.floor(n / 26) - 1;
                }
                return res;
              };
              const range = `Lovissa Guest House!A1:${getColLetter(headers.length - 1)}1`;
              await updateSheetData(range, [headers]).catch(() => {});
            }
            const getColLetter = (n: number) => {
              let res = "";
              while (n >= 0) {
                res = String.fromCharCode((n % 26) + 65) + res;
                n = Math.floor(n / 26) - 1;
              }
              return res;
            };
            colLetter = getColLetter(printIdx);
          } else {
            colLetter = "P"; // reasonable default for print column mapping
          }
        }

        const valueToSave = finalPdfUrl || "Printed Receipt PDF";
        const targetCell = `Lovissa Guest House!${colLetter}${rowNumber}`;
        await updateSheetData(targetCell, [[valueToSave]]);

        // Refresh State live
        setSelectedTransaction((prev: any) =>
          prev ? { ...prev, printUrl: valueToSave } : null,
        );
        setLovissaTransactions((prev: any[]) =>
          prev.map((t) =>
            t.rowNumber === rowNumber ? { ...t, printUrl: valueToSave } : t,
          ),
        );
        alert(
          "Receipt PDF berhasil diunduh dan disinkronisasikan ke kolom Print Google Sheet!",
        );
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Gagal menghasilkan PDF atau menyimpannya ke Google Sheets.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const isChillhubSurabaya =
    id?.trim().toUpperCase() === "UNT15" ||
    (unit?.name || "").toLowerCase().includes("chillhub");
  const isHeadQuarter =
    id?.trim().toUpperCase() === "UNT01" ||
    (unit?.name || "").toLowerCase().includes("head quarter");
  const isLovissaGuestHouse =
    id?.trim().toUpperCase() === "UNT19" ||
    (unit?.name || "").toLowerCase().includes("lovissa");
  const isLionParcel =
    id?.trim().toUpperCase() === "UNT12" ||
    (unit?.name || "").toLowerCase().includes("lion parcel");
  const isBoganatha =
    id?.trim().toUpperCase() === "UNT09" ||
    (unit?.name || "").toLowerCase().includes("boganatha");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium">Memuat Unit...</p>
        </div>
      </div>
    );
  }

  if (!unit && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Unit tidak ditemukan
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>
    );
  }

  const doneTasks = tasks.filter((t) => {
    const s = (t.status || "").toLowerCase();
    return (
      s.includes("done") || s.includes("complete") || s.includes("selesai")
    );
  }).length;

  const doneIssues = issues.filter((i) => {
    const s = (i.status || "").toLowerCase();
    return (
      s.includes("done") ||
      s.includes("complete") ||
      s.includes("selesai") ||
      s.includes("resolved") ||
      s.includes("closed")
    );
  }).length;

  const visibleLghDailyReports = lghDailyReports.filter(
    (report) => (report.status || "").trim().toLowerCase() !== "done"
  );

  // Find the latest valid sale date or default to current date
  let referenceDate = new Date();

  // We can search for month or year in Chillhub Surabaya (UNT15) or Lovissa (UNT19)
  let searchedYear = referenceDate.getFullYear();
  let searchedMonth = referenceDate.getMonth(); // 0-indexed
  let isMonthSearched = false;
  let isYearSearched = false;

  if (revenueSearchQuery.trim()) {
    const query = revenueSearchQuery.trim().toLowerCase();

    // Check for 4 digit year
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      searchedYear = parseInt(yearMatch[1], 10);
      isYearSearched = true;
    }

    // Check for month names in Indonesian and English
    const monthsEng = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const monthsInd = [
      "jan",
      "peb",
      "mar",
      "apr",
      "mei",
      "jun",
      "jul",
      "agu",
      "sep",
      "okt",
      "nov",
      "des",
    ];
    const monthsFullEng = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const monthsFullInd = [
      "januari",
      "februari",
      "maret",
      "april",
      "mei",
      "juni",
      "juli",
      "agustus",
      "september",
      "oktober",
      "november",
      "desember",
    ];

    let foundMonth = -1;
    const words = query.split(/[\s,.-]+/);
    for (const word of words) {
      const num = parseInt(word, 10);
      if (!isNaN(num) && num >= 1 && num <= 12 && word.length <= 2) {
        foundMonth = num - 1;
        break;
      }

      const idxFullEng = monthsFullEng.findIndex(
        (m) => m.startsWith(word) || word.startsWith(m),
      );
      if (idxFullEng > -1) {
        foundMonth = idxFullEng;
        break;
      }
      const idxFullInd = monthsFullInd.findIndex(
        (m) => m.startsWith(word) || word.startsWith(m),
      );
      if (idxFullInd > -1) {
        foundMonth = idxFullInd;
        break;
      }
      const idxEng = monthsEng.findIndex(
        (m) => m.startsWith(word) || word.startsWith(m),
      );
      if (idxEng > -1) {
        foundMonth = idxEng;
        break;
      }
      const idxInd = monthsInd.findIndex(
        (m) => m.startsWith(word) || word.startsWith(m),
      );
      if (idxInd > -1) {
        foundMonth = idxInd;
        break;
      }
    }

    if (foundMonth > -1) {
      searchedMonth = foundMonth;
      isMonthSearched = true;
    }
  }

  // Shared filter helper function
  const filterByDate = (rawDate: Date | null | undefined) => {
    if (!rawDate) return false;
    const sYear = rawDate.getFullYear();
    const sMonth = rawDate.getMonth();

    if (revenueSearchQuery.trim()) {
      if (isMonthSearched) {
        return sYear === searchedYear && sMonth === searchedMonth;
      } else {
        // Either year is searched, OR neither year nor month were matched in text (so we fallback to default year)
        return sYear === searchedYear;
      }
    } else {
      // Default behavior if no search query: return current year
      return sYear === new Date().getFullYear();
    }
  };

  // Filter sales list based on search or default year
  const filteredSales = isChillhubSurabaya
    ? chillhubSales.filter((sale) => {
        let match = filterByDate(sale.rawDate);
        if (salesSearchQuery.trim()) {
          const q = salesSearchQuery.trim().toLowerCase();
          match =
            match &&
            ((sale.activity && sale.activity.toLowerCase().includes(q)) ||
              (sale.userEmail && sale.userEmail.toLowerCase().includes(q)) ||
              (sale.price && sale.price.toString().includes(q)));
        }
        return match;
      })
    : [];

  // Filter Lovissa transactions based on search or default year
  const filteredLovissaTrans = isLovissaGuestHouse
    ? lovissaTransactions.filter((t) => filterByDate(t.rawDate))
    : [];

  // Filter Head Quarter transactions
  const filteredHqTrans = isHeadQuarter
    ? hqTransactions.filter((t) => {
        let match = filterByDate(t.rawDate);
        if (hqSearch.trim()) {
          const q = hqSearch.trim().toLowerCase();
          match =
            match &&
            ((t.activities && t.activities.toLowerCase().includes(q)) ||
              (t.client && t.client.toLowerCase().includes(q)));
        }
        return match;
      })
    : [];

  // Filter Lion Parcel transactions based on search or default year, with text search override
  const filteredLionParcelTrans = isLionParcel
    ? lionParcelTransactions.filter((t) => {
        if (lionParcelSearch.trim()) {
          const q = lionParcelSearch.trim().toLowerCase();
          return (
            (t.noResi && t.noResi.toLowerCase().includes(q)) ||
            (t.layanan && t.layanan.toLowerCase().includes(q)) ||
            (t.caraPembayaran && t.caraPembayaran.toLowerCase().includes(q)) ||
            (t.tujuan && t.tujuan.toLowerCase().includes(q)) ||
            (t.pengirim && t.pengirim.toLowerCase().includes(q)) ||
            (t.jenisBarang && t.jenisBarang.toLowerCase().includes(q)) ||
            (t.date && t.date.toLowerCase().includes(q))
          );
        }
        return filterByDate(t.rawDate);
      })
    : [];

  // Filter Boganatha transactions based on search, filters, or default year
  const filteredBoganathaTrans = isBoganatha
    ? boganathaTransactions.filter((t) => {
        let match = filterByDate(t.rawDate);
        if (boganathaSearch.trim()) {
          const q = boganathaSearch.trim().toLowerCase();
          match =
            match &&
            ((t.nota && t.nota.toLowerCase().includes(q)) ||
              (t.client && t.client.toLowerCase().includes(q)) ||
              (t.unit && t.unit.toLowerCase().includes(q)));
        }
        if (boganathaFilterStatusPesanan !== "All") {
          match =
            match &&
            t.statusPesanan?.toLowerCase() ===
              boganathaFilterStatusPesanan.toLowerCase();
        }
        if (boganathaFilterUnit !== "All") {
          match =
            match &&
            t.unit?.toLowerCase() === boganathaFilterUnit.toLowerCase();
        }
        if (boganathaFilterStatusPaid !== "All") {
          const isPaid = t.statusPaid?.trim().toLowerCase() === "paid";
          if (boganathaFilterStatusPaid === "Paid") {
            match = match && isPaid;
          } else if (boganathaFilterStatusPaid === "Unpaid") {
            match = match && !isPaid;
          }
        }
        return match;
      })
    : [];

  // Filter shopping list transactions for non-Boganatha units where Unit = current unit id
  const filteredUnitShoppingTrans = !isBoganatha
    ? boganathaTransactions.filter((t) => {
        const matchUnit =
          t.unit?.trim().toUpperCase() === id?.trim().toUpperCase();
        if (!matchUnit) return false;

        let match = filterByDate(t.rawDate);
        if (boganathaSearch.trim()) {
          const q = boganathaSearch.trim().toLowerCase();
          match =
            match &&
            ((t.nota && t.nota.toLowerCase().includes(q)) ||
              (t.client && t.client.toLowerCase().includes(q)));
        }
        if (boganathaFilterStatusPesanan !== "All") {
          match =
            match &&
            t.statusPesanan?.toLowerCase() ===
              boganathaFilterStatusPesanan.toLowerCase();
        }
        if (boganathaFilterStatusPaid !== "All") {
          const isPaid = t.statusPaid?.trim().toLowerCase() === "paid";
          if (boganathaFilterStatusPaid === "Paid") {
            match = match && isPaid;
          } else if (boganathaFilterStatusPaid === "Unpaid") {
            match = match && !isPaid;
          }
        }
        return match;
      })
    : [];

  const sortedFilteredUnitShoppingTrans = [...filteredUnitShoppingTrans].sort(
    (a, b) => {
      return (b.rowIndex || 0) - (a.rowIndex || 0);
    },
  );

  // Sort filteredSales by date descending (newest first)
  const sortedFilteredSales = [...filteredSales].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  // Sort Lovissa transactions by newest first (highest rowNumber)
  const sortedFilteredLovissaTrans = [...filteredLovissaTrans].sort((a, b) => {
    return (b.rowNumber || 0) - (a.rowNumber || 0);
  });

  // Sort Head Quarter transactions by transaction date descending
  const sortedFilteredHqTrans = [...filteredHqTrans].sort((a, b) => {
    const timeA = a.rawDate ? a.rawDate.getTime() : 0;
    const timeB = b.rawDate ? b.rawDate.getTime() : 0;
    return timeB - timeA;
  });

  // Sort Lion Parcel transactions by transaction date descending (newest first)
  const sortedFilteredLionParcelTrans = [...filteredLionParcelTrans].sort(
    (a, b) => {
      const timeA = a.rawDate ? a.rawDate.getTime() : 0;
      const timeB = b.rawDate ? b.rawDate.getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return (b.rowIndex || 0) - (a.rowIndex || 0);
    },
  );

  // Sort Boganatha transactions by transaction date descending (newest first)
  const sortedFilteredBoganathaTrans = [...filteredBoganathaTrans].sort(
    (a, b) => {
      return (b.rowIndex || 0) - (a.rowIndex || 0);
    },
  );

  const displayRevenue = isChillhubSurabaya
    ? filteredSales.reduce((sum, s) => sum + (s.price || 0), 0)
    : isHeadQuarter
      ? filteredHqTrans.reduce((sum, t) => sum + (t.amount || 0), 0)
      : isLovissaGuestHouse
        ? filteredLovissaTrans.reduce((sum, t) => sum + (t.amount || 0), 0)
        : isLionParcel
          ? filteredLionParcelTrans.reduce(
              (sum, t) => sum + (t.tarifMasuk || 0),
              0,
            )
          : isBoganatha
            ? filteredBoganathaTrans.reduce(
                (sum, t) =>
                  t.statusPaid?.trim().toLowerCase() === "paid"
                    ? sum + (t.totalSum || 0)
                    : sum,
                0,
              )
            : revenue;

  // Rooms display and checking logic (Exact list of Room 1 to Room 12)
  const roomList: string[] = Array.from(
    { length: 12 },
    (_, i) => `Room ${i + 1}`,
  );

  const checkOccupancy = (roomName: string, dateStr: string) => {
    const targetDate = parseDate(dateStr);
    if (!targetDate) return null;

    const witaNow = getWitaParts();
    const witaTodayStr = `${witaNow.year}-${String(witaNow.month).padStart(2, "0")}-${String(witaNow.day).padStart(2, "0")}`;
    const isTargetTodayWita = dateStr === witaTodayStr;

    const tYear = targetDate.getFullYear();
    const tMonth = targetDate.getMonth();
    const tDay = targetDate.getDate();
    const targetDayTime = new Date(tYear, tMonth, tDay).getTime();

    const found = lovissaTransactions.find((t) => {
      if (!t.room) return false;
      const numT = parseInt(t.room.toString().replace(/\D/g, ""), 10);
      const numR = parseInt(roomName.toString().replace(/\D/g, ""), 10);
      if (isNaN(numT) || isNaN(numR) || numT !== numR) return false;

      const start = parseDate(t.checkIn);
      const end = parseDate(t.checkOut);
      if (!start || !end) return false;

      const sYear = start.getFullYear();
      const sMonth = start.getMonth();
      const sDay = start.getDate();
      const startDayTime = new Date(sYear, sMonth, sDay).getTime();

      const eYear = end.getFullYear();
      const eMonth = end.getMonth();
      const eDay = end.getDate();
      const endDayTime = new Date(eYear, eMonth, eDay).getTime();

      // If selected date is strictly outside the stay duration
      if (targetDayTime < startDayTime || targetDayTime > endDayTime) {
        return false;
      }

      // If selected date is during stay before the check-out date
      if (targetDayTime < endDayTime) {
        return true;
      }

      // If selected date is EXACTLY the check-out date:
      // Jam check out diatur pada jam 12:00 siang WITA.
      // Jika waktu saat ini di WITA sudah melewati jam 12:00 siang (hour >= 12),
      // maka data okupansi otomatis tidak muncul (kamar berstatus kosong/checkout).
      if (isTargetTodayWita) {
        if (witaNow.hour >= 12) {
          return false;
        }
        return true;
      }

      // If target date is a past date (prior to today in WITA):
      // On that past checkout date, the 12:00 WITA checkout deadline has already elapsed.
      const targetIsPastWita =
        tYear < witaNow.year ||
        (tYear === witaNow.year && tMonth + 1 < witaNow.month) ||
        (tYear === witaNow.year && tMonth + 1 === witaNow.month && tDay < witaNow.day);

      if (targetIsPastWita) {
        return false;
      }

      // If target date is in future, it remains occupied prior to 12:00 WITA checkout
      return true;
    });

    return found || null;
  };

  // Room Contribution calculations for Lovissa Guest House
  const roomContributionList = (() => {
    const dataSource =
      filteredLovissaTrans && filteredLovissaTrans.length > 0
        ? filteredLovissaTrans
        : lovissaTransactions;

    const map: Record<
      string,
      { roomName: string; count: number; revenue: number }
    > = {};
    for (let i = 1; i <= 12; i++) {
      map[`Room ${i}`] = { roomName: `Room ${i}`, count: 0, revenue: 0 };
    }

    let totalOrders = 0;
    let totalRevenue = 0;

    if (dataSource && dataSource.length > 0) {
      dataSource.forEach((t) => {
        let r = (t.room || "").toString().trim();
        if (!r) {
          r = "Lainnya";
        } else if (/^\d+$/.test(r)) {
          r = `Room ${r}`;
        } else if (!/^room/i.test(r) && !/^kamar/i.test(r)) {
          r = `Room ${r}`;
        } else {
          r = r.replace(/^(room|kamar)\s*/i, "Room ");
        }

        if (!map[r]) {
          map[r] = { roomName: r, count: 0, revenue: 0 };
        }
        const amt = Number(t.amount) || 0;
        map[r].count += 1;
        map[r].revenue += amt;

        totalOrders += 1;
        totalRevenue += amt;
      });
    }

    const items = Object.values(map)
      .map((item) => ({
        ...item,
        percentage:
          totalOrders > 0
            ? ((item.count / totalOrders) * 100).toFixed(1)
            : "0.0",
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    return { items, totalOrders, totalRevenue };
  })();

  // Booking Source Contribution calculations for Lovissa Guest House
  const bookingSourceContributionList = (() => {
    const dataSource =
      filteredLovissaTrans && filteredLovissaTrans.length > 0
        ? filteredLovissaTrans
        : lovissaTransactions;

    const map: Record<
      string,
      { sourceName: string; count: number; revenue: number }
    > = {};
    let totalOrders = 0;
    let totalRevenue = 0;

    if (dataSource && dataSource.length > 0) {
      dataSource.forEach((t) => {
        let s = (t.bookingSource || "").toString().trim();
        if (!s || s === "-" || s.toLowerCase() === "empty") {
          s = "Direct/walk in";
        } else {
          const lower = s.toLowerCase().trim();
          if (lower === "agoda") s = "Agoda";
          else if (lower === "booking.com" || lower === "booking") s = "Booking.com";
          else if (lower === "traveloka") s = "Traveloka";
          else if (lower === "tiket.com" || lower === "tiket") s = "Tiket.com";
          else if (lower === "airbnb") s = "Airbnb";
          else if (
            lower === "walk-in" ||
            lower === "walkin" ||
            lower === "direct" ||
            lower === "offline" ||
            lower === "direct / walk-in" ||
            lower === "direct/walk in" ||
            lower === "direct / walk in" ||
            lower === "direct/walk-in" ||
            lower === "walk in"
          ) {
            s = "Direct/walk in";
          }
        }

        if (!map[s]) {
          map[s] = { sourceName: s, count: 0, revenue: 0 };
        }
        const amt = Number(t.amount) || 0;
        map[s].count += 1;
        map[s].revenue += amt;

        totalOrders += 1;
        totalRevenue += amt;
      });
    }

    const items = Object.values(map)
      .map((item) => ({
        ...item,
        percentage:
          totalOrders > 0
            ? ((item.count / totalOrders) * 100).toFixed(1)
            : "0.0",
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    return { items, totalOrders, totalRevenue };
  })();

  // Layanan Contribution calculations for Lion Parcel (UNT12)
  const lionParcelLayananList = (() => {
    const dataSource =
      filteredLionParcelTrans && filteredLionParcelTrans.length > 0
        ? filteredLionParcelTrans
        : lionParcelTransactions;

    const map: Record<
      string,
      { layananName: string; count: number; revenue: number }
    > = {};
    let totalOrders = 0;
    let totalRevenue = 0;

    if (dataSource && dataSource.length > 0) {
      dataSource.forEach((t) => {
        let l = (t.layanan || "").toString().trim();
        // Sembunyikan dan abaikan item bertuliskan 2026
        if (l === "2026" || l.toLowerCase() === "2026") {
          return;
        }
        l = l.replace(/\b2026\b/g, "").trim();
        if (!l || l === "-" || l.toLowerCase() === "empty") {
          l = "Lainnya";
        }
        if (l === "2026") {
          return;
        }

        if (!map[l]) {
          map[l] = { layananName: l, count: 0, revenue: 0 };
        }
        const amt = Number(t.tarifMasuk) || 0;
        map[l].count += 1;
        map[l].revenue += amt;

        totalOrders += 1;
        totalRevenue += amt;
      });
    }

    const items = Object.values(map)
      .filter(
        (item) =>
          item.layananName !== "2026" &&
          !item.layananName.toLowerCase().includes("2026"),
      )
      .map((item) => ({
        ...item,
        layananName: item.layananName.replace(/\b2026\b/g, "").trim(),
        percentage:
          totalOrders > 0
            ? ((item.count / totalOrders) * 100).toFixed(1)
            : "0.0",
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    return { items, totalOrders, totalRevenue };
  })();

  // Payment Contribution (Cara Pembayaran) calculations for Lion Parcel (UNT12)
  const lionParcelPaymentList = (() => {
    const dataSource =
      filteredLionParcelTrans && filteredLionParcelTrans.length > 0
        ? filteredLionParcelTrans
        : lionParcelTransactions;

    const map: Record<
      string,
      { paymentName: string; count: number; revenue: number }
    > = {};
    let totalOrders = 0;
    let totalRevenue = 0;

    if (dataSource && dataSource.length > 0) {
      dataSource.forEach((t) => {
        let p = (t.caraPembayaran || "").toString().trim();
        if (p === "2026" || p.toLowerCase() === "2026") {
          return;
        }
        p = p.replace(/\b2026\b/g, "").trim();
        if (!p || p === "-" || p.toLowerCase() === "empty") {
          p = "Lainnya";
        }
        if (p === "2026") {
          return;
        }

        if (!map[p]) {
          map[p] = { paymentName: p, count: 0, revenue: 0 };
        }
        const amt = Number(t.tarifMasuk) || 0;
        map[p].count += 1;
        map[p].revenue += amt;

        totalOrders += 1;
        totalRevenue += amt;
      });
    }

    const items = Object.values(map)
      .filter(
        (item) =>
          item.paymentName !== "2026" &&
          !item.paymentName.toLowerCase().includes("2026"),
      )
      .map((item) => ({
        ...item,
        paymentName: item.paymentName.replace(/\b2026\b/g, "").trim(),
        percentage:
          totalOrders > 0
            ? ((item.count / totalOrders) * 100).toFixed(1)
            : "0.0",
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

    return { items, totalOrders, totalRevenue };
  })();

  // Generate dynamic chart data based on filter selection
  let dynamicChartData = mockChartData;
  const isAnyUnitWithData =
    (isChillhubSurabaya && chillhubSales.length > 0) ||
    (isHeadQuarter && hqTransactions.length > 0) ||
    (isLovissaGuestHouse && lovissaTransactions.length > 0) ||
    (isLionParcel && lionParcelTransactions.length > 0) ||
    (isBoganatha && boganathaTransactions.length > 0);

  if (isAnyUnitWithData) {
    // Yearly revenue (show only existing years in the data without dummy padding)
    const allDates: any[] = [];
    if (isChillhubSurabaya)
      allDates.push(...chillhubSales.map((s) => s.rawDate));
    if (isHeadQuarter) allDates.push(...hqTransactions.map((t) => t.rawDate));
    if (isLovissaGuestHouse)
      allDates.push(...lovissaTransactions.map((t) => t.rawDate));
    if (isLionParcel)
      allDates.push(...lionParcelTransactions.map((t) => t.rawDate));
    if (isBoganatha)
      allDates.push(...boganathaTransactions.map((t) => t.rawDate));

    const validYears = Array.from(
      new Set(
        allDates
          .filter(Boolean)
          .map((d: any) => d.getFullYear())
      )
    ).sort((a, b) => a - b);

    let yearsToShow: number[] = [];
    if (revenueSearchQuery.trim() && !isNaN(parseInt(revenueSearchQuery.trim()))) {
      const parsedYear = parseInt(revenueSearchQuery.trim());
      yearsToShow = [parsedYear];
    } else {
      yearsToShow =
        validYears.length > 0 ? validYears : [referenceDate.getFullYear()];
    }

    dynamicChartData = yearsToShow.map((year) => {
      let yearlySum = 0;
      if (isChillhubSurabaya) {
        yearlySum = chillhubSales
          .filter((s) => s.rawDate?.getFullYear() === year)
          .reduce((sum, s) => sum + s.price, 0);
      } else if (isHeadQuarter) {
        yearlySum = hqTransactions
          .filter((s) => s.rawDate?.getFullYear() === year)
          .reduce((sum, t) => sum + t.amount, 0);
      } else if (isLovissaGuestHouse) {
        yearlySum = lovissaTransactions
          .filter((s) => s.rawDate?.getFullYear() === year)
          .reduce((sum, t) => sum + t.amount, 0);
      } else if (isLionParcel) {
        yearlySum = lionParcelTransactions
          .filter((s) => s.rawDate?.getFullYear() === year)
          .reduce((sum, t) => sum + t.tarifMasuk, 0);
      } else if (isBoganatha) {
        yearlySum = boganathaTransactions
          .filter(
            (s) =>
              s.rawDate?.getFullYear() === year &&
              s.statusPaid?.trim().toLowerCase() === "paid",
          )
          .reduce((sum, t) => sum + t.totalSum, 0);
      }
      return { name: year.toString(), revenue: yearlySum, value: yearlySum };
    });
  }

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm truncate">
          Detail Unit
        </h1>
      </header>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Card 1: Logo, Nama, Type */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="w-20 h-20 bg-gray-50 shadow-inner rounded-2xl border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
            {unit?.logo ? (
              <img
                src={unit.logo || undefined}
                alt={unit.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300 flex-shrink-0" />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
              {unit?.name}
            </h2>
            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {unit?.type}
            </span>
          </div>
        </div>

        {/* Card 2: Overview Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                Revenue
              </span>
            </div>
            <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">
              {formatIDR(displayRevenue)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                Expenses
              </span>
            </div>
            <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">
              {formatIDR(expenses)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 items-center justify-center text-center">
            <span className="text-2xl font-black text-blue-600">
              {projects.length}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Projects
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 items-center justify-center text-center">
            <span className="text-2xl font-black text-indigo-600">
              {tasks.length}
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Tasks
            </span>
          </div>
        </div>

        {/* Card 3: Revenue Growth Trends */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Revenue Growth
            </h3>
            <div className="relative w-36">
              <input
                type="text"
                placeholder="Cari tahun..."
                value={revenueSearchQuery}
                onChange={(e) => setRevenueSearchQuery(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#429dbb] focus:ring-1 focus:ring-[#429dbb] text-gray-700 placeholder-gray-400 bg-gray-50/50 shadow-inner"
                id="revenue-search-input"
              />
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={dynamicChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const val = payload?.value?.toString() || "";
                    if (isLionParcel && val.includes("2026")) {
                      return null;
                    }
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={10}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#9ca3af"
                      >
                        <tspan dy={10}>{val}</tspan>
                      </text>
                    );
                  }}
                  tickFormatter={(val: any) =>
                    isLionParcel && String(val).includes("2026") ? "" : val
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelFormatter={(label: any) =>
                    isLionParcel && String(label).includes("2026") ? "" : label
                  }
                  formatter={(val: any) => [formatIDR(val), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 7 }}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card: Layanan Contribution (Only for Lion Parcel UNT12) */}
        {isLionParcel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setExpandLionParcelLayanan(!expandLionParcelLayanan)
                  }
                  className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-500" />
                    <span>Layanan Contribution</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      expandLionParcelLayanan && "rotate-180",
                    )}
                  />
                </button>
              </div>

              <AnimatePresence>
                {expandLionParcelLayanan && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-2 space-y-2.5"
                  >
                    {lionParcelLayananList.items.length > 0 ? (
                      <div className="space-y-2">
                        {lionParcelLayananList.items.map((item, idx) => (
                          <div
                            key={`layanan-contrib-${item.layananName}-${idx}`}
                            className="flex flex-col p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-gray-100 transition-all gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900">
                                {item.layananName}
                              </span>
                              <span className="font-bold text-sm text-emerald-600">
                                Rp {Math.round(item.revenue).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span>
                                {item.count} transaksi ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(2, parseFloat(item.percentage)))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 italic bg-gray-50 rounded-xl">
                        Belum ada data layanan.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Card: Payment Contribution (Only for Lion Parcel UNT12) */}
        {isLionParcel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setExpandLionParcelPayment(!expandLionParcelPayment)
                  }
                  className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    <span>Payment Contribution</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      expandLionParcelPayment && "rotate-180",
                    )}
                  />
                </button>
              </div>

              <AnimatePresence>
                {expandLionParcelPayment && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-2 space-y-2.5"
                  >
                    {lionParcelPaymentList.items.length > 0 ? (
                      <div className="space-y-2">
                        {lionParcelPaymentList.items.map((item, idx) => (
                          <div
                            key={`payment-contrib-${item.paymentName}-${idx}`}
                            className="flex flex-col p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-gray-100 transition-all gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900">
                                {item.paymentName}
                              </span>
                              <span className="font-bold text-sm text-emerald-600">
                                Rp {Math.round(item.revenue).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span>
                                {item.count} transaksi ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(2, parseFloat(item.percentage)))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 italic bg-gray-50 rounded-xl">
                        Belum ada data cara pembayaran.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Card: Transaksi (Only for Boganatha UNT09) */}
        {isBoganatha && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
              <button
                onClick={() => setExpandBoganathaTrans(!expandBoganathaTrans)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                Daftar Transaksi ({filteredBoganathaTrans.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandBoganathaTrans && "rotate-180",
                  )}
                />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="Cari Pesanan, Client..."
                    value={boganathaSearch}
                    onChange={(e) => setBoganathaSearch(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder-gray-400 bg-gray-50/50"
                  />
                  <button
                    onClick={() =>
                      setShowBoganathaFilterMenu(!showBoganathaFilterMenu)
                    }
                    className="absolute right-1 top-1 p-1 bg-white hover:bg-gray-50 rounded-md border border-gray-200 text-gray-500"
                  >
                    <Filter className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showBoganathaFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-10 right-0 z-10 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4"
                  >
                    <h4 className="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wider">
                      Filter Transaksi
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Status Pesanan
                        </label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          value={boganathaFilterStatusPesanan}
                          onChange={(e) =>
                            setBoganathaFilterStatusPesanan(e.target.value)
                          }
                        >
                          <option value="All">Semua</option>
                          <option value="Send">Send</option>
                          <option value="Review">Review</option>
                          <option value="Done">Done</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Status Paid
                        </label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          value={boganathaFilterStatusPaid}
                          onChange={(e) =>
                            setBoganathaFilterStatusPaid(e.target.value)
                          }
                        >
                          <option value="All">Semua</option>
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Unit
                        </label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                          value={boganathaFilterUnit}
                          onChange={(e) =>
                            setBoganathaFilterUnit(e.target.value)
                          }
                        >
                          <option value="All">Semua</option>
                          {Array.from(
                            new Set(
                              boganathaTransactions
                                .map((t) => t.unit)
                                .filter(Boolean),
                            ),
                          ).map((unitId, idx) => (
                            <option
                              key={`unit-${unitId || idx}-${idx}`}
                              value={unitId}
                            >
                              {systemUnits.get(
                                (unitId as string)?.trim()?.toUpperCase(),
                              )?.name || (unitId as string)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setShowBoganathaFilterMenu(false)}
                        className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100"
                      >
                        Tutup
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {expandBoganathaTrans && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredBoganathaTrans.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada transaksi untuk filter ini.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredBoganathaTrans
                        .filter((trans) => trans && (trans.nota || trans.id))
                        .map((trans, idx) => (
                          <div
                            key={`boganatha-${trans.nota || trans.id || idx}-${idx}`}
                            onClick={() =>
                              setSelectedTransaction({
                                ...trans,
                                isBoganathaTx: true,
                              })
                            }
                            className="py-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                                    {trans.nota}
                                  </span>
                                  {(() => {
                                    const isPaid =
                                      trans.statusPaid?.trim().toLowerCase() ===
                                      "paid";
                                    return (
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                                          isPaid
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                            : "bg-rose-50 text-rose-700 border-rose-100",
                                        )}
                                      >
                                        {isPaid ? "Paid" : "Unpaid"}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-sm font-bold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors truncate">
                                  {(() => {
                                    const match = systemUsers.find(
                                      (u) =>
                                        u.email === trans.client?.toLowerCase(),
                                    );
                                    return match
                                      ? match.nameOrEmail
                                      : trans.client || "Unknown";
                                  })()}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border",
                                      trans.statusPesanan === "Send"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : trans.statusPesanan === "Review"
                                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                          : trans.statusPesanan === "Delivered"
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : trans.statusPesanan === "Done"
                                              ? "bg-green-50 text-green-700 border-green-200"
                                              : "bg-gray-50 text-gray-700 border-gray-200",
                                    )}
                                  >
                                    {trans.statusPesanan || "-"}
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border bg-gray-50 text-gray-700 border-gray-200">
                                    {systemUnits.get(
                                      trans.unit?.trim()?.toUpperCase(),
                                    )?.name ||
                                      trans.unit ||
                                      "-"}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-blue-600">
                                  {formatIDR(trans.totalSum)}
                                </p>
                                <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                  {trans.date}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: Transaksi (Only for Lion Parcel UNT12) */}
        {isLionParcel && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setExpandLionParcelTrans(!expandLionParcelTrans)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                Daftar Transaksi ({filteredLionParcelTrans.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandLionParcelTrans && "rotate-180",
                  )}
                />
              </button>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Cari No. Resi, Tujuan, dll..."
                  value={lionParcelSearch}
                  onChange={(e) => setLionParcelSearch(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-gray-700 placeholder-gray-400 bg-gray-50/50"
                  id="lion-parcel-search-input"
                />
              </div>
            </div>

            <AnimatePresence>
              {expandLionParcelTrans && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredLionParcelTrans.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada transaksi yang cocok.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredLionParcelTrans.map((trans, idx) => (
                        <div
                          key={`lionparcel-${trans.nota || trans.id || idx}-${idx}`}
                          onClick={() =>
                            setSelectedTransaction({
                              ...trans,
                              isLionParcelTx: true,
                            })
                          }
                          className="py-3 flex flex-col justify-between gap-1 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                  {(trans.layanan && trans.layanan !== "2026"
                                    ? trans.layanan
                                        .replace(/\b2026\b/g, "")
                                        .trim()
                                    : "") || "REG"}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
                                  {trans.noResi}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 mt-1 group-hover:text-emerald-600 transition-colors truncate">
                                Tujuan: {trans.tujuan || "Unknown"}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-emerald-600">
                                {formatIDR(trans.tarifMasuk)}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-0.5 font-medium">
                                {trans.rawDate ? `${String(trans.rawDate.getDate()).padStart(2, '0')}/${String(trans.rawDate.getMonth() + 1).padStart(2, '0')}/${trans.rawDate.getFullYear()}` : trans.date}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: Penjualan (Only for Chillhub Surabaya UNT15) */}
        {isChillhubSurabaya && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setExpandChillhubSales(!expandChillhubSales)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                Daftar Penjualan ({filteredSales.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandChillhubSales && "rotate-180",
                  )}
                />
              </button>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Cari Aktivitas, Email, dll..."
                  value={salesSearchQuery}
                  onChange={(e) => setSalesSearchQuery(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder-gray-400 bg-gray-50/50"
                  id="sales-search-input"
                />
              </div>
            </div>

            <AnimatePresence>
              {expandChillhubSales && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredSales.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada transaksi penjualan untuk filter ini.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredSales.map((sale, idx) => {
                        const userDetail = getSystemUserByEmail(sale.userEmail);
                        const displayName = userDetail?.name || "User";
                        return (
                          <div
                            key={`chillhub-${sale.id || sale.invoice || idx}-${idx}`}
                            onClick={() =>
                              setSelectedTransaction({
                                ...sale,
                                isChillhubSale: true,
                              })
                            }
                            className="py-3 flex items-center justify-between gap-4 group border-b border-gray-50 last:border-b-0 hover:bg-slate-50/55 px-2 rounded-xl transition-all duration-200 cursor-pointer"
                          >
                            {/* Left Block: Activities (Top-left) & Date-Time (Bottom-left) */}
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                              {/* Activities (kiri atas text utama) */}
                              <p className="text-sm font-bold text-gray-900 truncate leading-snug group-hover:text-[#429dbb] transition-colors">
                                {sale.activity || "-"}
                              </p>
                              {/* Date & Time (kiri bawah) */}
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1 font-semibold">
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase shrink-0">
                                  {sale.rawDate ? `${String(sale.rawDate.getMonth() + 1).padStart(2, "0")}/${String(sale.rawDate.getDate()).padStart(2, "0")}/${sale.rawDate.getFullYear()}` : sale.date}
                                </span>
                                {sale.time && (
                                  <span className="bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold shrink-0">
                                    {sale.time}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Block: Price (Kanan atas) & User avatar + Name (Kanan bawah) */}
                            <div className="shrink-0 flex flex-col items-end justify-center text-right min-w-0">
                              {/* Price (sebelah kanan atas) */}
                              <p className="text-sm font-bold text-emerald-600 leading-snug">
                                {formatIDR(sale.price)}
                              </p>
                              {/* User avatar + Name (di bawah price) */}
                              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                                <img
                                  src={userDetail?.avatar}
                                  alt={displayName}
                                  className="w-5 h-5 rounded-full object-cover shadow-xs bg-gray-100 border border-gray-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[11px] text-gray-500 font-semibold truncate max-w-[120px] leading-none">
                                  {displayName}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: Status Okupansi (Lovissa Guest House UNT19 only) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setExpandLovissaOccupancy(!expandLovissaOccupancy)
                  }
                  className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
                >
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Status Okupansi
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      expandLovissaOccupancy && "rotate-180",
                    )}
                  />
                </button>
                <div className="flex items-center gap-1 bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  Live Map
                </div>
              </div>

              <AnimatePresence>
                {expandLovissaOccupancy && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {/* Date Filter & Info */}
                    <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-gray-100 mt-1">
                      <span className="text-xs text-gray-500 font-medium">
                        Pilih Tanggal:
                      </span>
                      <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="date"
                          value={occupancyDate}
                          onChange={(e) => setOccupancyDate(e.target.value)}
                          className="text-xs font-bold text-gray-700 bg-transparent focus:outline-none border-none p-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Rooms Grid */}
                    <div className="grid grid-cols-4 gap-2.5 pt-1">
                      {roomList.map((roomName, index) => {
                        const activeTx = checkOccupancy(
                          roomName,
                          occupancyDate,
                        );
                        const isOccupied = !!activeTx;

                        return (
                          <div
                            key={`room-${roomName || index}-${index}`}
                            onClick={() => {
                              if (activeTx) {
                                setSelectedTransaction(activeTx);
                                setShowCleaningBreakdown(false);
                              } else if (currentUserEmail !== "prawinaputu@gmail.com") {
                                setClickedEmptyRoom(roomName);
                                const now = new Date();
                                const dateStr = now.toISOString().split("T")[0];
                                const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
                                setCleaningDate(dateStr);
                                setCleaningTime(timeStr);
                                const cleanRoom = (roomName || "").toString().replace(/room\s+/gi, "").trim();
                                setCleaningArea(`kamar ${cleanRoom}`.toLowerCase());
                                setCleaningUser("Putu (prawinaputu@gmail.com)");
                                setCleaningKeterangan("");
                              }
                            }}
                            className={cn(
                              "aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all duration-200 select-none relative group cursor-pointer",
                              isOccupied
                                ? "bg-sky-100 text-sky-950 border-sky-300 hover:bg-sky-200 hover:border-sky-400"
                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                            )}
                          >
                            <span className="text-xs font-black tracking-normal truncate w-full">
                              {roomName.replace(/Room\s+/gi, "")}
                            </span>
                            <span className="text-[9px] font-semibold mt-1 uppercase tracking-wider block">
                              {isOccupied ? "Isi" : "Kosong"}
                            </span>
                            {/* Legend marker */}
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5",
                                isOccupied ? "bg-sky-500" : "bg-gray-300",
                              )}
                            />

                          </div>
                        );
                      })}
                    </div>

                    {/* Legend for occupancy status */}
                    <div className="flex items-center gap-4 text-xs pt-1 text-gray-500 justify-center">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded border border-sky-300 bg-sky-100" />
                        <span>Terisi (Biru Muda)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded border border-gray-200 bg-white" />
                        <span>Kosong (Putih)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Card: Room Contribution (Lovissa Guest House UNT19 only) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setExpandRoomContribution(!expandRoomContribution)
                  }
                  className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <span>Room Contribution</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      expandRoomContribution && "rotate-180",
                    )}
                  />
                </button>
              </div>

              <AnimatePresence>
                {expandRoomContribution && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-2 space-y-2.5"
                  >
                    {roomContributionList.items.length > 0 ? (
                      <div className="space-y-2">
                        {roomContributionList.items.map((item, idx) => (
                          <div
                            key={`room-contrib-${item.roomName}-${idx}`}
                            className="flex flex-col p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-gray-100 transition-all gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900">
                                {item.roomName}
                              </span>
                              <span className="font-bold text-sm text-emerald-600">
                                Rp {Math.round(item.revenue).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span>
                                {item.count} pesanan ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(2, parseFloat(item.percentage)))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 italic bg-gray-50 rounded-xl">
                        Belum ada data pesanan kamar.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Card: Booking Source Contribution (Lovissa Guest House UNT19 only) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setExpandBookingSourceContribution(
                      !expandBookingSourceContribution,
                    )
                  }
                  className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    <span>Booking Source Contribution</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      expandBookingSourceContribution && "rotate-180",
                    )}
                  />
                </button>
              </div>

              <AnimatePresence>
                {expandBookingSourceContribution && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-2 space-y-2.5"
                  >
                    {bookingSourceContributionList.items.length > 0 ? (
                      <div className="space-y-2">
                        {bookingSourceContributionList.items.map((item, idx) => (
                          <div
                            key={`source-contrib-${item.sourceName}-${idx}`}
                            className="flex flex-col p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-gray-100 transition-all gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-gray-900">
                                {item.sourceName}
                              </span>
                              <span className="font-bold text-sm text-emerald-600">
                                Rp {Math.round(item.revenue).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span>
                                {item.count} pesanan ({item.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, Math.max(2, parseFloat(item.percentage)))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-400 italic bg-gray-50 rounded-xl">
                        Belum ada data sumber pemesanan.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Card: Transaksi (Only for Lovissa Guest House UNT19) */}
        {isLovissaGuestHouse && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpandLovissaTrans(!expandLovissaTrans)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                Daftar Transaksi ({filteredLovissaTrans.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandLovissaTrans && "rotate-180",
                  )}
                />
              </button>
            </div>

            <AnimatePresence>
              {expandLovissaTrans && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredLovissaTrans.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada transaksi untuk filter ini.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredLovissaTrans
                        .filter(
                          (trans) =>
                            trans &&
                            (trans.nota || trans.id || trans.rowNumber),
                        )
                        .map((trans, idx) => (
                          <div
                            key={`lovissa-${trans.nota || trans.id || trans.rowNumber || idx}-${idx}`}
                            onClick={() => setSelectedTransaction(trans)}
                            className="py-3 flex flex-col justify-between gap-1 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                    {trans.room}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {trans.type}
                                  </span>
                                  {trans.bookingSource && (
                                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 flex items-center gap-0.5">
                                      <Globe className="w-2.5 h-2.5" />
                                      {trans.bookingSource}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-bold text-gray-900 mt-1 group-hover:text-indigo-600 transition-colors truncate">
                                  {trans.name || "Anonymous Guest"}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatIDR(trans.amount)}
                                </p>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  {trans.dur ? `${trans.dur} ${trans.type || 'Malam'}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-gray-100/50 text-gray-400">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-700">
                                  {trans.checkIn}
                                </span>
                                <span>→</span>
                                <span className="font-semibold text-gray-700">
                                  {trans.checkOut}
                                </span>
                              </div>
                              {trans.keterangan && (
                                <span className="truncate max-w-[150px] italic text-[10px] text-gray-400">
                                  {trans.keterangan}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: Transaksi (Only for Head Quarter UNT01) */}
        {isHeadQuarter && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setExpandHqTrans(!expandHqTrans)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                Daftar Transaksi ({filteredHqTrans.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandHqTrans && "rotate-180",
                  )}
                />
              </button>
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={hqSearch}
                  onChange={(e) => setHqSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <AnimatePresence>
              {expandHqTrans && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredHqTrans.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada transaksi yang cocok.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredHqTrans.map((trans, idx) => (
                        <div
                          key={`hq-${trans.id || idx}-${idx}`}
                          onClick={() => setSelectedTransaction(trans)}
                          className="py-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group animate-fade-in"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                  {(() => {
                                    const match = systemUsers.find(
                                      (u) =>
                                        u.email === trans.client?.toLowerCase(),
                                    );
                                    return match
                                      ? match.nameOrEmail
                                      : trans.client || "HQ";
                                  })()}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-gray-50 text-gray-700 border-gray-200">
                                  HQ
                                </span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 mt-2 group-hover:text-indigo-600 transition-colors truncate">
                                {trans.activities || "-"}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border bg-green-50 text-green-700 border-green-200">
                                  Done
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-indigo-600">
                                {formatIDR(trans.amount)}
                              </p>
                              <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                {trans.date}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: Daftar Belanja (For non-Boganatha units having matching orders) */}
        {!isBoganatha && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
              <button
                onClick={() => setExpandUnitShopping(!expandUnitShopping)}
                className="font-semibold text-gray-900 flex items-center gap-2 outline-none cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                Daftar Belanja ({sortedFilteredUnitShoppingTrans.length})
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform",
                    expandUnitShopping && "rotate-180",
                  )}
                />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="Cari Belanja..."
                    value={boganathaSearch}
                    onChange={(e) => setBoganathaSearch(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-[#429dbb] focus:ring-1 focus:ring-[#429dbb] text-gray-700 placeholder-gray-400 bg-gray-50/50"
                  />
                  <button
                    onClick={() =>
                      setShowBoganathaFilterMenu(!showBoganathaFilterMenu)
                    }
                    className="absolute right-1 top-1 p-1 bg-white hover:bg-gray-50 rounded-md border border-gray-200 text-gray-500 cursor-pointer"
                  >
                    <Filter className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showBoganathaFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-10 right-0 z-10 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4"
                  >
                    <h4 className="font-bold text-xs text-gray-700 mb-3 uppercase tracking-wider">
                      Filter Belanja
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Status Pesanan
                        </label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#429dbb]"
                          value={boganathaFilterStatusPesanan}
                          onChange={(e) =>
                            setBoganathaFilterStatusPesanan(e.target.value)
                          }
                        >
                          <option value="All">Semua</option>
                          <option value="Send">Send</option>
                          <option value="Review">Review</option>
                          <option value="Process">Process</option>
                          <option value="Done">Done</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Status Paid
                        </label>
                        <select
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#429dbb]"
                          value={boganathaFilterStatusPaid}
                          onChange={(e) =>
                            setBoganathaFilterStatusPaid(e.target.value)
                          }
                        >
                          <option value="All">Semua</option>
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setShowBoganathaFilterMenu(false)}
                        className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-100 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {expandUnitShopping && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {sortedFilteredUnitShoppingTrans.length === 0 ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                        <p className="text-sm text-gray-400 italic">
                          Tidak ada belanja untuk filter ini.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredUnitShoppingTrans
                        .filter((trans) => trans && (trans.nota || trans.id))
                        .map((trans, idx) => (
                          <div
                            key={`unitshop-${trans.nota || trans.id || idx}-${idx}`}
                            onClick={() =>
                              setSelectedTransaction({
                                ...trans,
                                isBoganathaTx: true,
                              })
                            }
                            className="py-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-slate-50/70 p-2.5 rounded-xl transition-all duration-200 pr-1 group animate-fade-in"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                    {trans.nota}
                                  </span>
                                  {(() => {
                                    const isPaid =
                                      trans.statusPaid?.trim().toLowerCase() ===
                                      "paid";
                                    return (
                                      <span
                                        className={cn(
                                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                                          isPaid
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                            : "bg-rose-50 text-rose-700 border-rose-100",
                                        )}
                                      >
                                        {isPaid ? "Paid" : "Unpaid"}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <p className="text-sm font-bold text-gray-900 mt-2 group-hover:text-indigo-600 transition-colors truncate">
                                  {(() => {
                                    const match = systemUsers.find(
                                      (u) =>
                                        u.email === trans.client?.toLowerCase(),
                                    );
                                    return match
                                      ? match.nameOrEmail
                                      : trans.client || "Unknown";
                                  })()}
                                </p>
                                <div className="flex gap-2 mt-1">
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border",
                                      trans.statusPesanan === "Send"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : trans.statusPesanan === "Review"
                                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                          : trans.statusPesanan === "Process"
                                            ? "bg-orange-50 text-orange-700 border-orange-200"
                                            : trans.statusPesanan ===
                                                "Delivered"
                                              ? "bg-purple-50 text-purple-700 border-purple-200"
                                              : trans.statusPesanan === "Done"
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-gray-50 text-gray-700 border-gray-200",
                                    )}
                                  >
                                    {trans.statusPesanan || "-"}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-indigo-600">
                                  {formatIDR(trans.totalSum)}
                                </p>
                                <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                  {trans.date}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card: LGH Daily Report (For UNT19 only) */}
        {isLovissaGuestHouse && visibleLghDailyReports.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div
              onClick={() => setExpandLghDailyReport(!expandLghDailyReport)}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              role="button"
            >
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <FileText className="w-5 h-5 text-indigo-500" />
                LGH Daily Report ({visibleLghDailyReports.length})
              </div>
              {expandLghDailyReport ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <AnimatePresence>
              {expandLghDailyReport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-100 bg-gray-50"
                >
                  <div className="p-3 space-y-3">
                    {visibleLghDailyReports.map((report) => {
                      const reporter = getSystemUserByEmail(report.email);
                      return (
                        <div
                          key={report.id}
                          onClick={() => setSelectedLghReport(report)}
                          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-extrabold text-gray-900 leading-tight">
                                Area: {report.area}
                              </span>
                              {report.description && (
                                <span className="text-[11px] text-gray-500 line-clamp-1 italic">
                                  {report.description}
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "px-2 py-0.5 text-[9px] font-bold rounded-full whitespace-nowrap uppercase tracking-wider",
                              report.status === "Done" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            )}>
                              {report.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              <span>{report.timestamp}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-100 shadow-xs">
                              <img 
                                src={reporter.avatar} 
                                alt={reporter.name} 
                                className="w-5 h-5 rounded-full object-cover border border-white shadow-xs"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute(
                                    "src", 
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(reporter.name)}&background=eff6ff&color=3b82f6`
                                  );
                                }}
                              />
                              <span className="text-[10px] font-bold text-gray-700 truncate max-w-[80px]">
                                {reporter.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card 4: Daftar User */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setUserListModalOpen(true)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Users className="w-5 h-5 text-blue-500" />
              User ({users.length})
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors">
              Lihat Daftar
            </span>
          </div>
        </div>

        {/* Card 5: Daftar Order Budget Review */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setOrderListModalOpen(true)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <FileText className="w-5 h-5 text-yellow-500" />
              Order Budget Review ({orders.length})
            </div>
            <span className="text-xs bg-yellow-50 text-yellow-600 font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:bg-yellow-105 transition-colors">
              Lihat Daftar
            </span>
          </div>
        </div>

        {/* Card 6: Daftar Project */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setShowProjects(!showProjects)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              Project ({projects.length})
            </div>
            {showProjects ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <AnimatePresence>
            {showProjects && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <div className="p-4 space-y-2">
                  {projects.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center">
                      Tidak ada project.
                    </p>
                  ) : (
                    projects
                      .filter((p) => p && p.id)
                      .map((p, i) => (
                        <div
                          key={`project-${p.id || i}-${i}`}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-sm font-medium text-gray-900 truncate flex-1">
                            {p.name}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 7: Daftar Task */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setShowTasks(!showTasks)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Task ({doneTasks}/{tasks.length} Done)
            </div>
            {showTasks ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <AnimatePresence>
            {showTasks && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-gray-100"
              >
                <div className="p-4 space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic text-center">
                      Tidak ada task.
                    </p>
                  ) : (
                    tasks
                      .filter((t) => t && t.id)
                      .map((t, i) => (
                        <div
                          key={`task-${t.id || i}-${i}`}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                          onClick={() => navigate(`/tasks/${t.id}`)}
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              t.status.toLowerCase().includes("done")
                                ? "bg-emerald-500"
                                : "bg-gray-300",
                            )}
                          />
                          <span className="text-sm font-medium text-gray-900 truncate flex-1">
                            {t.name}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            {t.status}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card 9: Daftar Kontak */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setContactListModalOpen(true)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Users className="w-5 h-5 text-pink-500" />
              Kontak ({contacts.length})
            </div>
            <span className="text-xs bg-pink-50 text-pink-600 font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:bg-pink-100 transition-colors">
              Lihat Daftar
            </span>
          </div>
        </div>

        {/* Card 10: Daftar Issue */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setIssueListModalOpen(true)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Issue ({doneIssues}/{issues.length} Selesai)
            </div>
            <span className="text-xs bg-rose-50 text-rose-600 font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:bg-rose-100 transition-colors">
              Lihat Daftar
            </span>
          </div>
        </div>

        {/* Card 11: Kotak Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            onClick={() => setDataListModalOpen(true)}
            className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Database className="w-5 h-5 text-blue-500" />
              Data ({dataDocs.length})
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-1 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors">
              Lihat Daftar
            </span>
          </div>
        </div>
      </div>
      {/* Issue List Modal */}
      <AnimatePresence>
        {issueListModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Daftar Issue
                    </h3>
                    <div className="text-xs text-gray-500">
                      {issues.length} issue ditemukan
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => setIssueListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {issues.length > 0 ? (
                  issues
                    .filter((i) => i && i.id)
                    .map((i, idx) => (
                      <div
                        key={`issue-${i.id || idx}-${idx}`}
                        onClick={() => {
                          setIssueListModalOpen(false);
                          navigate(`/issues/${i.id}`);
                        }}
                        className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer group"
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                (i.status || "").toUpperCase() === "RESOLVED" ||
                                  (i.status || "").toUpperCase() === "DONE"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : (i.status || "").toUpperCase() ===
                                        "IN_PROGRESS" ||
                                      (i.status || "").toUpperCase() ===
                                        "PROCESS"
                                    ? "bg-blue-50 text-blue-600 border-blue-100"
                                    : "bg-rose-50 text-rose-600 border-rose-100",
                              )}
                            >
                              {(i.status || "SEND").toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              {i.timestamp}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-gray-400 group-hover:text-indigo-500 transition-colors">
                            {i.id}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                          {i.keterangan}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(i.user || "User")}&background=eff6ff&color=3b82f6`}
                                alt="avatar"
                              />
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 truncate max-w-[100px]">
                              {i.user?.split("@")[0] || "User"}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform inline-flex items-center">
                            Detail <ChevronRight className="w-3 h-3 ml-0.5" />
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-10">
                    <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Tidak ada issue
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Data List Modal */}
      <AnimatePresence>
        {dataListModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Daftar Data Dokumen
                    </h3>
                    <div className="text-xs text-gray-500">
                      {dataDocs.length} dokumen data ditemukan
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => setDataListModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {dataDocs.length > 0 ? (
                  dataDocs.map((doc: any, idx: number) => {
                    let DocIcon = FileText;
                    const typeLower = (doc.type || '').toLowerCase();
                    if (typeLower.includes('photo') || typeLower.includes('image')) DocIcon = ImageIcon;
                    if (typeLower.includes('link')) DocIcon = LinkIcon;
                    if (typeLower.includes('note')) DocIcon = StickyNote;

                    return (
                      <div
                        key={`data-doc-${doc.id || idx}-${idx}`}
                        onClick={() => {
                          if (doc.isFromIssue) {
                            setDataListModalOpen(false);
                            navigate(`/issues/${doc.issueId || doc.id}`);
                          } else if (doc.isFromAddDocument && doc.activityId) {
                            setDataListModalOpen(false);
                            navigate(`/activities/${doc.activityId}`);
                          }
                        }}
                        className={cn(
                          "bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all flex flex-col gap-3",
                          (doc.isFromIssue || (doc.isFromAddDocument && doc.activityId)) && "cursor-pointer hover:bg-gray-50/50"
                        )}
                        role={(doc.isFromIssue || (doc.isFromAddDocument && doc.activityId)) ? "button" : undefined}
                        tabIndex={(doc.isFromIssue || (doc.isFromAddDocument && doc.activityId)) ? 0 : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <DocIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {doc.timestamp}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {doc.isFromIssue && (
                              <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                ISSUE
                              </span>
                            )}
                            {doc.type && (
                              <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded-md capitalize">
                                {doc.type}
                              </span>
                            )}
                          </div>
                        </div>

                        {doc.note && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                            {doc.note}
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 mt-1">
                          {(doc.file01 || doc.image01 || doc.url01) && (
                            <a
                              href={formatImageUrl(doc.file01 || doc.image01 || doc.url01)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              Buka Dokumen
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 font-medium">
                      Tidak ada data dokumen
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 font-sans"
            >
              <button
                onClick={() => setSelectedTransaction(null)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-2">
                <div
                  className={cn(
                    "p-2.5 rounded-xl",
                    selectedTransaction.isChillhubSale
                      ? "bg-[#429dbb]/10 text-[#429dbb]"
                      : selectedTransaction.isLionParcelTx
                        ? "bg-emerald-50 text-emerald-600"
                        : selectedTransaction.isBoganathaTx
                          ? "bg-blue-50 text-blue-600"
                          : selectedTransaction.isHqTx
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-indigo-50 text-indigo-600",
                  )}
                >
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {selectedTransaction.isChillhubSale
                      ? "Detail Penjualan"
                      : selectedTransaction.isHqTx
                        ? "Detail Transaksi HQ"
                        : "Detail Transaksi"}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {selectedTransaction.isChillhubSale
                      ? `Chillhub Surabaya`
                      : selectedTransaction.isHqTx
                        ? `Head Quarter`
                        : selectedTransaction.isBoganathaTx
                          ? `Boganatha - Nota: ${selectedTransaction.nota}`
                          : selectedTransaction.isLionParcelTx
                            ? `Lion Parcel - No. Resi: ${selectedTransaction.noResi}`
                            : `${selectedTransaction.room} - ${selectedTransaction.type}`}
                  </p>
                </div>
              </div>

              {selectedTransaction.isChillhubSale ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 font-sans text-sm">
                    {/* Activities */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                        Activities
                      </p>
                      <p className="font-extrabold text-blue-600 text-base">
                        {selectedTransaction.activity}
                      </p>
                    </div>

                    {/* Date & Time Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                          Date
                        </p>
                        <p className="font-semibold text-gray-800">
                          {selectedTransaction.date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                          Time
                        </p>
                        <p className="font-semibold text-gray-800">
                          {selectedTransaction.time || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                        Price
                      </p>
                      <p className="font-extrabold text-[#429dbb] text-base">
                        {formatIDR(selectedTransaction.price)}
                      </p>
                    </div>

                    {/* User */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">
                        User
                      </p>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-150 shadow-xs max-w-sm">
                        <img
                          src={
                            getSystemUserByEmail(selectedTransaction.userEmail)
                              ?.avatar
                          }
                          alt={
                            getSystemUserByEmail(selectedTransaction.userEmail)
                              ?.name || "User"
                          }
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-sm font-semibold text-gray-800">
                          {getSystemUserByEmail(selectedTransaction.userEmail)
                            ?.name || "User"}
                        </span>
                      </div>
                    </div>

                    {/* Nota Image Column */}
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1.5">
                        Nota
                      </p>
                      {selectedTransaction.nota ? (
                        <div
                          className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 cursor-zoom-in group"
                          onClick={() =>
                            setZoomedImage(selectedTransaction.nota)
                          }
                          title="Klik untuk memperbesar"
                        >
                          <img
                            src={getImgUrl(selectedTransaction.nota)}
                            alt="Bukti Nota"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).src =
                                "https://placehold.co/600x400?text=Bukti+Nota";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm">
                              Klik untuk Memperbesar
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          Tidak ada foto nota dilampirkan.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : selectedTransaction.isHqTx ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Tanggal
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedTransaction.date || "-"}
                    </p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Activities
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedTransaction.activities || "-"}
                    </p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Client
                    </p>
                    <p className="font-medium text-gray-900">
                      {selectedTransaction.client || "-"}
                    </p>
                  </div>
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Amount
                    </p>
                    <p className="font-medium text-gray-900">
                      Rp{" "}
                      {(Number(selectedTransaction.amount) || 0).toLocaleString(
                        "id-ID",
                      )}
                    </p>
                  </div>
                  {selectedTransaction.file && (
                    <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-2 border border-gray-100">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        Photo / File
                      </p>
                      <a href={selectedTransaction.file} target="_blank" rel="noopener noreferrer" className="block max-w-sm mx-auto overflow-hidden rounded-lg border border-gray-200">
                         <img
                          src={selectedTransaction.file}
                          alt="Transaction attachment"
                          className="w-full h-auto object-contain hover:opacity-90 transition-opacity"
                          crossOrigin="anonymous"
                          onError={(e) => {
                             // Fallback if the URL isn't an image or fails to load
                             (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </a>
                    </div>
                  )}
                </div>
              ) : selectedTransaction.isBoganathaTx ? (
                <div className="space-y-4 font-sans">
                  <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-1 border rounded-md uppercase",
                            selectedTransaction.statusPesanan
                              ?.trim()
                              .toUpperCase() === "SEND"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : selectedTransaction.statusPesanan
                                    ?.trim()
                                    .toUpperCase() === "REVIEW"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                                : selectedTransaction.statusPesanan
                                      ?.trim()
                                      .toUpperCase() === "PROCESS"
                                  ? "bg-purple-50 text-purple-700 border-purple-100"
                                  : selectedTransaction.statusPesanan
                                        ?.trim()
                                        .toUpperCase() === "DONE"
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : "bg-white text-gray-700 border-gray-200",
                          )}
                        >
                          {selectedTransaction.statusPesanan || "-"}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">
                          Tanggal Pesanan
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedTransaction.tanggal}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Informasi Pengiriman
                        </p>
                        {(() => {
                          const hasUnit =
                            selectedTransaction.unit &&
                            selectedTransaction.unit.trim() !== "";
                          const unitData = hasUnit
                            ? systemUnits.get(
                                selectedTransaction.unit.trim().toUpperCase(),
                              )
                            : null;
                          const userData = !hasUnit
                            ? systemUsers.find(
                                (u) =>
                                  u.email ===
                                    selectedTransaction.client?.toLowerCase() ||
                                  u.name === selectedTransaction.client,
                              )
                            : null;

                          return (
                            <div className="flex flex-col gap-1 mt-1">
                              {hasUnit ? (
                                <div className="flex items-center gap-2">
                                  {unitData?.logo ? (
                                    <img
                                      src={unitData.logo}
                                      alt={unitData.name}
                                      className="w-6 h-6 rounded-md object-cover bg-white border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-md bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                      <Building2 className="w-3 h-3 text-gray-400" />
                                    </div>
                                  )}
                                  <span className="font-medium text-sm text-gray-900">
                                    {unitData?.name || selectedTransaction.unit}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {userData?.photo ? (
                                    <img
                                      src={userData.photo}
                                      alt={userData.nameOrEmail}
                                      className="w-6 h-6 rounded-md object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">
                                      {(
                                        userData?.nameOrEmail ||
                                        selectedTransaction.client ||
                                        "U"
                                      )
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-medium text-sm text-gray-900">
                                    {userData?.nameOrEmail ||
                                      selectedTransaction.client ||
                                      "Unknown"}
                                  </span>
                                </div>
                              )}
                              {selectedTransaction.alamatKirim && (
                                <p className="text-sm text-gray-600">
                                  {selectedTransaction.alamatKirim}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-right shrink-0">
                        {(() => {
                          const isPaid =
                            selectedTransaction.statusPaid
                              ?.trim()
                              .toLowerCase() === "paid";
                          const displayStatus = isPaid ? "Paid" : "Unpaid";
                          return (
                            <span
                              className={cn(
                                "inline-block text-xs font-bold px-2 py-1 rounded-md uppercase border",
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-100",
                              )}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">
                      Rincian Pembayaran
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal Produk</span>
                        <span className="font-semibold text-gray-800">
                          {formatIDR(selectedTransaction.subtotal)}
                        </span>
                      </div>
                      {selectedTransaction.statusPesanan
                        ?.trim()
                        .toUpperCase() === "SEND" && (
                        <div className="flex justify-between items-center text-sm mt-2 mb-1">
                          <span className="text-gray-500">
                            Biaya Lain / Ongkir
                          </span>
                          <input
                            type="text"
                            className="w-28 text-right bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
                            value={editBiayaLain}
                            disabled={
                              currentUserEmail !== "vonyloselia@gmail.com"
                            }
                            onChange={(e) =>
                              setEditBiayaLain(
                                e.target.value.replace(/[^0-9]/g, ""),
                              )
                            }
                            onBlur={() => handleUpdateOngkir(editBiayaLain)}
                            placeholder="0"
                          />
                        </div>
                      )}
                      {selectedTransaction.ongkir > 0 &&
                        selectedTransaction.statusPesanan
                          ?.trim()
                          .toUpperCase() !== "SEND" && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Ongkos Kirim</span>
                            <span className="font-semibold text-gray-800">
                              {formatIDR(selectedTransaction.ongkir)}
                            </span>
                          </div>
                        )}
                      {selectedTransaction.diskon > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                            Diskon
                          </span>
                          <span className="font-semibold">
                            - {formatIDR(selectedTransaction.diskon)}
                          </span>
                        </div>
                      )}
                      {selectedTransaction.voucher > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span className="flex items-center gap-1">
                            Voucher
                          </span>
                          <span className="font-semibold">
                            - {formatIDR(selectedTransaction.voucher)}
                          </span>
                        </div>
                      )}
                      {selectedTransaction.poin > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Poin Digunakan</span>
                          <span className="font-semibold text-gray-800">
                            - {formatIDR(selectedTransaction.poin)}
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
                          {formatIDR(selectedTransaction.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "PROCESS" ||
                    selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                      "DONE") &&
                    selectedTransaction.metodeBayar && (
                      <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 text-sm mb-3">
                          Info Pembayaran
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Metode Pembayaran
                            </p>
                            <span className="text-sm font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg inline-block text-gray-800">
                              {selectedTransaction.metodeBayar}
                            </span>
                          </div>
                          {(selectedTransaction.metodeBayar
                            ?.trim()
                            .toLowerCase() === "transfer" ||
                            selectedTransaction.metodeBayar
                              ?.trim()
                              .toLowerCase() === "qris") &&
                          selectedTransaction.buktiBayar ? (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Bukti Pembayaran
                              </p>
                              <img
                                src={selectedTransaction.buktiBayar}
                                alt="Bukti"
                                className="w-full h-auto object-cover rounded-lg border border-gray-200 cursor-pointer"
                                onClick={() =>
                                  setZoomedImage(selectedTransaction.buktiBayar)
                                }
                              />
                            </div>
                          ) : selectedTransaction.metodeBayar
                              ?.trim()
                              .toLowerCase() === "paylater" &&
                            selectedTransaction.dueDate ? (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">
                                Due Date
                              </p>
                              <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-800">
                                  {selectedTransaction.dueDate}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                  <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">
                      Daftar Produk
                    </h3>
                    <div className="space-y-3">
                      {selectedTransaction.items &&
                      selectedTransaction.items.length > 0 ? (
                        selectedTransaction.items
                          .filter((item: any) => item && item.name)
                          .map((item: any, idx: number) => (
                            <div
                              key={`item-${item.prodId || idx}-${idx}`}
                              className={cn(
                                "flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm transition-colors",
                                selectedTransaction.statusPesanan
                                  ?.trim()
                                  .toUpperCase() === "SEND" &&
                                  currentUserEmail === "vonyloselia@gmail.com"
                                  ? "cursor-pointer hover:border-blue-300"
                                  : item.statusKirim?.trim().toUpperCase() ===
                                      "DI TERIMA"
                                    ? "cursor-pointer hover:border-emerald-300"
                                    : "border-gray-100",
                              )}
                              onClick={() => {
                                if (
                                  selectedTransaction.statusPesanan
                                    ?.trim()
                                    .toUpperCase() === "SEND" &&
                                  currentUserEmail === "vonyloselia@gmail.com"
                                ) {
                                  setEditingProductIdx(idx);
                                } else if (
                                  item.statusKirim?.trim().toUpperCase() ===
                                  "DI TERIMA"
                                ) {
                                  setPreviewItem(item);
                                }
                              }}
                            >
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden border border-gray-100">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                      <ShoppingBag className="w-5 h-5 text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                {(selectedTransaction.statusPesanan
                                  ?.trim()
                                  .toUpperCase() === "PROCESS" ||
                                  selectedTransaction.statusPesanan
                                    ?.trim()
                                    .toUpperCase() === "DONE") &&
                                  item.statusKirim &&
                                  item.statusKirim.trim() !== "" && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded text-center",
                                        item.statusKirim
                                          .trim()
                                          .toUpperCase() === "DI TERIMA"
                                          ? "text-emerald-700 bg-emerald-50"
                                          : "text-blue-600 bg-blue-50",
                                      )}
                                    >
                                      {item.statusKirim}
                                    </span>
                                  )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-bold text-gray-900 truncate pr-2">
                                    {item.name}
                                  </p>
                                  {selectedTransaction.statusPesanan
                                    ?.trim()
                                    .toUpperCase() === "PROCESS" &&
                                    item.statusKirim?.trim().toUpperCase() !==
                                      "DI TERIMA" && (
                                      <>
                                        {item.statusKirim
                                          ?.trim()
                                          .toUpperCase() !== "TERKIRIM" &&
                                          currentUserEmail ===
                                            "vonyloselia@gmail.com" && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetStatusKirim(idx);
                                              }}
                                              disabled={isUpdatingTx}
                                              className="text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50 shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            >
                                              Kirim
                                            </button>
                                          )}
                                        {item.statusKirim
                                          ?.trim()
                                          .toUpperCase() === "TERKIRIM" &&
                                          currentUserEmail !==
                                            "vonyloselia@gmail.com" && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenCameraForItemIdx(idx);
                                              }}
                                              disabled={isUpdatingTx}
                                              className="text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50 shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                            >
                                              Terima
                                            </button>
                                          )}
                                      </>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-gray-500">
                                      {item.qty} {item.uom || item.satuan} x
                                    </p>
                                    {editingProductIdx === idx ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        className="w-20 bg-gray-50 border border-blue-300 rounded px-1.5 py-0.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={editHargaSatuan[idx] || ""}
                                        onChange={(e) =>
                                          setEditHargaSatuan((prev) => ({
                                            ...prev,
                                            [idx]: e.target.value.replace(
                                              /[^0-9]/g,
                                              "",
                                            ),
                                          }))
                                        }
                                        onBlur={() => {
                                          handleUpdateHargaSatuan(
                                            item.rowIndex,
                                            item.priceColIdx,
                                            editHargaSatuan[idx],
                                            idx,
                                          );
                                          setEditingProductIdx(null);
                                        }}
                                       placeholder="update harga"
                                      />
                                    ) : (
                                      <p className="text-xs text-gray-500">
                                        {formatIDR(item.price)}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-xs font-bold text-teal-600">
                                    {formatIDR(
                                      editingProductIdx === idx && editHargaSatuan[idx] !== undefined
                                        ? (parseFloat(editHargaSatuan[idx]) || 0) * item.qty
                                        : item.subtotal
                                    )}
                                  </p>
                                </div>

                                {selectedTransaction.statusPesanan?.trim().toUpperCase() === "REVIEW" && (
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
                                        handleUpdateItemStatus(item, "OK");
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
                                        handleUpdateItemStatus(item, "EDIT");
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
                                        handleCancelDeleteProductItem(item);
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
                        <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border border-gray-100 border-dashed">
                          Detail produk tidak ditemukan
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "REVIEW" &&
                    currentUserEmail !== "vonyloselia@gmail.com" && (
                      <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
                        <h3 className="font-bold text-gray-900 text-sm mb-3">
                          Metode Pembayaran
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {["Transfer", "QRIS", "Paylater"].map((method) => (
                            <button
                              key={method}
                              onClick={() => handleSetMetodeBayar(method)}
                              className={cn(
                                "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors",
                                selectedTransaction.metodeBayar
                                  ?.trim()
                                  .toLowerCase() === method.toLowerCase()
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
                              )}
                            >
                              {method}
                            </button>
                          ))}
                        </div>

                        {selectedTransaction.metodeBayar
                          ?.trim()
                          .toLowerCase() === "transfer" && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-800 text-center font-bold mb-4">
                            BCA no.xxxxx
                          </div>
                        )}
                        {selectedTransaction.metodeBayar
                          ?.trim()
                          .toLowerCase() === "qris" && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex justify-center">
                            <img
                              src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/QRIS%20KTA.png"
                              alt="QRIS"
                              className="max-w-[200px] h-auto rounded-lg"
                            />
                          </div>
                        )}
                        {selectedTransaction.metodeBayar
                          ?.trim()
                          .toLowerCase() === "paylater" && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <input
                              type="date"
                              className="flex-1 bg-transparent border-none text-sm font-semibold text-gray-800 focus:outline-none focus:ring-0"
                              value={
                                selectedTransaction.dueDate
                                  ? new Date(selectedTransaction.dueDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              onChange={(e) => handleSetDueDate(e.target.value)}
                            />
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Bukti Pembayaran (Optional)
                          </p>
                          {selectedTransaction.buktiBayar ? (
                            <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white">
                              <img
                                src={selectedTransaction.buktiBayar}
                                alt="Bukti"
                                className="w-full h-32 object-cover"
                              />
                              <button
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                                onClick={() => handleSetBuktiBayar("")}
                              >
                                Hapus
                              </button>
                            </div>
                          ) : (
                            <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 hover:bg-gray-50 transition-colors cursor-pointer text-sm font-medium text-gray-600">
                              {isUpdatingTx ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              )}
                              {isUpdatingTx
                                ? "Uploading..."
                                : "Upload Bukti Transfer"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUpdatingTx}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUpdatingTx(true);
                                  try {
                                    const { url } =
                                      await DriveService.uploadFile(file);
                                    await handleSetBuktiBayar(url);
                                  } catch (err) {
                                    console.error(err);
                                    setIsUpdatingTx(false);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ) : selectedTransaction.isLionParcelTx ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Nama Pengirim
                    </p>
                    <p className="font-bold text-gray-900 text-base">
                      {selectedTransaction.pengirim || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      No. Resi
                    </p>
                    <p className="font-semibold text-gray-800 font-mono">
                      {selectedTransaction.noResi || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Layanan
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.layanan &&
                      selectedTransaction.layanan !== "2026"
                        ? selectedTransaction.layanan
                            .replace(/\b2026\b/g, "")
                            .trim() || "-"
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Cara Pembayaran
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.caraPembayaran || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Tujuan
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.tujuan || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Tanggal (Date)
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.date || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Berat
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.berat
                        ? `${selectedTransaction.berat} kg`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Jenis Barang
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.jenisBarang || "-"}
                    </p>
                  </div>

                  <div className="col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">
                      Tarif Masuk
                    </p>
                    <p className="font-extrabold text-emerald-600 text-lg">
                      {formatIDR(selectedTransaction.tarifMasuk)}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-gray-100 pt-3">
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                      Keterangan
                    </label>
                    <textarea
                      value={selectedTransaction.keterangan || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTransaction((prev: any) => prev ? { ...prev, keterangan: val } : null);
                      }}
                      onBlur={(e) => handleUpdateLionParcelKeterangan(e.target.value)}
                      placeholder="Masukkan keterangan..."
                      rows={2}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Bukti Bayar View */}
                  {selectedTransaction.buktiBayar && (
                    <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        Bukti Bayar
                      </p>
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer" onClick={() => setZoomedImage(selectedTransaction.buktiBayar)}>
                        <img
                          src={getImgUrl(selectedTransaction.buktiBayar)}
                          alt="Bukti Bayar"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src =
                              "https://placehold.co/400x300?text=Bukti+Bayar";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                              Klik untuk Memperbesar
                            </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {isLovissaGuestHouse && selectedTransaction?.room && currentUserEmail !== "prawinaputu@gmail.com" && (
                    <div className="mb-2">
                      {!showCleaningBreakdown ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCleaningBreakdown(true);
                            const now = new Date();
                            const dateStr = now.toISOString().split("T")[0];
                            const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
                            setCleaningDate(dateStr);
                            setCleaningTime(timeStr);
                            setCleaningArea(`kamar ${selectedTransaction.room}`.toLowerCase());
                            setCleaningUser("Putu (prawinaputu@gmail.com)");
                            setCleaningKeterangan("");
                          }}
                          className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          Request Cleaning
                        </button>
                      ) : (
                        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              Request Cleaning - Room {selectedTransaction.room}
                            </h5>
                            <button
                              type="button"
                              onClick={() => setShowCleaningBreakdown(false)}
                              className="text-xs text-amber-700 hover:underline"
                            >
                              Batal
                            </button>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Tanggal dan Jam</label>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="date"
                                  value={cleaningDate}
                                  onChange={(e) => setCleaningDate(e.target.value)}
                                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <input
                                  type="time"
                                  value={cleaningTime}
                                  onChange={(e) => setCleaningTime(e.target.value)}
                                  className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Area</label>
                              <input
                                type="text"
                                value={cleaningArea}
                                onChange={(e) => setCleaningArea(e.target.value)}
                                placeholder="Contoh: Kamar 1, Balkon, Kamar Mandi..."
                                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />

                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">User</label>
                              <input
                                type="text"
                                value="Putu (prawinaputu@gmail.com)"
                                readOnly
                                className="w-full bg-gray-50 border border-amber-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">Keterangan</label>
                              <textarea
                                value={cleaningKeterangan}
                                onChange={(e) => setCleaningKeterangan(e.target.value)}
                                placeholder="Masukkan keterangan pembersihan..."
                                rows={2}
                                className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={isSubmittingCleaning}
                              onClick={() => handleProcessCleaning(selectedTransaction.room)}
                              className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {isSubmittingCleaning ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Memproses...
                                </>
                              ) : (
                                "Proses"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Nama Tamu
                    </p>
                    <p className="font-bold text-gray-900 text-base">
                      {selectedTransaction.name || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      No. ID / ID Card
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.noId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Payment Method
                    </p>
                    <p className="font-semibold text-gray-800">
                      {selectedTransaction.payment || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Booking Source
                    </p>
                    <p className="font-bold text-indigo-900 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-indigo-500 inline shrink-0" />
                      {selectedTransaction.bookingSource || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Check In
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.checkIn || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Check Out
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.checkOut || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Kamar / Room
                    </p>
                    <p className="font-semibold text-gray-800">
                      Room {selectedTransaction.room || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Durasi
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.dur || "-"} {selectedTransaction.type || "Malam"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Email
                    </p>
                    <p
                      className="font-medium text-gray-800 truncate"
                      title={selectedTransaction.email}
                    >
                      {selectedTransaction.email || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Phone
                    </p>
                    <p className="font-medium text-gray-800">
                      {selectedTransaction.phone || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Price/Night
                    </p>
                    <p className="font-semibold text-gray-950">
                      {formatIDR(selectedTransaction.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Total Amount
                    </p>
                    <p className="font-bold text-emerald-600 text-base">
                      {formatIDR(selectedTransaction.amount)}
                    </p>
                  </div>

                  <div className="col-span-2 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
                      Keterangan
                    </p>
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-dashed border-gray-200 leading-relaxed">
                      {selectedTransaction.keterangan ||
                        "Tidak ada keterangan tambahan."}
                    </p>
                  </div>

                  {/* Photographic Identification View */}
                  <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Photo ID
                    </p>
                    {selectedTransaction.photoId ? (
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer" onClick={() => setZoomedImage(selectedTransaction.photoId)}>
                        <img
                          src={getImgUrl(selectedTransaction.photoId)}
                          alt="Photo ID"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src =
                              "https://placehold.co/400x300?text=Photo+ID+Preview";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                            Klik untuk Memperbesar
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Tidak ada Photo ID dilampirkan.
                      </p>
                    )}
                  </div>

                  {/* Transfer Payment View */}
                  {selectedTransaction.buktiTransfer && (
                    <div className="col-span-2 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        Bukti Transfer
                      </p>
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer" onClick={() => setZoomedImage(selectedTransaction.buktiTransfer)}>
                        <img
                          src={getImgUrl(selectedTransaction.buktiTransfer)}
                          alt="Bukti Transfer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as any).src =
                              "https://placehold.co/400x300?text=Bukti+Transfer";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                              Klik untuk Memperbesar
                            </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

              <div className="mt-6 flex justify-end gap-3">
                {isLovissaGuestHouse &&
                  !selectedTransaction.isChillhubSale &&
                  !selectedTransaction.isLionParcelTx &&
                  !selectedTransaction.isBoganathaTx && (
                    <button
                      onClick={() => setShowPrintPreview(true)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      Receipt
                    </button>
                  )}
                {selectedTransaction.isBoganathaTx &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "SEND" &&
                  currentUserEmail === "vonyloselia@gmail.com" && (
                    <button
                      onClick={handleSetToReview}
                      disabled={isUpdatingTx}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingTx ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "To Review"
                      )}
                    </button>
                  )}
                {selectedTransaction.isBoganathaTx &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() === "REVIEW" && (
                    <>
                      {selectedTransaction.items &&
                      selectedTransaction.items.length > 0 &&
                      selectedTransaction.items.every(
                        (it: any) => it.statusPesanan?.trim().toUpperCase() === "OK"
                      ) ? (
                        <button
                          onClick={handleSetToProcess}
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
                            onClick={handleSetToSend}
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
                {selectedTransaction.isBoganathaTx &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() === "PROCESS" && (
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Invoice</span>
                    </button>
                  )}
                {selectedTransaction.isBoganathaTx &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "PROCESS" &&
                  selectedTransaction.items?.every(
                    (it: any) =>
                      it.statusKirim?.trim().toUpperCase() === "DI TERIMA",
                  ) && (
                    <button
                      onClick={handleSetPesananDone}
                      disabled={isUpdatingTx}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingTx && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Done
                    </button>
                  )}
                {selectedTransaction.isBoganathaTx &&
                  selectedTransaction.statusPaid?.trim().toUpperCase() !==
                    "PAID" &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "DONE" &&
                  currentUserEmail === "vonyloselia@gmail.com" && (
                    <button
                      onClick={handleSetPaid}
                      disabled={isUpdatingTx}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdatingTx && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Paid
                    </button>
                  )}
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className={cn(
                    "text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm",
                    selectedTransaction.isChillhubSale
                      ? "bg-[#429dbb]/10 hover:bg-[#348099]"
                      : selectedTransaction.isLionParcelTx
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : selectedTransaction.isBoganathaTx
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-indigo-600 hover:bg-indigo-700",
                  )}
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAddProduct && (
        <AddProductDropdown
          products={allProductsList}
          onSave={handleSaveAddProducts}
          onClose={() => setShowAddProduct(false)}
        />
      )}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-2xl space-y-4 font-sans"
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h4 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Info Pengiriman
              </h4>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                    {previewItem.statusKirim}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Penerima</p>
                  <div className="flex items-center gap-2">
                    {getSystemUserByEmail(previewItem.penerima)?.avatar ? (
                      <img
                        src={getSystemUserByEmail(previewItem.penerima)?.avatar}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {previewItem.penerima?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-800">
                      {getSystemUserByEmail(previewItem.penerima)?.name ||
                        previewItem.penerima}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Waktu</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {previewItem.timestamp}
                  </p>
                </div>
                {previewItem.photo && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Foto Bukti</p>
                    <img
                      src={formatImageUrl(previewItem.photo)}
                      alt="Bukti"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      onClick={() => setZoomedImage(previewItem.photo)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {openCameraForItemIdx !== null && (
        <CameraModal
          onClose={() => setOpenCameraForItemIdx(null)}
          onCapture={(blob) => handleSetDiTerima(blob)}
          onGallerySelect={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (file) handleSetDiTerima(file);
            };
            input.click();
          }}
        />
      )}
      {/* Print Preview Modal for Lovissa Guesthouse */}
      <AnimatePresence>
        {showPrintPreview && selectedTransaction && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-gray-100 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden font-sans border border-gray-200"
            >
              {/* Modal Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-gray-900 text-base">
                    Tanda Terima
                  </h4>
                </div>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Document Area */}
              <div className="p-6 overflow-y-auto flex-1 bg-gray-100 flex items-center justify-center min-h-[300px]">
                {selectedTransaction.printUrl ? (
                  selectedTransaction.printUrl.toLowerCase().includes(".pdf") ||
                  selectedTransaction.printUrl.toLowerCase().includes("pdf") ? (
                    <div className="w-full h-full min-h-[450px] flex flex-col space-y-3">
                      <iframe
                        src={selectedTransaction.printUrl}
                        className="w-full flex-1 min-h-[400px] border border-gray-300 rounded-xl bg-white shadow-sm"
                        title="Receipt PDF"
                      />
                      <div className="text-center text-xs text-gray-500 italic">
                        Menampilkan Dokumen PDF. Gunakan tombol di bawah jika tidak tampil otomatis.
                      </div>
                    </div>
                  ) : (
                    <img
                      src={selectedTransaction.printUrl}
                      alt="Receipt"
                      className="max-w-full h-auto rounded-lg shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  )
                ) : (
                  <div className="text-center text-gray-500 py-10">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Receipt image not available</p>
                  </div>
                )}
              </div>

              {/* Modal Footer (Actions) */}
              <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                {selectedTransaction.printUrl && (
                  <>
                    <button
                      onClick={() => {
                        window.open(
                          `https://api.whatsapp.com/send?text=${encodeURIComponent("Here is your receipt: " + selectedTransaction.printUrl)}`,
                          "_blank",
                        );
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      Send
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(selectedTransaction.printUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          const fileName = selectedTransaction.printUrl.split("/").pop()?.split("?")[0] || "receipt.pdf";
                          a.download = fileName.endsWith(".pdf") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")
                            ? fileName
                            : `${fileName}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          window.open(selectedTransaction.printUrl, "_blank");
                        }
                      }}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 1. User List Modal Popup */}
      <AnimatePresence>
        {userListModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4 font-sans"
            >
              <button
                onClick={() => setUserListModalOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="w-5 h-5 text-blue-500 shrink-0" />
                <h4 className="text-base font-bold text-gray-900">
                  Daftar Warga
                </h4>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    Tidak ada anggota terdaftar untuk unit ini.
                  </p>
                ) : (
                  users
                    .filter((u) => u && (u.id || u.email))
                    .map((u, i) => (
                      <div
                        key={`user-${u.id || u.email || i}-${i}`}
                        onClick={() => {
                          setSelectedUserDetail(u);
                          setUserListModalOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition-all border border-gray-100 text-left cursor-pointer group"
                        role="button"
                        tabIndex={0}
                      >
                        <img
                          src={formatImageUrl(u.photo)}
                          alt={u.name}
                          className={cn(
                            "w-10 h-10 rounded-full border border-gray-200 object-cover group-hover:scale-105 transition-transform",
                            u.avail === "FALSE"
                              ? "brightness-50 grayscale"
                              : "",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {u.name}
                          </p>
                          <p className="text-xs text-gray-550 truncate">
                            {u.email || "No email registered"}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 2. User Detail Modal Popup */}
      <AnimatePresence>
        {selectedUserDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-6 font-sans border border-gray-100/50"
            >
              <button
                onClick={() => {
                  setSelectedUserDetail(null);
                  setUserListModalOpen(true);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pt-3">
                <div className="relative">
                  <img
                    src={formatImageUrl(selectedUserDetail.photo)}
                    alt={selectedUserDetail.name}
                    className={cn(
                      "w-24 h-24 rounded-full border-4 border-blue-50 shadow-md object-cover",
                      selectedUserDetail.avail === "FALSE"
                        ? "brightness-50 grayscale"
                        : "",
                    )}
                  />
                  <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedUserDetail.fullName || selectedUserDetail.name}
                  </h4>
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mt-0.5">
                    {selectedUserDetail.name}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/70 rounded-2xl p-4.5 border border-gray-100/50 text-sm space-y-3.5">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Email
                    </p>
                    <p
                      className="font-medium text-gray-800 text-xs truncate"
                      title={selectedUserDetail.email}
                    >
                      {selectedUserDetail.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Nomor HP
                    </p>
                    <p className="font-bold text-gray-800 text-xs">
                      {selectedUserDetail.phone || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200/50 pt-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      KTA ID
                    </p>
                    <p className="font-mono text-xs font-semibold text-gray-800">
                      {selectedUserDetail.ktaId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Poin
                    </p>
                    <p className="font-bold text-xs text-blue-600">
                      {selectedUserDetail.points || 0} Poin
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setSelectedUserDetail(null);
                    setUserListModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-600 bg-gray-105 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer"
                >
                  Kembali
                </button>
                {["RL01", "RL02", "RL03"].includes(
                  (selectedUserDetail.role || "").toUpperCase(),
                ) && (
                  <button
                    onClick={() =>
                      navigate(
                        `/users/${encodeURIComponent(selectedUserDetail.id)}`,
                      )
                    }
                    className="flex-1 py-2.5 px-4 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md cursor-pointer text-center"
                  >
                    Buka Profil
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 3. Order List Modal Popup */}
      <AnimatePresence>
        {orderListModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 relative shadow-2xl space-y-4 font-sans"
            >
              <button
                onClick={() => setOrderListModalOpen(false)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-5 h-5 text-yellow-500 shrink-0" />
                <h4 className="text-base font-bold text-gray-900">
                  Daftar Order Budget Review
                </h4>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {allObers.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    Tidak ada order budget terdaftar.
                  </p>
                ) : (
                  [...allObers]
                    .filter((o) => o && o.id)
                    .reverse()
                    .map((o, i) => {
                      const statusClass =
                        o.tier?.toLowerCase() === "paid" ||
                        o.tier?.toLowerCase() === "approved" ||
                        o.tier?.toLowerCase() === "lunas"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : o.tier?.toLowerCase() === "review" ||
                              o.tier?.toLowerCase() === "pending"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100";

                      return (
                        <div
                          key={`order-${o.id || i}-${i}`}
                          onClick={() => {
                            setSelectedOrderDetail(o);
                            setOrderListModalOpen(false);
                          }}
                          className="w-full p-3 bg-gray-50 hover:bg-yellow-50/40 rounded-xl transition-all border border-gray-100 hover:border-yellow-250 text-left cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-405 font-bold mb-0.5">
                              {o.date}
                            </p>
                            <p
                              className="text-sm font-bold text-gray-900 truncate group-hover:text-yellow-600 transition-colors"
                              title={o.detail}
                            >
                              {o.detail}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <span className="text-xs font-black text-gray-900 shrink-0">
                              {formatIDR(o.amount)}
                            </span>
                            <span
                              className={cn(
                                "text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider shrink-0",
                                statusClass,
                              )}
                            >
                              {o.tier}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 2b. Contact List Modal Popup */}
      <AnimatePresence>
        {contactListModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-4 relative shadow-2xl space-y-4 font-sans border border-gray-100/55"
            >
              <button
                onClick={() => setContactListModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="w-5 h-5 text-pink-500 shrink-0" />
                <h4 className="text-base font-bold text-gray-900">
                  Daftar Kontak
                </h4>
              </div>

              <div className="max-h-[70vh] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {contacts.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">
                    Tidak ada kontak terdaftar untuk unit ini.
                  </p>
                ) : (
                  contacts
                    .filter((c) => c && c.id)
                    .map((item, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={`contact-${item.id || i}-${i}`}
                        onClick={() => {
                          setSelectedContactDetail(item);
                          setContactListModalOpen(false);
                        }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer"
                      >
                        <div className="flex items-center gap-4 h-full">
                          <div className="relative shrink-0">
                            <img
                              src={formatImageUrl(item.photo)}
                              alt={item.name}
                              className={cn(
                                "w-14 h-14 rounded-full object-cover border border-gray-200",
                                item.avail === "FALSE"
                                  ? "brightness-50 grayscale"
                                  : "",
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex justify-between items-start gap-3">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-gray-900 leading-tight truncate">
                                {item.name}
                              </h3>
                              <div className="mt-1 space-y-0.5 flex flex-col gap-1">
                                {item.usecase && (
                                  <p className="text-xs text-gray-800 font-medium truncate leading-none">
                                    {item.usecase}
                                  </p>
                                )}
                                {unit?.name && (
                                  <p className="text-[11px] text-gray-600 truncate leading-none flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                    {unit.name}
                                  </p>
                                )}
                                {item.jenis && item.jenis !== "-" && (
                                  <p className="text-[10px] text-gray-500 truncate leading-none mt-0.5">
                                    <span className="text-gray-400">
                                      Jenis:
                                    </span>{" "}
                                    {item.jenis}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100/80 mt-1.5 w-fit shadow-xs">
                                  <Coins className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>{item.points || 0} Poin</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0 h-full justify-between">
                              <div className="flex flex-col items-end gap-1.5">
                                {item.role && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100 whitespace-nowrap shadow-sm">
                                    {item.role}
                                  </span>
                                )}
                                {item.type && item.type !== "General" && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap border border-indigo-100/50">
                                    {item.type}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-auto">
                                <button className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors cursor-pointer">
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                                <button className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors cursor-pointer">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 2c. Contact Detail Modal Popup */}
      <AnimatePresence>
        {selectedContactDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-6 font-sans border border-gray-100/50"
            >
              <button
                onClick={() => {
                  setSelectedContactDetail(null);
                  setContactListModalOpen(true);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pt-3">
                <div className="relative">
                  <img
                    src={formatImageUrl(selectedContactDetail.photo)}
                    alt={selectedContactDetail.name}
                    className={cn(
                      "w-24 h-24 rounded-full border-4 border-pink-50 shadow-md object-cover",
                      selectedContactDetail.avail === "FALSE"
                        ? "brightness-50 grayscale"
                        : "",
                    )}
                  />
                  <div className="absolute bottom-0 right-0 bg-pink-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">
                    {selectedContactDetail.fullName ||
                      selectedContactDetail.name}
                  </h4>
                  <p className="text-xs font-semibold text-pink-500 uppercase tracking-widest mt-0.5">
                    {selectedContactDetail.name}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/70 rounded-2xl p-4.5 border border-gray-100/50 text-sm space-y-3.5">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Email
                    </p>
                    <p
                      className="font-medium text-gray-800 text-xs truncate"
                      title={selectedContactDetail.email}
                    >
                      {selectedContactDetail.email || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Nomor HP
                    </p>
                    <p className="font-bold text-gray-800 text-xs">
                      {selectedContactDetail.phone || "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200/50 pt-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      KTA ID
                    </p>
                    <p className="font-mono text-xs font-semibold text-gray-800">
                      {selectedContactDetail.ktaId || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Usecase
                    </p>
                    <p className="font-bold text-xs text-pink-600">
                      {selectedContactDetail.usecase || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-gray-200/50 pt-3">
                  <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                      Jumlah Poin
                    </p>
                    <p className="font-bold text-amber-700 text-xs">
                      {selectedContactDetail.points || 0} Poin
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setSelectedContactDetail(null);
                    setContactListModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-600 bg-gray-105 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 4. Order Detail Modal Popup */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-5 font-sans border border-gray-100/55"
            >
              <button
                onClick={() => {
                  setSelectedOrderDetail(null);
                  setOrderListModalOpen(true);
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center shadow-sm">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900">
                    Detail Order Budget
                  </h4>
                  <p className="text-xs text-gray-405">
                    RO Number: {selectedOrderDetail.ro || "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Order Detail / Item
                </p>
                <h3 className="font-extrabold text-gray-950 text-sm leading-snug">
                  {selectedOrderDetail.detail}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Tanggal
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {selectedOrderDetail.date || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Tipe Order
                  </p>
                  <p className="font-semibold text-gray-800 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {selectedOrderDetail.type || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Model Pembayaran
                  </p>
                  <p className="font-semibold text-gray-800">
                    Via {selectedOrderDetail.via || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Status Review
                  </p>
                  <span className="font-extrabold uppercase shrink-0 text-yellow-600 text-[10px]">
                    {selectedOrderDetail.tier || "-"}
                  </span>
                </div>

                <div className="col-span-2 space-y-1 border-t border-gray-200/50 pt-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Penerima Dana / Bank
                  </p>
                  <p className="font-medium text-gray-800 leading-relaxed">
                    {selectedOrderDetail.bank &&
                    selectedOrderDetail.bank !== "-"
                      ? `${selectedOrderDetail.bank} - `
                      : ""}
                    No. Rek:{" "}
                    <span className="font-mono font-bold text-gray-950">
                      {selectedOrderDetail.rekNo || "-"}
                    </span>
                    {selectedOrderDetail.an && selectedOrderDetail.an !== "-"
                      ? ` (a.n. ${selectedOrderDetail.an})`
                      : ""}
                  </p>
                </div>

                <div className="col-span-2 space-y-1 border-t border-gray-200/50 pt-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    Pemohon / Email
                  </p>
                  <p
                    className="font-medium text-gray-800 truncate"
                    title={selectedOrderDetail.userEmail}
                  >
                    {selectedOrderDetail.userEmail || "-"}
                  </p>
                </div>
              </div>

              {/* Status Persetujuan */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-2">
                <h3 className="font-bold text-gray-900 text-sm mb-3">
                  Status Persetujuan
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      u: "Admin",
                      s: selectedOrderDetail.t1r,
                      d: selectedOrderDetail.dt1,
                    },
                    {
                      u: "Board",
                      s: selectedOrderDetail.t2r,
                      d: selectedOrderDetail.dt2,
                    },
                    {
                      u: "Boss",
                      s: selectedOrderDetail.t3r,
                      d: selectedOrderDetail.dt3,
                    },
                  ]
                    .filter((t, i) => {
                      if (i === 1)
                        return selectedOrderDetail.t1r
                          ?.toUpperCase()
                          .includes("APPROVE");
                      if (i === 2)
                        return selectedOrderDetail.t2r
                          ?.toUpperCase()
                          .includes("APPROVE");
                      return true;
                    })
                    .map((tier, i) => {
                      return (
                        <div
                          key={`tier-${i}`}
                          className="text-sm text-gray-700 flex justify-between items-center leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 font-medium"
                        >
                          <span>
                            {tier.u}:{" "}
                            <span
                              className={
                                tier.s?.toUpperCase()?.includes("REJECT")
                                  ? "text-red-500 font-bold"
                                  : tier.s?.toUpperCase()?.includes("APPROVE")
                                    ? "text-emerald-500 font-bold"
                                    : "text-amber-500 font-bold"
                              }
                            >
                              {tier.s || "PENDING"}
                            </span>
                          </span>
                          {tier.d && tier.d !== "-" && (
                            <span className="text-[10px] text-gray-400 bg-white px-2 py-1 rounded shadow-sm border border-gray-100/50">
                              @ {formatDateToMMDDYYYY(tier.d)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Nota Belanja Card */}
              {(selectedOrderDetail.nota || selectedOrderDetail.type === "Reimburse" || selectedOrderDetail.type === "Operational") && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Nota Belanja
                  </h3>
                  <NotaMediaViewer url={selectedOrderDetail.nota} />
                </div>
              )}

              {selectedOrderDetail.catatan &&
                selectedOrderDetail.catatan !== "-" && (
                  <div className="space-y-1.5 bg-yellow-50/40 p-3 rounded-xl border border-yellow-100/50">
                    <p className="text-[10px] uppercase font-black text-yellow-800 flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 fill-current text-yellow-500" />
                      Catatan Tambahan
                    </p>
                    <p className="text-xs text-gray-700 font-medium italic whitespace-pre-wrap leading-relaxed">
                      "{selectedOrderDetail.catatan}"
                    </p>
                  </div>
                )}

              <div className="space-y-2 border-t border-gray-100 pt-3 font-bold text-sm">
                <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Total Anggaran
                  </span>
                  <span className="text-sm font-black text-rose-600">
                    {formatIDR(selectedOrderDetail.amount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setSelectedOrderDetail(null);
                    setOrderListModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-150 rounded-xl transition-colors cursor-pointer text-center"
                >
                  Kembali
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LGH Daily Report Detail Modal */}
      <AnimatePresence>
        {selectedLghReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end font-sans">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-gray-50 h-full shadow-2xl flex flex-col"
            >
              <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 tracking-tight">Detail Laporan LGH</h2>
                    <p className="text-xs text-gray-500 font-medium">#{selectedLghReport.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLghReport(null)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-24">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                      <span className={cn(
                        "px-3 py-1 text-xs font-bold rounded-full",
                        selectedLghReport.status === "Done" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {selectedLghReport.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal</p>
                      <p className="text-xs font-semibold text-gray-800">{selectedLghReport.timestamp}</p>
                    </div>
                  </div>
                  
                  {/* Pelapor */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pelapor</p>
                    {(() => {
                      const reporter = getSystemUserByEmail(selectedLghReport.email);
                      return (
                        <div className="flex items-center gap-2.5 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                          <img 
                            src={reporter.avatar} 
                            alt={reporter.name} 
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-xs" 
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute(
                                "src", 
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(reporter.name)}&background=eff6ff&color=3b82f6`
                              );
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{reporter.name}</p>
                            <p className="text-[11px] text-gray-400 font-normal truncate">{selectedLghReport.email}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {selectedLghReport.description && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Deskripsi Laporan</p>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedLghReport.description}</p>
                      </div>
                    </div>
                  )}

                  {selectedLghReport.files && selectedLghReport.files.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Lampiran ({selectedLghReport.files.length})</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLghReport.files.map((file: any, idx: number) => {
                          const fileStr = typeof file === 'string' ? file : (file?.url || '');
                          const isVideo = typeof fileStr === 'string' && fileStr.match(/\.(mp4|webm|ogg|mov)$/i);
                          return (
                            <div 
                              key={idx} 
                              onClick={() => {
                                setZoomedImage(file);
                              }}
                              className="aspect-square bg-gray-100 rounded-xl border border-gray-200 overflow-hidden cursor-zoom-in relative"
                            >
                              {isVideo ? (
                                <video src={getImgUrl(file)} className="w-full h-full object-cover" />
                              ) : (
                                <img src={getImgUrl(file)} alt="attachment" className="w-full h-full object-cover" />
                              )}
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center pl-0.5">
                                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-indigo-600 border-b-4 border-b-transparent" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Box Diskusi Laporan */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-800 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-indigo-500" />
                      Diskusi Laporan
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {selectedLghReport.chat && selectedLghReport.chat.length > 0 ? (
                      selectedLghReport.chat.map((msg: any, idx: number) => {
                        const isMe = msg.email === currentUserEmail;
                        const msgUser = getSystemUserByEmail(msg.email);
                        const senderName = isMe ? "Anda" : (msgUser?.name || msg.email);
                        return (
                          <div key={idx} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                            <div className={cn(
                              "px-3 py-2 rounded-2xl text-sm",
                              isMe ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"
                            )}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium mt-1 px-1">
                              {senderName} • {msg.timestamp}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-2">
                        <MessageCircle className="w-8 h-8 opacity-20" />
                        <p className="text-xs font-medium">Belum ada diskusi.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                    <form onSubmit={handleLghChatSubmit} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tulis pesan..."
                        value={lghChatInput}
                        onChange={(e) => setLghChatInput(e.target.value)}
                        disabled={isLghUpdating}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!lghChatInput.trim() || isLghUpdating}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLghUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Button Tandai Selesai di bawah kotak diskusi */}
                {selectedLghReport.status !== "Done" && currentUserEmail.toLowerCase() !== 'prawinaputu@gmail.com' && (
                  <div className="mt-4">
                    <button
                      onClick={handleLghDone}
                      disabled={isLghUpdating}
                      className="w-full py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                    >
                      {isLghUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Tandai Selesai (Done)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zoomed Image popup modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-neutral-900 overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title and Close button */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-950 shrink-0 text-white">
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                  Pratinjau Foto ID / Bukti
                </span>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                  aria-label="Tutup foto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable container for scaled image */}
              <div className="overflow-auto flex-1 p-6 flex items-center justify-center bg-neutral-900/50 min-h-[350px] max-h-[70vh]">
                <div className="relative overflow-visible flex items-center justify-center w-full h-full">
                  {(() => {
                    const drivePreviewUrl = getDrivePreviewUrl(zoomedImage);
                    if (drivePreviewUrl) {
                      return (
                        <iframe
                          src={drivePreviewUrl}
                          className="w-full h-full min-h-[55vh] rounded-lg shadow-xl bg-black"
                          allow="autoplay"
                        />
                      );
                    }
                    if (typeof zoomedImage === 'string' && zoomedImage.match(/\.(mp4|webm|ogg|mov)$/i)) {
                      return (
                        <video
                          src={getImgUrl(zoomedImage)}
                          controls
                          autoPlay
                          style={{
                            transform: `scale(${imgScale})`,
                            transformOrigin: "center center",
                            transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                          }}
                          className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl"
                        />
                      );
                    }
                    return (
                      <img
                        src={getImgUrl(zoomedImage)}
                        alt="Zoomed"
                        style={{
                          transform: `scale(${imgScale})`,
                          transformOrigin: "center center",
                          transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        className="max-w-full max-h-[55vh] object-contain rounded-lg shadow-xl"
                        referrerPolicy="no-referrer"
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Zoom Controls Footer */}
              <div className="bg-neutral-950 border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
                <div className="text-xs text-gray-400 font-medium hidden sm:block">
                  Gunakan tombol di sebelah kanan untuk memperbesar atau memperkecil gambar.
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

      {/* Empty Room Request Cleaning Modal */}
      <AnimatePresence>
        {clickedEmptyRoom && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4 font-sans"
            >
              <button
                onClick={() => setClickedEmptyRoom(null)}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Request Cleaning - {clickedEmptyRoom}
                  </h4>
                  <p className="text-xs text-gray-400">
                    Kamar Kosong - Buat laporan pembersihan
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tanggal dan Jam</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={cleaningDate}
                      onChange={(e) => setCleaningDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="time"
                      value={cleaningTime}
                      onChange={(e) => setCleaningTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Area</label>
                  <input
                    type="text"
                    value={cleaningArea}
                    onChange={(e) => setCleaningArea(e.target.value)}
                    placeholder="Contoh: Kamar 1, Balkon, Kamar Mandi..."
                    className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">User</label>
                  <input
                    type="text"
                    value="Putu (prawinaputu@gmail.com)"
                    readOnly
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Keterangan</label>
                  <textarea
                    value={cleaningKeterangan}
                    onChange={(e) => setCleaningKeterangan(e.target.value)}
                    placeholder="Masukkan keterangan pembersihan..."
                    rows={3}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSubmittingCleaning}
                  onClick={() => handleProcessCleaning(clickedEmptyRoom)}
                  className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCleaning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Proses"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInvoiceModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[150] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-lg sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header Controls */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Nota Penjualan</h4>
                    <p className="text-xs text-gray-400">Siap Cetak & Bagikan</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Invoice Container (Scrollable Preview) */}
              <div className="flex-1 overflow-y-auto p-0 sm:p-4 bg-gray-100/70 flex justify-center">
                <div className="w-full flex justify-center items-start py-2 sm:py-4 min-h-full">
                  {/* Fixed printable envelope with exact styles */}
                  <div
                    ref={invoiceRef}
                    className="bg-white w-full max-w-full sm:max-w-[440px] px-3.5 py-4 sm:p-6 sm:shadow-md border-y sm:border border-gray-200/80 flex flex-col font-mono text-gray-800 shrink-0 select-none text-xs sm:text-[11px]"
                  >
                  {/* 1. Header (Bagian Kepala Nota) */}
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-dashed border-gray-800">
                    <img
                      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/bgn.png"
                      alt="Bgn Logo"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-contain shrink-0 rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="flex-1 text-center pr-2">
                      <h2 className="text-lg font-black tracking-widest text-gray-950 leading-none">
                        BOGANATHA
                      </h2>
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-600 tracking-tight mt-1">
                        INVOICE PEMESANAN BARANG
                      </p>
                    </div>
                  </div>

                  {/* 2. Informasi Metadata (Kepada & Detail) */}
                  <div className="py-3 grid grid-cols-2 gap-2 sm:gap-4 text-[10px] sm:text-[11px] border-b-2 border-dashed border-gray-800 text-left">
                    {/* Sisi Kiri (KEPADA) */}
                    <div className="flex flex-col min-w-0 pr-1">
                      <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                        KEPADA:
                      </p>
                      {(() => {
                        const hasUnit =
                          selectedTransaction.unit &&
                          selectedTransaction.unit.trim() !== "";
                        const unitData = hasUnit
                          ? systemUnits.get(
                              selectedTransaction.unit.trim().toUpperCase(),
                            )
                          : null;
                        const userData = !hasUnit
                          ? systemUsers.find(
                              (u) =>
                                u.email ===
                                  selectedTransaction.client?.toLowerCase() ||
                                u.name === selectedTransaction.client,
                            )
                          : null;

                        const nameToDisplay = hasUnit
                          ? (unitData?.name || selectedTransaction.unit)
                          : (userData?.fullName || selectedTransaction.client || "Pribadi");

                        return (
                          <div>
                            <p className="font-extrabold text-gray-950 text-xs sm:text-[11px] leading-tight break-words">
                              {nameToDisplay}
                            </p>
                          </div>
                        );
                      })()}
                      {selectedTransaction.alamatKirim && (
                        <p className="text-gray-500 mt-1 leading-snug text-[9px] sm:text-[10px] break-words">
                          {selectedTransaction.alamatKirim}
                        </p>
                      )}
                    </div>

                    {/* Sisi Kanan (DETAIL) */}
                    <div className="text-right flex flex-col justify-start space-y-1 min-w-0 pl-1">
                      <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                        DETAIL:
                      </p>
                      <div className="flex justify-between items-center w-full text-[10px] sm:text-[11px] text-gray-700 gap-1">
                        <span className="text-gray-400 shrink-0">No Invoice:</span>
                        <span className="font-bold text-gray-950 truncate text-right">{selectedTransaction.nota}</span>
                      </div>
                      <div className="flex justify-between items-center w-full text-[10px] sm:text-[11px] text-gray-700 gap-1">
                        <span className="text-gray-400 shrink-0">Tanggal:</span>
                        <span className="font-semibold text-gray-950 whitespace-nowrap text-right">{selectedTransaction.tanggal}</span>
                      </div>
                      <div className="flex justify-between items-center w-full text-[10px] sm:text-[11px] text-gray-700 gap-1">
                        <span className="text-gray-400 shrink-0">Status:</span>
                        {(() => {
                          const isPaid =
                            selectedTransaction.statusPaid
                              ?.trim()
                              .toLowerCase() === "paid";
                          return (
                            <span className={cn("font-bold uppercase tracking-wider", isPaid ? "text-emerald-600" : "text-rose-600")}>
                              {isPaid ? "Paid" : "Unpaid"}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* 3. Tabel Rincian Produk */}
                  <div className="py-3">
                    <table className="w-full text-xs sm:text-[10px]">
                      <thead>
                        <tr className="text-gray-500 font-bold uppercase text-[9px] sm:text-[10px] text-left border-b border-dashed border-gray-400">
                          <th className="pb-2 text-left pr-2">PRODUK</th>
                          <th className="pb-2 text-center px-1 w-10 shrink-0">QTY</th>
                          <th className="pb-2 text-right px-1.5 whitespace-nowrap shrink-0">HARGA</th>
                          <th className="pb-2 text-right pl-2 whitespace-nowrap shrink-0">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dotted divide-gray-300">
                        {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                          selectedTransaction.items.map((item: any, idx: number) => {
                            const rawName = item.name || item.item || item.productName || item.id_produk || "Produk";
                            const qtyVal = item.qty || item.jumlah || 1;
                            const priceVal = item.price || item.harga_satuan || 0;
                            const totalVal = priceVal * qtyVal;

                            return (
                              <tr key={idx} className="text-gray-800 text-left">
                                <td className="py-2 pr-2 font-medium text-xs sm:text-[10px] break-words leading-tight">
                                  {rawName}
                                </td>
                                <td className="py-2 text-center font-bold text-gray-900 px-1 whitespace-nowrap shrink-0 text-xs sm:text-[10px]">
                                  {qtyVal}
                                </td>
                                <td className="py-2 text-right text-gray-700 px-1.5 whitespace-nowrap shrink-0 font-medium text-xs sm:text-[10px]">
                                  {formatThermalIDR(priceVal)}
                                </td>
                                <td className="py-2 text-right font-bold text-gray-950 pl-2 whitespace-nowrap shrink-0 text-xs sm:text-[10px]">
                                  {formatThermalIDR(totalVal)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-3 text-center text-gray-400">
                              Tidak ada produk
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 4. Rincian Pembayaran (Totals Box) */}
                  <div className="pt-2 border-t-2 border-dashed border-gray-800 text-xs sm:text-[10px] space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-gray-600 font-medium gap-2">
                      <span>Subtotal</span>
                      <span className="font-bold text-gray-950 whitespace-nowrap text-right shrink-0">{formatThermalIDR(selectedTransaction.subtotal)}</span>
                    </div>

                    {selectedTransaction.ongkir > 0 && (
                      <div className="flex justify-between items-center text-gray-600 font-medium gap-2">
                        <span>Ongkir</span>
                        <span className="font-bold text-gray-950 whitespace-nowrap text-right shrink-0">{formatThermalIDR(selectedTransaction.ongkir)}</span>
                      </div>
                    )}

                    {selectedTransaction.diskon > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                        <span>Diskon</span>
                        <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.diskon)}</span>
                      </div>
                    )}

                    {selectedTransaction.voucher > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                        <span>Voucher</span>
                        <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.voucher)}</span>
                      </div>
                    )}

                    {selectedTransaction.poin > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                        <span>Potongan Poin</span>
                        <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.poin)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 mt-1 border-t-2 border-dashed border-gray-800 text-xs sm:text-sm font-black text-gray-950 gap-2">
                      <span className="shrink-0">TOTAL BAYAR</span>
                      <span className="text-sm sm:text-base font-black text-blue-600 whitespace-nowrap text-right shrink-0">
                        {formatThermalIDR(selectedTransaction.total)}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const status1 = selectedTransaction.statusPesanan?.trim().toLowerCase();
                    const status2 = selectedTransaction.status?.trim().toLowerCase();
                    const isProses = status1 === "process" || status1 === "proses" || status2 === "process" || status2 === "proses";
                    
                    if (isProses) {
                      return (
                        <div className="pt-3 pb-1 mt-3 border-t-2 border-dashed border-gray-800 text-[10px] sm:text-[11px] text-gray-800 text-left">
                          <p className="font-bold mb-0.5 uppercase tracking-wider text-gray-500 text-[9px]">Pembayaran Transfer:</p>
                          <p className="font-extrabold text-gray-950">Bank Jago: 101321925093</p>
                          <p className="font-medium text-gray-700">a.n. Komang Gilang Pradnya T.N</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 5. Footer (Bagian Penutup) */}
                  <div className="text-center pt-3 mt-4 border-t border-dashed border-gray-400 text-[9px] sm:text-[10px] text-gray-400 pb-3">
                    <p className="italic">
                      “terimakasih sudah berbelanja di boganatha”
                    </p>
                  </div>
                </div>
              </div>
            </div>

              {/* Action Buttons Footer */}
              <div className="p-3.5 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={shareInvoice}
                  disabled={isGeneratingImage}
                  className="flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-4 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 border border-sky-100 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span>Bagikan</span>
                </button>
                <button
                  onClick={downloadInvoice}
                  disabled={isGeneratingImage}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl sm:rounded-2xl py-2.5 sm:py-3 px-4 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm shadow-sky-100 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Unduh Gambar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden invoice container for auto-uploading when marking DONE */}
      <div className="absolute pointer-events-none opacity-0" style={{ left: "-9999px", top: "-9999px" }}>
        {selectedTransaction && (
          <div
            ref={autoInvoiceRef}
            className="bg-white w-[380px] p-5 flex flex-col font-mono text-gray-800 shrink-0 select-none text-[11px]"
            style={{ backgroundColor: "#ffffff" }}
          >
            {/* 1. Header (Bagian Kepala Nota) */}
            <div className="flex items-center gap-3 pb-3 border-b-2 border-dashed border-gray-800">
              <img
                src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/bgn.png"
                alt="Bgn Logo"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-contain shrink-0 rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="flex-1 text-center pr-4">
                <h2 className="text-lg font-black tracking-widest text-gray-950 leading-none">
                  BOGANATHA
                </h2>
                <p className="text-[9px] font-bold text-gray-600 tracking-tight mt-1">
                  INVOICE PEMESANAN BARANG
                </p>
              </div>
            </div>

            {/* 2. Informasi Metadata (Kepada & Detail) */}
            <div className="py-3 grid grid-cols-2 gap-2 text-[10px] border-b-2 border-dashed border-gray-800 text-left">
              {/* Sisi Kiri (KEPADA) */}
              <div className="flex flex-col">
                <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                  KEPADA:
                </p>
                {(() => {
                  const hasUnit =
                    selectedTransaction.unit &&
                    selectedTransaction.unit.trim() !== "";
                  const unitData = hasUnit
                    ? systemUnits.get(
                        selectedTransaction.unit.trim().toUpperCase(),
                      )
                    : null;
                  const userData = !hasUnit
                    ? systemUsers.find(
                        (u) =>
                          u.email ===
                            selectedTransaction.client?.toLowerCase() ||
                          u.name === selectedTransaction.client,
                      )
                    : null;

                  const nameToDisplay = hasUnit
                    ? (unitData?.name || selectedTransaction.unit)
                    : (userData?.fullName || selectedTransaction.client || "Pribadi");

                  return (
                    <div>
                      <p className="font-extrabold text-gray-950 text-[11px] leading-tight">
                        {nameToDisplay}
                      </p>
                    </div>
                  );
                })()}
                {selectedTransaction.alamatKirim && (
                  <p className="text-gray-500 mt-1 leading-snug text-[9px] break-all">
                    {selectedTransaction.alamatKirim}
                  </p>
                )}
              </div>

              {/* Sisi Kanan (DETAIL) */}
              <div className="text-right flex flex-col justify-start space-y-1">
                <p className="text-gray-500 font-bold uppercase tracking-wider text-[9px] mb-0.5">
                  DETAIL:
                </p>
                <div className="flex justify-between w-full text-[10px] text-gray-700">
                  <span className="text-gray-400">No Invoice:</span>
                  <span className="font-bold text-gray-950">{selectedTransaction.nota}</span>
                </div>
                <div className="flex justify-between w-full text-[10px] text-gray-700">
                  <span className="text-gray-400">Tanggal:</span>
                  <span className="font-semibold text-gray-950">{selectedTransaction.tanggal}</span>
                </div>
                <div className="flex justify-between w-full text-[10px] text-gray-700">
                  <span className="text-gray-400">Status:</span>
                  {(() => {
                    const isPaid =
                      selectedTransaction.statusPaid
                        ?.trim()
                        .toLowerCase() === "paid";
                    return (
                      <span className={cn("font-bold uppercase tracking-wider", isPaid ? "text-emerald-600" : "text-rose-600")}>
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* 3. Tabel Rincian Produk */}
            <div className="py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 font-bold uppercase text-[10px] text-left border-b border-dashed border-gray-400">
                    <th className="pb-2 text-left pr-2">PRODUK</th>
                    <th className="pb-2 text-center px-1 w-10 shrink-0">QTY</th>
                    <th className="pb-2 text-right px-1.5 whitespace-nowrap shrink-0">HARGA</th>
                    <th className="pb-2 text-right pl-2 whitespace-nowrap shrink-0">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-gray-300">
                  {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                    selectedTransaction.items.map((item: any, idx: number) => {
                      const rawName = item.name || item.item || item.productName || item.id_produk || "Produk";
                      const qtyVal = item.qty || item.jumlah || 1;
                      const priceVal = item.price || item.harga_satuan || 0;
                      const totalVal = priceVal * qtyVal;

                      return (
                        <tr key={idx} className="text-gray-800 text-left">
                          <td className="py-2 pr-2 font-medium text-xs break-words leading-tight">
                            {rawName}
                          </td>
                          <td className="py-2 text-center font-bold text-gray-900 px-1 whitespace-nowrap shrink-0 text-xs">
                            {qtyVal}
                          </td>
                          <td className="py-2 text-right text-gray-700 px-1.5 whitespace-nowrap shrink-0 font-medium text-xs">
                            {formatThermalIDR(priceVal)}
                          </td>
                          <td className="py-2 text-right font-bold text-gray-950 pl-2 whitespace-nowrap shrink-0 text-xs">
                            {formatThermalIDR(totalVal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-gray-400">
                        Tidak ada produk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Rincian Pembayaran (Totals Box) */}
            <div className="pt-2 border-t-2 border-dashed border-gray-800 text-xs space-y-1.5 text-left">
              <div className="flex justify-between items-center text-gray-600 font-medium gap-2">
                <span>Subtotal</span>
                <span className="font-bold text-gray-950 whitespace-nowrap text-right shrink-0">{formatThermalIDR(selectedTransaction.subtotal)}</span>
              </div>

              {selectedTransaction.ongkir > 0 && (
                <div className="flex justify-between items-center text-gray-600 font-medium gap-2">
                  <span>Ongkir</span>
                  <span className="font-bold text-gray-950 whitespace-nowrap text-right shrink-0">{formatThermalIDR(selectedTransaction.ongkir)}</span>
                </div>
              )}

              {selectedTransaction.diskon > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                  <span>Diskon</span>
                  <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.diskon)}</span>
                </div>
              )}

              {selectedTransaction.voucher > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                  <span>Voucher</span>
                  <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.voucher)}</span>
                </div>
              )}

              {selectedTransaction.poin > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-bold gap-2">
                  <span>Potongan Poin</span>
                  <span className="whitespace-nowrap text-right shrink-0">-{formatThermalIDR(selectedTransaction.poin)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 mt-1 border-t-2 border-dashed border-gray-800 text-sm font-black text-gray-950 gap-2">
                <span className="shrink-0">TOTAL BAYAR</span>
                <span className="text-base font-black text-blue-600 whitespace-nowrap text-right shrink-0">
                  {formatThermalIDR(selectedTransaction.total)}
                </span>
              </div>
            </div>

                              {(() => {
                    const status1 = selectedTransaction.statusPesanan?.trim().toLowerCase();
                    const status2 = selectedTransaction.status?.trim().toLowerCase();
                    const isProses = status1 === "process" || status1 === "proses" || status2 === "process" || status2 === "proses";
                    
                    if (isProses) {
                      return (
                        <div className="pt-3 pb-1 mt-3 border-t-2 border-dashed border-gray-800 text-[10px] sm:text-[11px] text-gray-800 text-left">
                          <p className="font-bold mb-0.5 uppercase tracking-wider text-gray-500 text-[9px]">Pembayaran Transfer:</p>
                          <p className="font-extrabold text-gray-950">Bank Jago: 101321925093</p>
                          <p className="font-medium text-gray-700">a.n. Komang Gilang Pradnya T.N</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 5. Footer (Bagian Penutup) */}
            <div className="text-center pt-3 mt-4 border-t border-dashed border-gray-400 text-[9px] text-gray-400 pb-3">
              <p className="italic">
                “terimakasih sudah berbelanja di boganatha”
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
