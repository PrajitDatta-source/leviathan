"use client";

import { createContext } from "react";

import { WindowManagerContextValue } from "./types";

export const WindowManagerContext =
    createContext<WindowManagerContextValue | null>(null);