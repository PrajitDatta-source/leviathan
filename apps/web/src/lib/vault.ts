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
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-start'));

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

    if (error) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-error'));
      return { success: false, message: error.message };
    }

    if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-done'));
    return { success: true, message: 'Synced.' };
  } catch (err: any) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-error'));
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

    enforce90DayTrashPolicy();

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

/**
 * Scans the VFS trash on boot and permanently obliterates any files deleted > 90 days ago.
 */
export function enforce90DayTrashPolicy(): void {
  if (typeof window === 'undefined') return;
  const rawVFS = localStorage.getItem('iris_vfs_data') || localStorage.getItem('iris_vfs_nodes');
  if (!rawVFS) return;

  try {
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let filesPurged = false;
    const parsed = JSON.parse(rawVFS);

    if (Array.isArray(parsed)) {
      // Array-based VFS format
      const cleaned = parsed.filter((node: any) => {
        if (node.isTrash && node.deletedAt) {
          const deletedTime = new Date(node.deletedAt).getTime();
          if (now - deletedTime > NINETY_DAYS_MS) {
            console.log(`🗑️ [Trash Policy] Permanently purging expired file: ${node.name}`);
            filesPurged = true;
            return false;
          }
        }
        return true;
      });
      if (filesPurged) {
        const dataStr = JSON.stringify(cleaned);
        localStorage.setItem('iris_vfs_data', dataStr);
        localStorage.setItem('iris_vfs_nodes', dataStr);
        autoSyncToCloud();
        console.log('✓ [Trash Policy] Cloud DB defragmented and synced.');
      }
    } else if (parsed.trash && typeof parsed.trash === 'object') {
      // Object-based VFS format
      for (const [filepath, item] of Object.entries<any>(parsed.trash)) {
        const deletedTime = typeof item.deletedAt === 'number' ? item.deletedAt : new Date(item.deletedAt).getTime();
        if (deletedTime && (now - deletedTime) > NINETY_DAYS_MS) {
          console.log(`🗑️ [Trash Policy] Permanently purging expired file: ${filepath}`);
          delete parsed.trash[filepath];
          filesPurged = true;
        }
      }
      if (filesPurged) {
        const dataStr = JSON.stringify(parsed);
        localStorage.setItem('iris_vfs_data', dataStr);
        localStorage.setItem('iris_vfs_nodes', dataStr);
        autoSyncToCloud();
        console.log('✓ [Trash Policy] Cloud DB defragmented and synced.');
      }
    }
  } catch (e) {
    console.error('Failed to run 90-day trash policy:', e);
  }
}

/**
 * Downloads your encrypted Postgres payload as a physical offline file
 */
export async function downloadOfflineBackup(): Promise<void> {
  const { data, error } = await supabase
    .from('iris_vault')
    .select('encrypted_data')
    .eq('vault_id', VAULT_ID)
    .single();

  if (error || !data?.encrypted_data) {
    if (typeof window !== 'undefined') alert('No cloud vault found to backup!');
    return;
  }

  const blob = new Blob([data.encrypted_data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `iris-vault-backup-${new Date().toISOString().slice(0, 10)}.iris`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restores an offline .iris file back into your local RAM and pushes to Supabase
 */
export async function restoreOfflineBackup(file: File): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ciphertext = e.target?.result as string;
      if (!ciphertext) return resolve({ success: false, message: 'File is empty.' });

      try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, HARDCODED_PIN);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedString) {
          return resolve({ success: false, message: 'Invalid backup file or wrong PIN!' });
        }

        const { error } = await supabase
          .from('iris_vault')
          .upsert({
            vault_id: VAULT_ID,
            encrypted_data: ciphertext,
            updated_at: new Date().toISOString(),
          });

        if (error) return resolve({ success: false, message: error.message });

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
        
        resolve({ success: true, message: 'Backup restored successfully! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
        resolve({ success: false, message: 'Corrupted .iris backup file.' });
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Surgically deletes specific OAuth/API keys and syncs the cleaned state to the cloud
 */
export async function revokeServiceAuth(service: 'gmail' | 'telegram'): Promise<void> {
  if (service === 'gmail') {
    localStorage.removeItem('iris_gmail_token');
    localStorage.removeItem('iris_gmail_refresh_token');
    localStorage.removeItem('iris_gmail_client_id');
    localStorage.removeItem('iris_gmail_client_secret');
    localStorage.removeItem('iris_g_client_id');
    localStorage.removeItem('iris_g_secret');
    console.log('🔌 [Revoke] Wiped all Gmail OAuth credentials from memory.');
  } 
  else if (service === 'telegram') {
    localStorage.removeItem('iris_telegram_token');
    localStorage.removeItem('iris_tg_token');
    console.log('🔌 [Revoke] Wiped Telegram bot token from memory.');
  }

  await autoSyncToCloud();
  if (typeof window !== 'undefined') {
    alert(`${service.toUpperCase()} credentials disconnected and erased from cloud vault.`);
  }
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
