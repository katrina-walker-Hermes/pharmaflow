import { useStore, getCurrentStock } from '../store';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export default function Ruptures() {
  const products = useStore(state => state.products);

  const rupturesHopital = products.filter(p => p.enRuptureHopital);
  const stockCritique = products.filter(p => !p.enRuptureHopital && getCurrentStock(p) <= 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ruptures & Alertes Critiques</h1>
        <p className="text-slate-600 mt-1">Suivi des produits en rupture à la pharmacie centrale et des stocks nuls au bloc.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ruptures Pharmacie Centrale */}
        <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-red-600" />
            <h2 className="font-semibold text-red-900">En rupture à la pharmacie centrale</h2>
          </div>
          <div className="p-0">
            {rupturesHopital.length === 0 ? (
              <div className="p-6 text-slate-500 text-sm">
                Aucun produit déclaré en rupture à l'hôpital.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rupturesHopital.map(p => {
                  const stock = getCurrentStock(p);
                  return (
                    <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <Link to={`/product/${p.id}`} className={clsx("font-medium hover:underline", p.isImportant ? "text-red-600" : "text-slate-900")}>
                          {p.name}
                        </Link>
                        <p className="text-xs text-slate-500">{p.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">Stock local: {stock}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Stock nul au bloc */}
        <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">Stock épuisé au bloc opératoire</h2>
          </div>
          <div className="p-0">
            {stockCritique.length === 0 ? (
              <div className="p-6 text-slate-500 text-sm">
                Aucun produit avec stock nul non déclaré en rupture.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stockCritique.map(p => (
                  <li key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <Link to={`/product/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-500">{p.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-amber-600">Stock local: 0</span>
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
