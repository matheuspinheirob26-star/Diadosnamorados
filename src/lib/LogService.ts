import { supabase } from './supabase';
import { SystemLog, LogSeverity } from '../types/log';

const LOCAL_STORAGE_KEY = 'amr_system_logs';

export class LogService {
  /**
   * Registra um novo log no sistema.
   * Salva no Supabase (tabela audit_logs) com fallback local.
   */
  static async log(
    action: string,
    description: string,
    user: string = 'Admin',
    userEmail: string = 'admin@amour.co',
    entityType: string = 'sistema',
    entityId: string = '',
    severity: LogSeverity = 'info',
    oldData?: any,
    newData?: any
  ): Promise<SystemLog> {
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      description,
      user,
      userEmail,
      entityType,
      entityId,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      oldData,
      newData
    };

    if (supabase) {
      try {
        // Obter id de usuário ativo se houver
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        const { error } = await supabase
          .from('audit_logs')
          .insert([{
            action: newLog.action,
            description: newLog.description,
            user_id: userId,
            user_email: newLog.userEmail,
            entity_type: newLog.entityType,
            entity_id: newLog.entityId,
            severity: newLog.severity,
            old_data: newLog.oldData || null,
            new_data: newLog.newData || null,
            ip_address: '', // Preenchido no servidor se aplicável
            created_at: newLog.timestamp
          }]);

        if (error) {
          console.warn('Erro ao salvar no audit_logs. Usando localStorage:', error);
          this.saveToLocalStorage(newLog);
        }
      } catch (err) {
        console.warn('Falha no Supabase ao salvar log:', err);
        this.saveToLocalStorage(newLog);
      }
    } else {
      this.saveToLocalStorage(newLog);
    }

    return newLog;
  }

  /**
   * Obtém os logs ordenados do mais recente para o mais antigo.
   */
  static async getLogs(limit: number = 100): Promise<SystemLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            action: r.action,
            description: r.description || `${r.action} em ${r.entity_type}`,
            user: r.user_email?.split('@')[0] || 'Sistema',
            userEmail: r.user_email || '',
            entityType: r.entity_type || '',
            entityId: r.entity_id || '',
            severity: (r.severity as LogSeverity) || 'info',
            timestamp: r.created_at,
            ip: r.ip_address || '',
            oldData: r.old_data,
            newData: r.new_data
          })) as SystemLog[];
        } else if (error) {
          console.warn('Erro na consulta de audit_logs:', error);
        }
      } catch (err) {
        console.warn('Falha ao buscar logs de auditoria no Supabase:', err);
      }
    }

    return this.getFromLocalStorage().slice(0, limit);
  }

  private static saveToLocalStorage(log: SystemLog) {
    try {
      const existing = this.getFromLocalStorage();
      existing.unshift(log);
      if (existing.length > 500) {
        existing.length = 500;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Erro ao salvar log localmente:', e);
    }
  }

  private static getFromLocalStorage(): SystemLog[] {
    try {
      const logs = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (logs) {
        return JSON.parse(logs);
      }
    } catch (e) {
      console.warn('Erro ao ler logs locais:', e);
    }
    return [];
  }
}
