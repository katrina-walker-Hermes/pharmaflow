import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
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
  Search
} from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import ResetConfirmModal from '../components/ResetConfirmModal';
import ExportPdfModal from '../components/ExportPdfModal';
import { clsx } from 'clsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const products = useStore((state) => state.products);
  const orders = useStore((state) => state.orders);
  const resumeCancelledOrder = useStore((state) => state.resumeCancelledOrder);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [resumeSuccessMessage, setResumeSuccessMessage] = useState<string | null>(null);
  const [quickSearchProduct, setQuickSearchProduct] = useState('');

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
