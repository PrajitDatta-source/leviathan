import { UserProfile, UserPreferences } from "./types";

class ProfileManager {
  private profile: UserProfile | null = null;
  private preferences: UserPreferences = {
    theme: "dark",
    notifications: true,
    autoSync: true,
  };

  private profileStorageKey = "leviathan_profile";
  private preferencesStorageKey = "leviathan_preferences";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const profileStored = localStorage.getItem(this.profileStorageKey);
      if (profileStored) {
        const data = JSON.parse(profileStored);
        this.profile = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        };
      }

      const preferencesStored = localStorage.getItem(this.preferencesStorageKey);
      if (preferencesStored) {
        this.preferences = JSON.parse(preferencesStored);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  }

  private saveToStorage(): void {
    try {
      if (this.profile) {
        localStorage.setItem(this.profileStorageKey, JSON.stringify(this.profile));
      }
      localStorage.setItem(this.preferencesStorageKey, JSON.stringify(this.preferences));
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  }

  createProfile(data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">): UserProfile {
    const profile: UserProfile = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profile = profile;
    this.saveToStorage();
    return profile;
  }

  getProfile(): UserProfile | null {
    return this.profile;
  }

  updateProfile(updates: Partial<UserProfile>): void {
    if (this.profile) {
      this.profile = {
        ...this.profile,
        ...updates,
        updatedAt: new Date(),
      };
      this.saveToStorage();
    }
  }

  getPreferences(): UserPreferences {
    return this.preferences;
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
    };
    this.saveToStorage();
  }

  clearAll(): void {
    this.profile = null;
    this.preferences = {
      theme: "dark",
      notifications: true,
      autoSync: true,
    };
    this.saveToStorage();
  }
}

export const profileManager = new ProfileManager();
