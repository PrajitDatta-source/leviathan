import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const VAULT_CONFIG = {
  url: 'https://oeanbxyfldivpiufvyez.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYW5ieHlmbGRpdnBpdWZ2eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjk2MDQsImV4cCI6MjEwMDIwNTYwNH0.aT6-astS8Drm6X_KQ0wHiAnQp9ziSZtn4s_RZY2WmF8',
};

const VAULT_ID = 'primary_user_vault';

// ➔ HARDCODE YOUR PERMANENT MASTER PIN HERE
export const HARDCODED_PIN = '@@#:';

export const supabase = createClient(VAULT_CONFIG.url, VAULT_CONFIG.anonKey);

export interface IrisOSState {
  gmailToken?: string;
  gmailRefreshToken?: string;
  gmailClientId?: string;
  gmailClientSecret?: string;
  telegramToken?: string;
  theme?: string;
  vfs?: string; // ➔ Holds your serialized filesystem
  lastSynced?: number;
}

// RAM storage: wipes to null on every page refresh!
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

export async function pushStateToCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  try {
    const state: IrisOSState = {
      gmailToken: localStorage.getItem('iris_gmail_token') || undefined,
      gmailRefreshToken: localStorage.getItem('iris_gmail_refresh_token') || undefined,
      gmailClientId: localStorage.getItem('iris_gmail_client_id') || localStorage.getItem('iris_g_client_id') || undefined,
      gmailClientSecret: localStorage.getItem('iris_gmail_client_secret') || localStorage.getItem('iris_g_secret') || undefined,
      telegramToken: localStorage.getItem('iris_telegram_token') || localStorage.getItem('iris_tg_token') || undefined,
      theme: localStorage.getItem('iris_theme') || 'slate-cyan',
      vfs: localStorage.getItem('iris_vfs_data') || localStorage.getItem('iris_vfs_nodes') || undefined,
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

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Synced.' };
  } catch (err: any) {
    return { success: false, message: 'Encryption error.' };
  }
}

export async function hydrateStateFromCloud(inputPin: string): Promise<{ success: boolean; message: string }> {
  // 1. Strict check against your hardcoded PIN
  if (inputPin !== HARDCODED_PIN) {
    return { success: false, message: 'Wrong PIN.' };
  }

  try {
    const { data, error } = await supabase
      .from('iris_vault')
      .select('encrypted_data')
      .eq('vault_id', VAULT_ID)
      .single();

    // If DB is completely empty, push fresh state to initialize it
    if (error || !data) {
      await pushStateToCloud(HARDCODED_PIN);
      return { success: true, message: 'Initialized new cloud vault.' };
    }

    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, HARDCODED_PIN);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // 2. AUTO-HEALING: If old DB test data fails to decrypt, silently overwrite it!
    if (!decryptedString) {
      console.warn('Old DB test data detected. Silently overwriting with hardcoded PIN...');
      await pushStateToCloud(HARDCODED_PIN);
      return { success: true, message: 'Vault auto-healed and synced.' };
    }

    const state: IrisOSState = JSON.parse(decryptedString);

    if (state.gmailToken) localStorage.setItem('iris_gmail_token', state.gmailToken);
    if (state.gmailRefreshToken) localStorage.setItem('iris_gmail_refresh_token', state.gmailRefreshToken);
    if (state.gmailClientId) {
      localStorage.setItem('iris_gmail_client_id', state.gmailClientId);
      localStorage.setItem('iris_g_client_id', state.gmailClientId);
    }
    if (state.gmailClientSecret) {
      localStorage.setItem('iris_gmail_client_secret', state.gmailClientSecret);
      localStorage.setItem('iris_g_secret', state.gmailClientSecret);
    }
    if (state.telegramToken) {
      localStorage.setItem('iris_telegram_token', state.telegramToken);
      localStorage.setItem('iris_tg_token', state.telegramToken);
    }
    if (state.theme) localStorage.setItem('iris_theme', state.theme);
    if (state.vfs) {
      localStorage.setItem('iris_vfs_data', state.vfs);
      localStorage.setItem('iris_vfs_nodes', state.vfs);
    }

    return { success: true, message: 'Unlocked.' };
  } catch (err: any) {
    // If anything breaks, force heal the DB so you never get locked out
    await pushStateToCloud(HARDCODED_PIN);
    return { success: true, message: 'Vault reset and synced.' };
  }
}

export async function autoSyncToCloud(): Promise<void> {
  const pin = getSessionPin();
  if (!pin) return;
  await pushStateToCloud(pin);
}

// ==========================================
// 5. DISK UTILITY & TELEMETRY HELPERS
// ==========================================

/**
 * Fetches raw cloud payload size and returns both ciphertext and decrypted telemetry
 */
export async function getVaultTelemetry(): Promise<{
  bytes: number;
  formattedSize: string;
  rawData: string | null;
  decryptedState: IrisOSState | null;
}> {
  const { data, error } = await supabase
    .from('iris_vault')
    .select('encrypted_data, updated_at')
    .eq('vault_id', 'primary_user_vault')
    .single();

  if (error || !data?.encrypted_data) {
    return { bytes: 0, formattedSize: '0 KB', rawData: null, decryptedState: null };
  }

  // Calculate actual UTF-8 byte size of the encrypted cloud string
  const bytes = new Blob([data.encrypted_data]).size;
  const kb = (bytes / 1024).toFixed(2);
  const formattedSize = bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${kb} KB`;

  // Attempt decryption using active RAM PIN
  let decryptedState: IrisOSState | null = null;
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(data.encrypted_data, HARDCODED_PIN);
    const jsonString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (jsonString) decryptedState = JSON.parse(jsonString);
  } catch (e) {
    console.error('Telemetry decryption failed:', e);
  }

  return { bytes, formattedSize, rawData: data.encrypted_data, decryptedState };
}

/**
 * Permanently annihilates cloud database rows and clears local browser memory
 */
export async function nukeCloudVault(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('iris_vault')
      .delete()
      .eq('vault_id', 'primary_user_vault');

    if (error) return { success: false, message: error.message };

    // Clear local storage and wipe RAM lock
    localStorage.clear();
    lockVault();
    return { success: true, message: 'Cloud vault and local caches destroyed.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to destroy vault.' };
  }
}

/**
 * Pulls the live DB payload, decrypts it, and verifies exactly what is saved in the cloud.
 */
export async function verifyCloudContent(): Promise<{
  exists: boolean;
  savedKeys: {
    gmailOAuth: boolean;
    gmailToken: boolean;
    telegramToken: boolean;
    vfsFileCount: number;
    trashCount: number;
    lastSynced: string;
  };
}> {
  try {
    const { data, error } = await supabase
      .from('iris_vault')
      .select('encrypted_data, updated_at')
      .eq('vault_id', 'primary_user_vault')
      .single();

    if (error || !data?.encrypted_data) {
      return { exists: false, savedKeys: { gmailOAuth: false, gmailToken: false, telegramToken: false, vfsFileCount: 0, trashCount: 0, lastSynced: 'Never' } };
    }

    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, HARDCODED_PIN);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    const state: IrisOSState = JSON.parse(decryptedString);

    // Count files in VFS and Trash
    let vfsFileCount = 0;
    let trashCount = 0;
    if (state.vfs) {
      try {
        const vfsObj = JSON.parse(state.vfs);
        if (Array.isArray(vfsObj)) {
          vfsFileCount = vfsObj.filter((n: any) => !n.isTrash).length;
          trashCount = vfsObj.filter((n: any) => n.isTrash).length;
        } else if (vfsObj.files || vfsObj.trash) {
          vfsFileCount = Object.keys(vfsObj.files || {}).length;
          trashCount = Object.keys(vfsObj.trash || {}).length;
        } else {
          vfsFileCount = Object.keys(vfsObj).length;
        }
      } catch (e) {}
    }

    return {
      exists: true,
      savedKeys: {
        gmailOAuth: !!(state.gmailClientId && state.gmailClientSecret),
        gmailToken: !!state.gmailToken,
        telegramToken: !!state.telegramToken,
        vfsFileCount,
        trashCount,
        lastSynced: new Date(data.updated_at).toLocaleTimeString(),
      },
    };
  } catch (err) {
    console.error('Verification failed:', err);
    return { exists: false, savedKeys: { gmailOAuth: false, gmailToken: false, telegramToken: false, vfsFileCount: 0, trashCount: 0, lastSynced: 'Error' } };
  }
}

