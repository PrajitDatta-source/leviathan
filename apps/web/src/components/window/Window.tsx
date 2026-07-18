"use client";

import { WindowInstance } from "@/core/window/types";
import { useWindowManager } from "@/core/window/hooks";
import { useState, useRef, useEffect } from "react";

type Props = {
    window: WindowInstance;
};

export function Window({ window }: Props) {

    const manager = useWindowManager();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w' | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    // Mobile screen responsive check
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(globalThis.innerWidth < 768);
        checkMobile();
        globalThis.addEventListener("resize", checkMobile);
        return () => globalThis.removeEventListener("resize", checkMobile);
    }, []);

    const position = {
        x: isMobile ? 0 : window.x,
        y: isMobile ? 0 : window.y,
    };
    const size = {
        width: isMobile ? (typeof globalThis !== "undefined" ? globalThis.innerWidth : 400) : window.width,
        height: isMobile ? (typeof globalThis !== "undefined" ? globalThis.innerHeight - 48 : 600) : window.height,
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isMobile) return; // Disable dragging on mobile (fixed full-screen stack)
        if (e.target instanceof HTMLElement && e.target.closest('button')) {
            return;
        }
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - window.x,
            y: e.clientY - window.y,
        });
        manager.focus(window.id);
    };

    const handleResizePointerDown = (e: React.PointerEvent, direction: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w') => {
        e.stopPropagation();
        if (isMobile) return; // Disable resizing on mobile
        setIsResizing(true);
        setResizeDirection(direction);
        manager.focus(window.id);
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            manager.updatePositionAndSize(window.id, newX, newY, window.width, window.height);

            // Snapping preview calculations
            const edgeThreshold = 20;
            const cornerThreshold = 60;
            const { innerWidth: sw, innerHeight: sh } = globalThis;
            const taskbarHeight = 48;

            let preview = null;

            if (e.clientY < edgeThreshold) {
                preview = { x: 0, y: 0, width: sw, height: sh - taskbarHeight };
            } else if (e.clientX < edgeThreshold) {
                if (e.clientY < cornerThreshold) {
                    preview = { x: 0, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else if (e.clientY > sh - taskbarHeight - cornerThreshold) {
                    preview = { x: 0, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else {
                    preview = { x: 0, y: 0, width: sw / 2, height: sh - taskbarHeight };
                }
            } else if (e.clientX > sw - edgeThreshold) {
                if (e.clientY < cornerThreshold) {
                    preview = { x: sw / 2, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else if (e.clientY > sh - taskbarHeight - cornerThreshold) {
                    preview = { x: sw / 2, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else {
                    preview = { x: sw / 2, y: 0, width: sw / 2, height: sh - taskbarHeight };
                }
            }

            manager.setSnapPreview(preview);
        }

        if (isResizing && resizeDirection) {
            const minSize = 300;
            let newWidth = window.width;
            let newHeight = window.height;
            let newX = window.x;
            let newY = window.y;

            if (resizeDirection.includes('e')) {
                newWidth = Math.max(minSize, e.clientX - window.x);
            }
            if (resizeDirection.includes('w')) {
                const delta = window.x - e.clientX;
                newWidth = Math.max(minSize, window.width + delta);
                newX = window.x - (newWidth - window.width);
            }
            if (resizeDirection.includes('s')) {
                newHeight = Math.max(minSize, e.clientY - window.y);
            }
            if (resizeDirection.includes('n')) {
                const delta = window.y - e.clientY;
                newHeight = Math.max(minSize, window.height + delta);
                newY = window.y - (newHeight - window.height);
            }

            manager.updatePositionAndSize(window.id, newX, newY, newWidth, newHeight);
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        if (isDragging) {
            const edgeThreshold = 20;
            const cornerThreshold = 60;
            const { innerWidth: sw, innerHeight: sh } = globalThis;
            const taskbarHeight = 48;

            let finalSnap = null;

            if (e.clientY < edgeThreshold) {
                finalSnap = { x: 0, y: 0, width: sw, height: sh - taskbarHeight };
            } else if (e.clientX < edgeThreshold) {
                if (e.clientY < cornerThreshold) {
                    finalSnap = { x: 0, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else if (e.clientY > sh - taskbarHeight - cornerThreshold) {
                    finalSnap = { x: 0, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else {
                    finalSnap = { x: 0, y: 0, width: sw / 2, height: sh - taskbarHeight };
                }
            } else if (e.clientX > sw - edgeThreshold) {
                if (e.clientY < cornerThreshold) {
                    finalSnap = { x: sw / 2, y: 0, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else if (e.clientY > sh - taskbarHeight - cornerThreshold) {
                    finalSnap = { x: sw / 2, y: (sh - taskbarHeight) / 2, width: sw / 2, height: (sh - taskbarHeight) / 2 };
                } else {
                    finalSnap = { x: sw / 2, y: 0, width: sw / 2, height: sh - taskbarHeight };
                }
            }

            if (finalSnap) {
                manager.updatePositionAndSize(window.id, finalSnap.x, finalSnap.y, finalSnap.width, finalSnap.height);
            }
            manager.setSnapPreview(null);
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
    }, [isDragging, isResizing, dragOffset, resizeDirection, window.x, window.y, window.width, window.height]);

    return (
        <div
            ref={windowRef}
            className={`
                window-instance
                absolute
                overflow-hidden
                rounded-xl
                border
                text-[var(--text)]
                shadow-2xl
                select-none
                animate-window-open
                ${window.focused ? 'border-violet-500/70 shadow-xl shadow-violet-500/5 z-40' : 'border-[var(--border)] bg-[var(--surface)]'}
                ${window.minimized ? 'hidden' : ''}
                ${(isDragging || isResizing) ? '' : 'transition-[width,height,left,top] duration-200 ease-out'}
            `}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: window.zIndex,
            }}
            onPointerDownCapture={() => manager.focus(window.id)}
        >

            <div
                onPointerDown={handlePointerDown}
                className={`
                    flex
                    items-center
                    justify-between
                    border-b
                    border-[var(--border)]
                    bg-[var(--surface)]
                    brightness-110
                    px-4
                    py-2.5
                    cursor-grab
                    select-none
                    ${isDragging ? 'cursor-grabbing' : ''}
                `}
            >

                <span className="font-medium">
                    {window.title}
                </span>

                <div className="flex gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.minimized) {
                                manager.restore(window.id);
                            } else if (window.maximized) {
                                manager.restore(window.id);
                            } else {
                                manager.minimize(window.id);
                            }
                        }}
                        className="
                            rounded
                            px-2
                            transition
                            hover:bg-[var(--border)]
                        "
                        title={window.minimized ? "Restore" : "Minimize"}
                    >
                        {window.minimized ? "□" : "−"}
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.maximized) {
                                manager.restore(window.id);
                            } else {
                                manager.maximize(window.id);
                            }
                        }}
                        className="
                            rounded
                            px-2
                            transition
                            hover:bg-[var(--border)]
                        "
                        title={window.maximized ? "Restore" : "Maximize"}
                    >
                        {window.maximized ? "❐" : "□"}
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            manager.close(window.id);
                        }}
                        className="
                            rounded
                            px-2
                            transition
                            hover:bg-red-600
                            hover:text-white
                        "
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

            </div>

            <div
                className="h-[calc(100%-52px)] overflow-auto"
            >
                {window.content}
            </div>

            {/* Resize handles */}
            {!window.maximized && !isMobile && (
                <>
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'se')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
                    />
                    <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
                    />
                    <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
                    />
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-n-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'n')}
                    />
                    <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-s-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 's')}
                    />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'w')}
                    />
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-e-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, 'e')}
                    />
                </>
            )}

        </div>
    );
}