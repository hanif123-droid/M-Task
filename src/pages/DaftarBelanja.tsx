import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Filter,
  Search,
  X,
  Loader2,
  ShoppingBag,
  ChevronRight,
  FileText,
  Camera,
  CheckCircle,
  Building2,
  Check,
  Edit3,
  Plus,
  Printer,
  Download,
  Share2,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { toPng } from "html-to-image";
import {
  getSheetDataFromId,
  updateSheetDataFromId,
  appendSheetDataFromId,
} from "../lib/api";
import {
  AddProductDropdown,
  ProductOption,
  DraftProductItem,
} from "../components/AddProductDropdown";

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

function parseDate(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(dateStr);
}

function getColLetter(colIdx: number) {
  let temp,
    letter = "";
  let idx = colIdx + 1;
  while (idx > 0) {
    temp = (idx - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    idx = (idx - temp - 1) / 26;
  }
  return letter;
}

export function DaftarBelanja() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetNota = searchParams.get("nota");
  const [boganathaSearch, setBoganathaSearch] = useState("");
  const [showBoganathaFilterMenu, setShowBoganathaFilterMenu] = useState(false);
  const [boganathaTransactions, setBoganathaTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [boganathaFilterStatusPesanan, setBoganathaFilterStatusPesanan] =
    useState("All");
  const [boganathaFilterStatusBayar, setBoganathaFilterStatusBayar] =
    useState("All");
  const [boganathaFilterUnit, setBoganathaFilterUnit] = useState("All");

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null,
  );
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isUpdatingTx, setIsUpdatingTx] = useState(false);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<any | null>(null);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemUnits, setSystemUnits] = useState<Map<string, any>>(new Map());
  const [produkSheetName, setProdukSheetName] = useState("Produk");
  const [editBiayaLain, setEditBiayaLain] = useState("");
  const [editHargaSatuan, setEditHargaSatuan] = useState<
    Record<number, string>
  >({});
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(
    null,
  );
  const [allProductsList, setAllProductsList] = useState<ProductOption[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
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

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        const unitRes = await getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "Unit!A1:Z1000",
        ).catch(() => null);
        const userRes = await getSheetDataFromId(
          "1UB6-zV6go7IQsA6NA9oe-l7w-P6m-vgjJnmXt00vsao",
          "User!A1:Z1000",
        ).catch(() => null);

        let unitMap = new Map<string, any>();
        if (unitRes && unitRes.values && unitRes.values.length > 0) {
          const headers = unitRes.values[0] as string[];
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "ID_UNIT" ||
              h?.trim().toUpperCase() === "UNIT ID" ||
              h?.trim().toUpperCase() === "ID UNIT" ||
              h?.trim().toUpperCase() === "ID",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "NAMA UNIT" ||
              h?.trim().toUpperCase() === "UNIT NAME",
          );
          const logoIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "LOGO" ||
              h?.trim().toUpperCase() === "IMAGE",
          );
          const akaIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "AKA" ||
              h?.trim().toUpperCase() === "NAMA_PENDEK",
          );
          if (idIdx > -1) {
            unitRes.values.slice(1).forEach((r: any[]) => {
              const uId = r[idIdx]?.trim();
              const uName =
                nameIdx > -1 ? r[nameIdx] || "Unknown Unit" : "Unknown Unit";
              const uLogo = logoIdx > -1 ? r[logoIdx] || "" : "";
              if (uId) {
                unitMap.set(uId.toUpperCase(), { name: uName, logo: uLogo });
              }
            });
          }
        }
        setSystemUnits(unitMap);

        let usersArr: any[] = [];
        if (userRes && userRes.values && userRes.values.length > 0) {
          const headers = userRes.values[0] as string[];
          const emailIdx = headers.findIndex(
            (h) => h?.trim().toUpperCase() === "EMAIL",
          );
          const nameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "NAMA PANGGILAN" ||
              h?.trim().toUpperCase() === "NAME",
          );
          const fullNameIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "NAMA LENGKAP" ||
              h?.trim().toUpperCase() === "FULL NAME",
          );
          const photoIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "PHOTO" ||
              h?.trim().toUpperCase() === "FOTO",
          );
          const idIdx = headers.findIndex(
            (h) =>
              h?.trim().toUpperCase() === "USER ID" ||
              h?.trim().toUpperCase() === "ID",
          );
          usersArr = userRes.values
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
                (nameIdx > -1 ? r[nameIdx]?.trim() : "") ||
                (emailIdx > -1 ? r[emailIdx]?.trim() : "Unknown");
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
        }
        setSystemUsers(usersArr);

        const boganathaRes = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Pesanan!A1:Z1000",
        ).catch(() => null);
        const detailRes = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Detail_Pesanan!A1:Z2000",
        ).catch(() => null);
        const produkRes1 = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Produk!A1:Z1000",
        ).catch(() => null);
        const produkRes2 = await getSheetDataFromId(
          "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
          "Product!A1:Z1000",
        ).catch(() => null);
        const produkRes =
          produkRes2 && produkRes2.values ? produkRes2 : produkRes1;
        const produkSheetNameStr =
          produkRes2 && produkRes2.values ? "Product" : "Produk";
        setProdukSheetName(produkSheetNameStr);

        let boganathaData: any[] = [];
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
                (n) => normalized === n.toUpperCase().replace(/[\s._-]+/g, ""),
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
          const tandaColIdx = getIndex(["TANDA"]);

          const parsedRows: any[] = [];
          boganathaRes.values.slice(1).forEach((row: any[], index: number) => {
            const notaVal = idIdx > -1 ? row[idIdx]?.trim() || "" : "";
            if (!notaVal) return;

            const dateVal = dateIdx > -1 ? row[dateIdx]?.trim() || "" : "";
            const clientVal = userIdx > -1 ? row[userIdx]?.trim() || "" : "";
            const statusPesananVal =
              statusPesananIdx > -1 ? row[statusPesananIdx]?.trim() || "" : "";
            const statusPaidVal =
              statusPaidIdx > -1 ? row[statusPaidIdx]?.trim() || "" : "";
            const totalVal = totalIdx > -1 ? row[totalIdx]?.trim() : "";
            const unitVal = unitIdx > -1 ? row[unitIdx]?.trim() || "" : "";
            const totalNum =
              parseFloat((totalVal || "").replace(/[^0-9.-]/g, "")) || 0;
            const subtotalVal =
              subtotalIdx > -1 ? parseFloat(String(row[subtotalIdx])) || 0 : 0;
            const ongkirVal =
              ongkirIdx > -1 ? parseFloat(String(row[ongkirIdx])) || 0 : 0;
            const diskonVal =
              diskonIdx > -1 ? parseFloat(String(row[diskonIdx])) || 0 : 0;
            const voucherVal =
              voucherIdx > -1 ? parseFloat(String(row[voucherIdx])) || 0 : 0;
            const poinVal =
              poinIdx > -1 ? parseFloat(String(row[poinIdx])) || 0 : 0;
            const alamatKirimVal =
              alamatIdx > -1 ? row[alamatIdx]?.trim() || "" : "";

            parsedRows.push({
              rowIndex: index + 2,
              tandaColIdx: tandaColIdx,
              ongkirColIdx: ongkirIdx,
              statusPesananColIdx: statusPesananIdx,
              statusPaidColIdx: statusPaidIdx,
              totalColIdx: totalIdx,
              nota: notaVal,
              idPesanan: notaVal,
              date: dateVal,
              tanggal: dateVal,
              rawDate: parseDate(dateVal),
              client: clientVal,
              statusPesanan: statusPesananVal,
              statusPaid: statusPaidVal,
              unit: unitVal,
              alamatKirim: alamatKirimVal,
              alamat: alamatKirimVal,
              totalSum: totalNum,
              total: totalNum,
              subtotal: subtotalVal,
              ongkir: ongkirVal,
              diskon: diskonVal,
              voucher: voucherVal,
              poin: poinVal,
              items: [],
            });
          });

          const groupedMap: { [key: string]: any } = {};
          parsedRows.forEach((row) => {
            groupedMap[row.nota] = row;
          });

          if (detailRes && detailRes.values && detailRes.values.length > 0 && produkRes && produkRes.values && produkRes.values.length > 0) {
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
                h?.trim().toLowerCase().includes("image"),
            );
            const prodPriceIdx = prodHeaders.findIndex(
              (h) =>
                h?.trim().toLowerCase() === "harga" ||
                h?.trim().toLowerCase() === "price",
            );

            const prodMap = new Map<string, any>();
            const prodsList: ProductOption[] = [];
            produkRes.values.slice(1).forEach((row: any[], index: number) => {
              const id = prodIdIdx > -1 ? row[prodIdIdx] : null;
              const name = prodNameIdx > -1 ? row[prodNameIdx] : "";
              const rawPrice = prodPriceIdx > -1 ? row[prodPriceIdx] : 0;
              const price =
                typeof rawPrice === "number"
                  ? rawPrice
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.-]+/g, "")) || 0;
              const image = prodPhotoIdx > -1 ? row[prodPhotoIdx] : "";
              if (id) {
                if (name) prodsList.push({ id, name, price, image });
                prodMap.set(id, {
                  name: name || "-",
                  image: image || "",
                  rowIndex: index + 2,
                  priceColIdx: prodPriceIdx,
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
                  keteranganColIdx: detKeteranganIdx,
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
                  keterangan: detKeteranganIdx > -1 ? row[detKeteranganIdx]?.trim() || "" : "",
                  prodId,
                  prodRowIndex: product?.rowIndex,
                  prodPriceColIdx: product?.priceColIdx,
                  name: productName,
                  image: product?.image || "",
                  item: productName,
                  qty:
                    detQtyIdx > -1
                      ? parseFloat(String(row[detQtyIdx])) || 0
                      : 0,
                  uom: "Pcs",
                  price:
                    detPriceIdx > -1
                      ? parseFloat(String(row[detPriceIdx])) || 0
                      : 0,
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
        setBoganathaTransactions(boganathaData);
        if (targetNota) {
          const found = boganathaData.find((tx: any) => tx.nota === targetNota);
          if (found) {
            setSelectedTransaction(found);
            // Optionally clear the URL parameter so it doesn't reopen on refresh if intended to be dismissed
            navigate("/daftar-belanja", { replace: true });
          }
        }
      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredBoganathaTrans = boganathaTransactions.filter((t) => {
    let match = true;
    if (boganathaSearch.trim()) {
      const q = boganathaSearch.trim().toLowerCase();
      match =
        match &&
        ((t.nota && t.nota.toLowerCase().includes(q)) ||
          (t.client && t.client.toLowerCase().includes(q)));
    }
    if (boganathaFilterStatusPesanan !== "All") {
      const s = t.statusPesanan?.trim().toLowerCase() || "";
      match = match && s === boganathaFilterStatusPesanan.toLowerCase();
    }
    if (boganathaFilterStatusBayar !== "All") {
      const s = t.statusPaid?.trim().toLowerCase() || "";
      match = match && s === boganathaFilterStatusBayar.toLowerCase();
    }
    if (boganathaFilterUnit !== "All") {
      const u = t.unit?.trim().toLowerCase() || "";
      match = match && u === boganathaFilterUnit.toLowerCase();
    }
    return match;
  });

  const sortedFilteredUnitShoppingTrans = [...filteredBoganathaTrans].sort(
    (a, b) => {
      return (b.rowIndex || 0) - (a.rowIndex || 0);
    },
  );

  const handleSetItemToKirim = async (item: any) => {
    if (!selectedTransaction || !item.rowIndex) return;
    try {
      setIsUpdatingTx(true);

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

        if (statusKirimIdx > -1) {
          const colLetter = getColLetter(statusKirimIdx);
          await updateSheetDataFromId(
            "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
            `Detail_Pesanan!${colLetter}${item.rowIndex}`,
            [["terkirim"]],
          );

          item.statusKirim = "terkirim";

          setSelectedTransaction({ ...selectedTransaction });
          setBoganathaTransactions((prev) =>
            prev.map((tx) =>
              tx.nota === selectedTransaction.nota
                ? { ...selectedTransaction }
                : tx,
            ),
          );
        }
      }
    } catch (e) {
      console.error(e);
      alert("Gagal set kirim item");
    } finally {
      setIsUpdatingTx(false);
    }
  };

  const handleSetToReview = async () => {
    if (!selectedTransaction) return;
    try {
      setIsUpdatingTx(true);

      // Calculate new total_harga (subtotal) before writing
      let newTotalHarga = 0;
      if (
        selectedTransaction.items &&
        Array.isArray(selectedTransaction.items)
      ) {
        for (const item of selectedTransaction.items) {
          if (item.price != null && item.qty != null) {
            newTotalHarga += item.price * item.qty;
          }
        }
      }

      // Calculate new final total
      const newTotalBayar =
        newTotalHarga +
        (selectedTransaction.ongkir || 0) -
        (selectedTransaction.diskon || 0) -
        (selectedTransaction.voucher || 0) -
        (selectedTransaction.poin || 0);

      const res = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Pesanan!A1:Z1000",
      ).catch(() => null);

      if (res?.values?.length > 0) {
        const headers = res.values[0] as string[];
        const getIdx = (names: string[]) =>
          headers.findIndex((h) => {
            const norm = (h || "")
              .trim()
              .toUpperCase()
              .replace(/[\s._-]+/g, "");
            return names.includes(norm);
          });
        const idIdx = getIdx(["IDPESANAN", "ORDERID"]);
        const statusPesananIdx = getIdx(["STATUSPESANAN", "STATUS"]);
        const totalIdx = getIdx(["TOTALBAYAR", "TOTAL"]);
        const totalHargaIdx = getIdx(["TOTALHARGA"]);
        const tandaIdx = getIdx(["TANDA"]);

        if (idIdx > -1) {
          const rowIndex = res.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === selectedTransaction.nota,
          );
          if (rowIndex > -1) {
            const actualRowIndex = rowIndex + 1;

            if (statusPesananIdx > -1) {
              const colLetter = getColLetter(statusPesananIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colLetter}${actualRowIndex}`,
                [["REVIEW"]],
              );
            }
            if (totalHargaIdx > -1) {
              const colLetter = getColLetter(totalHargaIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colLetter}${actualRowIndex}`,
                [[newTotalHarga]],
              );
            }
            if (totalIdx > -1) {
              const totalColLetter = getColLetter(totalIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${totalColLetter}${actualRowIndex}`,
                [[newTotalBayar]],
              );
            }
            if (tandaIdx > -1) {
              const tandaColLetter = getColLetter(tandaIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${tandaColLetter}${actualRowIndex}`,
                [["satu"]],
              );
            }
          }
        }
      }

      // Update Detail_Pesanan subtotal
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
          return ["SUBTOTAL", "TOTAL"].includes(norm);
        });

        if (subtotalIdx > -1) {
          const subtotalColLetter = getColLetter(subtotalIdx);

          for (const item of selectedTransaction.items) {
            if (item.rowIndex && item.price != null && item.qty != null) {
              const subtotal = item.price * item.qty;
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Detail_Pesanan!${subtotalColLetter}${item.rowIndex}`,
                [[subtotal]],
              );
              item.subtotal = subtotal;
              item.amount = subtotal;
            }
          }
        }
      }

      const updatedTx = {
        ...selectedTransaction,
        subtotal: newTotalHarga,
        totalSum: newTotalBayar,
        total: newTotalBayar,
        statusPesanan: "REVIEW",
        status: "REVIEW",
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
        statusPesanan: targetStatus,
        status: targetStatus,
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
        statusPesanan: "PROCESS",
        status: "PROCESS",
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

  const handleSetPesananDone = async () => {
    if (!selectedTransaction || selectedTransaction.statusPesananColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.statusPesananColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["DONE"]],
      );
      const updatedTx = {
        ...selectedTransaction,
        statusPesanan: "DONE",
        status: "DONE",
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
    if (!selectedTransaction || selectedTransaction.statusPaidColIdx == null)
      return;
    try {
      setIsUpdatingTx(true);
      const colLetter = getColLetter(selectedTransaction.statusPaidColIdx);
      const range = `Pesanan!${colLetter}${selectedTransaction.rowIndex}`;
      await updateSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        range,
        [["PAID"]],
      );
      const updatedTx = { ...selectedTransaction, statusPaid: "PAID" };
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

  const handleUpdateOngkir = async (newVal: string) => {
    if (!selectedTransaction) return;
    const numericVal = parseFloat(newVal.replace(/[^0-9]/g, "")) || 0;
    try {
      setIsUpdatingTx(true);
      const res = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Pesanan!A1:Z1000",
      ).catch(() => null);

      if (res?.values?.length > 0) {
        const headers = res.values[0] as string[];
        const idIdx = headers.findIndex((h) => {
          const norm = (h || "")
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          return ["IDPESANAN", "ORDERID"].includes(norm);
        });
        const ongkirIdx = headers.findIndex((h) => {
          const norm = (h || "")
            .trim()
            .toUpperCase()
            .replace(/[\s._-]+/g, "");
          return ["ONGKOSKIRIM"].includes(norm);
        });

        if (idIdx > -1 && ongkirIdx > -1) {
          const rowIndex = res.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === selectedTransaction.nota,
          );
          if (rowIndex > -1) {
            const actualRowIndex = rowIndex + 1;
            const colLetter = getColLetter(ongkirIdx);
            const range = `Pesanan!${colLetter}${actualRowIndex}`;
            await updateSheetDataFromId(
              "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
              range,
              [[numericVal]],
            );
          }
        }
      }

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
          await navigator.clipboard.write([
            new ClipboardItem({
              [file.type]: blob,
            }),
          ]);
          alert("Invoice telah disalin ke clipboard! Anda dapat menempelkannya (paste) di WhatsApp atau media lainnya untuk membagikannya.");
        } catch (clipErr) {
          const link = document.createElement("a");
          link.download = `Invoice-Boganatha-${selectedTransaction?.nota || "order"}.png`;
          link.href = dataUrl;
          link.click();
          alert("Fitur bagikan langsung tidak didukung pada browser Anda. Invoice telah otomatis diunduh ke perangkat Anda.");
        }
      }
    } catch (err: any) {
      console.error("Error sharing invoice:", err);
      alert("Gagal membagikan invoice: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUpdateHargaSatuan = async (
    item: any,
    newVal: string,
    itemIdx: number,
  ) => {
    if (!selectedTransaction) return;
    const numericVal = parseFloat(newVal.replace(/[^0-9]/g, "")) || 0;
    try {
      setIsUpdatingTx(true);

      // Update Detail_Pesanan
      const detRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        "Detail_Pesanan!A1:Z2000",
      ).catch(() => null);
      if (detRes?.values?.length > 0) {
        const headers = detRes.values[0] as string[];
        const getIdx = (names: string[]) =>
          headers.findIndex((h) =>
            names.includes(
              (h || "")
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, ""),
            ),
          );
        const idPesananIdx = getIdx(["IDPESANAN", "ORDERID"]);
        const idProdukIdx = getIdx(["IDPRODUK"]);
        const hargaSatuanIdx = getIdx(["HARGASATUAN", "HARGA", "PRICE"]);
        const subtotalIdx = getIdx(["SUBTOTAL", "TOTAL", "TOTALHARGA", "TOTAL_HARGA"]);

        if (idPesananIdx > -1 && idProdukIdx > -1 && hargaSatuanIdx > -1) {
          const detRowIndex = detRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 &&
              row[idPesananIdx]?.trim() === selectedTransaction.nota &&
              row[idProdukIdx]?.trim() === item.prodId,
          );
          if (detRowIndex > -1) {
            const actualRowIndex = detRowIndex + 1;
            const colLetter = getColLetter(hargaSatuanIdx);
            const range = `Detail_Pesanan!${colLetter}${actualRowIndex}`;
            await updateSheetDataFromId(
              "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
              range,
              [[numericVal]],
            );

            // Also update subtotal column in Detail_Pesanan
            if (subtotalIdx > -1) {
              const subtotalColLetter = getColLetter(subtotalIdx);
              const subtotalRange = `Detail_Pesanan!${subtotalColLetter}${actualRowIndex}`;
              const computedSubtotal = numericVal * (item.qty || 1);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                subtotalRange,
                [[computedSubtotal]],
              );
            }
          }
        }
      }

      // Update Product sheet
      const prodRes = await getSheetDataFromId(
        "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
        `${produkSheetName}!A1:Z1000`,
      ).catch(() => null);
      if (prodRes?.values?.length > 0) {
        const headers = prodRes.values[0] as string[];
        const getIdx = (names: string[]) =>
          headers.findIndex((h) =>
            names.includes(
              (h || "")
                .trim()
                .toUpperCase()
                .replace(/[\s._-]+/g, ""),
            ),
          );
        const idProdukIdx = getIdx(["IDPRODUK"]);
        const hargaIdx = getIdx(["HARGA", "PRICE"]);
        if (idProdukIdx > -1 && hargaIdx > -1) {
          const prodRowIndex = prodRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idProdukIdx]?.trim() === item.prodId,
          );
          if (prodRowIndex > -1) {
            const actualRowIndex = prodRowIndex + 1;
            const prodColLetter = getColLetter(hargaIdx);
            const prodRange = `${produkSheetName}!${prodColLetter}${actualRowIndex}`;
            await updateSheetDataFromId(
              "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
              prodRange,
              [[numericVal]],
            );
          }
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
          const rowIndex = pesananRes.values.findIndex(
            (row: any[], idx: number) =>
              idx > 0 && row[idIdx]?.trim() === selectedTransaction.nota,
          );
          if (rowIndex > -1) {
            const actualRowIndex = rowIndex + 1;
            
            if (totalHargaIdx > -1) {
              const colLetter = getColLetter(totalHargaIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colLetter}${actualRowIndex}`,
                [[newSubtotal]],
              );
            }
            if (totalBayarIdx > -1) {
              const colLetter = getColLetter(totalBayarIdx);
              await updateSheetDataFromId(
                "1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk",
                `Pesanan!${colLetter}${actualRowIndex}`,
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
  const handleItemKirimChange = async (item: any, newStatus: string) => {};
  const handleUpdatePenerima = async (item: any, newPenerima: string) => {};

  return (
    <div className="pb-24 bg-gray-50 min-h-screen relative font-sans">
      <header className="bg-[#429dbb] text-white px-5 py-4 shadow-md sticky top-0 z-50 w-full mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-xl font-bold tracking-tight drop-shadow-sm">
          Daftar Belanja
        </h1>
      </header>

      <div className="px-4 mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Cari transaksi..."
            value={boganathaSearch}
            onChange={(e) => setBoganathaSearch(e.target.value)}
            className="w-full bg-white shadow-sm border-gray-100 border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#429dbb] transition-all font-sans"
          />
        </div>
        <button
          onClick={() => setShowBoganathaFilterMenu(true)}
          className="bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2.5 flex items-center justify-center shrink-0 hover:bg-gray-50 focus:ring-2 focus:ring-[#429dbb] transition-all cursor-pointer"
        >
          <Filter className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-[#429dbb] animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Memuat data...</span>
          </div>
        )}
        {!isLoading && sortedFilteredUnitShoppingTrans.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
            <p className="text-sm text-gray-400 italic">
              Tidak ada belanja untuk filter ini.
            </p>
          </div>
        ) : (
          !isLoading &&
          sortedFilteredUnitShoppingTrans
            .filter((trans) => trans && (trans.nota || trans.id))
            .map((trans, idx) => (
              <div
                key={`trans-${trans.nota || trans.id || idx}-${idx}`}
                onClick={() => setSelectedTransaction(trans)}
                className="py-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-slate-50/70 p-2.5 bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-200 pr-1 group animate-fade-in"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                        {trans.nota}
                      </span>
                      {(() => {
                        const isPaid =
                          trans.statusPaid?.trim().toLowerCase() === "paid";
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
                    <div className="mt-2 group-hover:text-indigo-600 transition-colors">
                      {(() => {
                        const hasUnit = trans.unit && trans.unit.trim() !== "";
                        const unitData = hasUnit
                          ? systemUnits.get(trans.unit.trim().toUpperCase())
                          : null;
                        const userData = systemUsers.find(
                          (u) => u.email === trans.client?.toLowerCase(),
                        );

                        if (hasUnit) {
                          return (
                            <div className="flex items-center gap-2">
                              {unitData?.logo ? (
                                <img
                                  src={unitData.logo}
                                  alt={unitData.name}
                                  className="w-5 h-5 rounded-full object-cover bg-gray-50 shadow-sm border border-gray-100"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shadow-sm border border-indigo-200">
                                  {unitData?.name
                                    ? unitData.name
                                        .substring(0, 2)
                                        .toUpperCase()
                                    : trans.unit.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {unitData?.name || trans.unit}
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2">
                              {userData?.photo ? (
                                <img
                                  src={userData.photo}
                                  alt={userData.nameOrEmail}
                                  className="w-5 h-5 rounded-full object-cover bg-gray-50 shadow-sm border border-gray-100"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shadow-sm border border-blue-200">
                                  {(
                                    userData?.nameOrEmail ||
                                    trans.client ||
                                    "U"
                                  )
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {userData?.nameOrEmail ||
                                  trans.client ||
                                  "Unknown"}
                              </p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div className="flex gap-2 mt-2 items-center flex-wrap">
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border",
                          trans.statusPesanan === "Send"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : trans.statusPesanan === "Review"
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : trans.statusPesanan === "Process"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : trans.statusPesanan === "Delivered"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : trans.statusPesanan === "Done"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200",
                        )}
                      >
                        {trans.statusPesanan || "NO STATUS"}
                      </span>

                      {(() => {
                        const hasUnit = trans.unit && trans.unit.trim() !== "";
                        if (hasUnit) {
                          const userData = systemUsers.find(
                            (u) => u.email === trans.client?.toLowerCase(),
                          );
                          return (
                            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-md">
                              {userData?.photo ? (
                                <img
                                  src={userData.photo}
                                  alt={userData.nameOrEmail}
                                  className="w-3.5 h-3.5 rounded-full object-cover bg-white"
                                />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] font-bold">
                                  {(
                                    userData?.nameOrEmail ||
                                    trans.client ||
                                    "U"
                                  )
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-gray-700 truncate max-w-[100px]">
                                {userData?.nameOrEmail ||
                                  trans.client ||
                                  "Unknown"}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-indigo-600 tracking-tight">
                      {formatIDR(trans.total)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                      {trans.tanggal}
                    </p>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      <AnimatePresence>
        {showBoganathaFilterMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBoganathaFilterMenu(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-2xl z-50 overflow-hidden shadow-2xl pb-safe"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                <h3 className="font-bold text-gray-900">Filter Belanja</h3>
                <button
                  onClick={() => setShowBoganathaFilterMenu(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Status Pesanan
                  </label>
                  <select
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[#429dbb]"
                    value={boganathaFilterStatusPesanan}
                    onChange={(e) =>
                      setBoganathaFilterStatusPesanan(e.target.value)
                    }
                  >
                    <option value="All">Semua</option>
                    <option value="Send">Send</option>
                    <option value="Review">Review</option>
                    <option value="Process">Process</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[#429dbb]"
                    value={boganathaFilterStatusBayar}
                    onChange={(e) =>
                      setBoganathaFilterStatusBayar(e.target.value)
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
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:border-[#429dbb]"
                    value={boganathaFilterUnit}
                    onChange={(e) => setBoganathaFilterUnit(e.target.value)}
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
                        value={unitId as string}
                      >
                        {unitId as string}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Detail Transaksi
                  </h4>
                  <p className="text-xs text-gray-400">
                    Boganatha - Nota: {selectedTransaction.nota}
                  </p>
                </div>
              </div>

              <div className="space-y-4 font-sans flex-1 overflow-y-auto p-4 sm:p-6">
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
                                    alt={userData.fullName || userData.nameOrEmail}
                                    className="w-6 h-6 rounded-md object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">
                                    {(
                                      userData?.fullName ||
                                      selectedTransaction.client ||
                                      "U"
                                    )
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium text-sm text-gray-900">
                                  {userData?.fullName ||
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
                    {selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                      "SEND" && (
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
                        <span className="flex items-center gap-1">Diskon</span>
                        <span className="font-semibold">
                          - {formatIDR(selectedTransaction.diskon)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.voucher > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">Voucher</span>
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
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center mt-3">
                      <span className="font-bold text-gray-900">
                        Total Pembayaran
                      </span>
                      <span className="font-black text-blue-600 text-lg tracking-tight">
                        {formatIDR(selectedTransaction.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">
                    Daftar Produk ({selectedTransaction.items?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {selectedTransaction.items &&
                    selectedTransaction.items.length > 0 ? (
                      selectedTransaction.items.map(
                        (item: any, idx: number) => (
                          <div
                            key={`item-${idx}-${item?.id || item?.product?.id || ""}`}
                            className={cn(
                              "flex gap-3 bg-white p-3 rounded-xl border shadow-sm transition-colors",
                              selectedTransaction.statusPesanan
                                ?.trim()
                                .toUpperCase() === "SEND" &&
                                currentUserEmail === "vonyloselia@gmail.com"
                                ? "cursor-pointer hover:border-blue-300"
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
                              } else {
                                setSelectedProductDetail(item);
                              }
                            }}
                          >
                            <div className="flex flex-col gap-2 shrink-0">
                              <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden relative">
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
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-gray-900 truncate pr-2">
                                  {item.name}
                                </p>
                                {selectedTransaction.statusPesanan
                                  ?.trim()
                                  .toUpperCase() === "PROCESS" &&
                                  currentUserEmail ===
                                    "vonyloselia@gmail.com" &&
                                  (!item.statusKirim ||
                                    item.statusKirim.trim() === "") && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetItemToKirim(item);
                                      }}
                                      disabled={isUpdatingTx}
                                      className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                                    >
                                      {isUpdatingTx ? "..." : "Kirim"}
                                    </button>
                                  )}
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs text-gray-500">
                                    {item.qty} x
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
                                          item,
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
                        ),
                      )
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4 bg-white rounded-xl border border-gray-100 border-dashed">
                        Detail produk tidak ditemukan
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
                {selectedTransaction.statusPesanan?.trim().toUpperCase() ===
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
                {selectedTransaction.statusPesanan?.trim().toUpperCase() === "REVIEW" && (
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
                {selectedTransaction.statusPesanan?.trim().toUpperCase() === "PROCESS" && (
                  <button
                    onClick={() => setShowInvoiceModal(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak Invoice</span>
                  </button>
                )}
                {selectedTransaction.statusPesanan?.trim().toUpperCase() ===
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
                {selectedTransaction.statusPaid?.trim().toUpperCase() !==
                  "PAID" &&
                  selectedTransaction.statusPesanan?.trim().toUpperCase() ===
                    "DONE" && (
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
                    "bg-blue-600 hover:bg-blue-700",
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
              <h4 className="font-bold text-gray-900 text-center mb-4">
                Preview Foto Pengiriman
              </h4>
              <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center min-h-[300px]">
                {previewItem.photo ? (
                  <img
                    src={previewItem.photo}
                    alt="Bukti"
                    className="w-full h-auto object-contain max-h-[60vh]"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <Camera className="w-12 h-12 opacity-50" />
                    <p className="text-sm font-medium">Tidak ada foto</p>
                  </div>
                )}
              </div>
              <div className="text-center pt-2">
                <p className="text-sm font-semibold text-gray-900">
                  {previewItem.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {previewItem.penerima}
                </p>
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
                <h3 className="font-bold text-gray-900">Detail Pesanan Produk</h3>
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
                        <ShoppingBag className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{selectedProductDetail.name}</h4>
                    <p className="text-sm text-gray-500">ID: {selectedProductDetail.prodId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Jumlah</p>
                    <p className="font-bold text-gray-900">{selectedProductDetail.qty}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Harga Satuan</p>
                    <p className="font-bold text-gray-900">{formatIDR(selectedProductDetail.price)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 flex justify-between items-center">
                    <p className="text-xs font-medium text-gray-500">Subtotal</p>
                    <p className="font-bold text-teal-600 text-lg">{formatIDR(selectedProductDetail.subtotal || selectedProductDetail.amount)}</p>
                  </div>
                </div>

                {selectedProductDetail.statusKirim && selectedProductDetail.statusKirim.trim() !== "" && (
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-900">Status Pengiriman</p>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-md text-center whitespace-nowrap",
                        selectedProductDetail.statusKirim.trim().toUpperCase() === "DI TERIMA"
                          ? "text-emerald-700 bg-emerald-100"
                          : "text-blue-700 bg-blue-100"
                      )}>
                        {selectedProductDetail.statusKirim}
                      </span>
                    </div>

                    {selectedProductDetail.penerima && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-100/50">
                        {(() => {
                          const userObj = systemUsers.find(
                            (u) =>
                              u.email === selectedProductDetail.penerima.toLowerCase()
                          );
                          const displayName = userObj
                            ? userObj.fullName || userObj.nameOrEmail
                            : selectedProductDetail.penerima;
                          const initial = displayName
                            ? displayName.substring(0, 2).toUpperCase()
                            : "U";
                          return (
                            <>
                              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0 overflow-hidden">
                                {userObj?.photo ? (
                                  <img src={userObj.photo} alt={displayName} className="w-full h-full object-cover" />
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
                        <p className="text-xs font-medium text-gray-500 mb-2">Bukti Penerimaan</p>
                        <div className="rounded-xl overflow-hidden border border-gray-200">
                          <img src={selectedProductDetail.photo} alt="Bukti Penerimaan" className="w-full h-auto object-cover max-h-48" />
                        </div>
                      </div>
                    )}

                    {selectedProductDetail.keterangan && (
                      <div className="mt-3 bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1">Keterangan</p>
                        <p className="text-sm text-gray-800">{selectedProductDetail.keterangan}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
