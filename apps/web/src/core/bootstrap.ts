import { registerBuiltinCommands } from "./command/builtin";
import { registerApps } from "@/apps/register";

let initialized = false;

export function bootstrap() {
  if (initialized) return;

  initialized = true;

  registerBuiltinCommands();
  registerApps();

  console.log("✅ Leviathan Core Bootstrapped");
}