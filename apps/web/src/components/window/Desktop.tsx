"use client";

import { useWindowStore, useWorkspaceStore, useSnapPreviewStore } from "@/core/window/manager";
import { Window } from "./Window";

export function Desktop() {
    const windows = useWindowStore(state => state.windows);
    const windowWorkspaces = useWorkspaceStore(state => state.windowWorkspaces);
    const activeWorkspace = useWorkspaceStore(state => state.activeWorkspace);
    const preview = useSnapPreviewStore(state => state.snapPreview);
    
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

            {Object.values(windows).map(window => (
                <Window
                    key={window.id}
                    window={window}
                />
            ))}
        </>
    );
}