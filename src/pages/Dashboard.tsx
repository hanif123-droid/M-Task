import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CheckCircle2,
  Activity,
  DollarSign,
  Building2,
  Users,
  ListOrdered,
  AlertCircle,
  AlertTriangle,
  FileText,
  UserPlus,
  Package,
  Box,
  Coffee,
  ShieldCheck,
  Settings,
  Grip,
  Camera,
  Loader2,
  X,
  Image as ImageIcon,
  RefreshCw,
  Bell,
  Plus,
  Clock,
  File as FileIcon,
  Link,
  ChevronDown,
  ShoppingBag,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { cn, formatImageUrl, formatUnitName } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { DriveService } from "../lib/driveService";
import { OrderBudgetNotaUploader } from "../components/OrderBudgetNotaUploader";
import { supabase } from "../lib/supabaseAuth";
import { logActivity } from "../lib/activityLogger";
import { resolveActivityTarget } from "../lib/activityNavigator";
import {
  getSheetData,
  appendSheetData,
  updateSheetData,
  getSheetDataFromId,
  updateSheetDataFromId,
  appendSheetDataFromId,
} from "../lib/api";
import { sendDeviceNotification } from "../utils/feedback";

type ActionItem = {
  id: string;
  label: string;
  icon: any; // using any for simplicity, can be LucideIcon
  color: string;
  path?: string;
  isImageUpload?: boolean;
  isFileUpload?: boolean;
};

const LionParcelIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20KIRIM%20BARANG2.png"
      alt="Kirim Barang"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
      referrerPolicy="no-referrer"
    />
  );
};

const WargaIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20waega.png"
      alt="Warga"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
    />
  );
};

const KontakIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20contact.png"
      alt="Kontak"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
    />
  );
};

const LghIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20CHECK%20IN.png"
      alt="Check In"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
      referrerPolicy="no-referrer"
    />
  );
};

const ChillhubIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20DAILY%20REPORT.png"
      alt="Daily Report"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
    />
  );
};

const BoganathaIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20BELANJA.png"
      alt="Belanja"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
    />
  );
};

const OrderBudgetIcon = (props: { className?: string }) => {
  return (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20ORDER%20BUDGET.png"
      alt="Order Budget"
      className={cn("object-contain", props.className)}
      style={{ filter: "none" }}
    />
  );
};

const DailyReportIcon = (props: { className?: string }) => (
  <img
    src="https://static.vecteezy.com/system/resources/thumbnails/065/979/428/small/a-clipboard-with-a-bar-chart-on-it-free-png.png"
    alt="Daftar Daily Report"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);
const UnitLghIcon = (props: { className?: string }) => (
  <img
    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/lgh.png"
    alt="Lovissa Guest house"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);

const AddIssueIcon = (props: { className?: string }) => {
  const [hasError, setHasError] = useState(false);
  return hasError ? (
    <AlertCircle className={cn("text-rose-500", props.className)} />
  ) : (
    <img
      src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20FORM/LOGO%20ISSUE.png"
      alt="Add Issue"
      className={cn("object-contain", props.className)}
      onError={() => setHasError(true)}
      style={{ filter: "none" }}
    />
  );
};

const UnitHqIcon = (props: { className?: string }) => (
  <img
    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/hq.png"
    alt="Head Quarter"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);

const UnitChsIcon = (props: { className?: string }) => (
  <img
    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/chs%20(1).png"
    alt="Chillhub Surabaya"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);

const UnitBgnIcon = (props: { className?: string }) => (
  <img
    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/bgn.png"
    alt="Boganatha"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);

const UnitLpIcon = (props: { className?: string }) => (
  <img
    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon&avatar%20user/logo%20unit/lp.png"
    alt="Lion Parcel"
    className={cn("object-contain", props.className)}
    referrerPolicy="no-referrer"
  />
);

const DailyReportLogo = ({ className }: { className?: string }) => (
  <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-P59xJDi7xkHiFWDL56kh88eBmdHyWSgkqvH8vZNxrA&s=10" className={cn("object-cover rounded", className)} alt="Daily Report Logo" referrerPolicy="no-referrer" />
);

const ALL_ACTIONS: ActionItem[] = [
  {
    id: "daftar_belanja",
    label: "Daftar Belanja",
    icon: ShoppingBag,
    color: "text-[#429dbb]",
    path: "/daftar-belanja",
  },
  {
    id: "1",
    label: "Project",
    icon: Briefcase,
    color: "text-blue-600",
    path: "/projects",
  },
  {
    id: "3",
    label: "Task",
    icon: CheckCircle2,
    color: "text-green-600",
    path: "/all-tasks",
  },
  {
    id: "5",
    label: "Order Budget",
    icon: OrderBudgetIcon,
    color: "text-yellow-600",
  },

  {
    id: "7",
    label: "Kontak",
    icon: KontakIcon,
    color: "text-pink-600",
    path: "/contacts",
  },
  {
    id: "8",
    label: "Daftar Order",
    icon: ListOrdered,
    color: "text-teal-600",
    path: "/orders",
  },
  {
    id: "10",
    label: "Activities",
    icon: Activity,
    color: "text-purple-600",
  },
  {
    id: "11",
    label: "Warga",
    icon: WargaIcon,
    color: "text-cyan-600",
    path: "/users",
  },
  {
    id: "12",
    label: "Kirim Barang",
    icon: LionParcelIcon,
    color: "text-sky-600",
  },
  {
    id: "13",
    label: "Check In",
    icon: LghIcon,
    color: "text-violet-600",
    path: "/lgh-form",
  },
  {
    id: "14",
    label: "Daily Report",
    icon: ChillhubIcon,
    color: "text-fuchsia-600",
  },
  {
    id: "15",
    label: "Belanja",
    icon: BoganathaIcon,
    color: "text-rose-600",
    path: "/boganatha-transactions",
  },
  {
    id: "lgh_daily_report",
    label: "LGH Daily Report",
    icon: FileText,
    color: "text-indigo-600",
    path: "/lgh-daily-report",
  },
  {
    id: "dr_dok",
    label: "Daily Report",
    icon: DailyReportLogo,
    color: "text-blue-500",
  },
  {
    id: "hq_form",
    label: "HQ",
    icon: UnitHqIcon,
    color: "text-slate-700",
  },
  {
    id: "16",
    label: "Setting",
    icon: Settings,
    color: "text-slate-600",
    path: "/settings",
  },
  {
    id: "add_issue",
    label: "Add Issue",
    icon: AddIssueIcon,
    color: "text-rose-600",
  },
  {
    id: "daftar_issue",
    label: "Daftar Issue",
    icon: AlertTriangle,
    color: "text-amber-500",
    path: "/issues",
  },
  {
    id: "daftar_daily_report",
    label: "Daftar Daily Report",
    icon: DailyReportIcon,
    color: "text-blue-500",
    path: "/daftar-daily-report",
  },
  {
    id: "101",
    label: "Lovissa Guest house",
    icon: UnitLghIcon,
    color: "text-indigo-600",
    path: "/units/UNT19",
  },
  {
    id: "102",
    label: "Head Quarter",
    icon: UnitHqIcon,
    color: "text-slate-700",
    path: "/units/UNT01",
  },
  {
    id: "103",
    label: "Chillhub Surabaya",
    icon: UnitChsIcon,
    color: "text-[#429dbb]",
    path: "/units/UNT15",
  },
  {
    id: "104",
    label: "Boganatha",
    icon: UnitBgnIcon,
    color: "text-rose-600",
    path: "/units/UNT09",
  },
  {
    id: "105",
    label: "Lion Parcel",
    icon: UnitLpIcon,
    color: "text-amber-500",
    path: "/units/UNT12",
  },
];

function BannerCarousel({
  items,
  onItemClick,
}: {
  items: { image: string; judul?: string; linkTo?: string }[];
  onItemClick?: (link: string | undefined) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const filteredItems = items.filter(
    (item) =>
      item && typeof item.image === "string" && item.image.trim() !== "",
  );

  useEffect(() => {
    if (filteredItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
    }, 6000); // 6 seconds automatic slide interval as requested
    return () => clearInterval(timer);
  }, [filteredItems.length, currentIndex]);

  const handleDragStart = (clientX: number) => {
    setDragStartX(clientX);
  };

  const handleDragEnd = (clientX: number) => {
    if (dragStartX === null) return;
    const diff = dragStartX - clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
      } else {
        // swipe right -> prev
        setCurrentIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
        );
      }
    }
    setDragStartX(null);
  };

  if (filteredItems.length === 0) return null;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative h-40 select-none cursor-grab active:cursor-grabbing"
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseUp={(e) => handleDragEnd(e.clientX)}
      onMouseLeave={() => setDragStartX(null)}
    >
      <div
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {filteredItems.map((item, i) => (
          <div
            key={`banner-carousel-item-${i}`}
            onClick={() => onItemClick?.(item.linkTo)}
            className={cn(
              "w-full h-full flex-shrink-0 relative",
              item.linkTo && item.linkTo.trim() !== "" ? "cursor-pointer" : "",
            )}
          >
            <img
              src={item.image}
              className="w-full h-full object-cover pointer-events-none"
              alt={`Banner ${i + 1}`}
              draggable="false"
            />
            {item.judul && item.judul.trim() !== "" ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-3">
                <span className="text-white text-sm font-medium drop-shadow-sm">
                  {item.judul}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {filteredItems.length > 1 && (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5 z-10">
          {filteredItems.map((_, i) => (
            <button
              key={`banner-carousel-dot-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                currentIndex === i ? "w-4 bg-white" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { CameraModal } from "../components/CameraModal";

export function Dashboard() {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle",
  );
  const [lastSync, setLastSync] = useState<string>("");

  const [banner1, setBanner1] = useState<{
    image: string;
    judul: string;
    linkTo?: string;
  } | null>(null);
  const [banner2List, setBanner2List] = useState<
    { image: string; judul: string; linkTo?: string }[]
  >([]);
  const [banner3List, setBanner3List] = useState<
    { image: string; judul?: string; linkTo?: string }[]
  >([]);

  // Interface for unread Task notifications
  interface UnreadTask {
    id: string;
    name: string;
    dueDate: string;
    rowNumber: number;
    readColLetter: string;
  }

  // Interface for unread Sub Task notifications
  interface UnreadSubtask {
    id: string;
    name: string;
    dueDate: string;
    rowNumber: number;
    readColLetter: string;
    sheetName: "Sub Task" | "Subtask";
  }

  interface UnreadOrderBudget {
    id: string;
    detail: string;
    rowNumber: number;
    statusColLetter: string;
    sheetName: string;
    nextStatus: string;
  }

  interface OverdueTask {
    id: string;
    name: string;
    dueDate: string;
    daysOverdue: number;
    status: string;
  }

  interface UserOrderBudgetNotif {
    id: string; // The order ID
    detail: string;
    reviewTier: string;
    rowNumber: number;
    statusColLetter: string;
    readColLetter: string;
    sheetName: string;
  }

  interface ReviewTask {
    id: string;
    name: string;
    dueDate: string;
    rowNumber: number;
    reportedColLetter: string;
  }

  const currentUserEmail =
    localStorage.getItem("mtask_user_email") || "user@example.com";
  const [unreadTasks, setUnreadTasks] = useState<UnreadTask[]>([]);
  const [unreadReviewTasks, setUnreadReviewTasks] = useState<ReviewTask[]>([]);
  const [unreadSubtasks, setUnreadSubtasks] = useState<UnreadSubtask[]>([]);
  const seenTasksRef = useRef<Set<string>>(new Set());
  const seenSubtasksRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);
  const [unreadOrders, setUnreadOrders] = useState<UnreadOrderBudget[]>([]);
  const [userOrderNotifs, setUserOrderNotifs] = useState<
    UserOrderBudgetNotif[]
  >([]);
  const [obNotifLoading, setObNotifLoading] = useState(false);
  const [userObNotifLoading, setUserObNotifLoading] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [subNotifLoading, setSubNotifLoading] = useState(false);
  const [activeUserName, setActiveUserName] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>(
    () => (localStorage.getItem("mtask_user_role") || "").trim().toUpperCase(),
  );
  const [currentUserUsecase, setCurrentUserUsecase] = useState<string>("");

  // Custom states for Pesanan Baru notification
  const [unreadPesanan, setUnreadPesanan] = useState<any | null>(null);
  const [hasUnreadPesananList, setHasUnreadPesananList] =
    useState<boolean>(false);

  // Custom states for Proses Pesanan notification
  const [unreadProsesPesanan, setUnreadProsesPesanan] = useState<any | null>(
    null,
  );

  // Custom states for Pesanan Telah Di Review notification
  const [unreadReviewPesanan, setUnreadReviewPesanan] = useState<any | null>(
    null,
  );

  // Custom states for Review Pesanan notification
  const [unreadReviewPesananUser, setUnreadReviewPesananUser] = useState<
    any | null
  >(null);

  interface NewsItem {
    id: string;
    text: string;
    category: "Project" | "Task" | "Activity" | "Form" | "Unit";
    dateStr: "Hari ini" | "Kemarin";
    timeStr: string;
    targetPath?: string;
    targetLabel?: string;
    targetBadge?: string;
    rawActivity?: any;
  }

  const [tickerNews, setTickerNews] = useState<NewsItem[]>([]);
  const [showNewsModal, setShowNewsModal] = useState(false);

  const [userList, setUserList] = useState<any[]>([]);

  const getUserDisplayName = (emailStr: string) => {
    if (!emailStr) return 'User';
    const clean = emailStr.trim().toLowerCase();
    
    const matched = userList.find(
      (u) => u.email && (
        u.email.trim().toLowerCase() === clean ||
        u.email.trim().toLowerCase().split('@')[0] === clean ||
        (u.name && u.name.trim().toLowerCase() === clean)
      )
    );
    if (matched && matched.name) {
      return matched.name;
    }
    
    if (emailStr.includes('@')) {
      const prefix = emailStr.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return emailStr;
  };

  const getUserAvatarUrl = (emailStr: string, displayName: string) => {
    if (emailStr) {
      const clean = emailStr.trim().toLowerCase();
      const matched = userList.find(
        (u) => u.email && (
          u.email.trim().toLowerCase() === clean ||
          u.email.trim().toLowerCase().split('@')[0] === clean
        )
      );
      if (matched && matched.avatar) {
        return matched.avatar;
      }
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=eff6ff&color=3b82f6`;
  };
  const [masukColLetter, setMasukColLetter] = useState<string>("");
  const [showMasukPopup, setShowMasukPopup] = useState(false);
  const [selectedWargaEmail, setSelectedWargaEmail] = useState("");
  const [wargaPin, setWargaPin] = useState("");
  const [isWargaDropdownOpen, setIsWargaDropdownOpen] = useState(false);
  const [isUpdatingMasuk, setIsUpdatingMasuk] = useState(false);

  // Helper to convert index to letter (A, B, C... Z, AA, AB)
  const getColLetter = (colIndex: number): string => {
    let temp = colIndex;
    let letter = "";
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Effect to fetch unread notifications (Tasks & Sub Tasks & User Profile Name)
  useEffect(() => {
    if (!currentUserEmail) return;

    let timer: NodeJS.Timeout;

    const fetchAllNotifications = async () => {
      try {
        const pending: UnreadTask[] = [];
        const pendingSub: UnreadSubtask[] = [];
        // 1. Fetch User details to get Active User's name and Check "Masuk"
        const userRes = await getSheetData("User!A1:ZZ1000").catch(() => null);
        if (userRes?.values && userRes.values.length > 0) {
          const userHeaders = userRes.values[0] as string[];
          const emailIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "EMAIL",
          );
          const nameIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "NAME",
          );
          const fullNameIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "FULL NAME" || (h || "").trim().toUpperCase() === "FULLNAME",
          );
          const avatarIdx = userHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "AVATAR" ||
              (h || "").trim().toUpperCase() === "PHOTO",
          );
          const pinIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "PIN",
          );
          const idIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "ID",
          );
          const availIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "AVAIL",
          );
          const roleIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "ROLE",
          );
          const usecaseIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "USECASE",
          );
          const ubIdx = userHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "UNIT BUSINESS" ||
              (h || "").trim().toUpperCase() === "UNIT",
          );
          const rekIdx = userHeaders.findIndex(
            (h) => {
              const u = (h || "").trim().toUpperCase();
              return u === "REK." || u === "REK" || u === "REKENING" || u === "NO. REKENING" || u === "NO REKENING" || u === "NO REK" || u === "NO. REK" || u === "NOREK" || u === "NO.REK";
            }
          );
          let poinIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "POIN",
          );
          let pColLetter = "";
          if (poinIdx > -1) {
            pColLetter = getColLetter(poinIdx);
          } else {
            poinIdx = userHeaders.length;
            pColLetter = getColLetter(poinIdx);
          }
          setPoinColLetter(pColLetter);

          let mIdx = userHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "MASUK",
          );
          let mColLetter = "";
          if (mIdx > -1) {
            mColLetter = getColLetter(mIdx);
          } else {
            mIdx = userHeaders.length;
            mColLetter = getColLetter(mIdx);
          }
          setMasukColLetter(mColLetter);

          if (emailIdx > -1 && nameIdx > -1) {
            const parsedUsers = userRes.values
              .slice(1)
              .map((row: any[], i: number) => {
                return {
                  email: row[emailIdx]?.trim() || "",
                  name: row[nameIdx]?.trim() || "",
                  fullName: fullNameIdx > -1 ? row[fullNameIdx]?.toString().trim() || "" : "",
                  avatar: formatImageUrl(
                    avatarIdx > -1 ? row[avatarIdx]?.trim() || "" : "",
                  ),
                  pin: pinIdx > -1 ? row[pinIdx]?.toString().trim() || "" : "",
                  id: idIdx > -1 ? row[idIdx]?.toString().trim() || "" : "",
                  avail:
                    availIdx > -1 ? row[availIdx]?.toString().trim() || "" : "",
                  role: roleIdx > -1 ? row[roleIdx]?.trim() || "" : "",
                  usecase: usecaseIdx > -1 ? row[usecaseIdx]?.trim() || "" : "",
                  unitBusiness: ubIdx > -1 ? row[ubIdx]?.trim() || "" : "",
                  rek: rekIdx > -1 ? row[rekIdx]?.toString().trim() || "" : "",
                  poin:
                    poinIdx > -1
                      ? parseInt(row[poinIdx]?.toString().trim(), 10) || 0
                      : 0,
                  masuk:
                    mIdx > -1 && row[mIdx]
                      ? row[mIdx].toString().trim().toUpperCase() === "TRUE"
                      : false,
                  rowNumber: i + 2,
                };
              })
              .filter((u) => u.name);

            setUserList(parsedUsers);
            setVendorList(
              parsedUsers.filter((u) => u.role.toLowerCase() === "vendor"),
            );
            setTallentList(
              parsedUsers.filter((u) => u.role.toLowerCase() === "tallent"),
            );
            setMemberList(
              parsedUsers.filter(
                (u) =>
                  u.usecase.toLowerCase() === "member" &&
                  u.unitBusiness.toUpperCase() === "UNT12",
              ),
            );

            const activeUser = parsedUsers.find(
              (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase(),
            );
            if (activeUser) {
              setActiveUserName(activeUser.name);
              const normRole = (activeUser.role || "").trim().toUpperCase();
              setCurrentUserRole(normRole);
              localStorage.setItem("mtask_user_role", normRole);
              setCurrentUserUsecase(activeUser.usecase || "");
              const isAvail =
                activeUser.avail === "TRUE" ||
                activeUser.avail === "true" ||
                activeUser.avail === "";
              localStorage.setItem(
                "mtask_user_avatar",
                isAvail ? formatImageUrl(activeUser.avatar || "") : "",
              );
              localStorage.setItem("mtask_user_name", activeUser.name || "");
              window.dispatchEvent(new Event("mtask_user_changed"));
              if (activeUser.masuk === false) {
                setShowMasukPopup(true);
                setSelectedWargaEmail((prev) => prev || activeUser.email);
              } else {
                setShowMasukPopup(false);
              }
            } else {
              const hasAnyUsers = parsedUsers.length > 0;
              if (hasAnyUsers && !activeUser) {
                setShowMasukPopup(true);
              }
            }
          }
        }

        // 2. Fetch Tasks Notifications & Project Statuses
        const [taskRes, projRes] = await Promise.all([
          getSheetData("Task!A1:Z2000").catch(() => null),
          getSheetData("Project!A1:Z1000").catch(() => null),
        ]);

        const hiddenProjectIds = new Set<string>();
        if (projRes?.values && projRes.values.length > 0) {
          const projHeaders = projRes.values[0] as string[];
          const pIdIdx = projHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "PROJECT ID" ||
              (h || "").trim().toUpperCase() === "ID",
          );
          const pStatusIdx = projHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "STATUS" ||
              (h || "").trim().toUpperCase() === "PROJECT STATUS",
          );
          if (pIdIdx > -1) {
            projRes.values.slice(1).forEach((row: any[]) => {
              const pid = (row[pIdIdx] || "").toString().trim();
              const pStatus = pStatusIdx > -1 ? (row[pStatusIdx] || "").toString().trim() : "";
              const norm = pStatus.toLowerCase().replace(/[\s_-]+/g, "");
              if (pid && (norm === "notstarted" || pStatus.toLowerCase() === "not started" || norm === "canceled" || norm === "cancelled" || norm === "cancel")) {
                hiddenProjectIds.add(pid);
              }
            });
          }
        }

        const hiddenTaskIds = new Set<string>();

        if (taskRes?.values && taskRes.values.length > 0) {
          const taskHeaders = taskRes.values[0] as string[];
          const userIdx = taskHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "USER" ||
              (h || "").trim().toUpperCase() === "EMAIL",
          );
          const readIdx = taskHeaders.findIndex((h) => {
            const norm = (h || "").trim().toUpperCase();
            return (
              norm === "TASK READ" || norm === "READ" || norm === "TASK_READ"
            );
          });
          const idIdx = taskHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "TASK ID" ||
              (h || "").trim().toUpperCase() === "ID",
          );
          const nameIdx = taskHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "TASK NAME" ||
              (h || "").trim().toUpperCase() === "TITLE",
          );
          const dueIdx = taskHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "TASK DUE DATE" ||
              (h || "").trim().toUpperCase() === "DUE DATE",
          );
          const projIdIdx = taskHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "PROJECT ID" ||
              (h || "").trim().toUpperCase() === "PROJECT" ||
              (h || "").trim().toUpperCase() === "ID PROJECT",
          );

          const statusIdx = taskHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "STATUS",
          );
          const taskReportedIdx = taskHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "TASK REPORTED",
          );
          if (userIdx > -1 && readIdx > -1) {
            const overdues: OverdueTask[] = [];
            const readColLetter = getColLetter(readIdx);
            const reportedColLetter =
              taskReportedIdx > -1 ? getColLetter(taskReportedIdx) : "";
            const pendingReviewTasks: ReviewTask[] = [];

            taskRes.values.slice(1).forEach((row: any[], index: number) => {
              const tid = idIdx > -1 ? row[idIdx]?.trim() || "" : "";
              const pid = projIdIdx > -1 ? row[projIdIdx]?.trim() || "" : "";

              // Hide tasks if project status is Not Started
              if (pid && hiddenProjectIds.has(pid)) {
                if (tid) hiddenTaskIds.add(tid);
                return;
              }

              const uEmail = (row[userIdx] || "")
                .toString()
                .trim()
                .toLowerCase();

              const status =
                statusIdx > -1
                  ? (row[statusIdx] || "").toString().trim().toLowerCase()
                  : "";

              // Handle "Task To Review" notification specifically for adi.grinder.9@gmail.com
              if (
                currentUserEmail.toLowerCase() === "adi.grinder.9@gmail.com"
              ) {
                if (status === "review" && taskReportedIdx > -1) {
                  const isReported =
                    (row[taskReportedIdx] || "")
                      .toString()
                      .trim()
                      .toUpperCase() === "TRUE";
                  if (!isReported) {
                    pendingReviewTasks.push({
                      id: tid,
                      name:
                        nameIdx > -1
                          ? row[nameIdx]?.trim() || ""
                          : "Unnamed Task",
                      dueDate: dueIdx > -1 ? row[dueIdx]?.trim() || "" : "",
                      rowNumber: index + 2,
                      reportedColLetter,
                    });
                  }
                }
              }

              if (uEmail === currentUserEmail.toLowerCase()) {
                const isRead =
                  (row[readIdx] || "").toString().trim().toUpperCase() ===
                  "TRUE";

                // Track unread notifications
                if (!isRead) {
                  pending.push({
                    id: tid,
                    name:
                      nameIdx > -1
                        ? row[nameIdx]?.trim() || ""
                        : "Unnamed Task",
                    dueDate: dueIdx > -1 ? row[dueIdx]?.trim() || "" : "",
                    rowNumber: index + 2,
                    readColLetter,
                  });
                }

                // Track Overdue active user tasks
                const status =
                  statusIdx > -1
                    ? (row[statusIdx] || "").toString().trim().toLowerCase()
                    : "";
                const isCompleted =
                  status.includes("complete") ||
                  status.includes("done") ||
                  status.includes("selesai") ||
                  status.includes("cancel") ||
                  status.includes("batal");

                if (!isCompleted) {
                  const dueDateStr =
                    dueIdx > -1 ? (row[dueIdx] || "").toString().trim() : "";
                  if (dueDateStr) {
                    const due = new Date(dueDateStr);
                    if (!isNaN(due.getTime())) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      due.setHours(0, 0, 0, 0);
                      const diffTime = due.getTime() - today.getTime();
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      if (diffDays < 0) {
                        overdues.push({
                          id: tid,
                          name:
                            nameIdx > -1
                              ? row[nameIdx]?.trim() || ""
                              : "Unnamed Task",
                          dueDate: dueDateStr,
                          daysOverdue: Math.abs(diffDays),
                          status: row[statusIdx] || "To Do",
                        });
                      }
                    }
                  }
                }
              }
            });
            setUnreadReviewTasks(pendingReviewTasks);
            setUnreadTasks(pending);
            setOverdueTasks(overdues);
          }
        }

        // 3. Fetch Sub Tasks Notifications
        const [subRes1, subRes2] = await Promise.all([
          getSheetData("Subtask!A1:Z3000").catch(() => null),
          getSheetData("Sub Task!A1:Z3000").catch(() => null),
        ]);
        const subRes = subRes2?.values ? subRes2 : subRes1;
        const subSheetName = subRes2?.values ? "Sub Task" : "Subtask";

        if (subRes?.values && subRes.values.length > 0) {
          const subHeaders = subRes.values[0] as string[];
          const userIdx = subHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "USER" ||
              (h || "").trim().toUpperCase() === "ASSIGNED TO",
          );
          const readIdx = subHeaders.findIndex((h) => {
            const norm = (h || "").trim().toUpperCase();
            return (
              norm === "READ" ||
              norm === "SUBTASK READ" ||
              norm === "SUB_TASK_READ" ||
              norm === "READ_STATUS"
            );
          });
          const idIdx = subHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "SUBTASK ID" ||
              (h || "").trim().toUpperCase() === "ID",
          );
          const nameIdx = subHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "SUBTASK NAME" ||
              (h || "").trim().toUpperCase() === "SUBTASK" ||
              (h || "").trim().toUpperCase() === "TITLE",
          );
          const dueIdx = subHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "SUBTASK DUE DATE" ||
              (h || "").trim().toUpperCase() === "DUE DATE",
          );
          const parentTaskIdIdx = subHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "TASK ID" ||
              (h || "").trim().toUpperCase() === "TASK_ID" ||
              (h || "").trim().toUpperCase() === "TASK",
          );

          if (userIdx > -1 && readIdx > -1) {
            const readColLetter = getColLetter(readIdx);

            subRes.values.slice(1).forEach((row: any[], index: number) => {
              const parentId = parentTaskIdIdx > -1 ? (row[parentTaskIdIdx] || "").toString().trim() : "";
              if (parentId && hiddenTaskIds.has(parentId)) {
                return; // skip notification for subtasks from Not Started projects
              }

              const uEmail = (row[userIdx] || "")
                .toString()
                .trim()
                .toLowerCase();
              const isRead =
                (row[readIdx] || "").toString().trim().toUpperCase() === "TRUE";

              if (uEmail === currentUserEmail.toLowerCase() && !isRead) {
                pendingSub.push({
                  id: idIdx > -1 ? row[idIdx]?.trim() || "" : "",
                  name:
                    nameIdx > -1
                      ? row[nameIdx]?.trim() || ""
                      : "Unnamed Sub Task",
                  dueDate: dueIdx > -1 ? row[dueIdx]?.trim() || "" : "",
                  rowNumber: index + 2,
                  readColLetter,
                  sheetName: subSheetName as "Sub Task" | "Subtask",
                });
              }
            });
            setUnreadSubtasks(pendingSub);
          }
        }

        
        // 3.5 Fetch Real News Feed from Supabase
        try {
          const { data: actData, error: actErr } = await supabase
            .from('app_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (!actErr && actData && actData.length > 0) {
            const news: NewsItem[] = actData.map((act: any) => {
              const d = new Date(act.created_at);
              const isToday = d.toDateString() === new Date().toDateString();
              const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let cat: any = 'Activity';
              if (act.module?.toLowerCase().includes('order')) cat = 'Form';
              else if (act.module?.toLowerCase().includes('project')) cat = 'Project';
              else if (act.module?.toLowerCase().includes('task')) cat = 'Task';

              let userName = getUserDisplayName(act.user_email);
              const target = resolveActivityTarget(act);
              
              return {
                id: act.id || Math.random().toString(),
                text: act.details || `${userName} performed ${act.action_type} in ${act.module}`,
                category: cat,
                dateStr: isToday ? "Hari ini" : "Kemarin",
                timeStr: timeStr,
                targetPath: target.path,
                targetLabel: target.label,
                targetBadge: target.badge,
                rawActivity: act,
              };
            });
            setTickerNews(news);
          } else {
             setTickerNews([
               { id: '1', text: "Belum ada aktivitas terekam di Supabase.", category: "Task", dateStr: "Hari ini", timeStr: "00:00", targetPath: "/activities", targetLabel: "Activities" }
             ]);
          }
        } catch (newsErr) {
          console.error("Error generating news items:", newsErr);
        }

        // Check for freshly assigned Tasks or Subtasks on this run
        if (isInitialFetchRef.current) {
          pending.forEach((t) => {
            const key = t.id || `task-${t.rowNumber}`;
            seenTasksRef.current.add(key);
          });
          pendingSub.forEach((s) => {
            const key = s.id || `subtask-${s.rowNumber}`;
            seenSubtasksRef.current.add(key);
          });
          isInitialFetchRef.current = false;
        } else {
          pending.forEach((t) => {
            const key = t.id || `task-${t.rowNumber}`;
            if (!seenTasksRef.current.has(key)) {
              seenTasksRef.current.add(key);
              sendDeviceNotification(
                "Tugas Baru Ditugaskan! 📋",
                `Tugas: "${t.name}" baru saja ditugaskan untuk Anda.`,
              );
            }
          });

          pendingSub.forEach((s) => {
            const key = s.id || `subtask-${s.rowNumber}`;
            if (!seenSubtasksRef.current.has(key)) {
              seenSubtasksRef.current.add(key);
              sendDeviceNotification(
                "Sub Task Baru Ditugaskan! ⚡",
                `Subtask: "${s.name}" baru saja ditugaskan untuk Anda.`,
              );
            }
          });
        }

        // 4. Fetch Order Budget Notifications
        const currentEmail = currentUserEmail.trim().toLowerCase();

        let obRes = await getSheetData("Order Budget!A1:Z2000").catch(
          () => null,
        );
        let obSheetName = "Order Budget";

        if (!obRes || !obRes.values || obRes.values.length === 0) {
          obRes = await getSheetData("OrderBudget!A1:Z2000").catch(() => null);
          obSheetName = "OrderBudget";
        }

        if (obRes?.values && obRes.values.length > 0) {
          const obHeaders = obRes.values[0] as string[];
          let statusIdx = obHeaders.findIndex(
            (h) => (h || "").toString().trim().toUpperCase() === "STATUS",
          );
          const orderIdIdx = obHeaders.findIndex(
            (h) =>
              (h || "").toString().trim().toUpperCase() === "ORDER ID" ||
              (h || "").toString().trim().toUpperCase() === "ID",
          );
          const orderDetailIdx = obHeaders.findIndex(
            (h) =>
              (h || "").toString().trim().toUpperCase() === "ORDER DETAIL" ||
              (h || "").toString().trim().toUpperCase() === "DETAIL",
          );
          const reviewTierIdx = obHeaders.findIndex(
            (h) =>
              (h || "").toString().trim().toUpperCase() === "REVIEW TIER" ||
              (h || "").toString().trim().toUpperCase() === "TIER",
          );
          const emailUserIdx = obHeaders.findIndex(
            (h) =>
              (h || "").toString().trim().toUpperCase() === "EMAIL USER" ||
              (h || "").toString().trim().toUpperCase() === "EMAIL",
          );
          const readIdx = obHeaders.findIndex(
            (h) =>
              (h || "").toString().trim().toUpperCase() === "READ" ||
              (h || "").toString().trim().toUpperCase() === "STATUS BACA",
          );

          if (statusIdx === -1) {
            statusIdx = obHeaders.length;
            obHeaders.push("Status");
          }

          if (statusIdx > -1) {
            const statusColLetter = getColLetter(statusIdx);
            const pendingOrders: UnreadOrderBudget[] = [];
            const userPendingOrders: UserOrderBudgetNotif[] = [];
            const orderReadColLetter = readIdx > -1 ? getColLetter(readIdx) : "";

            obRes.values.slice(1).forEach((row: any[], i: number) => {
              const stat = (row[statusIdx] !== undefined ? row[statusIdx] : "")
                .toString()
                .trim()
                .toUpperCase();
              const reviewTier =
                reviewTierIdx > -1 ? row[reviewTierIdx] || "" : "";
              const tierLower = reviewTier.toString().trim().toLowerCase();

              // 1. Admin/Board/Boss notification logic
              if (
                currentEmail === "vonyloselia@gmail.com" ||
                currentEmail === "adi.grinder.9@gmail.com" ||
                currentEmail === "gilangpradnyatoplo@gmail.com"
              ) {
                let shouldNotify = false;
                let nextStatus = "";

                if (
                  currentEmail === "vonyloselia@gmail.com" &&
                  (stat === "SENT" || stat.includes("SENT")) &&
                  tierLower.includes("admin check")
                ) {
                  shouldNotify = true;
                  nextStatus = "Board";
                } else if (
                  currentEmail === "adi.grinder.9@gmail.com" &&
                  (stat === "BOARD" || stat.includes("BOARD")) &&
                  tierLower.includes("admin approve")
                ) {
                  shouldNotify = true;
                  nextStatus = "Boss";
                } else if (
                  (currentEmail === "gilangpradnyatoplo@gmail.com" ||
                    currentEmail === "vonyloselia@gmail.com") &&
                  (stat === "BOSS" || stat.includes("BOSS")) &&
                  tierLower.includes("board approve")
                ) {
                  shouldNotify = true;
                  nextStatus = "Done";
                }

                if (shouldNotify) {
                  pendingOrders.push({
                    id:
                      orderIdIdx > -1
                        ? row[orderIdIdx] || `row-${i + 2}`
                        : `row-${i + 2}`,
                    detail:
                      orderDetailIdx > -1
                        ? row[orderDetailIdx] || "New Order"
                        : "New Order",
                    rowNumber: i + 2,
                    statusColLetter,
                    sheetName: obSheetName,
                    nextStatus,
                  });
                }
              }

              // 2. User notification logic (Status = Sudah, Read = FALSE)
              const emailUser =
                emailUserIdx > -1
                  ? (row[emailUserIdx] || "").toString().trim().toLowerCase()
                  : "";
              const isRead =
                readIdx > -1
                  ? (row[readIdx] || "").toString().trim().toUpperCase()
                  : "";

              if (
                emailUser === currentEmail &&
                stat === "SUDAH" &&
                isRead === "FALSE"
              ) {
                userPendingOrders.push({
                  id:
                    orderIdIdx > -1
                      ? row[orderIdIdx] || `row-${i + 2}`
                      : `row-${i + 2}`,
                  detail:
                    orderDetailIdx > -1
                      ? row[orderDetailIdx] || "New Order"
                      : "New Order",
                  reviewTier: reviewTier,
                  rowNumber: i + 2,
                  statusColLetter,
                  readColLetter: orderReadColLetter,
                  sheetName: obSheetName,
                });
              }
            });

            setUnreadOrders(pendingOrders);
            setUserOrderNotifs(userPendingOrders);
          }
        }
      } catch (err) {
        console.warn("Error fetching custom notifications:", err);
      }
    };

    fetchAllNotifications();
    timer = setInterval(fetchAllNotifications, 10000); // Poll notifications every 10 seconds

    return () => {
      clearInterval(timer);
    };
  }, [currentUserEmail]);

  // Click handler for Order Budget Notifications
  const handleObNotifClick = async (ob: UnreadOrderBudget) => {
    if (obNotifLoading) return;
    setObNotifLoading(true);
    try {
      const range = `${ob.sheetName}!${ob.statusColLetter}${ob.rowNumber}`;
      await updateSheetData(range, [[ob.nextStatus]]);
      setUnreadOrders((prev) => prev.filter((t) => t.id !== ob.id));

      const urlId = ob.id.replace(/-/g, "_");
      navigate(`/orders/${urlId}`);
    } catch (err) {
      console.error("Failed to mark order budget as read:", err);
      alert("Gagal menandai order budget sebagai read.");
    } finally {
      setObNotifLoading(false);
    }
  };

  // Click handler for User Order Budget Notifications
  const handleUserObNotifClick = async (ob: UserOrderBudgetNotif) => {
    if (userObNotifLoading) return;
    setUserObNotifLoading(true);
    try {
      if (ob.readColLetter) {
        const range = `${ob.sheetName}!${ob.readColLetter}${ob.rowNumber}`;
        await updateSheetData(range, [["TRUE"]]);
      }
      setUserOrderNotifs((prev) => prev.filter((t) => t.id !== ob.id));

      navigate("/profile", { state: { openOrderRowIndex: ob.rowNumber } });
    } catch (err) {
      console.error("Failed to mark user order budget as read:", err);
    } finally {
      setUserObNotifLoading(false);
    }
  };

  // Click handler to mark read and redirect
  const handleNotifClick = async (task: UnreadTask) => {
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      const range = `Task!${task.readColLetter}${task.rowNumber}`;
      await updateSheetData(range, [["TRUE"]]);

      // Update local state is immediate
      setUnreadTasks((prev) => prev.filter((t) => t.id !== task.id));

      // Navigate to detail
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      console.error("Failed to mark task as read:", err);
      alert("Gagal menandai task sebagai sudah dibaca.");
    } finally {
      setNotifLoading(false);
    }
  };

  const handleReviewNotifClick = async (task: ReviewTask) => {
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      const range = `Task!${task.reportedColLetter}${task.rowNumber}`;
      await updateSheetData(range, [["TRUE"]]);

      setUnreadReviewTasks((prev) => prev.filter((t) => t.id !== task.id));
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      console.error("Failed to mark task as reported:", err);
      alert("Gagal memperbarui status Task Reported.");
    } finally {
      setNotifLoading(false);
    }
  };

  // Click handler for sub tasks
  const handleSubNotifClick = async (sub: UnreadSubtask) => {
    if (subNotifLoading) return;
    setSubNotifLoading(true);
    try {
      const range = `Sub Task!${sub.readColLetter}${sub.rowNumber}`;
      await updateSheetDataFromId(
        "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
        range,
        [["TRUE"]],
      );

      // Update local state is immediate
      setUnreadSubtasks((prev) => prev.filter((t) => t.id !== sub.id));

      // Navigate to activity detail
      navigate(`/activities/${sub.id}`);
    } catch (err) {
      console.error("Failed to mark subtask as read:", err);
      alert("Gagal menandai sub task sebagai sudah dibaca.");
    } finally {
      setSubNotifLoading(false);
    }
  };

  const handleBannerClick = (link: string | undefined) => {
    if (!link || link.trim() === "") return;
    const target = link.trim();
    if (
      target.startsWith("/") ||
      target.startsWith("http") ||
      target.startsWith("#")
    ) {
      if (target.startsWith("http")) {
        window.location.href = target;
      } else {
        navigate(target);
      }
    } else {
      navigate("/" + target);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const pollSheets = async () => {
      try {
        setSyncStatus("syncing");
        const res = await getSheetData("Banner2!A1:Z100"); // Dynamic fetch for banners
        if (res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const imgIdx = headers.findIndex(
            (h: string) => h?.trim().toLowerCase() === "image",
          );
          const lokIdx = headers.findIndex(
            (h: string) => h?.trim().toLowerCase() === "lokasi",
          );
          const showIdx = headers.findIndex(
            (h: string) => h?.trim().toLowerCase() === "show",
          );
          const judulIdx = headers.findIndex(
            (h: string) => h?.trim().toLowerCase() === "judul",
          );
          const linkToIdx = headers.findIndex((h: string) => {
            const norm = h?.trim().toLowerCase();
            return (
              norm === "link to" ||
              norm === "link_to" ||
              norm === "link" ||
              norm === "target" ||
              norm === "url"
            );
          });

          if (imgIdx > -1 && lokIdx > -1 && showIdx > -1) {
            const data = res.values.slice(1).map((row: any[]) => ({
              image: row[imgIdx] || "",
              lokasi: row[lokIdx]?.trim() || "",
              show:
                (row[showIdx] || "").toString().trim().toUpperCase() === "TRUE",
              judul: judulIdx > -1 ? row[judulIdx] || "" : "",
              linkTo: linkToIdx > -1 ? row[linkToIdx] || "" : "",
            }));

            const b1 = data.find((r: any) => r.lokasi === "OK 1" && r.show);
            if (b1) {
              setBanner1({
                image: b1.image?.trim()
                  ? b1.image
                  : "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop",
                judul: b1.judul,
                linkTo: b1.linkTo,
              });
            } else {
              setBanner1(null);
            }

            const b2List = data
              .filter((r: any) => r.lokasi === "OK 2" && r.show)
              .map((r: any, i: number) => ({
                image: r.image?.trim()
                  ? r.image
                  : `https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2670&auto=format&fit=crop&sig=${i + 10}`,
                judul: r.judul,
                linkTo: r.linkTo,
              }));
            setBanner2List(b2List);

            const b3List = data
              .filter((r: any) => r.lokasi === "OK 3" && r.show)
              .map((r: any, i: number) => ({
                image: r.image?.trim()
                  ? r.image
                  : `https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=2574&auto=format&fit=crop&sig=${i + 20}`,
                judul: r.judul,
                linkTo: r.linkTo,
              }));
            setBanner3List(b3List);
          }
        }
        setLastSync(new Date().toLocaleTimeString());
        setSyncStatus("idle");
      } catch (err: any) {
        if (
          err.message !== "Mock authentication used, bypassing Sheets API" &&
          err.message !== "Not authenticated"
        ) {
          // console.warn('Polling error:', err.message);
          // Show explicit error on the UI sync status instead of generic error
          setLastSync("Error: " + err.message.substring(0, 30));
        }
        setSyncStatus("error");
      }
    };

    pollSheets(); // initial
    timer = setInterval(pollSheets, 10000); // every 10 seconds

    // Listen for manual pull to refresh from outside
    const handleManualRefresh = () => pollSheets();
    window.addEventListener("appDataSyncRequest", handleManualRefresh);

    return () => {
      clearInterval(timer);
      window.removeEventListener("appDataSyncRequest", handleManualRefresh);
    };
  }, []);

  // Click counts tracking & Favorite calculating
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("quick_action_click_counts") || "{}",
      );
    } catch {
      return {};
    }
  });

  const recordClick = (id: string) => {
    const updated = { ...clickCounts, [id]: (clickCounts[id] || 0) + 1 };
    setClickCounts(updated);
    try {
      localStorage.setItem(
        "quick_action_click_counts",
        JSON.stringify(updated),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const favoriteActions = (() => {
    const userObj = userList.find(
      (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase(),
    );
    const activeRole = (
      currentUserRole ||
      userObj?.role ||
      localStorage.getItem("mtask_user_role") ||
      ""
    ).trim().toUpperCase();

    if (currentUserEmail.toLowerCase() === "prawinaputu@gmail.com") {
      return [
        "101", // Lovissa Guest house
        "daftar_issue", // Daftar Issue
        "add_issue", // Add Issue
        "7", // Kontak
        "13", // Check In
        "lgh_daily_report", // LGH Daily Report
      ]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (currentUserEmail.toLowerCase() === "dewirahmawati776@gmail.com") {
      return ["105", "add_issue", "dr_dok", "daftar_daily_report", "15", "5", "6", "11", "7", "daftar_issue"]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (currentUserEmail.toLowerCase() === "vonyloselia@gmail.com") {
      return [
        "104",
        "8",
        "add_issue",
        "dr_dok",
        "daftar_daily_report",
        "daftar_belanja",
        "15",
        "5",
        "6",
        "11",
        "7",
        "102",
        "daftar_issue",
      ]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (currentUserEmail.toLowerCase() === "pandusuryo69@gmail.com") {
      return [
        "101",
        "13",
        "add_issue",
        "dr_dok",
        "daftar_daily_report",
        "15",
        "5",
        "6",
        "11",
        "7",
        "daftar_issue",
      ]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (currentUserEmail.toLowerCase() === "thioyudisaputra@gmail.com") {
      return [
        "103",
        "14",
        "add_issue",
        "dr_dok",
        "daftar_daily_report",
        "15",
        "5",
        "6",
        "11",
        "7",
        "daftar_issue",
      ]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (activeRole === "RL06") {
      return ["103", "14", "add_issue", "15"]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (activeRole === "RL08") {
      return ["105", "12", "add_issue", "dr_dok", "daftar_daily_report", "15", "5"]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    if (["RL01", "RL02", "RL03", "RL04", "RL05"].includes(activeRole)) {
      return ["3", "6", "1", "8", "add_issue", "dr_dok", "daftar_issue", "daftar_daily_report"]
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
    }
    const sorted = Object.keys(clickCounts)
      .filter((id) => clickCounts[id] > 0)
      .sort((a, b) => clickCounts[b] - clickCounts[a]);

    const found = sorted
      .map((id) => ALL_ACTIONS.find((a) => a.id === id))
      .filter(Boolean) as ActionItem[];
    if (found.length < 4) {
      const defaults = ["3", "6", "1", "8", "dr_dok", "daftar_daily_report"] // Task, Unit, Project, Daftar Order, Daily Report, Daftar Daily Report
        .map((id) => ALL_ACTIONS.find((a) => a.id === id))
        .filter(Boolean) as ActionItem[];
      const combined = [...found];
      defaults.forEach((def) => {
        if (
          combined.length < 4 &&
          !combined.some((item) => item.id === def.id)
        ) {
          combined.push(def);
        }
      });
      return combined;
    }
    return found.slice(0, 4);
  })();

  // Unit Business list for dropdown selectors
  const [unitList, setUnitList] = useState<any[]>([]);
  const [contacts, setContacts] = useState<
    { id: string; name: string; type: string }[]
  >([]);

  useEffect(() => {
    async function loadUnitsAndContacts() {
      try {
        const [res, contactRes] = await Promise.all([
          getSheetData("Unit!A1:Z500").catch(() => null),
          getSheetData("Contact!A1:Z500").catch(() => null),
        ]);

        if (res?.values?.length > 1) {
          const headers = res.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "ID" ||
              (h || "").trim().toUpperCase() === "UNIT ID",
          );
          const nameIdx = headers.findIndex(
            (h) => (h || "").trim().toUpperCase() === "UNIT NAME",
          );
          const logoIdx = headers.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "LOGO" ||
              (h || "").trim().toUpperCase() === "IMAGE",
          );
          const statusIdx = headers.findIndex(
            (h) => (h || "").trim().toUpperCase() === "STATUS",
          );
          const fetched = res.values
            .slice(1)
            .map((row: any[]) => {
              const id = idIdx > -1 ? row[idIdx]?.trim() || "" : "";
              const name = nameIdx > -1 ? row[nameIdx]?.trim() || id : id;
              const logo = logoIdx > -1 ? row[logoIdx]?.trim() || "" : "";
              const status = statusIdx > -1 ? row[statusIdx]?.trim() || "" : "";
              return { id, name, logo, status };
            })
            .filter((u) => u.id && u.status.toLowerCase() === 'active');
          setUnitList(fetched);
        }

        if (contactRes?.values?.length > 0) {
          const cHeaders = contactRes.values[0] as string[];
          const cIdIdx = cHeaders.findIndex(
            (h) =>
              (h || "").trim().toUpperCase() === "ID" ||
              (h || "").trim().toUpperCase() === "CONTACT ID",
          );
          const cNameIdx = cHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "NAME",
          );
          const cTypeIdx = cHeaders.findIndex(
            (h) => (h || "").trim().toUpperCase() === "TYPE",
          );
          if (cNameIdx > -1) {
            const fetched = contactRes.values
              .slice(1)
              .map((row: any[], i: number) => {
                const cId = cIdIdx > -1 ? row[cIdIdx]?.trim() : `contact-${i}`;
                const cName = row[cNameIdx]?.trim() || "";
                const cType = cTypeIdx > -1 ? row[cTypeIdx]?.trim() : "";
                return { id: cId, name: cName, type: cType };
              })
              .filter((c: any) => c.name);
            setContacts(fetched);
          }
        }
      } catch (err) {
        console.warn("Failed to load unit or contact list:", err);
      }
    }
    loadUnitsAndContacts();
  }, []);

  // Form handling states
  const [activeFormAction, setActiveFormAction] = useState<ActionItem | null>(
    null,
  );

  // Detailed Order Budget States for Dashboard Quick Action
  const [obOrderType, setObOrderType] = useState<string>("");
  const [obKepada, setObKepada] = useState<string>("");
  const [obAmount, setObAmount] = useState<string>("");
  const [obVia, setObVia] = useState<string>("");
  const [obBank, setObBank] = useState<string>("");
  const [obRekNo, setObRekNo] = useState<string>("");
  const [obAtasNama, setObAtasNama] = useState<string>("");
  const [obBerita, setObBerita] = useState<string>("");
  const [obNote, setObNote] = useState<string>("");
  const [obQrisFile, setObQrisFile] = useState<File | null>(null);
  const [obEwalletName, setObEwalletName] = useState<string>("");
  const [obEwalletNo, setObEwalletNo] = useState<string>("");
  const [obVirtualNo, setObVirtualNo] = useState<string>("");
  const [obNotaFiles, setObNotaFiles] = useState<File[]>([]);
  const [obUnitId, setObUnitId] = useState<string>("");
  const [obPurpose, setObPurpose] = useState<string>("");
  const [isOpenUnitDropdown, setIsOpenUnitDropdown] = useState<boolean>(false);

  const [vendorList, setVendorList] = useState<any[]>([]);
  const [tallentList, setTallentList] = useState<any[]>([]);
  const [memberList, setMemberList] = useState<any[]>([]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showAddTallentModal, setShowAddTallentModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [poinColLetter, setPoinColLetter] = useState("");

  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactUsecase, setNewContactUsecase] = useState("");
  const [newContactAddress, setNewContactAddress] = useState("");
  const [newContactWebsite, setNewContactWebsite] = useState("");
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Add Issue custom states
  const [issueUnitId, setIssueUnitId] = useState("");
  const [issueInfo, setIssueInfo] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [issueType, setIssueType] = useState<
    "Photo" | "File" | "Link" | "None"
  >("None");
  const [issuePhotoFile, setIssuePhotoFile] = useState<File | null>(null);
  const [issuePhotoPreview, setIssuePhotoPreview] = useState<string>("");
  const [issueDocFile, setIssueDocFile] = useState<File | null>(null);
  const [issueLinkUrl, setIssueLinkUrl] = useState("");
  const [showIssueCameraModal, setShowIssueCameraModal] = useState(false);
  const [isOpenIssueUnitDropdown, setIsOpenIssueUnitDropdown] = useState(false);
  const issuePhotoInputRef = useRef<HTMLInputElement>(null);
  const issueFileInputRef = useRef<HTMLInputElement>(null);

  // New Add Issue states based on user requirement
  const [catatanType1, setCatatanType1] = useState<"note" | "photo" | "file">(
    "note",
  );
  const [catatanText1, setCatatanText1] = useState("");
  const [catatanPhoto1, setCatatanPhoto1] = useState<File | null>(null);
  const [catatanFile1, setCatatanFile1] = useState<File | null>(null);

  const [catatanType2, setCatatanType2] = useState<
    "None" | "note" | "photo" | "file"
  >("None");
  const [catatanText2, setCatatanText2] = useState("");
  const [catatanPhoto2, setCatatanPhoto2] = useState<File | null>(null);
  const [catatanFile2, setCatatanFile2] = useState<File | null>(null);

  const [activePhotoTarget, setActivePhotoTarget] = useState<1 | 2>(1);

  const catatanPhotoInputRef1 = useRef<HTMLInputElement>(null);
  const catatanFileInputRef1 = useRef<HTMLInputElement>(null);
  const catatanPhotoInputRef2 = useRef<HTMLInputElement>(null);
  const catatanFileInputRef2 = useRef<HTMLInputElement>(null);

  // Issue List States
  const [issues, setIssues] = useState<any[]>([]);
  const [loadingIssues, setLoadingIssues] = useState<boolean>(false);
  const [errorIssues, setErrorIssues] = useState<string | null>(null);
  const [issuesSearch, setIssuesSearch] = useState<string>("");
  const [selectedIssueUnitFilter, setSelectedIssueUnitFilter] =
    useState<string>("ALL");
  const [selectedIssueStatusFilter, setSelectedIssueStatusFilter] =
    useState<string>("ALL");

  // Dashboard Activities States
  const [dashboardActivities, setDashboardActivities] = useState<any[]>([]);
  const [loadingDashboardActivities, setLoadingDashboardActivities] = useState<boolean>(false);
  const [errorDashboardActivities, setErrorDashboardActivities] = useState<string | null>(null);

  useEffect(() => {
    const fetchPesananBaru = async () => {
      const email = (localStorage.getItem("mtask_user_email") || "")
        .trim()
        .toLowerCase();
      if (email !== "vonyloselia@gmail.com") return;

      try {
        const res = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Pesanan!A1:Z1000",
        );
        if (res && res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "status_pesanan",
          );
          const tandaIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "tanda",
          );
          const notaIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "IDPESANAN" ||
              h?.trim().toUpperCase() === "ID_PESANAN" ||
              h?.trim().toUpperCase() === "ORDERID" ||
              h?.trim().toLowerCase() === "nota",
          );

          if (statusIdx > -1) {
            let hasSatu = false;
            let firstUnread: any = null;
            let firstUnreadReview: any = null;

            for (let i = 1; i < res.values.length; i++) {
              const row = res.values[i];
              if (!row) continue;
              const status = row[statusIdx]?.trim().toUpperCase();
              const tanda = tandaIdx > -1 ? row[tandaIdx]?.trim() || "" : "";

              if (status === "SEND") {
                if (tanda === "satu") {
                  hasSatu = true;
                } else if (tanda === "" && !firstUnread) {
                  firstUnread = {
                    nota: notaIdx > -1 ? row[notaIdx] : "",
                    rowIndex: i + 1,
                    tandaColIdx: tandaIdx > -1 ? tandaIdx : headers.length,
                  };
                }
              } else if (status === "PROCESS") {
                if (tanda === "dua" && !firstUnreadReview) {
                  firstUnreadReview = {
                    nota: notaIdx > -1 ? row[notaIdx] : "",
                    rowIndex: i + 1,
                    tandaColIdx: tandaIdx > -1 ? tandaIdx : headers.length,
                  };
                }
              }
            }

            setHasUnreadPesananList(hasSatu);
            if (firstUnread) {
              setUnreadPesanan(firstUnread);
              sendDeviceNotification(
                "Pesanan Baru",
                `Ada pesanan baru menunggu: ${firstUnread.nota}`,
                "/icon-192x192.png",
              );
            }
            if (firstUnreadReview) {
              setUnreadReviewPesanan(firstUnreadReview);
              sendDeviceNotification(
                "Pesanan Telah Di Review",
                `Pesanan telah direview: ${firstUnreadReview.nota}`,
                "/icon-192x192.png",
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch pesanan baru", err);
      }
    };

    fetchPesananBaru();
    // Re-fetch every 30 seconds
    const interval = setInterval(fetchPesananBaru, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchProsesPesanan = async () => {
      const email = (localStorage.getItem("mtask_user_email") || "")
        .trim()
        .toLowerCase();
      if (email !== "thioyudisaputra@gmail.com") return;

      try {
        const res = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Pesanan!A1:Z1000",
        );
        if (res && res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "status_pesanan",
          );
          const tandaIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "tanda",
          );
          const notaIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "IDPESANAN" ||
              h?.trim().toUpperCase() === "ID_PESANAN" ||
              h?.trim().toUpperCase() === "ORDERID" ||
              h?.trim().toLowerCase() === "nota",
          );
          const unitIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "UNIT" ||
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "UNIT BUSINESS",
          );

          if (statusIdx > -1) {
            let firstUnread: any = null;

            for (let i = 1; i < res.values.length; i++) {
              const row = res.values[i];
              if (!row) continue;
              const status = row[statusIdx]?.trim().toUpperCase();
              const tanda = tandaIdx > -1 ? row[tandaIdx]?.trim() || "" : "";
              const unit =
                unitIdx > -1 ? row[unitIdx]?.trim().toUpperCase() || "" : "";

              if (status === "REVIEW" && unit === "UNT15") {
                if (tanda === "satu" && !firstUnread) {
                  firstUnread = {
                    nota: notaIdx > -1 ? row[notaIdx] : "",
                    rowIndex: i + 1,
                    tandaColIdx: tandaIdx > -1 ? tandaIdx : headers.length,
                  };
                }
              }
            }

            if (firstUnread) {
              setUnreadProsesPesanan(firstUnread);
              sendDeviceNotification(
                "Proses Pesanan",
                `Ada pesanan diproses: ${firstUnread.nota}`,
                "/icon-192x192.png",
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch proses pesanan", err);
      }
    };

    fetchProsesPesanan();
    // Re-fetch every 30 seconds
    const interval = setInterval(fetchProsesPesanan, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchReviewPesananUser = async () => {
      const email = (localStorage.getItem("mtask_user_email") || "")
        .trim()
        .toLowerCase();
      if (!email) return;

      try {
        const res = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Pesanan!A1:Z1000",
        );
        if (res && res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const statusIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "status_pesanan",
          );
          const tandaIdx = headers.findIndex(
            (h) => h?.trim().toLowerCase() === "tanda",
          );
          const userIdx = headers.findIndex(
            (h) =>
              h?.trim().toLowerCase() === "user" ||
              h?.trim().toLowerCase() === "email",
          );
          const idPesananIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "IDPESANAN" ||
              h?.trim().toUpperCase() === "ID_PESANAN" ||
              h?.trim().toUpperCase() === "ORDERID",
          );
          const unitIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "UNIT" ||
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "UNIT BUSINESS",
          );

          if (statusIdx > -1 && userIdx > -1) {
            let firstUnread: any = null;

            for (let i = 1; i < res.values.length; i++) {
              const row = res.values[i];
              if (!row) continue;
              const rowUser = (row[userIdx] || "").trim().toLowerCase();
              const status = row[statusIdx]?.trim().toUpperCase();
              const tanda = tandaIdx > -1 ? row[tandaIdx]?.trim() || "" : "";
              const unit = unitIdx > -1 ? row[unitIdx]?.trim() || "" : "";
              const idPesanan =
                idPesananIdx > -1 ? row[idPesananIdx]?.trim() || "" : "";

              if (
                rowUser === email &&
                status === "REVIEW" &&
                tanda === "satu" &&
                !unit
              ) {
                if (!firstUnread) {
                  firstUnread = {
                    idPesanan: idPesanan,
                    rowIndex: i + 1,
                    tandaColIdx: tandaIdx > -1 ? tandaIdx : headers.length,
                  };
                }
              }
            }

            if (firstUnread) {
              setUnreadReviewPesananUser(firstUnread);
              sendDeviceNotification(
                "Review Pesanan",
                `Pesanan butuh direview: ${firstUnread.idPesanan}`,
                "/icon-192x192.png",
              );
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch review pesanan user", err);
      }
    };

    fetchReviewPesananUser();
    // Re-fetch every 30 seconds
    const interval = setInterval(fetchReviewPesananUser, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchIssues = async () => {
    setLoadingIssues(true);
    setErrorIssues(null);
    try {
      let issueRes =
        (await getSheetData("ISSUE!A1:Z500").catch(() => null)) ||
        (await getSheetData("Issue!A1:Z500").catch(() => null));

      if (issueRes && issueRes.values && issueRes.values.length > 0) {
        const headerRow = issueRes.values[0] as string[];
        const valueRows = issueRes.values.slice(1) as string[][];

        const parseIssuesFromSheet = (headers: string[], rows: string[][]) => {
          if (!headers || !rows) return [];
          return rows.map((row) => {
            const getVal = (headerName: string) => {
              const normName = headerName
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, "");
              const idx = headers.findIndex((h) => {
                if (!h) return false;
                const normH = h
                  .trim()
                  .toUpperCase()
                  .replace(/[\s._-]+/g, "");
                if (normH === normName) return true;
                if (
                  normName === "ISSUEID" &&
                  (normH === "ISSUEID" ||
                    normH === "ISSUE_ID" ||
                    normH === "ID")
                )
                  return true;
                if (
                  normName === "TIMESTAMP" &&
                  (normH === "TIMESTAMP" || normH === "TIME")
                )
                  return true;
                if (
                  normName === "USER" &&
                  (normH === "USER" || normH === "EMAIL" || normH === "PELAPOR")
                )
                  return true;
                if (
                  normName === "UNIT" &&
                  (normH === "UNIT" ||
                    normH === "UNIT_NAME" ||
                    normH === "UNITNAME")
                )
                  return true;
                if (
                  normName === "KETERANGAN" &&
                  (normH === "KETERANGAN" ||
                    normH === "ISSUE" ||
                    normH === "DETAIL" ||
                    normH === "NOTE" ||
                    normH === "INFO")
                )
                  return true;
                if (normName === "STATUS" && normH === "STATUS") return true;
                if (
                  normName === "LAMPIRAN" &&
                  (normH === "LAMPIRAN" ||
                    normH === "TIPE" ||
                    normH === "ATTACHMENT")
                )
                  return true;
                if (
                  normName === "CATATAN" &&
                  (normH === "CATATAN" ||
                    normH === "VALUE" ||
                    normH === "ATTACHMENT_VALUE")
                )
                  return true;
                if (
                  normName === "LAMPIRAN2" &&
                  (normH === "LAMPIRAN2" ||
                    normH === "LAMPIRAN_2" ||
                    normH === "TIPE2")
                )
                  return true;
                if (
                  normName === "CATATAN2" &&
                  (normH === "CATATAN2" ||
                    normH === "CATATAN_2" ||
                    normH === "VALUE2")
                )
                  return true;
                if (
                  normName === "LOKASI" &&
                  (normH === "LOKASI" ||
                    normH === "LOCATION" ||
                    normH === "COORDINATES")
                )
                  return true;
                return false;
              });
              return idx > -1 && idx < row.length ? row[idx] : "";
            };

            return {
              issueId: getVal("issue_id") || "",
              timestamp: getVal("Timestamp") || "",
              user: getVal("user") || "",
              unit: getVal("Unit") || "",
              keterangan: getVal("keterangan") || "",
              status: getVal("Status") || "SEND",
              lampiran: getVal("Lampiran") || "",
              catatan: getVal("Catatan") || "",
              lampiran2: getVal("Lampiran2") || "",
              catatan2: getVal("Catatan2") || "",
              lokasi: getVal("Lokasi") || "",
            };
          });
        };

        const parsed = parseIssuesFromSheet(headerRow, valueRows);
        setIssues(parsed.reverse());
      } else {
        setIssues([]);
      }
    } catch (err: any) {
      console.error("Error fetching issues:", err);
      setErrorIssues(err?.message || "Gagal memuat data issue.");
    } finally {
      setLoadingIssues(false);
    }
  };

  const fetchDashboardActivities = async () => {
    setLoadingDashboardActivities(true);
    setErrorDashboardActivities(null);
    try {
      const { data, error } = await supabase
        .from('app_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("Error fetching activities:", error);
        setErrorDashboardActivities("Gagal memuat data aktivitas.");
      } else {
        setDashboardActivities(data || []);
      }
    } catch (err: any) {
      console.error("Error:", err);
      setErrorDashboardActivities(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoadingDashboardActivities(false);
    }
  };

  // Sync and cleanup local object URL for Photo attachment review
  useEffect(() => {
    if (!issuePhotoFile) {
      setIssuePhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(issuePhotoFile);
    setIssuePhotoPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [issuePhotoFile]);

  // Custom automatic trigger for Camera / File picker depending on Selected Attachment Mode
  useEffect(() => {
    if (activeFormAction?.id === "add_issue") {
      if (catatanType1 === "photo") {
        setShowIssueCameraModal(true);
      } else if (catatanType1 === "file") {
        setTimeout(() => {
          catatanFileInputRef1.current?.click();
        }, 150);
      }
    }
  }, [catatanType1, activeFormAction?.id]);

  const obFileInputRef = useRef<HTMLInputElement>(null);
  const obNotaFileInputRef = useRef<HTMLInputElement>(null);
  const obNotaCameraInputRef = useRef<HTMLInputElement>(null);
  const prevActiveFormIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentActionId = activeFormAction?.id || null;
    if (prevActiveFormIdRef.current === currentActionId) {
      return;
    }
    prevActiveFormIdRef.current = currentActionId;

    if (currentActionId === "5") {
      setObOrderType("");
      setObKepada("");
      setObAmount("");
      setObVia("");
      setObBank("");
      setObRekNo("");
      setObAtasNama("");
      setObBerita("");
      setObNote("");
      setObQrisFile(null);
      setObEwalletName("");
      setObEwalletNo("");
      setObVirtualNo("");
      setObNotaFiles([]);
      setObUnitId("");
      setObPurpose("");
      setIsOpenUnitDropdown(false);
    }
    if (currentActionId === "add_issue") {
      const activeUser = userList.find(
        (u) => u.email.toLowerCase() === currentUserEmail.toLowerCase(),
      );
      const userUsecase = (activeUser?.usecase || currentUserUsecase || "").trim().toLowerCase();
      const isHousekeeping =
        userUsecase === "house keeping" ||
        userUsecase === "housekeeping" ||
        userUsecase.replace(/[\s-_]/g, "") === "housekeeping";

      setIssueUnitId(
        isHousekeeping
          ? "UNT19"
          : currentUserRole === "RL06"
            ? "UNT15"
            : currentUserRole === "RL08"
              ? "UNT12"
              : "",
      );
      setIssueInfo("");
      setIssueNote("");
      setIssueType("None");
      setIssuePhotoFile(null);
      setIssueDocFile(null);
      setIssueLinkUrl("");
      setShowIssueCameraModal(false);
      setIsOpenIssueUnitDropdown(false);
    }
    if (currentActionId === "daftar_issue") {
      fetchIssues();
    }
    if (currentActionId === "10") {
      fetchDashboardActivities();
    }
    if (currentActionId !== "14") {
      setChAmount("");
      setChNotaFile(null);
      setShowChCameraModal(false);
    }
  }, [activeFormAction?.id, currentUserRole, currentUserUsecase, currentUserEmail, userList]);
  const [formData, setFormData] = useState({
    unitId: "",
    detail: "",
    note: "",
    amount: "",
    purpose: "",
    trackingId: "",
    receiver: "",
    address: "",
    weight: "",
    menuItem: "",
    quantity: "1",
    itemName: "",
    spec: "",
    category: "Operational",
  });
  const [formIsSubmitting, setFormIsSubmitting] = useState(false);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImageUrl, setFormImageUrl] = useState("");

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await getSheetData("Reward!A1:Z500").catch(() => null);
        if (res && res.values && res.values.length > 0) {
          const headers = res.values[0] as string[];
          const kodeIdx = headers.findIndex(
            (h) => (h || "").trim().toUpperCase() === "KODE",
          );
          const statusIdx = headers.findIndex(
            (h) => (h || "").trim().toUpperCase() === "STATUS",
          );
          const nilaiIdx = headers.findIndex(
            (h) => (h || "").trim().toUpperCase() === "NILAI",
          );

          if (kodeIdx > -1) {
            const parsedRewards = res.values
              .slice(1)
              .map((row: any[]) => ({
                kode: row[kodeIdx]?.trim() || "",
                status:
                  statusIdx > -1
                    ? (row[statusIdx] || "").trim().toUpperCase()
                    : "",
                nilai:
                  nilaiIdx > -1
                    ? parseInt(
                        row[nilaiIdx]?.toString().replace(/,/g, "").trim(),
                      ) || 0
                    : 0,
              }))
              .filter((r) => r.kode && r.status === "ACTIVE");
            setRewardList(parsedRewards);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch Reward data", e);
      }
    };
    fetchRewards();
  }, []);

  // Lion Parcel specific form states
  const [lpNoResi, setLpNoResi] = useState("");
  const [lpNamaPengirim, setLpNamaPengirim] = useState("");
  const [lpTujuan, setLpTujuan] = useState("");
  const [lpLayanan, setLpLayanan] = useState("");
  const [lpCaraPembayaran, setLpCaraPembayaran] = useState("");
  const [lpBerat, setLpBerat] = useState("");
  const [lpJenisBarang, setLpJenisBarang] = useState("");
  const [lpTarifStr, setLpTarifStr] = useState("");
  const [lpKeterangan, setLpKeterangan] = useState("");
  const [lpDiskonKode, setLpDiskonKode] = useState("");
  const [lpDiskonKodeInput, setLpDiskonKodeInput] = useState("");
  const [rewardList, setRewardList] = useState<any[]>([]);
  const [lpTukarPoin, setLpTukarPoin] = useState("");
  const [lpTukarPoinInput, setLpTukarPoinInput] = useState("");
  const [lpTotalBiaya, setLpTotalBiaya] = useState("");

  useEffect(() => {
    const tarif = parseInt(lpTarifStr) || 0;
    const diskon = parseInt(lpDiskonKode) || 0; // assuming diskon kode relates to nominal (usually codes are string, but if prompt implies subtraction we assume it evaluates or we can just parse as number)
    const poin = parseInt(lpTukarPoin) || 0;
    setLpTotalBiaya(Math.max(0, tarif - diskon - poin).toString());
  }, [lpTarifStr, lpDiskonKode, lpTukarPoin]);

  const [lpBuktiBayarFiles, setLpBuktiBayarFiles] = useState<File[]>([]);
  const [showLpCameraModal, setShowLpCameraModal] = useState(false);
  const [showDiskonModal, setShowDiskonModal] = useState(false);
  const [showTukarPoinModal, setShowTukarPoinModal] = useState(false);
  const lpFileInputRef = useRef<HTMLInputElement>(null);

  // Daily Report (Dok) States
  const [drReport, setDrReport] = useState<string>("");
  const [drDiscussion, setDrDiscussion] = useState<string>("");
  const [drFiles, setDrFiles] = useState<File[]>([]);

  // Chillhub Daily Sale Report states
  const [chAmount, setChAmount] = useState<string>("");
  const [chNotaFile, setChNotaFile] = useState<File | null>(null);
  const [showChCameraModal, setShowChCameraModal] = useState(false);
  const chFileInputRef = useRef<HTMLInputElement>(null);

  // HQ Form States
  const [hqActivities, setHqActivities] = useState<string>("");
  const [hqQty, setHqQty] = useState<string>("");
  const [hqUom, setHqUom] = useState<string>("");
  const [hqPrice, setHqPrice] = useState<string>("");
  const [hqClient, setHqClient] = useState<string>("");
  const [hqNote, setHqNote] = useState<string>("");
  const [hqStatus, setHqStatus] = useState<"Paid" | "Unpaid">("Unpaid");
  const [hqFile, setHqFile] = useState<File | null>(null);
  const [showHqCameraModal, setShowHqCameraModal] = useState(false);
  const hqFileInputRef = useRef<HTMLInputElement>(null);

  // Lovissa Guest House (Check In) States
  const [lghCheckIn, setLghCheckIn] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [lghCheckOut, setLghCheckOut] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [lghDur, setLghDur] = useState<number>(1);
  const [lghType, setLghType] = useState<string>("Malam");
  const [lghRoom, setLghRoom] = useState<string>("Room 1");
  const [lghPrice, setLghPrice] = useState<string>("250000");
  const [lghAmount, setLghAmount] = useState<string>("250000");
  const [lghKeterangan, setLghKeterangan] = useState<string>("");
  const [lghGuestName, setLghGuestName] = useState<string>("");
  const [lghNoId, setLghNoId] = useState<string>("");
  const [lghEmail, setLghEmail] = useState<string>("");
  const [lghPhone, setLghPhone] = useState<string>("");
  const [lghPayment, setLghPayment] = useState<string>("Transfer");
  const [lghPhotoIdFile, setLghPhotoIdFile] = useState<File | null>(null);
  const [lghBuktiBayarFile, setLghBuktiBayarFile] = useState<File | null>(null);
  const [showLghPhotoCameraModal, setShowLghPhotoCameraModal] = useState(false);
  const [showLghBuktiCameraModal, setShowLghBuktiCameraModal] = useState(false);
  const [showLghContactDropdown, setShowLghContactDropdown] = useState(false);
  const lghPhotoIdInputRef = useRef<HTMLInputElement>(null);
  const lghBuktiBayarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lghCheckIn && lghCheckOut) {
      const d1 = new Date(lghCheckIn);
      const d2 = new Date(lghCheckOut);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      if (!isNaN(diffDays)) {
        setLghDur(diffDays);
      }
    }
  }, [lghCheckIn, lghCheckOut]);

  useEffect(() => {
    const numPrice = parseFloat(lghPrice) || 0;
    setLghAmount(String(numPrice * (lghDur || 1)));
  }, [lghPrice, lghDur]);

  const handleAddContact = async (
    e: FormEvent,
    roleType: "Vendor" | "Tallent" | "Member",
  ) => {
    e.preventDefault();
    try {
      setIsSubmittingContact(true);
      const res = await getSheetData("User!A1:ZZ1").catch(() => null);
      let userHeaders = [
        "ID",
        "Role",
        "Usecase",
        "Unit Business",
        "Name",
        "Email",
        "Phone",
        "Alamat",
        "Website",
        "Avail",
      ];
      if (res?.values?.length > 0) {
        userHeaders = res.values[0] as string[];
      }

      const newRow = new Array(userHeaders.length).fill("");
      let headersChanged = false;
      const setCol = (name: string, value: string) => {
        const normName = name.trim().toUpperCase();
        let idx = userHeaders.findIndex(
          (h) =>
            (h || "").trim().toUpperCase() === normName ||
            (h || "").trim().toUpperCase() === normName.replace(/ /g, "_"),
        );
        if (idx === -1) {
          idx = userHeaders.length;
          userHeaders.push(name);
          headersChanged = true;
          newRow.push("");
        }
        newRow[idx] = value;
      };

      const prefix =
        roleType === "Vendor" ? "vdr" : roleType === "Member" ? "mbr" : "tln";
      const contactId = `${prefix}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setCol("ID", contactId);
      setCol("Name", newContactName);
      setCol("AVAIL", "CNT");
      setCol("Email", newContactEmail);
      setCol("Phone", newContactPhone);
      setCol("Role", roleType === "Member" ? "Client" : roleType);

      if (roleType === "Member") {
        setCol("Usecase", "Member");
        setCol("Unit Business", "UNT12");
      } else {
        setCol("Usecase", newContactUsecase);
        const uId = obUnitId || "";
        setCol("Unit Business", uId);
      }

      setCol("Alamat", newContactAddress);
      setCol("Website", newContactWebsite);

      while (newRow.length > 0 && newRow[newRow.length - 1] === "") {
        newRow.pop();
      }

      await appendSheetData("User", [newRow]);

      const newContactObj = {
        id: contactId,
        name: newContactName,
        email: newContactEmail,
        role: roleType === "Member" ? "Client" : roleType,
        usecase: roleType === "Member" ? "Member" : newContactUsecase,
        unitBusiness: roleType === "Member" ? "UNT12" : obUnitId || "",
      };

      if (roleType === "Vendor") {
        setVendorList((prev) => [...prev, newContactObj]);
        setShowAddVendorModal(false);
        setObKepada(newContactName);
      } else if (roleType === "Tallent") {
        setTallentList((prev) => [...prev, newContactObj]);
        setShowAddTallentModal(false);
        setObKepada(newContactName);
      } else if (roleType === "Member") {
        setMemberList((prev) => [...prev, newContactObj]);
        setShowAddMemberModal(false);
        setLpNamaPengirim(newContactName);
      }

      setNewContactName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactUsecase("");
      setNewContactAddress("");
      setNewContactWebsite("");
      alert(`${roleType} berhasil ditambahkan`);
    } catch (err) {
      console.error(err);
      alert(`Gagal menambah ${roleType.toLowerCase()}`);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeFormAction) return;

    setFormIsSubmitting(true);
    try {
      const ts = new Date().toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });
      const randomId = Math.floor(10000 + Math.random() * 90000);

      let finalImgUrl = "";
      if (formImageFile) {
        try {
          const uploadRes = await DriveService.uploadFile(formImageFile);
          finalImgUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn("Image upload failed, falling back", uploadErr);
        }
      }

      if (activeFormAction.id === "add_issue") {
        if (!issueUnitId) {
          alert("Silakan pilih Unit Business terlebih dahulu!");
          setFormIsSubmitting(false);
          return;
        }
        if (!issueInfo.trim()) {
          alert("Silakan isi detail issue!");
          setFormIsSubmitting(false);
          return;
        }

        // Helper function for non-blocking coordinates retrieval
        const getCoordinates = (): Promise<string> => {
          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve("");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                resolve(`${latitude}, ${longitude}`);
              },
              (error) => {
                console.warn("Geolocation failed:", error);
                resolve("");
              },
              { timeout: 5000 },
            );
          });
        };

        const locString = await getCoordinates();

        let finalCatatan1 = "";
        if (catatanType1 === "note") {
          finalCatatan1 = catatanText1.trim();
        } else if (catatanType1 === "photo" && catatanPhoto1) {
          try {
            const uploadRes = await DriveService.uploadFile(catatanPhoto1);
            finalCatatan1 = uploadRes.url;
          } catch (uploadErr) {
            console.error("Failed uploading photo 1 asset:", uploadErr);
          }
        } else if (catatanType1 === "file" && catatanFile1) {
          try {
            const uploadRes = await DriveService.uploadFile(catatanFile1);
            finalCatatan1 = uploadRes.url;
          } catch (uploadErr) {
            console.error("Failed uploading file 1 asset:", uploadErr);
          }
        }

        let finalCatatan2 = "";
        if (catatanType2 === "note") {
          finalCatatan2 = catatanText2.trim();
        } else if (catatanType2 === "photo" && catatanPhoto2) {
          try {
            const uploadRes = await DriveService.uploadFile(catatanPhoto2);
            finalCatatan2 = uploadRes.url;
          } catch (uploadErr) {
            console.error("Failed uploading photo 2 asset:", uploadErr);
          }
        } else if (catatanType2 === "file" && catatanFile2) {
          try {
            const uploadRes = await DriveService.uploadFile(catatanFile2);
            finalCatatan2 = uploadRes.url;
          } catch (uploadErr) {
            console.error("Failed uploading file 2 asset:", uploadErr);
          }
        }

        // Fetch Issue sheet headers dynamically
        let issueHeaders: string[] = [];
        let sheetName = "ISSUE";
        let issueRes =
          (await getSheetData("ISSUE!A1:Z1").catch(() => null)) ||
          (await getSheetData("Issue!A1:Z1").catch(() => null));

        if (issueRes && issueRes.values && issueRes.values[0]) {
          issueHeaders = issueRes.values[0] as string[];
          sheetName = issueRes.range ? issueRes.range.split("!")[0] : "ISSUE";
        } else {
          issueHeaders = [
            "issue_id",
            "Timestamp",
            "user",
            "Unit",
            "keterangan",
            "Status",
            "Lampiran",
            "Catatan",
            "Lampiran2",
            "Catatan2",
            "Lokasi",
          ];
        }

        const newRow = new Array(issueHeaders.length || 11).fill("");
        const setCol = (headerName: string, value: any) => {
          const normName = headerName
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          const idx = issueHeaders.findIndex((h) => {
            if (!h) return false;
            const normH = h
              .trim()
              .toUpperCase()
              .replace(/[\s._-]+/g, "");
            if (normH === normName) return true;
            if (
              normName === "ISSUEID" &&
              (normH === "ISSUEID" || normH === "ISSUE_ID" || normH === "ID")
            )
              return true;
            if (
              normName === "TIMESTAMP" &&
              (normH === "TIMESTAMP" || normH === "TIME")
            )
              return true;
            if (
              normName === "USER" &&
              (normH === "USER" || normH === "EMAIL" || normH === "PELAPOR")
            )
              return true;
            if (
              normName === "UNIT" &&
              (normH === "UNIT" ||
                normH === "UNIT_NAME" ||
                normH === "UNITNAME")
            )
              return true;
            if (
              normName === "KETERANGAN" &&
              (normH === "KETERANGAN" ||
                normH === "ISSUE" ||
                normH === "DETAIL" ||
                normH === "NOTE" ||
                normH === "INFO")
            )
              return true;
            if (normName === "STATUS" && normH === "STATUS") return true;
            if (
              normName === "LAMPIRAN" &&
              (normH === "LAMPIRAN" ||
                normH === "TIPE" ||
                normH === "ATTACHMENT")
            )
              return true;
            if (
              normName === "CATATAN" &&
              (normH === "CATATAN" ||
                normH === "VALUE" ||
                normH === "ATTACHMENT_VALUE")
            )
              return true;
            if (
              normName === "LAMPIRAN2" &&
              (normH === "LAMPIRAN2" ||
                normH === "LAMPIRAN_2" ||
                normH === "TIPE2")
            )
              return true;
            if (
              normName === "CATATAN2" &&
              (normH === "CATATAN2" ||
                normH === "CATATAN_2" ||
                normH === "VALUE2")
            )
              return true;
            if (
              normName === "LOKASI" &&
              (normH === "LOKASI" ||
                normH === "LOCATION" ||
                normH === "COORDINATES")
            )
              return true;
            return false;
          });
          if (idx > -1) {
            newRow[idx] = value;
          }
        };

        const uniqueIssueId = `issue${Math.floor(1000 + Math.random() * 9000)}`;
        const issueTs = (() => {
          const d = new Date();
          const day = d.getDate().toString().padStart(2, "0");
          const month = (d.getMonth() + 1).toString().padStart(2, "0");
          const year = d.getFullYear();
          return `${month}/${day}/${year}`;
        })();

        const matchedUnit = unitList.find((u) => u.id === issueUnitId);
        const unitVal = matchedUnit ? matchedUnit.name : issueUnitId;

        setCol("issue_id", uniqueIssueId);
        setCol("Timestamp", issueTs);
        setCol("user", currentUserEmail);
        setCol("Unit", issueUnitId);
        setCol("keterangan", issueInfo.trim());
        setCol("Status", "SEND");
        setCol("Lampiran", catatanType1);
        setCol("Catatan", finalCatatan1);
        setCol("Lampiran2", catatanType2 !== "None" ? catatanType2 : "");
        setCol("Catatan2", catatanType2 !== "None" ? finalCatatan2 : "");
        setCol("Lokasi", locString);

        try {
          await appendSheetData(`${sheetName}!A1:Z`, [newRow]);
        } catch (err) {
          console.warn("Failed appending to sheetName, retrying default", err);
          await appendSheetData("ISSUE!A1:Z", [newRow]);
        }

        sendDeviceNotification(
          "Issue Dilaporkan ⚠️",
          `Issue baru berhasil dicatat oleh ${currentUserEmail}`,
        );
        alert("Laporan Issue berhasil dikirim!");
        const userName = getUserDisplayName(currentUserEmail);
        const issueDesc = issueInfo.trim().substring(0, 30);
        const formattedUnitVal = formatUnitName(unitVal);
        logActivity('Form', 'Dashboard', `${userName} mensubmit issue "${issueDesc}..." [${uniqueIssueId}] pada unit ${formattedUnitVal}`);
        setActiveFormAction(null);
        setFormIsSubmitting(false);
        return;
      } else if (activeFormAction.id === "5") {
        if (!obUnitId) {
          alert("Silakan pilih Unit Business terlebih dahulu!");
          setFormIsSubmitting(false);
          return;
        }
        if (!obPurpose.trim()) {
          alert("Silakan isi keperluan pengajuan!");
          setFormIsSubmitting(false);
          return;
        }
        if (!obOrderType) {
          alert("Silakan pilih Order type!");
          setFormIsSubmitting(false);
          return;
        }
        if (!obKepada.trim()) {
          alert("Silakan isi atau pilih penerima (Kepada)!");
          setFormIsSubmitting(false);
          return;
        }
        const parsedAmount = parseInt(obAmount.replace(/\D/g, ""), 10);
        if (!obAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
          alert("Silakan masukkan nominal pengajuan (Amount) yang valid!");
          setFormIsSubmitting(false);
          return;
        }
        if (!obVia) {
          alert("Silakan pilih VIA Pembayaran!");
          setFormIsSubmitting(false);
          return;
        }
        if (obVia === "Transfer") {
          if (!obBank) {
            alert("Silakan pilih Bank tujuan transfer!");
            setFormIsSubmitting(false);
            return;
          }
          if (!obRekNo.trim()) {
            alert("Silakan isi nomor rekening!");
            setFormIsSubmitting(false);
            return;
          }
          if (!obAtasNama.trim()) {
            alert("Silakan isi nama pemilik rekening (Atas Nama)!");
            setFormIsSubmitting(false);
            return;
          }
        }
        if (obVia === "Cash" && !obNote.trim()) {
          alert("Silakan isi catatan untuk pembayaran Cash!");
          setFormIsSubmitting(false);
          return;
        }
        if (obVia === "Qris" && !obQrisFile) {
          alert("Silakan upload foto/gambar QRIS!");
          setFormIsSubmitting(false);
          return;
        }
        if (obVia === "Ewallet") {
          if (!obEwalletName) {
            alert("Silakan pilih jenis E-Wallet!");
            setFormIsSubmitting(false);
            return;
          }
          if (!obEwalletNo.trim()) {
            alert("Silakan isi nomor E-Wallet / HP!");
            setFormIsSubmitting(false);
            return;
          }
        }
        if (obVia === "Virtual Akun" && !obVirtualNo.trim()) {
          alert("Silakan isi nomor Virtual Account!");
          setFormIsSubmitting(false);
          return;
        }

        const orderIdRandom = `ORD${Math.floor(1000 + Math.random() * 9000)}`;
        const tsDate = (() => {
          const d = new Date();
          return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
        })();

        let qrisUrl = "";
        if (obVia === "Qris" && obQrisFile) {
          try {
            const res = await DriveService.uploadFile(obQrisFile);
            qrisUrl = res.url;
          } catch (uploadErr) {
            console.error("Failed to upload Qris image", uploadErr);
          }
        }

        let notaUrl = "";
        if (
          (obOrderType === "Reimburse" || obOrderType === "Operational") &&
          obNotaFiles.length > 0
        ) {
          try {
            const uploadedUrls: string[] = [];
            for (const file of obNotaFiles) {
              const res = await DriveService.uploadFile(file);
              if (res?.url) uploadedUrls.push(res.url);
            }
            notaUrl = uploadedUrls.join(" ");
          } catch (uploadErr) {
            console.error("Failed to upload Nota Belanja images", uploadErr);
          }
        }

        let orderHeadersFetched: string[] = [];
        try {
          const hRes =
            (await getSheetData("Order Budget!A1:Z1").catch(() => null)) ||
            (await getSheetData("OrderBudget!A1:Z1").catch(() => null));
          if (hRes?.values?.length > 0) {
            orderHeadersFetched = hRes.values[0] as string[];
          }
        } catch (err) {
          console.warn("Failed to fetch Order Budget headers:", err);
        }

        const headersToUse =
          orderHeadersFetched.length > 0
            ? [...orderHeadersFetched]
            : [
                "Order ID",
                "RO_NUMBER",
                "Order Detail",
                "Unit Business",
                "Amount",
                "Review Tier",
                "Email User",
                "Date",
                "Project_id",
                "Task_id",
                "Sub Task_id",
                "Order Type",
                "Vendor",
                "Tallent",
                "Via",
                "Bank",
                "Rek No",
                "A n",
                "Berita",
                "Catatan",
                "Qris",
                "Ewallet Name",
                "Ewallet",
                "Virtual",
                "Nota Belanja",
                "Status",
                "via_nama",
              ];

        const newRow = new Array(Math.max(headersToUse.length, 25)).fill("");
        let headersChanged = false;
        const setCol = (name: string, value: string) => {
          const norm = name
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          let idx = headersToUse.findIndex((h) => {
            if (!h) return false;
            const kh = h
              .trim()
              .toUpperCase()
              .replace(/[\s._-]+/g, "");
            return kh === norm;
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            headersChanged = true;
            while (newRow.length <= idx) {
              newRow.push("");
            }
            newRow[idx] = value;
          }
        };

        const orderDetailVal = obPurpose || "";
        setCol("Order ID", orderIdRandom);
        setCol("RO_NUMBER", ""); // RO_Number biarkan kosong & sembunyikan
        setCol("Date", tsDate);
        setCol("Email User", currentUserEmail);
        setCol("Unit Business", obUnitId); // unitId writes to Unit Business
        setCol("Project_id", ""); // Project_id biarkan kosong
        setCol("Task_id", ""); // Task_id biarkan kosong
        setCol("Sub Task_id", ""); // Sub Task_id biarkan kosong
        setCol("Order Detail", orderDetailVal); // Keperluan writes to Order Detail
        setCol("Order Type", obOrderType);
        setCol("Contact ID", obKepada);
        setCol("Nota Belanja", notaUrl);

        const amountVal = obAmount || "0";
        setCol("Amount", amountVal); // Amount field writes to Amount
        setCol("Via", obVia);

        if (obVia === "Transfer") {
          setCol("via_nama", obBank);
          setCol("Rek No", obRekNo);
          setCol("A n", obAtasNama);
          setCol("Berita", obBerita);
        } else if (obVia === "Cash") {
          setCol("Catatan", obNote);
        } else if (obVia === "Qris") {
          setCol("Qris", qrisUrl);
        } else if (obVia === "Ewallet") {
          setCol("Ewallet Name", obEwalletName);
          setCol("Ewallet", obEwalletNo);
          setCol("via_nama", obEwalletName);
        } else if (obVia === "Virtual Akun") {
          setCol("Virtual", obVirtualNo);
        }

        setCol("Review Tier", "Admin Check");
        setCol("Status", "SENT");

        // Generates "Text gabung" with CONCATENATE rule
        const amountNum = parseInt(amountVal.replace(/\D/g, ""), 10) || 0;
        const formattedAmount = `Rp.${amountNum.toLocaleString("id-ID")}`;
        const matchedUnit = unitList.find((u) => u.id === obUnitId);
        const unitBusinessName = matchedUnit ? matchedUnit.name : obUnitId;
        const textGabung = `Order Budget ${orderDetailVal} ${formattedAmount} untuk ${obOrderType} | ${obKepada} via ${obVia} | Unit: ${unitBusinessName}`;
        setCol("Text gabung", textGabung);

        if (headersChanged) {
          try {
            const getLet = (n: number) => {
              let res = "";
              while (n >= 0) {
                res = String.fromCharCode((n % 26) + 65) + res;
                n = Math.floor(n / 26) - 1;
              }
              return res;
            };
            const range = `Order Budget!A1:${getLet(headersToUse.length - 1)}1`;
            await updateSheetData(range, [headersToUse]);
          } catch (e) {
            console.warn("Could not update headers", e);
          }
        }

        await appendSheetData("Order Budget!A1:Z", [newRow]).catch(async () => {
          await appendSheetData("OrderBudget!A1:Z", [newRow]);
        });
        const userNameForOb = getUserDisplayName(currentUserEmail);
        const formattedUnitBizName = formatUnitName(unitBusinessName);
        const obLogDesc = `${userNameForOb} order ${orderDetailVal} [${orderIdRandom}] ${formattedAmount} untuk ${obOrderType} | ${obKepada} via ${obVia} | Unit : ${formattedUnitBizName}`;
        logActivity("Order Budget", "formulir order budget", obLogDesc);
        sendDeviceNotification(
          "Order Budget Baru 💸",
          `Pengajuan anggaran belanja berhasil dikirimkan oleh ${currentUserEmail}`,
        );
        alert("Order Budget berhasil diajukan!");
        setObNotaFiles([]);
        setActiveFormAction(null);
        setFormIsSubmitting(false);
        return;
      } else if (activeFormAction.id === "12") {
        let finalLpProofUrl = "";
        if (lpBuktiBayarFiles && lpBuktiBayarFiles.length > 0) {
          try {
            const urls = await Promise.all(
              lpBuktiBayarFiles.map((file) => DriveService.uploadFile(file).then(res => res.url).catch(() => ''))
            );
            finalLpProofUrl = urls.filter(u => !!u).join('\n');
          } catch (uploadErr) {
            console.warn(
              "Lion Parcel proof upload failed, falling back",
              uploadErr,
            );
          }
        }

        // Fetch current headers from the sheets
        let lionHeaders: string[] = [];
        try {
          const res =
            (await getSheetData("Lion Parcel!A1:Z1").catch(() => null)) ||
            (await getSheetData("LionParcel!A1:Z1").catch(() => null));
          if (res && res.values && res.values.length > 0) {
            lionHeaders = res.values[0] as string[];
          }
        } catch (err) {
          console.warn("Failed to fetch Lion Parcel headers: ", err);
        }

        const headersToUse =
          lionHeaders.length > 0
            ? [...lionHeaders]
            : [
                "ID",
                "Date",
                "No. Resi",
                "Nama Pengirim",
                "Tujuan",
                "Layanan",
                "Cara Pembayaran",
                "Berat",
                "Jenis Barang",
                "Tarif Masuk",
                "Keterangan",
                "Bukti Bayar",
              ];

        const newRow = new Array(Math.max(headersToUse.length, 11)).fill("");

        const setCol = (name: string, value: string) => {
          const norm = name
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          let idx = headersToUse.findIndex((h) => {
            if (!h) return false;
            const kh = h
              .trim()
              .toUpperCase()
              .replace(/[\s._-]+/g, "");
            return kh === norm || kh.includes(norm) || norm.includes(kh);
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            while (newRow.length <= idx) {
              newRow.push("");
            }
            newRow[idx] = value;
          }
        };

        const randomLpcId = `Lpc-${Math.floor(1000 + Math.random() * 9000)}`;
        const nowD = new Date();
        const dateFormatted = `${(nowD.getMonth() + 1).toString().padStart(2, "0")}/${nowD.getDate().toString().padStart(2, "0")}/${nowD.getFullYear()}`;

        setCol("ID", randomLpcId);
        setCol("Date", dateFormatted);
        setCol("No. Resi", lpNoResi);
        setCol("Nama Pengirim", lpNamaPengirim);
        setCol("Tujuan", lpTujuan);
        setCol("Layanan", lpLayanan);
        setCol("Cara Pembayaran", lpCaraPembayaran);
        setCol("Berat", lpBerat || "");
        setCol("Jenis Barang", lpJenisBarang);
        setCol("Tarif Masuk", lpTarifStr || "");
        setCol("Diskon", lpDiskonKode);
        setCol("Poin", lpTukarPoin);
        setCol("Tukar Poin", lpTukarPoin);
        setCol("Total Biaya", lpTotalBiaya);
        setCol("Keterangan", lpKeterangan);
        setCol("Bukti Bayar", finalLpProofUrl);

        await appendSheetData("Lion Parcel!A1:Z", [newRow]).catch(async () => {
          await appendSheetData("LionParcel!A1:Z", [newRow]);
        });

        const selectedMember = memberList.find(
          (m) => m.name === lpNamaPengirim,
        );
        if (selectedMember && lpTarifStr && poinColLetter) {
          try {
            const addedPoin = Math.floor(parseInt(lpTarifStr) / 1000);
            const deductedPoin = parseInt(lpTukarPoinInput) || 0;
            const newPoin = Math.max(
              0,
              (selectedMember.poin || 0) + addedPoin - deductedPoin,
            );
            await updateSheetData(
              `User!${poinColLetter}${selectedMember.rowNumber}`,
              [[newPoin.toString()]],
            );
            setMemberList((prev) =>
              prev.map((m) =>
                m.id === selectedMember.id ? { ...m, poin: newPoin } : m,
              ),
            );
          } catch (err) {
            console.warn("Failed to update member poin", err);
          }
        }

        alert("Pengiriman Lion Parcel berhasil dicatat!");
        const totalBiayaNum = parseFloat(String(lpTotalBiaya).replace(/\D/g, '')) || 0;
        const formattedBiaya = `Rp.${totalBiayaNum.toLocaleString('id-ID')}`;
        const chsUser = getUserDisplayName(currentUserEmail);
        logActivity('Form', 'kirim barang Form', `${chsUser} mengirim barang via Lion Parcel | ${lpLayanan} | ${lpJenisBarang} | ${lpBerat} kg | tujuan: ${lpTujuan} | biaya: ${formattedBiaya}`);

        // Reset the Lion Parcel form states
        setLpNoResi("");
        setLpNamaPengirim("");
        setLpTujuan("");
        setLpLayanan("");
        setLpCaraPembayaran("");
        setLpBerat("");
        setLpJenisBarang("");
        setLpTarifStr("");
        setLpDiskonKode("");
        setLpDiskonKodeInput("");
        setLpTukarPoin("");
        setLpTukarPoinInput("");
        setLpTotalBiaya("");
        setLpKeterangan("");
        setLpBuktiBayarFiles([]);
      } else if (activeFormAction.id === "14") {
        if (!chNotaFile) {
          alert("Silakan ambil atau pilih foto Nota terlebih dahulu!");
          setFormIsSubmitting(false);
          return;
        }

        let finalChNotaUrl = "";
        try {
          const uploadChRes = await DriveService.uploadFile(chNotaFile);
          finalChNotaUrl = uploadChRes.url;
        } catch (uploadErr) {
          console.warn("Chillhub Nota upload failed, falling back", uploadErr);
        }

        const dNow = new Date();
        const randId = `chs-${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${(dNow.getMonth() + 1).toString().padStart(2, "0")}/${dNow.getDate().toString().padStart(2, "0")}/${dNow.getFullYear()}`;
        const formattedTime = dNow.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        // Fetch current headers from the sheets
        let chillhubHeaders: string[] = [];
        try {
          const res =
            (await getSheetData("Chillhub Surabaya!A1:Z1").catch(() => null)) ||
            (await getSheetData("Chillhub!A1:Z1").catch(() => null));
          if (res?.values?.length > 0) {
            chillhubHeaders = res.values[0] as string[];
          }
        } catch (err) {
          console.warn("Failed to fetch Chillhub headers:", err);
        }

        const defaultHeaders = [
          "ID",
          "Date",
          "Time",
          "Activities",
          "Price",
          "User",
          "Nota",
        ];
        const headersToUse =
          chillhubHeaders.length > 0 ? [...chillhubHeaders] : defaultHeaders;

        const newRow = new Array(Math.max(headersToUse.length, 7)).fill("");

        const setCol = (name: string, value: string) => {
          const norm = name
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          let idx = headersToUse.findIndex((h) => {
            if (!h) return false;
            const kh = h
              .trim()
              .toUpperCase()
              .replace(/[\s._-]+/g, "");
            return kh === norm || kh.includes(norm) || norm.includes(kh);
          });
          if (idx > -1) {
            newRow[idx] = value;
          } else {
            idx = headersToUse.length;
            headersToUse.push(name);
            while (newRow.length <= idx) {
              newRow.push("");
            }
            newRow[idx] = value;
          }
        };

        setCol("ID", randId);
        setCol("Date", formattedDate);
        setCol("Time", formattedTime);
        setCol("Activities", "Daily Sales");
        setCol("Price", chAmount);
        setCol("User", currentUserEmail);
        setCol("Nota", finalChNotaUrl);

        await appendSheetData("Chillhub Surabaya!A1:Z", [newRow]).catch(
          async () => {
            await appendSheetData("Chillhub!A1:Z", [newRow]);
          },
        );

        alert("Chillhub Daily Sales Report berhasil dicatat!");
        const chsPriceNum = parseFloat(chAmount) || 0;
        const chsPriceFormatted = `Rp.${chsPriceNum.toLocaleString('id-ID')}`;
        const chsUser = getUserDisplayName(currentUserEmail);
        logActivity('Form', 'daily report Form', `${chsUser} mencatat CHS daily sales | ${chsPriceFormatted}`);

        // Reset the form states
        setChAmount("");
        setChNotaFile(null);
      } else if (activeFormAction.id === "dr_dok") {
        if (!drReport.trim()) {
          alert("Laporan (Report) tidak boleh kosong!");
          setFormIsSubmitting(false);
          return;
        }

        const allFilesUrls: string[] = [];
        if (drFiles.length > 0) {
          for (const file of drFiles) {
            try {
              const res = await DriveService.uploadFile(file);
              allFilesUrls.push(res.url);
            } catch (err) {
              console.warn("File upload failed", err);
            }
          }
        }

        const randId = `DR-${Math.floor(10000 + Math.random() * 90000)}`;

        const userNameForReport = getUserDisplayName(currentUserEmail);
        
        // Format Timestamp
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dObj = new Date();
        const dName = days[dObj.getDay()];
        const dDate = dObj.getDate();
        const mName = months[dObj.getMonth()];
        const yStr = dObj.getFullYear();
        const hrStr = String(dObj.getHours()).padStart(2, "0");
        const mnStr = String(dObj.getMinutes()).padStart(2, "0");
        
        let tzName = "WIB";
        const tzOffset = -dObj.getTimezoneOffset() / 60;
        if (tzOffset === 7) tzName = "WIB";
        else if (tzOffset === 8) tzName = "WITA";
        else if (tzOffset === 9) tzName = "WIT";
        else {
          try {
            const parts = new Intl.DateTimeFormat('id-ID', { timeZoneName: 'short' }).formatToParts(dObj);
            const tzPart = parts.find(p => p.type === 'timeZoneName');
            if (tzPart && tzPart.value) tzName = tzPart.value;
          } catch(e) {}
        }
        
        const pdfDateStr = `${dName}, ${dDate} ${mName} ${yStr} ${hrStr}:${mnStr} ${tzName}`;

        let pdfUrl = "";
        try {
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          const title = "DAILY REPORT";
          const titleWidth = doc.getTextWidth(title);
          doc.text(title, (pageWidth - titleWidth) / 2, 25);
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          doc.text(`Nama : ${userNameForReport}`, 14, 40);
          doc.text(`Tanggal : ${pdfDateStr}`, 14, 47);
          
          doc.setLineWidth(0.5);
          doc.line(14, 52, pageWidth - 14, 52);
          
          doc.setFontSize(12);
          const splitText = doc.splitTextToSize(drReport, pageWidth - 28);
          doc.text(splitText, 14, 62);
          
          const pdfBlob = doc.output('blob');
          const pdfFile = new File([pdfBlob], `Report_${randId}.pdf`, { type: 'application/pdf' });
          const pdfRes = await DriveService.uploadFile(pdfFile);
          pdfUrl = pdfRes.url;
        } catch (e) {
          console.warn("Failed generating or uploading PDF", e);
        }

        let dokHeaders: string[] = [];
        try {
          const res = await getSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", "Dok Sub Task!A1:Z1").catch(() => null);
          if (res?.values?.length > 0) {
            dokHeaders = res.values[0] as string[];
          }
        } catch (e) {
          console.warn("Failed to fetch Dok Sub Task headers", e);
        }

        if (dokHeaders.length === 0) {
          dokHeaders = [
            "Dok Sub ID", "Time", "Sub_ID", "User", "Judul", "Title_Dok", 
            "Dok_Type", "Image_01", "File_01", "Url_01", "Note", "DATA", 
            "Start Date", "End Date", "Kategori", "Validitas", "Status"
          ];
        }

        const newRow = new Array(Math.max(dokHeaders.length, 17)).fill("");
        const setDokCol = (name: string, val: string) => {
          let idx = dokHeaders.findIndex((h) => h?.trim().toUpperCase() === name.toUpperCase());
          if (idx === -1) {
            idx = dokHeaders.findIndex((h) => (h?.trim().toUpperCase() || "").includes(name.toUpperCase()));
          }
          if (idx > -1) newRow[idx] = val;
        };

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const tsTime = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        setDokCol("Dok Sub ID", randId);
        setDokCol("ID DOK", randId); // Fallback if user actually has ID DOK
        setDokCol("Time", tsTime);
        setDokCol("TIMESTAMP", tsTime);
        setDokCol("User", currentUserEmail);
        setDokCol("Dok_Type", "Daily Report");
        setDokCol("DOK_TYPE", "Daily Report");
        setDokCol("Title_Dok", `Daily Report ${userNameForReport}`);
        setDokCol("TITLE_DOK", `Daily Report ${userNameForReport}`);
        
        const formattedDiscussion = drDiscussion.trim() ? `${userNameForReport} : ${drDiscussion}` : "";
        setDokCol("Note", formattedDiscussion);
        setDokCol("CATATAN", formattedDiscussion);
        
        setDokCol("STATUS", "Review");
        setDokCol("DATA", "FALSE");
        
        if (allFilesUrls.length > 0) {
          setDokCol("Image_01", allFilesUrls.join(" \n"));
          setDokCol("IMAGE_01", allFilesUrls.join(" \n"));
        }
        
        if (pdfUrl) {
          setDokCol("File_01", pdfUrl);
          setDokCol("FILE_01", pdfUrl);
        }

        await appendSheetDataFromId("1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao", "Dok Sub Task!A1:Z", [newRow]);

        alert("Daily Report berhasil dikirim!");
        const drUser = getUserDisplayName(currentUserEmail);
        logActivity("Form", "Daily Report Dok", `${drUser} mengirim daily report [${randId}]`);

        // Reset
        setDrReport("");
        setDrDiscussion("");
        setDrFiles([]);
      } else if (activeFormAction.id === "13") {
        let finalPhotoIdUrl = "";
        if (lghPhotoIdFile) {
          try {
            const r = await DriveService.uploadFile(lghPhotoIdFile);
            finalPhotoIdUrl = r.url;
          } catch (err) {
            console.warn("Photo ID upload failed", err);
          }
        }
        let finalBuktiUrl = "";
        if (lghBuktiBayarFile) {
          try {
            const r = await DriveService.uploadFile(lghBuktiBayarFile);
            finalBuktiUrl = r.url;
          } catch (err) {
            console.warn("Bukti bayar upload failed", err);
          }
        }

        const formatSheetDate = (dStr: string) => {
          if (!dStr) return "";
          const parts = dStr.split("-");
          if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          return dStr;
        };

        const checkInFmt = formatSheetDate(lghCheckIn);
        const checkOutFmt = formatSheetDate(lghCheckOut);
        const roomFormatted = lghRoom.startsWith("Room ") ? lghRoom : `Room ${lghRoom}`;
        const totalAmountNum = parseFloat(lghAmount) || (parseFloat(lghPrice) || 0) * (lghDur || 1);

        let lovissaHeaders: string[] = [];
        try {
          const res = await getSheetData("Lovissa Guest House!A1:Z1");
          if (res && res.values && res.values.length > 0) {
            lovissaHeaders = res.values[0] as string[];
          }
        } catch (e) {
          console.warn("Failed fetching Lovissa Guest House headers:", e);
        }

        if (!lovissaHeaders || lovissaHeaders.length === 0) {
          lovissaHeaders = [
            "CHECK IN",
            "CHECK OUT",
            "DUR",
            "TYPE",
            "ROOM",
            "PRICE",
            "AMOUNT",
            "KETERANGAN",
            "NAME",
            "NO.ID",
            "EMAIL",
            "PHONE",
            "PAYMENT",
            "PHOTO ID",
            "BUKTI TRANSFER",
          ];
        }

        const newRow = lovissaHeaders.map((h: string) => {
          const norm = (h || "").trim().toUpperCase();
          if (norm === "CHECK IN" || norm === "CHECK-IN" || norm === "CHECKIN") return checkInFmt;
          if (norm === "CHECK OUT" || norm === "CHECK-OUT" || norm === "CHECKOUT") return checkOutFmt;
          if (norm === "DUR" || norm === "DURATION" || norm === "DURASI") return String(lghDur);
          if (norm === "TYPE" || norm === "TIPE") return lghType;
          if (norm === "ROOM" || norm === "KAMAR") return roomFormatted;
          if (norm === "PRICE" || norm === "HARGA") return String(lghPrice);
          if (norm === "AMOUNT" || norm === "TOTAL" || norm === "JUMLAH") return String(totalAmountNum);
          if (norm === "KETERANGAN" || norm === "NOTE" || norm === "NOTES") return lghKeterangan;
          if (norm === "NAME" || norm === "NAMA" || norm === "CONTACT ID" || norm === "CONTACTID" || norm === "KONTAK") return lghGuestName;
          if (norm === "NO.ID" || norm === "NO ID" || norm === "NO. ID" || norm === "IDENTITY NO" || norm === "KTP") return lghNoId;
          if (norm === "EMAIL") return lghEmail;
          if (norm === "PHONE" || norm === "TELEPON" || norm === "NO HP" || norm === "NO. HP") return lghPhone;
          if (norm === "PAYMENT" || norm === "PEMBAYARAN" || norm === "PAYMENT METHOD") return lghPayment;
          if (norm === "PHOTO ID" || norm === "FOTO ID" || norm === "PHOTOID" || norm === "FOTO KTP" || norm === "PHOTO KTP") return finalPhotoIdUrl;
          if (norm === "BUKTI TRANSFER" || norm === "BUKTI" || norm === "BUKTI BAYAR" || norm === "TRANSFER PROOF") return finalBuktiUrl;
          return "";
        });

        await appendSheetData("Lovissa Guest House!A1:Z", [newRow]);

        const currentUser = getUserDisplayName(currentUserEmail);
        logActivity(
          "Form",
          "Check In LGH",
          `${currentUser} mencatat Check In ${roomFormatted} (${lghGuestName || "Tamu"}) | Rp.${totalAmountNum.toLocaleString("id-ID")}`
        );

        alert("Check In Lovissa Guest House berhasil dikirim!");

        // Reset
        setLghGuestName("");
        setLghNoId("");
        setLghEmail("");
        setLghPhone("");
        setLghKeterangan("");
        setLghPhotoIdFile(null);
        setLghBuktiBayarFile(null);
      } else if (activeFormAction.id === "hq_form") {
        let finalHqUrl = "";
        if (hqFile) {
          try {
            const uploadHqRes = await DriveService.uploadFile(hqFile);
            finalHqUrl = uploadHqRes.url;
          } catch (uploadErr) {
            console.warn("HQ File upload failed", uploadErr);
          }
        }
        const dNow = new Date();
        const randId = `hq${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${(dNow.getMonth() + 1).toString().padStart(2, "0")}/${dNow.getDate().toString().padStart(2, "0")}/${dNow.getFullYear()}`;

        let hqHeaders: string[] = [];
        try {
          const res = await getSheetDataFromId(
            "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
            "Head Quarter!A1:Z1",
          ).catch(() => null);
          if (res?.values?.length > 0) hqHeaders = res.values[0] as string[];
        } catch (e) {}

        const defaultHeaders = [
          "ID",
          "Date",
          "Activities",
          "Qty",
          "Uom",
          "Price",
          "Amount",
          "Client",
          "Note",
          "STATUS",
          "PAID Date",
          "File",
        ];
        const useHeaders = hqHeaders.length > 0 ? hqHeaders : defaultHeaders;
        const newRow = new Array(useHeaders.length).fill("");

        const setVal = (keys: string[], val: any) => {
          const idx = useHeaders.findIndex((h) =>
            keys.includes(h?.trim().toUpperCase()),
          );
          if (idx !== -1) newRow[idx] = val;
        };

        setVal(["ID"], randId);
        setVal(["DATE", "TANGGAL"], formattedDate);
        setVal(["ACTIVITIES", "ACTIVITY"], hqActivities);
        setVal(["QTY", "QUANTITY"], hqQty);
        setVal(["UOM", "SATUAN"], hqUom);
        setVal(["PRICE", "HARGA"], hqPrice);
        setVal(
          ["AMOUNT", "JUMLAH", "TOTAL"],
          Number(hqQty || 0) * Number(hqPrice || 0),
        );
        setVal(["CLIENT", "KLIEN", "PELANGGAN"], hqClient);
        setVal(["NOTE", "CATATAN"], hqNote);
        setVal(["STATUS"], hqStatus);
        setVal(["PAID DATE"], hqStatus === "Paid" ? formattedDate : "");
        setVal(["FILE", "PHOTO", "FOTO", "BUKTI"], finalHqUrl);

        await appendSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "Head Quarter!A1:Z",
          [newRow],
        );
        alert("Form HQ berhasil dikirim!");
        const hqAmount = Number(hqQty || 0) * Number(hqPrice || 0);
        const formattedHqAmt = `Rp.${hqAmount.toLocaleString('id-ID')}`;
        const hqUser = getUserDisplayName(currentUserEmail);
        logActivity('Form', 'HQ Form', `${hqUser} melapor HQ | ${hqActivities} | ${formattedHqAmt} | client: ${hqClient}`);
        setHqActivities("");
        setHqQty("");
        setHqUom("");
        setHqPrice("");
        setHqClient("");
        setHqNote("");
        setHqStatus("Unpaid");
        setHqFile(null);
      } else if (activeFormAction.id === "15") {
        const newRow = [
          ts,
          formData.detail,
          formData.address,
          formData.category,
          currentUserEmail,
        ];
        await appendSheetData("Boganatha!A1:Z", [newRow]);
        alert("Laporan Boganatha berhasil dikirim!");
      }

      setFormData({
        unitId: "",
        detail: "",
        note: "",
        amount: "",
        purpose: "",
        trackingId: "",
        receiver: "",
        address: "",
        weight: "",
        menuItem: "",
        quantity: "1",
        itemName: "",
        spec: "",
        category: "Operational",
      });
      setFormImageFile(null);
      setFormImageUrl("");
      setActiveFormAction(null);
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengirim form: " + err.message);
    } finally {
      setFormIsSubmitting(false);
    }
  };

  // Quick actions: 8 items + 1 'Lihat Semua'
  const visibleActions = ALL_ACTIONS.slice(0, 8);

  const uploadFile = async (fileOrBlob: File | Blob) => {
    try {
      setIsUploading(true);

      // If it's a blob from camera, convert to File
      const fileToUpload =
        fileOrBlob instanceof File
          ? fileOrBlob
          : new File([fileOrBlob], `capture_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });

      await DriveService.uploadFile(fileToUpload);
      alert("Upload berhasil!");
    } catch (err: any) {
      console.warn("Upload failed:", err);
      if (err.message?.includes("Mock authentication used") || !err.message) {
        alert("Preview limits: Google Drive authentication not fully configured, bypass upload.");
      } else {
        alert("Upload gagal: " + err.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectedUserObj = userList.find((u) => u.email === selectedWargaEmail);

  const handleMasukWarga = async () => {
    if (!selectedUserObj) return;

    if (wargaPin !== selectedUserObj.pin) {
      return; // Button is disabled if invalid, this defends against manual triggers
    }

    setIsUpdatingMasuk(true);
    try {
      if (masukColLetter) {
        const range = `User!${masukColLetter}${selectedUserObj.rowNumber}`;
        await updateSheetData(range, [["TRUE"]]);

        setShowMasukPopup(false);
        setUserList((prev) =>
          prev.map((u) =>
            u.email === selectedUserObj.email ? { ...u, masuk: true } : u,
          ),
        );

        localStorage.setItem("mtask_user_email", selectedUserObj.email);
        const isAvail =
          selectedUserObj.avail === "TRUE" ||
          selectedUserObj.avail === "true" ||
          selectedUserObj.avail === "";
        localStorage.setItem(
          "mtask_user_avatar",
          isAvail ? formatImageUrl(selectedUserObj.avatar || "") : "",
        );
        localStorage.setItem("mtask_user_name", selectedUserObj.name || "");
        window.dispatchEvent(new Event("mtask_user_changed"));
        setActiveUserName(selectedUserObj.name);
        const normRole = (selectedUserObj.role || "").trim().toUpperCase();
        setCurrentUserRole(normRole);
        localStorage.setItem("mtask_user_role", normRole);
        setCurrentUserUsecase(selectedUserObj.usecase || "");
      }
    } catch (err) {
      console.error("Gagal masuk", err);
      alert("Gagal memverifikasi masuk");
    } finally {
      setIsUpdatingMasuk(false);
    }
  };

  const handleCapture = (blob: Blob) => {
    setShowCameraModal(false);
    uploadFile(blob);
  };

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      {/* Dynamic Pop-up Notification for New Unread Tasks & Sub Tasks & User Orders */}
      <AnimatePresence>
        {userOrderNotifs.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              id="user-order-notif-dialog"
              className="bg-emerald-600 rounded-2xl shadow-xl overflow-hidden border border-emerald-500 relative w-full h-40 max-w-[500px] mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-green-500 z-0" />
              <button
                type="button"
                id="user-order-notif-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserOrderNotifs([]);
                }}
                className="absolute top-2 right-2 text-white/70 hover:text-white p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors cursor-pointer border-none z-20"
                title="Sembunyikan"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                id="user-order-notif-card"
                onClick={() => handleUserObNotifClick(userOrderNotifs[0])}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer px-4 text-center group"
              >
                {userObNotifLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <Bell className="w-8 h-8 text-white animate-bounce drop-shadow-md mb-2" />

                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  Budget Di Setujui
                </h3>
              </div>
            </motion.div>
          </div>
        ) : unreadOrders.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              id="order-notif-dialog"
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative max-w-md w-full h-40 mx-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-600 to-indigo-700 z-0" />

              <button
                type="button"
                id="order-notif-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setUnreadOrders([]);
                }}
                className="absolute top-2 right-2 text-white/70 hover:text-white p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-colors cursor-pointer border-none z-20"
                title="Sembunyikan"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                id="order-notif-card"
                onClick={() => handleObNotifClick(unreadOrders[0])}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer px-4 text-center group"
              >
                {obNotifLoading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <Bell className="w-8 h-8 text-white animate-bounce drop-shadow-md mb-2" />

                <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  New Order Budget
                </h3>
              </div>
            </motion.div>
          </div>
        ) : unreadReviewTasks.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              id="review-task-notif-dialog"
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Highlight background accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

              {/* Close Button to dismiss temporarily */}
              <button
                type="button"
                id="review-task-notif-close"
                onClick={() => setUnreadReviewTasks([])}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Sembunyikan"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon container */}
              <div className="w-16 h-16 bg-gradient-to-tr from-purple-50 to-pink-50 rounded-2xl flex items-center justify-center mb-4 mt-2 shadow-inner border border-purple-100/50">
                <Bell className="w-8 h-8 text-purple-600 animate-bounce" />
              </div>

              {/* Notification Header */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                Task To Review
              </h3>

              {/* Task Details Card */}
              <div
                id="review-task-notif-card"
                onClick={() => handleReviewNotifClick(unreadReviewTasks[0])}
                className="mt-4 p-4 w-full bg-slate-50/80 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all hover:shadow-md group active:scale-[0.99] text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-150 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-purple-50 group-hover:border-purple-200 transition-colors">
                    <CheckCircle2 className="w-4.5 h-4.5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
                      {unreadReviewTasks[0].name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-md shrink-0 uppercase tracking-widest text-[9px] border border-red-100 animate-pulse">
                          Due
                        </span>
                        <span className="truncate text-gray-500 font-semibold">
                          {unreadReviewTasks[0].dueDate || "No Due Date"}
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-600 font-bold group-hover:underline self-end shrink-0">
                        Buka Task →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : unreadSubtasks.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              id="subtask-notif-dialog"
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Highlight background accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

              {/* Close Button to dismiss temporarily */}
              <button
                type="button"
                id="subtask-notif-close"
                onClick={() => setUnreadSubtasks([])}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Sembunyikan"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon container */}
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center mb-4 mt-2 shadow-inner border border-amber-100/50">
                <Bell className="w-8 h-8 text-amber-600 animate-bounce" />
              </div>

              {/* Notification Header */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                {activeUserName || currentUserEmail.split("@")[0]}, kamu dapat
                tugas baru
              </h3>

              {/* Sub Task Details Card */}
              <div
                id="subtask-notif-card"
                onClick={() => handleSubNotifClick(unreadSubtasks[0])}
                className="mt-4 p-4 w-full bg-slate-50/80 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all hover:shadow-md group active:scale-[0.99] text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-150 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors">
                    <CheckCircle2 className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-amber-700 transition-colors line-clamp-2">
                      {unreadSubtasks[0].name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-md shrink-0 uppercase tracking-widest text-[9px] border border-red-100 animate-pulse">
                          Due
                        </span>
                        <span className="truncate text-gray-500 font-semibold">
                          {unreadSubtasks[0].dueDate || "No Due Date"}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold group-hover:underline self-end shrink-0">
                        Buka Tugas →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : unreadTasks.length > 0 ? (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              id="task-notif-dialog"
              className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 flex flex-col items-center text-center relative overflow-hidden"
            >
              {/* Highlight background accent */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-505" />

              {/* Close Button to dismiss temporarily */}
              <button
                type="button"
                id="task-notif-close"
                onClick={() => setUnreadTasks([])}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer border-none bg-transparent"
                title="Sembunyikan"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon container */}
              <div className="w-16 h-16 bg-gradient-to-tr from-sky-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 mt-2 shadow-inner border border-sky-100/50">
                <Bell className="w-8 h-8 text-sky-600 animate-bounce" />
              </div>

              {/* Notification Header */}
              <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug">
                {activeUserName || currentUserEmail.split("@")[0]}, Kamu dapat
                Task Baru
              </h3>

              {/* Task Details Card */}
              <div
                id="task-notif-card"
                onClick={() => handleNotifClick(unreadTasks[0])}
                className="mt-4 p-4 w-full bg-slate-50/80 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all hover:shadow-md group active:scale-[0.99] text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white border border-gray-150 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-sky-50 group-hover:border-sky-200 transition-colors">
                    <CheckCircle2 className="w-4.5 h-4.5 text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-sky-700 transition-colors line-clamp-2">
                      {unreadTasks[0].name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-1.5 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-md shrink-0 uppercase tracking-widest text-[9px] border border-red-100 animate-pulse">
                          Due
                        </span>
                        <span className="truncate text-gray-500">
                          {unreadTasks[0].dueDate || "No Due Date"}
                        </span>
                      </div>
                      <span className="text-[10px] text-sky-600 font-bold group-hover:underline self-end shrink-0">
                        Buka Task →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      {showCameraModal && (
        <CameraModal
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCapture}
          onGallerySelect={() => {
            setShowCameraModal(false);
            imageInputRef.current?.click();
          }}
        />
      )}
      {showLpCameraModal && (
        <CameraModal
          onClose={() => setShowLpCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_lion_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setLpBuktiBayarFiles((prev) => [...prev, file]);
            setShowLpCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowLpCameraModal(false);
            lpFileInputRef.current?.click();
          }}
        />
      )}
      {showChCameraModal && (
        <CameraModal
          onClose={() => setShowChCameraModal(false)}
          onCapture={(blob) => {
            const file = new File(
              [blob],
              `capture_chillhub_${Date.now()}.jpg`,
              { type: "image/jpeg" },
            );
            setChNotaFile(file);
            setShowChCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowChCameraModal(false);
            chFileInputRef.current?.click();
          }}
        />
      )}
      {showHqCameraModal && (
        <CameraModal
          onClose={() => setShowHqCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_hq_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setHqFile(file);
            setShowHqCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowHqCameraModal(false);
            hqFileInputRef.current?.click();
          }}
        />
      )}
      {showIssueCameraModal && (
        <CameraModal
          onClose={() => setShowIssueCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_issue_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            if (activePhotoTarget === 1) {
              setCatatanPhoto1(file);
            } else {
              setCatatanPhoto2(file);
            }
            setShowIssueCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowIssueCameraModal(false);
            if (activePhotoTarget === 1) {
              catatanPhotoInputRef1.current?.click();
            } else {
              catatanPhotoInputRef2.current?.click();
            }
          }}
        />
      )}
      {showLghPhotoCameraModal && (
        <CameraModal
          onClose={() => setShowLghPhotoCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_ktp_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setLghPhotoIdFile(file);
            setShowLghPhotoCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowLghPhotoCameraModal(false);
            lghPhotoIdInputRef.current?.click();
          }}
        />
      )}
      {showLghBuktiCameraModal && (
        <CameraModal
          onClose={() => setShowLghBuktiCameraModal(false)}
          onCapture={(blob) => {
            const file = new File([blob], `capture_bukti_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setLghBuktiBayarFile(file);
            setShowLghBuktiCameraModal(false);
          }}
          onGallerySelect={() => {
            setShowLghBuktiCameraModal(false);
            lghBuktiBayarInputRef.current?.click();
          }}
        />
      )}
      {/* Hidden File Input for Image Gallery */}
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={handleImageChange}
        className="hidden"
      />
      {/* Hidden File Input for Any File */}
      <input
        type="file"
        accept="*/*"
        ref={fileInputRef}
        onChange={handleDocumentChange}
        className="hidden"
      />
      {/* Header */}
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">
            Dashboard
          </h1>
        </div>
      </header>
      <div className="px-4 space-y-6">
        {/* Card 1: Banner 1 */}
        {banner1 &&
          typeof banner1.image === "string" &&
          banner1.image.trim() !== "" && (
            <div
              onClick={() => handleBannerClick(banner1.linkTo)}
              className={cn(
                "bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative",
                banner1.linkTo && banner1.linkTo.trim() !== ""
                  ? "cursor-pointer active:scale-[0.99] transition-transform"
                  : "",
              )}
            >
              <img
                src={banner1.image}
                alt="Main Banner"
                className="w-full h-40 object-cover"
                referrerPolicy="no-referrer"
              />
              {banner1.judul && banner1.judul.trim() !== "" && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-4">
                  <span className="text-white text-base font-bold drop-shadow">
                    {banner1.judul}
                  </span>
                </div>
              )}
            </div>
          )}

        {/* Task Overdue Alert Section */}
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50/95 rounded-2xl p-4 border border-red-200/60 shadow-xs flex flex-col gap-3 relative overflow-hidden"
          >
            {/* Header with Icon and Badge count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 text-sm tracking-tight text-left">
                    Perhatian: Task Overdue!
                  </h4>
                  <p className="text-[10px] text-red-700/85 font-medium text-left">
                    Kamu memiliki {overdueTasks.length} tugas yang melewati
                    tenggat waktu
                  </p>
                </div>
              </div>
              <span className="bg-red-200 text-red-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 animate-pulse border border-red-300">
                LATE
              </span>
            </div>

            {/* List of Overdue Tasks */}
            <div className="space-y-2 mt-1">
              {overdueTasks.slice(0, 5).map((t, idx) => (
                <div
                  key={`overdue-${t.id}-${idx}`}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="bg-white hover:bg-red-50/40 border border-red-100 hover:border-red-300 p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] group text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-red-700 transition-colors">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium font-mono">
                      <span>Due:</span>
                      <span className="text-red-600 font-semibold">
                        {t.dueDate}
                      </span>
                    </div>
                  </div>

                  {/* Overdue Badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-extrabold rounded-md border border-red-100 uppercase whitespace-nowrap">
                      Lewat {t.daysOverdue} Hari
                    </span>
                    <span className="text-[9px] text-red-500 font-bold group-hover:underline mt-1 flex items-center gap-0.5 shrink-0">
                      Buka Task →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Card 2: Quick Actions */}
        <AnimatePresence>
          {showAll ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 space-y-6"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-lg">
                  Semua Layanan
                </h3>
                <button
                  onClick={() => setShowAll(false)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Group FAVORITE */}
              <div>
                <div className="flex flex-col mb-3">
                  <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">
                    Favorite
                  </h4>

                </div>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {favoriteActions.map((action, idx) => (
                    <div
                      key={`fav-${action.id}-${idx}`}
                      onClick={() => {
                        recordClick(action.id);
                        if (action.path) {
                          navigate(action.path);
                        } else {
                          setActiveFormAction(action);
                        }
                      }}
                      className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="relative">
                        <div
                          className={cn(
                            "flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80",
                            action.color,
                          )}
                        >
                          <action.icon className="w-8 h-8" />
                        </div>
                        {action.id === "daftar_belanja" &&
                          hasUnreadPesananList && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                          )}
                      </div>
                      <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                        {action.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group GENERAL */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                  General
                </h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {[
                    "6",
                    "1",
                    "3",
                    "10",
                    "11",
                    "7",
                    "8",
                    "9",
                    "daftar_issue",
                    "daftar_belanja",
                    "daftar_daily_report",
                  ]
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any, idx: number) => (
                      <div
                        key={`gen-${action.id}-${idx}`}
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150"
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80",
                            action.color,
                          )}
                        >
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                          {action.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Group UNIT */}
              <div>
                <h4 className="text-xs font-extrabold text-[#429dbb] uppercase tracking-wider mb-3 block">
                  Unit
                </h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {unitList.map((unit, idx) => (
                      <div
                        key={`unit-${unit.id}-${idx}`}
                        onClick={() => {
                          const existingAction = ALL_ACTIONS.find(a => a.path === `/units/${unit.id}`);
                          if (existingAction) {
                            recordClick(existingAction.id);
                          } else {
                            recordClick(`unit_${unit.id}`);
                          }
                          navigate(`/units/${unit.id}`);
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150 animate-fade-in"
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-center">
                          {unit.logo ? (
                            <img
                              src={unit.logo}
                              alt={unit.name}
                              className="w-12 h-12 object-cover rounded-[14px] shadow-sm border border-gray-100 hover:opacity-90 transition-opacity"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-[14px] shadow-sm border border-gray-100 bg-gray-100 flex items-center justify-center">
                               <Building2 className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight whitespace-normal max-w-full">
                          {unit.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Group FORM */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 block">
                  Form
                </h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {(() => {
                    const allowedRoles = ["RL01", "RL02", "RL03", "RL04", "RL05", "RL08"];
                    const activeRole = (
                      currentUserRole ||
                      userList.find((u) => u.email.toLowerCase() === currentUserEmail.toLowerCase())?.role ||
                      localStorage.getItem("mtask_user_role") ||
                      ""
                    ).trim().toUpperCase();
                    const isRoleAllowed = allowedRoles.includes(activeRole);
                    const showDrDok = isRoleAllowed;
                    const items = ["hq_form", "5", "12", "14", "13", "15", "add_issue", "lgh_daily_report"];
                    if (showDrDok) items.push("dr_dok");
                    return items;
                  })()
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any, idx: number) => (
                      <div
                        key={`form-${action.id}-${idx}`}
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150 animate-fade-in"
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80",
                            action.color,
                          )}
                        >
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight whitespace-normal max-w-full">
                          {action.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Group SYSTEM */}
              <div>
                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                  System
                </h4>
                <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                  {["16"]
                    .map((id) => ALL_ACTIONS.find((a) => a.id === id))
                    .filter(Boolean)
                    .map((action: any, idx: number) => (
                      <div
                        key={`sys-${action.id}-${idx}`}
                        onClick={() => {
                          recordClick(action.id);
                          if (action.path) {
                            navigate(action.path);
                          } else {
                            setActiveFormAction(action);
                          }
                        }}
                        className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 duration-150 font-sans"
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80",
                            action.color,
                          )}
                        >
                          <action.icon className="w-8 h-8" />
                        </div>
                        <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight font-sans">
                          {action.label}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100"
            >
              <div className="grid grid-cols-4 gap-y-6 gap-x-2 relative">
                {favoriteActions.map((action, idx) => (
                  <div
                    key={`${action.id}-${idx}`}
                    onClick={() => {
                      recordClick(action.id);
                      if (action.path) {
                        navigate(action.path);
                      } else {
                        setActiveFormAction(action);
                      }
                    }}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="relative">
                      <div
                        className={cn(
                          "flex items-center justify-center p-2 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80",
                          action.color,
                        )}
                      >
                        <action.icon className="w-7 h-7" />
                      </div>
                      {action.id === "daftar_belanja" &&
                        hasUnreadPesananList && (
                          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </div>
                    <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                      {action.label}
                    </span>
                  </div>
                ))}

                {/* 9th Action: Lihat Semua (Always bottom left position visually in a 3x3 or 4-col layout context) */}
                {currentUserRole !== "RL06" &&
                  currentUserRole !== "RL08" &&
                  currentUserEmail.toLowerCase() !== "prawinaputu@gmail.com" &&
                  currentUserEmail.toLowerCase() !== "pandusuryo69@gmail.com" &&
                  currentUserEmail.toLowerCase() !==
                    "thioyudisaputra@gmail.com" &&
                  currentUserEmail.toLowerCase() !== "vonyloselia@gmail.com" &&
                  currentUserEmail.toLowerCase() !==
                    "dewirahmawati776@gmail.com" && (
                    <div
                      onClick={() => setShowAll(true)}
                      className="flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-center p-2 text-gray-400 bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl">
                        <Grip className="w-7 h-7" />
                      </div>
                      <span className="text-[10px] font-semibold text-center text-gray-600 leading-tight">
                        Lihat Semua
                      </span>
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Slide Up Sheet for Form Action */}
        <AnimatePresence>
          {activeFormAction && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center px-4">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="bg-white rounded-t-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto mb-4"
              >
                <button
                  type="button"
                  onClick={() => setActiveFormAction(null)}
                  className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div
                    className={cn(
                      "p-3 rounded-2xl bg-gray-50",
                      activeFormAction.color,
                    )}
                  >
                    <activeFormAction.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {activeFormAction.id === "14"
                        ? "Daily Sales"
                        : activeFormAction.id === "13"
                          ? "Check In Lovissa Guest House"
                          : activeFormAction.id === "10"
                            ? "Activities Feed"
                            : activeFormAction.id === "add_issue"
                              ? "Add Issue"
                              : `Formulir ${activeFormAction.label}`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {activeFormAction.id === "14"
                        ? "Laporan Penjualan harian Chillhub Surabaya"
                        : activeFormAction.id === "13"
                          ? "Formulir Check In Tamu Lovissa Guest House"
                          : activeFormAction.id === "10"
                            ? "Daftar aktivitas terbaru di sistem"
                            : "Isi formulir dengan lengkap untuk mengirim data"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {activeFormAction.id === "10" && (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-2">
                      {loadingDashboardActivities ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <p className="text-sm font-medium text-gray-500">Memuat aktivitas...</p>
                        </div>
                      ) : errorDashboardActivities ? (
                        <div className="text-center py-8">
                          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">{errorDashboardActivities}</p>
                          <button 
                            type="button"
                            onClick={fetchDashboardActivities}
                            className="mt-3 text-blue-600 font-bold text-xs"
                          >
                            Coba Lagi
                          </button>
                        </div>
                      ) : dashboardActivities.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-sm italic">
                          Belum ada aktivitas terekam.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dashboardActivities.map((act) => {
                            const displayName = getUserDisplayName(act.user_email);
                            const avatarUrl = getUserAvatarUrl(act.user_email, displayName);
                            const target = resolveActivityTarget(act);
                            return (
                              <motion.div 
                                key={act.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => {
                                  setActiveFormAction(null);
                                  navigate(target.path);
                                }}
                                className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 flex flex-col gap-2.5 transition-all hover:bg-white hover:border-indigo-200 hover:shadow-md active:scale-[0.99] cursor-pointer group"
                              >
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={avatarUrl} 
                                    alt={displayName} 
                                    className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="font-bold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                                        {displayName}
                                      </h4>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-full whitespace-nowrap transition-colors">
                                          {target.badge || act.module}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 transform group-hover:translate-x-0.5 transition-transform" />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                      <Clock className="w-3 h-3" />
                                      <span>{new Date(act.created_at).toLocaleString('id-ID', { 
                                        day: '2-digit', 
                                        month: 'short', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-gray-700 leading-relaxed pl-[48px]">
                                  <span className="font-bold text-gray-900 uppercase text-[10px] tracking-wider block mb-0.5 opacity-60">
                                    {act.action_type}
                                  </span>
                                  {act.details}
                                </div>

                                <div className="pl-[48px] pt-0.5 flex justify-end">
                                  <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                                    Buka {target.label} →
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* REDESIGNED ADD_ISSUE FORM POPUP */}
                  {activeFormAction.id === "add_issue" && (
                    <div className="space-y-4 text-left">
                      {/* Unit Business Custom Dropdown Selector */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <div
                          type="button"
                          onClick={() => {
                            if (
                              currentUserRole !== "RL06" &&
                              currentUserRole !== "RL08"
                            ) {
                              setIsOpenIssueUnitDropdown(
                                !isOpenIssueUnitDropdown,
                              );
                            }
                          }}
                          className={cn(
                            "w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 font-semibold flex items-center justify-between",
                            currentUserRole === "RL06" ||
                              currentUserRole === "RL08"
                              ? "opacity-70 cursor-not-allowed"
                              : "cursor-pointer",
                          )}
                          role="button"
                          tabIndex={0}
                        >
                          {(() => {
                            const selectedUnit = unitList.find(
                              (u) => u.id === issueUnitId,
                            );
                            if (selectedUnit) {
                              return (
                                <div className="flex items-center gap-2.5">
                                  {selectedUnit.logo ? (
                                    <img
                                      src={selectedUnit.logo}
                                      alt={selectedUnit.name}
                                      className="w-5.5 h-5.5 rounded-full object-cover border border-gray-200 bg-white"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                      {selectedUnit.name
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <span>{selectedUnit.name}</span>
                                </div>
                              );
                            }
                            return (
                              <span className="text-gray-400 font-normal">
                                Pilih Unit Business...
                              </span>
                            );
                          })()}
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>

                        {isOpenIssueUnitDropdown && (
                          <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-150 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1 animate-fade-in">
                            {unitList.map((unit, idx) => (
                              <div
                                key={`${unit.id}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setIssueUnitId(unit.id);
                                  setIsOpenIssueUnitDropdown(false);
                                }}
                                className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 transition-colors flex items-center gap-2.5 font-semibold cursor-pointer"
                                role="button"
                                tabIndex={0}
                              >
                                {unit.logo ? (
                                  <img
                                    src={unit.logo}
                                    alt={unit.name}
                                    className="w-5.5 h-5.5 rounded-full object-cover border border-gray-200 bg-white"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                    {unit.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span>{unit.name}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    {unit.id}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Issue field -> keterangan */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Issue <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Tulis detail issue di sini..."
                          value={issueInfo}
                          onChange={(e) => setIssueInfo(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-sans text-gray-800"
                        />
                      </div>

                      {/* Dropdown Catatan 1 (Lampiran) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Lampiran <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={catatanType1}
                          onChange={(e) =>
                            setCatatanType1(e.target.value as any)
                          }
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-gray-700 font-sans font-semibold"
                        >
                          <option value="note">📝 Note (Catatan Teks)</option>
                          <option value="photo">
                            📸 Photo (Kamera Device)
                          </option>
                          <option value="file">📁 File (Upload Dokumen)</option>
                        </select>
                      </div>

                      {/* Catatan 1 UI Field rendering */}
                      {catatanType1 === "note" && (
                        <div className="animate-fade-in">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                            Catatan <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            required
                            rows={2}
                            placeholder="Tulis catatan di sini..."
                            value={catatanText1}
                            onChange={(e) => setCatatanText1(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-sans text-gray-800"
                          />
                        </div>
                      )}

                      {catatanType1 === "photo" && (
                        <div className="animate-fade-in">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                            Catatan (Foto){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-xl p-4 bg-gray-50/50 transition-all">
                            <input
                              type="file"
                              accept="image/*"
                              ref={catatanPhotoInputRef1}
                              className="hidden"
                              onChange={(e) => {
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  setCatatanPhoto1(e.target.files[0]);
                                }
                              }}
                            />
                            {!catatanPhoto1 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePhotoTarget(1);
                                  setShowIssueCameraModal(true);
                                }}
                                className="flex flex-col items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none cursor-pointer"
                              >
                                <Camera className="w-10 h-10 stroke-[1.5]" />
                                <span className="text-xs font-bold">
                                  Buka Kamera
                                </span>
                              </button>
                            ) : (
                              <div className="space-y-2 w-full">
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white max-h-40 flex items-center justify-center">
                                  <img
                                    src={URL.createObjectURL(catatanPhoto1)}
                                    alt="Preview"
                                    className="w-full max-h-36 object-contain"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setCatatanPhoto1(null)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-500 text-center truncate">
                                  {catatanPhoto1.name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {catatanType1 === "file" && (
                        <div className="animate-fade-in">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                            Catatan (File){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-xl p-4 bg-gray-50/50 transition-all">
                            <input
                              type="file"
                              ref={catatanFileInputRef1}
                              className="hidden"
                              onChange={(e) => {
                                if (
                                  e.target.files &&
                                  e.target.files.length > 0
                                ) {
                                  setCatatanFile1(e.target.files[0]);
                                }
                              }}
                            />
                            {!catatanFile1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  catatanFileInputRef1.current?.click()
                                }
                                className="flex flex-col items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors focus:outline-none cursor-pointer"
                              >
                                <FileIcon className="w-10 h-10 stroke-[1.5]" />
                                <span className="text-xs font-bold">
                                  Pilih Dokumen / File
                                </span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between w-full p-2 bg-white border rounded-lg shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span className="text-xs text-gray-600 truncate">
                                    {catatanFile1.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setCatatanFile1(null)}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold"
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Optional Catatan 2 Attachment Group */}
                      <div className="border-t border-gray-100 pt-3 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-extrabold text-[#429dbb] uppercase tracking-wider font-sans">
                            Lampiran Kedua (Opsional)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (catatanType2 === "None") {
                                setCatatanType2("note");
                              } else {
                                setCatatanType2("None");
                              }
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold focus:outline-none cursor-pointer"
                          >
                            {catatanType2 === "None"
                              ? "+ Aktifkan"
                              : "✕ Matikan"}
                          </button>
                        </div>

                        {catatanType2 !== "None" && (
                          <div className="space-y-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 font-sans">
                                Tipe Lampiran 2
                              </label>
                              <select
                                value={catatanType2}
                                onChange={(e) =>
                                  setCatatanType2(e.target.value as any)
                                }
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-gray-700 font-sans font-semibold"
                              >
                                <option value="note">
                                  📝 Note (Catatan Teks)
                                </option>
                                <option value="photo">
                                  📸 Photo (Kamera Device)
                                </option>
                                <option value="file">
                                  📁 File (Upload Dokumen)
                                </option>
                              </select>
                            </div>

                            {catatanType2 === "note" && (
                              <div className="animate-fade-in">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">
                                  Catatan 2 (Teks){" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  required
                                  rows={2}
                                  placeholder="Ketik catatan teks kedua..."
                                  value={catatanText2}
                                  onChange={(e) =>
                                    setCatatanText2(e.target.value)
                                  }
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-sans text-gray-800"
                                />
                              </div>
                            )}

                            {catatanType2 === "photo" && (
                              <div className="animate-fade-in">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">
                                  Catatan 2 (Foto){" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-3 bg-white transition-all">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    ref={catatanPhotoInputRef2}
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files &&
                                        e.target.files.length > 0
                                      ) {
                                        setCatatanPhoto2(e.target.files[0]);
                                      }
                                    }}
                                  />
                                  {!catatanPhoto2 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePhotoTarget(2);
                                        setShowIssueCameraModal(true);
                                      }}
                                      className="flex flex-col items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors focus:outline-none cursor-pointer"
                                    >
                                      <Camera className="w-8 h-8 stroke-[1.5]" />
                                      <span className="text-[11px] font-bold">
                                        Buka Kamera
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="space-y-2 w-full">
                                      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white max-h-36 flex items-center justify-center">
                                        <img
                                          src={URL.createObjectURL(
                                            catatanPhoto2,
                                          )}
                                          alt="Preview 2"
                                          className="w-full max-h-32 object-contain"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setCatatanPhoto2(null)}
                                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-[10px] text-gray-500 text-center truncate">
                                        {catatanPhoto2.name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {catatanType2 === "file" && (
                              <div className="animate-fade-in">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-sans">
                                  Catatan 2 (File){" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl p-3 bg-white transition-all">
                                  <input
                                    type="file"
                                    ref={catatanFileInputRef2}
                                    className="hidden"
                                    onChange={(e) => {
                                      if (
                                        e.target.files &&
                                        e.target.files.length > 0
                                      ) {
                                        setCatatanFile2(e.target.files[0]);
                                      }
                                    }}
                                  />
                                  {!catatanFile2 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        catatanFileInputRef2.current?.click()
                                      }
                                      className="flex flex-col items-center gap-1 text-blue-500 hover:text-blue-700 transition-colors focus:outline-none cursor-pointer"
                                    >
                                      <FileIcon className="w-8 h-8 stroke-[1.5]" />
                                      <span className="text-[11px] font-bold">
                                        Pilih Dokumen / File
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center justify-between w-full p-2 bg-white border rounded-lg shadow-sm">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <span className="text-[11px] text-gray-600 truncate">
                                          {catatanFile2.name}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setCatatanFile2(null)}
                                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FORM HQ */}
                  {activeFormAction.id === "hq_form" && (
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Activities
                        </label>
                        <input
                          type="text"
                          required
                          value={hqActivities}
                          onChange={(e) => setHqActivities(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            QTY
                          </label>
                          <input
                            type="number"
                            value={hqQty}
                            onChange={(e) => setHqQty(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Uom
                          </label>
                          <input
                            type="text"
                            value={hqUom}
                            onChange={(e) => setHqUom(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Price
                        </label>
                        <input
                          type="number"
                          value={hqPrice}
                          onChange={(e) => setHqPrice(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Amount
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={Number(hqQty || 0) * Number(hqPrice || 0)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500 font-sans cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Client
                        </label>
                        <input
                          type="text"
                          value={hqClient}
                          onChange={(e) => setHqClient(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Note
                        </label>
                        <textarea
                          rows={2}
                          value={hqNote}
                          onChange={(e) => setHqNote(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 font-sans">
                          Status
                        </label>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setHqStatus("Unpaid")}
                            className={cn(
                              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
                              hqStatus === "Unpaid"
                                ? "bg-white text-red-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700",
                            )}
                          >
                            Unpaid
                          </button>
                          <button
                            type="button"
                            onClick={() => setHqStatus("Paid")}
                            className={cn(
                              "flex-1 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
                              hqStatus === "Paid"
                                ? "bg-white text-emerald-600 shadow-sm"
                                : "text-gray-500 hover:text-gray-700",
                            )}
                          >
                            Paid
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Upload Photo / File
                        </label>

                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={hqFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setHqFile(e.target.files[0]);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                navigator.mediaDevices &&
                                navigator.mediaDevices.getUserMedia
                              ) {
                                setShowHqCameraModal(true);
                              } else {
                                hqFileInputRef.current?.click();
                              }
                            }}
                            className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Camera className="w-5 h-5 text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">
                              Kamera
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => hqFileInputRef.current?.click()}
                            className="flex-1 bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase">
                              Galeri/File
                            </span>
                          </button>
                        </div>

                        {hqFile && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                            {hqFile.type.startsWith("image/") ? (
                              <img
                                src={URL.createObjectURL(hqFile)}
                                alt="Preview"
                                className="w-16 h-16 object-cover rounded-xl border border-gray-200 bg-white"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-xs font-bold">
                                FILE
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {hqFile.name}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {(hqFile.size / 1024).toFixed(1)} KB
                              </p>
                              <button
                                type="button"
                                onClick={() => setHqFile(null)}
                                className="text-xs font-bold text-red-500 mt-1 cursor-pointer hover:underline block"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FORM BOGANATHA LAPS (id 15) */}
                  {activeFormAction.id === "15" && (
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Laporan / Aktivitas
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Tulis detail informasi di sini..."
                          value={formData.detail}
                          onChange={(e) =>
                            setFormData({ ...formData, detail: e.target.value })
                          }
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Kategori Aktivitas
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                        >
                          <option value="Operational">Operational</option>
                          <option value="Kebersihan">Kebersihan</option>
                          <option value="Keamanan">Keamanan</option>
                          <option value="Komplain">Komplain</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR ORDER BUDGET */}
                  {activeFormAction.id === "5" && (
                    <div className="space-y-4 text-left">
                      {/* Unit Business Custom Dropdown Selector */}
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Unit Business <span className="text-red-500">*</span>
                        </label>
                        <div
                          type="button"
                          onClick={() =>
                            setIsOpenUnitDropdown(!isOpenUnitDropdown)
                          }
                          className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 font-semibold flex items-center justify-between cursor-pointer"
                          role="button"
                          tabIndex={0}
                        >
                          {(() => {
                            const selectedUnit = unitList.find(
                              (u) => u.id === obUnitId,
                            );
                            if (selectedUnit) {
                              return (
                                <div className="flex items-center gap-2.5">
                                  {selectedUnit.logo ? (
                                    <img
                                      src={selectedUnit.logo}
                                      alt={selectedUnit.name}
                                      className="w-5.5 h-5.5 rounded-full object-cover border border-gray-200 bg-white"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                      {selectedUnit.name
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </div>
                                  )}
                                  <span>{selectedUnit.name}</span>
                                </div>
                              );
                            }
                            return (
                              <span className="text-gray-400 font-medium">
                                -- Pilih Unit Business --
                              </span>
                            );
                          })()}
                          <Grip className="w-4 h-4 text-gray-400 rotate-90" />
                        </div>

                        <AnimatePresence>
                          {isOpenUnitDropdown && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsOpenUnitDropdown(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1"
                              >
                                {unitList.map((unit, uIdx) => (
                                  <div
                                    key={`${unit.id}-${uIdx}`}
                                    type="button"
                                    onClick={() => {
                                      setObUnitId(unit.id);
                                      setIsOpenUnitDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 text-sm rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer hover:bg-gray-50",
                                      obUnitId === unit.id
                                        ? "bg-blue-50 text-blue-700 font-bold"
                                        : "text-gray-700",
                                    )}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {unit.logo ? (
                                      <img
                                        src={unit.logo}
                                        alt={unit.name}
                                        className="w-6 h-6 rounded-full object-cover border border-gray-200 bg-white shadow-sm shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {unit.name
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="leading-tight">
                                        {unit.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-medium font-mono">
                                        {unit.id}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Keperluan input mapping to Order Detail */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Keperluan <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Masukkan keperluan pengajuan"
                          value={obPurpose}
                          onChange={(e) => setObPurpose(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                        />
                      </div>

                      {/* Order type */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Order type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "Vendor",
                            "Tallent",
                            "Reimburse",
                            "Operational",
                          ].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setObOrderType(opt);
                                setObKepada("");
                                setObRekNo("");
                                setObAtasNama("");
                              }}
                              className={cn(
                                "py-2.5 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer",
                                obOrderType === opt
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50",
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Nota Belanja (Only for Reimburse or Operational) */}
                      {(obOrderType === "Reimburse" ||
                        obOrderType === "Operational") && (
                        <div className="mb-4">
                          <OrderBudgetNotaUploader
                            files={obNotaFiles}
                            onChangeFiles={setObNotaFiles}
                            disabled={formIsSubmitting}
                          />
                        </div>
                      )}

                      {/* Kepada */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Kepada <span className="text-red-500">*</span>
                          </label>
                          {obOrderType === "Vendor" && (
                            <button
                              type="button"
                              onClick={() => setShowAddVendorModal(true)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                              vendor
                            </button>
                          )}
                          {obOrderType === "Tallent" && (
                            <button
                              type="button"
                              onClick={() => setShowAddTallentModal(true)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                              tallent
                            </button>
                          )}
                        </div>
                        {obOrderType === "Vendor" ? (
                          <select
                            required
                            value={obKepada}
                            onChange={(e) => setObKepada(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          >
                            <option value="">Pilih Vendor</option>
                            {vendorList.map((v, i) => (
                              <option key={`vendor-${i}`} value={v.name}>
                                {v.name}
                              </option>
                            ))}
                          </select>
                        ) : obOrderType === "Tallent" ? (
                          <select
                            required
                            value={obKepada}
                            onChange={(e) => setObKepada(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          >
                            <option value="">Pilih Tallent</option>
                            {tallentList.map((t, i) => (
                              <option key={`tallent-${i}`} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        ) : obOrderType === "Reimburse" ? (
                          <select
                            required
                            value={obKepada}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              setObKepada(selectedName);
                              const foundUser = userList.find(u => (u.fullName || u.name) === selectedName);
                              if (foundUser) {
                                const rekStr = (foundUser.rek || "");
                                setObRekNo(rekStr);
                                setObAtasNama(foundUser.fullName || foundUser.name || "");
                                
                                const upRek = rekStr.toUpperCase();
                                if (upRek.includes("BCA")) setObBank("BCA");
                                else if (upRek.includes("MANDIRI")) setObBank("Mandiri");
                                else if (upRek.includes("BRI")) setObBank("BRI");
                                else if (upRek.includes("BNI")) setObBank("BNI 46");
                                else if (upRek.includes("JAGO")) setObBank("JAGO");
                              } else {
                                setObRekNo("");
                                setObAtasNama("");
                              }
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          >
                            <option value="">Pilih User</option>
                            {userList
                              .filter(u => String(u.id).toLowerCase() !== "xxx" && String(u.avail).toUpperCase() === "TRUE")
                              .map((u, i) => {
                                const displayName = u.fullName || u.name;
                                return (
                                  <option key={`reimburse-${i}`} value={displayName}>
                                    {displayName}
                                  </option>
                                );
                              })}
                          </select>
                        ) : (
                          <input
                            required
                            type="text"
                            placeholder="Masukkan nama penerima / Kepada"
                            value={obKepada}
                            onChange={(e) => setObKepada(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        )}
                      </div>

                      {/* Amount Input */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          Nilai (Amount) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-gray-500">
                            Rp
                          </span>
                          <input
                            required
                            type="number"
                            value={obAmount}
                            onChange={(e) => setObAmount(e.target.value)}
                            placeholder="Contoh: 500000"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* VIA Pembayaran Selector */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                          VIA Pembayaran <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "Transfer",
                            "Cash",
                            "Qris",
                            "Ewallet",
                            "Virtual Akun",
                          ].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setObVia(opt);
                                // Reset suboptions
                                setObBank("");
                                if (obOrderType === "Reimburse" && obKepada && opt === "Transfer") {
                                  const foundUser = userList.find(u => (u.fullName || u.name) === obKepada);
                                  if (foundUser) {
                                    const rekStr = (foundUser.rek || "");
                                    setObRekNo(rekStr);
                                    setObAtasNama(foundUser.fullName || foundUser.name || "");
                                    const upRek = rekStr.toUpperCase();
                                    if (upRek.includes("BCA")) setObBank("BCA");
                                    else if (upRek.includes("MANDIRI")) setObBank("Mandiri");
                                    else if (upRek.includes("BRI")) setObBank("BRI");
                                    else if (upRek.includes("BNI")) setObBank("BNI 46");
                                    else if (upRek.includes("JAGO")) setObBank("JAGO");
                                  } else {
                                    setObRekNo("");
                                    setObAtasNama("");
                                  }
                                } else {
                                  setObRekNo("");
                                  setObAtasNama("");
                                }
                                setObBerita("");
                                setObNote("");
                                setObQrisFile(null);
                                setObEwalletName("");
                                setObEwalletNo("");
                                setObVirtualNo("");
                              }}
                              className={cn(
                                "py-2.5 px-2 text-[11px] font-bold rounded-xl border transition-all text-center cursor-pointer",
                                obVia === opt
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                  : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50",
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* VIA Sub Options */}
                      {obVia === "Transfer" && (
                        <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Pilih Bank <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                {
                                  name: "BCA",
                                  logo: "https://i.ibb.co.com/1YDFDCVJ/bca.png",
                                },
                                {
                                  name: "Mandiri",
                                  logo: "https://i.ibb.co.com/sJsJ7tZZ/mandiri.png",
                                },
                                {
                                  name: "BRI",
                                  logo: "https://i.ibb.co.com/293FsVJ/bri.png",
                                },
                                {
                                  name: "BNI 46",
                                  logo: "https://i.ibb.co.com/YFXND4Xd/bni.png",
                                },
                                {
                                  name: "JAGO",
                                  logo: "https://i.ibb.co.com/jkmnFMY0/jago.png",
                                },
                              ].map((b) => (
                                <button
                                  key={b.name}
                                  type="button"
                                  onClick={() => {
                                    setObBank(b.name);
                                    if (obOrderType === "Reimburse" && obKepada) {
                                      const foundUser = userList.find(u => (u.fullName || u.name) === obKepada);
                                      if (foundUser) {
                                        setObRekNo(foundUser.rek || "");
                                        setObAtasNama(foundUser.fullName || foundUser.name || "");
                                      }
                                    }
                                  }}
                                  className={cn(
                                    "p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left",
                                    obBank === b.name
                                      ? "border-blue-500 bg-blue-50/50 text-blue-700 font-bold"
                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                  )}
                                >
                                  <img
                                    src={b.logo}
                                    alt={b.name}
                                    className="w-5 h-5 object-contain rounded shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-xs">{b.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {obBank && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  No. Rekening{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={obRekNo}
                                  onChange={(e) => setObRekNo(e.target.value)}
                                  required
                                  placeholder="Masukkan nomor rekening"
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Atas Nama (A/N){" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={obAtasNama}
                                  onChange={(e) =>
                                    setObAtasNama(e.target.value)
                                  }
                                  required
                                  placeholder="Pemilik rekening"
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                  Berita Transfer
                                </label>
                                <input
                                  type="text"
                                  value={obBerita}
                                  onChange={(e) => setObBerita(e.target.value)}
                                  placeholder="Contoh: Pembayaran talent..."
                                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {obVia === "Cash" && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Catatan Pembayaran Cash{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={obNote}
                            onChange={(e) => setObNote(e.target.value)}
                            required
                            placeholder="Masukkan catatan / detail keperluan cash..."
                            rows={3}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-sans"
                          />
                        </div>
                      )}

                      {obVia === "Qris" && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex flex-col gap-3">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Upload QRIS / Nota QR{" "}
                            <span className="text-red-500">*</span>
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            ref={obFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setObQrisFile(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />

                          <div
                            onClick={() => obFileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-xl p-4 cursor-pointer bg-white hover:bg-gray-50 transition relative overflow-hidden"
                          >
                            {obQrisFile ? (
                              <div className="text-center">
                                <img
                                  src={URL.createObjectURL(obQrisFile)}
                                  alt="QRIS preview"
                                  className="w-full h-auto max-h-32 object-contain rounded-lg mx-auto mb-2"
                                />
                                <p className="text-xs font-semibold text-gray-900 truncate max-w-[200px]">
                                  {obQrisFile.name}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Ketuk untuk mengganti
                                </p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                                <p className="text-sm text-gray-600 font-bold">
                                  Pilih Foto QRIS
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Upload image file QRIS
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {obVia === "Ewallet" && (
                        <div className="space-y-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                              Pilih E-Wallet{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                {
                                  name: "Dana",
                                  logo: "https://i.ibb.co.com/zTTkGxx5/Dana.png",
                                },
                                {
                                  name: "GoPay",
                                  logo: "https://i.ibb.co.com/YFzq1Mfn/gopay.png",
                                },
                                {
                                  name: "ShopeePay",
                                  logo: "https://i.ibb.co.com/fdc2wYYR/shoppe.png",
                                },
                              ].map((ew) => (
                                <button
                                  key={ew.name}
                                  type="button"
                                  onClick={() => setObEwalletName(ew.name)}
                                  className={cn(
                                    "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer text-center",
                                    obEwalletName === ew.name
                                      ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
                                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                  )}
                                >
                                  <img
                                    src={ew.logo}
                                    alt={ew.name}
                                    className="w-5 h-5 object-contain rounded"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-[9px] font-semibold">
                                    {ew.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {obEwalletName && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                Nomor E-Wallet / HP{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={obEwalletNo}
                                onChange={(e) => setObEwalletNo(e.target.value)}
                                required
                                placeholder="Contoh: 0812xxxxxxxx"
                                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {obVia === "Virtual Akun" && (
                        <div className="p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Nomor Virtual Account (VA){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={obVirtualNo}
                            onChange={(e) => setObVirtualNo(e.target.value)}
                            required
                            placeholder="Masukkan nomor VA lengkap"
                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* FIELDS FOR LION PARCEL */}
                  {activeFormAction.id === "12" && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Nomor Resi
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Masukkan nomor resi..."
                          value={lpNoResi}
                          onChange={(e) => setLpNoResi(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-semibold text-gray-700 font-sans">
                            Nama Pengirim
                          </label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setShowMemberDropdown(!showMemberDropdown)
                              }
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              Member{" "}
                              <ChevronDown className="w-3.5 h-3.5 ml-1" />
                            </button>
                            {showMemberDropdown && (
                              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowMemberDropdown(false)}
                                />
                                <div className="relative z-50 bg-white">
                                  {memberList.map((m, i) => (
                                    <button
                                      key={`member-${i}`}
                                      type="button"
                                      onClick={() => {
                                        setLpNamaPengirim(m.name);
                                        setShowMemberDropdown(false);
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      {m.name}
                                    </button>
                                  ))}
                                  {memberList.length === 0 && (
                                    <div className="px-4 py-2 text-sm text-gray-400">
                                      Tidak ada member
                                    </div>
                                  )}
                                  <div className="border-t border-gray-100 my-1"></div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowMemberDropdown(false);
                                      setShowAddMemberModal(true);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 flex items-center"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                                    Member
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <input
                          required
                          type="text"
                          placeholder="Nama pengirim..."
                          value={lpNamaPengirim}
                          onChange={(e) => setLpNamaPengirim(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                        {memberList.some((m) => m.name === lpNamaPengirim) && (
                          <p className="mt-1.5 text-xs font-semibold text-gray-500">
                            Sisa poin{" "}
                            <span className="text-blue-600 ml-1">
                              {memberList.find((m) => m.name === lpNamaPengirim)
                                ?.poin || 0}
                            </span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Tujuan
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Alamat / Kota tujuan..."
                          value={lpTujuan}
                          onChange={(e) => setLpTujuan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Layanan
                        </label>
                        <select
                          required
                          value={lpLayanan}
                          onChange={(e) => setLpLayanan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                        >
                          <option value="">-- Pilih Layanan --</option>
                          <option value="VIPPACK">VIPPACK</option>
                          <option value="BOSSPACK">BOSSPACK</option>
                          <option value="MINIPACK">MINIPACK</option>
                          <option value="REGPACK">REGPACK</option>
                          <option value="JAGOPACK">JAGOPACK</option>
                          <option value="BIG/JUMBOPACK">BIG/JUMBOPACK</option>
                          <option value="INTERPACK">INTERPACK</option>
                          <option value="OTOPACK">OTOPACK</option>
                          <option value="PASTI">PASTI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Payment
                        </label>
                        <select
                          required
                          value={lpCaraPembayaran}
                          onChange={(e) => setLpCaraPembayaran(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                        >
                          <option value="">-- Pilih Cara Pembayaran --</option>
                          <option value="Transfer">Transfer</option>
                          <option value="Cash">Cash</option>
                          <option value="QRIS">QRIS</option>
                          <option value="DFOD">DFOD</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Berat (Kg)
                          </label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="Contoh: 1.5"
                            value={lpBerat}
                            onChange={(e) => setLpBerat(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Tarif Masuk (Rp)
                          </label>
                          <input
                            required
                            type="number"
                            placeholder="Contoh: 15000"
                            value={lpTarifStr}
                            onChange={(e) => setLpTarifStr(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowDiskonModal(true)}
                            className="block text-sm font-semibold text-blue-600 hover:text-blue-800 underline mb-1 font-sans cursor-pointer text-left"
                          >
                            Diskon Kode
                          </button>
                          <input
                            type="text"
                            readOnly
                            placeholder="..."
                            value={lpDiskonKode}
                            onClick={() => setShowDiskonModal(true)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans cursor-pointer"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowTukarPoinModal(true)}
                            className="block text-sm font-semibold text-blue-600 hover:text-blue-800 underline mb-1 font-sans cursor-pointer text-left"
                          >
                            Tukar Poin
                          </button>
                          <input
                            type="number"
                            readOnly
                            placeholder="..."
                            value={lpTukarPoin}
                            onClick={() => setShowTukarPoinModal(true)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Total Biaya
                        </label>
                        <input
                          required
                          type="number"
                          readOnly
                          placeholder="Hasil akhir..."
                          value={lpTotalBiaya}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Jenis Barang
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Pakaian, dokumen, dll..."
                          value={lpJenisBarang}
                          onChange={(e) => setLpJenisBarang(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Keterangan
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Keterangan tambahan..."
                          value={lpKeterangan}
                          onChange={(e) => setLpKeterangan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>
                      {memberList.some((m) => m.name === lpNamaPengirim) && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Poin
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={
                              lpTarifStr
                                ? (Math.floor(parseInt(lpTarifStr) / 1000) *
                                    5) /
                                  5
                                : 0
                            }
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-600 focus:outline-none font-sans"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Bukti Bayar (Upload/Ambil Foto)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          ref={lpFileInputRef}
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setLpBuktiBayarFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLpCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-400 rounded-xl py-3 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer transition-all bg-white"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => lpFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {lpBuktiBayarFiles && lpBuktiBayarFiles.length > 0 && (
                          <div className="mt-3 flex flex-col gap-2">
                            {lpBuktiBayarFiles.map((file, idx) => (
                              <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Bukti bayar ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded-xl border border-gray-200 bg-white"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setLpBuktiBayarFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-xs font-bold text-red-500 mt-1 cursor-pointer block hover:underline"
                                  >
                                    Hapus Foto
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* FIELDS FOR CHILLHUB */}
                  {activeFormAction.id === "14" && (
                    <div className="space-y-4 text-left">
                      {/* Hidden File Input for Chillhub Nota */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={chFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setChNotaFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Amount (Price) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-gray-500">
                            Rp
                          </span>
                          <input
                            required
                            type="number"
                            placeholder="Masukkan nominal harga"
                            value={chAmount}
                            onChange={(e) => setChAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">
                          Nota <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowChCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-3 px-3 text-xs font-bold shadow-md shadow-blue-500/10 cursor-pointer transition-all hover:-translate-y-0.5 active:translate-y-0 duration-150"
                          >
                            <Camera className="w-4 h-4 text-white" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => chFileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-3 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {chNotaFile && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                            <img
                              src={URL.createObjectURL(chNotaFile)}
                              alt="Nota preview"
                              className="w-16 h-16 object-cover rounded-xl border border-gray-200 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {chNotaFile.name}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {(chNotaFile.size / 1024).toFixed(1)} KB
                              </p>
                              <button
                                type="button"
                                onClick={() => setChNotaFile(null)}
                                className="text-xs font-bold text-red-500 mt-1 cursor-pointer block hover:underline"
                              >
                                Hapus Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR DAILY REPORT DOK */}
                  {activeFormAction.id === "dr_dok" && (
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Report <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          placeholder="Tuliskan report hari ini..."
                          value={drReport}
                          onChange={(e) => setDrReport(e.target.value)}
                          rows={3}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Diskusi Laporan
                        </label>
                        <textarea
                          placeholder="Tuliskan catatan diskusi (opsional)..."
                          value={drDiscussion}
                          onChange={(e) => setDrDiscussion(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        />
                      </div>

                      <div className="mb-4">
                        <OrderBudgetNotaUploader
                          files={drFiles}
                          onChangeFiles={setDrFiles}
                          disabled={formIsSubmitting}
                          label="Lampiran"
                        />
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR LGH CHECK IN */}
                  {activeFormAction.id === "13" && (
                    <div className="space-y-4 text-left">
                      {/* Hidden File Inputs */}
                      <input
                        type="file"
                        accept="image/*"
                        ref={lghPhotoIdInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setLghPhotoIdFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={lghBuktiBayarInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setLghBuktiBayarFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {/* Guest Name & Contact auto-suggest */}
                      <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Nama Tamu <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            required
                            type="text"
                            placeholder="Ketik nama tamu..."
                            value={lghGuestName}
                            onChange={(e) => {
                              setLghGuestName(e.target.value);
                              setShowLghContactDropdown(true);
                            }}
                            onFocus={() => setShowLghContactDropdown(true)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                          {lghGuestName && (
                            <button
                              type="button"
                              onClick={() => {
                                setLghGuestName("");
                                setShowLghContactDropdown(false);
                              }}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {showLghContactDropdown && contacts.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            <div className="p-2 border-b border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                Pilih dari Kontak Terdaftar
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowLghContactDropdown(false)}
                                className="text-[10px] text-gray-400 hover:text-gray-600"
                              >
                                Tutup
                              </button>
                            </div>
                            {contacts
                              .filter((c) =>
                                !lghGuestName ||
                                c.name.toLowerCase().includes(lghGuestName.toLowerCase()) ||
                                c.id.toLowerCase().includes(lghGuestName.toLowerCase())
                              )
                              .slice(0, 8)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setLghGuestName(c.name);
                                    if (c.phone) setLghPhone(c.phone);
                                    if (c.email) setLghEmail(c.email);
                                    setShowLghContactDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                  <span className="font-semibold text-gray-800">{c.name}</span>
                                  <span className="text-[10px] text-gray-400">{c.type || c.id}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* No ID / KTP */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          No. Identitas / KTP
                        </label>
                        <input
                          type="text"
                          placeholder="Nomor KTP / Paspor / SIM"
                          value={lghNoId}
                          onChange={(e) => setLghNoId(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                      </div>

                      {/* Phone & Email */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            No. WhatsApp / HP
                          </label>
                          <input
                            type="tel"
                            placeholder="0812..."
                            value={lghPhone}
                            onChange={(e) => setLghPhone(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="email@tamu.com"
                            value={lghEmail}
                            onChange={(e) => setLghEmail(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* Room & Payment Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Kamar / Room <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={lghRoom}
                            onChange={(e) => setLghRoom(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                              <option key={num} value={`Room ${num}`}>
                                Room {num}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Metode Pembayaran
                          </label>
                          <select
                            value={lghPayment}
                            onChange={(e) => setLghPayment(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                          >
                            <option value="Transfer">Transfer Bank</option>
                            <option value="Cash">Cash / Tunai</option>
                            <option value="QRIS">QRIS</option>
                            <option value="Debit">Kartu Debit / EDC</option>
                          </select>
                        </div>
                      </div>

                      {/* Dates: Check In & Check Out */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Check In <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={lghCheckIn}
                            onChange={(e) => setLghCheckIn(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Check Out <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="date"
                            value={lghCheckOut}
                            onChange={(e) => setLghCheckOut(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                      </div>

                      {/* Duration & Type */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Durasi
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={lghDur}
                            onChange={(e) => setLghDur(parseInt(e.target.value) || 1)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Tipe Durasi
                          </label>
                          <select
                            value={lghType}
                            onChange={(e) => setLghType(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-sans"
                          >
                            <option value="Malam">Malam</option>
                            <option value="Hari">Hari</option>
                            <option value="Minggu">Minggu</option>
                            <option value="Bulan">Bulan</option>
                          </select>
                        </div>
                      </div>

                      {/* Price per night & Total Amount */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Tarif / Malam (Rp)
                          </label>
                          <input
                            type="number"
                            value={lghPrice}
                            onChange={(e) => setLghPrice(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                            Total Bayar (Rp)
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={`Rp ${Number(lghAmount || 0).toLocaleString("id-ID")}`}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-700 focus:outline-none font-sans cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Upload Foto KTP */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Foto KTP / Identitas
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLghPhotoCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-400 rounded-xl py-2.5 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer transition-all bg-white"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => lghPhotoIdInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {lghPhotoIdFile && (
                          <div className="mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                            <img
                              src={URL.createObjectURL(lghPhotoIdFile)}
                              alt="KTP preview"
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {lghPhotoIdFile.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => setLghPhotoIdFile(null)}
                                className="text-xs font-bold text-red-500 cursor-pointer block hover:underline"
                              >
                                Hapus Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Upload Bukti Transfer */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Bukti Bayar / Transfer
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowLghBuktiCameraModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 border border-blue-200 hover:border-blue-400 rounded-xl py-2.5 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer transition-all bg-white"
                          >
                            <Camera className="w-4 h-4 text-blue-500" />
                            Ambil Foto Kamera
                          </button>
                          <button
                            type="button"
                            onClick={() => lghBuktiBayarInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-all bg-white"
                          >
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            Pilih File Galeri
                          </button>
                        </div>
                        {lghBuktiBayarFile && (
                          <div className="mt-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                            <img
                              src={URL.createObjectURL(lghBuktiBayarFile)}
                              alt="Bukti preview"
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {lghBuktiBayarFile.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => setLghBuktiBayarFile(null)}
                                className="text-xs font-bold text-red-500 cursor-pointer block hover:underline"
                              >
                                Hapus Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Catatan / Keterangan */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                          Catatan / Keterangan
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Tambahkan catatan khusus bila ada..."
                          value={lghKeterangan}
                          onChange={(e) => setLghKeterangan(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* FIELDS FOR BOGANATHA ADDRESS */}
                  {activeFormAction.id === "15" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1 font-sans">
                        Lokasi Laporan / Area
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Contoh: Toilet Lantai Dasar / Lobi Utama"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                      />
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  {activeFormAction.id !== "daftar_issue" && (
                    <button
                      type="submit"
                      disabled={
                        formIsSubmitting ||
                        (activeFormAction.id === "order_budget" &&
                          (!obOrderType ||
                            !obKepada ||
                            !obAmount ||
                            !obVia ||
                            ((obOrderType === "Reimburse" ||
                              obOrderType === "Operational") &&
                              obNotaFiles.length === 0) ||
                            (obVia === "Transfer" &&
                              (!obBank || !obRekNo || !obAtasNama)) ||
                            (obVia === "Cash" && !obNote) ||
                            (obVia === "Qris" && !obQrisFile) ||
                            (obVia === "Ewallet" &&
                              (!obEwalletName || !obEwalletNo)) ||
                            (obVia === "Virtual Akun" && !obVirtualNo)))
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer font-sans"
                    >
                      {formIsSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Mengirim Formulir...</span>
                        </>
                      ) : (
                        <span>Kirim Formulir</span>
                      )}
                    </button>
                  )}
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* News Feed (Vertical Stack) */}
        <div
          onClick={() => setShowNewsModal(true)}
          className="bg-white border text-white border-blue-100 rounded-2xl p-4 flex flex-col overflow-hidden shadow-sm relative cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-95 rounded-2xl"></div>
          <div className="relative z-10 w-full flex flex-col space-y-3">
            <div className="flex items-center text-white/90 mb-1 border-b border-white/20 pb-2">
              <Bell className="w-5 h-5 mr-2" />
              <span className="font-bold text-sm tracking-wide">
                Pembaruan Aktivitas
              </span>
            </div>

            {tickerNews.slice(0, 3).map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-start text-xs bg-white/10 rounded-xl p-2 md:p-3 backdrop-blur-sm relative"
              >
                <div className="flex-1 pr-12">
                  {item.category && item.category !== 'Activity' && (
                    <div className="text-[9px] text-blue-200 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <span>{item.targetBadge || item.category}</span>
                    </div>
                  )}
                  <div className="font-medium text-white/90">{item.text}</div>
                </div>
                <div className="absolute top-3 right-3 text-[10px] text-white/50 font-medium">
                  {item.timeStr}
                </div>
              </div>
            ))}

            {tickerNews.length > 3 && (
              <div className="text-center text-xs text-white/70 font-semibold mt-1">
                Lihat semua log aktivitas...
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showNewsModal && (
            <div className="fixed inset-0 z-[110] flex flex-col justify-end md:justify-center md:items-center bg-black/40 backdrop-blur-sm p-0 md:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
                onClick={() => setShowNewsModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: "100%", scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: "100%", scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full md:max-w-md overflow-hidden flex flex-col h-[75vh] md:h-auto md:max-h-[85vh]"
              >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Log Pembaruan
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowNewsModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto min-h-0 flex-1 bg-gray-50/50">
                  <div className="space-y-6">
                    {["Hari ini", "Kemarin"].map((dateGroup) => {
                      const groupItems = tickerNews.filter(
                        (n) => n.dateStr === dateGroup,
                      );
                      if (groupItems.length === 0) return null;

                      return (
                        <div key={dateGroup}>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                            {dateGroup}
                          </h4>
                          <div className="space-y-3">
                            {groupItems.map((item, idx) => (
                              <div
                                key={`${item.id}-${idx}`}
                                className="bg-white border border-gray-100 shadow-xs p-4 rounded-2xl flex flex-col relative transition-all"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors">
                                    {item.targetBadge || item.category}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>{item.timeStr}</span>
                                  </div>
                                </div>
                                <span className="text-xs font-medium text-gray-800 leading-relaxed">
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Card 4: Banner 2 (Horizontal Scroll) */}
        {banner2List.filter(
          (item) =>
            item && typeof item.image === "string" && item.image.trim() !== "",
        ).length > 0 ? (
          <div className="bg-transparent -mx-4 px-4 overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-3 w-max">
              {banner2List
                .filter(
                  (item) =>
                    item &&
                    typeof item.image === "string" &&
                    item.image.trim() !== "",
                )
                .map((item, i) => (
                  <div
                    key={`banner-2-item-${i}`}
                    onClick={() => handleBannerClick(item.linkTo)}
                    className={cn(
                      "bg-white rounded-xl shadow-sm w-[280px] h-28 flex-shrink-0 border border-gray-100 overflow-hidden relative active:scale-[0.98] transition-transform",
                      item.linkTo && item.linkTo.trim() !== ""
                        ? "cursor-pointer"
                        : "",
                    )}
                  >
                    <img
                      src={item.image}
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                      <span className="text-white text-sm font-medium">
                        {item.judul || `Promo Insight ${i + 1}`}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-transparent -mx-4 px-4 overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-3 w-max">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`promo-insight-${i}`}
                  className="bg-white rounded-xl shadow-sm w-[280px] h-28 flex-shrink-0 border border-gray-100 overflow-hidden relative"
                >
                  <img
                    src={`https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=2670&auto=format&fit=crop&sig=${i + 10}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                    <span className="text-white text-sm font-medium">
                      Promo Insight {i}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card 5: Banner Carousel (Moved to bottom) */}
        <BannerCarousel items={banner3List} onItemClick={handleBannerClick} />
      </div>
      {/* Pop up Warga Masuk (Lock Screen) */}
      <AnimatePresence>
        {showMasukPopup && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative"
            >
              <div className="bg-[#409ebb] p-8 text-center text-white">
                <div className="mx-auto flex justify-center mb-4">
                  <img
                    src="https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20M-TASK.png"
                    alt="Logo"
                    className="w-24 h-auto drop-shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  M Task by KTA
                </h2>
              </div>

              <div className="p-7 flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    User
                  </label>
                  <div className="relative">
                    <div
                      className="w-full border-2 border-slate-200 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors bg-slate-50"
                      onClick={() =>
                        setIsWargaDropdownOpen(!isWargaDropdownOpen)
                      }
                    >
                      {selectedUserObj ? (
                        <div className="flex items-center gap-3">
                          {selectedUserObj.avatar ? (
                            <img
                              src={selectedUserObj.avatar}
                              alt={selectedUserObj.name}
                              className="w-9 h-9 rounded-full object-cover shadow-sm bg-white"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                              <UserPlus className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <span className="font-semibold text-slate-800 tracking-tight">
                            {selectedUserObj.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          -- Pilih User --
                        </span>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 transition-transform ${isWargaDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </div>

                    <AnimatePresence>
                      {isWargaDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-50"
                        >
                          {userList
                            .filter(
                              (u) =>
                                u.id?.toUpperCase() !== "XXX" &&
                                u.avail?.toUpperCase() !== "CNT",
                            )
                            .map((u, i) => (
                              <div
                                key={`${u.email}-${i}`}
                                className="p-3 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors"
                                onClick={() => {
                                  setSelectedWargaEmail(u.email);
                                  setIsWargaDropdownOpen(false);
                                  setWargaPin(""); // Reset pin on user switch
                                }}
                              >
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt={u.name}
                                    className="w-9 h-9 rounded-full object-cover shadow-sm bg-white"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shadow-sm">
                                    <Users className="w-4 h-4 text-slate-400" />
                                  </div>
                                )}
                                <span className="font-semibold text-slate-800 text-sm tracking-tight">
                                  {u.name}
                                </span>
                              </div>
                            ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={wargaPin}
                    onChange={(e) => setWargaPin(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-xl font-black tracking-[0.25em] text-center focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 bg-slate-50 transition-all font-mono placeholder:tracking-normal placeholder:font-medium placeholder:text-base placeholder:text-slate-300"
                    placeholder="Masukkan Password"
                    maxLength={10}
                  />
                </div>

                <button
                  onClick={handleMasukWarga}
                  disabled={
                    !selectedUserObj ||
                    wargaPin !== selectedUserObj.pin ||
                    isUpdatingMasuk
                  }
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isUpdatingMasuk ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Sedang
                      Memverifikasi...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Tambah Contact Modal */}
      <AnimatePresence>
        {(showAddVendorModal || showAddTallentModal || showAddMemberModal) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                if (!isSubmittingContact) {
                  setShowAddVendorModal(false);
                  setShowAddTallentModal(false);
                  setShowAddMemberModal(false);
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-lg font-bold text-gray-900">
                  Tambah{" "}
                  {showAddVendorModal
                    ? "Vendor"
                    : showAddMemberModal
                      ? "Member"
                      : "Tallent"}{" "}
                  Baru
                </h3>
                <button
                  onClick={() => {
                    setShowAddVendorModal(false);
                    setShowAddTallentModal(false);
                    setShowAddMemberModal(false);
                  }}
                  disabled={isSubmittingContact}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto min-h-0 custom-scrollbar">
                <form
                  id="addContactForm"
                  onSubmit={(e) =>
                    handleAddContact(
                      e,
                      showAddVendorModal
                        ? "Vendor"
                        : showAddMemberModal
                          ? "Member"
                          : "Tallent",
                    )
                  }
                  className="space-y-4"
                >
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Nama <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={`Masukkan nama ${showAddVendorModal ? "vendor" : showAddMemberModal ? "member" : "tallent"}`}
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder={`Email ${showAddVendorModal ? "vendor" : showAddMemberModal ? "member" : "tallent"}`}
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Phone
                    </label>
                    <input
                      type="tel"
                      placeholder={`Nomor telepon ${showAddVendorModal ? "vendor" : showAddMemberModal ? "member" : "tallent"}`}
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans"
                    />
                  </div>

                  {/* Usecase */}
                  {!showAddMemberModal && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Usecase <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder={`Usecase (misal: ${showAddVendorModal ? "Vendor Transport" : "Actor"})`}
                        value={newContactUsecase}
                        onChange={(e) => setNewContactUsecase(e.target.value)}
                        disabled={isSubmittingContact}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans"
                      />
                    </div>
                  )}

                  {/* Alamat */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Alamat
                    </label>
                    <textarea
                      placeholder={`Alamat lengkap ${showAddVendorModal ? "vendor" : showAddMemberModal ? "member" : "tallent"}`}
                      value={newContactAddress}
                      onChange={(e) => setNewContactAddress(e.target.value)}
                      disabled={isSubmittingContact}
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans resize-none"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Website{" "}
                      <span className="text-gray-400 normal-case font-normal">
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newContactWebsite}
                      onChange={(e) => setNewContactWebsite(e.target.value)}
                      disabled={isSubmittingContact}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 font-sans"
                    />
                  </div>
                </form>
              </div>

              <div className="p-5 border-t border-gray-100 bg-white shrink-0 mt-auto">
                <button
                  type="submit"
                  form="addContactForm"
                  disabled={
                    isSubmittingContact ||
                    !newContactName ||
                    (!showAddMemberModal && !newContactUsecase)
                  }
                  className="w-full bg-blue-600 text-white font-bold rounded-xl py-3.5 shadow-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-sans"
                >
                  {isSubmittingContact ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Tambah{" "}
                      {showAddVendorModal
                        ? "Vendor"
                        : showAddMemberModal
                          ? "Member"
                          : "Tallent"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiskonModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDiskonModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Masukkan Diskon Kode
                </h3>
                <button
                  onClick={() => setShowDiskonModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <input
                  type="text"
                  value={lpDiskonKodeInput}
                  onChange={(e) => setLpDiskonKodeInput(e.target.value)}
                  placeholder="Kode Diskon..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans uppercase"
                />
                <button
                  onClick={() => {
                    const validReward = rewardList.find(
                      (r) =>
                        r.kode.toUpperCase() ===
                        lpDiskonKodeInput.trim().toUpperCase(),
                    );
                    if (validReward) {
                      setLpDiskonKode(validReward.nilai.toString());
                      setShowDiskonModal(false);
                    } else {
                      alert("Kode tidak ditemukan atau tidak aktif");
                    }
                  }}
                  className="w-full mt-4 bg-blue-600 text-white font-bold rounded-xl py-3.5 hover:bg-blue-700 transition"
                >
                  Gunakan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showTukarPoinModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowTukarPoinModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Tukar Poin</h3>
                <button
                  onClick={() => setShowTukarPoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <span className="text-sm font-semibold text-blue-900">
                    Sisa Poin
                  </span>
                  <span className="text-xl font-black text-blue-600">
                    {memberList.find((m) => m.name === lpNamaPengirim)?.poin ||
                      0}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Jumlah Poin yang ditukar
                  </label>
                  <input
                    type="number"
                    value={lpTukarPoinInput}
                    onChange={(e) => {
                      const maxPoin =
                        memberList.find((m) => m.name === lpNamaPengirim)
                          ?.poin || 0;
                      let valStr = e.target.value;
                      if (!valStr) {
                        setLpTukarPoinInput("");
                        return;
                      }
                      let val = parseInt(valStr) || 0;
                      if (val > maxPoin) val = maxPoin;
                      if (val < 0) val = 0;
                      setLpTukarPoinInput(val.toString());
                    }}
                    placeholder="0"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>
                <button
                  onClick={() => {
                    const poinToUse = parseInt(lpTukarPoinInput) || 0;
                    setLpTukarPoin((poinToUse * 500).toString());
                    setShowTukarPoinModal(false);
                  }}
                  className="w-full mt-2 bg-blue-600 text-white font-bold rounded-xl py-3.5 hover:bg-blue-700 transition"
                >
                  Tukar Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pesanan Baru Notification Popup */}
        <AnimatePresence>
          {unreadPesanan && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-red-100 cursor-pointer"
                onClick={async () => {
                  try {
                    const colLetter = getColLetter(unreadPesanan.tandaColIdx);
                    const range = `Pesanan!${colLetter}${unreadPesanan.rowIndex}`;
                    await updateSheetDataFromId(
                      "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                      range,
                      [["satu"]],
                    );
                    navigate(`/daftar-belanja?nota=${unreadPesanan.nota}`);
                  } catch (e) {
                    console.error(e);
                  }
                  setUnreadPesanan(null);
                }}
              >
                <div className="bg-red-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">
                        Pesanan Baru
                      </h3>
                      <p className="text-red-100 text-xs">
                        {unreadPesanan.nota}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnreadPesanan(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-white flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    Klik untuk melihat detail transaksi
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proses Pesanan Notification Popup */}
        <AnimatePresence>
          {unreadProsesPesanan && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-yellow-100 cursor-pointer"
                onClick={async () => {
                  try {
                    const colLetter = getColLetter(
                      unreadProsesPesanan.tandaColIdx,
                    );
                    const range = `Pesanan!${colLetter}${unreadProsesPesanan.rowIndex}`;
                    await updateSheetDataFromId(
                      "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                      range,
                      [["dua"]],
                    );
                    navigate(
                      `/daftar-belanja?nota=${unreadProsesPesanan.nota}`,
                    );
                  } catch (e) {
                    console.error(e);
                  }
                  setUnreadProsesPesanan(null);
                }}
              >
                <div className="bg-yellow-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">
                        Proses Pesanan
                      </h3>
                      <p className="text-yellow-100 text-xs">
                        {unreadProsesPesanan.nota}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnreadProsesPesanan(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-white flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    Klik untuk melihat detail transaksi
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pesanan Telah Di Review Notification Popup */}
        <AnimatePresence>
          {unreadReviewPesanan && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 cursor-pointer"
                onClick={async () => {
                  try {
                    const colLetter = getColLetter(
                      unreadReviewPesanan.tandaColIdx,
                    );
                    const range = `Pesanan!${colLetter}${unreadReviewPesanan.rowIndex}`;
                    await updateSheetDataFromId(
                      "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                      range,
                      [["tiga"]],
                    );
                    navigate(
                      `/daftar-belanja?nota=${unreadReviewPesanan.nota}`,
                    );
                  } catch (e) {
                    console.error(e);
                  }
                  setUnreadReviewPesanan(null);
                }}
              >
                <div className="bg-emerald-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">
                        Pesanan Telah Di Review
                      </h3>
                      <p className="text-emerald-100 text-xs">
                        {unreadReviewPesanan.nota}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnreadReviewPesanan(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-white flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    Klik untuk melihat detail transaksi
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review Pesanan Notification Popup (User) */}
        <AnimatePresence>
          {unreadReviewPesananUser && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm mt-24"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-blue-100 cursor-pointer"
                onClick={async () => {
                  try {
                    const colLetter = getColLetter(
                      unreadReviewPesananUser.tandaColIdx,
                    );
                    const range = `Pesanan!${colLetter}${unreadReviewPesananUser.rowIndex}`;
                    await updateSheetDataFromId(
                      "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                      range,
                      [["dua"]],
                    );
                    // Pass the openBoganathaOrderId state to Profile
                    navigate("/profile", {
                      state: {
                        openBoganathaOrderId: unreadReviewPesananUser.idPesanan,
                      },
                    });
                  } catch (e) {
                    console.error(e);
                  }
                  setUnreadReviewPesananUser(null);
                }}
              >
                <div className="bg-blue-500 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">
                        Review Pesanan
                      </h3>
                      <p className="text-blue-100 text-xs">
                        ID: {unreadReviewPesananUser.idPesanan}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnreadReviewPesananUser(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 bg-white flex justify-between items-center">
                  <p className="text-xs text-gray-600">
                    Klik untuk melihat detail pesanan
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
