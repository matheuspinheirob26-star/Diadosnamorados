import React, { useState, useEffect } from 'react';
import { CampaignProvider } from './context/CampaignContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { Institutional } from './pages/Institutional';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { CartDrawer } from './components/cart/CartDrawer';
import { NotificationPopup } from './components/ui/NotificationPopup';
import { NewsletterPopup } from './components/ui/NewsletterPopup';
import { captureUTMParameters, tracking } from './lib/tracking';
import { MessageCircle } from 'lucide-react';
const getPageFromPath = (path: string): string => {
  const cleanPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const p = cleanPath.toLowerCase();
  if (p === '/catalog') return 'catalog';
  if (p === '/checkout') return 'checkout';
  if (p === '/admin') return 'admin';
  if (p === '/login') return 'login';
  if (p === '/institutional') return 'institutional';
  if (p.startsWith('/product/')) {
    const productId = cleanPath.split('/product/')[1];
    return `product-${productId}`;
  }
  return 'home';
};

const getPathFromPage = (page: string): string => {
  if (page === 'home') return '/';
  if (page === 'catalog') return '/catalog';
  if (page === 'checkout') return '/checkout';
  if (page === 'admin') return '/admin';
  if (page === 'login') return '/login';
  if (page === 'institutional') return '/institutional';
  if (page.startsWith('product-')) {
    const id = page.replace('product-', '');
    return `/product/${id}`;
  }
  return '/';
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return getPageFromPath(window.location.pathname);
    }
    return 'home';
  });
  
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionalTab, setInstitutionalTab] = useState('sobre');

  // Filtros de catálogo vindos de ações da Home
  const [catalogFilter, setCatalogFilter] = useState<{ category?: string; gender?: string; tag?: string }>({});

  useEffect(() => {
    // Capturar parâmetros de UTM da URL
    captureUTMParameters();
    
    // Escutar eventos de voltar/avançar no navegador
    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Monitorar navegação para disparar Pixel PageView e atualizar URL do navegador
  useEffect(() => {
    tracking.pageView(currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      const expectedPath = getPathFromPage(currentPage);
      if (window.location.pathname !== expectedPath) {
        window.history.pushState(null, '', expectedPath);
      }
    }
  }, [currentPage]);

  const handleNavigate = (page: string, tab?: string) => {
    setCurrentPage(page);
    if (tab) {
      setInstitutionalTab(tab);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage('catalog');
  };

  const handleResetCatalogFilters = () => {
    setCatalogFilter({});
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-gray-300 antialiased bg-luxury-black bg-gradient-luxury transition-all duration-500">
      
      {/* Sticky Header */}
      <Header
        onCartOpen={() => setCartOpen(true)}
        onSearch={handleSearch}
        onNavigate={handleNavigate}
        currentPage={currentPage}
      />

      {/* Main Pages Content Routing */}
      <main className="flex-grow">
        {currentPage === 'home' && (
          <Home
            onNavigate={handleNavigate}
            onSetCatalogFilter={setCatalogFilter}
          />
        )}
        {currentPage === 'catalog' && (
          <Catalog
            onNavigate={handleNavigate}
            filterState={catalogFilter}
            onResetFilter={handleResetCatalogFilters}
            searchQuery={searchQuery}
          />
        )}
        {currentPage.startsWith('product-') && (
          <ProductDetail
            productId={currentPage.replace('product-', '')}
            onNavigate={handleNavigate}
            onCartOpen={() => setCartOpen(true)}
          />
        )}
        {currentPage === 'checkout' && (
          <Checkout onNavigate={handleNavigate} />
        )}
        {currentPage === 'login' && (
          <Login onNavigate={handleNavigate} />
        )}
        {currentPage === 'institutional' && (
          <Institutional defaultTab={institutionalTab} />
        )}
        {currentPage === 'admin' && (
          <Admin onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => handleNavigate('checkout')}
      />

      {/* Social Proof & Conversion Popups */}
      <NotificationPopup />
      <NewsletterPopup />

      {/* WhatsApp Floating Chat Bubble */}
      <button
        onClick={() => {
          const text = "Olá! Gostaria de falar com o Concierge Amour & Co. sobre presentes de luxo.";
          window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
        }}
        className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl hover:scale-110 transition duration-300 flex items-center justify-center border border-emerald-400/25 cursor-pointer"
        title="Concierge WhatsApp"
      >
        <MessageCircle size={22} className="fill-white text-emerald-500" />
      </button>

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CampaignProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </CampaignProvider>
    </AuthProvider>
  );
}

export default App;
