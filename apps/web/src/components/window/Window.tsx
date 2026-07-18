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
    const [position, setPosition] = useState({ x: window.x, y: window.y });
    const [size, setSize] = useState({ width: window.width, height: window.height });
    const windowRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest('button')) {
            return;
        }
        
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
        manager.focus(window.id);
    };

    const handleResizeMouseDown = (e: React.MouseEvent, direction: 'se' | 'sw' | 'ne' | 'nw' | 'n' | 's' | 'e' | 'w') => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        manager.focus(window.id);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            setPosition({ x: newX, y: newY });
        }

        if (isResizing && resizeDirection) {
            const minSize = 300;
            let newWidth = size.width;
            let newHeight = size.height;
            let newX = position.x;
            let newY = position.y;

            if (resizeDirection.includes('e')) {
                newWidth = Math.max(minSize, e.clientX - position.x);
            }
            if (resizeDirection.includes('w')) {
                const delta = position.x - e.clientX;
                newWidth = Math.max(minSize, size.width + delta);
                newX = position.x - (newWidth - size.width);
            }
            if (resizeDirection.includes('s')) {
                newHeight = Math.max(minSize, e.clientY - position.y);
            }
            if (resizeDirection.includes('n')) {
                const delta = position.y - e.clientY;
                newHeight = Math.max(minSize, size.height + delta);
                newY = position.y - (newHeight - size.height);
            }

            setSize({ width: newWidth, height: newHeight });
            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection(null);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            globalThis.addEventListener('mousemove', handleMouseMove);
            globalThis.addEventListener('mouseup', handleMouseUp);
        } else {
            globalThis.removeEventListener('mousemove', handleMouseMove);
            globalThis.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            globalThis.removeEventListener('mousemove', handleMouseMove);
            globalThis.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, resizeDirection, size, position]);

    return (
        <div
            ref={windowRef}
            className={`
                absolute
                overflow-hidden
                rounded-xl
                border
                border-zinc-700
                bg-zinc-900
                shadow-2xl
                select-none
                ${window.minimized ? 'hidden' : ''}
            `}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex: window.zIndex,
                cursor: isDragging ? 'grabbing' : 'default',
            }}
            onMouseDown={handleMouseDown}
        >

            <div
                className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-zinc-700
                    bg-zinc-800
                    px-4
                    py-3
                    cursor-grab
                "
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
                            hover:bg-zinc-700
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
                            hover:bg-zinc-700
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
            {!window.maximized && (
                <>
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                    />
                    <div
                        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                    />
                    <div
                        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                    />
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-n-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
                    />
                    <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-2 cursor-s-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
                    />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
                    />
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-e-resize"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                    />
                </>
            )}

        </div>
    );
}