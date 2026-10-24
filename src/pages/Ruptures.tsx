import { useStore, getCurrentStock } from '../store';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { sortProductsByCategoryAndName } from '../utils/categoryOrder';

export default function Ruptures() {
  const products = useStore((state) => state.products);
  const safeProducts = Array.isArray(products) ? products : [];

  const rupturesHopital = sortProductsByCategoryAndName(safeProducts.filter((p) => p && p.enRuptureHopital));
  const stockCritique = sortProductsByCategoryAndName(safeProducts.filter((p) => p && !p.enRuptureHopital && getCurrentStock(p) <= 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs active:scale-95"
            title="Retour au Tableau de bord"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ruptures & Alertes Critiques</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Suivi des produits en rupture à la pharmacie centrale et des stocks nuls au bloc opératoire.
            </p>
          </div>
        </div>

        <Link
          to="/fiches-de-stock"
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-700 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors shadow-2xs active:scale-95"
        >
          <FileText className="h-4 w-4 text-teal-700" />
          <span>Fiches de Stock</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ruptures Pharmacie Centrale */}
        <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h2 className="font-bold text-red-900 text-sm">En rupture à la pharmacie centrale</h2>
              <p className="text-[11px] text-red-700">Produits non livrables par l'hôpital</p>
            </div>
          </div>
          <div className="p-0">
            {rupturesHopital.length === 0 ? (
              <div className="p-6 text-slate-500 text-xs text-center">
                Aucun produit déclaré en rupture à la pharmacie centrale.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rupturesHopital.map((p) => {
                  const stock = getCurrentStock(p);
                  return (
                    <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <Link 
                          to={`/fiches-de-stock/${encodeURIComponent(p.id)}`} 
                          className={clsx("font-semibold hover:underline block truncate text-sm", p.isImportant ? "text-red-600" : "text-slate-900")}
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-slate-500 truncate">{p.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Stock local : {stock}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Stock nul au bloc */}
        <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <h2 className="font-bold text-amber-900 text-sm">Stock épuisé au bloc opératoire</h2>
              <p className="text-[11px] text-amber-700">Stock comptabilisé à 0 unité</p>
            </div>
          </div>
          <div className="p-0">
            {stockCritique.length === 0 ? (
              <div className="p-6 text-slate-500 text-xs text-center">
                Aucun produit avec stock nul non déclaré en rupture.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stockCritique.map((p) => (
                  <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 pr-3">
                      <Link 
                        to={`/fiches-de-stock/${encodeURIComponent(p.id)}`} 
                        className="font-semibold text-slate-900 hover:underline block truncate text-sm"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-500 truncate">{p.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Stock local : 0
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
