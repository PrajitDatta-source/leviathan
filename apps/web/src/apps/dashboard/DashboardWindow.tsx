"use client";

import React, { useState, useEffect } from "react";
import { vfs, VFSNode } from "@/modules/filesystem/vfs";
import { useWindowManager } from "@/core/window/hooks";
import { NotesWindow } from "../notes/NotesWindow";
import { Clock, Cpu, CheckSquare, FileText, Plus, Trash2 } from "lucide-react";

interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

export function DashboardWindow() {
  const manager = useWindowManager();
  const [time, setTime] = useState(new Date());
  
  // Simulated Resource stats
  const [cpu, setCpu] = useState(24);
  const [ram, setRam] = useState(58);
  const [storage, setStorage] = useState(38);

  // Notes lists
  const [recentNotes, setRecentNotes] = useState<VFSNode[]>([]);

  // Tasks lists
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskInput, setTaskInput] = useState("");

  useEffect(() => {
    // Clock tick
    const timer = setInterval(() => setTime(new Date()), 1000);

    // Fluctuating system metrics
    const statsTimer = setInterval(() => {
      setCpu((prev) => Math.max(5, Math.min(95, prev + (Math.random() * 8 - 4))));
      setRam((prev) => Math.max(30, Math.min(90, prev + (Math.random() * 2 - 1))));
    }, 3000);

    // Load VFS notes
    const loadNotes = () => {
      const rootFolders = vfs.getChildren(null);
      const home = rootFolders.find((n) => n.name === "Home");
      if (home) {
        const homeChildren = vfs.getChildren(home.id);
        const notesFolder = homeChildren.find((n) => n.name === "Notes" && n.type === "folder");
        if (notesFolder) {
          const mdFiles = vfs.getChildren(notesFolder.id).filter((n) => n.name.endsWith(".md"));
          setRecentNotes(mdFiles.slice(0, 4));
        }
      }
    };
    loadNotes();

    // Load tasks list from storage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_dashboard_tasks");
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        setTasks([
          { id: "1", text: "Take notes in markdown", completed: true },
          { id: "2", text: "Experiment with Snapping layout grids", completed: false },
          { id: "3", text: "Customize wallpaper settings", completed: false },
        ]);
      }
    }

    return () => {
      clearInterval(timer);
      clearInterval(statsTimer);
    };
  }, []);

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_dashboard_tasks", JSON.stringify(newTasks));
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      text: taskInput.trim(),
      completed: false,
    };
    const list = [...tasks, newTask];
    saveTasks(list);
    setTaskInput("");
  };

  const toggleTask = (id: string) => {
    const list = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(list);
  };

  const deleteTask = (id: string) => {
    const list = tasks.filter((t) => t.id !== id);
    saveTasks(list);
  };

  const handleOpenNote = () => {
    manager.open({
      id: "notes",
      title: "Notes",
      content: React.createElement(NotesWindow),
      width: 800,
      height: 550,
    });
  };

  return (
    <div className="h-full bg-[var(--background)] p-6 overflow-y-auto select-none text-[var(--text)]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Welcome Section */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-light tracking-wide text-zinc-100">
            Welcome to <span className="font-semibold text-violet-400">Leviathan Desktop</span>
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Everything in your digital workspace, organized in one central dashboard.
          </p>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Time & Date Widget */}
          <div className="flex gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] items-center">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">
                {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs text-[var(--muted)] mt-0.5">
                {time.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
          </div>

          {/* System CPU & RAM Resources */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span>System Resource Monitor</span>
            </div>

            <div className="space-y-2.5">
              {/* CPU */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>CPU Threads</span>
                  <span className="font-mono">{Math.round(cpu)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${cpu}%` }}
                  />
                </div>
              </div>

              {/* RAM */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Memory RAM</span>
                  <span className="font-mono">{Math.round(ram)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${ram}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Todo Widget */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              <CheckSquare className="w-4 h-4 text-violet-400" />
              <span>Personal Task Checklist</span>
            </div>

            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--text)] outline-none placeholder-[var(--muted)]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
              >
                Add
              </button>
            </form>

            <div className="space-y-2 overflow-y-auto max-h-[140px] pr-1">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-xs text-[var(--muted)]">No active tasks.</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-2 bg-[var(--background)]/30 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        className="w-3.5 h-3.5 accent-violet-500 rounded border-[var(--border)] bg-transparent cursor-pointer"
                      />
                      <span className={`truncate ${task.completed ? "line-through text-zinc-500" : ""}`}>
                        {task.text}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-zinc-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* VFS Notes Quicklinks Widget */}
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                <FileText className="w-4 h-4 text-violet-400" />
                <span>Recent Markdown Notes</span>
              </div>
              <button
                onClick={handleOpenNote}
                className="text-[10px] font-semibold text-violet-400 hover:underline"
              >
                Open Notes App
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[180px]">
              {recentNotes.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--muted)]">
                  No note files found in VFS /Home/Notes folder.
                </div>
              ) : (
                recentNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={handleOpenNote}
                    className="flex items-center gap-3 p-2.5 bg-[var(--background)]/30 hover:bg-[var(--border)]/30 rounded-lg cursor-pointer transition text-xs"
                  >
                    <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{note.name.replace(/\.md$/, "")}</div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">
                        Last edited: {new Date(note.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
