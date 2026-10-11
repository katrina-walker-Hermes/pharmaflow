import { useStore } from '../store';
import { format, parseISO, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';

interface ExpiryItem {
  productId: string;
  productName: string;
  category: string;
  quantite: number;
  datePeremption: string;
}

export default function CalendrierPeremption() {
  const products = useStore(state => state.products);

  // Extract all entries with an expiry date
  const expiries: ExpiryItem[] = [];
  
  products.forEach(p => {
    p.transactions.forEach(t => {
      if (t.type === 'entree' && t.datePeremption) {
        expiries.push({
          productId: p.id,
          productName: p.name,
          category: p.category,
          quantite: t.quantite,
          datePeremption: t.datePeremption
        });
      }
    });
  });

  // Sort chronologically
  expiries.sort((a, b) => new Date(a.datePeremption).getTime() - new Date(b.datePeremption).getTime());

  // Group by month
  const groupedExpiries = expiries.reduce((acc, curr) => {
    const monthYear = format(parseISO(curr.datePeremption), 'MMMM yyyy', { locale: fr });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {} as Record<string, ExpiryItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-blue-100 p-3">
          <CalendarClock className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendrier de Péremption</h1>
          <p className="text-slate-600">Liste des produits par mois d'expiration</p>
        </div>
      </div>

      {Object.keys(groupedExpiries).length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-slate-500">Aucun produit avec date de péremption n'a été trouvé.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedExpiries).map(([monthYear, items]) => (
            <div key={monthYear} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b">
                <h2 className="font-semibold text-slate-800 capitalize">{monthYear}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-white">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produit</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Catégorie</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantité (Lot entrant)</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Date précise</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <Link to={`/product/${item.productId}`} className="text-teal-600 hover:underline">
                            {item.productName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-900 text-right font-medium">
                          {item.quantite}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 text-right">
                          {format(parseISO(item.datePeremption), 'dd/MM/yyyy')}
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
