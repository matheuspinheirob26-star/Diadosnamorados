import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Sparkles, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, loginAsAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Por favor, preencha o campo de e-mail.');
      setLoading(false);
      return;
    }

    try {
      // Simular delay de autenticação luxuosa
      await new Promise(resolve => setTimeout(resolve, 1000));

      const isSuccess = await login(email, isRegistering ? name : undefined);
      
      if (isSuccess) {
        if (email.toLowerCase() === 'admin@amour.com') {
          onNavigate('admin');
        } else {
          onNavigate('home');
        }
      } else {
        setError('Falha ao autenticar. Tente novamente.');
      }
    } catch (err) {
      setError('Ocorreu um erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setLoading(true);
    setTimeout(() => {
      loginAsAdmin();
      setLoading(false);
      onNavigate('admin');
    }, 800);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gold-600/5 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-wine-600/5 blur-[100px] pointer-events-none animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md bg-luxury-gray border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative glow-gold overflow-hidden"
      >
        <div className="text-center space-y-3">
          <div onClick={() => onNavigate('home')} className="cursor-pointer inline-block">
            <span className="font-serif text-3xl tracking-widest font-light text-gradient-gold uppercase block">
              Amour & Co.
            </span>
            <span className="text-[10px] tracking-[0.3em] font-medium text-gray-500 uppercase -mt-1 block">
              Presentes de Luxo
            </span>
          </div>

          <h2 className="text-xs uppercase tracking-widest text-gray-400 font-bold mt-4">
            {isRegistering ? 'Criar sua Conta Premium' : 'Acesse seu Espaço Exclusivo'}
          </h2>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl mt-6 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome Completo</label>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">E-mail</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Senha de Acesso</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>
          </div>

          {/* Action trigger button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-gold hover:shadow-lg text-gray-900 font-semibold tracking-widest uppercase py-3.5 rounded-lg text-xs transition-all duration-300 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            <span>{loading ? 'Acessando...' : isRegistering ? 'Cadastrar' : 'Entrar'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Toggle options */}
        <div className="mt-6 flex justify-between items-center text-[10px] text-gray-500 border-t border-theme-border-faint pt-4">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="hover:text-gold-400 font-bold uppercase transition"
          >
            {isRegistering ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
          
          <button className="hover:text-white transition">
            Esqueceu a senha?
          </button>
        </div>

        {/* Quick Admin bypass button (Test helpers) */}
        <div className="mt-8 pt-6 border-t border-theme-border-faint text-center space-y-3">
          <span className="text-[9px] uppercase tracking-wider text-gray-600 block">Ambiente de Demonstração</span>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={loading}
            className="w-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 border border-rose-500/25 py-2.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield size={12} />
            <span>Acesso Rápido Admin de Testes</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
};
export default Login;
