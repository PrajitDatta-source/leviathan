import { LucideIcon } from "lucide-react";
import { Theme } from "../../modules/theme/types";

export interface CommandContext {
  themeContext?: {
    theme: Theme;
    setTheme: (theme: Theme) => void;
  };
}

export interface Command {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: LucideIcon;
  keywords?: string[];
  run: (context: CommandContext) => void | Promise<void>;
}