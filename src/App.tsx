import { Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

export default App;
