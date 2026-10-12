import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowLeft, FileText } from 'lucide-react';
import { safeFormatDate, safeTimestamp } from '../utils/formatters';

interface ExpiryItem {
  productId: string;
  productName: string;
  category: string;
  quantite: number;
  datePeremption: string;
}

export default function CalendrierPeremption() {
  const products = useStore((state) => state.products);
  const safeProducts = Array.isArray(products) ? products : [];

  // Extract all entries with an expiry date
  const expiries: ExpiryItem[] = [];
  
  safeProducts.forEach((p) => {
    if (!p || !Array.isArray(p.transactions)) return;
    p.transactions.forEach((t) => {
      if (t && t.type === 'entree' && t.datePeremption) {
        expiries.push({
          productId: p.id,
          productName: p.name || 'Produit sans nom',
          category: p.category || 'Général',
          quantite: Number(t.quantite) || 0,
          datePeremption: t.datePeremption
        });
      }
    });
  });

  // Sort chronologically using safe timestamp
  expiries.sort((a, b) => safeTimestamp(a.datePeremption, Infinity) - safeTimestamp(b.datePeremption, Infinity));

  // Group by month
  const groupedExpiries = expiries.reduce((acc, curr) => {
    const monthYear = safeFormatDate(curr.datePeremption, 'MMMM yyyy', 'Date indéterminée');
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {} as Record<string, ExpiryItem[]>);

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
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 shrink-0">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                Calendrier de Péremption
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Surveillance mensuelle des lots arrivant à expiration au bloc
              </p>
            </div>
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

      {Object.keys(groupedExpiries).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <CalendarClock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">Aucune date de péremption enregistrée</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Les dates de péremption s'enregistrent lors de la saisie d'un inventaire physique ou lors de l'enregistrement d'une entrée de stock.
          </p>
          <Link
            to="/fiches-de-stock"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
          >
            <FileText className="h-4 w-4" />
            Ouvrir les Fiches de Stock
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExpiries).map(([monthYear, items]) => (
            <div key={monthYear} className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 capitalize text-sm">{monthYear}</h2>
                <span className="text-xs font-semibold text-slate-500">
                  {items.length} référence{items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-white text-[11px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left">Produit</th>
                      <th scope="col" className="px-5 py-3 text-left">Catégorie</th>
                      <th scope="col" className="px-5 py-3 text-right">Quantité (Lot)</th>
                      <th scope="col" className="px-5 py-3 text-right">Date d'expiration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap px-5 py-3.5 font-semibold">
                          <Link 
                            to={`/fiches-de-stock/${encodeURIComponent(item.productId)}`} 
                            className="text-teal-700 hover:underline hover:text-teal-900"
                          >
                            {item.productName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-900 text-right font-bold">
                          {item.quantite}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-600 text-right font-medium">
                          {safeFormatDate(item.datePeremption, 'dd/MM/yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
