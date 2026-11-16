import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import CategoryProducts from './pages/CategoryProducts';
import FicheStock from './pages/FicheStock';
import CalendrierPeremption from './pages/CalendrierPeremption';
import Ruptures from './pages/Ruptures';
import Commandes from './pages/Commandes';
import LeBonDanger from './pages/LeBonDanger';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import GmailLoginScreen from './components/GmailLoginScreen';

function AppRoutes() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        <span className="text-xs font-semibold">Vérification de la session Gmail...</span>
      </div>
    );
  }

  if (!user) {
    return <GmailLoginScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="le-bon-danger" element={<LeBonDanger />} />
        <Route path="fiches-de-stock" element={<FicheStock />} />
        <Route path="fiches-de-stock/:productId" element={<FicheStock />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:categoryName" element={<CategoryProducts />} />
        <Route path="product/:productId" element={<FicheStock />} />
        <Route path="commandes" element={<Commandes />} />
        <Route path="peremptions" element={<CalendrierPeremption />} />
        <Route path="ruptures" element={<Ruptures />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
