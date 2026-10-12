import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { Link } from 'react-router-dom';
import { Folder, Plus, Search, RotateCcw, PackageCheck, AlertCircle, FileDown, FileText } from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import ResetConfirmModal from '../components/ResetConfirmModal';
import ExportPdfModal from '../components/ExportPdfModal';

export default function Catalog() {
  const products = useStore((state) => state.products);
  const safeProducts = Array.isArray(products) ? products : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Group by category
  const categories = Array.from(new Set(safeProducts.map((p) => p?.category).filter(Boolean))).sort() as string[];

  // Filter categories and products
  const filteredCategories = categories.filter((category) => {
    if (!searchTerm) return true;
    const catMatches = category.toLowerCase().includes(searchTerm.toLowerCase());
    const prodMatches = safeProducts.some(
      (p) => p && p.category === category && (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return catMatches || prodMatches;
  });

  // Calculate statistics
  const totalStockCount = safeProducts.reduce((sum, p) => sum + (getCurrentStock(p) > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            Catalogue & Catégories
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Organisation des produits par classe thérapeutique et matériel de bloc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Direct link to Fiches de Stock */}
          <Link
            to="/fiches-de-stock"
            className="flex items-center gap-1.5 rounded-xl border border-teal-700 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors shadow-2xs active:scale-95"
            title="Consulter les Fiches de Stock"
          >
            <FileText className="h-4 w-4 text-teal-700" />
            <span>Fiches de Stock</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsExportPdfOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-teal-600/30 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100/70 transition-colors shadow-2xs active:scale-95"
            title="Exporter l'inventaire en format PDF officiel"
          >
            <FileDown className="h-3.5 w-3.5 text-teal-700" />
            <span className="hidden sm:inline">Rapport</span> PDF
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-2xs active:scale-95"
            title="Effacer les mouvements pour démarrer l'inventaire à blanc"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remise à zéro</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {/* Inventory Status Banner */}
      <div className="rounded-xl border border-teal-200/70 bg-teal-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-teal-600 p-2 text-white shrink-0">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-950">État d'avancement de l'inventaire</h3>
            <p className="text-xs text-teal-800">
              <strong className="font-semibold text-teal-900">{totalStockCount}</strong> sur{' '}
              <strong className="font-semibold text-teal-900">{safeProducts.length}</strong> produits ont un effectif
              enregistré ({Math.round((totalStockCount / (safeProducts.length || 1)) * 100)}%).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportPdfOpen(true)}
            className="text-xs font-semibold text-teal-900 bg-white border border-teal-300 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-teal-50 flex items-center gap-1 active:scale-95"
          >
            <FileDown className="h-3.5 w-3.5 text-teal-700" />
            Générer Rapport Mensuel (PDF)
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher une catégorie ou un médicament (ex: Anesthésie, Propofol, Suture, Guedel)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all shadow-2xs"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => {
          const catProducts = safeProducts.filter((p) => p && p.category === category);
          const count = catProducts.length;
          const filledStockCount = catProducts.filter((p) => getCurrentStock(p) > 0).length;
          const importantCount = catProducts.filter((p) => p && p.isImportant).length;
          const rupturesCount = catProducts.filter((p) => p && p.enRuptureHopital).length;

          return (
            <Link
              key={category}
              to={`/catalog/${encodeURIComponent(category)}`}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all group active:scale-98"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {rupturesCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/60">
                        <AlertCircle className="h-3 w-3" />
                        {rupturesCount} rupture{rupturesCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {importantCount > 0 && (
                      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200/60">
                        {importantCount} important{importantCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 group-hover:text-teal-700 text-sm sm:text-base leading-snug">
                  {category}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{count} références</span>
                <span className={filledStockCount > 0 ? 'text-teal-700 font-semibold' : 'text-slate-400'}>
                  {filledStockCount} avec stock saisi
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Folder className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">Aucune catégorie trouvée</h3>
          <p className="text-xs text-slate-500 mt-1">
            Aucun produit ne correspond à votre recherche "{searchTerm}".
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un produit avec cette catégorie
          </button>
        </div>
      )}

      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
      <ExportPdfModal isOpen={isExportPdfOpen} onClose={() => setIsExportPdfOpen(false)} />
    </div>
  );
}
