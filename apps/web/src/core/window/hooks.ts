"use client";

import { useContext } from "react";

import { WindowManagerContext } from "./context";

export function useWindowManager() {
    const context = useContext(WindowManagerContext);

    if (!context) {
        throw new Error(
            "useWindowManager must be used inside WindowManagerProvider"
        );
    }

    return context;
}