import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { 
  CalendarClock, 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import { safeFormatDate, safeTimestamp } from '../utils/formatters';

interface ExpiryItem {
  id: string; // transaction id
  productId: string;
  productName: string;
  category: string;
  quantite: number;
  datePeremption: string;
  numeroLot?: string;
  dateEntree: string;
  origineDestination?: string;
  isExpired: boolean;
  isThisMonth: boolean;
  isWithin90Days: boolean;
  daysRemaining: number;
}

export default function CalendrierPeremption() {
  const products = useStore((state) => state.products);
  const safeProducts = Array.isArray(products) ? products : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expired' | 'soon' | 'valid'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract and calculate all entries with an expiry date
  const expiries = useMemo<ExpiryItem[]>(() => {
    const list: ExpiryItem[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    safeProducts.forEach((p) => {
      if (!p || !Array.isArray(p.transactions)) return;
      p.transactions.forEach((t) => {
        if (t && t.type === 'entree' && t.datePeremption) {
          const expTimestamp = safeTimestamp(t.datePeremption, 0);
          const expDate = new Date(expTimestamp);
          const isExpired = expTimestamp < todayStart;
          const expMonthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;
          const isThisMonth = expMonthKey === currentMonthKey;
          
          const diffDays = Math.ceil((expTimestamp - todayStart) / (1000 * 60 * 60 * 24));
          const isWithin90Days = !isExpired && diffDays <= 90;

          list.push({
            id: t.id,
            productId: p.id,
            productName: p.name || 'Produit sans nom',
            category: p.category || 'Général',
            quantite: Number(t.quantite) || 0,
            datePeremption: t.datePeremption,
            numeroLot: t.numeroLot?.trim() || undefined,
            dateEntree: t.date,
            origineDestination: t.origineDestination,
            isExpired,
            isThisMonth,
            isWithin90Days,
            daysRemaining: diffDays,
          });
        }
      });
    });

    // Sort chronologically (oldest expiry first, so expired items are on top)
    list.sort((a, b) => safeTimestamp(a.datePeremption, Infinity) - safeTimestamp(b.datePeremption, Infinity));
    return list;
  }, [safeProducts]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    expiries.forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort();
  }, [expiries]);

  // Filtered items based on search, status filter, and category
  const filteredExpiries = useMemo(() => {
    return expiries.filter((it) => {
      // Category filter
      if (selectedCategory !== 'all' && it.category !== selectedCategory) return false;

      // Status filter
      if (activeFilter === 'expired' && !it.isExpired) return false;
      if (activeFilter === 'soon' && (!it.isWithin90Days && !it.isExpired)) return false;
      if (activeFilter === 'valid' && it.isExpired) return false;

      // Search query (product name OR lot number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = it.productName.toLowerCase().includes(q);
        const matchesLot = (it.numeroLot || '').toLowerCase().includes(q);
        const matchesCat = it.category.toLowerCase().includes(q);
        return matchesName || matchesLot || matchesCat;
      }

      return true;
    });
  }, [expiries, selectedCategory, activeFilter, searchQuery]);

  // Group filtered items by month
  const groupedExpiries = useMemo(() => {
    return filteredExpiries.reduce((acc, curr) => {
      const monthYear = safeFormatDate(curr.datePeremption, 'MMMM yyyy', 'Date indéterminée');
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(curr);
      return acc;
    }, {} as Record<string, ExpiryItem[]>);
  }, [filteredExpiries]);

  // Aggregate summary counts
  const totalLots = expiries.length;
  const expiredCount = expiries.filter((x) => x.isExpired).length;
  const soonCount = expiries.filter((x) => x.isWithin90Days).length;
  const validCount = expiries.filter((x) => !x.isExpired && !x.isWithin90Days).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs active:scale-95"
            title="Retour au Tableau de bord"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 shrink-0">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Calendrier de Péremption & Suivi des Lots
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Surveillance automatique des dates de péremption et des numéros de lot au bloc opératoire
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/fiches-de-stock"
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-700 bg-white px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors shadow-2xs active:scale-95"
        >
          <FileText className="h-4 w-4 text-teal-700" />
          <span>Fiches de Stock</span>
        </Link>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Lots Répertoriés</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">{totalLots}</span>
          </div>
        </div>

        <div className={clsx(
          "rounded-2xl border p-4 shadow-2xs flex items-center gap-3 transition-colors",
          expiredCount > 0 ? "border-rose-300 bg-rose-50/70" : "border-slate-200 bg-white"
        )}>
          <div className={clsx("p-2.5 rounded-xl", expiredCount > 0 ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500")}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Lots Périmés</span>
            <div className="flex items-baseline gap-1.5">
              <span className={clsx("text-xl sm:text-2xl font-black", expiredCount > 0 ? "text-rose-600" : "text-slate-900")}>
                {expiredCount}
              </span>
              {expiredCount > 0 && (
                <span className="text-[10px] font-bold text-rose-700 uppercase">Action requise</span>
              )}
            </div>
          </div>
        </div>

        <div className={clsx(
          "rounded-2xl border p-4 shadow-2xs flex items-center gap-3 transition-colors",
          soonCount > 0 ? "border-amber-300 bg-amber-50/70" : "border-slate-200 bg-white"
        )}>
          <div className={clsx("p-2.5 rounded-xl", soonCount > 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500")}>
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Expire &lt; 90 Jours</span>
            <span className={clsx("text-xl sm:text-2xl font-black", soonCount > 0 ? "text-amber-700" : "text-slate-900")}>
              {soonCount}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Lots Valides</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800">{validCount}</span>
          </div>
        </div>
      </div>

      {/* Critical Expiry Banner if any expired lots exist */}
      {expiredCount > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                Alerte Médico-Légale : {expiredCount} lot{expiredCount > 1 ? 's' : ''} périmé{expiredCount > 1 ? 's' : ''} détecté{expiredCount > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 max-w-2xl">
                Ces produits ont dépassé leur date limite d'utilisation. Veuillez procéder à leur retrait des rayonnages du bloc et saisir une sortie sous le motif <strong>« Décharge périmé »</strong> dans leur fiche de stock respective.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilter('expired')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-2 text-xs font-bold shadow-2xs shrink-0 active:scale-95 transition-all"
          >
            <span>Voir les {expiredCount} lots périmés</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom de produit ou par N° de lot (ex: LOT-45892)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="all">Toutes les catégories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeFilter === 'all'
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Tous les lots ({totalLots})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('expired')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeFilter === 'expired'
                ? "bg-rose-700 text-white shadow-2xs"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            )}
          >
            <span>🚨 Périmés uniquement</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {expiredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('soon')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeFilter === 'soon'
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            )}
          >
            <span>⏳ &lt; 90 jours</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {soonCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('valid')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeFilter === 'valid'
                ? "bg-emerald-700 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            )}
          >
            <span>✓ Valides</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
              {validCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content: Grouped by Month */}
      {Object.keys(groupedExpiries).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs space-y-3">
          <CalendarClock className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">Aucun lot correspondant aux critères</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || activeFilter !== 'all' || selectedCategory !== 'all'
              ? "Aucun lot ne correspond à votre recherche ou filtre actuel. Réinitialisez vos filtres pour tout afficher."
              : "Les dates de péremption et numéros de lot s'enregistrent automatiquement lors de la réception d'un bon de commande, d'un inventaire physique ou d'une entrée manuelle."}
          </p>
          {(searchQuery || activeFilter !== 'all' || selectedCategory !== 'all') ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
                setSelectedCategory('all');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-900"
            >
              Réinitialiser les filtres
            </button>
          ) : (
            <Link
              to="/fiches-de-stock"
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
            >
              <FileText className="h-4 w-4" />
              Ouvrir les Fiches de Stock
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExpiries).map(([monthYear, items]) => {
            const hasExpiredInGroup = items.some((it) => it.isExpired);
            return (
              <div
                key={monthYear}
                className={clsx(
                  "rounded-2xl border bg-white shadow-2xs overflow-hidden transition-all",
                  hasExpiredInGroup ? "border-rose-200" : "border-slate-200"
                )}
              >
                {/* Month Group Header */}
                <div className={clsx(
                  "px-5 py-3 border-b flex items-center justify-between",
                  hasExpiredInGroup ? "bg-rose-50/60 border-rose-200" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center gap-2">
                    <Calendar className={clsx("h-4 w-4", hasExpiredInGroup ? "text-rose-600" : "text-blue-600")} />
                    <h2 className={clsx("font-bold capitalize text-sm", hasExpiredInGroup ? "text-rose-950 font-black" : "text-slate-900")}>
                      {monthYear}
                    </h2>
                    {hasExpiredInGroup && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                        Attention : Lots périmés
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {items.length} lot{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-left">Produit</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-left">Catégorie</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-center">N° de Lot</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-center">Statut</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-right">Quantité</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-center">Date Péremption</th>
                        <th scope="col" className="px-4 sm:px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className={clsx(
                            "transition-colors",
                            item.isExpired
                              ? "bg-rose-50/40 hover:bg-rose-50/70"
                              : item.isWithin90Days
                              ? "bg-amber-50/30 hover:bg-amber-50/60"
                              : "hover:bg-slate-50"
                          )}
                        >
                          {/* Product Name */}
                          <td className="px-4 sm:px-5 py-3 font-semibold">
                            <Link
                              to={`/fiches-de-stock/${encodeURIComponent(item.productId)}`}
                              className={clsx(
                                "hover:underline block font-bold",
                                item.isExpired ? "text-rose-900" : "text-teal-800 hover:text-teal-950"
                              )}
                            >
                              {item.productName}
                            </Link>
                            {item.origineDestination && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                {item.origineDestination}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-4 sm:px-5 py-3 text-slate-500 text-xs">
                            {item.category}
                          </td>

                          {/* Lot Number */}
                          <td className="px-4 sm:px-5 py-3 text-center whitespace-nowrap">
                            {item.numeroLot ? (
                              <span className={clsx(
                                "inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded border",
                                item.isExpired
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-slate-100 text-slate-800 border-slate-300"
                              )}>
                                {item.numeroLot}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs italic">Non spécifié</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 sm:px-5 py-3 text-center whitespace-nowrap">
                            {item.isExpired ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-xs font-extrabold text-rose-700">
                                <AlertTriangle className="h-3 w-3" />
                                🚨 Périmé
                              </span>
                            ) : item.isThisMonth ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                <Clock className="h-3 w-3" />
                                Expire ce mois-ci
                              </span>
                            ) : item.isWithin90Days ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700">
                                ⏳ Dans {item.daysRemaining}j
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Valide
                              </span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="px-4 sm:px-5 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {item.quantite}
                          </td>

                          {/* Expiration Date */}
                          <td className="px-4 sm:px-5 py-3 text-center font-medium text-slate-700 whitespace-nowrap">
                            <span className={clsx(item.isExpired && "font-black text-rose-700")}>
                              {safeFormatDate(item.datePeremption, 'dd/MM/yyyy')}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 sm:px-5 py-3 text-right whitespace-nowrap">
                            <Link
                              to={`/fiches-de-stock/${encodeURIComponent(item.productId)}`}
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all shadow-2xs active:scale-95",
                                item.isExpired
                                  ? "bg-rose-700 text-white hover:bg-rose-800"
                                  : "bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                              )}
                            >
                              <span>{item.isExpired ? "Décharger" : "Consulter"}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
