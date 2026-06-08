import { supabase } from './supabase';
import { SystemLog, LogSeverity } from '../types/log';

const LOCAL_STORAGE_KEY = 'amr_system_logs';

export class LogService {
  /**
   * Registra um novo log no sistema.
   * Tenta gravar no Supabase, caso falhe, salva no localStorage.
   */
  static async log(
    action: string,
    description: string,
    user: string = 'Admin',
    userEmail: string = 'admin@amour.co',
    entityType: string = 'sistema',
    entityId: string = '',
    severity: LogSeverity = 'info'
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
      userAgent: navigator.userAgent
    };

    if (supabase) {
      try {
        const { error } = await supabase
          .from('system_logs')
          .insert([{
            id: newLog.id,
            action: newLog.action,
            description: newLog.description,
            user_name: newLog.user,
            user_email: newLog.userEmail,
            entity_type: newLog.entityType,
            entity_id: newLog.entityId,
            severity: newLog.severity,
            ip: '',
            user_agent: newLog.userAgent,
            timestamp: newLog.timestamp
          }]);

        if (error) {
          console.warn('Erro ao salvar log no Supabase. Fazendo fallback para localStorage:', error);
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
  static async getLogs(limit: number = 50): Promise<SystemLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (!error && data) {
          return data.map((r: any) => ({
            id: r.id,
            action: r.action,
            description: r.description,
            user: r.user_name,
            userEmail: r.user_email,
            entityType: r.entity_type,
            entityId: r.entity_id,
            severity: r.severity,
            timestamp: r.timestamp,
            userAgent: r.user_agent
          })) as SystemLog[];
        }
      } catch (err) {
        console.warn('Falha ao buscar logs do Supabase:', err);
      }
    }

    return this.getFromLocalStorage().slice(0, limit);
  }

  private static saveToLocalStorage(log: SystemLog) {
    try {
      const existing = this.getFromLocalStorage();
      existing.unshift(log); // Coloca no topo
      // Mantém no máximo 1000 logs localmente para não estourar a cota
      if (existing.length > 1000) {
        existing.length = 1000;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('Erro ao salvar log no localStorage:', e);
    }
  }

  private static getFromLocalStorage(): SystemLog[] {
    try {
      const logs = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (logs) {
        return JSON.parse(logs);
      }
    } catch (e) {
      console.warn('Erro ao ler logs do localStorage:', e);
    }
    return [];
  }
}
