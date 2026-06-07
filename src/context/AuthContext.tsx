import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

interface AuthContextProps {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, name?: string) => Promise<boolean>;
  loginAsAdmin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('amr_auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (email: string, name = 'Cliente Premium'): Promise<boolean> => {
    // Se for email de admin padrão, entra como admin
    const isAdminEmail = email.toLowerCase() === 'admin@amour.com';
    const newUser: User = {
      email,
      name: isAdminEmail ? 'Administrador Amour' : name,
      role: isAdminEmail ? 'admin' : 'customer'
    };
    setUser(newUser);
    localStorage.setItem('amr_auth_user', JSON.stringify(newUser));
    return true;
  };

  const loginAsAdmin = () => {
    const adminUser: User = {
      email: 'admin@amour.com',
      name: 'Administrador Amour',
      role: 'admin'
    };
    setUser(adminUser);
    localStorage.setItem('amr_auth_user', JSON.stringify(adminUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('amr_auth_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, loginAsAdmin, logout }}>
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
