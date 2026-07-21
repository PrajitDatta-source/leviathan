import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Dynamic client creator using local storage credentials
export function getSupabaseClient() {
  const url = localStorage.getItem('iris_supabase_url');
  const key = localStorage.getItem('iris_supabase_anon_key');
  
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface IrisOSState {
  gmailToken?: string;
  gmailRefreshToken?: string;
  telegramToken?: string;
  theme?: string;
  lastSynced?: number;
}

const VAULT_ID = 'primary_user_vault';

export async function pushStateToCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase URL or Key not configured in settings.' };
  }

  try {
    const state: IrisOSState = {
      gmailToken: localStorage.getItem('iris_gmail_token') || undefined,
      gmailRefreshToken: localStorage.getItem('iris_gmail_refresh_token') || undefined,
      theme: localStorage.getItem('iris_theme') || 'slate-cyan',
      lastSynced: Date.now(),
    };

    const jsonString = JSON.stringify(state);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, masterPin).toString();

    const { error } = await supabase
      .from('iris_vault')
      .upsert({
        vault_id: VAULT_ID,
        encrypted_data: encryptedData,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Cloud Push Error:', error.message);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'OS state securely locked in cloud vault.' };
  } catch (err: any) {
    console.error('Failed to push vault:', err);
    return { success: false, message: err.message || 'Encryption error' };
  }
}

export async function hydrateStateFromCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase URL or Key not configured in settings.' };
  }

  try {
    const { data, error } = await supabase
      .from('iris_vault')
      .select('encrypted_data')
      .eq('vault_id', VAULT_ID)
      .single();

    if (error || !data) {
      return { success: false, message: 'No cloud backup found for this profile.' };
    }

    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, masterPin);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      return { success: false, message: 'Invalid Master PIN! Decryption failed.' };
    }

    const state: IrisOSState = JSON.parse(decryptedString);

    if (state.gmailToken) localStorage.setItem('iris_gmail_token', state.gmailToken);
    if (state.gmailRefreshToken) localStorage.setItem('iris_gmail_refresh_token', state.gmailRefreshToken);
    if (state.theme) localStorage.setItem('iris_theme', state.theme);

    return { success: true, message: 'OS Hydrated Successfully!' };
  } catch (err: any) {
    console.error('Hydration error:', err);
    return { success: false, message: 'Decryption failed. Please check your PIN.' };
  }
}
