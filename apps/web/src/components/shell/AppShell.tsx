import { Header } from "./Header";
import { Workspace } from "./Workspace";
import { CommandBar } from "./CommandBar";

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <Header />
      <Workspace />
      <CommandBar />
    </div>
  );
}