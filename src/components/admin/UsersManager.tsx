import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Shield, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Check, 
  X, 
  Users, 
  Lock, 
  ShieldAlert, 
  UserMinus, 
  UserCheck, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { CreateUserModal } from './CreateUserModal';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'support';
  status: 'ativo' | 'suspenso' | 'bloqueado';
  lastSignIn: string | null;
  createdAt: string;
}

export const UsersManager: React.FC = () => {
  const { adminUser, fingerprint, correlationId } = useAuth();
  const isSuperAdmin = adminUser?.role === 'super_admin';
  const isAuthorized = adminUser?.role === 'super_admin' || adminUser?.role === 'admin';

  // State
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  
  // Selected user for edit/delete/block
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<ManagedUser['role']>('support');
  const [editStatus, setEditStatus] = useState<ManagedUser['status']>('ativo');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');

  const fetchUsers = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setUsers(data?.users || []);
    } catch (err: any) {
      console.error('[UsersManager] Erro ao carregar usuários:', err);
      setError(err?.message || 'Falha ao buscar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="bg-luxury-gray border border-theme-border p-8 rounded-3xl text-center space-y-4 max-w-lg mx-auto">
        <ShieldAlert size={48} className="text-rose-400 mx-auto" />
        <h3 className="font-serif text-xl text-theme-text uppercase tracking-wider">Acesso Negado</h3>
        <p className="text-sm text-theme-muted">
          Você não possui privilégios de acesso suficientes para gerenciar operadores ou visualizar permissões.
        </p>
      </div>
    );
  }

  // --- Handlers ---

  const handleCreateUserSubmit = async (userData: any) => {
    if (!supabase) return;
    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', userData }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      await fetchUsers();
    } catch (err: any) {
      throw new Error(err?.message || 'Erro ao criar novo usuário.');
    }
  };

  const handleEditOpen = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditStatus(user.status);
    setConfirmPassword('');
    setModalError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !supabase) return;
    setModalLoading(true);
    setModalError(null);

    const isRoleOrStatusChanged = editRole !== selectedUser.role || editStatus !== selectedUser.status;

    try {
      if (editName.trim() !== selectedUser.name) {
        const { data: updateData, error: updateError } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'update',
            userData: {
              id: selectedUser.id,
              name: editName.trim()
            }
          }
        });
        if (updateError) throw updateError;
        if (updateData?.error) throw new Error(updateData.error);
      }

      if (isRoleOrStatusChanged) {
        if (!confirmPassword.trim()) {
          throw new Error('Por favor, digite sua senha administrativa para reautenticar.');
        }

        const roleRank = { support: 1, manager: 2, admin: 3, super_admin: 4 };
        let targetType = 'user_roles_permissions';
        if (editRole !== selectedUser.role) {
          targetType = roleRank[editRole] > roleRank[selectedUser.role] ? 'user_roles_promote' : 'user_roles_demote';
        }

        const { data: approvalData, error: approvalError } = await supabase.functions.invoke('manage-approvals', {
          body: {
            action: 'request',
            targetType,
            targetId: selectedUser.id,
            payload: {
              role: editRole,
              status: editStatus
            },
            currentPassword: confirmPassword.trim(),
            fingerprint
          },
          headers: {
            'correlation-id': correlationId
          }
        });

        if (approvalError) throw approvalError;
        if (approvalData?.error) throw new Error(approvalData.error);

        alert("Solicitação de alteração cadastral enviada com sucesso! Um Super Admin diferente precisará homologar esta ação.");
      }

      setShowEditModal(false);
      setSelectedUser(null);
      setConfirmPassword('');
      await fetchUsers();
    } catch (err: any) {
      setModalError(err?.message || 'Erro ao salvar alterações do usuário.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteOpen = (user: ManagedUser) => {
    setSelectedUser(user);
    setConfirmPassword('');
    setDeletionReason('');
    setModalError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser || !supabase) return;
    if (!deletionReason.trim() || deletionReason.trim().length < 4) {
      setModalError('A justificativa de exclusão deve conter pelo menos 4 caracteres.');
      return;
    }
    if (!confirmPassword.trim()) {
      setModalError('Por favor, digite sua senha para confirmar.');
      return;
    }
    setModalLoading(true);
    setModalError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'request',
          targetType: 'user_delete',
          targetId: selectedUser.id,
          payload: {
            reason: deletionReason.trim()
          },
          currentPassword: confirmPassword.trim(),
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      alert("Solicitação de exclusão (soft delete) enviada com sucesso! Um Super Admin diferente precisará homologar esta ação.");
      setShowDeleteModal(false);
      setSelectedUser(null);
      setConfirmPassword('');
      setDeletionReason('');
      await fetchUsers();
    } catch (err: any) {
      setModalError(err?.message || 'Erro ao solicitar exclusão do usuário.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleBlockToggleOpen = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditStatus(user.status === 'bloqueado' ? 'ativo' : 'bloqueado');
    setConfirmPassword('');
    setModalError(null);
    setShowBlockModal(true);
  };

  const handleBlockToggleConfirm = async () => {
    if (!selectedUser || !supabase) return;
    if (!confirmPassword.trim()) {
      setModalError('Por favor, digite sua senha para confirmar.');
      return;
    }
    setModalLoading(true);
    setModalError(null);

    const targetStatus = selectedUser.status === 'bloqueado' ? 'ativo' : 'bloqueado';

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'request',
          targetType: 'user_roles_permissions',
          targetId: selectedUser.id,
          payload: {
            role: selectedUser.role,
            status: targetStatus
          },
          currentPassword: confirmPassword.trim(),
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      alert(`Solicitação de ${targetStatus === 'bloqueado' ? 'bloqueio' : 'desbloqueio'} enviada com sucesso!`);
      setShowBlockModal(false);
      setSelectedUser(null);
      setConfirmPassword('');
      await fetchUsers();
    } catch (err: any) {
      setModalError(err?.message || 'Erro ao solicitar alteração de status.');
    } finally {
      setModalLoading(false);
    }
  };

  // --- Helpers ---

  // Filtros
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'todos' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'todos' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Métricas do Dashboard
  const activeCount = users.filter(u => u.status === 'ativo').length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const managerCount = users.filter(u => u.role === 'manager').length;
  const supportCount = users.filter(u => u.role === 'support').length;
  const blockedCount = users.filter(u => u.status === 'bloqueado').length;
  
  const todayLogins = users.filter(u => {
    if (!u.lastSignIn) return false;
    const signInDate = new Date(u.lastSignIn).toDateString();
    const todayDate = new Date().toDateString();
    return signInDate === todayDate;
  }).length;

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-theme-border-faint pb-6">
        <div>
          <span className="text-gold-400 font-bold uppercase tracking-widest text-[9px] block mb-1">
            Segurança Operacional
          </span>
          <h2 className="font-serif text-2xl text-theme-text tracking-wide uppercase">
            Usuários & Permissões
          </h2>
          <p className="text-[10px] text-theme-muted uppercase tracking-wider mt-0.5">
            Gestão de credenciais, controle granular de papéis e auditoria de equipe interna.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-gold text-theme-text font-semibold text-sm tracking-widest uppercase px-5 py-2.5 rounded-xl hover:shadow-lg hover:brightness-110 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus size={14} /> Novo Usuário
          </button>
        )}
      </div>

      {/* METRICS DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* Ativos */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <UserCheck size={20} className="text-emerald-500 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Usuários Ativos</span>
          <h3 className="text-xl font-bold text-theme-text block">{activeCount}</h3>
        </div>

        {/* Admins */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <Shield size={20} className="text-gold-500 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Admins</span>
          <h3 className="text-xl font-bold text-gold-400 block">{adminCount}</h3>
        </div>

        {/* Managers */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <Users size={20} className="text-indigo-400 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Gerentes</span>
          <h3 className="text-xl font-bold text-indigo-400 block">{managerCount}</h3>
        </div>

        {/* Supports */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <Users size={20} className="text-teal-400 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Suportes</span>
          <h3 className="text-xl font-bold text-teal-400 block">{supportCount}</h3>
        </div>

        {/* Logins Hoje */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <RefreshCw size={20} className="text-amber-500 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Logins Hoje</span>
          <h3 className="text-xl font-bold text-theme-text block">{todayLogins}</h3>
        </div>

        {/* Bloqueados */}
        <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl relative overflow-hidden space-y-1">
          <Lock size={20} className="text-rose-500 absolute top-4 right-4 opacity-30" />
          <span className="text-[9px] uppercase tracking-wider text-theme-muted font-bold block">Bloqueados</span>
          <h3 className="text-xl font-bold text-rose-400 block">{blockedCount}</h3>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-luxury-gray border border-theme-border-faint p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="text-theme-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-theme-border-faint border border-theme-border rounded-xl pl-10 pr-4 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition placeholder-theme-muted"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-theme-muted">Papel:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-theme-border-faint border border-theme-border text-xs text-theme-text px-3 py-1.5 rounded-lg focus:outline-none focus:border-gold-500 transition cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="support">Support</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-theme-muted">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-theme-border-faint border border-theme-border text-xs text-theme-text px-3 py-1.5 rounded-lg focus:outline-none focus:border-gold-500 transition cursor-pointer"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-theme-border-faint hover:bg-white/5 border border-theme-border rounded-lg text-theme-muted hover:text-white transition cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      </div>

      {/* USERS TABLE */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <RefreshCw className="animate-spin text-gold-500" size={24} />
            <span className="text-xs text-theme-muted">Carregando operadores internos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <AlertTriangle className="text-rose-400" size={32} />
            <span className="text-xs text-rose-400">{error}</span>
            <button
              onClick={fetchUsers}
              className="mt-2 bg-white/5 border border-theme-border hover:bg-white/10 text-xs text-theme-text font-bold px-4 py-2 rounded-lg transition"
            >
              Tentar Novamente
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-theme-muted space-y-1">
            <Users size={32} className="mx-auto text-theme-border opacity-40 mb-2" />
            <p className="text-sm">Nenhum operador localizado.</p>
            <p className="text-[10px] text-theme-muted uppercase tracking-wider">Tente reajustar seus filtros ou busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/1 select-none">
                  <th className="p-4 pl-6">Nome</th>
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Papel (Role)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Último Login</th>
                  <th className="p-4">Criação</th>
                  <th className="p-4 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/2 transition duration-200">
                    
                    {/* Nome (com iniciais avatar) */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-luxury-black font-bold text-xs select-none">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-theme-text block">{user.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 font-mono text-xs">{user.email}</td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase select-none tracking-widest ${
                        user.role === 'super_admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        user.role === 'admin' ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' :
                        user.role === 'manager' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>
                        {user.role === 'super_admin' ? 'Super Admin' :
                         user.role === 'admin' ? 'Admin' :
                         user.role === 'manager' ? 'Manager' : 'Support'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase select-none ${
                        user.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        user.status === 'suspenso' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {user.status === 'ativo' ? 'Ativo' :
                         user.status === 'suspenso' ? 'Suspenso' : 'Bloqueado'}
                      </span>
                    </td>

                    {/* Último Login */}
                    <td className="p-4 text-xs font-mono">
                      {user.lastSignIn ? new Date(user.lastSignIn).toLocaleString('pt-BR') : 'Nunca'}
                    </td>

                    {/* Criação */}
                    <td className="p-4 text-xs text-theme-muted font-mono">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="p-4 pr-6 text-right">
                      {isSuperAdmin ? (
                        <div className="flex justify-end gap-1.5">
                          {/* Block/Unblock toggle */}
                          <button
                            onClick={() => handleBlockToggleOpen(user)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              user.status === 'bloqueado' 
                                ? 'bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400' 
                                : 'bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/20 text-rose-400'
                            }`}
                            title={user.status === 'bloqueado' ? 'Desbloquear Operador' : 'Bloquear Operador'}
                            disabled={user.id === adminUser?.id}
                          >
                            {user.status === 'bloqueado' ? <UserCheck size={13} /> : <UserMinus size={13} />}
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => handleEditOpen(user)}
                            className="p-1.5 bg-white/5 border border-theme-border hover:bg-white/10 text-theme-muted hover:text-white rounded-lg transition cursor-pointer"
                            title="Editar Usuário"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteOpen(user)}
                            className="p-1.5 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/25 text-rose-400 rounded-lg transition cursor-pointer"
                            title="Excluir Usuário"
                            disabled={user.id === adminUser?.id}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-theme-muted italic select-none">
                          Somente Super Admin
                        </span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUserSubmit}
      />

      {/* EDIT MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => { if (!modalLoading) setShowEditModal(false); }} />
          
          <form 
            onSubmit={handleEditSubmit}
            className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-5"
          >
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-theme-muted hover:text-theme-text p-1 cursor-pointer"
              disabled={modalLoading}
            >
              <X size={18} />
            </button>

            <div className="border-b border-theme-border-faint pb-2">
              <h3 className="font-serif text-lg text-theme-text tracking-wide uppercase">Editar Operador</h3>
              <p className="text-[9px] text-theme-muted font-mono mt-0.5">ID: {selectedUser.id}</p>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-4 text-sm">
              {/* E-mail (read-only) */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">E-mail (Não alterável)</label>
                <input
                  type="text"
                  value={selectedUser.email}
                  className="w-full bg-white/2 border border-theme-border-faint rounded-lg px-3 py-2 text-sm text-theme-muted cursor-not-allowed select-all"
                  disabled
                />
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition"
                  required
                  disabled={modalLoading}
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Papel (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                  disabled={modalLoading || selectedUser.id === adminUser?.id}
                >
                  <option value="support">Support</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                {selectedUser.id === adminUser?.id && (
                  <span className="text-[9px] text-theme-muted italic">Você não pode rebaixar seu próprio papel.</span>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Status da Conta</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                  disabled={modalLoading || selectedUser.id === adminUser?.id}
                >
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
                {selectedUser.id === adminUser?.id && (
                  <span className="text-[9px] text-theme-muted italic">Você não pode bloquear a si mesmo.</span>
                )}
              </div>

              {/* Confirm Password (only if role or status is changed) */}
              {(editRole !== selectedUser.role || editStatus !== selectedUser.status) && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block flex items-center gap-1">
                    <Lock size={10} /> Confirmar com sua Senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-rose-500/30 rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-rose-500 transition font-mono"
                    required
                    disabled={modalLoading}
                  />
                  <p className="text-[9px] text-theme-muted">
                    Alterações de papel ou status exigem reautenticação e aprovação dupla.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-theme-muted hover:text-theme-text transition"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-gradient-gold text-theme-text font-semibold text-xs tracking-widest uppercase px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
                disabled={modalLoading}
              >
                {modalLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BLOCK TOGGLE CONFIRMATION MODAL */}
      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => { if (!modalLoading) setShowBlockModal(false); }} />
          
          <div className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-5">
            <div className="flex items-center gap-3 text-rose-400 border-b border-theme-border-faint pb-3">
              <Lock size={20} />
              <h3 className="font-serif text-lg text-theme-text tracking-wide uppercase">
                {selectedUser.status === 'bloqueado' ? 'Desbloquear Operador?' : 'Bloquear Operador?'}
              </h3>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-2 rounded-xl">
                {modalError}
              </div>
            )}

            <p className="text-sm text-theme-muted leading-relaxed">
              {selectedUser.status === 'bloqueado' ? (
                <>Tem certeza de que deseja reativar o acesso de <strong>{selectedUser.name}</strong> ({selectedUser.email}) ao sistema administrativo?</>
              ) : (
                <>
                  Confirmar o bloqueio de <strong>{selectedUser.name}</strong> ({selectedUser.email})? 
                  <span className="block mt-2 font-medium text-rose-400">
                    O usuário terá suas sessões encerradas imediatamente e não poderá logar até ser reativado.
                  </span>
                </>
              )}
            </p>

            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block flex items-center gap-1">
                <Lock size={10} /> Confirme com sua Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-rose-500/30 rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-rose-500 transition font-mono"
                required
                disabled={modalLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-theme-muted hover:text-theme-text transition"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleBlockToggleConfirm}
                className={`text-theme-text font-semibold text-xs tracking-widest uppercase px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer ${
                  selectedUser.status === 'bloqueado' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                }`}
                disabled={modalLoading}
              >
                {modalLoading ? 'Processando...' : selectedUser.status === 'bloqueado' ? 'Reativar Acesso' : 'Bloquear Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (DUPLA CONFIRMACAO - REQUISITO 9) */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => { if (!modalLoading) setShowDeleteModal(false); }} />
          
          <div className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-5 border-rose-500/30">
            <div className="flex items-center gap-3 text-rose-500 border-b border-theme-border-faint pb-3">
              <AlertTriangle size={24} className="animate-pulse" />
              <h3 className="font-serif text-lg text-theme-text tracking-wide uppercase">
                Aviso Crítico de Exclusão
              </h3>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-2 rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold text-rose-400">
                ATENÇÃO: A exclusão removerá o acesso deste usuário ao sistema.
              </p>
              <p className="text-xs text-theme-muted leading-relaxed">
                Você está prestes a apagar permanentemente a conta de operador de <strong>{selectedUser.name}</strong> ({selectedUser.email}).
                Esta ação é irreversível e excluirá o registro de autenticação do usuário. Recomenda-se suspender ou bloquear o usuário em vez de excluí-lo.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                  Motivo da Exclusão (Mínimo 4 caracteres)
                </label>
                <textarea
                  placeholder="Justificativa para auditoria de conformidade..."
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-rose-500 transition resize-none"
                  rows={2}
                  required
                  disabled={modalLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-rose-400 font-bold block flex items-center gap-1">
                  <Lock size={10} /> Confirme com sua Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-rose-500/30 rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-rose-500 transition font-mono"
                  required
                  disabled={modalLoading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-theme-muted hover:text-theme-text transition"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs tracking-widest uppercase px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
                disabled={modalLoading}
              >
                {modalLoading ? 'Excluindo...' : 'EXCLUIR DEFINITIVAMENTE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
