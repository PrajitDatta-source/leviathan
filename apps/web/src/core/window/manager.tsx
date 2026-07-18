"use client";

import {
    ReactNode,
    useCallback,
    useMemo,
    useState,
} from "react";

import { WindowManagerContext } from "./context";
import { WindowInstance } from "./types";

type ProviderProps = {
    children: ReactNode;
};

export function WindowManagerProvider({
    children,
}: ProviderProps) {

    const [windows, setWindows] =
        useState<WindowInstance[]>([]);

    const open = useCallback(
        (
            window: Omit<
                WindowInstance,
                "zIndex" | "focused"
            >
        ) => {

            setWindows((current) => {

                const existing =
                    current.find(
                        w => w.id === window.id
                    );

                if (existing) {

                    return current.map(w => ({
                        ...w,
                        focused: w.id === window.id,
                        zIndex:
                            w.id === window.id
                                ? current.length + 1
                                : w.zIndex,
                    }));

                }

                return [
                    ...current.map(w => ({
                        ...w,
                        focused: false,
                    })),

                    {
                        ...window,
                        focused: true,
                        zIndex: current.length + 1,
                    },
                ];
            });

        },
        []
    );

    const close = useCallback((id: string) => {

        setWindows(current =>
            current.filter(
                window => window.id !== id
            )
        );

    }, []);

    const focus = useCallback((id: string) => {

        setWindows(current =>
            current.map(window => ({
                ...window,
                focused: window.id === id,
                zIndex:
                    window.id === id
                        ? current.length + 1
                        : window.zIndex,
            }))
        );

    }, []);

    const value = useMemo(
        () => ({
            windows,
            open,
            close,
            focus,
        }),
        [
            windows,
            open,
            close,
            focus,
        ]
    );

    return (
        <WindowManagerContext.Provider value={value}>
            {children}
        </WindowManagerContext.Provider>
    );
}