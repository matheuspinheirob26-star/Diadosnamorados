import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LogService } from '../lib/LogService';
import { supabase } from '../lib/supabase';
import { MFAService } from '../lib/mfa/MFAService';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'support';
  loginAt: string;
}

interface User {
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

export type MfaStep = 'password' | 'enroll' | 'challenge' | 'completed';

interface AuthContextProps {
  user: User | null;
  adminUser: AdminUser | null;
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  login: (email: string, name?: string) => Promise<boolean>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string; requireMfa?: boolean }>;
  logout: () => void;
  adminLogout: (reasonMessage?: string) => void;
  
  // MFA
  mfaStep: MfaStep;
  mfaQrCodeUri: string | null;
  mfaSecret: string | null;
  recoveryCodes: string[];
  enrollMfa: () => Promise<void>;
  verifyMfaEnrollment: (code: string) => Promise<{ success: boolean; error?: string }>;
  challengeMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  useRecoveryCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  
  // Sessions
  activeSessions: any[];
  loadActiveSessions: () => Promise<void>;
  revokeSession: (id: string) => Promise<void>;
  correlationId: string;
  fingerprint: string;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const SESSION_KEY = 'amr_admin_session';

// Helper: Fingerprinting
async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    window.screen.width + 'x' + window.screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform
  ].join('||');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getBrowserName(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("SamsungBrowser")) return "Samsung Browser";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Trident")) return "Internet Explorer";
  if (ua.includes("Edge") || ua.includes("Edg")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Safari")) return "Apple Safari";
  return "Desconhecido";
}

function getOSName(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh") || ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Desconhecido";
}

function getLocalSessionId(): string {
  let id = sessionStorage.getItem('amr_session_uuid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('amr_session_uuid', id);
  }
  return id;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toUpperCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRecoveryCodes(): string[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codes = [];
  for (let i = 0; i < 10; i++) {
    let segment1 = '';
    let segment2 = '';
    for (let j = 0; j < 4; j++) {
      segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
      segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(`${segment1}-${segment2}`);
  }
  return codes;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('amr_auth_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // MFA state
  const [mfaStep, setMfaStep] = useState<MfaStep>('password');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCodeUri, setMfaQrCodeUri] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  
  // Sessions & Security state
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [fingerprint, setFingerprint] = useState<string>('');
  const correlationIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    getDeviceFingerprint().then(setFingerprint);
  }, []);

  // Registry & heartbeat helper for user_sessions
  const registerSessionActivity = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const currentSessionId = getLocalSessionId();
      const fp = fingerprint || await getDeviceFingerprint();
      const browser = getBrowserName(navigator.userAgent);
      const os = getOSName(navigator.userAgent);
      
      let country = 'Brasil';
      let city = 'São Paulo';
      let ip = '127.0.0.1';
      
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const geo = await res.json();
          country = geo.country_name || country;
          city = geo.city || city;
          ip = geo.ip || ip;
        }
      } catch {
        // fallback silently
      }

      // Check active state
      const { data: existing, error: checkError } = await supabase
        .from('user_sessions')
        .select('id, is_active')
        .eq('session_id', currentSessionId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (!existing.is_active) {
          adminLogout("Sessão encerrada remotamente por outro administrador.");
          return;
        }
        
        await supabase
          .from('user_sessions')
          .update({
            last_activity: new Date().toISOString(),
            ip,
            country,
            city
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_sessions').insert([{
          user_id: userId,
          session_id: currentSessionId,
          ip,
          country,
          city,
          user_agent: navigator.userAgent,
          browser,
          os,
          device_fingerprint: fp,
          screen_resolution: window.screen.width + 'x' + window.screen.height,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          is_active: true
        }]);
      }
    } catch (err) {
      console.warn('[SessionActivity] Falha ao sincronizar atividade de sessão:', err);
    }
  }, [fingerprint]);

  const loadActiveSessions = useCallback(async () => {
    if (!supabase || !adminUser) return;
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', adminUser.id)
        .order('last_activity', { ascending: false });
      if (!error && data) {
        setActiveSessions(data);
      }
    } catch (err) {
      console.warn('[Sessions] Erro ao carregar sessões ativas:', err);
    }
  }, [adminUser]);

  const revokeSession = useCallback(async (sessionId: string) => {
    if (!supabase) return;
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('session_id', sessionId);
      await loadActiveSessions();
      
      LogService.log(
        'Sessão Revogada',
        `A sessão ID ${sessionId} foi revogada remotamente.`,
        adminUser?.name || 'Admin',
        adminUser?.email || '',
        'security',
        sessionId,
        'warning'
      );
    } catch (err) {
      console.error('[Sessions] Erro ao revogar sessão:', err);
    }
  }, [adminUser, loadActiveSessions]);

  const adminLogout = useCallback(async (reasonMessage?: string) => {
    if (adminUser) {
      LogService.log(
        'Logout Admin',
        `Admin deslogou: ${adminUser.name}. ${reasonMessage || ''}`,
        adminUser.name,
        adminUser.email,
        'sistema',
        'auth',
        'info'
      );
      
      // Invalida sessão no banco localmente antes de sair
      try {
        if (supabase) {
          await supabase
            .from('user_sessions')
            .update({ is_active: false, revoked_at: new Date().toISOString() })
            .eq('session_id', getLocalSessionId());
        }
      } catch (err) {
        // ignore
      }
    }
    
    setAdminUser(null);
    localStorage.removeItem(SESSION_KEY);
    setMfaStep('password');
    setMfaFactorId(null);
    setMfaQrCodeUri(null);
    setMfaSecret(null);
    setRecoveryCodes([]);
    
    if (supabase) {
      await supabase.auth.signOut();
    }
    
    if (reasonMessage) {
      alert(reasonMessage);
    }
  }, [adminUser]);

  // Handle Admin Session Sync & Heartbeat
  const handleAdminSession = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, status, deleted_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data && ['super_admin', 'admin', 'manager', 'support'].includes(data.role) && data.status === 'ativo' && !data.deleted_at) {
        const adminU: AdminUser = {
          id: userId,
          email,
          name: email.split('@')[0],
          role: data.role as 'super_admin' | 'admin' | 'manager' | 'support',
          loginAt: new Date().toISOString(),
        };
        setAdminUser(adminU);
        localStorage.setItem(SESSION_KEY, JSON.stringify(adminU));
        await registerSessionActivity(userId, email);
      } else {
        await adminLogout(data?.deleted_at ? "Sua conta foi excluída do sistema." : "Papel administrativo inativo.");
      }
    } catch (err) {
      console.warn('[AuthContext] Falha ao recuperar role administrativa:', err);
      setAdminUser(null);
      localStorage.removeItem(SESSION_KEY);
    }
  }, [registerSessionActivity, adminLogout]);

  // Session Heartbeat loop
  useEffect(() => {
    if (!adminUser) return;
    const interval = setInterval(() => {
      registerSessionActivity(adminUser.id, adminUser.email);
    }, 45000); // 45 segundos
    return () => clearInterval(interval);
  }, [adminUser, registerSessionActivity]);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const checkInitialSession = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        // Only recover admin if already completed MFA challenge or not required
        const { data: mfaData } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const needsMfa = ['super_admin', 'admin'].includes(parsed.role);
          if (!needsMfa || mfaData?.currentLevel === 'aal2') {
            await handleAdminSession(session.user.id, session.user.email || '');
          } else {
            // AAL1 but needs AAL2. Set operator details in memory.
            setAdminUser(parsed);
            try {
              const { data: factors } = await client.auth.mfa.listFactors();
              const activeFactor = factors?.totp?.find(f => f.status === 'verified');
              const pendingFactor = factors?.totp?.find(f => (f.status as string) === 'unverified');
              
              if (activeFactor) {
                setMfaFactorId(activeFactor.id);
                setMfaStep('challenge');
              } else {
                if (pendingFactor) {
                  try {
                    await client.auth.mfa.unenroll({ factorId: pendingFactor.id });
                  } catch (unerr) {
                    console.warn('Failed unenroll pending factor:', unerr);
                  }
                }
                setMfaStep('enroll');
                // Auto enroll fresh factor via MFAService
                const enrollData = await MFAService.enroll();
                setMfaFactorId(enrollData.id);
                setMfaQrCodeUri(enrollData.totp.uri);
                setMfaSecret(enrollData.totp.secret);
                const codes = generateRecoveryCodes();
                setRecoveryCodes(codes);
              }
            } catch (err) {
              console.error('[MFA checkInitialSession] Error:', err);
            }
          }
        }
      }
    };
    checkInitialSession();

    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: mfaData } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const needsMfa = ['super_admin', 'admin'].includes(parsed.role);
          if (!needsMfa || mfaData?.currentLevel === 'aal2') {
            await handleAdminSession(session.user.id, session.user.email || '');
          } else {
            setAdminUser(parsed);
            try {
              const { data: factors } = await client.auth.mfa.listFactors();
              const activeFactor = factors?.totp?.find(f => f.status === 'verified');
              if (activeFactor) {
                setMfaFactorId(activeFactor.id);
                setMfaStep('challenge');
              }
            } catch (err) {
              console.error('onAuthStateChange MFA check error:', err);
            }
          }
        }
      } else {
        setAdminUser(null);
        localStorage.removeItem(SESSION_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleAdminSession]);

  const login = async (email: string, name = 'Cliente Premium'): Promise<boolean> => {
    const newUser: User = { email, name, role: 'customer' };
    setUser(newUser);
    localStorage.setItem('amr_auth_user', JSON.stringify(newUser));
    return true;
  };

  // ─── LOGIN DO ADMINISTRADOR (Fluxo de Credenciais + MFA Check) ───────────────
  const adminLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string; requireMfa?: boolean }> => {
    if (!supabase) {
      return { success: false, error: 'Serviço do banco de dados indisponível.' };
    }

    try {
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!session?.user) {
        return { success: false, error: 'Sessão inválida do usuário.' };
      }

      // Buscar papel administrativo
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, status, deleted_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (roleError || !roleData || roleData.deleted_at) {
        await supabase.auth.signOut();
        return { success: false, error: 'Acesso negado: Perfil de operador não localizado ou excluído.' };
      }

      if (roleData.status !== 'ativo') {
        await supabase.auth.signOut();
        return { success: false, error: `Acesso negado: Sua conta está com status "${roleData.status}".` };
      }

      // Definir dados temporários do admin
      const adminU: AdminUser = {
        id: session.user.id,
        email: session.user.email || email,
        name: session.user.user_metadata?.name || (session.user.email?.split('@')[0] || 'Administrador'),
        role: roleData.role as 'super_admin' | 'admin' | 'manager' | 'support',
        loginAt: new Date().toISOString(),
      };

      // Verificar MFA
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const mfaRequired = ['super_admin', 'admin'].includes(adminU.role);

      if (mfaError) {
        await supabase.auth.signOut();
        return { success: false, error: 'Falha ao recuperar parâmetros de segurança MFA.' };
      }

      // Se MFA está ativado/enrolado (AAL2 exigido)
      if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        // Buscar fatores ativos
        const factors = await MFAService.listFactors();
        const activeFactor = factors?.totp?.find(f => f.status === 'verified');
        if (activeFactor) {
          setAdminUser(adminU);
          setMfaFactorId(activeFactor.id);
          setMfaStep('challenge');
          // Salvar temporariamente os dados do operador no localStorage, mas sem autenticação total
          localStorage.setItem(SESSION_KEY, JSON.stringify(adminU));
          return { success: false, requireMfa: true };
        }
      }

      // Se MFA é obrigatório, mas não tem fator configurado
      if (mfaRequired && mfaData.nextLevel === 'aal1') {
        setAdminUser(adminU);
        setMfaStep('enroll');
        localStorage.setItem(SESSION_KEY, JSON.stringify(adminU));
        await enrollMfa();
        return { success: false, requireMfa: true };
      }

      // Conclusão direta se MFA não for requerido para esta role
      setAdminUser(adminU);
      localStorage.setItem(SESSION_KEY, JSON.stringify(adminU));
      await registerSessionActivity(session.user.id, adminU.email);
      setMfaStep('completed');

      LogService.log(
        'Login Admin',
        `Admin autenticado: ${adminU.name} (${adminU.role})`,
        adminU.name,
        adminU.email,
        'sistema',
        'auth',
        'success'
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro inesperado durante a autenticação.' };
    }
  };

  // ─── MFA: INICIAR REGISTRO ──────────────────────────────────────────────────
  const enrollMfa = async () => {
    try {
      const data = await MFAService.enroll();
      setMfaFactorId(data.id);
      setMfaQrCodeUri(data.totp.uri);
      setMfaSecret(data.totp.secret);
      
      // Gerar 10 códigos de recuperação
      const codes = generateRecoveryCodes();
      setRecoveryCodes(codes);
    } catch (err) {
      console.error('[MFA Enroll] Erro ao iniciar enrollment:', err);
    }
  };

  // ─── MFA: CONFIRMAR REGISTRO ────────────────────────────────────────────────
  const verifyMfaEnrollment = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!mfaFactorId || !adminUser) {
      return { success: false, error: 'Instância MFA não localizada.' };
    }

    try {
      // 1. Desafiar e verificar no Supabase
      const challenge = await MFAService.challenge(mfaFactorId);
      await MFAService.verify(mfaFactorId, challenge.id, code);

      // 2. Persistir códigos de recuperação de forma segura no banco de dados (hashes)
      if (supabase) {
        const insertRows = await Promise.all(recoveryCodes.map(async (c) => {
          const hash = await sha256(c);
          return {
            user_id: adminUser.id,
            code_hash: hash
          };
        }));

        const { error: recoveryError } = await supabase.from('mfa_recovery_codes').insert(insertRows);
        if (recoveryError) {
          console.warn('Erro ao salvar códigos de recuperação:', recoveryError);
        }
      }

      // 3. Finalizar autenticação
      setMfaStep('completed');
      const updatedUser = { ...adminUser, loginAt: new Date().toISOString() };
      setAdminUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      await registerSessionActivity(adminUser.id, adminUser.email);

      LogService.log(
        'MFA Ativado',
        `Operador ${adminUser.name} ativou o MFA de forma obrigatória.`,
        adminUser.name,
        adminUser.email,
        'security',
        adminUser.id,
        'success'
      );

      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || '';
      console.error('[MFA Verify] Verification failed:', errMsg);

      const isNotFoundError = errMsg.toLowerCase().includes('not found') || 
                            errMsg.toLowerCase().includes('não localizada') ||
                            errMsg.toLowerCase().includes('invalid');
      
      if (isNotFoundError) {
        // Reset enrollment to auto-heal
        try {
          await MFAService.resetEnrollment(mfaFactorId);
        } catch (unerr) {
          console.warn('Failed unenroll on self-heal:', unerr);
        }
        setMfaFactorId(null);
        setMfaQrCodeUri(null);
        setMfaSecret(null);
        await enrollMfa();
        return { 
          success: false, 
          error: 'Seu registro MFA expirou ou ficou inconsistente. Gere um novo QR Code para continuar.' 
        };
      }

      return { success: false, error: err?.message || 'Falha ao validar token de segurança.' };
    }
  };

  // ─── MFA: DESAFIAR / LOGIN AAL2 ─────────────────────────────────────────────
  const challengeMfa = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!mfaFactorId || !adminUser) {
      return { success: false, error: 'Instância MFA não localizada.' };
    }

    try {
      const challenge = await MFAService.challenge(mfaFactorId);
      await MFAService.verify(mfaFactorId, challenge.id, code);

      // Autenticação completa
      setMfaStep('completed');
      const updatedUser = { ...adminUser, loginAt: new Date().toISOString() };
      setAdminUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      await registerSessionActivity(adminUser.id, adminUser.email);

      LogService.log(
        'MFA Autenticado',
        `Operador ${adminUser.name} efetuou login com sucesso usando AAL2.`,
        adminUser.name,
        adminUser.email,
        'security',
        adminUser.id,
        'success'
      );

      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || '';
      console.error('[MFA Challenge] Verification failed:', errMsg);

      const isNotFoundError = errMsg.toLowerCase().includes('not found') || 
                            errMsg.toLowerCase().includes('não localizada');
      
      if (isNotFoundError) {
        // Self-heal: unenroll factor and send them to enroll page
        try {
          await MFAService.resetEnrollment(mfaFactorId);
        } catch (unerr) {
          console.warn('Failed unenroll on self-heal:', unerr);
        }
        setMfaFactorId(null);
        setMfaQrCodeUri(null);
        setMfaSecret(null);
        setMfaStep('enroll');
        await enrollMfa();
        return { 
          success: false, 
          error: 'Seu registro MFA expirou ou ficou inconsistente. Gere um novo QR Code para continuar.' 
        };
      }

      return { success: false, error: err?.message || 'Falha na verificação de segundo fator.' };
    }
  };

  // ─── MFA: CÓDIGO DE RECUPERAÇÃO / BACKUP ────────────────────────────────────
  const useRecoveryCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !adminUser) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    try {
      const hash = await sha256(code.trim().toUpperCase());

      // Verificar no banco
      const { data: matchedCode, error: queryError } = await supabase
        .from('mfa_recovery_codes')
        .select('*')
        .eq('user_id', adminUser.id)
        .eq('code_hash', hash)
        .is('used_at', null)
        .maybeSingle();

      if (queryError || !matchedCode) {
        return { success: false, error: 'Código de recuperação inválido ou já utilizado.' };
      }

      // Marcar como usado
      await supabase
        .from('mfa_recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', matchedCode.id);

      // Desvincular fator MFA perdido para reautenticação
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factors?.totp || [];
      for (const factor of verifiedFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      // Registrar auditoria
      LogService.log(
        'Código de Recuperação Utilizado',
        `Operador ${adminUser.name} utilizou um código de recuperação e resetou o MFA.`,
        adminUser.name,
        adminUser.email,
        'security',
        adminUser.id,
        'warning'
      );

      // Logar em security_events (WARNING)
      await supabase.from('security_events').insert({
        category: 'SECURITY',
        severity: 'WARNING',
        title: 'MFA Resetado via Código de Recuperação',
        description: `O operador ${adminUser.email} resetou seu MFA usando o código de recuperação #${matchedCode.id}.`,
        user_id: adminUser.id
      });

      // Forçar novo enrollment na próxima tela
      setMfaStep('enroll');
      await enrollMfa();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao validar código de recuperação.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('amr_auth_user');
  };

  const isAdmin = user?.role === 'admin' || adminUser !== null;
  const isAdminAuthenticated = adminUser !== null && mfaStep === 'completed';

  return (
    <AuthContext.Provider value={{
      user,
      adminUser,
      isAdmin,
      isAdminAuthenticated,
      login,
      adminLogin,
      logout,
      adminLogout,
      
      // MFA
      mfaStep,
      mfaQrCodeUri,
      mfaSecret,
      recoveryCodes,
      enrollMfa,
      verifyMfaEnrollment,
      challengeMfa,
      useRecoveryCode,
      
      // Sessions
      activeSessions,
      loadActiveSessions,
      revokeSession,
      correlationId: correlationIdRef.current,
      fingerprint
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
