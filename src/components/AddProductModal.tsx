import { useState } from 'react';
import { useStore } from '../store';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  onProductAdded?: (productId?: string) => void;
}

export default function AddProductModal({
  isOpen,
  onClose,
  defaultCategory = '',
  onProductAdded,
}: AddProductModalProps) {
  const products = useStore((state) => state.products);
  const addProduct = useStore((state) => state.addProduct);

  // List existing unique categories sorted
  const existingCategories = Array.from(new Set(products.map((p) => p.category))).sort();

  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || (existingCategories[0] || ''));
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isImportant, setIsImportant] = useState(true);
  const [stockSecurite, setStockSecurite] = useState<number>(5);
  const [qmc, setQmc] = useState<number>(0);
  const [enRuptureHopital, setEnRuptureHopital] = useState(false);

  // Initial inventory entry
  const [hasInitialStock, setHasInitialStock] = useState(false);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [initialDatePeremption, setInitialDatePeremption] = useState('');
  const [initialOrigine, setInitialOrigine] = useState('Inventaire initial');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Veuillez renseigner le nom du produit.');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : selectedCategory.trim();
    if (!finalCategory) {
      setError('Veuillez sélectionner ou saisir une catégorie.');
      return;
    }

    // Check duplicate in same category
    const exists = products.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase() && p.category.toLowerCase() === finalCategory.toLowerCase()
    );
    if (exists) {
      setError('Un produit avec ce nom existe déjà dans cette catégorie.');
      return;
    }

    addProduct({
      name: trimmedName,
      category: finalCategory,
      isImportant,
      stockSecurite: Number(stockSecurite) || 0,
      quantiteMoyenneMensuelle: Number(qmc) || 0,
      enRuptureHopital,
      initialStock: hasInitialStock && initialStock > 0 ? Number(initialStock) : undefined,
      initialDatePeremption: hasInitialStock && initialDatePeremption ? new Date(initialDatePeremption).toISOString() : undefined,
      initialOrigine: hasInitialStock ? initialOrigine : undefined,
    });

    // Reset form
    setName('');
    setCustomCategory('');
    setIsCustomCategory(false);
    setHasInitialStock(false);
    setInitialStock(0);
    setInitialDatePeremption('');
    if (onProductAdded) onProductAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-teal-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700/80 text-teal-200">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nouveau Produit / Médicament</h2>
              <p className="text-xs text-teal-200">Ajout au catalogue de la pharmacie du bloc</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-200 hover:bg-teal-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Nom du produit ou médicament <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Propofol 1%, Ceftriaxone 1g, Compresses 10x10..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Catégorie <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-xs font-medium text-teal-700 hover:text-teal-900 underline"
              >
                {isCustomCategory ? 'Choisir une catégorie existante' : '+ Créer une nouvelle catégorie'}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                type="text"
                required
                placeholder="Ex: SUTURES SPÉCIALES, ANTALGIQUES PÉDIATRIQUES..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full rounded-lg border border-teal-300 bg-teal-50/40 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
              />
            ) : (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition-all bg-white"
              >
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Important & Rupture Hospital toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Produit Important</span>
                <span className="text-red-600 font-medium">(Surligné / Affiché en rouge)</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={enRuptureHopital}
                onChange={(e) => setEnRuptureHopital(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Rupture Hôpital</span>
                <span className="text-slate-500">En rupture à la pharmacie centrale</span>
              </div>
            </label>
          </div>

          {/* Security Stock & QMC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock de Sécurité
              </label>
              <input
                type="number"
                min="0"
                value={stockSecurite}
                onChange={(e) => setStockSecurite(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
              <span className="text-[11px] text-slate-400">Seuil d'alerte rupture</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QMC (Consommation moy.)
              </label>
              <input
                type="number"
                min="0"
                value={qmc}
                onChange={(e) => setQmc(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
              <span className="text-[11px] text-slate-400">Quantité mensuelle moyenne</span>
            </div>
          </div>

          {/* Initial Inventory Section */}
          <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInitialStock}
                  onChange={(e) => setHasInitialStock(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-semibold text-teal-900">
                  Saisir un effectif réel dès maintenant (Inventaire)
                </span>
              </label>
            </div>

            {hasInitialStock && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quantité comptée</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 25"
                    value={initialStock || ''}
                    onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date de péremption</label>
                  <input
                    type="date"
                    value={initialDatePeremption}
                    onChange={(e) => setInitialDatePeremption(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Origine / Fournisseur</label>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {['Pharmacie Centrale', 'Échange', 'Inventaire initial'].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setInitialOrigine(choice)}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                          initialOrigine === choice
                            ? "bg-teal-700 text-white border-teal-700"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={initialOrigine}
                    onChange={(e) => setInitialOrigine(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Créer le produit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
