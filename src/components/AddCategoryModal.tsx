import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, FolderPlus, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { ORDERED_CATEGORIES, sortCategories } from '../utils/categoryOrder';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onCategoryCreated?: (categoryName: string) => void;
  onCreateAndAddProduct?: (categoryName: string) => void;
}

export default function AddCategoryModal({
  isOpen,
  onClose,
  initialName = '',
  onCategoryCreated,
  onCreateAndAddProduct,
}: AddCategoryModalProps) {
  const products = useStore((state) => state.products);
  const customCategories = useStore((state) => state.customCategories);
  const addCategory = useStore((state) => state.addCategory);

  const [categoryName, setCategoryName] = useState(initialName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCategoryName(initialName);
      setError('');
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const existingCategories = sortCategories(
    Array.from(
      new Set<string>([
        ...ORDERED_CATEGORIES,
        ...(customCategories || []),
        ...(products || []).map((p) => p?.category).filter(Boolean),
      ])
    )
  );

  const createCategory = (openProductModalAfter: boolean) => {
    setError('');
    const result = addCategory(categoryName);
    if (!result.success || !result.category) {
      setError(result.message || 'Impossible de créer cette catégorie.');
      return;
    }

    const created = result.category;
    setCategoryName('');
    onClose();

    if (openProductModalAfter && onCreateAndAddProduct) {
      onCreateAndAddProduct(created);
    } else if (onCategoryCreated) {
      onCategoryCreated(created);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCategory(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700/80 text-teal-200">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nouvelle Catégorie</h2>
              <p className="text-xs text-teal-200">Ajouter une classe au catalogue du bloc</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-200 hover:bg-teal-700 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nom de la nouvelle catégorie <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              autoFocus
              placeholder="Ex: Antalgiques paliers III, Sutures ophtalmiques, Désinfectants..."
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Elle apparaîtra immédiatement dans le catalogue, les fiches de stock, l'inventaire et les bons de commande.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
              Catégories existantes ({existingCategories.length}) :
            </p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {existingCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-block rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            {onCreateAndAddProduct && (
              <button
                type="button"
                onClick={() => createCategory(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Créer + ajouter un produit
              </button>
            )}
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Créer la catégorie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
