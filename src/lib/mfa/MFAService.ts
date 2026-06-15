import { supabase } from '../supabase';

export interface MfaFactor {
  id: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
}

export class MFAService {
  private static listFactorsPromise: Promise<any> | null = null;
  private static challengePromise: Promise<any> | null = null;

  static async enroll(friendlyName?: string) {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    console.log('MFA: Starting enrollment');
    
    // Limpar quaisquer fatores existentes para evitar conflitos de nome/limite
    try {
      const factors = await this.listFactors();
      if (factors) {
        const allFactors = [
          ...(factors.totp || []),
          ...(factors.phone || [])
        ];
        for (const factor of allFactors) {
          console.log('MFA: Limpando fator existente antes do novo registro:', factor.id);
          try {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          } catch (unerr) {
            console.warn('Falha ao desvincular fator individual:', factor.id, unerr);
          }
        }
      }
    } catch (unerr) {
      console.warn('MFA: Falha geral ao limpar fatores existentes:', unerr);
    }

    const uniqueFriendlyName = friendlyName || `Admin TOTP (${Date.now()})`;
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Amour & Co.',
      friendlyName: uniqueFriendlyName
    });
    if (error) {
      console.error('MFA Enroll Error:', error);
      throw error;
    }
    console.log('MFA FACTOR ENROLLED:', data.id);
    return data;
  }

  static async listFactors() {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    if (this.listFactorsPromise) {
      return this.listFactorsPromise;
    }
    this.listFactorsPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          console.error('MFA List Factors Error:', error);
          throw error;
        }
        console.log("MFA factors loaded");
        return data;
      } finally {
        this.listFactorsPromise = null;
      }
    })();
    return this.listFactorsPromise;
  }

  static async challenge(factorId: string) {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    if (this.challengePromise) {
      return this.challengePromise;
    }
    console.log('MFA CHALLENGE:', factorId);
    this.challengePromise = (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId });
        if (error) {
          console.error('MFA Challenge Error:', error);
          throw error;
        }
        console.log("MFA challenge created");
        console.log('MFA CHALLENGE ID:', data.id);
        return data;
      } finally {
        this.challengePromise = null;
      }
    })();
    return this.challengePromise;
  }

  static async verify(factorId: string, challengeId: string, code: string) {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    console.log('MFA VERIFY:', code);
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: code.trim()
    });
    if (error) {
      console.error('MFA Verify Error:', error);
      throw error;
    }
    console.log('MFA VERIFIED SUCCESS');
    return data;
  }

  static async resetEnrollment(factorId: string) {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    console.log('MFA: Resetting/Unenrolling factor', factorId);
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      console.error('MFA Unenroll Error:', error);
      throw error;
    }
    console.log('MFA UNENROLLED SUCCESS:', factorId);
    return data;
  }

  static async getCurrentFactor() {
    const factors = await this.listFactors();
    const verified = factors?.totp?.find((f: any) => f.status === 'verified');
    if (verified) return verified;
    const unverified = factors?.totp?.find((f: any) => (f.status as string) === 'unverified');
    return unverified || null;
  }
}
