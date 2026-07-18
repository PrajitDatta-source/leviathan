import { appRegistry } from "@/core/app";

import { SettingsWindow } from "./settings";

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
}