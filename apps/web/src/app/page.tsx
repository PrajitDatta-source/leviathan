import { AppShell } from "@/components/shell/AppShell";
import LockScreen from "@/core/components/LockScreen";

export default function Home() {
  return (
    <LockScreen>
      <AppShell />
    </LockScreen>
  );
}