import { supabase } from '../supabase';

export interface MfaFactor {
  id: string;
  factorType: 'totp';
  status: 'verified' | 'unverified';
}

export class MFAService {
  static async enroll() {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    console.log('MFA: Starting enrollment');
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Amour & Co.'
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
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      console.error('MFA List Factors Error:', error);
      throw error;
    }
    return data;
  }

  static async challenge(factorId: string) {
    if (!supabase) throw new Error('Serviço do banco de dados indisponível.');
    console.log('MFA CHALLENGE:', factorId);
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) {
      console.error('MFA Challenge Error:', error);
      throw error;
    }
    console.log('MFA CHALLENGE ID:', data.id);
    return data;
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
    const verified = factors?.totp?.find(f => f.status === 'verified');
    if (verified) return verified;
    const unverified = factors?.totp?.find(f => (f.status as string) === 'unverified');
    return unverified || null;
  }
}
