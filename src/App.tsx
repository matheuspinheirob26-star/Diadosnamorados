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
import { CartDrawer } from './components/cart/CartDrawer';
import { NotificationPopup } from './components/ui/NotificationPopup';
import { NewsletterPopup } from './components/ui/NewsletterPopup';
import { captureUTMParameters, tracking } from './lib/tracking';
import { MessageCircle } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home'); // home, catalog, product-[id], checkout, institutional, admin
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionalTab, setInstitutionalTab] = useState('sobre');

  // Filtros de catálogo vindos de ações da Home
  const [catalogFilter, setCatalogFilter] = useState<{ category?: string; gender?: string; tag?: string }>({});

  useEffect(() => {
    // Capturar parâmetros de UTM da URL
    captureUTMParameters();
  }, []);

  // Monitorar navegação para disparar Pixel PageView
  useEffect(() => {
    tracking.pageView(currentPage);
    // Rolagem para o topo ao trocar de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
