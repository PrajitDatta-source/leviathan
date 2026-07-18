import { LucideIcon } from "lucide-react";
import { WindowManagerContextValue } from "../window/types";
import { Theme } from "../../modules/theme/types";

export interface CommandContext {
  windowManager?: WindowManagerContextValue;
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