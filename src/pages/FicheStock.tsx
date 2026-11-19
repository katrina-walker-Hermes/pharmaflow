import { useState, useMemo, useEffect } from 'react';
import { useStore, getCurrentStock, Product, Transaction, ENTREE_ORIGINES, SORTIE_DESTINATIONS } from '../store';
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
import { sortCategories, sortProductsByCategoryAndName } from '../utils/categoryOrder';
import UnitPicker, { formatUnitDisplay } from '../components/UnitPicker';

export default function FicheStock() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const products = useStore((state) => state.products);
  const seedDatabase = useStore((state) => state.seedDatabase);
  const addTransaction = useStore((state) => state.addTransaction);
  const updateTransaction = useStore((state) => state.updateTransaction);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const updateProduct = useStore((state) => state.updateProduct);
  const deleteProduct = useStore((state) => state.deleteProduct);
  const setInitialProductStock = useStore((state) => state.setInitialProductStock);
  const recordPeriodicInventory = useStore((state) => state.recordPeriodicInventory);

  // Quick search filter for product selection
  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorCategory, setSelectorCategory] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Categories list in clinical sequence
  const allCategories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p && p.category) cats.add(p.category);
    });
    return sortCategories(Array.from(cats));
  }, [products]);

  // Master product list sorted by clinical category order, then alphabetical by name
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return sortProductsByCategoryAndName(products);
  }, [products]);

  // Find the requested product or fallback gracefully to the first product in custom order
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

    // Default to the first product in the database according to clinical order
    return sortedProducts[0] || products[0];
  }, [products, sortedProducts, productId]);

  // Filtered products for quick search drawer / dropdown
  const filteredProductsForSelector = useMemo(() => {
    if (!Array.isArray(sortedProducts)) return [];
    return sortedProducts.filter((p) => {
      if (!p) return false;
      const matchesCat = selectorCategory === 'all' || p.category === selectorCategory;
      const pName = (p.name || '').toLowerCase();
      const s = selectorSearch.toLowerCase().trim();
      const matchesSearch = !s || pName.includes(s);
      return matchesCat && matchesSearch;
    });
  }, [sortedProducts, selectorCategory, selectorSearch]);

  // Mode: entry, exit, initial inventory, or edit
  const [activeAction, setActiveAction] = useState<'entree' | 'sortie' | 'inventaire' | 'edit' | null>(null);
  
  // Movement form state
  const [quantite, setQuantite] = useState<string>('');
  const [txUnite, setTxUnite] = useState<string>('Unité');
  const [origineDestination, setOrigineDestination] = useState<string>('');
  const [datePeremption, setDatePeremption] = useState<string>('');
  const [numeroLot, setNumeroLot] = useState<string>('');
  const [dateTransaction, setDateTransaction] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });

  // Inventory state (Periodic / End-of-month vs Initial)
  const [inventoryMode, setInventoryMode] = useState<'periodique' | 'initial'>('periodique');
  const [inventoryCount, setInventoryCount] = useState<string>('');
  const [inventoryUnite, setInventoryUnite] = useState<string>('Unité');
  const [inventoryExpiry, setInventoryExpiry] = useState<string>('');
  const [inventoryLot, setInventoryLot] = useState<string>('');
  const [inventoryDate, setInventoryDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [inventoryLabel, setInventoryLabel] = useState<string>('Inventaire fin de mois');

  // Edit product state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnite, setEditUnite] = useState('Unité');
  const [customEditCategory, setCustomEditCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [editStockSecurite, setEditStockSecurite] = useState(0);
  const [editQmc, setEditQmc] = useState(0);
  const [editIsImportant, setEditIsImportant] = useState(true);
  const [editEnRupture, setEditEnRupture] = useState(false);

  // Edit / Delete individual transaction row state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxType, setEditTxType] = useState<'entree' | 'sortie'>('entree');
  const [editTxDate, setEditTxDate] = useState<string>('');
  const [editTxQty, setEditTxQty] = useState<string>('');
  const [editTxUnite, setEditTxUnite] = useState<string>('Unité');
  const [editTxOrigineDest, setEditTxOrigineDest] = useState<string>('');
  const [editTxLot, setEditTxLot] = useState<string>('');
  const [editTxExpiry, setEditTxExpiry] = useState<string>('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Sync edit state whenever activeProduct changes
  useEffect(() => {
    if (activeProduct) {
      const unitVal = activeProduct.unite || 'Unité';
      setEditName(activeProduct.name || '');
      setEditCategory(activeProduct.category || '');
      setEditUnite(unitVal);
      setTxUnite(unitVal);
      setInventoryUnite(unitVal);
      setIsCustomCat(false);
      setEditStockSecurite(activeProduct.stockSecurite || 0);
      setEditQmc(activeProduct.quantiteMoyenneMensuelle || 0);
      setEditIsImportant(activeProduct.isImportant ?? true);
      setEditEnRupture(activeProduct.enRuptureHopital ?? false);
      setEditingTx(null);
      setTxToDelete(null);
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
      unite: txUnite.trim() || activeProduct.unite || 'Unité',
      origineDestination: origineDestination.trim(),
      date: validDateIso,
      ...(validExpiryIso ? { datePeremption: validExpiryIso } : {}),
      ...(activeAction === 'entree' && numeroLot.trim() ? { numeroLot: numeroLot.trim() } : {}),
    });

    setActiveAction(null);
    setQuantite('');
    setOrigineDestination('');
    setDatePeremption('');
    setNumeroLot('');
    setTxUnite(activeProduct.unite || 'Unité');
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

    let validDateIso = new Date().toISOString();
    if (inventoryDate) {
      try {
        const pDate = new Date(inventoryDate);
        if (!isNaN(pDate.getTime())) {
          validDateIso = pDate.toISOString();
        }
      } catch {}
    }

    if (inventoryMode === 'initial') {
      setInitialProductStock(
        activeProduct.id,
        count,
        validExpiryIso,
        'Inventaire initial',
        inventoryLot.trim() || undefined,
        inventoryUnite.trim() || activeProduct.unite || 'Unité'
      );
    } else {
      recordPeriodicInventory(activeProduct.id, count, {
        date: validDateIso,
        label: inventoryLabel.trim() || 'Inventaire fin de mois',
        datePeremption: validExpiryIso,
        numeroLot: inventoryLot.trim() || undefined,
        unite: inventoryUnite.trim() || activeProduct.unite || 'Unité',
      });
    }

    setActiveAction(null);
    setInventoryCount('');
    setInventoryExpiry('');
    setInventoryLot('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = isCustomCat ? customEditCategory.trim() : editCategory.trim();
    if (!editName.trim() || !finalCat) return;

    updateProduct(activeProduct.id, {
      name: editName.trim(),
      category: finalCat,
      unite: editUnite.trim() || 'Unité',
      stockSecurite: Number(editStockSecurite) || 0,
      quantiteMoyenneMensuelle: Number(editQmc) || 0,
      isImportant: editIsImportant,
      enRuptureHopital: editEnRupture,
    });
    setActiveAction(null);
  };

  const toDateInputVal = (iso?: string): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const openEditTransactionModal = (t: Transaction) => {
    setEditingTx(t);
    setEditTxType(t.type);
    setEditTxDate(toDateInputVal(t.date));
    setEditTxQty(String(t.quantite ?? ''));
    setEditTxUnite(t.unite || activeProduct.unite || 'Unité');
    setEditTxOrigineDest(t.origineDestination || '');
    setEditTxLot(t.numeroLot || '');
    setEditTxExpiry(toDateInputVal(t.datePeremption));
  };

  const handleUpdateTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const qtyNum = parseInt(editTxQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0 || !editTxOrigineDest.trim()) return;

    let validDateIso = editingTx.date;
    if (editTxDate) {
      try {
        const parsed = new Date(editTxDate);
        if (!isNaN(parsed.getTime())) {
          validDateIso = parsed.toISOString();
        }
      } catch {}
    }

    let validExpiryIso: string | undefined = undefined;
    if (editTxExpiry) {
      try {
        const parsedExp = new Date(editTxExpiry);
        if (!isNaN(parsedExp.getTime())) {
          validExpiryIso = parsedExp.toISOString();
        }
      } catch {}
    }

    updateTransaction(activeProduct.id, editingTx.id, {
      type: editTxType,
      date: validDateIso,
      quantite: qtyNum,
      unite: editTxUnite.trim() || activeProduct.unite || 'Unité',
      origineDestination: editTxOrigineDest.trim(),
      numeroLot: editTxLot.trim() || undefined,
      datePeremption: validExpiryIso,
    });

    setEditingTx(null);
  };

  const confirmDeleteTransaction = () => {
    if (!txToDelete) return;
    deleteTransaction(activeProduct.id, txToDelete.id);
    setTxToDelete(null);
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

  // Navigation: previous / next product according to clinical sequence
  const currentIndex = sortedProducts.findIndex((p) => p.id === activeProduct.id);
  const prevProduct = currentIndex > 0 ? sortedProducts[currentIndex - 1] : undefined;
  const nextProduct = currentIndex >= 0 && currentIndex < sortedProducts.length - 1 ? sortedProducts[currentIndex + 1] : undefined;

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
                setEditUnite(activeProduct.unite || 'Unité');
                setIsCustomCat(false);
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
          <div className="col-span-2 lg:col-span-1">
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Médicament / Matériel</span>
            <span className={clsx("font-bold text-sm sm:text-base leading-tight block mt-0.5", activeProduct.isImportant ? "text-red-600" : "text-slate-900")}>
              {activeProduct.name}
            </span>
            <span className="text-[11px] text-slate-500 block">{activeProduct.category}</span>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase block">Unité</span>
            <span className="inline-flex items-center rounded-md bg-teal-100/80 text-teal-900 border border-teal-200 px-2 py-0.5 font-bold text-xs sm:text-sm mt-1">
              {formatUnitDisplay(activeProduct.unite)}
            </span>
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
            <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
              <span className="font-bold text-sm sm:text-base text-blue-700">
                {safeFormatDate(expiringEntry?.datePeremption, 'MM/yyyy')}
              </span>
              {expiringEntry?.numeroLot && (
                <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  Lot: {expiringEntry.numeroLot}
                </span>
              )}
            </div>
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
                <span className="text-xs text-teal-800 font-semibold">
                  {formatUnitDisplay(activeProduct.unite)} en réserve
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setInventoryMode(rawTransactions.length > 0 ? 'periodique' : 'initial');
                setInventoryCount(stock > 0 ? stock.toString() : '');
                setInventoryUnite(activeProduct.unite || 'Unité');
                setInventoryLabel('Inventaire fin de mois');
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
                  setTxUnite(activeProduct.unite || 'Unité');
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
                  setTxUnite(activeProduct.unite || 'Unité');
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

      {/* FORM: Saisie inventaire (Périodique / Fin de mois vs Initial) */}
      {activeAction === 'inventaire' && (() => {
        const parsedCount = parseInt(inventoryCount, 10);
        const hasValidCount = !isNaN(parsedCount) && parsedCount >= 0;
        const deltaPreview = hasValidCount ? parsedCount - stock : 0;
        const targetMonthlyStock = activeProduct.quantiteMoyenneMensuelle > 0
          ? activeProduct.quantiteMoyenneMensuelle
          : (activeProduct.stockSecurite || 0) * 2;
        const estimatedOrderQty = hasValidCount ? Math.max(0, targetMonthlyStock - parsedCount) : 0;

        return (
          <form onSubmit={handleInventorySubmit} className="rounded-2xl border border-teal-300 bg-teal-50/70 p-4 sm:p-6 shadow-sm space-y-4 print:hidden animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/80 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-teal-950">
                  Saisie de l'effectif réel (Inventaire physique)
                </h3>
                <p className="text-xs text-teal-800">
                  Stock théorique actuel : <strong>{stock} {formatUnitDisplay(activeProduct.unite)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  to="/inventaire"
                  className="rounded-lg border border-teal-600/30 bg-white px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:bg-teal-100/60"
                >
                  Inventaire Fin de Mois (Global)
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveAction(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 p-1"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* Mode Switcher: Périodique (Conserve historique) vs Initial (Remise à zéro) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-white border border-teal-200">
              <button
                type="button"
                onClick={() => setInventoryMode('periodique')}
                className={clsx(
                  "rounded-lg px-3 py-2 text-left transition-all border",
                  inventoryMode === 'periodique'
                    ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                    : "bg-transparent text-slate-700 border-transparent hover:bg-slate-50"
                )}
              >
                <span className="block text-xs font-bold">Inventaire Périodique / Fin de mois</span>
                <span className={clsx("block text-[10px]", inventoryMode === 'periodique' ? "text-teal-100" : "text-slate-500")}>
                  Conserve l'historique et ajuste l'écart automatiquement
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInventoryMode('initial')}
                className={clsx(
                  "rounded-lg px-3 py-2 text-left transition-all border",
                  inventoryMode === 'initial'
                    ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                    : "bg-transparent text-slate-700 border-transparent hover:bg-slate-50"
                )}
              >
                <span className="block text-xs font-bold">Inventaire Initial (Remise à zéro)</span>
                <span className={clsx("block text-[10px]", inventoryMode === 'initial' ? "text-amber-100" : "text-slate-500")}>
                  Remplace les mouvements précédents par un stock de départ
                </span>
              </button>
            </div>

            {inventoryMode === 'initial' && rawTransactions.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Attention : l'<strong>Inventaire Initial</strong> efface les {rawTransactions.length} mouvements existants de cette fiche. Pour un contrôle de fin de mois, sélectionnez plutôt <strong>Inventaire Périodique / Fin de mois</strong>.
                </span>
              </div>
            )}

            {inventoryMode === 'periodique' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date de l'inventaire
                  </label>
                  <input
                    type="date"
                    required
                    value={inventoryDate}
                    onChange={(e) => setInventoryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Motif / Libellé
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['Inventaire fin de mois', 'Inventaire périodique', 'Contrôle physique'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setInventoryLabel(lbl)}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold border transition-colors",
                          inventoryLabel === lbl
                            ? "bg-teal-700 text-white border-teal-700"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={inventoryLabel}
                    onChange={(e) => setInventoryLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-600 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Effectif réel compté <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Ex: 12"
                  value={inventoryCount}
                  onChange={(e) => setInventoryCount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de Lot
                </label>
                <input
                  type="text"
                  placeholder="Ex: LOT-2026-X1"
                  value={inventoryLot}
                  onChange={(e) => setInventoryLot(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none font-mono"
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

            {hasValidCount && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inventoryMode === 'periodique' && (
                  <div className={clsx(
                    "rounded-xl border px-3.5 py-2.5 text-xs flex items-center justify-between",
                    deltaPreview > 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : deltaPreview < 0
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-white border-slate-200 text-slate-700"
                  )}>
                    <span className="font-semibold">Ajustement sur fiche :</span>
                    <span className="font-black">
                      {deltaPreview > 0
                        ? `+${deltaPreview} (Entrée régul.)`
                        : deltaPreview < 0
                        ? `${deltaPreview} (Sortie ajust.)`
                        : '0 (Stock conforme)'}
                    </span>
                  </div>
                )}

                <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs flex items-center justify-between text-blue-950">
                  <span className="font-semibold">
                    Estimation prochain bon (cible {targetMonthlyStock}) :
                  </span>
                  <span className="font-black text-blue-800">
                    {estimatedOrderQty > 0
                      ? `Commander ${estimatedOrderQty} ${formatUnitDisplay(inventoryUnite)}`
                      : 'Stock suffisant (0)'}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-1">
              <UnitPicker
                label="Unité de conditionnement"
                value={inventoryUnite}
                onChange={setInventoryUnite}
                compact
              />
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
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs active:scale-95",
                  inventoryMode === 'initial' ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-800 hover:bg-teal-900"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                {inventoryMode === 'initial' ? "Valider l'inventaire initial" : "Enregistrer l'inventaire périodique"}
              </button>
            </div>
          </form>
        );
      })()}

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
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">N° de Lot</label>
                  <input
                    type="text"
                    placeholder="Ex: LOT-45892"
                    value={numeroLot}
                    onChange={(e) => setNumeroLot(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date de Péremption</label>
                  <input
                    type="date"
                    value={datePeremption}
                    onChange={(e) => setDatePeremption(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 lg:col-span-4 pt-1">
              <UnitPicker
                label="Unité pour ce mouvement"
                value={txUnite}
                onChange={setTxUnite}
                compact
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

            <div className="sm:col-span-2 pt-1">
              <UnitPicker
                label="Unité de conditionnement par défaut"
                value={editUnite}
                onChange={setEditUnite}
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                <input
                  type="checkbox"
                  checked={editIsImportant}
                  onChange={(e) => setEditIsImportant(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                <span>Produit important (Vital)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">
                <input
                  type="checkbox"
                  checked={editEnRupture}
                  onChange={(e) => setEditEnRupture(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>En rupture à la pharmacie hospitalière</span>
              </label>
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
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-center w-28">Unité</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-center w-28 sm:w-32">N° de Lot</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24">Entrées</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24">Sorties</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-right w-20 sm:w-24 bg-teal-50/70 text-teal-900">Stock</th>
                <th className="border border-slate-300 px-3 sm:px-4 py-2.5 sm:py-3 text-center w-28 sm:w-32">Date Péremption</th>
                <th className="border border-slate-300 px-2 sm:px-3 py-2.5 sm:py-3 text-center w-20 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {displayTransactions.map((t) => {
                const origLower = (t.origineDestination || '').toLowerCase();
                const isInventoryRow =
                  origLower.includes('inventaire') ||
                  origLower.includes('contrôle physique') ||
                  origLower.includes('controle physique');

                const rowColorClass = isInventoryRow
                  ? 'text-black'
                  : t.type === 'entree'
                  ? 'text-emerald-700'
                  : 'text-red-600';

                const badgeColorClass = isInventoryRow
                  ? 'bg-slate-100 text-black border-slate-300'
                  : t.type === 'entree'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200';

                return (
                  <tr key={t.id} className={clsx('hover:bg-slate-50/70 transition-colors', rowColorClass)}>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 font-medium whitespace-nowrap">
                      {safeFormatDate(t.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 font-medium">
                      {t.origineDestination || '-'}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">
                      <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border', badgeColorClass)}>
                        {formatUnitDisplay(t.unite || activeProduct.unite)}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-center whitespace-nowrap">
                      {t.numeroLot ? (
                        <span className={clsx('inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded border', badgeColorClass)}>
                          {t.numeroLot}
                        </span>
                      ) : (
                        <span className="text-xs opacity-50">-</span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-bold whitespace-nowrap">
                      {t.type === 'entree' ? (isInventoryRow && t.quantite === 0 ? '0' : `+${t.quantite}`) : '-'}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-bold whitespace-nowrap">
                      {t.type === 'sortie' ? `-${t.quantite}` : '-'}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-right font-black bg-teal-50/40 whitespace-nowrap">
                      {t.balanceAfter}
                    </td>
                    <td className="border border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 text-center font-medium whitespace-nowrap">
                      {safeFormatDate(t.datePeremption, 'MM/yyyy')}
                    </td>
                    <td className="border border-slate-200 px-2 py-2 text-center whitespace-nowrap print:hidden">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditTransactionModal(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="Modifier cette ligne"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxToDelete(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Supprimer cette ligne"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
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

      {/* Edit Transaction Row Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-teal-800 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-teal-200" />
                <h3 className="text-sm font-bold">Modifier le mouvement de stock</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="text-teal-200 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTransactionSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de mouvement</label>
                  <select
                    value={editTxType}
                    onChange={(e) => setEditTxType(e.target.value as 'entree' | 'sortie')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-600"
                  >
                    <option value="entree">Entrée (+)</option>
                    <option value="sortie">Sortie (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editTxQty}
                    onChange={(e) => setEditTxQty(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">N° de Lot</label>
                  <input
                    type="text"
                    placeholder="Ex: LOT-2026"
                    value={editTxLot}
                    onChange={(e) => setEditTxLot(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editTxType === 'entree' ? 'Origine (de : ...)' : 'Destination (pour : ...)'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(editTxType === 'entree' ? ENTREE_ORIGINES : SORTIE_DESTINATIONS).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setEditTxOrigineDest(choice)}
                      className={clsx(
                        "px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors",
                        editTxOrigineDest === choice
                          ? "bg-teal-700 text-white border-teal-700"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={editTxOrigineDest}
                  onChange={(e) => setEditTxOrigineDest(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date de Péremption</label>
                <input
                  type="date"
                  value={editTxExpiry}
                  onChange={(e) => setEditTxExpiry(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-600"
                />
              </div>

              <UnitPicker
                label="Unité de conditionnement"
                value={editTxUnite}
                onChange={setEditTxUnite}
                compact
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Transaction Confirmation Modal (Iframe Safe - No window.confirm) */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supprimer ce mouvement ?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Voulez-vous supprimer l'opération du <strong>{safeFormatDate(txToDelete.date, 'dd/MM/yyyy')}</strong> ({txToDelete.type === 'entree' ? '+' : '-'}{txToDelete.quantite} — {txToDelete.origineDestination}) ? Le solde sera recalculé automatiquement.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteTransaction}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-xs"
              >
                Supprimer la ligne
              </button>
            </div>
          </div>
        </div>
      )}

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
