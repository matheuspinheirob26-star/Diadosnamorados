import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield, Mail, Lock, Eye, EyeOff, AlertCircle,
  Sparkles, LogIn, ChevronRight, Clock, KeyRound, AlertTriangle
} from 'lucide-react';

interface AdminLoginProps {
  onNavigate: (page: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const { 
    adminLogin, 
    isAdminAuthenticated, 
    adminUser,
    mfaStep,
    mfaQrCodeUri,
    recoveryCodes,
    verifyMfaEnrollment,
    challengeMfa,
    useRecoveryCode,
    adminLogout
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // MFA Inputs
  const [mfaToken, setMfaToken] = useState('');
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('');
  const [showRecoveryMode, setShowRecoveryMode] = useState(false);

  // Se já está autenticado, redirecionar direto para o admin
  useEffect(() => {
    if (isAdminAuthenticated) {
      onNavigate('admin');
    }
  }, [isAdminAuthenticated, onNavigate]);

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
      } else if (result.requireMfa) {
        // AuthContext ajustou o mfaStep para enroll ou challenge
        setError('');
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

  const handleMfaVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!mfaToken.trim()) {
      setError('Insira o código MFA para continuar.');
      setLoading(false);
      return;
    }

    try {
      let result;
      if (mfaStep === 'enroll') {
        result = await verifyMfaEnrollment(mfaToken);
      } else {
        result = await challengeMfa(mfaToken);
      }

      if (result.success) {
        onNavigate('admin');
      } else {
        setError(result.error || 'Token inválido.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao verificar segundo fator.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!recoveryCodeInput.trim()) {
      setError('Insira o código de recuperação.');
      setLoading(false);
      return;
    }

    try {
      const result = await useRecoveryCode(recoveryCodeInput);
      if (result.success) {
        // Redireciona para enroll (feito no AuthContext)
        setError('');
        setRecoveryCodeInput('');
        setShowRecoveryMode(false);
      } else {
        setError(result.error || 'Código de recuperação inválido ou já utilizado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao validar código de recuperação.');
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
            <p className="text-base text-theme-muted leading-relaxed max-w-xs font-light">
              Acesse o painel completo de gestão de produtos, pedidos, clientes e campanhas da Amour & Co.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3 mt-4">
            {[
              'Autenticação Multifator (MFA) Obrigatória',
              'Controle de Acesso de Contingência',
              'Sistema de Governança e Aprovação Dupla',
              'Auditoria Completa em Tempo Real',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-theme-muted">
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
        <div className="absolute inset-0 bg-luxury-gray lg:border-l border-theme-border-faint" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm space-y-6"
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

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={error}
                data-testid="login-error"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm p-4 rounded-xl"
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
          {attempts >= 3 && !isBlocked && mfaStep === 'password' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/15 px-3 py-2 rounded-lg"
            >
              <AlertCircle size={11} />
              <span>{5 - attempts} tentativa{5 - attempts !== 1 ? 's' : ''} restante{5 - attempts !== 1 ? 's' : ''} antes do bloqueio temporário.</span>
            </motion.div>
          )}

          {/* Form Router based on mfaStep */}
          
          {/* FASE 1: Credenciais normais */}
          {mfaStep === 'password' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                    <Shield size={15} className="text-gold-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-theme-muted font-bold">Acesso Administrativo</span>
                </div>
                <h2 className="font-serif text-2xl text-white tracking-wide">Bem-vindo de volta</h2>
                <p className="text-sm text-theme-muted">Entre com suas credenciais de administrador para continuar.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="admin-email" className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                    E-mail Administrativo
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                    <input
                      id="admin-email"
                      data-testid="admin-login-email"
                      type="email"
                      placeholder="admin@amour.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      disabled={isBlocked || loading}
                      autoComplete="email"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-base text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-password" className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                    <input
                      id="admin-password"
                      data-testid="admin-login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      disabled={isBlocked || loading}
                      autoComplete="current-password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3.5 text-base text-white placeholder-gray-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

                <button
                  type="submit"
                  data-testid="admin-submit"
                  disabled={loading || isBlocked}
                  className={`w-full flex items-center justify-center gap-2.5 font-semibold tracking-widest uppercase py-4 rounded-xl text-sm transition-all duration-300 cursor-pointer mt-2 ${
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
                  ) : (
                    <>
                      <LogIn size={14} />
                      <span>Entrar no Painel</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* FASE 2: Cadastro local do MFA (Enrollment) */}
          {mfaStep === 'enroll' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                    <KeyRound size={15} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-theme-muted font-bold">MFA Obrigatório</span>
                </div>
                <h2 className="font-serif text-xl text-white tracking-wide">Configurar Segundo Fator (TOTP)</h2>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Para garantir a governança enterprise da Amour & Co., escaneie o código abaixo no seu app autenticador (Google Authenticator, Microsoft Authenticator, 1Password, etc.).
                </p>
              </div>

              {/* QR Code local sem APIs externas */}
              <div className="flex justify-center p-4 bg-white/5 border border-white/10 rounded-2xl glow-gold select-none">
                {mfaQrCodeUri ? (
                  <QRCodeSVG
                    value={mfaQrCodeUri}
                    size={180}
                    bgColor="#121212"
                    fgColor="#c59a48"
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-xs text-theme-muted">
                    Gerando QR Code local...
                  </div>
                )}
              </div>

              {/* Recovery Codes Section */}
              {recoveryCodes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    <AlertTriangle size={11} />
                    <span>Códigos de Recuperação Únicos</span>
                  </div>
                  <p className="text-[9px] text-theme-muted leading-relaxed">
                    Guarde-os com segurança. Cada código pode ser utilizado uma única vez caso perca o acesso ao dispositivo autenticador.
                  </p>
                  <div className="grid grid-cols-2 gap-2 bg-white/2 border border-theme-border-faint p-3 rounded-xl font-mono text-[10px] text-center text-gold-400 select-all max-h-36 overflow-y-auto">
                    {recoveryCodes.map((code) => (
                      <div key={code} className="hover:bg-white/5 p-1 rounded transition">{code}</div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleMfaVerifySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                    Inserir Token do Autenticador
                  </label>
                  <input
                    type="text"
                    data-testid="mfa-token-input"
                    placeholder="000 000"
                    maxLength={6}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    className="w-full text-center bg-white/5 border border-white/10 rounded-xl py-3.5 text-lg font-mono text-white tracking-[0.3em] focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="mfa-submit"
                  disabled={loading || mfaToken.length < 6}
                  className="w-full bg-gradient-gold text-theme-text font-semibold tracking-widest uppercase py-3.5 rounded-xl text-xs hover:shadow-lg transition disabled:opacity-40 cursor-pointer"
                >
                  {loading ? 'Validando...' : 'Ativar e Entrar'}
                </button>
              </form>
            </div>
          )}

          {/* FASE 3: Desafio MFA (Challenge) */}
          {mfaStep === 'challenge' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                    <KeyRound size={15} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-theme-muted font-bold">Verificação de Segurança</span>
                </div>
                <h2 className="font-serif text-xl text-white tracking-wide">Digite o Código Autenticador</h2>
                <p className="text-xs text-theme-muted leading-relaxed">
                  Esta conta requer autenticação de segundo fator (MFA). Digite o código de 6 dígitos gerado pelo seu app autenticador.
                </p>
              </div>

              {!showRecoveryMode ? (
                <form onSubmit={handleMfaVerifySubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                      Código Autenticador (MFA)
                    </label>
                    <input
                      type="text"
                      placeholder="000 000"
                      maxLength={6}
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      className="w-full text-center bg-white/5 border border-white/10 rounded-xl py-3.5 text-lg font-mono text-white tracking-[0.3em] focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || mfaToken.length < 6}
                    className="w-full bg-gradient-gold text-theme-text font-semibold tracking-widest uppercase py-3.5 rounded-xl text-xs hover:shadow-lg transition disabled:opacity-40 cursor-pointer"
                  >
                    {loading ? 'Verificando...' : 'Verificar e Acessar'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowRecoveryMode(true); setError(''); }}
                      className="text-[10px] text-gold-400 hover:text-white transition font-medium cursor-pointer"
                    >
                      Perdeu seu dispositivo? Usar Código de Recuperação
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                      <AlertTriangle size={11} />
                      <span>Código de Recuperação (Backup)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="XXXX-XXXX"
                      maxLength={9}
                      value={recoveryCodeInput}
                      onChange={(e) => setRecoveryCodeInput(e.target.value.toUpperCase())}
                      disabled={loading}
                      className="w-full text-center bg-white/5 border border-white/10 rounded-xl py-3.5 text-base font-mono text-white tracking-[0.1em] focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || recoveryCodeInput.length < 9}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold tracking-widest uppercase py-3.5 rounded-xl text-xs hover:shadow-lg transition disabled:opacity-40 cursor-pointer"
                  >
                    {loading ? 'Validando...' : 'Redefinir MFA'}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowRecoveryMode(false); setError(''); }}
                      className="text-[10px] text-theme-muted hover:text-white transition font-medium cursor-pointer"
                    >
                      ← Voltar para Token MFA
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Links e Botões de Apoio */}
          <div className="text-center pt-4 border-t border-theme-border-faint flex flex-col gap-2">
            {mfaStep === 'password' ? (
              <>
                <button
                  onClick={() => onNavigate('home')}
                  className="text-[11px] text-theme-text hover:text-gold-400 transition font-medium cursor-pointer"
                >
                  ← Voltar para a loja
                </button>
                <button
                  onClick={() => onNavigate('admin-emergency')}
                  className="text-[10px] text-rose-400/70 hover:text-rose-400 transition font-medium cursor-pointer mt-1"
                >
                  ⚠️ Acesso de Contingência (Break-Glass)
                </button>
              </>
            ) : (
              <button
                onClick={() => adminLogout()}
                className="text-[11px] text-rose-400 hover:underline transition font-medium cursor-pointer"
              >
                Cancelar Autenticação / Sair
              </button>
            )}
          </div>

        </motion.div>
      </div>

    </div>
  );
};

export default AdminLogin;
