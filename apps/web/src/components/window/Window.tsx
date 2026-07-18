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
        const sw = typeof globalThis !== "undefined" ? globalThis.innerWidth : 1200;
        const sh = typeof globalThis !== "undefined" ? globalThis.innerHeight : 800;
        const taskbarHeight = 48;

        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            // Constrain newX so at least 60px of the window width remains visible inside screen boundaries
            const boundedX = Math.max(60 - window.width, Math.min(sw - 60, newX));
            // Constrain newY so the title bar (approx 40px) stays visible underneath the top viewport and above the taskbar
            const boundedY = Math.max(0, Math.min(sh - taskbarHeight - 40, newY));

            manager.updatePositionAndSize(window.id, boundedX, boundedY, window.width, window.height);

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

            manager.setSnapPreview(preview);
        }

        if (isResizing && resizeDirection) {
            const minSize = 300;
            let newWidth = window.width;
            let newHeight = window.height;
            let newX = window.x;
            let newY = window.y;

            if (resizeDirection.includes('e')) {
                // Limit width to avoid stretching past right screen edge
                const maxAllowedWidth = sw - window.x;
                newWidth = Math.max(minSize, Math.min(maxAllowedWidth, e.clientX - window.x));
            }
            if (resizeDirection.includes('w')) {
                // Limit width so drag coordinate stays inside left screen edge
                const delta = window.x - e.clientX;
                const maxAllowedWidth = window.width + window.x;
                newWidth = Math.max(minSize, Math.min(maxAllowedWidth, window.width + delta));
                newX = window.x - (newWidth - window.width);
            }
            if (resizeDirection.includes('s')) {
                // Limit height to avoid stretching under the taskbar
                const maxAllowedHeight = sh - taskbarHeight - window.y;
                newHeight = Math.max(minSize, Math.min(maxAllowedHeight, e.clientY - window.y));
            }
            if (resizeDirection.includes('n')) {
                // Limit height to avoid stretching above top screen edge
                const delta = window.y - e.clientY;
                const maxAllowedHeight = window.height + window.y;
                newHeight = Math.max(minSize, Math.min(maxAllowedHeight, window.height + delta));
                newY = window.y - (newHeight - window.height);
            }

            manager.updatePositionAndSize(window.id, newX, newY, newWidth, newHeight);
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
                ${window.minimized ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}
                ${(isDragging || isResizing) ? '' : 'transition-all duration-200 ease-out'}
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