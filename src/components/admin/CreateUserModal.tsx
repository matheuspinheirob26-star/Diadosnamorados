import React, { useState } from 'react';
import { X, Shield, Key, Mail, User } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'manager' | 'support'>('support');
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        status: isActive ? 'ativo' : 'bloqueado',
        forcePasswordChange
      });
      // Limpar campos
      setName('');
      setEmail('');
      setPassword('');
      setRole('support');
      setForcePasswordChange(true);
      setIsActive(true);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao criar o usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <form 
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-6 animate-scaleUp overflow-y-auto max-h-[90vh]"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-muted hover:text-theme-text p-1 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="border-b border-theme-border-faint pb-3">
          <div className="flex items-center gap-2 text-gold-400 font-bold uppercase tracking-widest text-[9px] mb-1">
            <Shield size={12} />
            <span>Controle de Operadores</span>
          </div>
          <h3 className="font-serif text-xl text-theme-text tracking-wide uppercase">Cadastrar Novo Usuário</h3>
          <p className="text-[10px] text-theme-muted">
            Crie credenciais e defina privilégios de acesso para a equipe interna.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold flex items-center gap-1.5">
              <User size={10} className="text-gold-500/60" />
              <span>Nome Completo *</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Matheus Pinheiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold flex items-center gap-1.5">
              <Mail size={10} className="text-gold-500/60" />
              <span>E-mail Corporativo *</span>
            </label>
            <input
              type="email"
              placeholder="Ex: operador@amour.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
              required
              disabled={loading}
            />
          </div>

          {/* Senha Temporária */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold flex items-center gap-1.5">
              <Key size={10} className="text-gold-500/60" />
              <span>Senha Temporária *</span>
            </label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
              required
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
              Papel / Nível de Permissão
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
              disabled={loading}
            >
              <option value="support">Support (Menor privilégio: Pedidos, Clientes, Leads)</option>
              <option value="manager">Manager (Acesso intermediário: Pedidos, Clientes, Leads, Avaliações)</option>
              <option value="admin">Admin (Geral: sem gatewways, IA, configs ou usuários)</option>
              <option value="super_admin">Super Admin (Acesso irrestrito total)</option>
            </select>
          </div>

          {/* Opções extras (Checkboxes) */}
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 bg-white/2 border border-theme-border-faint p-3 rounded-xl cursor-pointer select-none hover:bg-white/4 transition">
              <input 
                type="checkbox" 
                checked={forcePasswordChange}
                onChange={(e) => setForcePasswordChange(e.target.checked)}
                className="h-4 w-4 text-gold-500 rounded border-theme-border-faint focus:ring-0 cursor-pointer"
                disabled={loading}
              />
              <div>
                <span className="block text-xs font-bold text-theme-text">Forçar troca de senha no primeiro login</span>
                <span className="block text-[9px] text-theme-muted mt-0.5">Exige que o usuário defina uma nova senha pessoal ao se conectar pela primeira vez.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 bg-white/2 border border-theme-border-faint p-3 rounded-xl cursor-pointer select-none hover:bg-white/4 transition">
              <input 
                type="checkbox" 
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-gold-500 rounded border-theme-border-faint focus:ring-0 cursor-pointer"
                disabled={loading}
              />
              <div>
                <span className="block text-xs font-bold text-theme-text">Usuário ativo</span>
                <span className="block text-[9px] text-theme-muted mt-0.5">Define se a conta de operador estará ativa para login imediatamente.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-theme-muted hover:text-theme-text transition cursor-pointer"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-6 py-2.5 rounded-xl hover:shadow-lg hover:brightness-110 transition cursor-pointer flex items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
          </button>
        </div>
      </form>
    </div>
  );
};
