import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PackageSearch, 
  CalendarClock, 
  AlertOctagon,
  ClipboardList,
  Stethoscope,
  Menu,
  Plus,
  RotateCcw,
  FileDown,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useStore } from '../store';
import AddProductModal from './AddProductModal';
import ResetConfirmModal from './ResetConfirmModal';
import ExportPdfModal from './ExportPdfModal';
import PWAInstallButton from './PWAInstallButton';
import MobileBottomNav from './MobileBottomNav';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const location = useLocation();

  const orders = useStore((state) => state.orders);
  const cancelledOrdersCount = orders.filter((o) => o.statut === 'annulee').length;

  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { 
      name: 'Fiches de Stock', 
      href: '/fiches-de-stock', 
      icon: FileText,
      activeMatch: (path: string) => path.startsWith('/fiches-de-stock') || path.startsWith('/product')
    },
    { name: 'Catalogue & Catégories', href: '/catalog', icon: PackageSearch },
    { 
      name: 'Bons de Commande', 
      href: '/commandes', 
      icon: ClipboardList,
      badge: cancelledOrdersCount > 0 ? `${cancelledOrdersCount} annulée` : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { name: 'Calendrier Péremptions', href: '/peremptions', icon: CalendarClock },
    { name: 'Ruptures Hôpital', href: '/ruptures', icon: AlertOctagon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop / Drawer Sidebar */}
      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-72 bg-teal-900 text-white transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:translate-x-0 flex flex-col justify-between pt-safe pb-safe",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div>
          <div className="flex h-16 shrink-0 items-center justify-between bg-teal-950 px-5 font-semibold text-lg border-b border-teal-800/50">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-teal-600/30 p-1.5 text-teal-300">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <span className="block leading-tight text-base font-bold text-white">Gestion Pharmacie</span>
                <span className="block text-[11px] text-teal-300 font-normal">Bloc Opératoire</span>
              </div>
            </div>
            {/* Close button for mobile drawer */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-teal-300 hover:text-white hover:bg-teal-800"
            >
              ✕
            </button>
          </div>
          
          <nav className="flex flex-1 flex-col mt-4 px-3">
            <ul className="space-y-1.5">
              {navigation.map((item) => {
                const isActive = item.activeMatch 
                  ? item.activeMatch(location.pathname)
                  : location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        "flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all",
                        isActive 
                          ? "bg-teal-700/90 text-white shadow-xs font-semibold" 
                          : "text-teal-100 hover:bg-teal-800/60 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={clsx("h-5 w-5", isActive ? "text-teal-200" : "text-teal-400")} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", item.badgeColor)}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-5 pt-4 border-t border-teal-800/60 px-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsExportPdfOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-700/80 border border-teal-600 px-3 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-600 transition-colors"
              >
                <FileDown className="h-4 w-4 text-teal-200" />
                Exporter Rapport PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nouveau Produit
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(true);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-950/80 border border-teal-800 px-3 py-2 text-[11px] font-medium text-teal-300 hover:bg-rose-900/40 hover:text-rose-200 hover:border-rose-700/50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Remise à blanc des stocks
              </button>
            </div>
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-teal-800/50 bg-teal-950/40 text-[11px] text-teal-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-teal-100">CHP SIDI IFNI</span>
            <span className="text-[10px] bg-teal-800 px-1.5 py-0.5 rounded text-teal-200">v2.1 PWA</span>
          </div>
          <PWAInstallButton />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b bg-white/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 shadow-2xs pt-safe">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="text-slate-600 hover:text-slate-900 lg:hidden p-2 rounded-xl hover:bg-slate-100 active:scale-95 transition-transform"
              onClick={() => setSidebarOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[200px] sm:max-w-none">
                Gestion de la Pharmacie
              </span>
              <span className="text-[10px] text-slate-500 font-medium sm:hidden">
                Bloc Opératoire SIDI IFNI
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            {/* Direct Fiches de Stock Button in Header - Always visible */}
            <Link
              to="/fiches-de-stock"
              className="flex items-center gap-1.5 rounded-lg border border-teal-700 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors shadow-2xs active:scale-95"
              title="Consulter les Fiches de Stock officielles"
            >
              <FileText className="h-3.5 w-3.5 text-teal-700 shrink-0" />
              <span className="hidden xs:inline sm:inline">Fiches</span>
              <span className="hidden sm:inline">Stock</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsExportPdfOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-teal-600/30 bg-teal-50 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100/70 transition-colors"
              title="Exporter l'inventaire en format PDF officiel pour le reporting"
            >
              <FileDown className="h-3.5 w-3.5 text-teal-700" />
              <span className="hidden sm:inline">Rapport</span> PDF
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ajouter Produit</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </div>
        </header>

        {/* Content with bottom clearance for Mobile Bottom Navigation */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Android & iOS Native Feel) */}
      <MobileBottomNav />

      {/* Global Modals */}
      <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <ResetConfirmModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
      <ExportPdfModal isOpen={isExportPdfOpen} onClose={() => setIsExportPdfOpen(false)} />
    </div>
  );
}
