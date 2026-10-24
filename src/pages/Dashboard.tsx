import { useState, useMemo } from 'react';
import { useStore, getCurrentStock, Product, Transaction } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Plus, 
  RotateCcw, 
  CheckCircle, 
  AlertOctagon, 
  ArrowRight, 
  ClipboardList, 
  CheckCircle2, 
  FileDown, 
  FileText,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  Calendar,
  Filter,
  ShieldAlert
} from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import ResetConfirmModal from '../components/ResetConfirmModal';
import ExportPdfModal from '../components/ExportPdfModal';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface EnrichedTransaction extends Transaction {
  product: Product;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const products = useStore((state) => state.products);
  const orders = useStore((state) => state.orders);
  const resumeCancelledOrder = useStore((state) => state.resumeCancelledOrder);
  const bonDangerEntries = useStore((state) => state.bonDangerEntries) || [];
  const bonDangerDocuments = useStore((state) => state.bonDangerDocuments) || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [resumeSuccessMessage, setResumeSuccessMessage] = useState<string | null>(null);
  const [quickSearchProduct, setQuickSearchProduct] = useState('');

  // Bon Danger stats
  const missingVidesCount = useMemo(() => {
    return bonDangerEntries.reduce((acc, curr) => {
      const q = Number(curr.quantite) || 0;
      const v = Number(curr.quantiteVideRecu) || 0;
      return acc + Math.max(0, q - v);
    }, 0);
  }, [bonDangerEntries]);

  // Transactions feed filter state
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'entree' | 'sortie'>('all');
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txDisplayCount, setTxDisplayCount] = useState(10);

  // Safe products array
  const safeProducts = Array.isArray(products) ? products : [];

  // Compute stats
  const totalProducts = safeProducts.length;
  
  // Count with stock entered
  const inventoriedProducts = safeProducts.filter((p) => p && Array.isArray(p.transactions) && p.transactions.length > 0);
  const inventoriedCount = inventoriedProducts.length;

  const shortages = safeProducts.filter((p) => {
    if (!p) return false;
    const stock = getCurrentStock(p);
    return stock <= (p.stockSecurite || 0) && stock > 0;
  });

  const zeroStock = safeProducts.filter((p) => {
    if (!p) return false;
    return getCurrentStock(p) === 0;
  });

  const rupturesHopital = safeProducts.filter((p) => p && p.enRuptureHopital);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const expiringThisMonth = safeProducts.filter((p) => {
    if (!p || !Array.isArray(p.transactions)) return false;
    return p.transactions.some((t) => {
      if (t && t.type === 'entree' && t.datePeremption) {
        try {
          const d = new Date(t.datePeremption);
          return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        } catch {
          return false;
        }
      }
      return false;
    });
  });

  // Orders stats
  const safeOrders = Array.isArray(orders) ? orders : [];
  const cancelledOrders = safeOrders.filter((o) => o && o.statut === 'annulee');
  const pendingOrders = safeOrders.filter((o) => o && o.statut === 'en_cours');

  const handleResume = (orderId: string, orderNumber: string) => {
    resumeCancelledOrder(orderId);
    setResumeSuccessMessage(`La commande ${orderNumber} a été reprise et réactivée avec succès !`);
    setTimeout(() => {
      setResumeSuccessMessage(null);
    }, 4000);
  };

  const filteredQuickProducts = quickSearchProduct.trim()
    ? safeProducts.filter((p) => (p?.name || '').toLowerCase().includes(quickSearchProduct.toLowerCase().trim()))
    : [];

  // Extract and sort all transactions across all products for "Dernières modifications des fiches de poste"
  const allStockModifications = useMemo(() => {
    const list: EnrichedTransaction[] = [];
    safeProducts.forEach((prod) => {
      if (prod && Array.isArray(prod.transactions)) {
        prod.transactions.forEach((tx) => {
          if (tx && tx.id) {
            list.push({
              ...tx,
              product: prod,
            });
          }
        });
      }
    });

    // Sort newest first
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeB - timeA;
    });

    return list;
  }, [safeProducts]);

  // Filtered transactions for the feed
  const filteredStockModifications = useMemo(() => {
    return allStockModifications.filter((tx) => {
      const matchesType = txTypeFilter === 'all' ? true : tx.type === txTypeFilter;
      const search = txSearchTerm.toLowerCase().trim();
      const matchesSearch = !search || 
        tx.product.name.toLowerCase().includes(search) ||
        tx.product.category.toLowerCase().includes(search) ||
        (tx.origineDestination && tx.origineDestination.toLowerCase().includes(search));
      return matchesType && matchesSearch;
    });
  }, [allStockModifications, txTypeFilter, txSearchTerm]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            Tableau de bord Pharmacie
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Centre Hospitalier Provincial SIDI IFNI — Bloc Opératoire
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Fiches de Stock access right from Dashboard header */}
          <Link
            to="/fiches-de-stock"
            className="flex items-center gap-1.5 rounded-xl border border-teal-700 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors shadow-2xs active:scale-95"
            title="Consulter et remplir les Fiches de Stock officielles"
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
            <FileDown className="h-4 w-4 text-teal-700" />
            <span className="hidden sm:inline">Rapport</span> PDF
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-2xs active:scale-95"
            title="Effacer tous les mouvements pour commencer l'inventaire à blanc"
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

      {/* Success banner if an order was resumed */}
      {resumeSuccessMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-900 shadow-2xs animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span className="font-semibold text-sm">{resumeSuccessMessage}</span>
        </div>
      )}

      {/* Cancelled Order Alert Banner with Resume Action */}
      {cancelledOrders.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                {cancelledOrders.length} bon{cancelledOrders.length > 1 ? 's' : ''} de commande annulé{cancelledOrders.length > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Vous pouvez reprendre immédiatement la commande annulée pour la réactiver et l'envoyer à la pharmacie centrale.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cancelledOrders.map((co) => (
              <button
                key={co.id}
                type="button"
                onClick={() => handleResume(co.id, co.numeroCommande)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-800 transition-all shadow-2xs active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reprendre {co.numeroCommande}
              </button>
            ))}
            <Link
              to="/commandes"
              className="text-xs font-semibold text-rose-800 hover:underline px-2"
            >
              Voir le carnet de commandes
            </Link>
          </div>
        </div>
      )}

      {/* FEATURED: FICHES DE STOCK SIDI IFNI QUICK LAUNCHER */}
      <div className="rounded-2xl border-2 border-teal-600 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-teal-800 p-3 text-white shadow-xs shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Fiches de Stock Officielles (CHP SIDI IFNI)
                </h2>
                <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5">
                  Modèle Conforme
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Consultez la fiche individuelle de chaque médicament : relevé des entrées, sorties, calcul automatique du solde en temps réel, stock de sécurité et saisie des effectifs physiques.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Link
              to="/fiches-de-stock"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-teal-800 transition-all active:scale-95"
            >
              <FileText className="h-4 w-4" />
              Ouvrir les Fiches de Stock
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Quick Search into Fiche de stock */}
        <div className="mt-3 pt-3 border-t border-slate-100 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un médicament pour ouvrir sa Fiche de Stock (ex: Xylocaine, Propofol, Fentanyl, Céfazoline)..."
              value={quickSearchProduct}
              onChange={(e) => setQuickSearchProduct(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-600 outline-none"
            />
          </div>

          {quickSearchProduct.trim() && (
            <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto z-20 space-y-1">
              {filteredQuickProducts.length > 0 ? (
                filteredQuickProducts.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      navigate(`/fiches-de-stock/${encodeURIComponent(p.id)}`);
                      setQuickSearchProduct('');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-teal-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className={clsx("font-bold", p.isImportant ? "text-red-600" : "text-slate-800")}>
                        {p.name}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-2">{p.category}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-700">Ouvrir la fiche →</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">Aucun médicament trouvé</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SPOTLIGHT: LE BON DANGER (FENTANYL 100 µg & 500 µg) */}
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-700 p-3 text-white shadow-xs shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                  Stupéfiants — Tableau B
                </span>
                <h2 className="text-base sm:text-lg font-black text-rose-950">
                  Le Bon Danger — Gestion sécurisée du Fentanyl
                </h2>
                {missingVidesCount > 0 ? (
                  <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5">
                    ⚠️ {missingVidesCount} ampoule{missingVidesCount > 1 ? 's' : ''} vide{missingVidesCount > 1 ? 's' : ''} en attente
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                    ✓ Réconciliation conforme
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-800 mt-1 max-w-2xl leading-relaxed">
                Suivi obligatoire séparé pour Fentanyl 100 µg et 500 µg : traçabilité des ampoules délivrées, restitution des ampoules vides par les IAR et archivage médico-légal des bons de commande physiques scannés ({bonDangerDocuments.length} document{bonDangerDocuments.length > 1 ? 's' : ''} archivé{bonDangerDocuments.length > 1 ? 's' : ''}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <Link
              to="/le-bon-danger"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Accéder au "Bon Danger"</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* RUBRIQUE: DERNIÈRES MODIFICATIONS DANS LES FICHES DE POSTE (FICHES DE STOCK) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-teal-100/80 p-2 text-teal-800">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Dernières Modifications des Fiches de Poste
                </h2>
                <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-bold text-teal-800">
                  {allStockModifications.length} mouvement{allStockModifications.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Historique chronologique des entrées, sorties et ajustements d'inventaire sur les fiches de stock
              </p>
            </div>
          </div>

          <Link
            to="/fiches-de-stock"
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Toutes les fiches</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setTxTypeFilter('all')}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                txTypeFilter === 'all'
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tous ({allStockModifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('entree')}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1",
                txTypeFilter === 'entree'
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Entrées ({allStockModifications.filter((t) => t.type === 'entree').length})
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('sortie')}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1",
                txTypeFilter === 'sortie'
                  ? "bg-amber-700 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              )}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Sorties ({allStockModifications.filter((t) => t.type === 'sortie').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer par médicament ou motif..."
              value={txSearchTerm}
              onChange={(e) => setTxSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-teal-600 outline-none"
            />
          </div>
        </div>

        {/* List of modifications */}
        {filteredStockModifications.length > 0 ? (
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left">Date & Heure</th>
                    <th scope="col" className="px-4 py-2.5 text-left">Médicament / Fiche de poste</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Mouvement</th>
                    <th scope="col" className="px-4 py-2.5 text-left">Origine / Destination</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Péremption</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Solde actuel</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockModifications.slice(0, txDisplayCount).map((tx) => {
                    const currentStock = getCurrentStock(tx.product);
                    const formattedDate = (() => {
                      try {
                        return format(parseISO(tx.date), 'dd/MM/yyyy à HH:mm');
                      } catch {
                        return tx.date;
                      }
                    })();

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">
                          {formattedDate}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            to={`/fiches-de-stock/${encodeURIComponent(tx.product.id)}`}
                            className={clsx(
                              "font-bold hover:underline block",
                              tx.product.isImportant ? "text-red-600" : "text-slate-900"
                            )}
                          >
                            {tx.product.name}
                          </Link>
                          <span className="text-[10px] text-slate-400">{tx.product.category}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                          {tx.type === 'entree' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                              <ArrowDownLeft className="h-3 w-3" />
                              + {tx.quantite}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                              <ArrowUpRight className="h-3 w-3" />
                              - {tx.quantite}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">
                          {tx.origineDestination || 'Non spécifié'}
                        </td>
                        <td className="px-4 py-2.5 text-center whitespace-nowrap text-slate-500">
                          {tx.datePeremption ? (
                            <span className="text-[11px] font-medium text-slate-600">
                              {(() => {
                                try {
                                  return format(parseISO(tx.datePeremption), 'MM/yyyy');
                                } catch {
                                  return tx.datePeremption;
                                }
                              })()}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <span className={clsx(
                            "font-bold text-xs px-2 py-0.5 rounded",
                            currentStock === 0 ? "bg-rose-50 text-rose-700" : currentStock <= tx.product.stockSecurite ? "bg-amber-50 text-amber-700" : "text-slate-800"
                          )}>
                            {currentStock} en stock
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <Link
                            to={`/fiches-de-stock/${encodeURIComponent(tx.product.id)}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline"
                          >
                            <span>Fiche</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination / Expand control */}
            {filteredStockModifications.length > 10 && (
              <div className="flex justify-center pt-2">
                {txDisplayCount < filteredStockModifications.length ? (
                  <button
                    type="button"
                    onClick={() => setTxDisplayCount((prev) => prev + 15)}
                    className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-4 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    Afficher plus de mouvements ({filteredStockModifications.length - txDisplayCount} restants)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTxDisplayCount(10)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
                  >
                    Réduire la liste
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            <Activity className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-xs sm:text-sm">
              Aucun mouvement enregistré pour le moment
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Chaque entrée en stock, sortie pour intervention ou réception de bon de commande effectuée sur une fiche de stock apparaîtra automatiquement ici en temps réel.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Link
                to="/fiches-de-stock"
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800"
              >
                <FileText className="h-3.5 w-3.5" />
                Ouvrir les Fiches de Stock
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Onboarding Banner with PDF Export Button */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/50 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="rounded-xl bg-teal-700 p-2.5 sm:p-3 text-white shadow-xs shrink-0">
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-teal-950">
                Inventaire Initial & Reporting Mensuel du Bloc
              </h2>
              <p className="text-xs text-teal-800 mt-1 max-w-2xl leading-relaxed">
                Les stocks sont réinitialisés et prêts pour la saisie de vos effectifs physiques réels. Vous pouvez exporter l'inventaire en PDF officiel à tout moment pour vos transmissions et archivages mensuels.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportPdfOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-white px-3 sm:px-3.5 py-2 text-xs font-bold text-teal-800 shadow-2xs hover:bg-teal-50 transition-all active:scale-95"
            >
              <FileDown className="h-4 w-4 text-teal-700" />
              Exporter PDF
            </button>

            <div className="text-right pl-1">
              <span className="block text-xl sm:text-2xl font-black text-teal-900 leading-none">
                {inventoriedCount} / {totalProducts}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-teal-700">produits renseignés</span>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-all active:scale-95"
            >
              Catalogue
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-teal-200/60 rounded-full h-2 overflow-hidden">
          <div
            className="bg-teal-700 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((inventoriedCount / (totalProducts || 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="rounded-lg bg-teal-100/80 p-2 sm:p-2.5 text-teal-700 shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Références</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="rounded-lg bg-amber-100/80 p-2 sm:p-2.5 text-amber-700 shrink-0">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Stock Sécurité</p>
              <p className="text-lg sm:text-xl font-bold text-amber-700">{shortages.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="rounded-lg bg-rose-100/80 p-2 sm:p-2.5 text-rose-700 shrink-0">
              <AlertOctagon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Ruptures Hôpital</p>
              <p className="text-lg sm:text-xl font-bold text-rose-700">{rupturesHopital.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="rounded-lg bg-blue-100/80 p-2 sm:p-2.5 text-blue-700 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Périment ce mois</p>
              <p className="text-lg sm:text-xl font-bold text-blue-700">{expiringThisMonth.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs col-span-2 sm:col-span-1">
          <Link to="/commandes" className="flex items-center gap-2.5 sm:gap-3.5 group">
            <div className="rounded-lg bg-emerald-100/80 p-2 sm:p-2.5 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
              <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Commandes</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-800">{pendingOrders.length}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Grid: Ruptures & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Ruptures Pharmacie Centrale */}
        <div className="rounded-xl border border-rose-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-rose-100 bg-rose-50/60 px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertOctagon className="h-4 w-4" />
              <h2 className="font-bold text-xs sm:text-sm">Ruptures à la Pharmacie Hospitalière</h2>
            </div>
            <Link to="/ruptures" className="text-xs font-semibold text-rose-700 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {rupturesHopital.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aucun produit déclaré en rupture à la pharmacie centrale.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rupturesHopital.slice(0, 5).map((p) => {
                  const current = getCurrentStock(p);
                  return (
                    <li key={p.id} className="py-2.5 flex justify-between items-center text-xs sm:text-sm">
                      <div className="pr-2 min-w-0">
                        <Link 
                          to={`/fiches-de-stock/${encodeURIComponent(p.id)}`} 
                          className={clsx("font-semibold hover:underline truncate block", p.isImportant ? "text-red-600" : "text-slate-800")}
                        >
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate">{p.category}</p>
                      </div>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 shrink-0">
                        {current} au bloc
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Prochaines Péremptions */}
        <div className="rounded-xl border border-blue-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-blue-100 bg-blue-50/60 px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <h2 className="font-bold text-xs sm:text-sm">Péremptions imminentes</h2>
            </div>
            <Link to="/peremptions" className="text-xs font-semibold text-blue-700 hover:underline">
              Calendrier complet
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {expiringThisMonth.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aucun lot n'arrive à expiration ce mois-ci.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {expiringThisMonth.slice(0, 5).map((p) => (
                  <li key={p.id} className="py-2.5 flex justify-between items-center text-xs sm:text-sm">
                    <div className="pr-2 min-w-0">
                      <Link 
                        to={`/fiches-de-stock/${encodeURIComponent(p.id)}`} 
                        className="font-semibold text-blue-800 hover:underline truncate block"
                      >
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-slate-500 truncate">{p.category}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
      <ExportPdfModal isOpen={isExportPdfOpen} onClose={() => setIsExportPdfOpen(false)} />
    </div>
  );
}
