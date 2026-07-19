export interface Position { x: number; y: number; }
export interface Size { width: number; height: number; }

export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  position: Position;
  size: Size;
  zIndex: number;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface WindowState {
  windows: Record<string, WindowInstance>;
  activeWindowId: string | null;
  openWindow: (appId: string, title: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, position: Position) => void;
  updateSize: (id: string, size: Size) => void;
  serializeLayout: () => string;
}

export interface SnapPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}