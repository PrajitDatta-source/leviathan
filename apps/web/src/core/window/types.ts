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

export interface WindowManagerContextValue {
  windows: WindowInstance[];

  open(window: OpenWindowOptions): void;
  close(id: string): void;
  focus(id: string): void;
}