import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  FileText, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

export default function FicheStock() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const product = useStore((state) => state.products.find((p) => p.id === productId));
  const addTransaction = useStore((state) => state.addTransaction);
  const updateProduct = useStore((state) => state.updateProduct);
  const deleteProduct = useStore((state) => state.deleteProduct);
  const setInitialProductStock = useStore((state) => state.setInitialProductStock);
  const allCategories = Array.from(new Set(useStore((state) => state.products.map((p) => p.category)))).sort();

  // Mode: entry, exit, or initial inventory
  const [activeAction, setActiveAction] = useState<'entree' | 'sortie' | 'inventaire' | 'edit' | null>(null);
  
  // Movement form state
  const [quantite, setQuantite] = useState<string>('');
  const [origineDestination, setOrigineDestination] = useState<string>('');
  const [datePeremption, setDatePeremption] = useState<string>('');
  const [dateTransaction, setDateTransaction] = useState<string>(new Date().toISOString().split('T')[0]);

  // Initial Inventory state
  const [inventoryCount, setInventoryCount] = useState<string>('');
  const [inventoryExpiry, setInventoryExpiry] = useState<string>('');

  // Edit product state
  const [editName, setEditName] = useState(product?.name || '');
  const [editCategory, setEditCategory] = useState(product?.category || '');
  const [customEditCategory, setCustomEditCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [editStockSecurite, setEditStockSecurite] = useState(product?.stockSecurite || 0);
  const [editQmc, setEditQmc] = useState(product?.quantiteMoyenneMensuelle || 0);
  const [editIsImportant, setEditIsImportant] = useState(product?.isImportant ?? true);
  const [editEnRupture, setEditEnRupture] = useState(product?.enRuptureHopital ?? false);

  if (!product) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Produit non trouvé</h2>
        <p className="text-sm text-slate-500 mt-2">Le produit recherché n'existe pas ou a été supprimé.</p>
        <Link to="/catalog" className="mt-4 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm text-white font-semibold">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const stock = getCurrentStock(product);

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || !quantite || !origineDestination || !dateTransaction) return;

    addTransaction(product.id, {
      type: activeAction as 'entree' | 'sortie',
      quantite: parseInt(quantite, 10),
      origineDestination,
      date: new Date(dateTransaction).toISOString(),
      ...(activeAction === 'entree' && datePeremption ? { datePeremption: new Date(datePeremption).toISOString() } : {})
    });

    setActiveAction(null);
    setQuantite('');
    setOrigineDestination('');
    setDatePeremption('');
  };

  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(inventoryCount, 10);
    if (isNaN(count) || count < 0) return;

    setInitialProductStock(
      product.id,
      count,
      inventoryExpiry ? new Date(inventoryExpiry).toISOString() : undefined,
      'Inventaire initial'
    );
    setActiveAction(null);
    setInventoryCount('');
    setInventoryExpiry('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = isCustomCat ? customEditCategory.trim() : editCategory.trim();
    if (!editName.trim() || !finalCat) return;

    updateProduct(product.id, {
      name: editName.trim(),
      category: finalCat,
      stockSecurite: Number(editStockSecurite) || 0,
      quantiteMoyenneMensuelle: Number(editQmc) || 0,
      isImportant: editIsImportant,
      enRuptureHopital: editEnRupture,
    });
    setActiveAction(null);
  };

  const handleDelete = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${product.name}" ?`)) {
      deleteProduct(product.id);
      navigate(`/catalog/${encodeURIComponent(product.category)}`);
    }
  };

  // Sort chronological for running balance calculation
  const chronologicalTransactions = [...product.transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningBalance = 0;
  const transactionsWithBalance = chronologicalTransactions.map((t) => {
    if (t.type === 'entree') runningBalance += t.quantite;
    if (t.type === 'sortie') runningBalance -= t.quantite;
    return { ...t, balanceAfter: runningBalance };
  });

  // Display newest first
  const displayTransactions = [...transactionsWithBalance].reverse();

  // Next expiring date
  const expiringEntry = product.transactions
    .filter((t) => t.type === 'entree' && t.datePeremption)
    .sort((a, b) => new Date(a.datePeremption!).getTime() - new Date(b.datePeremption!).getTime())[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-none print:m-0">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to={`/catalog/${encodeURIComponent(product.category)}`}
            className="rounded-xl border border-slate-200 bg-white p-2.5 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {product.category}
            </span>
            <h1 className={clsx("text-2xl font-bold mt-1", product.isImportant ? "text-red-600" : "text-slate-900")}>
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditName(product.name);
              setEditCategory(product.category);
              setEditStockSecurite(product.stockSecurite);
              setEditQmc(product.quantiteMoyenneMensuelle);
              setEditIsImportant(product.isImportant);
              setEditEnRupture(product.enRuptureHopital);
              setActiveAction('edit');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Modifier
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer Fiche
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Official SIDI IFNI Header for Print or Display */}
      <div className="rounded-2xl border border-slate-300/80 bg-white p-6 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="border-b-2 border-slate-800 pb-4 mb-4 text-center">
          <div className="flex justify-between items-start text-xs font-semibold text-slate-700">
            <div className="text-left">
              <p className="font-bold">Ministère de la Santé</p>
              <p>Centre Hospitalier Provincial</p>
              <p className="font-extrabold uppercase">SIDI IFNI</p>
            </div>
            <div className="text-right">
              <p>Bloc Opératoire</p>
              <p>Année : {new Date().getFullYear()}</p>
            </div>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900 mt-2">
            FICHE DE STOCK
          </h2>
        </div>

        {/* Product Official Spec Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase block">Médicament / Produit</span>
            <span className={clsx("font-bold text-base", product.isImportant ? "text-red-600" : "text-slate-900")}>
              {product.name}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase block">Quantité Moy. Mensuelle (QMC)</span>
            <span className="font-bold text-base text-slate-800">
              {product.quantiteMoyenneMensuelle}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase block">Stock de Sécurité</span>
            <span className="font-bold text-base text-slate-800">
              {product.stockSecurite}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase block">Prochaine Péremption</span>
            <span className="font-bold text-base text-blue-700">
              {expiringEntry?.datePeremption ? format(parseISO(expiringEntry.datePeremption), 'MM/yyyy') : 'Non renseignée'}
            </span>
          </div>
        </div>

        {/* Current Live Stock Badge */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-teal-50 border border-teal-200/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-700 p-2.5 text-white">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Effectif actuel au bloc</p>
              <div className="flex items-baseline gap-2">
                <span className={clsx(
                  "text-3xl font-black",
                  stock <= 0 ? "text-rose-600" : stock <= product.stockSecurite ? "text-amber-600" : "text-teal-900"
                )}>
                  {stock}
                </span>
                <span className="text-xs text-teal-700 font-medium">unités en réserve</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setInventoryCount(stock > 0 ? stock.toString() : '');
                setActiveAction('inventaire');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 transition-all shadow-xs active:scale-95"
            >
              <PackageCheck className="h-4 w-4" />
              Saisir Effectif Réel (Inventaire)
            </button>

            <div className="grid grid-cols-2 sm:flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrigineDestination('Pharmacie Centrale');
                  setActiveAction('entree');
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Entrée
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrigineDestination('Salle d\'opération');
                  setActiveAction('sortie');
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-xs active:scale-95"
              >
                <Minus className="h-4 w-4" />
                Sortie
              </button>
            </div>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs print:hidden">
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={product.isImportant}
              onChange={(e) => updateProduct(product.id, { isImportant: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className={product.isImportant ? "text-red-600 font-bold" : "text-slate-700"}>
              Important (Surligné en rouge)
            </span>
          </label>

          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={product.enRuptureHopital}
              onChange={(e) => updateProduct(product.id, { enRuptureHopital: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className={product.enRuptureHopital ? "text-rose-600 font-bold" : "text-slate-700"}>
              En rupture à la pharmacie hospitalière
            </span>
          </label>
        </div>
      </div>

      {/* FORM: Saisie inventaire initial / Effectif réel */}
      {activeAction === 'inventaire' && (
        <form onSubmit={handleInventorySubmit} className="rounded-2xl border border-teal-300 bg-teal-50/70 p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-teal-200/80 pb-3">
            <div>
              <h3 className="text-base font-bold text-teal-950">Saisie de l'effectif réel (Inventaire physique)</h3>
              <p className="text-xs text-teal-800">Définit le stock effectif compté sur étagère.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Effectif compté (Quantité en stock) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="Ex: 12"
                value={inventoryCount}
                onChange={(e) => setInventoryCount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de péremption du lot
              </label>
              <input
                type="date"
                value={inventoryExpiry}
                onChange={(e) => setInventoryExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-teal-800 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-900"
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider l'effectif
            </button>
          </div>
        </form>
      )}

      {/* FORM: Entrée / Sortie */}
      {(activeAction === 'entree' || activeAction === 'sortie') && (
        <form onSubmit={handleTransactionSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Enregistrer une {activeAction === 'entree' ? 'Entrée de stock' : 'Sortie de stock'}
            </h3>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={dateTransaction}
                onChange={(e) => setDateTransaction(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantité</label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 5"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeAction === 'entree' ? 'De (Origine / Fournisseur)' : 'Pour (Destination / Salle)'}
              </label>
              <input
                type="text"
                required
                placeholder={activeAction === 'entree' ? 'Ex: Pharmacie centrale, Dépôt...' : 'Ex: Salle 1, Urgence, Réanimation...'}
                value={origineDestination}
                onChange={(e) => setOrigineDestination(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>

            {activeAction === 'entree' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date de Péremption</label>
                <input
                  type="date"
                  value={datePeremption}
                  onChange={(e) => setDatePeremption(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={clsx(
                "rounded-lg px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors",
                activeAction === 'entree' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              Enregistrer le mouvement
            </button>
          </div>
        </form>
      )}

      {/* FORM: Modifier le produit */}
      {activeAction === 'edit' && (
        <form onSubmit={handleEditSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Modifier les détails du produit</h3>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nom du produit</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Catégorie</label>
                <button
                  type="button"
                  onClick={() => setIsCustomCat(!isCustomCat)}
                  className="text-[11px] text-teal-700 underline"
                >
                  {isCustomCat ? 'Catégorie existante' : '+ Nouvelle'}
                </button>
              </div>
              {isCustomCat ? (
                <input
                  type="text"
                  required
                  placeholder="Nom de la nouvelle catégorie..."
                  value={customEditCategory}
                  onChange={(e) => setCustomEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-teal-300 px-3 py-2 text-sm text-slate-800 outline-none"
                />
              ) : (
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:border-teal-600 outline-none"
                >
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stock de Sécurité</label>
              <input
                type="number"
                min="0"
                value={editStockSecurite}
                onChange={(e) => setEditStockSecurite(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">QMC (Consommation Mensuelle)</label>
              <input
                type="number"
                min="0"
                value={editQmc}
                onChange={(e) => setEditQmc(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Sauvegarder
            </button>
          </div>
        </form>
      )}

      {/* Official Fiche Movements Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xs">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
            Relevé des Mouvements de Stock
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {displayTransactions.length} opération{displayTransactions.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border-collapse text-left">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-bold uppercase text-slate-700">
                <th className="border border-slate-300 px-4 py-3 w-32">Date</th>
                <th className="border border-slate-300 px-4 py-3">de : ........ pour : ........</th>
                <th className="border border-slate-300 px-4 py-3 text-right w-24">Entrées</th>
                <th className="border border-slate-300 px-4 py-3 text-right w-24">Sorties</th>
                <th className="border border-slate-300 px-4 py-3 text-right w-24 bg-teal-50/70 text-teal-900">Stock</th>
                <th className="border border-slate-300 px-4 py-3 text-center w-32">Date Péremption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {displayTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="border border-slate-200 px-4 py-3 text-slate-900 font-medium">
                    {format(parseISO(t.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-slate-700">
                    {t.origineDestination}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-emerald-600">
                    {t.type === 'entree' ? t.quantite : '-'}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-bold text-rose-600">
                    {t.type === 'sortie' ? t.quantite : '-'}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-right font-black text-slate-900 bg-teal-50/40">
                    {t.balanceAfter}
                  </td>
                  <td className="border border-slate-200 px-4 py-3 text-center text-slate-600">
                    {t.datePeremption ? format(parseISO(t.datePeremption), 'MM/yyyy') : '-'}
                  </td>
                </tr>
              ))}

              {displayTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">Aucun mouvement enregistré pour ce produit.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Le stock est actuellement vierge (0). Cliquez sur "Saisir Effectif Réel" pour inscrire votre inventaire.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
