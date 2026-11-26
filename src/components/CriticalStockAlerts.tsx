import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  FileText,
  Filter,
  ShoppingCart,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore, getCurrentStock, Product, OrderItem } from '../store';
import { getCategoryRank } from '../utils/categoryOrder';
import { formatUnitDisplay } from './UnitPicker';

type AlertTier = 'p1_vital' | 'p1' | 'p2_vital' | 'p3';
type AlertFilterMode = 'confirmed' | 'rupture' | 'all_including_blank';

interface CriticalAlertItem {
  product: Product;
  currentStock: number;
  threshold: number;
  deficit: number;
  coverageRatio: number;
  hasHistory: boolean;
  tier: AlertTier;
  tierRank: number;
  tierLabel: string;
  suggestedOrderQty: number;
  pendingOrderNumber: string | null;
}

function getTierInfo(stock: number, isImportant: boolean): {
  tier: AlertTier;
  rank: number;
  label: string;
} {
  if (stock <= 0 && isImportant) {
    return { tier: 'p1_vital', rank: 1, label: 'P1 · Rupture Vitale' };
  }
  if (stock <= 0) {
    return { tier: 'p1', rank: 2, label: 'P1 · Rupture Stock' };
  }
  if (isImportant) {
    return { tier: 'p2_vital', rank: 3, label: 'P2 · Seuil Vital' };
  }
  return { tier: 'p3', rank: 4, label: 'P3 · Seuil Critique' };
}

function computeSuggestedQty(product: Product, currentStock: number): number {
  const threshold = Math.max(0, Number(product.stockSecurite) || 0);
  const qmc = Math.max(0, Number(product.quantiteMoyenneMensuelle) || 0);
  const target = qmc > 0 ? Math.max(qmc, threshold * 2) : Math.max(threshold * 2, 10);
  return Math.max(1, target - Math.max(0, currentStock));
}

export default function CriticalStockAlerts() {
  const products = useStore((state) => state.products);
  const orders = useStore((state) => state.orders);
  const createOrder = useStore((state) => state.createOrder);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterMode, setFilterMode] = useState<AlertFilterMode>('confirmed');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyUnordered, setOnlyUnordered] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [createdOrderBanner, setCreatedOrderBanner] = useState<{
    numeroCommande: string;
    itemCount: number;
  } | null>(null);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Map productId -> active pending order number (statut === 'en_cours')
  const pendingOrderByProduct = useMemo(() => {
    const map = new Map<string, string>();
    safeOrders
      .filter((o) => o && o.statut === 'en_cours')
      .forEach((order) => {
        (order.items || []).forEach((item) => {
          if (item?.productId && !map.has(item.productId)) {
            map.set(item.productId, order.numeroCommande);
          }
        });
      });
    return map;
  }, [safeOrders]);

  // All products at or below critical threshold (stock <= stockSecurite)
  const allThresholdAlerts = useMemo<CriticalAlertItem[]>(() => {
    const items: CriticalAlertItem[] = [];

    safeProducts.forEach((p) => {
      if (!p) return;
      const currentStock = getCurrentStock(p);
      const threshold = Math.max(0, Number(p.stockSecurite) || 0);
      const hasHistory = Array.isArray(p.transactions) && p.transactions.length > 0;

      if (currentStock <= threshold) {
        const tierInfo = getTierInfo(currentStock, Boolean(p.isImportant));
        const deficit = Math.max(0, threshold - currentStock);
        const coverageRatio = threshold > 0 ? currentStock / threshold : currentStock <= 0 ? 0 : 1;

        items.push({
          product: p,
          currentStock,
          threshold,
          deficit,
          coverageRatio,
          hasHistory,
          tier: tierInfo.tier,
          tierRank: tierInfo.rank,
          tierLabel: tierInfo.label,
          suggestedOrderQty: computeSuggestedQty(p, currentStock),
          pendingOrderNumber: pendingOrderByProduct.get(p.id) || null,
        });
      }
    });

    // Prioritize: tierRank -> unordered first -> hospital available before central rupture -> lowest coverage -> category & name
    items.sort((a, b) => {
      if (a.tierRank !== b.tierRank) return a.tierRank - b.tierRank;
      const aOrdered = a.pendingOrderNumber ? 1 : 0;
      const bOrdered = b.pendingOrderNumber ? 1 : 0;
      if (aOrdered !== bOrdered) return aOrdered - bOrdered;
      const aRupture = a.product.enRuptureHopital ? 1 : 0;
      const bRupture = b.product.enRuptureHopital ? 1 : 0;
      if (aRupture !== bRupture) return aRupture - bRupture;
      if (a.coverageRatio !== b.coverageRatio) return a.coverageRatio - b.coverageRatio;
      const rankA = getCategoryRank(a.product.category);
      const rankB = getCategoryRank(b.product.category);
      if (rankA !== rankB) return rankA - rankB;
      return (a.product.name || '').localeCompare(b.product.name || '', 'fr', {
        sensitivity: 'base',
        numeric: true,
      });
    });

    return items;
  }, [safeProducts, pendingOrderByProduct]);

  const confirmedAlerts = useMemo(
    () => allThresholdAlerts.filter((item) => item.hasHistory),
    [allThresholdAlerts]
  );

  const blankZeroCount = useMemo(
    () => allThresholdAlerts.filter((item) => !item.hasHistory).length,
    [allThresholdAlerts]
  );

  const displayedAlerts = useMemo(() => {
    let base = allThresholdAlerts;
    if (filterMode === 'confirmed') {
      base = confirmedAlerts;
    } else if (filterMode === 'rupture') {
      base = confirmedAlerts.filter((i) => i.currentStock <= 0);
    }

    if (categoryFilter !== 'all') {
      base = base.filter((i) => i.product.category === categoryFilter);
    }

    if (onlyUnordered) {
      base = base.filter((i) => !i.pendingOrderNumber);
    }

    return base;
  }, [allThresholdAlerts, confirmedAlerts, filterMode, categoryFilter, onlyUnordered]);

  const availableAlertCategories = useMemo(() => {
    const source = filterMode === 'all_including_blank' ? allThresholdAlerts : confirmedAlerts;
    return Array.from(new Set(source.map((i) => i.product.category).filter(Boolean))).sort((a, b) =>
      getCategoryRank(a) !== getCategoryRank(b)
        ? getCategoryRank(a) - getCategoryRank(b)
        : a.localeCompare(b, 'fr')
    );
  }, [allThresholdAlerts, confirmedAlerts, filterMode]);

  // Keep orderQuantities initialized for newly alerted items
  useEffect(() => {
    setOrderQuantities((prev) => {
      const next = { ...prev };
      let changed = false;
      allThresholdAlerts.forEach((item) => {
        if (next[item.product.id] === undefined) {
          next[item.product.id] = item.suggestedOrderQty;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [allThresholdAlerts]);

  const stats = useMemo(() => {
    const ruptures = confirmedAlerts.filter((i) => i.currentStock <= 0).length;
    const vitals = confirmedAlerts.filter((i) => i.product.isImportant).length;
    const unordered = confirmedAlerts.filter((i) => !i.pendingOrderNumber).length;
    return {
      total: confirmedAlerts.length,
      ruptures,
      vitals,
      unordered,
    };
  }, [confirmedAlerts]);

  const selectedAlerts = useMemo(
    () => displayedAlerts.filter((item) => selectedIds[item.product.id]),
    [displayedAlerts, selectedIds]
  );

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleSelectRecommended = () => {
    const next: Record<string, boolean> = {};
    displayedAlerts.forEach((item) => {
      if (!item.pendingOrderNumber && !item.product.enRuptureHopital) {
        next[item.product.id] = true;
      }
    });
    setSelectedIds(next);
  };

  const handleSelectAllVisible = () => {
    const next: Record<string, boolean> = {};
    displayedAlerts.forEach((item) => {
      next[item.product.id] = true;
    });
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds({});
  };

  const handleCreatePriorityOrder = (itemsToOrder: CriticalAlertItem[]) => {
    if (itemsToOrder.length === 0) return;

    const orderItems: OrderItem[] = itemsToOrder.map((item) => {
      const qty = Math.max(1, Number(orderQuantities[item.product.id] ?? item.suggestedOrderQty) || 1);
      return {
        productId: item.product.id,
        productName: item.product.name,
        category: item.product.category,
        unite: item.product.unite,
        quantiteDemandee: qty,
      };
    });

    const newOrderId = createOrder({
      serviceDemandeur: 'Service du Bloc Opératoire',
      destinataire: 'Pharmacie Hospitalière Centrale',
      statut: 'en_cours',
      commentaires: `Commande prioritaire générée depuis les alertes de seuil critique (${orderItems.length} référence${orderItems.length > 1 ? 's' : ''})`,
      items: orderItems,
    });

    const created = useStore.getState().orders.find((o) => o.id === newOrderId);
    setCreatedOrderBanner({
      numeroCommande: created?.numeroCommande || 'Nouveau Bon',
      itemCount: orderItems.length,
    });
    setSelectedIds({});
  };

  const scrollToAlertQueue = () => {
    setIsExpanded(true);
    const el = document.getElementById('priority-reorder-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section aria-label="Alertes seuils critiques et réapprovisionnement prioritaire" className="space-y-4">
      {/* GLOBAL ALERT NOTIFICATION BANNER */}
      {stats.total > 0 && !bannerDismissed && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 sm:p-5 text-slate-900"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-lg bg-rose-700 p-2.5 text-white shrink-0 mt-0.5">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="text-sm sm:text-base font-bold text-rose-950">
                    Alerte Seuil Critique : {stats.total} produit{stats.total > 1 ? 's' : ''} à réapprovisionner
                  </h2>
                </div>

                <p className="text-xs text-rose-900/90 tabular-nums">
                  {stats.ruptures > 0 && (
                    <>
                      <strong className="font-bold text-rose-800">{stats.ruptures} en rupture (stock 0)</strong>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                    </>
                  )}
                  <strong className="font-bold text-rose-800">{stats.vitals} produit{stats.vitals > 1 ? 's' : ''} vitaux</strong>
                  <span aria-hidden="true" className="mx-1.5">·</span>
                  <span>
                    <strong className="font-bold">{stats.unordered}</strong> non encore commandé{stats.unordered > 1 ? 's' : ''}
                  </span>
                </p>

                {/* Top 3 urgent items inline summary */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-slate-700">
                  {confirmedAlerts.slice(0, 3).map((item, idx) => (
                    <span key={item.product.id} className="inline-flex items-center gap-1 tabular-nums">
                      {idx > 0 && <span aria-hidden="true" className="text-rose-300 mr-1">/</span>}
                      <Link
                        to={`/fiches-de-stock/${encodeURIComponent(item.product.id)}`}
                        className="font-semibold text-rose-950 hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <span className="text-rose-800 font-mono text-[11px]">
                        ({item.currentStock}/{item.threshold})
                      </span>
                    </span>
                  ))}
                  {confirmedAlerts.length > 3 && (
                    <span className="text-[11px] font-medium text-rose-800">
                      + {confirmedAlerts.length - 3} autre{confirmedAlerts.length - 3 > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {stats.unordered > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const unorderedAvailable = confirmedAlerts.filter(
                      (i) => !i.pendingOrderNumber && !i.product.enRuptureHopital
                    );
                    if (unorderedAvailable.length > 0) {
                      handleCreatePriorityOrder(unorderedAvailable);
                    } else {
                      scrollToAlertQueue();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span>Commander les urgences</span>
                </button>
              )}

              <button
                type="button"
                onClick={scrollToAlertQueue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100/60 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Prioriser la file ({stats.total})</span>
              </button>

              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="rounded-lg p-2 text-rose-700 hover:bg-rose-200/50 transition-colors"
                title="Masquer temporairement cette bannière"
                aria-label="Masquer la bannière d'alerte"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Banner after Priority Reorder Created */}
      {createdOrderBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>
              Bon de commande prioritaire <strong className="font-bold font-mono">{createdOrderBanner.numeroCommande}</strong> créé avec{' '}
              <strong className="tabular-nums">{createdOrderBanner.itemCount}</strong> article{createdOrderBanner.itemCount > 1 ? 's' : ''}.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/commandes"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Ouvrir Bons de Commande</span>
            </Link>
            <button
              type="button"
              onClick={() => setCreatedOrderBanner(null)}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* PRIORITY REORDER QUEUE PANEL */}
      <div
        id="priority-reorder-panel"
        className="rounded-xl border border-slate-200 bg-white overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={clsx(
                'rounded-lg p-2 shrink-0',
                stats.total > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              )}
            >
              {stats.total > 0 ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Surveillance des Seuils Critiques & Réapprovisionnement Prioritaire
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {stats.total > 0
                  ? `${stats.total} référence${stats.total > 1 ? 's' : ''} sous le seuil de sécurité · Triée${stats.total > 1 ? 's' : ''} par criticité clinique`
                  : blankZeroCount > 0
                  ? `Aucun stock inventorié sous le seuil · ${blankZeroCount} référence${blankZeroCount > 1 ? 's' : ''} à inventorier`
                  : 'Tous les produits suivis disposent d’un stock supérieur au seuil critique'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {bannerDismissed && stats.total > 0 && (
              <button
                type="button"
                onClick={() => setBannerDismissed(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors whitespace-nowrap"
              >
                <BellRing className="h-3.5 w-3.5" />
                <span>Afficher bannière</span>
              </button>
            )}

            <Link
              to="/commandes"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <ClipboardList className="h-3.5 w-3.5 text-teal-700" />
              <span>Bons de Commande</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? 'Réduire' : 'Déplier'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter & Batch Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Segmented Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFilterMode('confirmed')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums',
                      filterMode === 'confirmed'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Alertes actives ({confirmedAlerts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('rupture')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums',
                      filterMode === 'rupture'
                        ? 'bg-white text-rose-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Ruptures ({stats.ruptures})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all_including_blank')}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums',
                      filterMode === 'all_including_blank'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Inclure stock vierge ({allThresholdAlerts.length})
                  </button>
                </div>

                {availableAlertCategories.length > 1 && (
                  <div className="inline-flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      aria-label="Filtrer par catégorie"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-teal-600"
                    >
                      <option value="all">Toutes catégories</option>
                      {availableAlertCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none px-2 py-1">
                  <input
                    type="checkbox"
                    checked={onlyUnordered}
                    onChange={(e) => setOnlyUnordered(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  />
                  <span>Non commandés uniquement</span>
                </label>
              </div>

              {/* Selection & Reorder CTA */}
              {displayedAlerts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectRecommended}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Sélectionner à commander
                  </button>
                  <button
                    type="button"
                    onClick={selectedAlerts.length === displayedAlerts.length ? handleClearSelection : handleSelectAllVisible}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    {selectedAlerts.length === displayedAlerts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                  <button
                    type="button"
                    disabled={selectedAlerts.length === 0}
                    onClick={() => handleCreatePriorityOrder(selectedAlerts)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums',
                      selectedAlerts.length > 0
                        ? 'bg-teal-700 text-white hover:bg-teal-800'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>
                      Créer Bon de Commande ({selectedAlerts.length})
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Alert Queue Table / Empty State */}
            {displayedAlerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-800">
                  {filterMode === 'confirmed' && blankZeroCount > 0
                    ? `Aucune alerte critique active sur les produits déjà inventoriés`
                    : `Aucun produit sous son seuil critique pour ce filtre`}
                </p>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  {filterMode === 'confirmed' && blankZeroCount > 0
                    ? `${blankZeroCount} référence${blankZeroCount > 1 ? 's' : ''} ont un stock vierge (0 sans mouvement saisi). Vous pouvez les afficher ou saisir l'effectif initial.`
                    : `Dès qu'une sortie ou un inventaire ramène un produit à ou sous son stock de sécurité, il apparaîtra ici par ordre de priorité.`}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  {filterMode === 'confirmed' && blankZeroCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('all_including_blank')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Afficher les {blankZeroCount} références vierges
                    </button>
                  )}
                  <Link
                    to="/inventaire"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Saisir l'inventaire fin de mois
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet High-Density Table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th scope="col" className="w-10 px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            aria-label="Tout sélectionner"
                            checked={displayedAlerts.length > 0 && selectedAlerts.length === displayedAlerts.length}
                            onChange={(e) =>
                              e.target.checked ? handleSelectAllVisible() : handleClearSelection()
                            }
                            className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                          />
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-left">Priorité</th>
                        <th scope="col" className="px-3 py-2.5 text-left">Médicament / Matériel</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Stock / Seuil</th>
                        <th scope="col" className="px-3 py-2.5 text-left">Statut Commande</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Qté à commander</th>
                        <th scope="col" className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {displayedAlerts.map((item) => {
                        const { product, currentStock, threshold, tier, tierLabel, pendingOrderNumber } = item;
                        const isSelected = Boolean(selectedIds[product.id]);
                        const qtyValue = orderQuantities[product.id] ?? item.suggestedOrderQty;

                        return (
                          <tr
                            key={product.id}
                            className={clsx(
                              'transition-colors',
                              isSelected ? 'bg-teal-50/40' : 'hover:bg-slate-50/80'
                            )}
                          >
                            <td className="px-3 py-2.5 text-center">
                              <input
                                type="checkbox"
                                aria-label={`Sélectionner ${product.name}`}
                                checked={isSelected}
                                onChange={() => toggleSelect(product.id)}
                                className="rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                              />
                            </td>

                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1.5 font-semibold',
                                  tier === 'p1_vital' || tier === 'p1'
                                    ? 'text-rose-700'
                                    : tier === 'p2_vital'
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                                )}
                              >
                                {tier === 'p1_vital' || tier === 'p1' ? (
                                  <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>{tierLabel}</span>
                              </span>
                            </td>

                            <td className="px-3 py-2.5">
                              <Link
                                to={`/fiches-de-stock/${encodeURIComponent(product.id)}`}
                                className={clsx(
                                  'font-bold hover:underline block',
                                  product.isImportant ? 'text-red-700' : 'text-slate-900'
                                )}
                              >
                                {product.name}
                              </Link>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span>{product.category}</span>
                                <span aria-hidden="true">·</span>
                                <span>{formatUnitDisplay(product.unite)}</span>
                                {!item.hasHistory && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-slate-400">Stock vierge</span>
                                  </>
                                )}
                                {product.enRuptureHopital && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-semibold text-rose-700">Rupture pharmacie centrale</span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono tabular-nums">
                              <span
                                className={clsx(
                                  'font-bold',
                                  currentStock <= 0 ? 'text-rose-700' : 'text-amber-700'
                                )}
                              >
                                {currentStock}
                              </span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-slate-600">{threshold}</span>
                            </td>

                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {pendingOrderNumber ? (
                                <Link
                                  to="/commandes"
                                  className="inline-flex items-center gap-1 font-medium text-teal-800 hover:underline font-mono"
                                >
                                  <span>En cours : {pendingOrderNumber}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="text-rose-700 font-medium">À commander</span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <input
                                type="number"
                                min={1}
                                value={qtyValue}
                                aria-label={`Quantité à commander pour ${product.name}`}
                                onChange={(e) =>
                                  setOrderQuantities((prev) => ({
                                    ...prev,
                                    [product.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  }))
                                }
                                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right font-mono tabular-nums text-xs text-slate-900 focus:border-teal-600 outline-none"
                              />
                            </td>

                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCreatePriorityOrder([item])}
                                  className="rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
                                >
                                  Commander
                                </button>
                                <Link
                                  to={`/fiches-de-stock/${encodeURIComponent(product.id)}`}
                                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                                >
                                  Fiche
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Touch-Friendly List */}
                <div className="md:hidden divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {displayedAlerts.map((item) => {
                    const { product, currentStock, threshold, tier, tierLabel, pendingOrderNumber } = item;
                    const isSelected = Boolean(selectedIds[product.id]);
                    const qtyValue = orderQuantities[product.id] ?? item.suggestedOrderQty;

                    return (
                      <div
                        key={product.id}
                        className={clsx('p-3.5 space-y-2.5', isSelected && 'bg-teal-50/40')}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(product.id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                            />
                            <div className="min-w-0">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-1 text-[11px] font-bold',
                                  tier === 'p1_vital' || tier === 'p1'
                                    ? 'text-rose-700'
                                    : tier === 'p2_vital'
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                                )}
                              >
                                {tier === 'p1_vital' || tier === 'p1' ? (
                                  <AlertOctagon className="h-3 w-3" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3" />
                                )}
                                {tierLabel}
                              </span>
                              <Link
                                to={`/fiches-de-stock/${encodeURIComponent(product.id)}`}
                                className={clsx(
                                  'block text-sm font-bold truncate hover:underline',
                                  product.isImportant ? 'text-red-700' : 'text-slate-900'
                                )}
                              >
                                {product.name}
                              </Link>
                              <p className="text-[11px] text-slate-500">
                                {product.category} · {formatUnitDisplay(product.unite)}
                              </p>
                            </div>
                          </label>

                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div className="text-sm font-bold text-rose-700">
                              {currentStock} / {threshold}
                            </div>
                            <div className="text-[10px] text-slate-500">Stock / Seuil</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                          <div className="text-[11px]">
                            {pendingOrderNumber ? (
                              <span className="text-teal-800 font-semibold font-mono">
                                En cours : {pendingOrderNumber}
                              </span>
                            ) : (
                              <span className="text-rose-700 font-semibold">À commander</span>
                            )}
                            {product.enRuptureHopital && (
                              <span className="block text-rose-700 font-medium">Rupture pharmacie centrale</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={qtyValue}
                              onChange={(e) =>
                                setOrderQuantities((prev) => ({
                                  ...prev,
                                  [product.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                                }))
                              }
                              className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-right font-mono tabular-nums text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreatePriorityOrder([item])}
                              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                            >
                              Commander
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
