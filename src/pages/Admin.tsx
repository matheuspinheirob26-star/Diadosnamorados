import React, { useEffect, useState } from 'react';
import { api } from '../lib/supabase';
import { Order, Lead, Review, Coupon } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  Tag, 
  Plus, 
  Check, 
  Trash2, 
  Edit3, 
  X, 
  Eye, 
  Package, 
  ArrowUpRight,
  Calendar,
  Settings,
  AlertTriangle,
  CreditCard,
  MapPin,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminTab } from '../components/admin/AdminSidebar';

// Lazy load heavy admin tabs
const ProductsManager = React.lazy(() => import('../components/admin/ProductsManager').then(m => ({ default: m.ProductsManager })));
const PaymentsManager = React.lazy(() => import('../components/admin/PaymentsManager').then(m => ({ default: m.PaymentsManager })));
const StorefrontCustomizer = React.lazy(() => import('../components/admin/StorefrontCustomizer').then(m => ({ default: m.StorefrontCustomizer })));
const SystemLogsTab = React.lazy(() => import('../components/admin/SystemLogsTab').then(m => ({ default: m.SystemLogsTab })));
const AiConciergeTab = React.lazy(() => import('../components/admin/AiConciergeTab').then(m => ({ default: m.AiConciergeTab })));
const UsersManager = React.lazy(() => import('../components/admin/UsersManager').then(m => ({ default: m.UsersManager })));
const ActiveSessionsTab = React.lazy(() => import('../components/admin/ActiveSessionsTab').then(m => ({ default: m.ActiveSessionsTab })));
const SecurityEventsTab = React.lazy(() => import('../components/admin/SecurityEventsTab').then(m => ({ default: m.SecurityEventsTab })));
const DoubleApprovalsTab = React.lazy(() => import('../components/admin/DoubleApprovalsTab').then(m => ({ default: m.DoubleApprovalsTab })));

const SecretsTab = React.lazy(() => import('../components/admin/SecretsTab').then(m => ({ default: m.SecretsTab })));
const BackupsTab = React.lazy(() => import('../components/admin/BackupsTab').then(m => ({ default: m.BackupsTab })));
const HealthMonitorTab = React.lazy(() => import('../components/admin/HealthMonitorTab').then(m => ({ default: m.HealthMonitorTab })));
const MaintenanceTab = React.lazy(() => import('../components/admin/MaintenanceTab').then(m => ({ default: m.MaintenanceTab })));
const LgpdTab = React.lazy(() => import('../components/admin/LgpdTab').then(m => ({ default: m.LgpdTab })));
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { LogService } from '../lib/LogService';
import { supabase } from '../lib/supabase';

// Shared Suspense fallback component
const TabLoader: React.FC<{ label?: string }> = ({ label = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center p-20 text-theme-muted gap-3 animate-fadeIn">
    <RefreshCw size={24} className="animate-spin text-gold-400" />
    <span className="text-[10px] tracking-widest uppercase text-theme-muted animate-pulse">
      {label}
    </span>
  </div>
);

export const Admin: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const { adminLogout, adminUser } = useAuth();
  const { currentCampaign, setCampaign, allCampaigns } = useCampaign();

  // Database States
  const [orders, setOrders] = useState<Order[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Create Coupon Modal Form State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percentage' | 'fixed'>('percentage');
  const [newValue, setNewValue] = useState(10);
  const [newMinSpend, setNewMinSpend] = useState(150);
  const [newExpiry, setNewExpiry] = useState('2026-12-31');

  // Dashboard Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [conversionRate, setConversionRate] = useState(4.8); // simulated default %
  const [activeLeadsCount, setActiveLeadsCount] = useState(0);
  const [criticalEventsCount, setCriticalEventsCount] = useState(0);

  // Selected Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingCodeInput, setTrackingCodeInput] = useState('');

  const loadAllData = async () => {
    const fetchedOrders = await api.getOrders();
    setOrders(fetchedOrders);

    const fetchedLeads = await api.getLeads();
    setLeads(fetchedLeads);

    const fetchedReviews = await api.getReviews(undefined, false); // Pegar aprovados e pendentes
    setReviews(fetchedReviews);

    const fetchedCoupons = await api.getCoupons();
    setCoupons(fetchedCoupons);
  };

  // Proteger abas conforme a role do usuário (Regra 7 / Proteção de Rotas)
  useEffect(() => {
    const role = adminUser?.role || 'support';
    
    const isAllowed = (): boolean => {
      if (role === 'super_admin') return true;
      if (role === 'admin') {
        return !['payments', 'ai_concierge', 'users_manager', 'system_logs', 'settings'].includes(activeTab);
      }
      if (role === 'manager') {
        return ['dashboard', 'orders', 'customers', 'leads', 'reviews'].includes(activeTab);
      }
      if (role === 'support') {
        return ['dashboard', 'orders', 'customers', 'leads'].includes(activeTab);
      }
      return false;
    };

    if (adminUser && !isAllowed()) {
      setActiveTab('dashboard');
    }
  }, [activeTab, adminUser]);

  const checkCriticalEvents = async () => {
    if (!supabase) return;
    try {
      const { count, error } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL');
        
      if (!error && count !== null) {
        setCriticalEventsCount(count);
      }
    } catch (err) {
      console.warn('Erro ao verificar eventos críticos:', err);
    }
  };

  useEffect(() => {
    checkCriticalEvents();
    const interval = setInterval(checkCriticalEvents, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  // Calcular estatísticas quando ordens e leads forem atualizados
  useEffect(() => {
    if (orders.length > 0) {
      // Receita total = somatória de ordens pagas / processando / enviadas
      const paidOrders = orders.filter(o => o.status !== 'pending');
      const revenue = paidOrders.reduce((acc, curr) => acc + curr.total, 0);
      setTotalRevenue(revenue);
      
      const ticket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;
      setAvgTicket(ticket);
    }
    
    const abandonedLeads = leads.filter(l => l.status === 'captured');
    setActiveLeadsCount(abandonedLeads.length);
  }, [orders, leads]);

  // Manipulação de Pedido
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status'], trackCode?: string) => {
    await api.updateOrderStatus(orderId, status, trackCode);
    loadAllData();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status, trackingCode: trackCode || prev.trackingCode } : null);
    }
    LogService.log('Pedido Atualizado', `Status do pedido #${orderId} alterado para ${status}.`, 'Admin', 'admin@amour.co', 'order', orderId, 'info');
  };

  // Aprovar Review
  const handleApproveReview = async (reviewId: string) => {
    await api.approveReview(reviewId);
    loadAllData();
  };

  // Excluir Review
  const handleDeleteReview = async (reviewId: string) => {
    await api.deleteReview(reviewId);
    loadAllData();
  };

  // Deletar Cupom
  const handleDeleteCoupon = async (code: string) => {
    await api.deleteCoupon(code);
    loadAllData();
    LogService.log('Cupom Excluído', `Cupom de desconto excluído: ${code}`, 'Admin', 'admin@amour.co', 'coupon', code, 'warning');
  };

  // Criar Cupom
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    await api.createCoupon({
      code: newCode.trim().toUpperCase(),
      type: newType,
      value: Number(newValue),
      minPurchaseValue: Number(newMinSpend),
      expiresAt: newExpiry,
      active: true
    });

    LogService.log('Cupom Criado', `Novo cupom criado: ${newCode.trim().toUpperCase()}`, 'Admin', 'admin@amour.co', 'coupon', newCode.trim().toUpperCase(), 'success');

    setNewCode('');
    setShowCouponModal(false);
    loadAllData();
  };

  // Simulador de recuperação de carrinho (envia e-mail/whats mock)
  const handleRecoverCart = (lead: Lead) => {
    const text = `Olá ${lead.name}, notamos que você deixou alguns itens incríveis na sacola da Amour & Co. Use o cupom NAMORADOS10 e conclua seu presente com 10% OFF: https://amour.com/checkout?recover=${lead.id}`;
    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    
    // Mudar status do lead
    api.updateLeadStatus(lead.id, 'recovered');
    loadAllData();
  };

  // Clientes
  const getUniqueCustomers = () => {
    const custMap = new Map<string, { name: string; email: string; phone: string; cpf: string; totalSpent: number; ordersCount: number }>();
    orders.forEach(o => {
      if (o.status !== 'pending') {
        const existing = custMap.get(o.customerEmail.toLowerCase());
        if (existing) {
          existing.totalSpent += o.total;
          existing.ordersCount += 1;
        } else {
          custMap.set(o.customerEmail.toLowerCase(), {
            name: o.customerName,
            email: o.customerEmail,
            phone: o.customerPhone,
            cpf: o.customerCpf,
            totalSpent: o.total,
            ordersCount: 1
          });
        }
      }
    });
    return Array.from(custMap.values());
  };

  const handleLogout = () => {
    adminLogout();
    onNavigate('admin-login');
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      
      {/* Global Critical Event Banner */}
      {criticalEventsCount > 0 && (
        <div className="bg-rose-950/90 border border-rose-500/35 text-rose-400 p-4 rounded-2xl flex items-center justify-between gap-3 animate-pulse mb-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div className="text-left">
              <span className="text-xs uppercase tracking-widest font-extrabold block">
                ALERTA CRÍTICO DE SEGURANÇA
              </span>
              <span className="text-[10px] text-theme-muted mt-0.5 block">
                Existem {criticalEventsCount} evento(s) crítico(s) de segurança pendente(s) de revisão imediata.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('security_events')}
            className="bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/35 text-rose-400 text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition font-bold cursor-pointer shrink-0"
          >
            Auditar Logs
          </button>
        </div>
      )}
      
      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Metrics grids */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-2 relative overflow-hidden">
              <DollarSign size={24} className="text-gold-500 absolute top-6 right-6 opacity-30" />
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Faturamento Aprovado</span>
              <h3 className="text-2xl font-bold text-theme-text block">{formatCurrency(totalRevenue)}</h3>
              <p className="text-[10px] text-theme-muted mt-1 flex items-center gap-1">
                <span className="text-emerald-400 font-bold flex items-center gap-0.5"><ArrowUpRight size={10} /> +12.4%</span> vs semana passada
              </p>
            </div>

            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-2 relative overflow-hidden">
              <ShoppingCart size={24} className="text-gold-500 absolute top-6 right-6 opacity-30" />
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Vendas Concluídas</span>
              <h3 className="text-2xl font-bold text-theme-text block">{orders.filter(o => o.status !== 'pending').length}</h3>
              <p className="text-[10px] text-theme-muted mt-1 flex items-center gap-1">
                Taxa de cancelamento: <span className="text-theme-text font-medium">0%</span>
              </p>
            </div>

            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-2 relative overflow-hidden">
              <TrendingUp size={24} className="text-gold-500 absolute top-6 right-6 opacity-30" />
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Ticket Médio</span>
              <h3 className="text-2xl font-bold text-theme-text block">{formatCurrency(avgTicket)}</h3>
              <p className="text-[10px] text-theme-muted mt-1">
                Foco em kits de maior valor agregado
              </p>
            </div>

            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-2 relative overflow-hidden">
              <Users size={24} className="text-gold-500 absolute top-6 right-6 opacity-30" />
              <span className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Carrinhos Abandonados</span>
              <h3 className="text-2xl font-bold text-rose-400 block">{activeLeadsCount}</h3>
              <p className="text-[10px] text-theme-muted mt-1">
                Qualificados para recuperação ativa
              </p>
            </div>

          </div>

          {/* Graph Simulation */}
          <div className="bg-luxury-gray border border-theme-border-faint p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex justify-between items-center border-b border-theme-border-faint pb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase">Gráfico de Faturamento Diário</h3>
                <p className="text-[10px] text-theme-muted">Junho 2026 - Período da campanha de Namorados</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
                Lucro operacional saudável
              </span>
            </div>

            {/* Simulates visual bar chart */}
            <div className="h-56 flex items-end gap-3 sm:gap-6 pt-4 border-b border-theme-border pb-1">
              {[
                { day: '01/Jun', rev: 1200, pct: 30 },
                { day: '02/Jun', rev: 1800, pct: 45 },
                { day: '03/Jun', rev: 2500, pct: 60 },
                { day: '04/Jun', rev: 1900, pct: 48 },
                { day: '05/Jun', rev: 3200, pct: 80 },
                { day: '06/Jun', rev: 4100, pct: 100 },
                { day: '07/Jun', rev: 2800, pct: 70 }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-help">
                  <div className="text-[9px] font-bold text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(bar.rev)}
                  </div>
                  <div
                    className="w-full bg-gradient-gold rounded-t-md hover:brightness-115 transition duration-300 shadow-lg"
                    style={{ height: `${bar.pct}%` }}
                  />
                  <span className="text-[9px] text-theme-muted mt-1 font-bold">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 2. ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
          <div className="p-6 border-b border-theme-border-faint bg-white/2">
            <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase">Fila de Pedidos</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/1 select-none">
                  <th className="p-4">Pedido</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Itens</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-theme-muted">Nenhum pedido efetuado.</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/2 transition">
                      <td className="p-4 font-mono font-bold text-theme-text">{order.id}</td>
                      <td className="p-4">
                        <span className="block text-theme-text font-semibold">{order.customerName}</span>
                        <span className="block text-[10px] text-theme-muted mt-0.5">{order.city} - {order.state}</span>
                      </td>
                      <td className="p-4">
                        <span className="block text-[10px] truncate max-w-[150px]">{order.items.map(i => i.name).join(', ')}</span>
                        <span className="block text-[9px] text-theme-muted mt-0.5">{order.items.length} item{order.items.length !== 1 && 's'}</span>
                      </td>
                      <td className="p-4 font-bold text-gold-400">{formatCurrency(order.total)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          order.status === 'shipped' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          order.status === 'delivered' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                          order.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-gray-500/10 text-theme-muted border border-gray-500/20'
                        }`}>
                          {order.status === 'paid' ? 'Pago' :
                           order.status === 'shipped' ? 'Enviado' :
                           order.status === 'delivered' ? 'Entregue' :
                           order.status === 'processing' ? 'Processando' : 'Aguardando'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setTrackingCodeInput(order.trackingCode || '');
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-gold-400 uppercase tracking-wider hover:text-theme-text cursor-pointer"
                        >
                          <Eye size={12} /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PRODUCTS TAB */}
      {activeTab === 'products' && (
        <React.Suspense fallback={<TabLoader label="Carregando Produtos..." />}>
          <ProductsManager />
        </React.Suspense>
      )}

      {/* 4. CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
          <div className="p-6 border-b border-theme-border-faint bg-white/2">
            <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase">Base de Clientes Unificados</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/1 select-none">
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">CPF</th>
                  <th className="p-4 text-center">Compras</th>
                  <th className="p-4 text-right">Total Investido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {getUniqueCustomers().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-muted">Nenhum cliente cadastrado no momento.</td>
                  </tr>
                ) : (
                  getUniqueCustomers().map((cust, idx) => (
                    <tr key={idx} className="hover:bg-white/2 transition">
                      <td className="p-4 font-semibold text-theme-text">{cust.name}</td>
                      <td className="p-4">
                        <span className="block text-theme-text">{cust.email}</span>
                        <span className="block text-[10px] text-theme-muted mt-0.5">{cust.phone}</span>
                      </td>
                      <td className="p-4 font-mono text-theme-muted">{cust.cpf}</td>
                      <td className="p-4 text-center font-bold text-theme-text">{cust.ordersCount} compra(s)</td>
                      <td className="p-4 text-right font-bold text-gold-400">{formatCurrency(cust.totalSpent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. LEADS TAB (Carrinhos Abandonados) */}
      {activeTab === 'leads' && (
        <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl animate-fadeIn">
          <div className="p-6 border-b border-theme-border-faint bg-white/2">
            <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase">Captura de Leads e Carrinhos Abandonados</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/1 select-none">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Carrinho Abandonado</th>
                  <th className="p-4">Captura</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Recuperação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-theme-muted">Nenhum lead capturado.</td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/2 transition">
                      <td className="p-4 text-theme-text font-semibold">{lead.name}</td>
                      <td className="p-4">
                        <span className="block text-theme-text">{lead.email}</span>
                        <span className="block text-[10px] text-theme-muted mt-0.5">{lead.phone}</span>
                      </td>
                      <td className="p-4">
                        <span className="block text-[10px] truncate max-w-[150px]">{lead.cartItems.map(i => i.name).join(', ')}</span>
                        <span className="block text-[9px] text-gold-400 mt-0.5">Total: {formatCurrency(lead.cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0))}</span>
                      </td>
                      <td className="p-4 text-theme-muted">{new Date(lead.createdAt).toLocaleString('pt-BR')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          lead.status === 'purchased' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          lead.status === 'recovered' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {lead.status === 'purchased' ? 'Comprou' :
                           lead.status === 'recovered' ? 'Contatado' : 'Abandonou'}
                        </span>
                      </td>
                      <td className="p-4">
                        {lead.status === 'captured' ? (
                          <button
                            onClick={() => handleRecoverCart(lead)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            WhatsApp
                          </button>
                        ) : (
                          <span className="text-[10px] text-theme-text font-semibold uppercase">Finalizado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. REVIEWS MODERATION TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase border-b border-theme-border-faint pb-4">
              Moderação de Avaliações
            </h3>
            
            {reviews.length === 0 ? (
              <p className="text-sm text-theme-muted py-6 text-center">Nenhum comentário submetido.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white/2 border border-theme-border-faint p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block font-bold text-theme-text text-sm">{rev.customerName}</span>
                        <span className="block text-[9px] text-theme-muted mt-0.5">Nota: {rev.rating} estrelas • Produto ID: {rev.productId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        rev.approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {rev.approved ? 'Aprovado' : 'Pendente'}
                      </span>
                    </div>

                    <p className="text-sm text-theme-muted italic">
                      "{rev.comment}"
                    </p>

                    {rev.photos && rev.photos.length > 0 && (
                      <img src={rev.photos[0]} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-theme-border-faint">
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-rose-400 hover:text-theme-text text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded bg-rose-500/5 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        Excluir
                      </button>
                      {!rev.approved && (
                        <button
                          onClick={() => handleApproveReview(rev.id)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded transition cursor-pointer"
                        >
                          Aprovar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. COUPONS TAB */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-theme-text tracking-widest uppercase">Gestão de Cupons</h3>
            <button
              onClick={() => setShowCouponModal(true)}
              className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-4 py-2 rounded-lg hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} /> Criar Cupom
            </button>
          </div>

          <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/2 select-none">
                  <th className="p-4">Cupom</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Desconto</th>
                  <th className="p-4">Mínimo Compra</th>
                  <th className="p-4">Expiração</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {coupons.map((coupon) => (
                  <tr key={coupon.code} className="hover:bg-white/2 transition">
                    <td className="p-4 font-mono font-bold text-theme-text">{coupon.code}</td>
                    <td className="p-4 capitalize">{coupon.type === 'percentage' ? 'Porcentagem' : 'Valor Fixo'}</td>
                    <td className="p-4 text-gold-400 font-bold">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                    </td>
                    <td className="p-4">{formatCurrency(coupon.minPurchaseValue)}</td>
                    <td className="p-4 text-theme-muted">{coupon.expiresAt}</td>
                    <td className="p-4">
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                        Ativo
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDeleteCoupon(coupon.code)}
                        className="text-rose-400 hover:text-theme-text p-1 cursor-pointer"
                        title="Deletar cupom"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. CAMPAIGNS TAB */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-theme-border-faint pb-4">
            <h3 className="font-serif text-2xl text-theme-text tracking-wide uppercase">Campanhas Sazonais</h3>
            <p className="text-[10px] text-theme-muted uppercase tracking-widest">Altere o tema visual e a curadoria da loja em tempo real</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCampaigns.map((camp) => {
              const isActive = currentCampaign.id === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => {
                    setCampaign(camp.id);
                  }}
                  className={`relative p-6 rounded-3xl border transition duration-300 cursor-pointer overflow-hidden group select-none ${
                    isActive 
                      ? 'border-gold-500 bg-gold-500/10 shadow-lg glow-gold'
                      : 'border-theme-border-faint bg-luxury-gray hover:border-white/20'
                  }`}
                  style={{ backgroundImage: isActive ? undefined : camp.bgGradient }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-3xl">{camp.emoji}</span>
                    {isActive && (
                      <span className="bg-gradient-gold text-theme-text font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full shadow">
                        Ativa na Loja
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-8 space-y-2">
                    <h4 className="font-serif text-xl text-theme-text group-hover:text-gold-400 transition">{camp.name}</h4>
                    <p className="text-[10px] text-theme-muted font-light leading-relaxed">{camp.headline}</p>
                    <span className="block text-[8px] text-theme-muted uppercase tracking-wider mt-4">Badge: {camp.badgeText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-3xl animate-fadeIn">
          <div className="border-b border-theme-border-faint pb-4">
            <h3 className="font-serif text-2xl text-theme-text tracking-wide uppercase">Configurações Globais da Loja</h3>
            <p className="text-[10px] text-theme-muted uppercase tracking-widest">Ajuste parâmetros operacionais, frete e meios de pagamento</p>
          </div>

          <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-3xl space-y-6 shadow-2xl">
            
            {/* Secao 1: Contato e Concierge */}
            <div className="space-y-4">
              <span className="text-sm font-semibold text-theme-text tracking-widest uppercase block border-b border-theme-border-faint pb-2">Atendimento & WhatsApp</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">WhatsApp Concierge</label>
                  <input
                    type="text"
                    defaultValue="+55 (11) 99999-9999"
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">E-mail de Suporte</label>
                  <input
                    type="text"
                    defaultValue="concierge@amour.com"
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Secao 2: Parâmetros de Frete */}
            <div className="space-y-4 pt-4 border-t border-theme-border-faint">
              <span className="text-sm font-semibold text-theme-text tracking-widest uppercase block border-b border-theme-border-faint pb-2">Logística e Frete</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Limite para Frete Grátis (R$)</label>
                  <input
                    type="number"
                    defaultValue={290.00}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">CEP Origem (Despacho)</label>
                  <input
                    type="text"
                    defaultValue="01424-002"
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Secao 3: Gateways e Checkout */}
            <div className="space-y-4 pt-4 border-t border-theme-border-faint">
              <span className="text-sm font-semibold text-theme-text tracking-widest uppercase block border-b border-theme-border-faint pb-2">Meios de Pagamento Ativos</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2.5 bg-white/2 border border-theme-border-faint p-3.5 rounded-xl">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-gold-500" />
                  <div>
                    <span className="block font-bold text-theme-text">Pix Imediato</span>
                    <span className="block text-[8px] text-theme-muted">Com 10% OFF</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-white/2 border border-theme-border-faint p-3.5 rounded-xl">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-gold-500" />
                  <div>
                    <span className="block font-bold text-theme-text">Cartão de Crédito</span>
                    <span className="block text-[8px] text-theme-muted">Até 10x sem juros</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-white/2 border border-theme-border-faint p-3.5 rounded-xl">
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-gold-500" />
                  <div>
                    <span className="block font-bold text-theme-text">Boleto Bancário</span>
                    <span className="block text-[8px] text-theme-muted">Processamento em 24h</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => alert('Configurações salvas com sucesso!')}
                className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-6 py-2.5 rounded-xl hover:shadow-lg transition cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STOREFRONT CUSTOMIZER TAB */}
      {activeTab === 'storefront' && (
        <React.Suspense fallback={<TabLoader label="Carregando Vitrine..." />}>
          <StorefrontCustomizer />
        </React.Suspense>
      )}

      {/* MODAL ORDER DETAIL (POPUP) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedOrder(null)} />
          
          <div className="relative w-full max-w-2xl bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold overflow-y-auto max-h-[90vh] space-y-6">
            
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-theme-muted hover:text-theme-text p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="border-b border-theme-border-faint pb-4">
              <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold">Detalhamento Completo</span>
              <h3 className="font-serif text-xl text-theme-text tracking-wide">Pedido {selectedOrder.id}</h3>
              <p className="text-[10px] text-theme-muted">Criado em {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm leading-relaxed">
              
              {/* Customer contact Info */}
              <div className="space-y-2 bg-white/2 p-4 rounded-2xl border border-theme-border-faint">
                <span className="text-[10px] uppercase font-bold text-gold-400 block tracking-wider">Informações do Cliente</span>
                <span className="block text-theme-text font-semibold">Nome: {selectedOrder.customerName}</span>
                <span className="block">Email: {selectedOrder.customerEmail}</span>
                <span className="block">Celular: {selectedOrder.customerPhone}</span>
                <span className="block">CPF: {selectedOrder.customerCpf}</span>
              </div>

              {/* Shipping address Info */}
              <div className="space-y-2 bg-white/2 p-4 rounded-2xl border border-theme-border-faint">
                <span className="text-[10px] uppercase font-bold text-gold-400 block tracking-wider">Endereço de Entrega</span>
                <span className="block text-theme-text font-semibold">CEP: {selectedOrder.cep}</span>
                <span className="block">{selectedOrder.address}, {selectedOrder.number} {selectedOrder.complement && `- ${selectedOrder.complement}`}</span>
                <span className="block">{selectedOrder.neighborhood}</span>
                <span className="block">{selectedOrder.city} - {selectedOrder.state}</span>
              </div>

            </div>

            {/* Product items table */}
            <div className="bg-white/2 border border-theme-border-faint rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-theme-text tracking-wider block">Itens Comprados</span>
              <div className="divide-y divide-white/5 text-sm">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 first:pt-0">
                    <div className="flex items-center gap-2">
                      <img src={item.image} alt="" className="w-8 h-8 object-cover rounded bg-theme-border-faint" />
                      <div>
                        <span className="font-semibold text-theme-text block">{item.name}</span>
                        {item.selectedSize && <span className="text-[9px] text-theme-muted">Tamanho: {item.selectedSize}</span>}
                      </div>
                    </div>
                    <span>{item.quantity}x de {formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action edit order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm items-end pt-4 border-t border-theme-border-faint">
              
              {/* Order Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Status do Pedido</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as any, selectedOrder.trackingCode)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                >
                  <option value="pending">Aguardando Pagamento</option>
                  <option value="paid">Pago (Preparar Presente)</option>
                  <option value="processing">Processando Embalagem</option>
                  <option value="shipped">Enviado (Adicionar Rastreio)</option>
                  <option value="delivered">Entregue ao Destinatário</option>
                </select>
              </div>

              {/* Tracking Code input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Código de Rastreamento</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: QI123456789BR"
                    value={trackingCodeInput}
                    onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  />
                  <button
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, selectedOrder.status, trackingCodeInput)}
                    className="bg-white/10 hover:bg-gold-500 hover:text-theme-text border border-theme-border px-4 py-2 font-bold uppercase rounded-lg transition cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL DIALOG */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setShowCouponModal(false)} />
          
          <form onSubmit={handleCreateCoupon} className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-4">
            
            <button
              type="button"
              onClick={() => setShowCouponModal(false)}
              className="absolute top-4 right-4 text-theme-muted hover:text-theme-text p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="border-b border-theme-border-faint pb-2">
              <h3 className="font-serif text-xl text-theme-text tracking-wide uppercase">Novo Cupom de Desconto</h3>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Código</label>
              <input
                type="text"
                placeholder="Ex: AMOUR15"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Tipo</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                >
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Valor do Desconto</label>
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Compra Mínima (R$)</label>
                <input
                  type="number"
                  value={newMinSpend}
                  onChange={(e) => setNewMinSpend(Number(e.target.value))}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Data de Expiração</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-theme-muted hover:text-theme-text transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                Criar Cupom
              </button>
            </div>

          </form>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <React.Suspense fallback={<TabLoader label="Pagamentos" />}>
          <PaymentsManager />
        </React.Suspense>
      )}

      {/* SYSTEM LOGS TAB */}
      {activeTab === 'system_logs' && (
        <React.Suspense fallback={<TabLoader label="Logs do Sistema" />}>
          <SystemLogsTab />
        </React.Suspense>
      )}

      {/* AI CONCIERGE TAB */}
      {activeTab === 'ai_concierge' && (
        <React.Suspense fallback={<TabLoader label="Concierge IA" />}>
          <AiConciergeTab />
        </React.Suspense>
      )}

      {/* USERS & PERMISSIONS TAB */}
      {activeTab === 'users_manager' && (
        <React.Suspense fallback={<TabLoader label="Usuários & Permissões" />}>
          <UsersManager />
        </React.Suspense>
      )}

      {/* DOUBLE APPROVALS TAB */}
      {activeTab === 'double_approvals' && (
        <React.Suspense fallback={<TabLoader label="Aprovações Duplas" />}>
          <DoubleApprovalsTab />
        </React.Suspense>
      )}

      {/* ACTIVE SESSIONS TAB */}
      {activeTab === 'active_sessions' && (
        <React.Suspense fallback={<TabLoader label="Sessões Ativas" />}>
          <ActiveSessionsTab />
        </React.Suspense>
      )}

      {/* SECURITY EVENTS TAB */}
      {activeTab === 'security_events' && (
        <React.Suspense fallback={<TabLoader label="Eventos de Segurança" />}>
          <SecurityEventsTab />
        </React.Suspense>
      )}

      {/* SECRETS GOVERNANCE TAB */}
      {activeTab === 'secrets' && (
        <React.Suspense fallback={<TabLoader label="Governança de Secrets" />}>
          <SecretsTab />
        </React.Suspense>
      )}

      {/* BACKUPS AUDIT TAB */}
      {activeTab === 'backups' && (
        <React.Suspense fallback={<TabLoader label="Auditoria de Backups" />}>
          <BackupsTab />
        </React.Suspense>
      )}

      {/* HEALTH MONITOR TAB */}
      {activeTab === 'health' && (
        <React.Suspense fallback={<TabLoader label="Monitor de Saúde" />}>
          <HealthMonitorTab />
        </React.Suspense>
      )}

      {/* MAINTENANCE MODE TAB */}
      {activeTab === 'maintenance' && (
        <React.Suspense fallback={<TabLoader label="Modo Manutenção" />}>
          <MaintenanceTab />
        </React.Suspense>
      )}

      {/* LGPD COMPLIANCE TAB */}
      {activeTab === 'lgpd' && (
        <React.Suspense fallback={<TabLoader label="Conformidade LGPD" />}>
          <LgpdTab />
        </React.Suspense>
      )}

    </AdminLayout>
  );
};
export default Admin;
