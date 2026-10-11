import { useState } from 'react';
import { useStore, getCurrentStock } from '../store';
import { Link } from 'react-router-dom';
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
  FileDown
} from 'lucide-react';
import AddProductModal from '../components/AddProductModal';
import ResetConfirmModal from '../components/ResetConfirmModal';
import ExportPdfModal from '../components/ExportPdfModal';
import { clsx } from 'clsx';

export default function Dashboard() {
  const products = useStore((state) => state.products);
  const orders = useStore((state) => state.orders);
  const resumeCancelledOrder = useStore((state) => state.resumeCancelledOrder);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [resumeSuccessMessage, setResumeSuccessMessage] = useState<string | null>(null);

  // Compute stats
  const totalProducts = products.length;
  
  // Count with stock entered
  const inventoriedProducts = products.filter((p) => p.transactions.length > 0);
  const inventoriedCount = inventoriedProducts.length;

  const shortages = products.filter((p) => {
    const stock = getCurrentStock(p);
    return stock <= p.stockSecurite && stock > 0;
  });

  const zeroStock = products.filter((p) => {
    return getCurrentStock(p) === 0;
  });

  const rupturesHopital = products.filter((p) => p.enRuptureHopital);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const expiringThisMonth = products.filter((p) => {
    return p.transactions.some((t) => {
      if (t.type === 'entree' && t.datePeremption) {
        const d = new Date(t.datePeremption);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      return false;
    });
  });

  // Orders stats
  const cancelledOrders = orders.filter((o) => o.statut === 'annulee');
  const pendingOrders = orders.filter((o) => o.statut === 'en_cours');

  const handleResume = (orderId: string, orderNumber: string) => {
    resumeCancelledOrder(orderId);
    setResumeSuccessMessage(`La commande ${orderNumber} a été reprise et réactivée avec succès !`);
    setTimeout(() => {
      setResumeSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord Pharmacie</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Centre Hospitalier Provincial SIDI IFNI — Bloc Opératoire
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsExportPdfOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100/70 transition-colors shadow-2xs"
            title="Exporter l'inventaire en format PDF officiel"
          >
            <FileDown className="h-4 w-4 text-teal-700" />
            Exporter Rapport PDF
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-2xs"
            title="Effacer tous les mouvements pour commencer l'inventaire à blanc"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Remise à zéro des stocks
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouveau Produit
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
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-600 p-2.5 text-white">
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

      {/* Inventory Onboarding Banner with PDF Export Button */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/50 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-teal-700 p-3 text-white shadow-xs">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-teal-950">
                Inventaire Initial & Reporting Mensuel du Bloc
              </h2>
              <p className="text-xs text-teal-800 mt-1 max-w-2xl leading-relaxed">
                Les stocks sont réinitialisés et prêts pour la saisie de vos effectifs physiques réels. Vous pouvez exporter l'inventaire en PDF officiel à tout moment pour vos transmissions et archivages mensuels.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportPdfOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-600 bg-white px-3.5 py-2.5 text-xs font-bold text-teal-800 shadow-2xs hover:bg-teal-50 transition-all"
            >
              <FileDown className="h-4 w-4 text-teal-700" />
              Exporter PDF
            </button>

            <div className="text-right pl-1">
              <span className="block text-2xl font-black text-teal-900">
                {inventoriedCount} / {totalProducts}
              </span>
              <span className="text-[11px] font-medium text-teal-700">produits renseignés</span>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-all"
            >
              Accéder au Catalogue
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-lg bg-teal-100/80 p-2.5 text-teal-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Références totales</p>
              <p className="text-xl font-bold text-slate-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-lg bg-amber-100/80 p-2.5 text-amber-700">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Sous Stock Sécurité</p>
              <p className="text-xl font-bold text-amber-700">{shortages.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-lg bg-rose-100/80 p-2.5 text-rose-700">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Ruptures Hôpital</p>
              <p className="text-xl font-bold text-rose-700">{rupturesHopital.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="rounded-lg bg-blue-100/80 p-2.5 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Périment ce mois</p>
              <p className="text-xl font-bold text-blue-700">{expiringThisMonth.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <Link to="/commandes" className="flex items-center gap-3.5 group">
            <div className="rounded-lg bg-emerald-100/80 p-2.5 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Commandes en cours</p>
              <p className="text-xl font-bold text-emerald-800">{pendingOrders.length}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Grid: Ruptures & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ruptures Pharmacie Centrale */}
        <div className="rounded-xl border border-rose-200/80 bg-white shadow-2xs overflow-hidden">
          <div className="border-b border-rose-100 bg-rose-50/60 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertOctagon className="h-4 w-4" />
              <h2 className="font-bold text-sm">Ruptures à la Pharmacie Hospitalière</h2>
            </div>
            <Link to="/ruptures" className="text-xs font-semibold text-rose-700 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="p-5">
            {rupturesHopital.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aucun produit déclaré en rupture à la pharmacie centrale.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rupturesHopital.slice(0, 5).map((p) => {
                  const current = getCurrentStock(p);
                  return (
                    <li key={p.id} className="py-2.5 flex justify-between items-center text-sm">
                      <div>
                        <Link to={`/product/${p.id}`} className={clsx("font-semibold hover:underline", p.isImportant ? "text-red-600" : "text-slate-800")}>
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-slate-500">{p.category}</p>
                      </div>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
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
          <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <h2 className="font-bold text-sm">Péremptions imminentes</h2>
            </div>
            <Link to="/peremptions" className="text-xs font-semibold text-blue-700 hover:underline">
              Calendrier complet
            </Link>
          </div>
          <div className="p-5">
            {expiringThisMonth.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aucun lot n'arrive à expiration ce mois-ci.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {expiringThisMonth.slice(0, 5).map((p) => (
                  <li key={p.id} className="py-2.5 flex justify-between items-center text-sm">
                    <div>
                      <Link to={`/product/${p.id}`} className="font-semibold text-blue-800 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-[11px] text-slate-500">{p.category}</p>
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
