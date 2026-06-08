export type LogSeverity = 'info' | 'success' | 'warning' | 'error';

export interface SystemLog {
  id: string;
  action: string;
  description: string;
  user: string;
  userEmail: string;
  entityType: string;
  entityId: string;
  severity: LogSeverity;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}
