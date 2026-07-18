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
                "zIndex" | "focused" | "minimized" | "maximized"
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
                        minimized: w.id === window.id ? false : w.minimized,
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
                        minimized: false,
                        maximized: false,
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
                minimized: window.id === id ? false : window.minimized,
                zIndex:
                    window.id === id
                        ? current.length + 1
                        : window.zIndex,
            }))
        );

    }, []);

    const minimize = useCallback((id: string) => {
        setWindows(current =>
            current.map(window => ({
                ...window,
                minimized: window.id === id ? true : window.minimized,
                focused: false,
            }))
        );
    }, []);

    const maximize = useCallback((id: string) => {
        setWindows(current =>
            current.map(window => {
                if (window.id !== id) return window;

                return {
                    ...window,
                    maximized: true,
                    minimized: false,
                    previousState: {
                        x: window.x,
                        y: window.y,
                        width: window.width,
                        height: window.height,
                    },
                    x: 0,
                    y: 0,
                    width: globalThis.innerWidth,
                    height: globalThis.innerHeight,
                };
            })
        );
    }, []);

    const restore = useCallback((id: string) => {
        setWindows(current =>
            current.map(window => {
                if (window.id !== id) return window;

                return {
                    ...window,
                    maximized: false,
                    minimized: false,
                    focused: true,
                    x: window.previousState?.x || window.x,
                    y: window.previousState?.y || window.y,
                    width: window.previousState?.width || window.width,
                    height: window.previousState?.height || window.height,
                    previousState: undefined,
                };
            })
        );
    }, []);

    const updatePositionAndSize = useCallback(
        (id: string, x: number, y: number, width: number, height: number) => {
            setWindows(current =>
                current.map(window =>
                    window.id === id ? { ...window, x, y, width, height } : window
                )
            );
        },
        []
    );

    const value = useMemo(
        () => ({
            windows,
            open,
            close,
            focus,
            minimize,
            maximize,
            restore,
            updatePositionAndSize,
        }),
        [
            windows,
            open,
            close,
            focus,
            minimize,
            maximize,
            restore,
            updatePositionAndSize,
        ]
    );

    return (
        <WindowManagerContext.Provider value={value}>
            {children}
        </WindowManagerContext.Provider>
    );
}