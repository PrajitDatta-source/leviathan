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
  snapPreview: SnapPreview | null;
  setSnapPreview(preview: SnapPreview | null): void;

  open(window: OpenWindowOptions): void;
  close(id: string): void;
  focus(id: string): void;
  minimize(id: string): void;
  maximize(id: string): void;
  restore(id: string): void;
  updatePositionAndSize(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void;
}