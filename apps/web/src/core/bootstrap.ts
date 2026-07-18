import { registerBuiltinCommands } from "./command/builtin";

let initialized = false;

export function bootstrap() {
  if (initialized) return;

  initialized = true;

  registerBuiltinCommands();

  console.log("✅ Leviathan Core Bootstrapped");
}