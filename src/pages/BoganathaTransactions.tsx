import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  ChevronRight,
  Wallet,
  Coins,
  CreditCard,
  X,
} from "lucide-react";
import { cn, formatImageUrl, formatUnitName } from "../lib/utils";
import { logActivity } from "../lib/activityLogger";
import {
  getSheetDataFromId,
  appendSheetDataFromId,
  updateSheetDataFromId,
} from "../lib/api";

const SPREADSHEET_ID = "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk";

// Helper to convert GDrive links
function getImageUrl(val: string): string {
  if (!val) return "";
  let trimmed = val.trim();
  trimmed = formatImageUrl(trimmed);
  if (trimmed.startsWith("http")) {
    if (trimmed.includes("drive.google.com")) {
      const match =
        trimmed.match(/\/file\/d\/([^\/]+)/) || trimmed.match(/id=([^&]+)/);
      if (match && match[1]) {
        return `https://docs.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return trimmed;
  }
  return "";
}

export default function BoganathaTransactions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

  const [cart, setCart] = useState<{ product: any; qty: number }[]>([]);
  const [view, setView] = useState<"home" | "cart" | "success">("home");
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState("");

  const [userPoin, setUserPoin] = useState<number | null>(null);
  const [userEwallet, setUserEwallet] = useState<number | null>(null);
  const [userMeta, setUserMeta] = useState<{
    rowNumber: number;
    poinColLetter: string;
  } | null>(null);
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [showModal, setShowModal] = useState<
    "poin" | "ewallet" | "paylater" | "usePoin" | null
  >(null);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);

  const [units, setUnits] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [deliveryType, setDeliveryType] = useState<"personal" | "unit">(
    "personal",
  );
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const [diskon, setDiskon] = useState<number>(0);
  const [diskonType, setDiskonType] = useState<"nominal" | "percent">(
    "nominal",
  );
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [voucherValue, setVoucherValue] = useState(0);

  const [poinInput, setPoinInput] = useState("");
  const [poinUsed, setPoinUsed] = useState(0);

  // States for Order New Product
  const [showOrderProduct, setShowOrderProduct] = useState(false);
  const [orderProductName, setOrderProductName] = useState("");
  const [orderCategory, setOrderCategory] = useState("");
  const [orderingProduct, setOrderingProduct] = useState(false);

  const handleOrderNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderProductName.trim() || !orderCategory.trim()) {
      alert("Mohon isi kategori dan nama produk");
      return;
    }
    setOrderingProduct(true);
    try {
      const newId = `produk-${Date.now().toString().slice(-6)}`;

      // Ambil headers dari sheet Product atau Produk
      let sheetName = "Product";
      let headerRes = await getSheetDataFromId(
        SPREADSHEET_ID,
        "Product!A1:Z1",
      ).catch(() => null);

      if (!headerRes || !headerRes.values) {
        headerRes = await getSheetDataFromId(
          SPREADSHEET_ID,
          "Produk!A1:Z1",
        ).catch(() => null);
        if (headerRes && headerRes.values) {
          sheetName = "Produk";
        }
      }
      let headers = ["id_produk", "kategori", "nama_produk", "status"];
      if (headerRes && headerRes.values && headerRes.values.length > 0) {
        headers = headerRes.values[0] as string[];
      }

      let idIdx = headers.findIndex(
        (h: string) => h?.trim().toLowerCase() === "id_produk",
      );
      let catIdx = headers.findIndex(
        (h: string) => h?.trim().toLowerCase() === "kategori",
      );
      let nameIdx = headers.findIndex(
        (h: string) => h?.trim().toLowerCase() === "nama_produk",
      );
      let statusIdx = headers.findIndex(
        (h: string) => h?.trim().toLowerCase() === "status",
      );

      if (idIdx === -1) idIdx = 0;
      if (catIdx === -1) catIdx = 1;
      if (nameIdx === -1) nameIdx = 2;
      if (statusIdx === -1) statusIdx = 3;

      const newRow = new Array(
        Math.max(
          headers.length,
          idIdx + 1,
          catIdx + 1,
          nameIdx + 1,
          statusIdx + 1,
        ),
      ).fill("");
      newRow[idIdx] = newId;
      newRow[catIdx] = orderCategory;
      newRow[nameIdx] = orderProductName;
      newRow[statusIdx] = "Request";

      await appendSheetDataFromId(SPREADSHEET_ID, `${sheetName}!A1:Z`, [
        newRow,
      ]);
      const logUserName = getUserDisplayName();
      logActivity('Order Product', 'Boganatha', `${logUserName} memesan produk baru "${orderProductName}" (Kategori: ${orderCategory})`);

      const newProductObj = {
        id: newId,
        category: orderCategory,
        name: orderProductName,
        price: 0, // Default price 0
        image: "",
      };

      // Update local state
      setProducts((prev) => [newProductObj, ...prev]);
      if (!categories.includes(orderCategory)) {
        setCategories((prev) => [...prev, orderCategory]);
      }

      // Add to cart manually because addToCart might only increment or we just use it
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.product.id === newProductObj.id,
        );
        if (existing) {
          return prev.map((item) =>
            item.product.id === newProductObj.id
              ? { ...item, qty: item.qty + 1 }
              : item,
          );
        }
        return [...prev, { product: newProductObj, qty: 1 }];
      });

      setShowOrderProduct(false);
      setOrderProductName("");
      setOrderCategory("");
      alert("Produk berhasil dipesan dan ditambahkan ke keranjang!");
    } catch (err: any) {
      alert("Gagal memesan produk: " + err.message);
    } finally {
      setOrderingProduct(false);
    }
  };

  const currentUserEmail =
    localStorage.getItem("mtask_user_email") || "user@example.com";

  const getUserDisplayName = () => {
    if (activeUserName && activeUserName.trim() !== "") {
      return activeUserName.trim();
    }
    const localName = localStorage.getItem("mtask_user_name");
    if (localName && localName.trim() !== "") {
      return localName.trim();
    }
    if (currentUserEmail) {
      if (currentUserEmail.toLowerCase().includes("abdhan1000")) return "Hanif";
      return currentUserEmail.includes("@") ? currentUserEmail.split("@")[0] : currentUserEmail;
    }
    return "User";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let prodRes = await getSheetDataFromId(
        SPREADSHEET_ID,
        "Produk!A1:Z1000",
      ).catch(() => null);
      if (!prodRes || !prodRes.values) {
        prodRes = await getSheetDataFromId(
          SPREADSHEET_ID,
          "Product!A1:Z1000",
        ).catch(() => null);
      }

      const [bannerRes, userRes, unitRes, rewardRes] = await Promise.all([
        getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "Banner2!A1:Z100",
        ).catch(() => null),
        getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "User!A1:Z1000",
        ).catch(() => null),
        getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "Unit!A1:Z100",
        ).catch(() => null),
        getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "Reward!A1:Z1000",
        ).catch(() => null),
      ]);

      if (prodRes && prodRes.values && prodRes.values.length > 1) {
        const headers = prodRes.values[0] as string[];
        const idIdx = headers.findIndex((h) =>
          h?.trim().toLowerCase().includes("id"),
        );
        const nameIdx = headers.findIndex((h) =>
          h?.trim().toLowerCase().includes("nama"),
        );
        const priceIdx = headers.findIndex((h) =>
          h?.trim().toLowerCase().includes("harga"),
        );
        const catIdx = headers.findIndex((h) =>
          h?.trim().toLowerCase().includes("kategori"),
        );
        const photoIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase().includes("foto") ||
            h?.trim().toLowerCase().includes("gambar") ||
            h?.trim().toLowerCase().includes("image"),
        );
        const modalIdx = headers.findIndex((h) => {
          if (!h) return false;
          const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
          return norm === "modal" || norm === "hargabeli";
        });
        const vendorIdx = headers.findIndex((h) => h?.trim().toLowerCase() === "vendor");
        const marginIdx = headers.findIndex((h) => {
          if (!h) return false;
          const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
          return norm === "margin" || norm === "%jual" || norm === "persenjual";
        });

        const parsedProducts = prodRes.values
          .slice(1)
          .map((row: any[], i: number) => {
            return {
              id: idIdx > -1 && row[idIdx] ? row[idIdx] : `PROD-${i}`,
              name: nameIdx > -1 && row[nameIdx] ? row[nameIdx] : `Produk ${i}`,
              price:
                priceIdx > -1 && row[priceIdx]
                  ? parseFloat(String(row[priceIdx]).replace(/[^\d]/g, "")) || 0
                  : 0,
              category: catIdx > -1 && row[catIdx] ? row[catIdx] : "Umum",
              image:
                photoIdx > -1 && row[photoIdx]
                  ? getImageUrl(row[photoIdx])
                  : "",
              modal: modalIdx > -1 && row[modalIdx] ? row[modalIdx] : "",
              vendor: vendorIdx > -1 && row[vendorIdx] ? row[vendorIdx] : "",
              margin: marginIdx > -1 && row[marginIdx] ? row[marginIdx] : "",
            };
          })
          .filter((p) => p.name);

        setProducts(parsedProducts);

        const cats = Array.from(new Set(parsedProducts.map((p) => p.category)));
        setCategories(["All", ...cats]);
      } else {
        // Mock data if sheet fails or is empty
        setProducts([
          {
            id: "1",
            name: "Sabun Cuci",
            price: 15000,
            category: "Kebutuhan Harian",
            image:
              "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400",
          },
          {
            id: "2",
            name: "Minyak Goreng 2L",
            price: 34000,
            category: "Sembako",
            image:
              "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=400",
          },
          {
            id: "3",
            name: "Beras Premium 5kg",
            price: 65000,
            category: "Sembako",
            image:
              "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
          },
        ]);
        setCategories(["All", "Sembako", "Kebutuhan Harian"]);
      }

      if (bannerRes && bannerRes.values && bannerRes.values.length > 1) {
        const headers = bannerRes.values[0] as string[];
        const imgIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "image" ||
            h?.trim().toLowerCase() === "gambar" ||
            h?.trim().toLowerCase() === "foto",
        );
        const lokasiIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "lokasi",
        );
        const showIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "show",
        );
        const judulIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "judul",
        );
        const diskonIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "diskon",
        );
        const bgColors = [
          "bg-blue-500",
          "bg-teal-500",
          "bg-orange-500",
          "bg-purple-500",
          "bg-pink-500",
          "bg-indigo-500",
        ];

        const parsedBanners = bannerRes.values
          .slice(1)
          .map((row: any[], index: number) => {
            const image =
              imgIdx > -1 && row[imgIdx] ? getImageUrl(row[imgIdx]) : "";
            const lokasi =
              lokasiIdx > -1 && row[lokasiIdx]
                ? String(row[lokasiIdx]).trim()
                : "";
            const show =
              showIdx > -1 && row[showIdx]
                ? String(row[showIdx]).trim().toUpperCase()
                : "";
            const judul =
              judulIdx > -1 && row[judulIdx]
                ? String(row[judulIdx]).trim()
                : "";
            const diskonStr =
              diskonIdx > -1 && row[diskonIdx]
                ? String(row[diskonIdx]).trim()
                : "";
            const diskonType = diskonStr.includes("%") ? "percent" : "nominal";
            const diskon = parseFloat(diskonStr.replace(/[^\d.-]/g, "")) || 0;
            return {
              image,
              lokasi,
              show,
              judul,
              diskon,
              diskonType,
              color: bgColors[index % bgColors.length],
            };
          })
          .filter(
            (b) =>
              b.show === "TRUE" &&
              ["BGN 1", "BGN 2", "BGN 3"].includes(b.lokasi),
          );

        setBanners(parsedBanners);
      } else {
        setBanners([
          {
            image:
              "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop",
            color: "bg-blue-500",
            judul: "Promo Spesial",
          },
          {
            image:
              "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&auto=format&fit=crop",
            color: "bg-teal-500",
            judul: "Diskon Akhir Pekan",
          },
        ]);
      }

      if (userRes && userRes.values && userRes.values.length > 1) {
        const headers = userRes.values[0] as string[];
        const emailIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "email",
        );
        const nameIdx = headers.findIndex((h) => {
          if (!h) return false;
          const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
          return (
            norm === "nama" ||
            norm === "name" ||
            norm === "fullname" ||
            norm === "namauser" ||
            norm === "user"
          );
        });
        const poinIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "poin",
        );
        const ewalletIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "ewalet" ||
            h?.trim().toLowerCase() === "ewallet",
        );

        const userRowIndex = userRes.values
          .slice(1)
          .findIndex(
            (row) =>
              emailIdx > -1 &&
              row[emailIdx]?.trim().toLowerCase() ===
                currentUserEmail.toLowerCase(),
          );

        if (userRowIndex > -1) {
          const userRow = userRes.values[userRowIndex + 1];
          if (nameIdx > -1 && userRow[nameIdx]) {
            setActiveUserName(userRow[nameIdx].trim());
          }
          setUserPoin(
            poinIdx > -1 && userRow[poinIdx]
              ? parseFloat(String(userRow[poinIdx]).replace(/[^\d.-]/g, "")) ||
                  0
              : 0,
          );
          setUserEwallet(
            ewalletIdx > -1 && userRow[ewalletIdx]
              ? parseFloat(
                  String(userRow[ewalletIdx]).replace(/[^\d.-]/g, ""),
                ) || 0
              : 0,
          );

          if (poinIdx > -1) {
            const getColLetter = (n: number) => {
              let letter = "";
              while (n >= 0) {
                letter = String.fromCharCode((n % 26) + 65) + letter;
                n = Math.floor(n / 26) - 1;
              }
              return letter;
            };
            setUserMeta({
              rowNumber: userRowIndex + 2,
              poinColLetter: getColLetter(poinIdx),
            });
          }
        } else {
          setUserPoin(0);
          setUserEwallet(0);
          setUserMeta(null);
        }
      } else {
        setUserPoin(0);
        setUserEwallet(0);
        setUserMeta(null);
      }

      if (unitRes && unitRes.values && unitRes.values.length > 1) {
        const headers = unitRes.values[0] as string[];
        const avatarIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase().includes("logo") ||
            h?.trim().toLowerCase().includes("avatar") ||
            h?.trim().toLowerCase().includes("foto") ||
            h?.trim().toLowerCase().includes("image"),
        );
        const nameIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "unit name" ||
            h?.trim().toLowerCase().includes("nama unit") ||
            h?.trim().toLowerCase() === "unit" ||
            h?.trim().toLowerCase() === "nama",
        );
        const addrIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "adress" ||
            h?.trim().toLowerCase() === "address" ||
            h?.trim().toLowerCase() === "alamat",
        );
        const idIdx = headers.findIndex(
          (h) =>
            h?.trim().toLowerCase() === "unit id" ||
            h?.trim().toLowerCase() === "id unit" ||
            h?.trim().toLowerCase() === "id",
        );

        const parsedUnits = unitRes.values
          .slice(1)
          .map((row: any[]) => ({
            id: idIdx > -1 && row[idIdx] ? String(row[idIdx]).trim() : "",
            avatar:
              avatarIdx > -1 && row[avatarIdx]
                ? getImageUrl(row[avatarIdx])
                : "",
            name:
              nameIdx > -1 && row[nameIdx] ? String(row[nameIdx]).trim() : "",
            address:
              addrIdx > -1 && row[addrIdx] ? String(row[addrIdx]).trim() : "",
          }))
          .filter((u) => u.name);
        setUnits(parsedUnits);
      }

      if (rewardRes && rewardRes.values && rewardRes.values.length > 1) {
        const headers = rewardRes.values[0] as string[];
        const kodeIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "kode",
        );
        const nilaiIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "nilai",
        );
        const statusIdx = headers.findIndex(
          (h) => h?.trim().toLowerCase() === "status",
        );

        const parsedRewards = rewardRes.values
          .slice(1)
          .map((row: any[]) => ({
            kode:
              kodeIdx > -1 && row[kodeIdx] ? String(row[kodeIdx]).trim() : "",
            nilai:
              nilaiIdx > -1 && row[nilaiIdx]
                ? parseFloat(String(row[nilaiIdx]).replace(/[^\d.-]/g, "")) || 0
                : 0,
            status:
              statusIdx > -1 && row[statusIdx]
                ? String(row[statusIdx]).trim().toLowerCase()
                : "",
          }))
          .filter((r) => r.kode);
        setRewards(parsedRewards);
      }
    } catch (err: any) {
      console.error("Error fetching data", err);
      setError("Gagal memuat produk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (view === "cart" && !orderId) {
      setOrderId(`BGN${Date.now().toString().slice(-6)}`);
    } else if (view === "home" && orderId) {
      setOrderId("");
    }
  }, [view, orderId]);

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cart]);

  const ongkosKirim = 0;

  const calculatedDiskonValue = useMemo(() => {
    if (diskon === 0) return 0;
    if (diskonType === "percent") {
      return (cartTotal * diskon) / 100;
    }
    return diskon;
  }, [diskon, diskonType, cartTotal]);

  const finalTotal = useMemo(() => {
    return Math.max(
      0,
      cartTotal +
        ongkosKirim -
        calculatedDiskonValue -
        voucherValue -
        poinUsed * 500,
    );
  }, [cartTotal, ongkosKirim, calculatedDiskonValue, voucherValue, poinUsed]);

  const applyVoucher = () => {
    if (diskon > 0) {
      alert("Voucher tidak dapat digunakan bersamaan dengan diskon.");
      return;
    }
    const matchedReward = rewards.find(
      (r) => r.kode.toLowerCase() === voucherInput.toLowerCase(),
    );
    if (matchedReward) {
      setVoucherCode(matchedReward.kode);
      setVoucherValue(matchedReward.nilai);
      setShowVoucherInput(false);
      alert("Voucher berhasil digunakan!");
    } else {
      alert("Kode voucher tidak valid atau tidak aktif.");
    }
  };

  const handleBannerClick = (b: any) => {
    if (b.diskon > 0) {
      setDiskon(b.diskon);
      setDiskonType(b.diskonType || "nominal");
      setVoucherCode("");
      setVoucherValue(0);
      setVoucherInput("");
      const diskonDisplay =
        b.diskonType === "percent" ? `${b.diskon}%` : formatIDR(b.diskon);
      alert(`Diskon ${diskonDisplay} diterapkan!`);
    }
  };

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!address.trim()) {
      alert("Alamat pengiriman wajib diisi!");
      return;
    }
    setSubmitting(true);
    try {
      const currentOrderId = orderId || `BGN${Date.now().toString().slice(-6)}`;
      if (!orderId) setOrderId(currentOrderId);

      const dateObj = new Date();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const year = dateObj.getFullYear();
      const timestamp = `${month}/${day}/${year}`;

      const TARGET_SPREADSHEET_ID =
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk";

      // 1. Simpan ke sheet Pesanan
      const pesananHeaderRes = await getSheetDataFromId(
        TARGET_SPREADSHEET_ID,
        "Pesanan!A1:Z1",
      ).catch(() => null);

      const pesananHeaders = pesananHeaderRes?.values?.[0] || [
        "id_pesanan", "user", "tanggal_pesan", "total_harga", "ongkos_kirim", "total_bayar", "status_pesanan", "metode_bayar", "bukti_bayar", "alamat_kirim", "diskon", "poin", "voucher", "due_date", "unit"
      ];

      const pIdPesananIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "idpesanan" || norm === "nota" || norm === "nonota";
      });
      const pUserIdx = pesananHeaders.findIndex((h: string) => h?.trim().toLowerCase() === "user");
      const pTanggalIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "tanggalpesanan" || norm === "tanggal" || norm === "tanggalpesan";
      });
      const pTotalHargaIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "totalharga" || norm === "subtotal";
      });
      const pOngkosKirimIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "ongkoskirim" || norm === "ongkir";
      });
      const pTotalBayarIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "totalbayar";
      });
      const pStatusPesananIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "statuspesanan" || norm === "status";
      });
      const pMetodeBayarIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "metodebayar" || norm === "metode";
      });
      const pBuktiBayarIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "buktibayar";
      });
      const pAlamatKirimIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "alamatkirim" || norm === "alamat";
      });
      const pDiskonIdx = pesananHeaders.findIndex((h: string) => h?.trim().toLowerCase() === "diskon");
      const pPoinIdx = pesananHeaders.findIndex((h: string) => h?.trim().toLowerCase() === "poin");
      const pVoucherIdx = pesananHeaders.findIndex((h: string) => h?.trim().toLowerCase() === "voucher");
      const pDueDateIdx = pesananHeaders.findIndex((h: string) => {
        if (!h) return false;
        const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
        return norm === "duedate";
      });
      const pUnitIdx = pesananHeaders.findIndex((h: string) => h?.trim().toLowerCase() === "unit");

      const rowPesanan = Array(Math.max(15, pesananHeaders.length)).fill("");
      rowPesanan[pIdPesananIdx > -1 ? pIdPesananIdx : 0] = currentOrderId;
      rowPesanan[pUserIdx > -1 ? pUserIdx : 1] = currentUserEmail;
      rowPesanan[pTanggalIdx > -1 ? pTanggalIdx : 2] = timestamp;
      rowPesanan[pTotalHargaIdx > -1 ? pTotalHargaIdx : 3] = cartTotal;
      rowPesanan[pOngkosKirimIdx > -1 ? pOngkosKirimIdx : 4] = "";
      rowPesanan[pTotalBayarIdx > -1 ? pTotalBayarIdx : 5] = finalTotal;
      rowPesanan[pStatusPesananIdx > -1 ? pStatusPesananIdx : 6] = "SEND";
      rowPesanan[pMetodeBayarIdx > -1 ? pMetodeBayarIdx : 7] = "";
      rowPesanan[pBuktiBayarIdx > -1 ? pBuktiBayarIdx : 8] = "";
      rowPesanan[pAlamatKirimIdx > -1 ? pAlamatKirimIdx : 9] = address;
      rowPesanan[pDiskonIdx > -1 ? pDiskonIdx : 10] = calculatedDiskonValue;
      rowPesanan[pPoinIdx > -1 ? pPoinIdx : 11] = poinUsed * 500;
      rowPesanan[pVoucherIdx > -1 ? pVoucherIdx : 12] = voucherValue;
      rowPesanan[pDueDateIdx > -1 ? pDueDateIdx : 13] = "";
      rowPesanan[pUnitIdx > -1 ? pUnitIdx : 14] = deliveryType === "unit" && selectedUnit ? selectedUnit.id : "";

      await appendSheetDataFromId(TARGET_SPREADSHEET_ID, "Pesanan!A:Z", [
        rowPesanan,
      ]);

      // Beri jeda 400ms agar Google Apps Script lock terlepas sebelum menulis Detail_Pesanan
      await new Promise((resolve) => setTimeout(resolve, 400));

      // 2. Simpan ke sheet Detail_Pesanan (Rincian produk yang dipilih di keranjang)
      const detHeaderRes = await getSheetDataFromId(
        TARGET_SPREADSHEET_ID,
        "Detail_Pesanan!A1:Z1",
      ).catch(() => null);

      const detailHeaders = detHeaderRes?.values?.[0] || [
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

      const findDetColIdx = (names: string[], fallbackIdx: number) => {
        const idx = detailHeaders.findIndex((h: string) => {
          if (!h) return false;
          const norm = h.trim().toLowerCase().replace(/[\s._-]+/g, "");
          return names.some((n) => norm === n.toLowerCase().replace(/[\s._-]+/g, ""));
        });
        return idx > -1 ? idx : fallbackIdx;
      };

      const dIdDetailIdx = findDetColIdx(["id_detail", "iddetail", "id"], 0);
      const dIdPesananIdx = findDetColIdx(["id_pesanan", "idpesanan", "nota", "nonota"], 1);
      const dIdProdukIdx = findDetColIdx(["id_produk", "idproduk", "produk", "productid", "id_barang"], 2);
      const dJumlahIdx = findDetColIdx(["jumlah", "qty", "kuantitas", "volume"], 3);
      const dHargaBeliIdx = findDetColIdx(["harga_beli", "hargabeli", "modal"], 4);
      const dVendorIdx = findDetColIdx(["vendor", "supplier"], 5);
      const dPersenJualIdx = findDetColIdx(["%jual", "persenjual", "margin"], 6);
      const dHargaSatuanIdx = findDetColIdx(["harga_satuan", "hargasatuan", "harga", "price", "satuan"], 7);
      const dOngkirIdx = findDetColIdx(["ongkir", "ongkos_kirim", "ongkoskirim"], 8);
      const dSubtotalIdx = findDetColIdx(["subtotal", "total", "jumlah_harga"], 9);
      const dStatusPesananIdx = findDetColIdx(["status_pesanan", "statuspesanan", "statusitem", "statusdetail", "status"], 10);
      const dStatusKirimIdx = findDetColIdx(["status_kirim", "statuskirim"], 11);
      const dPenerimaIdx = findDetColIdx(["penerima", "recipient"], 12);
      const dTimestampIdx = findDetColIdx(["timestamp", "tanggal", "waktu", "time"], 13);
      const dPhotoIdx = findDetColIdx(["photo", "foto", "bukti", "image"], 14);
      const dKeteranganIdx = findDetColIdx(["keterangan", "catatan", "notes"], 15);
      const dMarginProfitIdx = findDetColIdx(["margin_profit", "marginprofit", "profit"], 16);

      const maxCol = Math.max(17, detailHeaders.length);
      const validCart = cart.filter((item) => item && item.product && item.qty > 0);
      const detailRows = validCart.map((item, index) => {
        const row = Array(maxCol).fill("");
        row[dIdDetailIdx] = `DTL${Date.now().toString().slice(-6)}${index}`;
        row[dIdPesananIdx] = currentOrderId;
        row[dIdProdukIdx] = item.product.id;
        row[dJumlahIdx] = item.qty;
        row[dHargaBeliIdx] = item.product.modal || "";
        row[dVendorIdx] = item.product.vendor || "";
        row[dPersenJualIdx] = item.product.margin || "";
        row[dHargaSatuanIdx] = item.product.price;
        row[dOngkirIdx] = "";
        row[dSubtotalIdx] = item.qty * item.product.price;
        row[dStatusPesananIdx] = "";
        row[dStatusKirimIdx] = "";
        row[dPenerimaIdx] = "";
        row[dTimestampIdx] = "";
        row[dPhotoIdx] = "";
        row[dKeteranganIdx] = "";
        row[dMarginProfitIdx] = "";
        return row;
      });

      if (detailRows.length > 0) {
        await appendSheetDataFromId(
          TARGET_SPREADSHEET_ID,
          "Detail_Pesanan!A:Z",
          detailRows,
        );
      }

      const userName = getUserDisplayName();
      const hasUnit = deliveryType === "unit" && selectedUnit;
      if (hasUnit) {
        logActivity('Order Product', 'Boganatha', `${selectedUnit.name} membuat pesanan | id: ${currentOrderId} oleh ${userName}`);
      } else {
        logActivity('Order Product', 'Boganatha', `${userName} membuat pesanan | id: ${currentOrderId}`);
      }

      if (poinUsed > 0 && userMeta) {
        const remainingPoin = Math.max(0, (userPoin || 0) - poinUsed);
        const targetCell = `User!${userMeta.poinColLetter}${userMeta.rowNumber}`;
        await updateSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          targetCell,
          [[remainingPoin]],
        );
        setUserPoin(remainingPoin);
      }

      setCart([]);
      navigate(`/daftar-belanja?nota=${currentOrderId}`);
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengirim pesanan: " + (err.message || "Error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-teal-600 px-4 py-3 flex items-center shadow-md z-30 gap-3">
        <button
          onClick={() => (view === "cart" ? setView("home") : navigate("/"))}
          className="p-2 hover:bg-white/20 rounded-xl transition-all cursor-pointer text-white flex shrink-0 items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {view === "home" ? (
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/20 border border-white/30 text-white placeholder-white/70 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:bg-white/30 focus:border-white/50 transition-all shadow-sm"
            />
          </div>
        ) : (
          <h1 className="text-lg font-bold text-white flex-1">
            Keranjang Belanja
          </h1>
        )}

        {view === "home" && (
          <button
            onClick={() => setView("cart")}
            className="relative p-2 text-white hover:bg-white/20 rounded-xl transition shrink-0"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-teal-600">
                {cartCount}
              </span>
            )}
          </button>
        )}
      </div>
      {view === "home" ? (
        <div className="max-w-lg mx-auto">
          {/* Quick Actions Card */}
          <div className="px-4 mt-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 overflow-x-auto hide-scrollbar">
              <div className="flex items-center justify-between min-w-max gap-3">
                <div
                  onClick={() => setShowModal("ewallet")}
                  className="flex items-center gap-1.5 hover:opacity-80 transition justify-center px-1"
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                    {userEwallet !== null ? formatIDR(userEwallet) : "..."}
                  </span>
                </div>

                <div className="w-px h-8 bg-gray-100 shrink-0"></div>

                <div
                  onClick={() => setShowModal("poin")}
                  className="flex items-center gap-1.5 hover:opacity-80 transition justify-center px-1"
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                    {userPoin !== null
                      ? userPoin.toLocaleString("id-ID")
                      : "..."}
                  </span>
                </div>

                <div className="w-px h-8 bg-gray-100 shrink-0"></div>

                <div
                  onClick={() => setShowModal("paylater")}
                  className="flex items-center gap-1.5 hover:opacity-80 transition justify-center px-1"
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                    KTApaylater
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Promos */}
          {banners.length > 0 && (
            <div className="px-4 mt-4 overflow-x-auto hide-scrollbar">
              <div className="flex gap-3 w-max">
                {banners.map((b, i) => (
                  <div
                    key={`banner-${i}`}
                    onClick={() => handleBannerClick(b)}
                    className={cn(
                      "w-[300px] h-36 rounded-2xl overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center relative cursor-pointer",
                      b.image ? "bg-white" : b.color || "bg-teal-500",
                    )}
                  >
                    {b.image ? (
                      <img
                        src={b.image}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Promo Banner"
                      />
                    ) : (
                      <ImageIcon className="absolute w-12 h-12 text-white/50" />
                    )}
                    {b.judul && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="text-white text-sm font-bold tracking-wide shadow-sm">
                          {b.judul}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter */}
          <div className="px-4 mt-4 sticky top-[65px] z-20 bg-slate-50/95 backdrop-blur-sm py-2">
            <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-2">
              {categories.map((cat, i) => (
                <button
                  key={`cat-${i}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border",
                    selectedCategory === cat
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="px-4 mt-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                <p className="text-sm text-slate-500 font-medium">
                  Memuat produk...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <p className="text-slate-500 font-medium">
                  Produk tidak ditemukan.
                </p>
                <button
                  onClick={() => setShowOrderProduct(true)}
                  className="mt-4 px-4 py-2 bg-teal-50 text-teal-700 text-sm font-bold rounded-xl border border-teal-100 hover:bg-teal-100 transition-colors"
                >
                  Produk tidak tersedia? Klik untuk pesan produk
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((p, idx) => {
                  const cartItem = cart.find((c) => c.product.id === p.id);
                  const qty = cartItem ? cartItem.qty : 0;

                  return (
                    <motion.div
                      key={`${p.id}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full"
                    >
                      <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                        {p.image ? (
                          <img
                            src={p.image}
                            className="w-full h-full object-cover"
                            alt={p.name}
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        )}
                        {qty > 0 && (
                          <div className="absolute top-2 right-2 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {qty} di keranjang
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">
                            {p.category}
                          </p>
                          <h3 className="text-sm font-bold text-slate-800 leading-tight mb-1">
                            {p.name}
                          </h3>
                          <p className="text-sm font-black text-slate-900 mb-3">
                            {formatIDR(p.price)}
                          </p>
                        </div>

                        {qty === 0 ? (
                          <button
                            onClick={() => addToCart(p)}
                            className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1 border border-gray-200">
                            <button
                              onClick={() => updateCartQty(p.id, -1)}
                              className="p-1.5 hover:bg-white rounded-lg text-slate-600"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold w-6 text-center text-slate-800">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateCartQty(p.id, 1)}
                              className="p-1.5 hover:bg-white rounded-lg text-teal-600"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating View Cart Button */}
          {cartCount > 0 && (
            <div className="fixed bottom-4 left-0 right-0 px-4 z-40 max-w-lg mx-auto">
              <div
                onClick={() => setView("cart")}
                className="w-full bg-teal-600 text-white shadow-lg shadow-teal-600/30 rounded-2xl py-3.5 px-5 flex items-center justify-between transition hover:bg-teal-700 active:scale-95"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-semibold text-teal-100 uppercase tracking-wider">
                      {cartCount} Produk
                    </p>
                    <p className="text-sm font-bold">{formatIDR(cartTotal)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold flex items-center gap-1">
                  Lihat Keranjang <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto p-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            Daftar Belanja
          </h2>

          {cart.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm mt-10">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-sm mb-6">
                Keranjang belanja Anda kosong.
              </p>
              <button
                onClick={() => setView("home")}
                className="px-6 py-2.5 bg-teal-50 text-teal-700 font-bold rounded-xl text-sm transition hover:bg-teal-100"
              >
                Mulai Belanja
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {cart.map((item, i) => (
                  <div
                    key={`${item.product.id}-${i}`}
                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-xs font-black text-teal-600 mb-2">
                        {formatIDR(item.product.price)}
                      </p>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="p-1 text-slate-500 hover:text-slate-800"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold w-6 text-center text-slate-800">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="p-1 text-teal-600 hover:text-teal-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1.5 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Rincian Pembayaran
                  </h3>
                  {orderId && (
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                      {orderId}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal Produk</span>
                  <span className="font-semibold text-slate-800">
                    {formatIDR(cartTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ongkos Kirim</span>
                  <span className="font-semibold text-slate-800">
                    {ongkosKirim > 0 ? formatIDR(ongkosKirim) : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Diskon</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">
                      {diskon > 0
                        ? diskonType === "percent"
                          ? `- ${diskon}%`
                          : `- ${formatIDR(diskon)}`
                        : "-"}
                    </span>
                    {diskon > 0 && (
                      <button
                        onClick={() => {
                          setDiskon(0);
                          setDiskonType("nominal");
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col text-sm">
                  <div className="flex justify-between items-center group">
                    <span
                      onClick={() => {
                        if (diskon === 0)
                          setShowVoucherInput(!showVoucherInput);
                      }}
                      className={cn(
                        "text-slate-500 underline decoration-dashed underline-offset-4 cursor-pointer",
                        diskon > 0
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:text-teal-600 transition",
                      )}
                    >
                      Voucher
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {voucherValue > 0
                          ? `- ${formatIDR(voucherValue)}`
                          : "-"}
                      </span>
                      {voucherValue > 0 && (
                        <button
                          onClick={() => {
                            setVoucherValue(0);
                            setVoucherCode("");
                          }}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {showVoucherInput && diskon === 0 && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value)}
                        placeholder="Kode Voucher"
                        className="flex-1 text-xs bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={applyVoucher}
                        className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-lg hover:bg-slate-700"
                      >
                        Terapkan
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span
                    className="text-slate-500 underline decoration-dashed underline-offset-4 cursor-pointer hover:text-teal-600 transition"
                    onClick={() => setShowModal("usePoin")}
                  >
                    Poin
                  </span>
                  <span className="font-semibold text-slate-800">
                    {poinUsed > 0 ? `- ${formatIDR(poinUsed * 500)}` : "-"}
                  </span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-slate-800">
                    Total Tagihan
                  </span>
                  <span className="text-lg font-black text-teal-600">
                    {formatIDR(finalTotal)}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 mb-4 relative z-30">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    onClick={() => {
                      setDeliveryType("personal");
                      setSelectedUnit(null);
                      setAddress("");
                    }}
                    className={cn(
                      "flex-1 text-sm font-bold py-2 rounded-xl transition",
                      deliveryType === "personal"
                        ? "bg-white text-teal-600 shadow-sm"
                        : "text-slate-500 hover:bg-white/50",
                    )}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setDeliveryType("unit")}
                    className={cn(
                      "flex-1 text-sm font-bold py-2 rounded-xl transition",
                      deliveryType === "unit"
                        ? "bg-white text-teal-600 shadow-sm"
                        : "text-slate-500 hover:bg-white/50",
                    )}
                  >
                    Unit
                  </button>
                </div>

                {deliveryType === "unit" && (
                  <div className="relative">
                    <div
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-sm hover:border-teal-500 transition"
                      role="button"
                      tabIndex={0}
                    >
                      {selectedUnit ? (
                        <div className="flex items-center gap-2 w-full">
                          {selectedUnit.avatar && (
                            <img
                              src={selectedUnit.avatar}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <span className="font-semibold text-slate-800 flex-1 text-left">
                            {selectedUnit.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Pilih Unit...</span>
                      )}
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-slate-400 transition",
                          showUnitDropdown && "rotate-90",
                        )}
                      />
                    </div>
                    {showUnitDropdown && (
                      <div className="mt-2 bg-white border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto hide-scrollbar">
                        {units.length > 0 ? (
                          units.map((u, i) => (
                            <div
                              key={`unit-dropdown-${u.id || i}-${i}`}
                              onClick={() => {
                                setSelectedUnit(u);
                                setAddress(u.address);
                                setShowUnitDropdown(false);
                              }}
                              className="w-full text-left p-3 hover:bg-slate-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                              role="button"
                              tabIndex={0}
                            >
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-slate-800 flex-1">
                                {u.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-slate-500">
                            Tidak ada unit tersedia.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3 mb-4 relative z-20">
                <h3 className="font-bold text-slate-800 text-sm mb-2">
                  Alamat Pengiriman <span className="text-red-500">*</span>
                </h3>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap..."
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-24"
                  required
                />
              </div>

              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-24">
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full bg-teal-600 disabled:opacity-70 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition hover:bg-teal-700 active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Memproses...
                    </>
                  ) : (
                    "Kirim"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden relative z-10"
            >
              <button
                onClick={() => setShowModal(null)}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8 text-center">
                {showModal === "usePoin" && (
                  <>
                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Coins className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Poinmu
                    </h3>
                    <p className="text-3xl font-black text-slate-800 mb-6">
                      {userPoin !== null
                        ? userPoin.toLocaleString("id-ID")
                        : "0"}
                    </p>

                    <div className="mb-6 text-left">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Gunakan Poin
                      </label>
                      <input
                        type="number"
                        value={poinInput}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 0;
                          if (userPoin !== null && val > userPoin)
                            val = userPoin;
                          if (val < 0) val = 0;
                          setPoinInput(val ? val.toString() : "");
                        }}
                        className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-teal-500 text-center font-bold"
                        placeholder="0"
                      />
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        Setiap 1 poin bernilai Rp 500
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setPoinUsed(parseInt(poinInput) || 0);
                        setShowModal(null);
                      }}
                      className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition"
                    >
                      Terapkan Poin
                    </button>
                  </>
                )}
                {showModal === "poin" && (
                  <>
                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Coins className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Total Poin
                    </h3>
                    <p className="text-4xl font-black text-slate-800 mb-6">
                      {userPoin !== null
                        ? userPoin.toLocaleString("id-ID")
                        : "..."}
                    </p>
                    <button
                      onClick={() => setShowModal(null)}
                      className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                    >
                      Tutup
                    </button>
                  </>
                )}
                {showModal === "ewallet" && (
                  <>
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Saldo Dompet
                    </h3>
                    <p className="text-4xl font-black text-slate-800 mb-6">
                      {userEwallet !== null ? formatIDR(userEwallet) : "..."}
                    </p>
                    <button
                      onClick={() => alert("Tambah Saldo")}
                      className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition mb-3"
                    >
                      Tambah Saldo
                    </button>
                    <button
                      onClick={() => setShowModal(null)}
                      className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                    >
                      Tutup
                    </button>
                  </>
                )}
                {showModal === "paylater" && (
                  <>
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">
                      KTApaylater
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-6">
                      Fitur ini akan segera hadir. Nantikan update selanjutnya!
                    </p>
                    <div className="inline-block bg-purple-100 text-purple-700 font-bold px-4 py-2 rounded-full text-sm mb-6 uppercase tracking-wider">
                      Coming Soon
                    </div>
                    <button
                      onClick={() => setShowModal(null)}
                      className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                    >
                      Kembali
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOrderProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderProduct(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-6">
                <button
                  onClick={() => setShowOrderProduct(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">
                    Pesan Produk
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Silakan isi detail produk yang ingin Anda pesan
                  </p>
                </div>

                <form onSubmit={handleOrderNewProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={orderCategory}
                      onChange={(e) => setOrderCategory(e.target.value)}
                      placeholder="Contoh: Sembako, Minuman..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Nama Produk
                    </label>
                    <input
                      type="text"
                      value={orderProductName}
                      onChange={(e) => setOrderProductName(e.target.value)}
                      placeholder="Contoh: Beras Ramos 5kg..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      orderingProduct ||
                      !orderCategory.trim() ||
                      !orderProductName.trim()
                    }
                    className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-teal-600/30"
                  >
                    {orderingProduct ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />{" "}
                        Memproses...
                      </>
                    ) : (
                      "Pesan"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
