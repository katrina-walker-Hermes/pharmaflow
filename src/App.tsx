import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import CategoryProducts from './pages/CategoryProducts';
import FicheStock from './pages/FicheStock';
import CalendrierPeremption from './pages/CalendrierPeremption';
import Ruptures from './pages/Ruptures';
import Commandes from './pages/Commandes';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
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

export default App;
