import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CatalogProvider } from './context/CatalogContext';
import { DebugProvider } from './context/DebugContext';
import { ToastProvider } from './context/ToastContext';
import DebugPanel from './components/DebugPanel';
import HomePage from './pages/HomePage';
import ProductDetailsPage from './pages/ProductDetailsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DebugProvider>
          <CatalogProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductDetailsPage />} />
            </Routes>
            <DebugPanel />
          </CatalogProvider>
        </DebugProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
