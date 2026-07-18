import { LucideIcon } from "lucide-react";

export interface Command {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: LucideIcon;
  keywords?: string[];
  run: () => void | Promise<void>;
}