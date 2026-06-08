import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminUser {
  email: string;
  name: string;
  role: 'admin';
  loginAt: string;
}

interface User {
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

interface AuthContextProps {
  user: User | null;
  adminUser: AdminUser | null;
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  login: (email: string, name?: string) => Promise<boolean>;
  loginAsAdmin: () => void;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Credenciais admin (em produção, isso viria do Supabase/backend)
const ADMIN_CREDENTIALS = [
  { email: 'admin@amour.com', password: 'Amour@2024', name: 'Administrador Principal' },
  { email: 'gerente@amour.com', password: 'Gerente@2024', name: 'Gerente de Loja' },
];

const SESSION_KEY = 'amr_admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('amr_auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session: AdminUser & { expiresAt: string } = JSON.parse(stored);
      // Verificar expiração da sessão
      if (new Date(session.expiresAt) < new Date()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  });

  // Auto-logout do admin quando a sessão expirar
  useEffect(() => {
    if (!adminUser) return;
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    const session = JSON.parse(stored);
    const expiresAt = new Date(session.expiresAt).getTime();
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      adminLogout();
      return;
    }
    const timer = setTimeout(() => {
      adminLogout();
    }, remaining);
    return () => clearTimeout(timer);
  }, [adminUser]);

  const login = async (email: string, name = 'Cliente Premium'): Promise<boolean> => {
    const newUser: User = { email, name, role: 'customer' };
    setUser(newUser);
    localStorage.setItem('amr_auth_user', JSON.stringify(newUser));
    return true;
  };

  const loginAsAdmin = () => {
    const adminU: AdminUser = {
      email: 'admin@amour.com',
      name: 'Administrador Principal',
      role: 'admin',
      loginAt: new Date().toISOString(),
    };
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    setAdminUser(adminU);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...adminU, expiresAt }));
  };

  const adminLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simular delay de autenticação
    await new Promise(resolve => setTimeout(resolve, 900));

    const cred = ADMIN_CREDENTIALS.find(
      c => c.email.toLowerCase() === email.toLowerCase() && c.password === password
    );

    if (!cred) {
      return { success: false, error: 'E-mail ou senha incorretos. Verifique suas credenciais.' };
    }

    const adminU: AdminUser = {
      email: cred.email,
      name: cred.name,
      role: 'admin',
      loginAt: new Date().toISOString(),
    };
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    setAdminUser(adminU);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...adminU, expiresAt }));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('amr_auth_user');
  };

  const adminLogout = useCallback(() => {
    setAdminUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isAdminAuthenticated = adminUser !== null;

  return (
    <AuthContext.Provider value={{
      user,
      adminUser,
      isAdmin,
      isAdminAuthenticated,
      login,
      loginAsAdmin,
      adminLogin,
      logout,
      adminLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado sob um AuthProvider');
  }
  return context;
};
