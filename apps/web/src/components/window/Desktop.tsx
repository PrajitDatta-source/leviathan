"use client";

import { useWindowStore, useWorkspaceStore, useSnapPreviewStore } from "@/core/window/manager";
import { Window } from "./Window";

export function Desktop() {
    const windows = useWindowStore(state => state.windows);
    const windowWorkspaces = useWorkspaceStore(state => state.windowWorkspaces);
    const activeWorkspace = useWorkspaceStore(state => state.activeWorkspace);
    const preview = useSnapPreviewStore(state => state.snapPreview);
    
    // Filter windows to render only the ones belonging to the current workspace
    const workspaceWindows = Object.values(windows).filter(
        w => windowWorkspaces[w.id] === activeWorkspace
    );

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

            {workspaceWindows.map(window => (
                <Window
                    key={window.id}
                    window={window}
                />
            ))}
        </>
    );
}