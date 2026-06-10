import React, { useState } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useStorefront } from '../../context/StorefrontContext';
import { useTheme } from '../../context/ThemeContext';
import { CampaignType } from '../../types';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, Check, Sparkles, ShieldCheck, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onCartOpen: () => void;
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onCartOpen, onSearch, onNavigate, currentPage }) => {
  const { currentCampaign, setCampaign, allCampaigns } = useCampaign();
  const { cart } = useCart();
  const { user, isAdmin, loginAsAdmin, logout } = useAuth();
  const { config } = useStorefront();
  const { theme, setTheme, isDark } = useTheme();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCampaignChange = (id: CampaignType) => {
    setCampaign(id);
    setDropdownOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-theme-border-faint transition-all duration-300">
      {/* Top Bar - Free Shipping Alert */}
      {config.shippingBarText && (
        <div className="bg-gradient-gold text-theme-text text-sm font-semibold py-1.5 px-4 text-center tracking-widest uppercase flex items-center justify-center gap-2">
          <Sparkles size={12} className="animate-spin-slow" />
          <span>{config.shippingBarText}</span>
          <Sparkles size={12} className="animate-spin-slow" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile Menu Icon */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-theme-muted hover:text-theme-text focus:outline-none"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Logo Section */}
          <div className="flex-1 md:flex-initial flex justify-center md:justify-start cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="text-center md:text-left">
              {(config.logoLight || config.logoDark) ? (
                <img src={config.logoLight || config.logoDark} alt={config.storeName} className="h-8 md:h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" />
              ) : (
                <>
                  <span className="font-serif text-2xl tracking-widest font-light text-gradient-gold uppercase block">
                    {config.storeName}
                  </span>
                  <span className="text-[9px] tracking-[0.3em] font-medium text-theme-muted uppercase -mt-1 block">
                    {config.slogan}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex space-x-8 text-sm font-semibold tracking-widest uppercase">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-gold-400 transition-colors duration-200 ${currentPage === 'home' ? 'text-gold-400 border-b border-gold-400/50 pb-1' : 'text-theme-muted'}`}
            >
              Início
            </button>
            <button
              onClick={() => onNavigate('catalog')}
              className={`hover:text-gold-400 transition-colors duration-200 ${currentPage === 'catalog' ? 'text-gold-400 border-b border-gold-400/50 pb-1' : 'text-theme-muted'}`}
            >
              Presentes
            </button>
            <button
              onClick={() => onNavigate('institutional')}
              className={`hover:text-gold-400 transition-colors duration-200 ${currentPage === 'institutional' ? 'text-gold-400 border-b border-gold-400/50 pb-1' : 'text-theme-muted'}`}
            >
              Nossa História
            </button>
          </nav>

          {/* Secondary Controls: Campaign Switcher & Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Seasonal Campaign Switcher (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-theme-border-faint border border-theme-border text-sm font-medium text-theme-muted hover:bg-white/10 hover:border-gold-500/30 transition-all duration-300 cursor-pointer"
              >
                <span>{currentCampaign.emoji}</span>
                <span className="hidden lg:inline">{currentCampaign.name}</span>
                <ChevronDown size={12} className="text-theme-muted" />
              </button>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-luxury-gray border border-theme-border glow-gold p-2 shadow-2xl z-50">
                  <div className="text-[10px] uppercase tracking-wider text-theme-muted font-semibold px-3 py-1.5 border-b border-theme-border-faint">
                    Selecione a Temporada
                  </div>
                  <div className="py-1">
                    {allCampaigns.map((camp) => (
                      <button
                        key={camp.id}
                        onClick={() => handleCampaignChange(camp.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg hover:bg-theme-border-faint transition-all duration-200 ${
                          currentCampaign.id === camp.id ? 'text-gold-400 font-medium' : 'text-theme-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{camp.emoji}</span>
                          <span>{camp.name}</span>
                        </div>
                        {currentCampaign.id === camp.id && <Check size={12} className="text-gold-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            {config.allowUserThemeToggle && (
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="text-theme-muted hover:text-gold-400 transition-colors p-1"
                title="Alternar Tema"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-theme-muted hover:text-gold-400 transition-colors p-1"
              title="Pesquisar presentes"
            >
              <Search size={20} />
            </button>

            {/* Auth / Admin Trigger */}
            <div className="relative">
              {isAdmin ? (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1.5 text-sm font-bold text-rose-400 border border-rose-500/25 px-2.5 py-1 rounded bg-rose-500/5 hover:bg-rose-500/10 transition"
                  title="Painel Admin"
                >
                  <ShieldCheck size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="text-theme-muted hover:text-gold-400 transition-colors p-1 cursor-pointer"
                  title="Acessar Área Administrativa"
                >
                  <User size={20} />
                </button>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={onCartOpen}
              className="relative text-theme-muted hover:text-gold-400 transition-colors p-1 cursor-pointer"
            >
              <ShoppingBag size={20} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-gold text-[9px] font-bold text-theme-text">
                  {cartItemsCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Floating Search Bar container */}
      {searchOpen && (
        <div className="bg-luxury-black/95 border-b border-theme-border-faint py-4 px-4 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              placeholder="Digite o que procura... (ex: Kit Namorados, Perfume, Carteira)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-base text-theme-text focus:outline-none focus:border-gold-500 transition"
              autoFocus
            />
            <button
              type="submit"
              className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-6 py-2 rounded-lg hover:shadow-lg transition"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-theme-muted hover:text-theme-text px-2"
            >
              <X size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-theme-border-faint py-4 px-6 space-y-4">
          <div className="flex flex-col space-y-3 text-base font-semibold tracking-widest uppercase">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 text-theme-muted hover:text-gold-400"
            >
              Início
            </button>
            <button
              onClick={() => {
                onNavigate('catalog');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 text-theme-muted hover:text-gold-400"
            >
              Presentes
            </button>
            <button
              onClick={() => {
                onNavigate('institutional');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 text-theme-muted hover:text-gold-400"
            >
              Nossa História
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-rose-400 hover:text-rose-300"
              >
                Painel Administrativo
              </button>
            )}
            
            {config.allowUserThemeToggle && (
              <div className="pt-2 mt-2 border-t border-theme-border-faint">
                <button
                  onClick={() => {
                    setTheme(isDark ? 'light' : 'dark');
                  }}
                  className="flex items-center gap-2 py-2 text-theme-muted hover:text-gold-400"
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
export default Header;
