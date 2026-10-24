import { useState, useMemo, useEffect } from 'react';
import { useStore, getCurrentStock, Product, ENTREE_ORIGINES, SORTIE_DESTINATIONS } from '../store';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  FileText, 
  Edit3, 
  Trash2, 
  Printer, 
  CheckCircle2, 
  Search,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { safeDecode, safeFormatDate, safeTimestamp } from '../utils/formatters';

export default function FicheStock() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const products = useStore((state) => state.products);
  const seedDatabase = useStore((state) => state.seedDatabase);
  const addTransaction = useStore((state) => state.addTransaction);
  const updateProduct = useStore((state) => state.updateProduct);
  const deleteProduct = useStore((state) => state.deleteProduct);
  const setInitialProductStock = useStore((state) => state.setInitialProductStock);

  // Quick search filter for product selection
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorCategory, setSelectorCategory] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Categories list
  const allCategories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p && p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Find the requested product or fallback gracefully to the first product
  const activeProduct = useMemo<Product | undefined>(() => {
    if (!products || products.length === 0) return undefined;

    if (productId) {
      const decodedParam = safeDecode(productId);
      const lowerDecoded = (decodedParam || '').toLowerCase().trim();
      const lowerRaw = (productId || '').toLowerCase().trim();

      const found = products.find((p) => {
        if (!p) return false;
        const pId = String(p.id || '').trim();
        const pName = String(p.name || '').trim().toLowerCase();

        return (
          pId === productId ||
          pId === decodedParam ||
          pName === lowerDecoded ||
          pName === lowerRaw ||
          encodeURIComponent(pId) === productId
        );
      });

      if (found) return found;
    }

    // Default to the first product in the database
    return products[0];
  }, [products, productId]);

  // Filtered products for quick search drawer / dropdown
  const filteredProductsForSelector = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p) return false;
      const matchesCat = selectorCategory === 'all' || p.category === selectorCategory;
      const pName = (p.name || '').toLowerCase();
      const s = selectorSearch.toLowerCase().trim();
      const matchesSearch = !s || pName.includes(s);
      return matchesCat && matchesSearch;
    });
  }, [products, selectorCategory, selectorSearch]);

  // Mode: entry, exit, initial inventory, or edit
  const [activeAction, setActiveAction] = useState<'entree' | 'sortie' | 'inventaire' | 'edit' | null>(null);
  
  // Movement form state
  const [quantite, setQuantite] = useState<string>('');
  const [origineDestination, setOrigineDestination] = useState<string>('');
  const [datePeremption, setDatePeremption] = useState<string>('');
  const [dateTransaction, setDateTransaction] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  // Initial Inventory state
  const [inventoryCount, setInventoryCount] = useState<string>('');
  const [inventoryExpiry, setInventoryExpiry] = useState<string>('');

  // Edit product state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [customEditCategory, setCustomEditCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [editStockSecurite, setEditStockSecurite] = useState(0);
  const [editQmc, setEditQmc] = useState(0);
  const [editIsImportant, setEditIsImportant] = useState(true);
  const [editEnRupture, setEditEnRupture] = useState(false);

  // Sync edit state whenever activeProduct changes
  useEffect(() => {
    if (activeProduct) {
      setEditName(activeProduct.name || '');
      setEditCategory(activeProduct.category || '');
      setEditStockSecurite(activeProduct.stockSecurite || 0);
      setEditQmc(activeProduct.quantiteMoyenneMensuelle || 0);
      setEditIsImportant(activeProduct.isImportant ?? true);
      setEditEnRupture(activeProduct.enRuptureHopital ?? false);
    }
  }, [activeProduct]);

  // If no products exist in the store, render an inviting initialization screen
  if (!products || products.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto shadow-xs space-y-4">
        <FileText className="mx-auto h-12 w-12 text-teal-600 mb-2" />
        <h2 className="text-xl font-bold text-slate-800">Initialisation des Fiches de Stock</h2>
        <p className="text-xs text-slate-500">
          Le catalogue du bloc opératoire est en cours de chargement ou vide.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => seedDatabase()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Charger les produits du bloc
          </button>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voir Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!activeProduct) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto shadow-xs">
        <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Produit introuvable</h2>
        <p className="text-xs text-slate-500 mt-2">
          La référence demandée n'existe pas ou a été supprimée.
        </p>
        <Link
          to="/fiches-de-stock"
          className="mt-4 inline-block rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
        >
          Retour à la première fiche
        </Link>
      </div>
    );
  }

  const stock = getCurrentStock(activeProduct);

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseInt(quantite, 10);
    if (!activeAction || isNaN(qtyNum) || qtyNum <= 0 || !origineDestination.trim()) return;

    let validDateIso = new Date().toISOString();
    try {
      if (dateTransaction) {
        const parsed = new Date(dateTransaction);
        if (!isNaN(parsed.getTime())) {
          validDateIso = parsed.toISOString();
        }
      }
    } catch {}

    let validExpiryIso: string | undefined = undefined;
    if (activeAction === 'entree' && datePeremption) {
      try {
        const pExp = new Date(datePeremption);
        if (!isNaN(pExp.getTime())) {
          validExpiryIso = pExp.toISOString();
        }
      } catch {}
    }

    addTransaction(activeProduct.id, {
      type: activeAction as 'entree' | 'sortie',
      quantite: qtyNum,
      origineDestination: origineDestination.trim(),
      date: validDateIso,
      ...(validExpiryIso ? { datePeremption: validExpiryIso } : {})
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

    let validExpiryIso: string | undefined = undefined;
    if (inventoryExpiry) {
      try {
        const pExp = new Date(inventoryExpiry);
        if (!isNaN(pExp.getTime())) {
          validExpiryIso = pExp.toISOString();
        }
      } catch {}
    }

    setInitialProductStock(
      activeProduct.id,
      count,
      validExpiryIso,
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

    updateProduct(activeProduct.id, {
      name: editName.trim(),
      category: finalCat,
      stockSecurite: Number(editStockSecurite) || 0,
      quantiteMoyenneMensuelle: Number(editQmc) || 0,
      isImportant: editIsImportant,
      enRuptureHopital: editEnRupture,
    });
    setActiveAction(null);
  };

  const confirmDelete = () => {
    deleteProduct(activeProduct.id);
    setIsDeleteModalOpen(false);
    navigate('/fiches-de-stock');
  };

  // Safe transactions array
  const rawTransactions = Array.isArray(activeProduct.transactions) ? activeProduct.transactions : [];

  // Sort chronological for running balance calculation
  const chronologicalTransactions = [...rawTransactions].sort((a, b) => {
    const timeA = safeTimestamp(a?.date, 0);
    const timeB = safeTimestamp(b?.date, 0);
    return timeA - timeB;
  });

  let runningBalance = 0;
  const transactionsWithBalance = chronologicalTransactions.map((t) => {
    const qty = Number(t.quantite) || 0;
    if (t.type === 'entree') runningBalance += qty;
    if (t.type === 'sortie') runningBalance -= qty;
    return { ...t, balanceAfter: runningBalance };
  });

  // Display newest first
  const displayTransactions = [...transactionsWithBalance].reverse();

  // Next expiring entry (safely computed)
  const expiringEntry = rawTransactions
    .filter((t) => t && t.type === 'entree' && t.datePeremption)
    .sort((a, b) => {
      const timeA = safeTimestamp(a?.datePeremption, Infinity);
      const timeB = safeTimestamp(b?.datePeremption, Infinity);
      return timeA - timeB;
    })[0];

  // Navigation: previous / next product
  const currentIndex = products.findIndex((p) => p.id === activeProduct.id);
  const prevProduct = currentIndex > 0 ? products[currentIndex - 1] : undefined;
  const nextProduct = currentIndex >= 0 && currentIndex < products.length - 1 ? products[currentIndex + 1] : undefined;

  const navigateToProduct = (prod: Product) => {
    if (!prod) return;
    navigate(`/fiches-de-stock/${encodeURIComponent(prod.id)}`);
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto print:max-w-none print:m-0">
      {/* Product Quick-Selector & Header (Hidden on Print) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs print:hidden space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to="/catalog"
              className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs shrink-0 active:scale-95"
              title="Retour au catalogue des catégories"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!prevProduct}
                onClick={() => prevProduct && navigateToProduct(prevProduct)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 active:scale-95"
                title={prevProduct ? `Précédent : ${prevProduct.name}` : undefined}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={!nextProduct}
                onClick={() => nextProduct && navigateToProduct(nextProduct)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 active:scale-95"
                title={nextProduct ? `Suivant : ${nextProduct.name}` : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="text-xs font-bold text-slate-700">
              Fiche {currentIndex >= 0 ? currentIndex + 1 : 1} / {products.length}
            </span>
          </div>

          {/* Searchable Select to immediately jump to any medication */}
          <div className="flex flex-1 max-w-md items-center gap-2">
            <select
              value={activeProduct.id}
              onChange={(e) => {
                const target = products.find((p) => p.id === e.target.value);
                if (target) navigateToProduct(target);
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-600 focus:bg-white transition-all shadow-2xs"
            >
              {allCategories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isImportant ? '⭐ (Important)' : ''}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <button
              type="button"
              onClick={() => {
                setEditName(activeProduct.name || '');
                setEditCategory(activeProduct.category || '');
                setEditStockSecurite(activeProduct.stockSecurite || 0);
                setEditQmc(activeProduct.quantiteMoyenneMensuelle || 0);
                setEditIsImportant(activeProduct.isImportant ?? true);
                setEditEnRupture(activeProduct.enRuptureHopital ?? false);
                setActiveAction('edit');
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modifier</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs active:scale-95"
              title="Supprimer ce produit"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Filter Search Bar */}
        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher rapidement un médicament (ex: Xylocaine, Propofol, Fentanyl)..."
              value={selectorSearch}
              onChange={(e) => setSelectorSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-600 outline-none"
            />
          </div>

          <select
            value={selectorCategory}
            onChange={(e) => setSelectorCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-700 font-medium outline-none focus:bg-white focus:border-teal-600"
          >
            <option value="all">Toutes les catégories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Search match pills for immediate clicking */}
        {selectorSearch && (
          <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
            {filteredProductsForSelector.slice(0, 10).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  navigateToProduct(p);
                  setSelectorSearch('');
                }}
                className={clsx(
                  "rounded-md px-2 py-1 text-[11px] font-medium border transition-colors active:scale-95",
                  p.id === activeProduct.id
                    ? "bg-teal-700 text-white border-teal-700"
                    : p.isImportant
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                )}
              >
                {p.name}
              </button>
            ))}
            {filteredProductsForSelector.length === 0 && (
              <span className="text-[11px] text-slate-400 italic">Aucun résultat</span>
            )}
          </div>
        )}
      </div>

      {/* FENTANYL ISOLATION BANNER FOR NARCOTIC REGULATION */}
      {activeProduct?.name.toLowerCase().includes('fentanyl') && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 sm:p-5 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs print:hidden">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 shadow-2xs">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                  Stupéfiant - Tableau B
                </span>
                <span className="text-xs font-bold text-rose-700">Gestion Isolée Obligatoire</span>
              </div>
              <h3 className="text-base font-black text-rose-950 mt-1">
                La traçabilité du Fentanyl est gérée exclusivement dans "Le Bon Danger"
              </h3>
              <p className="text-xs text-rose-800 mt-1 max-w-2xl leading-relaxed">
                Conformément à la législation médico-légale et aux règles du bloc opératoire, le Fentanyl (100 µg et 500 µg) est séparé des fiches de stock générales. Il dispose du registre sécurisé <strong>"Le Bon Danger"</strong> avec restitution obligatoire des ampoules vides et archivage certifié des bons de commande physiques scannés.
              </p>
            </div>
          </div>
          <Link
            to="/le-bon-danger"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs shrink-0 active:scale-95 transition-all"
          >
            <ShieldAlert className="h-4 w-4" />
            Ouvrir "Le Bon Danger"
          </Link>
        </div>
      )}

      {/* OFFICIAL SIDI IFNI FICHE DE STOCK CONTAINER */}
      <div className="rounded-2xl border border-slate-300/80 bg-white p-4 sm:p-6 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* Official Header */}
        <div className="border-b-2 border-slate-800 pb-3 mb-4 text-center">
          <div className="flex justify-between items-start text-xs font-semibold text-slate-700">
            <div className="text-left">
              <p className="font-bold">Ministère de la Santé</p>
              <p>Centre Hospitalier Provincial</p>
              <p className="font-extrabold uppercase">SIDI IFNI</p>
            </div>
            <div className="text-right">
              <p>Service du Bloc Opératoire</p>
              <p>Année : {new Date().getFullYear()}</p>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900 mt-2">
            FICHE DE STOCK
          </h2>
        </div>

        {/* Product Official Spec Header */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Médicament / Matériel</span>
            <span className={clsx("font-bold text-sm sm:text-base leading-tight block mt-0.5", activeProduct.isImportant ? "text-red-600" : "text-slate-900")}>
              {activeProduct.name}
            </span>
            <span className="text-[11px] text-slate-500 block">{activeProduct.category}</span>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Quantité Moy. Mensuelle (QMC)</span>
            <span className="font-bold text-sm sm:text-base text-slate-800 block mt-0.5">
              {activeProduct.quantiteMoyenneMensuelle}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Stock de Sécurité</span>
            <span className="font-bold text-sm sm:text-base text-slate-800 block mt-0.5">
              {activeProduct.stockSecurite}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Prochaine Péremption</span>
            <span className="font-bold text-sm sm:text-base text-blue-700 block mt-0.5">
              {safeFormatDate(expiringEntry?.datePeremption, 'MM/yyyy')}
            </span>
          </div>
        </div>

        {/* Current Live Stock Badge & Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-teal-50 border border-teal-200/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-700 p-2 text-white shrink-0">
              <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Effectif actuel au bloc</p>
              <div className="flex items-baseline gap-2">
                <span className={clsx(
                  "text-2xl sm:text-3xl font-black",
                  stock <= 0 ? "text-rose-600" : stock <= activeProduct.stockSecurite ? "text-amber-600" : "text-teal-900"
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
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-teal-800 transition-all shadow-xs active:scale-95"
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
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Entrée
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrigineDestination('Service');
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
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs print:hidden">
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={activeProduct.isImportant}
              onChange={(e) => updateProduct(activeProduct.id, { isImportant: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className={activeProduct.isImportant ? "text-red-600 font-bold" : "text-slate-700"}>
              Important (Surligné en rouge)
            </span>
          </label>

          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={activeProduct.enRuptureHopital}
              onChange={(e) => updateProduct(activeProduct.id, { enRuptureHopital: e.target.checked })}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className={activeProduct.enRuptureHopital ? "text-rose-600 font-bold" : "text-slate-700"}>
              En rupture à la pharmacie hospitalière
            </span>
          </label>
        </div>
      </div>

      {/* FORM: Saisie inventaire initial / Effectif réel */}
      {activeAction === 'inventaire' && (
        <form onSubmit={handleInventorySubmit} className="rounded-2xl border border-teal-300 bg-teal-50/70 p-4 sm:p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-teal-200/80 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-teal-950">Saisie de l'effectif réel (Inventaire physique)</h3>
              <p className="text-xs text-teal-800">Définit le stock physique compté sur étagère pour {activeProduct.name}.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

          <div className="flex justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 shadow-xs active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider l'effectif
            </button>
          </div>
        </form>
      )}

      {/* FORM: Entrée / Sortie */}
      {(activeAction === 'entree' || activeAction === 'sortie') && (
        <form onSubmit={handleTransactionSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Enregistrer une {activeAction === 'entree' ? 'Entrée de stock' : 'Sortie de stock'}
            </h3>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {activeAction === 'entree' ? 'De (Choix de l\'origine) :' : 'Pour (Choix de la destination) :'}
              </label>

              {/* Standard choices requested: Entrée: Pharmacie Centrale, Échange | Sortie: Service, Décharge périmé, Perte */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {activeAction === 'entree' ? (
                  <>
                    {ENTREE_ORIGINES.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setOrigineDestination(choice)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95",
                          origineDestination === choice
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {SORTIE_DESTINATIONS.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setOrigineDestination(choice)}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95",
                          origineDestination === choice
                            ? "bg-rose-700 text-white border-rose-700 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {choice}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <input
                type="text"
                required
                placeholder={activeAction === 'entree' ? 'Ex: Pharmacie Centrale, Échange...' : 'Ex: Service, Décharge périmé, Perte...'}
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

          <div className="flex justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={clsx(
                "rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors active:scale-95",
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
        <form onSubmit={handleEditSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Modifier les détails du produit</h3>
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                onChange={(e) => setEditStockSecurite(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">QMC (Consommation Mensuelle)</label>
              <input
                type="number"
                min="0"
                value={editQmc}
                onChange={(e) => setEditQmc(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 active:scale-95"
            >
              Sauvegarder
            </button>
          </div>
        </form>
      )}

      {/* Official Fiche Movements Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xs">
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
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
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 w-28 sm:w-32">Date</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3">de : ........ pour : ........</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24">Entrées</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24">Sorties</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24 bg-teal-50/70 text-teal-900">Stock</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-center w-28 sm:w-32">Date Péremption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {displayTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-900 font-medium whitespace-nowrap">
                    {safeFormatDate(t.date, 'dd/MM/yyyy')}
                  </td>
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700">
                    {t.origineDestination || '-'}
                  </td>
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                    {t.type === 'entree' ? `+${t.quantite}` : '-'}
                  </td>
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                    {t.type === 'sortie' ? `-${t.quantite}` : '-'}
                  </td>
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-black text-slate-900 bg-teal-50/40 whitespace-nowrap">
                    {t.balanceAfter}
                  </td>
                  <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-center text-slate-600 whitespace-nowrap">
                    {safeFormatDate(t.datePeremption, 'MM/yyyy')}
                  </td>
                </tr>
              ))}

              {displayTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
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

      {/* Delete Product Confirmation Modal (Iframe Safe - No window.confirm) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supprimer cette fiche ?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Êtes-vous sûr de vouloir supprimer la fiche de stock de <strong>{activeProduct.name}</strong> ? Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
