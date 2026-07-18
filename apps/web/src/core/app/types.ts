import { ComponentType } from "react";

export interface AppDefinition {
  id: string;

  title: string;

  component: ComponentType;

  width?: number;
  height?: number;

  resizable?: boolean;

  multiple?: boolean;
}