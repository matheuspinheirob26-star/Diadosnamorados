import React, { useState, useEffect } from 'react';
import { CampaignProvider } from './context/CampaignContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorefrontProvider } from './context/StorefrontContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { Institutional } from './pages/Institutional';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { AdminLogin } from './pages/AdminLogin';
import { ConciergeChatWidget } from './components/chat/ConciergeChatWidget';
import { CartDrawer } from './components/cart/CartDrawer';
import { NotificationPopup } from './components/ui/NotificationPopup';
import { NewsletterPopup } from './components/ui/NewsletterPopup';
import { TrackingScripts } from './components/TrackingScripts';
import { useStorefront } from './context/StorefrontContext';
import { captureUTMParameters, tracking } from './lib/tracking';
import { MessageCircle } from 'lucide-react';
const getPageFromPath = (path: string): string => {
  // Suporte a hash routing fallback (útil para Vercel sem rewrite ativo)
  let cleanPath = path;
  if (typeof window !== 'undefined' && window.location.hash) {
    cleanPath = window.location.hash.replace('#', '');
  }
  
  const cleanPathNoSlash = cleanPath.endsWith('/') && cleanPath.length > 1 ? cleanPath.slice(0, -1) : cleanPath;
  const p = cleanPathNoSlash.toLowerCase();
  if (p === '/catalog') return 'catalog';
  if (p === '/checkout') return 'checkout';
  if (p === '/admin') return 'admin';
  if (p === '/admin/login') return 'admin-login';
  if (p === '/login') return 'login';
  if (p === '/institutional') return 'institutional';
  if (p.startsWith('/product/')) {
    const productId = cleanPathNoSlash.split('/product/')[1];
    return `product-${productId}`;
  }
  return 'home';
};

const getPathFromPage = (page: string): string => {
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  const useHash = isVercel || (typeof window !== 'undefined' && !!window.location.hash);
  const prefix = useHash ? '#' : '';

  if (page === 'home') return useHash ? '#/' : '/';
  if (page === 'catalog') return prefix + '/catalog';
  if (page === 'checkout') return prefix + '/checkout';
  if (page === 'admin') return prefix + '/admin';
  if (page === 'admin-login') return prefix + '/admin/login';
  if (page === 'login') return prefix + '/login';
  if (page === 'institutional') return prefix + '/institutional';
  if (page.startsWith('product-')) {
    const id = page.replace('product-', '');
    return prefix + `/product/${id}`;
  }
  return useHash ? '#/' : '/';
};

const AppContent = () => {
  const { isAdminAuthenticated } = useAuth();
  const { config } = useStorefront();
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
    
    // Escutar eventos de voltar/avançar no navegador (suporte a path e hash)
    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    const handleHashChange = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Monitorar navegação para disparar Pixel PageView e atualizar URL do navegador
  useEffect(() => {
    tracking.pageView(currentPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (typeof window !== 'undefined') {
      const expectedPath = getPathFromPage(currentPage);
      // Evitar loop infinito comparando com a localização correta (seja path ou hash)
      const currentFullUrl = window.location.hash ? window.location.hash : window.location.pathname;
      if (currentFullUrl !== expectedPath) {
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
      
      {/* Sticky Header - oculto no admin e admin-login */}
      {currentPage !== 'admin' && currentPage !== 'admin-login' && (
        <Header
          onCartOpen={() => setCartOpen(true)}
          onSearch={handleSearch}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
      )}

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
        {currentPage === 'admin-login' && (
          <AdminLogin onNavigate={handleNavigate} />
        )}
        {currentPage === 'institutional' && (
          <Institutional defaultTab={institutionalTab} />
        )}
        {currentPage === 'admin' && (
          isAdminAuthenticated
            ? <Admin onNavigate={handleNavigate} />
            : <AdminLogin onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer - oculto no admin e admin-login */}
      {currentPage !== 'admin' && currentPage !== 'admin-login' && <Footer onNavigate={handleNavigate} />}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => handleNavigate('checkout')}
      />

      {/* Social Proof & Conversion Popups - ocultos no admin */}
      {currentPage !== 'admin' && currentPage !== 'admin-login' && (
        <>
          <NotificationPopup />
          <NewsletterPopup />
          <ConciergeChatWidget />
        </>
      )}

    </div>
  );
}


function App() {
  return (
    <StorefrontProvider>
      <AuthProvider>
        <CampaignProvider>
          <CartProvider>
            <TrackingScripts />
            <AppContent />
          </CartProvider>
        </CampaignProvider>
      </AuthProvider>
    </StorefrontProvider>
  );
}

export default App;
