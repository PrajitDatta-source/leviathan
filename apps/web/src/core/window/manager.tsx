"use client";

import {
    ReactNode,
    useCallback,
    useMemo,
    useState,
} from "react";

import { WindowManagerContext } from "./context";
import { WindowInstance, SnapPreview, OpenWindowOptions } from "./types";

type ProviderProps = {
    children: ReactNode;
};

export function WindowManagerProvider({
    children,
}: ProviderProps) {

    const [windows, setWindows] =
        useState<WindowInstance[]>([]);

    const [snapPreview, setSnapPreview] =
        useState<SnapPreview | null>(null);

    const [activeWorkspace, setActiveWorkspace] = useState(1);

    const moveWindowToWorkspace = useCallback((id: string, ws: number) => {
        setWindows(current =>
            current.map(window =>
                window.id === id ? { ...window, workspace: ws } : window
            )
        );
    }, []);

    const open = useCallback(
        (window: OpenWindowOptions) => {
            setWindows((current) => {
                const existing = current.find(w => w.id === window.id);

                if (existing) {
                    return current.map(w => ({
                        ...w,
                        focused: w.id === window.id,
                        minimized: w.id === window.id ? false : w.minimized,
                        zIndex: w.id === window.id ? current.length + 1 : w.zIndex,
                        workspace: w.id === window.id ? activeWorkspace : w.workspace,
                    }));
                }

                const screenWidth = typeof globalThis !== "undefined" ? globalThis.innerWidth : 1200;
                const screenHeight = typeof globalThis !== "undefined" ? globalThis.innerHeight : 800;
                const defaultWidth = window.width || 700;
                const defaultHeight = window.height || 500;

                // Find last window in the active workspace to cascade
                const workspaceWindows = current.filter(w => w.workspace === activeWorkspace);
                const lastWindow = workspaceWindows[workspaceWindows.length - 1];

                let finalX = window.x;
                let finalY = window.y;

                if (finalX === undefined || finalY === undefined) {
                    finalX = lastWindow ? lastWindow.x + 30 : (screenWidth - defaultWidth) / 2;
                    finalY = lastWindow ? lastWindow.y + 30 : (screenHeight - defaultHeight - 48) / 2;

                    // Keep cascade within boundary
                    if (finalX + defaultWidth > screenWidth || finalY + defaultHeight > screenHeight - 48) {
                        finalX = 60;
                        finalY = 60;
                    }
                }

                return [
                    ...current.map(w => ({
                        ...w,
                        focused: false,
                    })),
                    {
                        id: window.id,
                        title: window.title,
                        content: window.content,
                        x: finalX,
                        y: finalY,
                        width: defaultWidth,
                        height: defaultHeight,
                        focused: true,
                        minimized: false,
                        maximized: false,
                        zIndex: current.length + 1,
                        workspace: activeWorkspace,
                    },
                ];
            });
        },
        [activeWorkspace]
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
            activeWorkspace,
            snapPreview,
            setSnapPreview,
            setActiveWorkspace,
            moveWindowToWorkspace,
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
            activeWorkspace,
            snapPreview,
            setActiveWorkspace,
            moveWindowToWorkspace,
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