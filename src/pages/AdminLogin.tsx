import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle,
  Sparkles, LogIn, ChevronRight, Clock
} from 'lucide-react';

interface AdminLoginProps {
  onNavigate: (page: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const { adminLogin, isAdminAuthenticated, adminUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // Se já está autenticado, redirecionar direto para o admin
  useEffect(() => {
    if (isAdminAuthenticated) {
      onNavigate('admin');
    }
  }, [isAdminAuthenticated]);

  // Countdown para desbloqueio após muitas tentativas
  useEffect(() => {
    if (!blockedUntil) return;
    const interval = setInterval(() => {
      if (new Date() >= blockedUntil) {
        setBlockedUntil(null);
        setAttempts(0);
        clearInterval(interval);
      }
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil]);

  const remainingSeconds = blockedUntil
    ? Math.max(0, Math.ceil((blockedUntil.getTime() - Date.now()) / 1000))
    : 0;

  const isBlocked = blockedUntil !== null && new Date() < blockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      const result = await adminLogin(email.trim(), password);
      if (result.success) {
        onNavigate('admin');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(result.error || 'Credenciais inválidas.');

        // Bloquear por 30s após 5 tentativas falhas
        if (newAttempts >= 5) {
          const until = new Date(Date.now() + 30_000);
          setBlockedUntil(until);
          setError('Muitas tentativas. Aguarde 30 segundos antes de tentar novamente.');
        }
      }
    } catch {
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-luxury-black overflow-hidden relative">

      {/* ── SIDE PANEL (Left — decorative) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-dark to-wine-900/20" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold-600/8 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-wine-600/10 blur-[100px] pointer-events-none animate-pulse-slow" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(197,154,72,0.5) 40px, rgba(197,154,72,0.5) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(197,154,72,0.5) 40px, rgba(197,154,72,0.5) 41px)`
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <button onClick={() => onNavigate('home')} className="inline-block text-left cursor-pointer">
            <span className="font-serif text-4xl tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
            <span className="text-[10px] tracking-[0.4em] font-medium text-theme-muted uppercase block mt-1">
              Painel Administrativo
            </span>
          </button>
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 px-4 py-1.5 rounded-full">
            <Sparkles size={12} className="text-gold-400" />
            <span className="text-[10px] uppercase tracking-widest text-gold-400 font-bold">Área Restrita</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-serif text-4xl text-white leading-tight tracking-wide">
              Gerencie sua<br />
              <span className="text-gradient-gold">loja com controle</span><br />
              total.
            </h1>
            <p className="text-sm text-theme-muted leading-relaxed max-w-xs font-light">
              Acesse o painel completo de gestão de produtos, pedidos, clientes e campanhas da Amour & Co.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 mt-4">
            {[
              'Gestão completa de produtos',
              'Controle de pedidos em tempo real',
              'Relatórios e métricas de vendas',
              'Campanhas sazonais e cupons',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-xs text-theme-muted">
                <div className="h-4 w-4 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <ChevronRight size={9} className="text-gold-400" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10 flex items-center gap-2 text-[10px] text-theme-text">
          <Shield size={12} className="text-gold-500/50" />
          <span>Sessão criptografada · Expiração automática em 8h</span>
        </div>
      </div>

      {/* ── LOGIN PANEL (Right) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative">
        {/* Background */}
        <div className="absolute inset-0 bg-luxury-gray lg:border-l border-theme-border-faint" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <span className="font-serif text-3xl tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
            <span className="text-[10px] tracking-[0.3em] font-medium text-theme-muted uppercase block mt-1">
              Painel Administrativo
            </span>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <Shield size={15} className="text-gold-400" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-theme-muted font-bold">Acesso Administrativo</span>
            </div>
            <h2 className="font-serif text-2xl text-white tracking-wide">Bem-vindo de volta</h2>
            <p className="text-xs text-theme-muted">Entre com suas credenciais de administrador para continuar.</p>
          </div>

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs p-4 rounded-xl"
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block">{error}</span>
                  {isBlocked && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400/70">
                      <Clock size={10} />
                      Desbloqueio em {remainingSeconds}s
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Attempts warning */}
          {attempts >= 3 && !isBlocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/15 px-3 py-2 rounded-lg"
            >
              <AlertCircle size={11} />
              <span>{5 - attempts} tentativa{5 - attempts !== 1 ? 's' : ''} restante{5 - attempts !== 1 ? 's' : ''} antes do bloqueio temporário.</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                E-mail Administrativo
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@amour.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={isBlocked || loading}
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={isBlocked || loading}
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-muted transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || isBlocked}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2.5 font-semibold tracking-widest uppercase py-4 rounded-xl text-xs transition-all duration-300 cursor-pointer mt-2 ${
                isBlocked || loading
                  ? 'bg-white/5 text-theme-muted cursor-not-allowed'
                  : 'bg-gradient-gold hover:shadow-lg hover:shadow-gold-500/20 text-theme-text'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-luxury-black/30 border-t-luxury-black rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : isBlocked ? (
                <>
                  <Clock size={14} />
                  <span>Bloqueado ({remainingSeconds}s)</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Entrar no Painel</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 text-theme-text">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Quick demo access */}
          <div className="space-y-3">
            <p className="text-[10px] text-theme-text text-center uppercase tracking-wider">Acesso rápido de demonstração</p>
            <button
              type="button"
              disabled={loading || isBlocked}
              onClick={() => {
                setEmail('admin@amour.com');
                setPassword('Amour@2024');
              }}
              className="w-full flex items-center justify-center gap-2 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 text-theme-muted hover:text-white py-3 rounded-xl text-[11px] font-semibold tracking-wider uppercase transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Shield size={12} className="text-gold-500/60" />
              <span>Preencher credenciais admin demo</span>
            </button>
          </div>

          {/* Back to store link */}
          <div className="text-center pt-2 border-t border-theme-border-faint">
            <button
              onClick={() => onNavigate('home')}
              className="text-[11px] text-theme-text hover:text-gold-400 transition font-medium cursor-pointer"
            >
              ← Voltar para a loja
            </button>
          </div>

        </motion.div>
      </div>

    </div>
  );
};

export default AdminLogin;
