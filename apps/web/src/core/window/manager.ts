import { create } from 'zustand';
import { WindowState, Position, Size, WindowInstance, SnapPreview } from './types';
import { appRegistry } from '@/core/app';

let globalZIndex = 100;

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: {},
  activeWindowId: null,

  openWindow: (appId, title) => {
    const id = `${appId}-${Date.now()}`;
    globalZIndex += 1;
    
    set((state) => ({
      windows: {
        ...state.windows,
        [id]: {
          id,
          appId,
          title,
          position: { x: 100, y: 100 }, 
          size: { width: 800, height: 600 },
          zIndex: globalZIndex,
          isFocused: true,
          isMinimized: false,
          isMaximized: false,
        }
      },
      activeWindowId: id,
    }));
  },

  closeWindow: (id) => {
    set((state) => {
      const newWindows = { ...state.windows };
      delete newWindows[id];
      return { 
        windows: newWindows,
        activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
      };
    });
  },

  focusWindow: (id) => {
    globalZIndex += 1;
    set((state) => {
      if (!state.windows[id]) return state;
      return {
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], zIndex: globalZIndex, isFocused: true }
        },
        activeWindowId: id,
      };
    });
  },

  updatePosition: (id, position) => {
    set((state) => {
      if (!state.windows[id]) return state;
      return {
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], position }
        }
      };
    });
  },

  updateSize: (id, size) => {
    set((state) => {
      if (!state.windows[id]) return state;
      return {
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], size }
        }
      };
    });
  },

  serializeLayout: () => {
    const { windows } = get();
    return JSON.stringify(windows);
  }
}));

// Workspace Store for virtual workspace isolation
export interface WorkspaceState {
  activeWorkspace: number;
  windowWorkspaces: Record<string, number>;
  setActiveWorkspace: (ws: number) => void;
  moveWindowToWorkspace: (id: string, ws: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: 1,
  windowWorkspaces: {},
  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
  moveWindowToWorkspace: (id, ws) => set((state) => ({
    windowWorkspaces: { ...state.windowWorkspaces, [id]: ws }
  }))
}));

// Snap Preview Store for visual dragging helpers
export interface SnapPreviewState {
  snapPreview: SnapPreview | null;
  setSnapPreview: (preview: SnapPreview | null) => void;
}

export const useSnapPreviewStore = create<SnapPreviewState>((set) => ({
  snapPreview: null,
  setSnapPreview: (preview) => set({ snapPreview: preview })
}));

// Helper actions to maintain standard OS windowing workflows
export const focusWindow = (id: string) => {
  useWindowStore.getState().focusWindow(id);
};

export const minimizeWindow = (id: string) => {
  useWindowStore.setState((state) => {
    if (!state.windows[id]) return state;
    
    const updatedWindows = {
      ...state.windows,
      [id]: { ...state.windows[id], isMinimized: true, isFocused: false }
    };

    const activeWorkspace = useWorkspaceStore.getState().activeWorkspace;
    const windowWorkspaces = useWorkspaceStore.getState().windowWorkspaces;
    const workspaceWindows = Object.values(updatedWindows).filter(
      w => windowWorkspaces[w.id] === activeWorkspace && !w.isMinimized
    );

    let nextActiveId = state.activeWindowId === id ? null : state.activeWindowId;
    if (state.activeWindowId === id && workspaceWindows.length > 0) {
      const highest = workspaceWindows.reduce(
        (max, w) => w.zIndex > max.zIndex ? w : max,
        workspaceWindows[0]
      );
      highest.isFocused = true;
      nextActiveId = highest.id;
    }

    return {
      windows: updatedWindows,
      activeWindowId: nextActiveId
    };
  });
};

export const maximizeWindow = (id: string) => {
  useWindowStore.setState((state) => {
    if (!state.windows[id]) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], isMaximized: true, isMinimized: false, isFocused: true }
      },
      activeWindowId: id
    };
  });
};

export const restoreWindow = (id: string) => {
  useWindowStore.setState((state) => {
    if (!state.windows[id]) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], isMaximized: false, isMinimized: false, isFocused: true }
      },
      activeWindowId: id
    };
  });
};

export const closeWindow = (id: string) => {
  useWindowStore.getState().closeWindow(id);
  
  useWindowStore.setState((state) => {
    const activeWorkspace = useWorkspaceStore.getState().activeWorkspace;
    const windowWorkspaces = useWorkspaceStore.getState().windowWorkspaces;
    const workspaceWindows = Object.values(state.windows).filter(
      w => windowWorkspaces[w.id] === activeWorkspace && !w.isMinimized
    );
    
    if (state.activeWindowId === null && workspaceWindows.length > 0) {
      const highest = workspaceWindows.reduce(
        (max, w) => w.zIndex > max.zIndex ? w : max,
        workspaceWindows[0]
      );
      return {
        windows: {
          ...state.windows,
          [highest.id]: { ...state.windows[highest.id], isFocused: true }
        },
        activeWindowId: highest.id
      };
    }
    return state;
  });
};

export const openWindow = (appId: string) => {
  const app = appRegistry.get(appId);
  if (!app) return;

  const currentWorkspace = useWorkspaceStore.getState().activeWorkspace;
  
  // Call original store method
  useWindowStore.getState().openWindow(appId, app.title);
  
  const newId = useWindowStore.getState().activeWindowId;
  if (!newId) return;

  useWorkspaceStore.getState().moveWindowToWorkspace(newId, currentWorkspace);

  const screenWidth = typeof globalThis !== "undefined" ? globalThis.innerWidth : 1200;
  const screenHeight = typeof globalThis !== "undefined" ? globalThis.innerHeight : 800;
  const defaultWidth = app.width || 700;
  const defaultHeight = app.height || 500;

  const windowWorkspaces = useWorkspaceStore.getState().windowWorkspaces;
  const workspaceWindows = Object.values(useWindowStore.getState().windows).filter(
    w => windowWorkspaces[w.id] === currentWorkspace && w.id !== newId
  );
  const lastWindow = workspaceWindows[workspaceWindows.length - 1];

  let finalX = lastWindow ? lastWindow.position.x + 30 : (screenWidth - defaultWidth) / 2;
  let finalY = lastWindow ? lastWindow.position.y + 30 : (screenHeight - defaultHeight - 48) / 2;

  if (finalX + defaultWidth > screenWidth || finalY + defaultHeight > screenHeight - 48) {
    finalX = 60;
    finalY = 60;
  }

  useWindowStore.getState().updatePosition(newId, { x: finalX, y: finalY });
  useWindowStore.getState().updateSize(newId, { width: defaultWidth, height: defaultHeight });
};

let minimizedByShowDesktop: string[] = [];

export const toggleShowDesktop = () => {
  const activeWorkspace = useWorkspaceStore.getState().activeWorkspace;
  const windowWorkspaces = useWorkspaceStore.getState().windowWorkspaces;
  const windows = useWindowStore.getState().windows;
  
  const activeWorkspaceWindows = Object.values(windows).filter(
    w => windowWorkspaces[w.id] === activeWorkspace
  );
  
  const anyVisible = activeWorkspaceWindows.some(w => !w.isMinimized);

  if (anyVisible) {
    const toMinimize = activeWorkspaceWindows.filter(w => !w.isMinimized).map(w => w.id);
    minimizedByShowDesktop = toMinimize;
    
    useWindowStore.setState((state) => {
      const updated = { ...state.windows };
      for (const id of toMinimize) {
        if (updated[id]) {
          updated[id] = { ...updated[id], isMinimized: true, isFocused: false };
        }
      }
      return { 
        windows: updated, 
        activeWindowId: state.activeWindowId && toMinimize.includes(state.activeWindowId) ? null : state.activeWindowId 
      };
    });
  } else {
    const toRestore = minimizedByShowDesktop;
    minimizedByShowDesktop = [];
    
    useWindowStore.setState((state) => {
      const updated = { ...state.windows };
      for (const id of toRestore) {
        if (updated[id]) {
          updated[id] = { ...updated[id], isMinimized: false };
        }
      }
      return { windows: updated };
    });
  }
};

// Pass-through Provider for backward compatibility with AppShell wrap
import React from 'react';
export function WindowManagerProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
