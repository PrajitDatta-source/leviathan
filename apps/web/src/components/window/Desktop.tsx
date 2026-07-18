"use client";

import { useWindowManager } from "@/core/window/hooks";

import { Window } from "./Window";

export function Desktop() {

    const manager = useWindowManager();
    const preview = manager.snapPreview;

    return (
        <>
            {preview && (
                <div
                    className="fixed pointer-events-none border border-violet-500/40 bg-violet-500/10 backdrop-blur-[1px] rounded-xl transition-all duration-150 z-40"
                    style={{
                        left: preview.x + 8,
                        top: preview.y + 8,
                        width: preview.width - 16,
                        height: preview.height - 16,
                    }}
                />
            )}

            {manager.windows.map(window => (

                <Window
                    key={window.id}
                    window={window}
                />

            ))}

        </>
    );
}