import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Plus, Search, FileText, FileDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import AddProductModal from '../components/AddProductModal';
import ExportPdfModal from '../components/ExportPdfModal';

export default function CategoryProducts() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const decodedCategory = decodeURIComponent(categoryName || '');
  
  const products = useStore((state) => state.products).filter((p) => p.category === decodedCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/catalog"
            className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs active:scale-95"
            title="Retour aux catégories"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{decodedCategory}</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {products.length} référence{products.length > 1 ? 's' : ''} enregistrée{products.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportPdfOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-teal-600/30 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100/70 transition-colors shadow-2xs active:scale-95"
            title="Exporter l'inventaire de cette catégorie en PDF"
          >
            <FileDown className="h-4 w-4 text-teal-700" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex-2 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter Produit</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={`Rechercher dans ${decodedCategory}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all shadow-2xs"
        />
      </div>

      {/* MOBILE CARDS VIEW (< sm) - Optimized for iOS & Android finger tapping */}
      <div className="block sm:hidden space-y-2.5">
        {filteredProducts.map((product) => {
          const stock = getCurrentStock(product);
          const isLowStock = stock <= product.stockSecurite;
          const isBlank = product.transactions.length === 0;

          return (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs active:bg-slate-50 transition-colors"
            >
              <div className="space-y-1 pr-3 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={clsx(
                    "text-sm font-bold truncate",
                    product.isImportant ? "text-red-600" : "text-slate-900"
                  )}>
                    {product.name}
                  </span>
                  {product.isImportant && (
                    <span className="rounded bg-red-100 text-red-800 text-[10px] px-1.5 font-bold">
                      Important
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Sécurité : {product.stockSecurite}</span>
                  {product.enRuptureHopital ? (
                    <span className="text-rose-600 font-bold">• Rupture Hôpital</span>
                  ) : isBlank ? (
                    <span className="text-slate-400">• Vierge</span>
                  ) : isLowStock ? (
                    <span className="text-amber-600 font-bold">• Stock bas</span>
                  ) : (
                    <span className="text-emerald-600">• Dispo</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className={clsx(
                    "block text-base font-black leading-none",
                    isBlank ? "text-slate-400 text-xs" : stock <= 0 ? "text-rose-600" : stock <= product.stockSecurite ? "text-amber-600" : "text-teal-900"
                  )}>
                    {isBlank ? '0 (vierge)' : stock}
                  </span>
                  <span className="text-[10px] text-slate-400">en stock</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* DESKTOP & TABLET TABLE VIEW (sm and up) */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/80">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Médicament / Matériel
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Effectif / Stock Réel
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Stock Sécurité
              </th>
              <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Statut
              </th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredProducts.map((product) => {
              const stock = getCurrentStock(product);
              const isLowStock = stock <= product.stockSecurite;
              const isBlank = product.transactions.length === 0;

              return (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/product/${product.id}`}
                        className={clsx(
                          "font-semibold text-sm hover:underline",
                          product.isImportant ? "text-red-600 hover:text-red-700" : "text-slate-800 hover:text-teal-700"
                        )}
                      >
                        {product.name}
                      </Link>
                      {product.isImportant && (
                        <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                          Important
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {isBlank ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                        0 (vierge)
                      </span>
                    ) : (
                      <span className={clsx(
                        "text-base font-bold",
                        stock <= 0 ? "text-rose-600" : stock <= product.stockSecurite ? "text-amber-600" : "text-emerald-700"
                      )}>
                        {stock}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-500">
                    {product.stockSecurite}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {product.enRuptureHopital ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        <AlertCircle className="h-3 w-3" />
                        Rupture Hôpital
                      </span>
                    ) : isBlank ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        À inventorier
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Stock Bas
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Disponible
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Link
                      to={`/product/${product.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Fiche Stock
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm">Aucun produit trouvé dans cette catégorie.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter le premier produit
          </button>
        </div>
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultCategory={decodedCategory}
      />
      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        defaultCategory={decodedCategory}
      />
    </div>
  );
}
