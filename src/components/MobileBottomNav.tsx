import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PackageSearch, 
  AlertOctagon, 
  ClipboardList,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store';

export default function MobileBottomNav() {
  const location = useLocation();
  const orders = useStore((state) => state.orders);
  const products = useStore((state) => state.products);
  const bonDangerEntries = useStore((state) => state.bonDangerEntries) || [];

  const cancelledOrdersCount = orders.filter((o) => o.statut === 'annulee').length;
  const missingVidesCount = bonDangerEntries.reduce((acc, curr) => {
    const q = Number(curr.quantite) || 0;
    const v = Number(curr.quantiteVideRecu) || 0;
    return acc + Math.max(0, q - v);
  }, 0);

  const items = [
    {
      name: 'Accueil',
      href: '/',
      icon: LayoutDashboard,
      active: location.pathname === '/',
    },
    {
      name: 'Fiches',
      href: '/fiches-de-stock',
      icon: FileText,
      active: location.pathname.startsWith('/fiches-de-stock') || location.pathname.startsWith('/product'),
    },
    {
      name: 'Bon Danger',
      href: '/le-bon-danger',
      icon: ShieldAlert,
      active: location.pathname === '/le-bon-danger',
      badge: missingVidesCount > 0 ? missingVidesCount : undefined,
      badgeColor: 'bg-rose-600 text-white font-bold',
    },
    {
      name: 'Commandes',
      href: '/commandes',
      icon: ClipboardList,
      active: location.pathname === '/commandes',
      badge: cancelledOrdersCount > 0 ? cancelledOrdersCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      name: 'Catalogue',
      href: '/catalog',
      icon: PackageSearch,
      active: location.pathname.startsWith('/catalog'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 lg:hidden pb-safe">
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto">
        {items.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={clsx(
              "flex flex-col items-center justify-center relative py-1 text-[10px] font-medium transition-colors select-none",
              item.active
                ? "text-teal-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className="relative">
              <item.icon
                className={clsx(
                  "h-5 w-5 mb-0.5 transition-transform",
                  item.active ? "text-teal-700 scale-110" : "text-slate-400"
                )}
              />
              {item.badge !== undefined && (
                <span
                  className={clsx(
                    "absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full text-[9px] font-black flex items-center justify-center",
                    item.badgeColor
                  )}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="leading-tight truncate max-w-[56px] text-center">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
