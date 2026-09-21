import React, { useState } from "react";
import { Search, Plus, Minus, X, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface ProductOption {
  id: string;
  name: string;
  price?: number;
  image?: string;
}

export interface DraftProductItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface AddProductDropdownProps {
  products: ProductOption[];
  onSave: (items: DraftProductItem[]) => Promise<void>;
  onClose: () => void;
}

export const AddProductDropdown: React.FC<AddProductDropdownProps> = ({
  products,
  onSave,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftItems, setDraftItems] = useState<DraftProductItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter products by searchQuery, matching nama_produk
  const filteredProducts = products.filter((p) => {
    if (!p.name) return false;
    return p.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const handleSelectProduct = (product: ProductOption) => {
    setDraftItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === product.id);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price || 0,
          qty: 1,
        },
      ];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setDraftItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as DraftProductItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    if (draftItems.length === 0) return;
    try {
      setIsSaving(true);
      await onSave(draftItems);
      setDraftItems([]);
      setSearchQuery("");
      onClose();
    } catch (err) {
      console.error("Gagal menyimpan produk:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Tambah Produk Pesanan</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Top: Searching Column */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama produk..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Product Options Dropdown List (displays ONLY nama_produk) */}
          <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-1 bg-gray-50/50">
            {filteredProducts.length > 0 ? (
              filteredProducts.slice(0, 30).map((prod) => {
                const inDraft = draftItems.find((d) => d.id === prod.id);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex justify-between items-center cursor-pointer",
                      inDraft
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-white text-gray-800"
                    )}
                  >
                    <span className="truncate">{prod.name}</span>
                    {inDraft && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold ml-2">
                        +{inDraft.qty}
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 py-3 text-center">
                Produk tidak ditemukan
              </p>
            )}
          </div>

          {/* Draft List ("tempat produk yang terpilih dari dropdown tersebut (tempat draft list)") */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2 flex justify-between items-center">
              <span>Produk Terpilih (Draft List):</span>
              <span className="text-gray-400 font-normal">
                {draftItems.length} produk
              </span>
            </p>

            {draftItems.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {draftItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100/60"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {item.name}
                      </p>
                    </div>

                    {/* Right side: Icon tambah (+) or kurang (-) and Hapus */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors cursor-pointer"
                          title="Kurang"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 min-w-[18px] text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors cursor-pointer"
                          title="Tambah"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center">
                <p className="text-xs text-gray-400">
                  Belum ada produk yang dipilih. Klik nama produk di atas untuk memilih.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Simpan Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={draftItems.length === 0 || isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
