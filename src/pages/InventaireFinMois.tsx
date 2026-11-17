import { useState, useMemo } from 'react';
import { useStore, getCurrentStock, Product, OrderItem } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  ClipboardList,
  Save,
  Calculator,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { sortCategories, sortProductsByCategoryAndName } from '../utils/categoryOrder';
import { formatUnitDisplay } from '../components/UnitPicker';

type TargetFormula = 'qmc' | 'qmc_plus_sec' | 'sec_x2';

export default function InventaireFinMois() {
  const navigate = useNavigate();
  const products = useStore((state) => state.products);
  const recordBulkPeriodicInventory = useStore((state) => state.recordBulkPeriodicInventory);
  const createOrder = useStore((state) => state.createOrder);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyEntered, setOnlyEntered] = useState(false);
  const [onlyToOrder, setOnlyToOrder] = useState(false);

  const [inventoryDate, setInventoryDate] = useState<string>(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '';
    }
  });
  const [inventoryLabel, setInventoryLabel] = useState<string>('Inventaire fin de mois');
  const [formula, setFormula] = useState<TargetFormula>('qmc');
  const [saveInventoryOnOrder, setSaveInventoryOnOrder] = useState(true);

  // Map productId -> string counted value entered by user
  const [countedInputs, setCountedInputs] = useState<Record<string, string>>({});
  // Map productId -> optional manual override for order quantity
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string>>({});

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const sortedProducts = useMemo(() => {
    return sortProductsByCategoryAndName(Array.isArray(products) ? products : []);
  }, [products]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    sortedProducts.forEach((p) => {
      if (p?.category) cats.add(p.category);
    });
    return sortCategories(Array.from(cats));
  }, [sortedProducts]);

  const computeRecommendedOrder = (product: Product, countedQty: number): number => {
    const qmc = Number(product.quantiteMoyenneMensuelle) || 0;
    const sec = Number(product.stockSecurite) || 0;
    let target = 0;

    if (formula === 'qmc') {
      target = qmc > 0 ? qmc : sec * 2;
    } else if (formula === 'qmc_plus_sec') {
      target = qmc + sec;
    } else {
      target = sec * 2;
    }

    return Math.max(0, target - countedQty);
  };

  const rows = useMemo(() => {
    return sortedProducts.map((p) => {
      const theoretical = getCurrentStock(p);
      const rawInput = countedInputs[p.id];
      const hasInput = rawInput !== undefined && rawInput.trim() !== '';
      const parsedCount = hasInput ? Math.max(0, parseInt(rawInput, 10) || 0) : theoretical;
      const delta = hasInput ? parsedCount - theoretical : 0;

      const autoOrderQty = computeRecommendedOrder(p, parsedCount);
      const overrideVal = orderOverrides[p.id];
      const finalOrderQty =
        overrideVal !== undefined && overrideVal.trim() !== ''
          ? Math.max(0, parseInt(overrideVal, 10) || 0)
          : autoOrderQty;

      return {
        product: p,
        theoretical,
        rawInput: rawInput ?? '',
        hasInput,
        counted: parsedCount,
        delta,
        autoOrderQty,
        finalOrderQty,
      };
    });
  }, [sortedProducts, countedInputs, orderOverrides, formula]);

  const filteredRows = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return rows.filter((r) => {
      const matchCat = categoryFilter === 'all' || r.product.category === categoryFilter;
      const matchSearch = !s || r.product.name.toLowerCase().includes(s);
      const matchEntered = !onlyEntered || r.hasInput;
      const matchToOrder = !onlyToOrder || r.finalOrderQty > 0;
      return matchCat && matchSearch && matchEntered && matchToOrder;
    });
  }, [rows, categoryFilter, searchTerm, onlyEntered, onlyToOrder]);

  const stats = useMemo(() => {
    const enteredRows = rows.filter((r) => r.hasInput);
    const discrepantRows = enteredRows.filter((r) => r.delta !== 0);
    const orderRows = rows.filter((r) => r.finalOrderQty > 0 && (r.hasInput || r.theoretical <= r.product.stockSecurite));
    const totalOrderUnits = orderRows.reduce((sum, r) => sum + r.finalOrderQty, 0);
    return {
      enteredCount: enteredRows.length,
      discrepancyCount: discrepantRows.length,
      orderRefCount: orderRows.length,
      totalOrderUnits,
      orderRows,
      enteredRows,
    };
  }, [rows]);

  const handleApplyAllTheoretical = () => {
    const next: Record<string, string> = { ...countedInputs };
    filteredRows.forEach((r) => {
      if (next[r.product.id] === undefined || next[r.product.id].trim() === '') {
        next[r.product.id] = String(r.theoretical);
      }
    });
    setCountedInputs(next);
  };

  const handleClearInputs = () => {
    setCountedInputs({});
    setOrderOverrides({});
  };

  const buildValidDateIso = (): string => {
    if (inventoryDate) {
      try {
        const d = new Date(inventoryDate);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {}
    }
    return new Date().toISOString();
  };

  const handleSaveInventoryOnly = () => {
    if (stats.enteredRows.length === 0) return;
    const dateIso = buildValidDateIso();

    recordBulkPeriodicInventory(
      stats.enteredRows.map((r) => ({
        productId: r.product.id,
        countedQty: r.counted,
        date: dateIso,
        label: inventoryLabel.trim() || 'Inventaire fin de mois',
        unite: r.product.unite,
      }))
    );

    setBannerMessage(
      `Inventaire périodique enregistré pour ${stats.enteredRows.length} produit(s) dans les fiches de stock (historique conservé).`
    );
    setCountedInputs({});
  };

  const handleCreateEstimatedOrder = () => {
    const candidates = rows.filter((r) =>
      r.hasInput ? r.finalOrderQty > 0 : r.finalOrderQty > 0 && (r.theoretical <= r.product.stockSecurite || r.product.enRuptureHopital)
    );
    if (candidates.length === 0) return;

    const dateIso = buildValidDateIso();

    if (saveInventoryOnOrder && stats.enteredRows.length > 0) {
      recordBulkPeriodicInventory(
        stats.enteredRows.map((r) => ({
          productId: r.product.id,
          countedQty: r.counted,
          date: dateIso,
          label: inventoryLabel.trim() || 'Inventaire fin de mois',
          unite: r.product.unite,
        }))
      );
    }

    const orderItems: OrderItem[] = candidates.map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      category: r.product.category,
      unite: r.product.unite,
      quantiteDemandee: r.finalOrderQty,
    }));

    const formattedDate = inventoryDate
      ? inventoryDate.split('-').reverse().join('/')
      : new Date().toLocaleDateString('fr-FR');

    createOrder({
      serviceDemandeur: 'Service du Bloc Opératoire',
      destinataire: 'Pharmacie Hospitalière Centrale',
      statut: 'en_cours',
      commentaires: `Commande estimée suite à ${inventoryLabel.trim() || 'Inventaire fin de mois'} du ${formattedDate}`,
      items: orderItems,
    });

    navigate('/commandes');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Inventaire Fin de Mois & Estimation Commande
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Saisissez l'effectif physique compté (sans effacer l'historique des fiches) pour ajuster les stocks et estimer le prochain bon de commande.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={stats.enteredRows.length === 0}
            onClick={handleSaveInventoryOnly}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-700 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-40 transition-colors shadow-2xs"
          >
            <Save className="h-4 w-4" />
            Enregistrer dans les Fiches ({stats.enteredCount})
          </button>

          <button
            type="button"
            disabled={stats.orderRefCount === 0}
            onClick={handleCreateEstimatedOrder}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-40 transition-colors shadow-xs"
          >
            <ClipboardList className="h-4 w-4" />
            Générer Bon de Commande ({stats.orderRefCount} réf.)
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-3 text-emerald-900 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bannerMessage}</span>
          </div>
          <Link
            to="/fiches-de-stock"
            className="text-xs font-bold text-emerald-800 underline shrink-0"
          >
            Voir les fiches
          </Link>
        </div>
      )}

      {/* Configuration & Formula Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Date d'inventaire
            </label>
            <input
              type="date"
              value={inventoryDate}
              onChange={(e) => setInventoryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Libellé sur la fiche de stock
            </label>
            <input
              type="text"
              value={inventoryLabel}
              onChange={(e) => setInventoryLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Méthode d'estimation commande
            </label>
            <div className="relative">
              <Calculator className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-teal-700" />
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value as TargetFormula)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-teal-600"
              >
                <option value="qmc">Cible = QMC mensuelle (défaut : Sécu × 2)</option>
                <option value="qmc_plus_sec">Cible = QMC + Stock de Sécurité</option>
                <option value="sec_x2">Cible = Stock de Sécurité × 2</option>
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-teal-50/70 border border-teal-200 px-3 py-2 rounded-lg w-full">
              <input
                type="checkbox"
                checked={saveInventoryOnOrder}
                onChange={(e) => setSaveInventoryOnOrder(e.target.checked)}
                className="rounded text-teal-700 focus:ring-teal-600"
              />
              <span>Enregistrer les fiches en générant le bon</span>
            </label>
          </div>
        </div>

        {/* Filters & Quick Helpers */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un médicament ou matériel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:bg-white focus:border-teal-600"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-teal-600"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOnlyEntered(!onlyEntered)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg font-semibold border transition-colors',
                onlyEntered
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              Saisis ({stats.enteredCount})
            </button>

            <button
              type="button"
              onClick={() => setOnlyToOrder(!onlyToOrder)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg font-semibold border transition-colors',
                onlyToOrder
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              À commander ({stats.orderRefCount})
            </button>

            <button
              type="button"
              onClick={handleApplyAllTheoretical}
              className="px-2.5 py-1.5 rounded-lg font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              title="Pré-remplir les lignes vides avec le stock théorique actuel"
            >
              Pré-remplir théorique
            </button>

            {stats.enteredCount > 0 && (
              <button
                type="button"
                onClick={handleClearInputs}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-3 w-3" />
                Vider saisie
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block">
            Produits comptés
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {stats.enteredCount}{' '}
            <span className="text-xs font-medium text-slate-400">/ {sortedProducts.length}</span>
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block">
            Écarts relevés
          </span>
          <span className="text-xl font-black text-amber-600 mt-0.5 block">
            {stats.discrepancyCount}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block">
            Références à commander
          </span>
          <span className="text-xl font-black text-blue-700 mt-0.5 block">
            {stats.orderRefCount}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block">
            Total unités estimées
          </span>
          <span className="text-xl font-black text-teal-800 mt-0.5 block">
            {stats.totalOrderUnits}
          </span>
        </div>
      </div>

      {/* Mobile Cards (< md) */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {filteredRows.map(({ product, theoretical, rawInput, hasInput, delta, finalOrderQty }) => (
          <div
            key={product.id}
            className={clsx(
              'rounded-2xl border bg-white p-3.5 shadow-2xs space-y-2.5',
              hasInput ? 'border-teal-400 bg-teal-50/20' : 'border-slate-200'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  to={`/fiches-de-stock/${encodeURIComponent(product.id)}`}
                  className={clsx(
                    'text-sm font-bold hover:underline',
                    product.isImportant ? 'text-red-600' : 'text-slate-900'
                  )}
                >
                  {product.name}
                </Link>
                <p className="text-[11px] text-slate-500">
                  {product.category} • {formatUnitDisplay(product.unite)}
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 shrink-0">
                Théorique : {theoretical}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Effectif réel compté
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={String(theoretical)}
                  value={rawInput}
                  onChange={(e) =>
                    setCountedInputs({ ...countedInputs, [product.id]: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">
                  Qté à commander
                </label>
                <input
                  type="number"
                  min="0"
                  value={orderOverrides[product.id] ?? String(finalOrderQty)}
                  onChange={(e) =>
                    setOrderOverrides({ ...orderOverrides, [product.id]: e.target.value })
                  }
                  className="w-full rounded-lg border border-blue-300 bg-blue-50/40 px-2.5 py-1.5 text-sm font-bold text-blue-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {hasInput && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span className="text-slate-500">
                  QMC : {product.quantiteMoyenneMensuelle} | Sécu : {product.stockSecurite}
                </span>
                <span
                  className={clsx(
                    'font-bold',
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500'
                  )}
                >
                  Écart : {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Produit & Catégorie</th>
                <th className="px-3 py-3 text-center">Unité</th>
                <th className="px-3 py-3 text-right">QMC / Sécu</th>
                <th className="px-3 py-3 text-right">Stock Théorique</th>
                <th className="px-3 py-3 text-center w-36 bg-teal-50/60 text-teal-900">
                  Effectif Réel Compté
                </th>
                <th className="px-3 py-3 text-center">Écart</th>
                <th className="px-3 py-3 text-center w-36 bg-blue-50/60 text-blue-900">
                  Estimation Commande
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map(({ product, theoretical, rawInput, hasInput, delta, finalOrderQty }) => (
                <tr
                  key={product.id}
                  className={clsx(
                    'hover:bg-slate-50/80 transition-colors',
                    hasInput && 'bg-teal-50/20'
                  )}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/fiches-de-stock/${encodeURIComponent(product.id)}`}
                      className={clsx(
                        'font-bold text-sm hover:underline block leading-tight',
                        product.isImportant ? 'text-red-600' : 'text-slate-900'
                      )}
                    >
                      {product.name}
                    </Link>
                    <span className="text-[11px] text-slate-500">{product.category}</span>
                  </td>

                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                      {formatUnitDisplay(product.unite)}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap">
                    <span className="font-semibold text-slate-700">
                      {product.quantiteMoyenneMensuelle}
                    </span>{' '}
                    / {product.stockSecurite}
                  </td>

                  <td className="px-3 py-2.5 text-right font-bold text-slate-800 whitespace-nowrap">
                    {theoretical}
                  </td>

                  <td className="px-3 py-2.5 text-center bg-teal-50/30">
                    <input
                      type="number"
                      min="0"
                      placeholder={String(theoretical)}
                      value={rawInput}
                      onChange={(e) =>
                        setCountedInputs({ ...countedInputs, [product.id]: e.target.value })
                      }
                      className="w-24 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-right text-xs font-black text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </td>

                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                    {hasInput ? (
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold',
                          delta > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : delta < 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-center bg-blue-50/30">
                    <input
                      type="number"
                      min="0"
                      value={orderOverrides[product.id] ?? String(finalOrderQty)}
                      onChange={(e) =>
                        setOrderOverrides({ ...orderOverrides, [product.id]: e.target.value })
                      }
                      className={clsx(
                        'w-24 rounded-lg border px-2.5 py-1 text-right text-xs font-black outline-none',
                        finalOrderQty > 0
                          ? 'border-blue-400 bg-white text-blue-900 focus:border-blue-600'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Aucun produit correspondant aux filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
