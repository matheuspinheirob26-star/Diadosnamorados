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
  Sparkles,
  Shield,
  CreditCard,
  Palette,
  ShieldCheck,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export type AdminTab = 
  | 'dashboard' 
  | 'orders' 
  | 'products' 
  | 'customers' 
  | 'leads' 
  | 'reviews' 
  | 'coupons' 
  | 'campaigns' 
  | 'payments'
  | 'storefront'
  | 'system_logs'
  | 'ai_concierge'
  | 'settings'
  | 'users_manager'
  | 'active_sessions'
  | 'security_events'
  | 'double_approvals';

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
  const { adminUser } = useAuth();
  const loginTime = adminUser?.loginAt ? new Date(adminUser.loginAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'leads', label: 'Leads / Carrinhos', icon: UserX },
    { id: 'reviews', label: 'Avaliações', icon: MessageSquare },
    { id: 'coupons', label: 'Cupons', icon: Tag },
    { id: 'campaigns', label: 'Campanhas', icon: Calendar },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'storefront', label: 'Vitrine & Identidade', icon: Palette },
    { id: 'ai_concierge', label: 'Concierge IA', icon: Sparkles },
    { id: 'system_logs', label: 'Logs do Sistema', icon: Shield },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'users_manager', label: 'Usuários & Permissões', icon: Shield },
    { id: 'double_approvals', label: 'Aprovações Pendentes', icon: ShieldCheck },
    { id: 'active_sessions', label: 'Sessões Ativas', icon: Activity },
    { id: 'security_events', label: 'Eventos de Segurança', icon: ShieldAlert },
  ] as const;

  // Filtrar menus conforme o papel/role (Regra 7)
  const filteredMenuItems = menuItems.filter(item => {
    const role = adminUser?.role || 'support';
    if (role === 'super_admin') return true;
    if (role === 'admin') {
      return !['payments', 'ai_concierge', 'users_manager', 'system_logs', 'settings'].includes(item.id);
    }
    if (role === 'manager') {
      return ['dashboard', 'orders', 'customers', 'leads', 'reviews'].includes(item.id);
    }
    if (role === 'support') {
      return ['dashboard', 'orders', 'customers', 'leads'].includes(item.id);
    }
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-luxury-gray border-r border-theme-border-faint p-6 justify-between select-none">
      
      {/* Upper Logo / Title */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer">
            <span className="font-serif text-xl tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
            <span className="text-[8px] tracking-[0.3em] font-medium text-theme-muted uppercase -mt-0.5 block">
              Painel Concierge
            </span>
          </div>
          
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile} 
              className="md:hidden text-theme-muted hover:text-white p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>
 
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-gold-500/10 to-transparent" />
 
        {/* Tab Lists */}
        <nav className="space-y-1.5">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all duration-300 group cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-gold text-theme-text font-bold shadow-lg shadow-gold-600/5 glow-gold'
                    : 'text-theme-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon 
                  size={16} 
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isActive ? 'text-theme-text' : 'text-theme-muted group-hover:text-gold-400'
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
      <div className="space-y-4 pt-6 border-t border-theme-border-faint">
        <div className="bg-white/2 border border-theme-border-faint rounded-2xl p-4 text-[10px] text-theme-muted space-y-1.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-gold-600/5 blur-[20px] pointer-events-none" />
          <div className="flex items-center gap-1.5 text-gold-400 font-bold uppercase tracking-widest text-[9px] mb-2">
            <Shield size={10} />
            <span>Sessão Ativa</span>
          </div>
          <span className="block font-semibold text-theme-muted truncate">{adminUser?.name ?? 'Admin'}</span>
          <span className="block text-theme-text truncate">{adminUser?.email ?? 'admin@amour.com'}</span>
          <span className="block text-theme-text text-[9px]">Login às {loginTime}</span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 border border-theme-border-faint hover:border-rose-500/20 hover:bg-rose-500/5 text-theme-muted hover:text-rose-400 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
        >
          <LogOut size={14} />
          <span>Sair do Painel</span>
        </button>
      </div>

    </div>
  );
};
