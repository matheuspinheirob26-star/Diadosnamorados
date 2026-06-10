import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Zap, FileText, Bitcoin, Settings, ToggleLeft, ToggleRight,
  Shield, CheckCircle2, XCircle, AlertTriangle, ChevronUp, ChevronDown,
  Save, RefreshCw, ExternalLink, Eye, EyeOff, TrendingUp, DollarSign,
  Activity, Webhook, Clock, Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GatewayConfigService } from '../../lib/payments/GatewayConfigService';
import { PaymentService } from '../../lib/payments/PaymentService';
import { WebhookService } from '../../lib/payments/WebhookService';
import { GatewayConfig, GatewayName, Transaction, WebhookEvent, PaymentAttempt } from '../../types/payments';
import { formatCurrency } from '../../lib/utils';
import { LogService } from '../../lib/LogService';

// ─── Gateway Metadata ────────────────────────────────────────────────────────

const GATEWAY_META: Record<GatewayName, {
  color: string; bg: string; border: string; icon: string; description: string; supportedMethods: string[];
}> = {
  mercadopago: {
    color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20',
    icon: '🔵', description: 'Principal gateway BR. Suporta Pix, Cartão e Boleto.',
    supportedMethods: ['Pix', 'Cartão', 'Boleto'],
  },
  pagarme: {
    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    icon: '🟢', description: 'Gateway nacional com excelente suporte a Pix e tokenização.',
    supportedMethods: ['Pix', 'Cartão', 'Boleto'],
  },
  efi: {
    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20',
    icon: '🟡', description: 'Efí Bank — líder em Pix via API do Banco Central.',
    supportedMethods: ['Pix', 'Cartão', 'Boleto'],
  },
  asaas: {
    color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
    icon: '🔴', description: 'Plataforma completa de cobranças para empresas.',
    supportedMethods: ['Pix', 'Cartão', 'Boleto'],
  },
  stripe: {
    color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20',
    icon: '🟣', description: 'Gateway internacional com suporte global a cartões.',
    supportedMethods: ['Cartão Internacional', 'Pix', 'Boleto'],
  },
  crypto: {
    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
    icon: '🟠', description: 'Recebimento em Bitcoin, Ethereum e USDT.',
    supportedMethods: ['BTC', 'ETH', 'USDT TRC20', 'USDT ERC20'],
  },
};

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

type PaymentsTab = 'gateways' | 'transactions' | 'webhooks' | 'analytics';

// ─── Component ────────────────────────────────────────────────────────────────

export const PaymentsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PaymentsTab>('gateways');
  const [configs, setConfigs] = useState<GatewayConfig[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedGateway, setSavedGateway] = useState<GatewayName | null>(null);
  const [expandedGateway, setExpandedGateway] = useState<GatewayName | null>('mercadopago');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [localEdits, setLocalEdits] = useState<Partial<Record<GatewayName, Partial<GatewayConfig>>>>({});
  const [copied, setCopied] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cfgs] = await Promise.all([GatewayConfigService.getAll()]);
    setConfigs(cfgs);
    setTransactions(PaymentService.getTransactions());
    setWebhooks(WebhookService.getHistory());
    setAttempts(PaymentService.getAttempts());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (gateway: GatewayName, field: string, value: string | boolean | number) => {
    setLocalEdits(prev => ({
      ...prev,
      [gateway]: { ...prev[gateway], [field]: value },
    }));
  };

  const handleSave = async (gateway: GatewayName) => {
    const edits = localEdits[gateway];
    if (!edits) return;
    setSaving(true);
    await GatewayConfigService.update(gateway, edits);
    setSavedGateway(gateway);
    setLocalEdits(prev => { const n = { ...prev }; delete n[gateway]; return n; });
    await loadData();
    LogService.log('Gateway Configurado', `Configurações salvas para o gateway ${gateway}`, 'Admin', 'admin@amour.co', 'payment', gateway, 'success');
    setSaving(false);
    setTimeout(() => setSavedGateway(null), 2000);
  };

  const handleToggle = async (gateway: GatewayName, enabled: boolean) => {
    await GatewayConfigService.update(gateway, { enabled });
    LogService.log('Gateway Alterado', `Gateway ${gateway} foi ${enabled ? 'ativado' : 'desativado'}.`, 'Admin', 'admin@amour.co', 'payment', gateway, enabled ? 'info' : 'warning');
    await loadData();
  };

  const handleMoveUp = async (gateway: GatewayName) => {
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(c => c.gateway === gateway);
    if (idx <= 0) return;
    const order = sorted.map(c => c.gateway);
    [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    await GatewayConfigService.reorder(order);
    await loadData();
  };

  const handleMoveDown = async (gateway: GatewayName) => {
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(c => c.gateway === gateway);
    if (idx >= sorted.length - 1) return;
    const order = sorted.map(c => c.gateway);
    [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
    await GatewayConfigService.reorder(order);
    await loadData();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  // ── Analytics ──────────────────────────────────────────────────────────────

  const totalRevenue = transactions.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.filter(t => t.status === 'paid').reduce((s, t) => s + (t.fee || 0), 0);
  const totalNet = totalRevenue - totalFees;
  const successRate = transactions.length > 0
    ? Math.round((transactions.filter(t => t.status === 'paid').length / transactions.length) * 100)
    : 0;

  const byGateway = configs.map(c => {
    const txs = transactions.filter(t => t.gateway === c.gateway);
    const paid = txs.filter(t => t.status === 'paid');
    return {
      ...c,
      txCount: txs.length,
      revenue: paid.reduce((s, t) => s + t.amount, 0),
      fees: paid.reduce((s, t) => s + (t.fee || 0), 0),
      rate: txs.length > 0 ? Math.round((paid.length / txs.length) * 100) : 0,
    };
  });

  const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={20} className="animate-spin text-gold-400" />
      </div>
    );
  }

  // ── Tabs bar ──────────────────────────────────────────────────────────────
  const tabs: { id: PaymentsTab; label: string; icon: React.ElementType }[] = [
    { id: 'gateways',     label: 'Gateways',     icon: Settings },
    { id: 'transactions', label: 'Transações',   icon: CreditCard },
    { id: 'webhooks',     label: 'Webhooks',     icon: Webhook },
    { id: 'analytics',   label: 'Analytics',    icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-white tracking-wider uppercase">
            Central de Pagamentos
          </h2>
          <p className="text-sm text-theme-muted mt-1 uppercase tracking-widest">
            Multi-gateway · Fallback Automático · Webhooks
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <Shield size={12} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            Chaves Seguras — Edge Functions
          </span>
        </div>
      </div>

      {/* Demo mode banner */}
      {configs.some(c => c.isDemo && c.enabled) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-400 uppercase tracking-wider">Modo Demonstração Ativo</p>
            <p className="text-[10px] text-theme-muted mt-1 leading-relaxed">
              Gateways sem chave configurada operam em modo demo (respostas simuladas).
              Para ativar pagamentos reais, insira as chaves públicas abaixo e configure as
              chaves secretas nas variáveis de ambiente das Supabase Edge Functions.
            </p>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/2 border border-theme-border-faint p-1 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-gold text-theme-text shadow-lg'
                  : 'text-theme-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={12} />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: GATEWAYS ─────────────────────────────────────────────────── */}
      {activeTab === 'gateways' && (
        <div className="space-y-4">
          {sortedConfigs.map((config, idx) => {
            const meta = GATEWAY_META[config.gateway];
            const edits = localEdits[config.gateway] ?? {};
            const isCrypto = config.gateway === 'crypto';
            const isExpanded = expandedGateway === config.gateway;
            const hasEdits = Object.keys(edits).length > 0;
            const showKey = showKeys[config.gateway];
            const savedNow = savedGateway === config.gateway;

            return (
              <motion.div
                key={config.gateway}
                layout
                className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                  config.enabled
                    ? `${meta.border} ${meta.bg}`
                    : 'border-theme-border-faint bg-white/2 opacity-60'
                }`}
              >
                {/* Gateway Header Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Priority */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleMoveUp(config.gateway)}
                      disabled={idx === 0}
                      className="p-0.5 text-theme-text hover:text-white disabled:opacity-20 transition cursor-pointer"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <span className="text-[9px] text-theme-muted font-bold w-4 text-center">{config.priority}</span>
                    <button
                      onClick={() => handleMoveDown(config.gateway)}
                      disabled={idx === sortedConfigs.length - 1}
                      className="p-0.5 text-theme-text hover:text-white disabled:opacity-20 transition cursor-pointer"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Icon + Name */}
                  <div className="text-xl">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base font-bold ${meta.color}`}>{config.label}</span>
                      {config.isDemo && config.enabled && (
                        <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[8px] font-bold uppercase tracking-widest rounded-full">
                          Demo
                        </span>
                      )}
                      {!config.isDemo && config.enabled && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-widest rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-theme-muted mt-0.5 truncate">{meta.description}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {meta.supportedMethods.map(m => (
                        <span key={m} className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded text-theme-muted">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(config.gateway, !config.enabled)}
                    className="cursor-pointer"
                  >
                    {config.enabled
                      ? <ToggleRight size={28} className={meta.color} />
                      : <ToggleLeft size={28} className="text-theme-text" />
                    }
                  </button>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedGateway(isExpanded ? null : config.gateway)}
                    className="p-2 text-theme-muted hover:text-white transition cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded Config */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 pt-2 border-t border-theme-border-faint space-y-4">
                        {isCrypto ? (
                          // Crypto: wallet addresses
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(['walletBTC', 'walletETH', 'walletUSDT_TRC20', 'walletUSDT_ERC20'] as const).map((field) => {
                              const labels: Record<string, string> = {
                                walletBTC: '₿ Bitcoin (BTC)',
                                walletETH: 'Ξ Ethereum (ETH)',
                                walletUSDT_TRC20: '💚 USDT TRC20 (Tron)',
                                walletUSDT_ERC20: '🔵 USDT ERC20 (Ethereum)',
                              };
                              const current = (edits as any)[field] ?? (config as any)[field] ?? '';
                              return (
                                <div key={field} className="space-y-1">
                                  <label className="text-[9px] uppercase tracking-widest text-theme-muted font-bold block">
                                    {labels[field]}
                                  </label>
                                  <input
                                    type="text"
                                    value={current}
                                    onChange={e => handleEdit(config.gateway, field, e.target.value)}
                                    placeholder="Endereço da carteira..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white font-mono focus:outline-none focus:border-gold-500 transition"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          // Other gateways: public key / client ID
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase tracking-widest text-theme-muted font-bold block">
                                {config.gateway === 'efi' ? 'Client ID (público)' : 'Chave Pública'}
                              </label>
                              <div className="relative">
                                <input
                                  type={showKey ? 'text' : 'password'}
                                  value={(config.gateway === 'efi'
                                    ? (edits as any).clientId ?? config.clientId
                                    : (edits as any).publicKey ?? config.publicKey) ?? ''}
                                  onChange={e => handleEdit(
                                    config.gateway,
                                    config.gateway === 'efi' ? 'clientId' : 'publicKey',
                                    e.target.value
                                  )}
                                  placeholder={
                                    config.gateway === 'mercadopago' ? 'APP_USR_...'
                                    : config.gateway === 'pagarme' ? 'pk_live_...'
                                    : config.gateway === 'efi' ? 'Client_Id_...'
                                    : config.gateway === 'stripe' ? 'pk_live_...'
                                    : 'Chave pública...'
                                  }
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2 text-[10px] text-white font-mono focus:outline-none focus:border-gold-500 transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKeys(p => ({ ...p, [config.gateway]: !p[config.gateway] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-muted hover:text-white cursor-pointer"
                                >
                                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                              <p className="text-[8px] text-theme-text leading-relaxed">
                                🔒 Chave secreta: configure nas variáveis de ambiente da Supabase Edge Function <code className="text-theme-muted">process-payment</code>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Webhook URL */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-widest text-theme-muted font-bold block">
                            URL do Webhook (configure no painel do gateway)
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white/5 border border-theme-border-faint rounded-lg px-3 py-2 text-[9px] text-theme-muted font-mono truncate">
                              {`https://SEU_PROJETO.supabase.co/functions/v1/webhooks-payments?gateway=${config.gateway}`}
                            </code>
                            <button
                              onClick={() => copyToClipboard(
                                `https://SEU_PROJETO.supabase.co/functions/v1/webhooks-payments?gateway=${config.gateway}`,
                                config.gateway
                              )}
                              className="p-2 text-theme-muted hover:text-white transition cursor-pointer"
                            >
                              {copied === config.gateway ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>

                        {/* Save button */}
                        {hasEdits && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSave(config.gateway)}
                              disabled={saving}
                              className="flex items-center gap-2 bg-gradient-gold text-theme-text text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
                            >
                              {savedNow
                                ? <><CheckCircle2 size={12} /> Salvo!</>
                                : saving
                                ? <><RefreshCw size={12} className="animate-spin" /> Salvando...</>
                                : <><Save size={12} /> Salvar Configuração</>
                              }
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── TAB: TRANSACTIONS ─────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receita Bruta', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-gold-400' },
              { label: 'Receita Líquida', value: formatCurrency(totalNet), icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Total de Taxas', value: formatCurrency(totalFees), icon: Activity, color: 'text-rose-400' },
              { label: 'Taxa de Sucesso', value: `${successRate}%`, icon: CheckCircle2, color: 'text-sky-400' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-luxury-gray border border-theme-border-faint rounded-xl p-4">
                  <div className={`flex items-center gap-1.5 ${stat.color} mb-1`}>
                    <Icon size={12} />
                    <span className="text-[9px] uppercase tracking-widest font-bold">{stat.label}</span>
                  </div>
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                </div>
              );
            })}
          </div>

          {/* Transaction table */}
          <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-border-faint flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transações Recentes</h3>
              <button onClick={loadData} className="p-1.5 text-theme-muted hover:text-white transition cursor-pointer">
                <RefreshCw size={12} />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="p-10 text-center text-theme-text text-sm">
                Nenhuma transação registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-theme-border-faint text-theme-muted uppercase tracking-widest">
                      <th className="text-left px-4 py-3">ID</th>
                      <th className="text-left px-4 py-3">Gateway</th>
                      <th className="text-left px-4 py-3">Método</th>
                      <th className="text-left px-4 py-3">Valor</th>
                      <th className="text-left px-4 py-3">Taxa</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 50).map(tx => (
                      <tr key={tx.id} className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="px-4 py-3 font-mono text-theme-muted">{tx.id.substring(0, 12)}...</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${GATEWAY_META[tx.gateway]?.color ?? 'text-theme-muted'}`}>
                            {GATEWAY_META[tx.gateway]?.icon} {tx.gateway}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-theme-muted uppercase">{tx.method}</td>
                        <td className="px-4 py-3 text-white font-semibold">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-3 text-rose-400">{formatCurrency(tx.fee || 0)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="px-4 py-3 text-theme-text">
                          {new Date(tx.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: WEBHOOKS ─────────────────────────────────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-theme-border-faint flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Log de Webhooks</h3>
              <button onClick={loadData} className="p-1.5 text-theme-muted hover:text-white transition cursor-pointer">
                <RefreshCw size={12} />
              </button>
            </div>
            {webhooks.length === 0 ? (
              <div className="p-10 text-center">
                <Webhook size={32} className="text-theme-text mx-auto mb-3" />
                <p className="text-sm text-theme-text">Nenhum webhook recebido ainda.</p>
                <p className="text-[10px] text-theme-text mt-1">Configure as URLs de webhook nos painéis dos gateways.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-theme-border-faint text-theme-muted uppercase tracking-widest">
                      <th className="text-left px-4 py-3">Gateway</th>
                      <th className="text-left px-4 py-3">Evento</th>
                      <th className="text-left px-4 py-3">TX ID</th>
                      <th className="text-left px-4 py-3">Processado</th>
                      <th className="text-left px-4 py-3">Recebido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.slice(0, 50).map(wh => (
                      <tr key={wh.id} className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="px-4 py-3 font-bold" style={{ color: GATEWAY_META[wh.gateway]?.color }}>
                          {GATEWAY_META[wh.gateway]?.icon} {wh.gateway}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono ${
                            wh.eventType.includes('approved') ? 'text-emerald-400'
                            : wh.eventType.includes('failed') || wh.eventType.includes('chargeback') ? 'text-rose-400'
                            : 'text-theme-muted'
                          }`}>{wh.eventType}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-theme-text text-[9px]">{wh.transactionId || '—'}</td>
                        <td className="px-4 py-3">
                          {wh.processed
                            ? <CheckCircle2 size={12} className="text-emerald-400" />
                            : <Clock size={12} className="text-amber-400" />
                          }
                        </td>
                        <td className="px-4 py-3 text-theme-text">
                          {new Date(wh.receivedAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ANALYTICS ───────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue by gateway */}
            <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Receita por Gateway</h3>
              <div className="space-y-3">
                {byGateway.filter(g => g.txCount > 0).length === 0 ? (
                  <p className="text-sm text-theme-text text-center py-6">Sem dados ainda. Processe pagamentos para ver analytics.</p>
                ) : (
                  byGateway.sort((a, b) => b.revenue - a.revenue).map(gw => {
                    const meta = GATEWAY_META[gw.gateway];
                    const pct = totalRevenue > 0 ? (gw.revenue / totalRevenue) * 100 : 0;
                    return (
                      <div key={gw.gateway} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${meta.color}`}>{meta.icon} {gw.label}</span>
                          <div className="flex items-center gap-3 text-theme-muted">
                            <span>{gw.txCount} txs</span>
                            <span className="text-emerald-400">{gw.rate}% sucesso</span>
                            <span className="text-white font-semibold">{formatCurrency(gw.revenue)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${
                              gw.gateway === 'mercadopago' ? 'from-sky-600 to-sky-400'
                              : gw.gateway === 'pagarme' ? 'from-emerald-600 to-emerald-400'
                              : gw.gateway === 'efi' ? 'from-yellow-600 to-yellow-400'
                              : gw.gateway === 'stripe' ? 'from-violet-600 to-violet-400'
                              : 'from-orange-600 to-orange-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Fallback stats */}
            <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Tentativas & Fallbacks</h3>
              {attempts.length === 0 ? (
                <p className="text-sm text-theme-text text-center py-6">Sem tentativas registradas ainda.</p>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 8).map(att => (
                    <div key={att.id} className="flex items-center justify-between bg-white/2 border border-theme-border-faint rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-[9px] ${GATEWAY_META[att.gateway]?.color}`}>
                          {GATEWAY_META[att.gateway]?.icon}
                        </span>
                        <span className="text-[9px] text-theme-muted uppercase font-mono">{att.method}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-theme-text">{att.responseTimeMs}ms</span>
                        {att.status === 'success'
                          ? <CheckCircle2 size={10} className="text-emerald-400" />
                          : att.status === 'fallback_triggered'
                          ? <AlertTriangle size={10} className="text-amber-400" />
                          : <XCircle size={10} className="text-rose-400" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    paid:       { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Pago' },
    pending:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Pendente' },
    failed:     { color: 'text-rose-400',    bg: 'bg-rose-500/10',    label: 'Falhou' },
    expired:    { color: 'text-theme-muted',    bg: 'bg-gray-500/10',    label: 'Expirado' },
    cancelled:  { color: 'text-theme-muted',    bg: 'bg-gray-500/10',    label: 'Cancelado' },
    refunded:   { color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Reembolsado' },
    processing: { color: 'text-sky-400',     bg: 'bg-sky-500/10',     label: 'Processando' },
  };
  const s = map[status] ?? { color: 'text-theme-muted', bg: 'bg-gray-500/10', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${s.color} ${s.bg}`}>
      {s.label}
    </span>
  );
};
