import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  X, 
  Loader2, 
  AlertTriangle,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getSheetDataFromId, updateSheetDataFromId, getSpreadsheetMetadata } from '../lib/api';

const SPREADSHEET_ID = '1xmRW89YhuP1UjBmlSxB9aOsBDjczg3bvApyYkMcNSsk';
const TAB_NAME = 'Pesanan';

interface TransactionItem {
  id: string;
  originalIndex: number;
  tanggalPesan: string;
  idPesanan: string;
  idPelanggan: string;
  namaLengkap: string;
  alamatKirim: string;
  totalHarga: number;
  totalHargaRaw: string;
  statusPesanan: string;
  allFields: Record<string, string>;
  rawRow: any[];
}

interface DetailPesananItem {
  idPesanan: string;
  idProduk: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

// Convert zero-indexed column to Excel Column Letter (A, B, C...)
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export default function BoganathaTransactions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [data, setData] = useState<TransactionItem[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Subsidiary sheets state
  const [detailPesanan, setDetailPesanan] = useState<DetailPesananItem[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});

  // Form editing states
  const [editStatus, setEditStatus] = useState('Menunggu');
  const [editOngkir, setEditOngkir] = useState('0');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editDueDate, setEditDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Column detection indices mapping table
  const [columnIndices, setColumnIndices] = useState({
    statusPesananIdx: -1,
    ongkosKirimIdx: -1,
    diskonIdx: -1,
    totalBayarIdx: -1,
    dueDateIdx: -1,
    alamatKirimIdx: -1
  });

  // Load sheet data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch metadata first to get exact sheet titles
      let existingSheets: string[] = [];
      try {
        const metadata = await getSpreadsheetMetadata(SPREADSHEET_ID);
        if (metadata && metadata.sheets) {
          existingSheets = metadata.sheets.map((s: any) => s.properties.title);
        }
      } catch (err) {
        console.warn('Failed to fetch spreadsheet metadata, falling back to guessing tab names', err);
      }

      // Metadata-based Fallback Sheet Tab fetcher
      const fetchSheetWithFallback = async (spreadsheetId: string, possibleTabNames: string[], rangeSuffix = '!A1:Z5000') => {
        let tabToFetch = possibleTabNames[0];

        // If we successfully fetched metadata, find the exact matching tab
        if (existingSheets.length > 0) {
          const match = possibleTabNames.find(name => existingSheets.includes(name));
          if (match) {
            tabToFetch = match;
          } else {
            console.warn(`None of the tabs exist in the sheet: ${possibleTabNames.join(', ')}`);
            return null; // Don't even try to fetch if we know it doesn't exist
          }
        }
        
        try {
          const res = await getSheetDataFromId(spreadsheetId, `${tabToFetch}${rangeSuffix}`);
          if (res && res.values && res.values.length > 0) {
            return { tabName: tabToFetch, data: res };
          }
        } catch (e) {
          console.warn(`Optional sheet folder fallback failed for ${tabToFetch}`, e);
        }
        return null;
      };

      // Gather all related sheets concurrently
      const [pesananRes, pelangganRes, detailRes, productRes] = await Promise.all([
        getSheetDataFromId(SPREADSHEET_ID, `${TAB_NAME}!A1:Z5000`),
        fetchSheetWithFallback(SPREADSHEET_ID, ['Pelanggan', 'Customers', 'Customer', 'Warga', 'User']),
        fetchSheetWithFallback(SPREADSHEET_ID, ['Detail_Pesanan', 'Detail Pesanan', 'DetailPesanan', 'Detail_Order', 'Detail Order']),
        fetchSheetWithFallback(SPREADSHEET_ID, ['Product', 'Produk', 'Products', 'Item'])
      ]);

      if (!pesananRes || !pesananRes.values || pesananRes.values.length === 0) {
        setError("Tidak ada data ditemukan di Tabel 'Pesanan'.");
        return;
      }

      const pesananHeaders = pesananRes.values[0] as string[];
      setHeaders(pesananHeaders);
      setRawRows(pesananRes.values);

      // Detect Dynamic Columns inside Table "Pesanan"
      const getColIndex = (listHeaders: string[], keywords: string[]) => {
        return listHeaders.findIndex((h) => 
          keywords.some((kw) => h?.toLowerCase().replace(/[\s_-]/g, '').includes(kw))
        );
      };

      const tanggalPesanIdx = getColIndex(pesananHeaders, ['tanggalpesan', 'tglpesan', 'tanggal', 'date', 'hari', 'time']);
      const idPesananIdx = getColIndex(pesananHeaders, ['idpesanan', 'orderid', 'idorder', 'idpesan', 'pesananid']);
      const idPelangganIdx = getColIndex(pesananHeaders, ['idpelanggan', 'customerid', 'pelangganid', 'email', 'pelanggan', 'user']);
      const totalHargaIdx = getColIndex(pesananHeaders, ['totalharga', 'harga', 'total_price', 'total', 'bayar', 'amount', 'nominal']);
      const statusPesananIdx = getColIndex(pesananHeaders, ['statuspesanan', 'statuspessanan', 'status', 'pembayaran', 'konfirmasi']);
      const alamatKirimIdx = getColIndex(pesananHeaders, ['alamatkirim', 'alamat', 'alamatpengiriman', 'destination', 'address']);
      
      const ongkosKirimIdx = getColIndex(pesananHeaders, ['ongkoskirim', 'ongkir', 'shipping', 'biayalain', 'shippingfee', 'deliveryfee']);
      const diskonIdx = getColIndex(pesananHeaders, ['diskon', 'discount', 'potongan', 'diskonnominal']);
      const totalBayarIdx = getColIndex(pesananHeaders, ['totalbayar', 'bayartotal', 'total_bayar', 'totalbayar', 'total_payment']);
      const dueDateIdx = getColIndex(pesananHeaders, ['duedate', 'due_date', 'paymentdate', 'jatuhtempo']);

      setColumnIndices({
        statusPesananIdx,
        ongkosKirimIdx,
        diskonIdx,
        totalBayarIdx,
        dueDateIdx,
        alamatKirimIdx
      });

      // Build customer master detail mapping
      const customerMap: Record<string, { namaLengkap: string; alamat: string }> = {};
      if (pelangganRes && pelangganRes.data && pelangganRes.data.values && pelangganRes.data.values.length > 0) {
        const pelangganHeaders = pelangganRes.data.values[0] as string[];
        const pcustIdx = getColIndex(pelangganHeaders, ['idpelanggan', 'customerid', 'email', 'id', 'username']);
        const pnamaIdx = getColIndex(pelangganHeaders, ['namalengkap', 'nama', 'name', 'fullname', 'full_name']);
        const palamatIdx = getColIndex(pelangganHeaders, ['alamat', 'address', 'alamatkirim', 'domisili', 'tempat']);

        if (pcustIdx > -1) {
          pelangganRes.data.values.slice(1).forEach((row: any[]) => {
            const custIdKey = row[pcustIdx] !== undefined ? String(row[pcustIdx]).trim().toLowerCase() : '';
            const nameVal = pnamaIdx > -1 && row[pnamaIdx] !== undefined ? String(row[pnamaIdx]).trim() : '';
            const alamatVal = palamatIdx > -1 && row[palamatIdx] !== undefined ? String(row[palamatIdx]).trim() : '';
            if (custIdKey) {
              customerMap[custIdKey] = {
                namaLengkap: nameVal || custIdKey,
                alamat: alamatVal
              };
            }
          });
        }
      }

      // Build Product master dict
      const productMap: Record<string, string> = {};
      if (productRes && productRes.data && productRes.data.values && productRes.data.values.length > 0) {
        const productHeaders = productRes.data.values[0] as string[];
        const prodIdIdx = getColIndex(productHeaders, ['idproduk', 'productid', 'produk_id', 'id']);
        const prodNamaIdx = getColIndex(productHeaders, ['namaproduk', 'productname', 'nama_produk', 'name', 'nama']);

        if (prodIdIdx > -1 && prodNamaIdx > -1) {
          productRes.data.values.slice(1).forEach((row: any[]) => {
            const prodId = row[prodIdIdx] !== undefined ? String(row[prodIdIdx]).trim().toLowerCase() : '';
            const prodName = row[prodNamaIdx] !== undefined ? String(row[prodNamaIdx]).trim() : '';
            if (prodId && prodName) {
              productMap[prodId] = prodName;
            }
          });
        }
      }
      setProducts(productMap);

      // Parse Detail Pesanan
      const parsedDetails: DetailPesananItem[] = [];
      if (detailRes && detailRes.data && detailRes.data.values && detailRes.data.values.length > 0) {
        const detailHeaders = detailRes.data.values[0] as string[];
        const dpIdPesananIdx = getColIndex(detailHeaders, ['idpesanan', 'orderid', 'idorder', 'idpesan', 'pesananid']);
        const dpIdProdukIdx = getColIndex(detailHeaders, ['idproduk', 'productid', 'produk_id', 'itemid', 'item_id']);
        const dpJumlahIdx = getColIndex(detailHeaders, ['jumlah', 'qty', 'quantity', 'count', 'itemcount']);
        const dpHargaSatuanIdx = getColIndex(detailHeaders, ['hargasatuan', 'harga', 'unitprice', 'unit_price', 'rate']);
        const dpSubtotalIdx = getColIndex(detailHeaders, ['subtotal', 'total', 'amount', 'sub_total']);

        detailRes.data.values.slice(1).forEach((row: any[]) => {
          const idPesananVal = dpIdPesananIdx > -1 && row[dpIdPesananIdx] !== undefined ? String(row[dpIdPesananIdx]).trim() : '';
          const idProdukVal = dpIdProdukIdx > -1 && row[dpIdProdukIdx] !== undefined ? String(row[dpIdProdukIdx]).trim() : '';
          const jumlahVal = dpJumlahIdx > -1 && row[dpJumlahIdx] !== undefined ? parseFloat(String(row[dpJumlahIdx]).replace(/[^\d.-]/g, '')) || 0 : 0;
          const hargaSatuanVal = dpHargaSatuanIdx > -1 && row[dpHargaSatuanIdx] !== undefined ? parseFloat(String(row[dpHargaSatuanIdx]).replace(/[^\d.-]/g, '')) || 0 : 0;
          const subtotalVal = dpSubtotalIdx > -1 && row[dpSubtotalIdx] !== undefined ? parseFloat(String(row[dpSubtotalIdx]).replace(/[^\d.-]/g, '')) || 0 : 0;

          if (idPesananVal) {
            parsedDetails.push({ 
              idPesanan: idPesananVal, 
              idProduk: idProdukVal, 
              jumlah: jumlahVal, 
              hargaSatuan: hargaSatuanVal, 
              subtotal: subtotalVal 
            });
          }
        });
      }
      setDetailPesanan(parsedDetails);

      // Map rows of "Pesanan" table
      const parsedItems: TransactionItem[] = pesananRes.values.slice(1).map((row: any[], index: number) => {
        const itemMap: Record<string, string> = {};
        pesananHeaders.forEach((h, colI) => {
          itemMap[h || `Kolom ${colI + 1}`] = row[colI] !== undefined ? String(row[colI]) : '';
        });

        const rawHargaVal = totalHargaIdx > -1 && row[totalHargaIdx] !== undefined ? String(row[totalHargaIdx]) : '0';
        const parsedHargaNum = parseFloat(rawHargaVal.replace(/[^\d.-]/g, '')) || 0;

        const custIdRaw = idPelangganIdx > -1 && row[idPelangganIdx] !== undefined ? String(row[idPelangganIdx]).trim() : '';
        const custIdKey = custIdRaw.toLowerCase();
        
        // Resolve nested user profile mapping
        const namaLengkap = customerMap[custIdKey]?.namaLengkap || custIdRaw || 'Pelanggan Umum';
        const alamatKirimFallback = customerMap[custIdKey]?.alamat || '';

        const alamatKirimDirect = alamatKirimIdx > -1 && row[alamatKirimIdx] !== undefined ? String(row[alamatKirimIdx]).trim() : '';
        const alamatKirim = alamatKirimDirect || alamatKirimFallback || '-';

        return {
          id: `pesanan-${index}`,
          originalIndex: index + 1,
          tanggalPesan: tanggalPesanIdx > -1 && row[tanggalPesanIdx] !== undefined ? String(row[tanggalPesanIdx]) : '-',
          idPesanan: idPesananIdx > -1 && row[idPesananIdx] !== undefined ? String(row[idPesananIdx]) : '-',
          idPelanggan: custIdRaw,
          namaLengkap,
          alamatKirim,
          totalHarga: parsedHargaNum,
          totalHargaRaw: rawHargaVal,
          statusPesanan: statusPesananIdx > -1 && row[statusPesananIdx] !== undefined ? String(row[statusPesananIdx]).trim() : 'Menunggu',
          allFields: itemMap,
          rawRow: row
        };
      });

      setData(parsedItems);
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat data dari spreadsheet. Periksa koneksi internet atau hak akses Anda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format amount to Indonesian Rupiah
  const formatIDR = (value: number) => {
    if (!value || isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Helper parsing numbers
  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
  };

  // Compute subtotal dynamically for orderId
  const getSubtotalSum = (orderId: string) => {
    const matched = detailPesanan.filter(dp => dp.idPesanan.toLowerCase() === orderId.toLowerCase());
    if (matched.length > 0) {
      return matched.reduce((sum, item) => sum + (item.subtotal || (item.jumlah * item.hargaSatuan)), 0);
    }
    // Fallback to total_harga on item
    const found = data.find(d => d.idPesanan.toLowerCase() === orderId.toLowerCase());
    return found ? found.totalHarga : 0;
  };

  // Compute running total billing tagihan dynamically
  const getComputedTotalBayar = () => {
    if (!selectedTx) return 0;
    const subtotal = getSubtotalSum(selectedTx.idPesanan);
    const ongkir = parseNum(editOngkir);
    
    // Parse discount (either flat number or percentage string, e.g. "10%")
    let discount = 0;
    const discStr = editDiscount.trim();
    if (discStr.endsWith('%')) {
      const percentage = parseFloat(discStr.slice(0, -1)) || 0;
      discount = (subtotal * percentage) / 100;
    } else {
      discount = parseNum(discStr);
    }

    return Math.max(0, subtotal + ongkir - discount);
  };

  // Status Badge visualizer
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (['selesai', 'lunas', 'paid', 'success', 'done', 'approved', 'diambil', 'sent', 'terkirim'].some(kw => s.includes(kw) || kw.includes(s))) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center whitespace-nowrap">
          {status}
        </span>
      );
    }
    if (['batal', 'cancel', 'failed', 'ditolak', 'void'].some(kw => s.includes(kw) || kw.includes(s))) {
      return (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center whitespace-nowrap">
          {status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center whitespace-nowrap">
        {status || 'Menunggu'}
      </span>
    );
  };

  const handleOpenDetail = (item: TransactionItem) => {
    setSelectedTx(item);
    
    // Prefill form states on edit open
    const rawOngkir = item.allFields[headers[columnIndices.ongkosKirimIdx]] || '0';
    const rawDiscount = item.allFields[headers[columnIndices.diskonIdx]] || '0';
    const rawDueDate = item.allFields[headers[columnIndices.dueDateIdx]] || '';

    setEditStatus(item.statusPesanan);
    setEditOngkir(rawOngkir);
    setEditDiscount(rawDiscount);

    // Format due date cleanly to date-picker standards
    let dateStr = '';
    if (rawDueDate) {
      const parsedTime = new Date(rawDueDate);
      if (!isNaN(parsedTime.getTime())) {
        dateStr = parsedTime.toISOString().split('T')[0];
      } else {
        dateStr = rawDueDate;
      }
    }
    setEditDueDate(dateStr);
  };

  // Submit back edited values of table row to Google sheet API
  const handleSubmitUpdate = async () => {
    if (!selectedTx) return;
    setSubmitting(true);
    try {
      const sheetRow = selectedTx.originalIndex + 1; // 1-indexed header is row 1
      
      // Copy full sheet row arrays
      const rowValues = [...rawRows[selectedTx.originalIndex]];
      const maxIdx = Math.max(
        columnIndices.statusPesananIdx,
        columnIndices.ongkosKirimIdx,
        columnIndices.diskonIdx,
        columnIndices.totalBayarIdx,
        columnIndices.dueDateIdx
      );
      while (rowValues.length <= maxIdx) {
        rowValues.push('');
      }

      const calculatedTotal = getComputedTotalBayar();
      const targetStatus = "SENT";

      // Set new indices
      if (columnIndices.statusPesananIdx > -1) rowValues[columnIndices.statusPesananIdx] = targetStatus;
      if (columnIndices.ongkosKirimIdx > -1) rowValues[columnIndices.ongkosKirimIdx] = editOngkir;
      if (columnIndices.diskonIdx > -1) rowValues[columnIndices.diskonIdx] = editDiscount;
      if (columnIndices.totalBayarIdx > -1) rowValues[columnIndices.totalBayarIdx] = String(calculatedTotal);
      if (columnIndices.dueDateIdx > -1) rowValues[columnIndices.dueDateIdx] = editDueDate;

      const endLetter = getColumnLetter(rowValues.length - 1);
      const range = `${TAB_NAME}!A${sheetRow}:${endLetter}${sheetRow}`;

      await updateSheetDataFromId(SPREADSHEET_ID, range, [rowValues]);

      // Apply changes to local states array
      setData(prev => prev.map((item) => {
        if (item.id === selectedTx.id) {
          const updatedFields = { ...item.allFields };
          if (headers[columnIndices.statusPesananIdx]) updatedFields[headers[columnIndices.statusPesananIdx]] = targetStatus;
          if (headers[columnIndices.ongkosKirimIdx]) updatedFields[headers[columnIndices.ongkosKirimIdx]] = editOngkir;
          if (headers[columnIndices.diskonIdx]) updatedFields[headers[columnIndices.diskonIdx]] = editDiscount;
          if (headers[columnIndices.totalBayarIdx]) updatedFields[headers[columnIndices.totalBayarIdx]] = String(calculatedTotal);
          if (headers[columnIndices.dueDateIdx]) updatedFields[headers[columnIndices.dueDateIdx]] = editDueDate;

          return {
            ...item,
            statusPesanan: targetStatus,
            totalHarga: calculatedTotal,
            totalHargaRaw: String(calculatedTotal),
            allFields: updatedFields,
            rawRow: rowValues
          };
        }
        return item;
      }));

      // Update cached matrix rows
      setRawRows(prev => {
        const copy = [...prev];
        copy[selectedTx.originalIndex] = rowValues;
        return copy;
      });

      // Update selectedTx state too so UI renders "Pesanan Terkirim" dynamically
      setSelectedTx(prev => {
        if (!prev) return null;
        const updatedFields = { ...prev.allFields };
        if (headers[columnIndices.statusPesananIdx]) updatedFields[headers[columnIndices.statusPesananIdx]] = targetStatus;
        if (headers[columnIndices.ongkosKirimIdx]) updatedFields[headers[columnIndices.ongkosKirimIdx]] = editOngkir;
        if (headers[columnIndices.diskonIdx]) updatedFields[headers[columnIndices.diskonIdx]] = editDiscount;
        if (headers[columnIndices.totalBayarIdx]) updatedFields[headers[columnIndices.totalBayarIdx]] = String(calculatedTotal);
        if (headers[columnIndices.dueDateIdx]) updatedFields[headers[columnIndices.dueDateIdx]] = editDueDate;
        return {
          ...prev,
          statusPesanan: targetStatus,
          totalHarga: calculatedTotal,
          totalHargaRaw: String(calculatedTotal),
          allFields: updatedFields,
        };
      });

      alert('Berhasil mengirim pesanan!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal memperbarui status transaksi: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-12">
      
      {/* HEADER SECTION - bg-primary-600 with white layout back-to-home indicator */}
      <div className="sticky top-0 bg-primary-600 px-4 py-4 sm:px-6 flex items-center gap-3 shadow-md z-30">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer active:scale-95 duration-100 text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">
          Daftar Pesanan
        </h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        
        {/* LOADING STATE INDICATOR */}
        {loading && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
            <p className="text-sm font-semibold text-gray-500">Menghubungkan ke database Boganatha...</p>
            <p className="text-xs text-gray-400 mt-1 font-sans">Mengambil daftar pesanan real-time dari Google Sheets</p>
          </div>
        )}

        {/* ERROR BOUNDARY MESSAGE CONTAINER */}
        {error && !loading && (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Ups! Terjadi Masalah</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">{error}</p>
            <button 
              onClick={() => fetchData()}
              className="mt-5 px-6 py-2.5 bg-primary-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md cursor-pointer active:scale-95 duration-100"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* COMPACT CLEAN ORDERS LIST */}
        {!loading && !error && (
          <div className="space-y-4">
            {data.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-700">Tidak Ada Transaksi Ditemukan</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">Database pesanan saat ini kosong atau sedang diperbarui.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        onClick={() => handleOpenDetail(item)}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-50/10 cursor-pointer text-left transition-all duration-300 relative group flex justify-between items-center"
                      >
                        {/* Content Area - Ordered strictly top to bottom */}
                        <div className="space-y-2 flex-1 pr-6">
                          
                          {/* 1. tanggal_pesan */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.tanggalPesan}</span>
                          </div>

                          {/* 2. id_pesanan */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-md">
                              Order ID: {item.idPesanan}
                            </span>
                          </div>

                          {/* 3. customer ID mapped with Pelanggan nama_lengkap */}
                          <div className="pt-0.5">
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-primary-600 transition-colors">
                              {item.namaLengkap}
                            </h3>
                          </div>

                          {/* 4. total_harga status row */}
                          <div className="pt-1">
                            <span className="text-base font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-100/40">
                              {item.totalHarga > 0 ? formatIDR(item.totalHarga) : (item.totalHargaRaw || 'Rp 0')}
                            </span>
                          </div>

                        </div>

                        {/* 5. status_pesanan inside top right corner */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                          {getStatusBadge(item.statusPesanan)}
                          <div className="p-2 border border-gray-50 bg-gray-50/40 rounded-2xl text-gray-300 group-hover:text-primary-600 group-hover:border-emerald-100 group-hover:bg-emerald-50/30 transition-all flex items-center justify-center">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>

                {/* Halaman/Pagination Controls di depan/atas footer */}
                {Math.ceil(data.length / ITEMS_PER_PAGE) > 1 && (
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm font-sans">
                    <div className="text-xs sm:text-sm font-semibold text-slate-500">
                      Menampilkan <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, data.length)}</span> - <span className="text-slate-800 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, data.length)}</span> dari <span className="text-slate-800 font-bold">{data.length}</span> Pesanan
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-100 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 transition-all text-slate-700 cursor-pointer flex items-center gap-1 active:scale-95 duration-100"
                      >
                        Sebelumnya
                      </button>
                      
                      {Array.from({ length: Math.ceil(data.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((pageNum) => {
                        const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
                        const isNear = Math.abs(pageNum - currentPage) <= 1 || pageNum === 1 || pageNum === totalPages;
                        if (!isNear) {
                          if (pageNum === 2 || pageNum === totalPages - 1) {
                            return <span key={pageNum} className="text-slate-400 px-1 text-xs font-bold leading-none">...</span>;
                          }
                          return null;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "w-9 h-9 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center border active:scale-95 duration-100",
                              currentPage === pageNum
                                ? "bg-primary-600 text-white border-transparent shadow-md shadow-emerald-500/15"
                                : "border-gray-100 bg-slate-50 text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(data.length / ITEMS_PER_PAGE)))}
                        disabled={currentPage === Math.ceil(data.length / ITEMS_PER_PAGE)}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-100 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 transition-all text-slate-700 cursor-pointer flex items-center gap-1 active:scale-95 duration-100"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / SIDEBAR MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTx(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Content Drawer Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-screen shadow-2xl overflow-y-auto flex flex-col pt-4 text-left"
            >
              
              {/* Drawer Header - Title cleaned up */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Detail Transaksi</h2>
                </div>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="p-2 bg-gray-50 cursor-pointer active:scale-95 duration-100 text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* CARD 1 - Core Identifiers (status_pesanan on top right, id_pesanan as hero element) */}
              <div className="bg-white p-5 mx-6 mt-4 rounded-3xl border border-gray-100 shadow-sm relative text-left">
                {/* Status on top-right */}
                <div className="absolute top-5 right-5">
                  {getStatusBadge(selectedTx.statusPesanan)}
                </div>

                {/* Main identifier: ID Pesanan */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-gray-400">ID Pesanan</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                      {selectedTx.idPesanan}
                    </h3>
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Tanggal Pesan</span>
                      <span className="text-sm font-bold text-gray-800">{selectedTx.tanggalPesan}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">ID Pelanggan</span>
                      <span className="text-sm font-semibold text-slate-500 break-all">{selectedTx.idPelanggan || '-'}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Alamat Kirim</span>
                      <span className="text-sm font-bold text-gray-800">
                        {selectedTx.alamatKirim || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2 - Product details linked via Detail_Pesanan and Product table */}
              <div className="bg-white p-5 mx-6 mt-4 rounded-3xl border border-gray-100 shadow-sm text-left">
                <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-3 border-b border-dashed border-gray-100 pb-2 flex items-center justify-between">
                  <span>Daftar Produk</span>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {detailPesanan.filter(dp => dp.idPesanan.toLowerCase() === selectedTx.idPesanan.toLowerCase()).length} Item
                  </span>
                </h4>

                <div className="space-y-4">
                  {detailPesanan.filter(dp => dp.idPesanan.toLowerCase() === selectedTx.idPesanan.toLowerCase()).length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">Tidak ada rincian produk untuk pesanan ini.</p>
                  ) : (
                    detailPesanan
                      .filter(dp => dp.idPesanan.toLowerCase() === selectedTx.idPesanan.toLowerCase())
                      .map((sub, sIdx) => {
                        const prodName = products[sub.idProduk.toLowerCase()] || sub.idProduk || 'Produk Tidak Dikenal';
                        return (
                          <div key={sIdx} className="flex justify-between items-start py-2.5 border-b border-gray-100/60 last:border-0 last:pb-0">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-800 leading-tight">
                                {prodName}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <span>Qty: {sub.jumlah}</span>
                                <span>•</span>
                                <span>{formatIDR(sub.hargaSatuan)} / pcs</span>
                              </div>
                            </div>
                            <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">
                              {formatIDR(sub.subtotal || (sub.jumlah * sub.hargaSatuan))}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* CARD 3 - Billing form inputs & final updates */}
              <div className="bg-white p-5 mx-6 mt-4 mb-10 rounded-3xl border border-gray-100 shadow-sm text-left space-y-4">
                <h4 className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 border-b border-dashed border-gray-100 pb-2">
                  Rincian Pembayaran & Status
                </h4>

                {/* Total Nominal */}
                <div className="flex justify-between items-center text-sm py-1 border-b border-gray-50 pb-2">
                  <span className="font-semibold text-slate-500">Total Nominal (Subtotal)</span>
                  <span className="font-bold text-slate-800">{formatIDR(getSubtotalSum(selectedTx.idPesanan))}</span>
                </div>

                {/* Biaya Lain (ongkos_kirim) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-500">Biaya Lain (Ongkos Kirim)</label>
                  <input
                    type="text"
                    value={editOngkir}
                    onChange={(e) => setEditOngkir(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-slate-800"
                  />
                </div>

                {/* Discount (diskon) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-500">Discount (Diskon)</label>
                  <input
                    type="text"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    placeholder="Contoh: 10% atau 15000 atau REDEEM50"
                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-slate-800"
                  />
                </div>

                {/* Due Date (due_date) */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-500">Due Date (Jatuh Tempo)</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-slate-800 cursor-pointer"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Total Tagihan (total_bayar) banner */}
                <div className="border-t border-dashed border-gray-100 pt-4 flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Tagihan (Total Bayar)</p>
                    <p className="text-lg font-black text-emerald-600 mt-0.5">
                      {formatIDR(getComputedTotalBayar())}
                    </p>
                  </div>
                </div>

                {/* Kirim Button */}
                {selectedTx.statusPesanan === "SENT" ? (
                  <div className="w-full mt-2 bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-sm py-4 px-4 rounded-2xl text-center flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Pesanan Terkirim</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitUpdate}
                    disabled={submitting}
                    className="w-full mt-2 cursor-pointer bg-primary-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] duration-150 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan Perubahan...</span>
                      </>
                    ) : (
                      <span>Kirim Pesanan</span>
                    )}
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
