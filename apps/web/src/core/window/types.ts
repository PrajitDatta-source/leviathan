import { ReactNode } from "react";

export interface WindowInstance {
  id: string;
  title: string;
  content: ReactNode;

  x: number;
  y: number;

  width: number;
  height: number;

  zIndex: number;
  focused: boolean;
  minimized: boolean;
  maximized: boolean;
  workspace: number;

  // Store previous state for restore
  previousState?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OpenWindowOptions {
  id: string;
  title: string;
  content: ReactNode;

  x?: number;
  y?: number;

  width?: number;
  height?: number;
}

export interface SnapPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowManagerContextValue {
  windows: WindowInstance[];
  activeWorkspace: number;
  snapPreview: SnapPreview | null;
  setSnapPreview(preview: SnapPreview | null): void;
  setActiveWorkspace(ws: number): void;
  moveWindowToWorkspace(id: string, ws: number): void;

  open(window: OpenWindowOptions): void;
  close(id: string): void;
  focus(id: string): void;
  minimize(id: string): void;
  maximize(id: string): void;
  restore(id: string): void;
  toggleShowDesktop(): void;
  updatePositionAndSize(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
}