import React from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Users, 
  UserX, 
  MessageSquare, 
  Tag, 
  Calendar, 
  Settings, 
  LogOut, 
  X, 
  Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';

export type AdminTab = 
  | 'dashboard' 
  | 'orders' 
  | 'products' 
  | 'customers' 
  | 'leads' 
  | 'reviews' 
  | 'coupons' 
  | 'campaigns' 
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onCloseMobile?: () => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onCloseMobile, 
  onLogout 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'leads', label: 'Leads / Carrinhos', icon: UserX },
    { id: 'reviews', label: 'Avaliações', icon: MessageSquare },
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'campaigns', label: 'Campanhas', icon: Calendar },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-luxury-gray border-r border-white/5 p-6 justify-between select-none">
      
      {/* Upper Logo / Title */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer">
            <span className="font-serif text-xl tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
            <span className="text-[8px] tracking-[0.3em] font-medium text-gray-500 uppercase -mt-0.5 block">
              Painel Concierge
            </span>
          </div>
          
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile} 
              className="md:hidden text-gray-500 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold-500/10 to-transparent" />

        {/* Tab Lists */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 group cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-gold text-luxury-black font-bold shadow-lg shadow-gold-600/5 glow-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon 
                  size={16} 
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-luxury-black' : 'text-gray-500 group-hover:text-gold-400'
                  }`} 
                />
                <span className="flex-1 text-left">{item.label}</span>
                
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="w-1.5 h-1.5 rounded-full bg-luxury-black" 
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <div className="bg-white/2 border border-white/5 rounded-2xl p-4 text-[10px] text-gray-500 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gold-600/5 blur-[20px] pointer-events-none" />
          <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-widest text-[9px] mb-1">
            <Sparkles size={10} />
            <span>Sistema Seguro</span>
          </div>
          <span className="block font-medium text-gray-400">Logado: admin@amour.com</span>
          <span className="block text-gray-600">Ambiance: Production</span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/5 text-gray-400 hover:text-rose-400 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sair do Painel</span>
        </button>
      </div>

    </div>
  );
};
