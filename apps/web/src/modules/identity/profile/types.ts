export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  timezone: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: "light" | "dark" | "oled" | "custom";
  wallpaper?: string;
  notifications: boolean;
  autoSync: boolean;
}
