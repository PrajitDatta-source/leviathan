"use client";

import { WindowInstance } from "@/core/window/types";
import { 
  useWindowStore, 
  useSnapPreviewStore,
  focusWindow, 
  minimizeWindow, 
  maximizeWindow, 
  restoreWindow, 
  closeWindow,
  useWorkspaceStore
} from "@/core/window/manager";
import { useState, useRef, useEffect, createElement } from "react";
import { Z_INDEX } from "@/core/window/zIndex";
import { appRegistry } from "@/core/app";
import { useThemeStore } from "@/core/theme/useThemeStore";

type Props = {
    window: WindowInstance;
};

export function Window({ window: initialWindow }: Props) {
    const window = useWindowStore((state) => state.windows[initialWindow.id]) || initialWindow;
    const windowWorkspaces = useWorkspaceStore((state) => state.windowWorkspaces);
    const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
    const belongsToActiveWorkspace = (windowWorkspaces[window.id] || 1) === activeWorkspace;
    const { osStyle, glass } = useThemeStore();

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);
    
    // Store drag/resize starting state for jitter-free math
    const resizeStart = useRef({
        pointerX: 0,
        pointerY: 0,
        winX: 0,
        winY: 0,
        winWidth: 0,
        winHeight: 0,
    });

    // Mobile screen responsive check
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(globalThis.innerWidth < 768);
        checkMobile();
        globalThis.addEventListener("resize", checkMobile);
        return () => globalThis.removeEventListener("resize", checkMobile);
    }, []);

    const position = {
        x: isMobile ? 0 : window.position.x,
        y: isMobile ? 0 : window.position.y,
    };
    const size = {
        width: isMobile ? (typeof globalThis !== "undefined" ? globalThis.innerWidth : 400) : window.size.width,
        height: isMobile ? (typeof globalThis !== "undefined" ? globalThis.innerHeight - 48 : 600) : window.size.height,
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isMobile) return; // Disable dragging on mobile (fixed full-screen stack)
        if (e.target instanceof HTMLElement && e.target.closest('button')) {
            return;
        }
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - window.position.x,
            y: e.clientY - window.position.y,
        });
        focusWindow(window.id);
    };

    const handleResizePointerDown = (e: React.PointerEvent, direction: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w') => {
        e.stopPropagation();
        if (isMobile) return; // Disable resizing on mobile
        setIsResizing(true);
        setResizeDirection(direction);
        
        resizeStart.current = {
            pointerX: e.clientX,
            pointerY: e.clientY,
            winX: window.position.x,
            winY: window.position.y,
            winWidth: window.size.width,
            winHeight: window.size.height,
        };

        focusWindow(window.id);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const sw = typeof globalThis !== "undefined" ? globalThis.innerWidth : 1200;
        const sh = typeof globalThis !== "undefined" ? globalThis.innerHeight : 800;
        const taskbarHeight = 48;

        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            // Constrain newX so at least 60px of the window width remains visible inside screen boundaries
            const boundedX = Math.max(60 - window.size.width, Math.min(sw - 60, newX));
            // Constrain newY so the title bar (approx 40px) stays visible underneath the top viewport and above the taskbar
            const boundedY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));

            useWindowStore.getState().updatePosition(window.id, { x: boundedX, y: boundedY });

            // Snapping preview calculations
            const edgeThreshold = 30;
            const cornerThreshold = 80;
            let preview = null;

            if (e.clientX < cornerThreshold && e.clientY < cornerThreshold) {
                // Top-Left Quarter layout
                preview = { x: 0, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX > sw - cornerThreshold && e.clientY < cornerThreshold) {
                // Top-Right Quarter layout
                preview = { x: sw / 2, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX < cornerThreshold && e.clientY > sh - taskbarHeight - cornerThreshold) {
                // Bottom-Left Quarter layout
                preview = { x: 0, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX > sw - cornerThreshold && e.clientY > sh - taskbarHeight - cornerThreshold) {
                // Bottom-Right Quarter layout
                preview = { x: sw / 2, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientY < edgeThreshold) {
                // Maximize fills available desktop space
                preview = { x: 0, y: 0, width: sw, height: sh - taskbarHeight };
            } else if (e.clientX < edgeThreshold) {
                // Left Half split
                preview = { x: 0, y: 0, width: sw / 2, height: sh - taskbarHeight };
            } else if (e.clientX > sw - edgeThreshold) {
                // Right Half split
                preview = { x: sw / 2, y: 0, width: sw / 2, height: sh - taskbarHeight };
            }

            useSnapPreviewStore.getState().setSnapPreview(preview);
        }

        if (isResizing && resizeDirection) {
            const minWidth = 300;
            const minHeight = 200;
            const deltaX = e.clientX - resizeStart.current.pointerX;
            const deltaY = e.clientY - resizeStart.current.pointerY;

            const startX = resizeStart.current.winX;
            const startY = resizeStart.current.winY;
            const startWidth = resizeStart.current.winWidth;
            const startHeight = resizeStart.current.winHeight;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newX = startX;
            let newY = startY;

            // Handle horizontal resizing
            if (resizeDirection.includes('e')) {
                // Right side resize: right edge cannot exceed screen width
                newWidth = Math.max(minWidth, Math.min(sw - startX, startWidth + deltaX));
            } else if (resizeDirection.includes('w')) {
                // Left side resize: left edge cannot go below 0
                newWidth = Math.max(minWidth, Math.min(startX + startWidth, startWidth - deltaX));
                newX = startX + startWidth - newWidth;
            }

            // Handle vertical resizing
            if (resizeDirection.includes('s')) {
                // Bottom side resize: bottom edge cannot exceed screen height minus taskbar
                newHeight = Math.max(minHeight, Math.min(sh - taskbarHeight - startY, startHeight + deltaY));
            } else if (resizeDirection.includes('n')) {
                // Top side resize: top edge cannot go below 0
                newHeight = Math.max(minHeight, Math.min(startY + startHeight, startHeight - deltaY));
                newY = startY + startHeight - newHeight;
            }

            useWindowStore.getState().updatePosition(window.id, { x: newX, y: newY });
            useWindowStore.getState().updateSize(window.id, { width: newWidth, height: newHeight });
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (isDragging) {
            const edgeThreshold = 30;
            const cornerThreshold = 80;
            const { innerWidth: sw, innerHeight: sh } = globalThis;
            const taskbarHeight = 48;

            let finalSnap = null;

            if (e.clientX < cornerThreshold && e.clientY < cornerThreshold) {
                // Top-Left Quarter
                finalSnap = { x: 0, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX > sw - cornerThreshold && e.clientY < cornerThreshold) {
                // Top-Right Quarter
                finalSnap = { x: sw / 2, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX < cornerThreshold && e.clientY > sh - taskbarHeight - cornerThreshold) {
                // Bottom-Left Quarter
                finalSnap = { x: 0, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientX > sw - cornerThreshold && e.clientY > sh - taskbarHeight - cornerThreshold) {
                // Bottom-Right Quarter
                finalSnap = { x: sw / 2, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
            } else if (e.clientY < edgeThreshold) {
                // Maximize
                finalSnap = { x: 0, y: 0, width: sw, height: sh - taskbarHeight };
            } else if (e.clientX < edgeThreshold) {
                // Left Half
                finalSnap = { x: 0, y: 0, width: sw / 2, height: sh - taskbarHeight };
            } else if (e.clientX > sw - edgeThreshold) {
                // Right Half
                finalSnap = { x: sw / 2, y: 0, width: sw / 2, height: sh - taskbarHeight };
            }

            if (finalSnap) {
                useWindowStore.getState().updatePosition(window.id, { x: finalSnap.x, y: finalSnap.y });
                useWindowStore.getState().updateSize(window.id, { width: finalSnap.width, height: finalSnap.height });
            }
            useSnapPreviewStore.getState().setSnapPreview(null);
        }

        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection(null);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            globalThis.addEventListener('pointermove', handlePointerMove);
            globalThis.addEventListener('pointerup', handlePointerUp);
        } else {
            globalThis.removeEventListener('pointermove', handlePointerMove);
            globalThis.removeEventListener('pointerup', handlePointerUp);
        }

        return () => {
            globalThis.removeEventListener('pointermove', handlePointerMove);
            globalThis.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, isResizing, dragOffset, resizeDirection, window.position.x, window.position.y, window.size.width, window.size.height]);

    // Apply global body cursor overlays during drag/resize to prevent cursor flickering
    useEffect(() => {
        if (isDragging) {
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        } else if (isResizing && resizeDirection) {
            const cursorMap: Record<string, string> = {
                'n': 'n-resize',
                's': 's-resize',
                'e': 'e-resize',
                'w': 'w-resize',
                'ne': 'ne-resize',
                'nw': 'nw-resize',
                'se': 'se-resize',
                'sw': 'sw-resize'
            };
            document.body.style.cursor = cursorMap[resizeDirection] || 'default';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, isResizing, resizeDirection]);

    const appDef = appRegistry.get(window.appId);
    const content = appDef ? createElement(appDef.component) : null;

    // Define theme styling configurations based on osStyle, colorMode and glass
    let themeContainerClasses = "";
    let themeHeaderClasses = "";

    if (osStyle === "win7-aero") {
      themeContainerClasses = "bg-slate-900/40 backdrop-blur-2xl border border-white/30 text-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)]";
      themeHeaderClasses = "bg-white/10 border-b border-white/20 text-white";
    } else if (glass) {
      // Glass theme: the refined frosted glass-pane treatment.
      themeContainerClasses = "glass-pane text-[var(--text)] rounded-2xl";
      themeHeaderClasses = "bg-white/[0.04] border-b border-white/10 text-[var(--text)] rounded-t-2xl";
    } else {
      // Windows 11 / Light / Dark all share this — driven entirely by CSS
      // vars so Light actually renders light and Dark actually renders
      // dark, instead of every theme getting the same hardcoded slate chrome.
      themeContainerClasses = "border rounded-lg shadow-[0_15px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl";
      themeHeaderClasses = "border-b";
    }

    const themeChromeStyle: React.CSSProperties =
      osStyle === "win7-aero" || glass
        ? {}
        : { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" };
    const themeHeaderStyle: React.CSSProperties =
      osStyle === "win7-aero" || glass
        ? {}
        : { background: "var(--muted)", borderColor: "var(--border)", color: "var(--text)" };

    // Add active shadow/highlight classes
    let activeHighlightClasses = "";
    if (window.isFocused) {
      if (osStyle === "win7-aero") {
        activeHighlightClasses = "border-sky-400/40 shadow-[0_0_25px_rgba(255,255,255,0.25)] ring-1 ring-sky-400/20";
      } else if (glass) {
        activeHighlightClasses = "ring-1 ring-violet-300/30 shadow-[0_25px_60px_-15px_rgba(139,92,246,0.45)]";
      } else {
        activeHighlightClasses = "shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-[var(--border)]";
      }
    } else {
      if (osStyle === "win7-aero") {
        activeHighlightClasses = "shadow-[0_0_10px_rgba(255,255,255,0.05)] opacity-85";
      } else if (glass) {
        activeHighlightClasses = "opacity-90";
      } else {
        activeHighlightClasses = "shadow-lg opacity-90";
      }
    }

    const isMac = false;
    const isRetro = false;

    return (
        <div
            ref={windowRef}
            className={`
                window-instance
                absolute
                overflow-hidden
                select-none
                animate-window-open
                flex
                flex-col
                ${themeContainerClasses}
                ${activeHighlightClasses}
                ${(window.isMinimized || !belongsToActiveWorkspace) ? 'hidden pointer-events-none' : 'opacity-100 scale-100'}
                ${(isDragging || isResizing) ? '' : 'transition-all duration-200 ease-out'}
            `}
            style={{
                left: window.isMaximized ? 0 : position.x,
                top: window.isMaximized ? 0 : position.y,
                width: window.isMaximized ? '100vw' : size.width,
                height: window.isMaximized ? 'calc(100vh - 48px)' : size.height,
                zIndex: window.isFocused
                    ? Z_INDEX.ACTIVE_WINDOW_BASE + window.zIndex
                    : Z_INDEX.WINDOWS_BASE + window.zIndex,
                ...themeChromeStyle,
            }}
            onPointerDownCapture={(e) => {
                if (e.target instanceof HTMLElement && e.target.closest('button')) {
                    return;
                }
                focusWindow(window.id);
            }}
        >
            {isMac ? (
                <div
                    onPointerDown={handlePointerDown}
                    className={`flex items-center px-4 py-2.5 cursor-grab select-none shrink-0 ${themeHeaderClasses} ${isDragging ? 'cursor-grabbing' : ''}`}
                >
                    {/* macOS traffic light window controls with exact visual specifications */}
                    <div className="flex gap-1.5 w-16 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeWindow(window.id);
                            }}
                            className="w-3 h-3 rounded-full bg-[#ff5f56] flex items-center justify-center text-[7px] text-rose-950 font-bold group cursor-pointer border-none outline-none hover:brightness-95 transition-all"
                            title="Close"
                        >
                            <span className="opacity-0 group-hover:opacity-100">✕</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                minimizeWindow(window.id);
                            }}
                            className="w-3 h-3 rounded-full bg-[#ffbd2e] flex items-center justify-center text-[7px] text-amber-950 font-bold group cursor-pointer border-none outline-none hover:brightness-95 transition-all"
                            title="Minimize"
                        >
                            <span className="opacity-0 group-hover:opacity-100">−</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.isMaximized) {
                                    restoreWindow(window.id);
                                } else {
                                    maximizeWindow(window.id);
                                }
                            }}
                            className="w-3 h-3 rounded-full bg-[#27c93f] flex items-center justify-center text-[7px] text-emerald-950 font-bold group cursor-pointer border-none outline-none hover:brightness-95 transition-all"
                            title={window.isMaximized ? "Restore" : "Maximize"}
                        >
                            <span className="opacity-0 group-hover:opacity-100">＋</span>
                        </button>
                    </div>

                    {/* Centered Title */}
                    <div className="flex-1 text-center font-semibold text-xs tracking-wide select-none">
                        {window.title}
                    </div>

                    {/* Empty spacer to balance layout */}
                    <div className="w-16 shrink-0" />
                </div>
            ) : (
                <div
                    onPointerDown={handlePointerDown}
                    className={`flex items-center justify-between px-3 py-1.5 cursor-grab select-none shrink-0 ${themeHeaderClasses} ${isDragging ? 'cursor-grabbing' : ''}`}
                    style={themeHeaderStyle}
                >
                    <span className={`font-semibold text-xs tracking-wide ${isRetro ? 'font-sans font-bold text-white' : ''}`}>
                        {window.title}
                    </span>

                    <div className="flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                minimizeWindow(window.id);
                            }}
                            className={isRetro 
                              ? "w-4 h-4 rounded-none bg-[#c0c0c0] text-black font-bold flex items-center justify-center text-[9px] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white outline-none cursor-pointer"
                              : "w-5 h-5 rounded-md hover:bg-[var(--border)]/40 hover:text-[var(--text)] transition flex items-center justify-center text-xs text-[var(--muted)] font-bold cursor-pointer"
                            }
                            title="Minimize"
                        >
                            {isRetro ? "_" : "−"}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.isMaximized) {
                                    restoreWindow(window.id);
                                } else {
                                    maximizeWindow(window.id);
                                }
                            }}
                            className={isRetro 
                              ? "w-4 h-4 rounded-none bg-[#c0c0c0] text-black font-bold flex items-center justify-center text-[9px] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white outline-none cursor-pointer"
                              : "w-5 h-5 rounded-md hover:bg-[var(--border)]/40 hover:text-[var(--text)] transition flex items-center justify-center text-xs text-[var(--muted)] font-bold cursor-pointer"
                            }
                            title={window.isMaximized ? "Restore" : "Maximize"}
                        >
                            {isRetro ? (window.isMaximized ? "🗗" : "🗖") : (window.isMaximized ? "❐" : "□")}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeWindow(window.id);
                            }}
                            className={isRetro 
                              ? "w-4 h-4 rounded-none bg-[#c0c0c0] text-black font-bold flex items-center justify-center text-[9px] border-2 border-t-white border-l-white border-b-zinc-700 border-r-zinc-700 active:border-t-zinc-700 active:border-l-zinc-700 active:border-b-white active:border-r-white outline-none cursor-pointer"
                              : osStyle === "win7-aero"
                              ? "w-5 h-5 rounded-md hover:bg-rose-600 hover:text-white hover:shadow-[0_0_12px_rgba(244,63,94,0.9)] transition flex items-center justify-center text-xs text-white/80 font-bold cursor-pointer border border-white/20"
                              : "w-5 h-5 rounded-md hover:bg-rose-600 hover:text-white transition flex items-center justify-center text-xs text-[var(--muted)] hover:text-zinc-100 font-bold cursor-pointer"
                            }
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex-1 min-h-0 overflow-auto relative ${isRetro ? 'border-t-2 border-l-2 border-t-zinc-800 border-l-zinc-800 border-b-2 border-r-2 border-b-white border-r-white bg-white m-1' : ''}`}>
                {content}
            </div>

            {/* Resize handles */}
            {!window.isMaximized && !isMobile && (
                <>
                    {/* Corners */}
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'se')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
                    />
                    <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
                    />
                    <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
                    />
                    {/* Edges */}
                    <div
                        className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'n')}
                    />
                    <div
                        className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 's')}
                    />
                    <div
                        className="absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'w')}
                    />
                    <div
                        className="absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize z-50"
                        onPointerDown={(e) => handleResizePointerDown(e, 'e')}
                    />
                </>
            )}
        </div>
    );
}