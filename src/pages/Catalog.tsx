import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { Link } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  Plus,
  Search,
  RotateCcw,
  PackageCheck,
  AlertCircle,
  FileDown,
  FileText,
  ShieldAlert,
  FileCode2,
  Edit3,
  Trash2,
  Check,
  X,
  CheckCircle2,
} from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import AddCategoryModal from '../components/AddCategoryModal';
import ResetConfirmModal from '../components/ResetConfirmModal';
import ExportPdfModal from '../components/ExportPdfModal';
import JsonBackupModal from '../components/JsonBackupModal';
import { ORDERED_CATEGORIES, sortCategories } from '../utils/categoryOrder';

export default function Catalog() {
  const products = useStore((state) => state.products);
  const customCategories = useStore((state) => state.customCategories);
  const renameCategory = useStore((state) => state.renameCategory);
  const deleteCategory = useStore((state) => state.deleteCategory);
  const safeProducts = Array.isArray(products) ? products : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productModalDefaultCategory, setProductModalDefaultCategory] = useState<string>('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [categoryModalInitialName, setCategoryModalInitialName] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isJsonBackupOpen, setIsJsonBackupOpen] = useState(false);

  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Combine product categories + standalone customCategories using custom clinical order
  const rawCategories = Array.from(
    new Set([
      ...(Array.isArray(customCategories) ? customCategories : []),
      ...safeProducts.map((p) => p?.category).filter(Boolean),
    ])
  ) as string[];
  const categories = sortCategories(rawCategories);

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

  const isStandardCategory = (cat: string) =>
    (ORDERED_CATEGORIES as readonly string[]).some((c) => c.toLowerCase() === cat.toLowerCase());

  const handleStartRename = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingCategory(category);
    setRenameInput(category);
    setFeedback(null);
  };

  const handleConfirmRename = (e: React.MouseEvent | React.FormEvent, oldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const res = renameCategory(oldName, renameInput);
    if (res.success) {
      setRenamingCategory(null);
      setFeedback({ type: 'success', text: `Catégorie renommée en « ${renameInput.trim()} ».` });
    } else {
      setFeedback({ type: 'error', text: res.message || 'Impossible de renommer cette catégorie.' });
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingCategory(null);
  };

  const handleDeleteCustomCategory = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    const res = deleteCategory(category);
    if (res.success) {
      setFeedback({ type: 'success', text: `Catégorie « ${category} » supprimée.` });
    } else {
      setFeedback({ type: 'error', text: res.message || 'Impossible de supprimer cette catégorie.' });
    }
  };

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
            onClick={() => setIsJsonBackupOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs active:scale-95"
            title="Télécharger ou importer toutes les données du stock au format JSON"
          >
            <FileCode2 className="h-3.5 w-3.5 text-teal-700" />
            <span className="hidden sm:inline">Données</span> JSON
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
            onClick={() => {
              setCategoryModalInitialName('');
              setIsAddCategoryOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-teal-700 bg-teal-50 px-3 py-2 text-xs sm:text-sm font-semibold text-teal-800 hover:bg-teal-100 transition-colors shadow-2xs active:scale-95"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Nouvelle Catégorie</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProductModalDefaultCategory('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5"
            aria-label="Fermer le message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
              enregistré ({Math.round((totalStockCount / (safeProducts.length || 1)) * 100)}%) •{' '}
              <strong className="font-semibold text-teal-900">{categories.length}</strong> catégories.
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

      {/* SPECIAL NARCOTIC SEPARATION CALLOUT */}
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0 mt-0.5">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                Stupéfiants (Tableau B)
              </span>
              <span className="text-xs font-bold text-rose-700">Gestion Isolée Sécurisée</span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-rose-950 mt-0.5">
              Fentanyl 100 µg & Fentanyl 500 µg — "Le Bon Danger"
            </h3>
            <p className="text-xs text-rose-800 mt-1 max-w-xl leading-relaxed">
              Le Fentanyl ne fait plus partie des fiches de stock générales : il est géré dans le registre sécurisé "Le Bon Danger" avec traçabilité stricte des ampoules vides reçues et archivage des bons de commande physiques scannés.
            </p>
          </div>
        </div>
        <Link
          to="/le-bon-danger"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs shrink-0 active:scale-95 transition-all"
        >
          <ShieldAlert className="h-4 w-4" />
          Ouvrir "Le Bon Danger"
        </Link>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => {
          const catProducts = safeProducts.filter((p) => p && p.category === category);
          const count = catProducts.length;
          const filledStockCount = catProducts.filter((p) => getCurrentStock(p) > 0).length;
          const importantCount = catProducts.filter((p) => p && p.isImportant).length;
          const rupturesCount = catProducts.filter((p) => p && p.enRuptureHopital).length;
          const isCustom = !isStandardCategory(category);
          const isRenaming = renamingCategory === category;

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
                  <div className="flex flex-wrap gap-1 justify-end items-center">
                    {isCustom && (
                      <span className="inline-flex rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200/70">
                        Personnalisée
                      </span>
                    )}
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
                    {isCustom && !isRenaming && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, category)}
                          className="p-1 rounded-md text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="Renommer cette catégorie"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {count === 0 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomCategory(e, category)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer cette catégorie vide"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isRenaming ? (
                  <div
                    className="flex items-center gap-1.5 mt-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <input
                      type="text"
                      value={renameInput}
                      maxLength={100}
                      onChange={(e) => setRenameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename(e, category);
                        if (e.key === 'Escape') setRenamingCategory(null);
                      }}
                      autoFocus
                      className="flex-1 min-w-0 rounded-lg border border-teal-400 px-2.5 py-1 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-teal-100"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleConfirmRename(e, category)}
                      className="p-1.5 rounded-lg bg-teal-700 text-white hover:bg-teal-800"
                      title="Valider"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Annuler"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <h3 className="font-bold text-slate-900 group-hover:text-teal-700 text-sm sm:text-base leading-snug">
                    {category}
                  </h3>
                )}
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
            Aucun produit ou catégorie ne correspond à votre recherche "{searchTerm}".
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategoryModalInitialName(searchTerm.trim());
                setIsAddCategoryOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              {searchTerm.trim()
                ? `Créer la catégorie « ${searchTerm.trim()} »`
                : 'Créer une nouvelle catégorie'}
            </button>
            <button
              type="button"
              onClick={() => {
                setProductModalDefaultCategory('');
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer un produit
            </button>
          </div>
        </div>
      )}

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        initialName={categoryModalInitialName}
        onCategoryCreated={(cat) => {
          setFeedback({
            type: 'success',
            text: `Nouvelle catégorie « ${cat} » créée et ajoutée au catalogue.`,
          });
        }}
        onCreateAndAddProduct={(cat) => {
          setProductModalDefaultCategory(cat);
          setIsAddModalOpen(true);
        }}
      />
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultCategory={productModalDefaultCategory}
      />
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
      <ExportPdfModal isOpen={isExportPdfOpen} onClose={() => setIsExportPdfOpen(false)} />
      <JsonBackupModal isOpen={isJsonBackupOpen} onClose={() => setIsJsonBackupOpen(false)} />
    </div>
  );
}
