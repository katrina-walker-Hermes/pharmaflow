import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PackageSearch, 
  CalendarClock, 
  AlertOctagon, 
  ClipboardList 
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../store';

export default function MobileBottomNav() {
  const location = useLocation();
  const orders = useStore((state) => state.orders);
  const products = useStore((state) => state.products);

  const cancelledOrdersCount = orders.filter((o) => o.statut === 'annulee').length;
  const hospitalRupturesCount = products.filter((p) => p.enRuptureHopital).length;

  const items = [
    {
      name: 'Accueil',
      href: '/',
      icon: LayoutDashboard,
      active: location.pathname === '/',
    },
    {
      name: 'Catalogue',
      href: '/catalog',
      icon: PackageSearch,
      active: location.pathname.startsWith('/catalog') || location.pathname.startsWith('/product'),
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
      name: 'Péremptions',
      href: '/peremptions',
      icon: CalendarClock,
      active: location.pathname === '/peremptions',
    },
    {
      name: 'Ruptures',
      href: '/ruptures',
      icon: AlertOctagon,
      active: location.pathname === '/ruptures',
      badge: hospitalRupturesCount > 0 ? hospitalRupturesCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
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
