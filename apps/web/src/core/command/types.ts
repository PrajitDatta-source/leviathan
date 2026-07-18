import { LucideIcon } from "lucide-react";
import { WindowManagerContextValue } from "../window/types";

export interface CommandContext {
  windowManager?: WindowManagerContextValue;
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