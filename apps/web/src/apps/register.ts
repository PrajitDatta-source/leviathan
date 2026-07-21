import { appRegistry } from "@/core/app";

import { SettingsWindow } from "./settings";
import { ExplorerWindow } from "./explorer/ExplorerWindow";
import { NotesWindow } from "./notes/NotesWindow";
import { TerminalWindow } from "./terminal/TerminalWindow";
import { DashboardWindow } from "./dashboard/DashboardWindow";
import { TelegramWindow } from "./telegram/TelegramWindow";
import { WeatherWindow } from "./weather/WeatherWindow";
import { GmailWindow } from "./gmail/GmailWindow";
import { TrashWindow } from "./trash/TrashWindow";

export function registerApps() {
  appRegistry.register({
    id: "settings",
    title: "Settings",
    component: SettingsWindow,
    width: 700,
    height: 500,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "explorer",
    title: "File Explorer",
    component: ExplorerWindow,
    width: 800,
    height: 550,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "notes",
    title: "Notes",
    component: NotesWindow,
    width: 800,
    height: 550,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "terminal",
    title: "Terminal",
    component: TerminalWindow,
    width: 650,
    height: 450,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "dashboard",
    title: "Dashboard",
    component: DashboardWindow,
    width: 850,
    height: 600,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "telegram",
    title: "Telegram",
    component: TelegramWindow,
    width: 750,
    height: 500,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "weather",
    title: "Weather",
    component: WeatherWindow,
    width: 350,
    height: 480,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "gmail",
    title: "Gmail",
    component: GmailWindow,
    width: 850,
    height: 580,
    resizable: true,
    multiple: false,
  });

  appRegistry.register({
    id: "trash",
    title: "Recycle Bin",
    component: TrashWindow,
    width: 420,
    height: 360,
    resizable: true,
    multiple: false,
  });
}