import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// ==========================================
// 1. CLIENT CREDENTIALS (HARDCODED FOR DEVICE INDEPENDENCE)
// ==========================================
const VAULT_CONFIG = {
  url: 'https://oeanbxyfldivpiufvyez.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYW5ieHlmbGRpdnBpdWZ2eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjk2MDQsImV4cCI6MjEwMDIwNTYwNH0.aT6-astS8Drm6X_KQ0wHiAnQp9ziSZtn4s_RZY2WmF8',
};

const VAULT_ID = 'primary_user_vault';

// Initialize static Supabase client for global OS use
export const supabase = createClient(VAULT_CONFIG.url, VAULT_CONFIG.anonKey);

export interface IrisOSState {
  gmailToken?: string;
  gmailRefreshToken?: string;
  telegramToken?: string;
  theme?: string;
  lastSynced?: number;
}

// ==========================================
// 2. RAM-ONLY PIN STORAGE (WIPES ON REFRESH)
// ==========================================
// Because this is an in-memory variable, refreshing the browser page
// completely obliterates the PIN, forcing a re-lock automatically.
let activeSessionPin: string | null = null;

export function setSessionPin(pin: string): void {
  activeSessionPin = pin;
}

export function getSessionPin(): string | null {
  return activeSessionPin;
}

export function lockVault(): void {
  activeSessionPin = null;
}

// ==========================================
// 3. ZERO-KNOWLEDGE PUSH & PULL LOGIC
// ==========================================

/**
 * Encrypts current localStorage tokens with AES-256 and pushes to Supabase
 */
export async function pushStateToCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  try {
    const state: IrisOSState = {
      gmailToken: localStorage.getItem('iris_gmail_token') || undefined,
      gmailRefreshToken: localStorage.getItem('iris_gmail_refresh_token') || undefined,
      telegramToken: localStorage.getItem('iris_telegram_token') || undefined,
      theme: localStorage.getItem('iris_theme') || 'slate-cyan',
      lastSynced: Date.now(),
    };

    // Encrypt the entire state object into a single AES ciphertext string
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
      console.error('[Vault Push Error]:', error.message);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'OS state encrypted and locked in cloud.' };
  } catch (err: any) {
    console.error('[Vault Push Exception]:', err);
    return { success: false, message: err.message || 'Encryption error occurred.' };
  }
}

/**
 * Pulls ciphertext from Supabase, decrypts with Master PIN, and hydrates localStorage
 */
export async function hydrateStateFromCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase
      .from('iris_vault')
      .select('encrypted_data')
      .eq('vault_id', VAULT_ID)
      .single();

    if (error || !data) {
      return { success: false, message: 'No cloud backup found for this vault.' };
    }

    // Decrypt the cloud ciphertext using the user's PIN
    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, masterPin);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      return { success: false, message: 'Invalid Master PIN! Decryption failed.' };
    }

    const state: IrisOSState = JSON.parse(decryptedString);

    // Hydrate local browser memory with decrypted session tokens & preferences
    if (state.gmailToken) localStorage.setItem('iris_gmail_token', state.gmailToken);
    if (state.gmailRefreshToken) localStorage.setItem('iris_gmail_refresh_token', state.gmailRefreshToken);
    if (state.telegramToken) localStorage.setItem('iris_telegram_token', state.telegramToken);
    if (state.theme) localStorage.setItem('iris_theme', state.theme);

    return { success: true, message: 'OS Hydrated Successfully!' };
  } catch (err: any) {
    console.error('[Vault Hydration Error]:', err);
    return { success: false, message: 'Decryption failed. Check your PIN.' };
  }
}

// ==========================================
// 4. AUTOMATED BACKGROUND SYNC DAEMON
// ==========================================

/**
 * Call this helper anywhere in your app whenever a token or setting updates.
 * It quietly encrypts and syncs your state to Postgres in the background.
 */
export async function autoSyncToCloud(): Promise<void> {
  const pin = getSessionPin();
  if (!pin) {
    console.warn('⚠️ [Auto-Sync] Skipped: OS is locked (no PIN in RAM).');
    return;
  }

  console.log('⚡ [Auto-Sync] Backing up updated OS state to cloud...');
  const res = await pushStateToCloud(pin);
  if (res.success) {
    console.log('✓ [Auto-Sync] Cloud vault updated seamlessly.');
  } else {
    console.error('✕ [Auto-Sync] Failed:', res.message);
  }
}
