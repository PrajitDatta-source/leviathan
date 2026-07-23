import CryptoJS from 'crypto-js';
import { getSupabase } from './supabaseClient';

const VAULT_ID = 'primary_user_vault';

export interface IrisOSState {
  gmailToken?: string;
  gmailRefreshToken?: string;
  gmailClientId?: string;
  gmailClientSecret?: string;
  telegramBotToken?: string;
  hfSpaceEndpoint?: string;
  telegramToken?: string;
  theme?: string;
  vfs?: string; // ➔ Holds your serialized filesystem
  lastSynced?: number;
}

// RAM storage: wipes to null on every page refresh — that's intentional,
// it's what makes the lockscreen actually lock instead of just being a
// speed bump you see once per browser install.
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

function collectLocalState(): IrisOSState {
  return {
    gmailToken: localStorage.getItem('iris_gmail_token') || undefined,
    gmailRefreshToken: localStorage.getItem('iris_gmail_refresh_token') || undefined,
    gmailClientId: localStorage.getItem('iris_gmail_client_id') || localStorage.getItem('iris_g_client_id') || undefined,
    gmailClientSecret: localStorage.getItem('iris_gmail_client_secret') || localStorage.getItem('iris_g_secret') || undefined,
    telegramBotToken: localStorage.getItem('iris_tg_bot_token') || localStorage.getItem('iris_telegram_token') || undefined,
    hfSpaceEndpoint: localStorage.getItem('iris_hf_endpoint') || localStorage.getItem('iris_hf_url') || undefined,
    telegramToken: localStorage.getItem('iris_telegram_token') || localStorage.getItem('iris_tg_token') || undefined,
    theme: localStorage.getItem('iris_theme') || undefined,
    vfs: localStorage.getItem('iris_vfs_data') || localStorage.getItem('iris_vfs_nodes') || undefined,
    lastSynced: Date.now(),
  };
}

function applyStateToLocal(state: IrisOSState): void {
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
  if (state.telegramBotToken || state.telegramToken) {
    const tgToken = state.telegramBotToken || state.telegramToken;
    localStorage.setItem('iris_tg_bot_token', tgToken!);
    localStorage.setItem('iris_telegram_token', tgToken!);
    localStorage.setItem('iris_tg_token', tgToken!);
  }
  if (state.hfSpaceEndpoint) {
    localStorage.setItem('iris_hf_endpoint', state.hfSpaceEndpoint);
    localStorage.setItem('iris_hf_url', state.hfSpaceEndpoint);
  }
  if (state.theme) localStorage.setItem('iris_theme', state.theme);
  if (state.vfs) {
    localStorage.setItem('iris_vfs_data', state.vfs);
    localStorage.setItem('iris_vfs_nodes', state.vfs);
  }
}

/** Does a vault row already exist in the cloud? Lockscreen uses this to
 * decide whether to show "set a PIN to create your vault" (first run) or
 * "enter your PIN" (returning). */
export async function checkVaultExists(): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('iris_vault').select('vault_id').eq('vault_id', VAULT_ID).maybeSingle();
  if (error) {
    console.error('checkVaultExists failed:', error);
    return false;
  }
  return !!data;
}

export async function pushStateToCloud(masterPin: string): Promise<{ success: boolean; message: string }> {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-start'));

    const state = collectLocalState();
    const jsonString = JSON.stringify(state);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, masterPin).toString();

    const supabase = getSupabase();
    const { error } = await supabase.from('iris_vault').upsert({
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
  } catch (err) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('iris-sync-error'));
    const message = err instanceof Error ? err.message : 'Encryption error.';
    return { success: false, message };
  }
}

/** Creates a brand-new vault, encrypted with the PIN the user just chose.
 * Only call this after confirming (via checkVaultExists) that no vault
 * exists yet — this intentionally does NOT overwrite an existing one. */
export async function createVault(pin: string): Promise<{ success: boolean; message: string }> {
  const exists = await checkVaultExists();
  if (exists) {
    return { success: false, message: 'A vault already exists — use Unlock instead.' };
  }
  const result = await pushStateToCloud(pin);
  if (result.success) setSessionPin(pin);
  return result;
}

export type UnlockResult =
  | { status: 'unlocked' }
  | { status: 'wrong-pin' }
  | { status: 'no-vault' }
  | { status: 'error'; message: string };

export async function hydrateStateFromCloud(inputPin: string): Promise<UnlockResult> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('iris_vault')
      .select('encrypted_data')
      .eq('vault_id', VAULT_ID)
      .maybeSingle();

    if (error) return { status: 'error', message: error.message };
    if (!data) return { status: 'no-vault' };

    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, inputPin);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // A wrong PIN produces garbage bytes that fail to decode as UTF-8/JSON
    // — that's the ONLY thing that should happen here. Earlier versions of
    // this function treated that as "corrupt data" and silently wiped and
    // reinitialized the vault, which meant a single PIN typo permanently
    // destroyed every saved credential with no warning. Never do that —
    // a wrong PIN just fails to unlock, exactly like a real password.
    if (!decryptedString) {
      return { status: 'wrong-pin' };
    }

    let state: IrisOSState;
    try {
      state = JSON.parse(decryptedString);
    } catch {
      return { status: 'wrong-pin' };
    }

    applyStateToLocal(state);
    setSessionPin(inputPin);
    enforce90DayTrashPolicy();
    return { status: 'unlocked' };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown vault error.' };
  }
}

/** Verifies the old PIN actually unlocks the vault, then re-encrypts and
 * uploads the same state under the new PIN. This is what Settings > Security
 * should call — writing straight to localStorage there did nothing, since
 * the vault's real encryption key was the hardcoded PIN, not that field. */
export async function changeMasterPin(oldPin: string, newPin: string): Promise<{ success: boolean; message: string }> {
  const result = await hydrateStateFromCloud(oldPin);
  if (result.status === 'wrong-pin') return { success: false, message: 'Current PIN is incorrect.' };
  if (result.status === 'no-vault') return { success: false, message: 'No vault exists yet.' };
  if (result.status === 'error') return { success: false, message: result.message };

  const push = await pushStateToCloud(newPin);
  if (push.success) setSessionPin(newPin);
  return push;
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
      const cleaned = parsed.filter((node: { isTrash?: boolean; deletedAt?: string; name?: string }) => {
        if (node.isTrash && node.deletedAt) {
          const deletedTime = new Date(node.deletedAt).getTime();
          if (now - deletedTime > NINETY_DAYS_MS) {
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
      }
    } else if (parsed.trash && typeof parsed.trash === 'object') {
      for (const [filepath, item] of Object.entries<{ deletedAt?: number | string }>(parsed.trash)) {
        const deletedTime = typeof item.deletedAt === 'number' ? item.deletedAt : new Date(item.deletedAt || 0).getTime();
        if (deletedTime && now - deletedTime > NINETY_DAYS_MS) {
          delete parsed.trash[filepath];
          filesPurged = true;
        }
      }
      if (filesPurged) {
        const dataStr = JSON.stringify(parsed);
        localStorage.setItem('iris_vfs_data', dataStr);
        localStorage.setItem('iris_vfs_nodes', dataStr);
        autoSyncToCloud();
      }
    }
  } catch (e) {
    console.error('Failed to run 90-day trash policy:', e);
  }
}

/** Downloads your encrypted Supabase payload as a physical offline file. */
export async function downloadOfflineBackup(): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('iris_vault').select('encrypted_data').eq('vault_id', VAULT_ID).maybeSingle();

  if (error || !data?.encrypted_data) {
    if (typeof window !== 'undefined') alert('No cloud vault found to back up!');
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

/** Restores an offline .iris file, decrypting it with the CURRENT unlocked
 * session PIN (not a hardcoded one) and pushing it back to Supabase. */
export async function restoreOfflineBackup(file: File): Promise<{ success: boolean; message: string }> {
  const pin = getSessionPin();
  if (!pin) {
    return { success: false, message: 'Vault is locked — unlock it first.' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const ciphertext = e.target?.result as string;
      if (!ciphertext) return resolve({ success: false, message: 'File is empty.' });

      try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, pin);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
          return resolve({ success: false, message: 'This backup was not encrypted with your current PIN.' });
        }

        const state: IrisOSState = JSON.parse(decryptedString);
        applyStateToLocal(state);

        const push = await pushStateToCloud(pin);
        if (!push.success) return resolve(push);

        resolve({ success: true, message: 'Backup restored successfully! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        resolve({ success: false, message: 'Corrupted .iris backup file.' });
      }
    };
    reader.readAsText(file);
  });
}

/** Surgically deletes specific OAuth/API keys and syncs the cleaned state to the cloud. */
export async function revokeServiceAuth(service: 'gmail' | 'telegram'): Promise<void> {
  if (service === 'gmail') {
    localStorage.removeItem('iris_gmail_token');
    localStorage.removeItem('iris_gmail_refresh_token');
    localStorage.removeItem('iris_gmail_client_id');
    localStorage.removeItem('iris_gmail_client_secret');
    localStorage.removeItem('iris_g_client_id');
    localStorage.removeItem('iris_g_secret');
  } else if (service === 'telegram') {
    localStorage.removeItem('iris_telegram_token');
    localStorage.removeItem('iris_tg_token');
  }

  await autoSyncToCloud();
}

// ==========================================
// Disk utility / telemetry helpers
// ==========================================

export async function getVaultTelemetry(): Promise<{
  bytes: number;
  formattedSize: string;
  rawData: string | null;
  decryptedState: IrisOSState | null;
}> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('iris_vault').select('encrypted_data, updated_at').eq('vault_id', VAULT_ID).maybeSingle();

  if (error || !data?.encrypted_data) {
    return { bytes: 0, formattedSize: '0 KB', rawData: null, decryptedState: null };
  }

  const bytes = new Blob([data.encrypted_data]).size;
  const kb = (bytes / 1024).toFixed(2);
  const formattedSize = bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${kb} KB`;

  let decryptedState: IrisOSState | null = null;
  const pin = getSessionPin();
  if (pin) {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(data.encrypted_data, pin);
      const jsonString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (jsonString) decryptedState = JSON.parse(jsonString);
    } catch (e) {
      console.error('Telemetry decryption failed:', e);
    }
  }

  return { bytes, formattedSize, rawData: data.encrypted_data, decryptedState };
}

export async function nukeCloudVault(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('iris_vault').delete().eq('vault_id', VAULT_ID);
    if (error) return { success: false, message: error.message };

    localStorage.clear();
    lockVault();
    return { success: true, message: 'Cloud vault and local caches destroyed.' };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Failed to destroy vault.' };
  }
}

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
  const empty = { exists: false, savedKeys: { gmailOAuth: false, gmailToken: false, telegramToken: false, vfsFileCount: 0, trashCount: 0, lastSynced: 'Never' } };
  const pin = getSessionPin();
  if (!pin) return empty;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('iris_vault').select('encrypted_data, updated_at').eq('vault_id', VAULT_ID).maybeSingle();

    if (error || !data?.encrypted_data) return empty;

    const bytes = CryptoJS.AES.decrypt(data.encrypted_data, pin);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return empty;
    const state: IrisOSState = JSON.parse(decryptedString);

    let vfsFileCount = 0;
    let trashCount = 0;
    if (state.vfs) {
      try {
        const vfsObj = JSON.parse(state.vfs);
        if (Array.isArray(vfsObj)) {
          vfsFileCount = vfsObj.filter((n: { isTrash?: boolean }) => !n.isTrash).length;
          trashCount = vfsObj.filter((n: { isTrash?: boolean }) => n.isTrash).length;
        } else if (vfsObj.files || vfsObj.trash) {
          vfsFileCount = Object.keys(vfsObj.files || {}).length;
          trashCount = Object.keys(vfsObj.trash || {}).length;
        } else {
          vfsFileCount = Object.keys(vfsObj).length;
        }
      } catch {
        // ignore malformed vfs blob for counting purposes
      }
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
    return empty;
  }
}
