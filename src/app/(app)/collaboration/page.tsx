"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Kanban, CheckCircle2, Circle, Clock, ArrowLeft, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader, SectionMarker, EmptyPlate } from "@/components/wayfinding/PageChrome";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const typeIcons: Record<string, any> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  TASK: Circle,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function CollaborationPage() {
  const { data: boards, mutate } = useSWR("/api/boards", fetcher);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardDesc, setNewBoardDesc] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const allBoards = boards || [];
  const activeBoard = allBoards.find((b: any) => b.id === selectedBoardId);

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle, description: newBoardDesc }),
      });
      if (!res.ok) throw new Error();
      toast.success("Board created!");
      setShowNewBoard(false);
      setNewBoardTitle("");
      setNewBoardDesc("");
      await mutate();
    } catch {
      toast.error("Failed to create board");
    }
  };

  const addTask = async (boardId: string, type: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/boards/${boardId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, type }),
      });
      if (!res.ok) throw new Error();
      setNewTaskTitle("");
      setShowNewTask(false);
      await mutate();
    } catch {
      toast.error("Failed to add task");
    }
  };

  const updateItemType = async (boardId: string, itemId: string, newType: string) => {
    // Optimistic: move the card locally, then persist.
    mutate(
      (current: any) =>
        (current || []).map((b: any) =>
          b.id === boardId
            ? { ...b, items: b.items.map((it: any) => (it.id === itemId ? { ...it, type: newType } : it)) }
            : b
        ),
      { revalidate: false }
    );
    try {
      await fetch(`/api/boards/${boardId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, type: newType }),
      });
      mutate();
    } catch {
      toast.error("Failed to move card");
      mutate();
    }
  };

  const onDropToColumn = (boardId: string, status: string) => {
    if (draggingId) updateItemType(boardId, draggingId, status);
    setDraggingId(null);
    setDragOverCol(null);
  };

  const deleteItem = async (boardId: string, itemId: string) => {
    try {
      await fetch(`/api/boards/${boardId}/items?itemId=${itemId}`, { method: "DELETE" });
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl">
      <motion.div variants={item}>
        <PageHeader
          code="L3 · COLLABORATION"
          title="Shared planning boards"
          subtitle="Shared boards for everyone on the platform — drag cards between columns to move them."
          action={
            <Button onClick={() => setShowNewBoard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Board
            </Button>
          }
        />
      </motion.div>

      {showNewBoard && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-3">
              <Input
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="Board name..."
                autoFocus
              />
              <Input
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Description (optional)..."
              />
              <div className="flex gap-2">
                <Button onClick={createBoard}>Create Board</Button>
                <Button variant="outline" onClick={() => setShowNewBoard(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!activeBoard ? (
        <motion.div variants={item}>
          {allBoards.length === 0 && !showNewBoard ? (
            <EmptyPlate
              code="L3 · EMPTY"
              title="No boards yet"
              hint="Create collaborative planning boards to brainstorm, share inspiration, and coordinate events."
              icon={<Kanban className="h-8 w-8" strokeWidth={1.5} />}
              action={
                <Button onClick={() => setShowNewBoard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Board
                </Button>
              }
            />
          ) : (
            <div className="grid gap-px bg-black/[0.08] dark:bg-white/[0.08] rounded-xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] md:grid-cols-2">
              {allBoards.map((board: any, idx: number) => {
                const todoCount = board.items?.filter((i: any) => i.type === "TODO" || i.type === "TASK").length || 0;
                const inProgressCount = board.items?.filter((i: any) => i.type === "IN_PROGRESS").length || 0;
                const doneCount = board.items?.filter((i: any) => i.type === "DONE").length || 0;
                const total = board.items?.length || 0;
                const progress = total > 0 ? (doneCount / total) * 100 : 0;

                return (
                  <div
                    key={board.id}
                    className="group cursor-pointer bg-card p-5 hover:bg-[hsl(var(--sage)/0.06)] transition-colors"
                    onClick={() => setSelectedBoardId(board.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-display text-xl leading-tight mt-2">{board.title}</h3>
                        {board.description && (
                          <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
                        )}
                      </div>
                      <Kanban className="h-5 w-5 text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))] shrink-0" strokeWidth={1.5} />
                    </div>

                    {total > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>{doneCount}/{total} tasks complete</span>
                          <span className="tabular-nums">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[hsl(var(--terracotta))] dark:bg-[hsl(var(--terracotta-soft))] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="h-3 w-3" />
                        {todoCount} todo
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <Clock className="h-3 w-3" />
                        {inProgressCount} active
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {doneCount} done
                      </div>
                    </div>

                    <p className="wayfinding text-muted-foreground mt-4">
                      By {board.user?.name}
                      {board.members?.length > 0 && ` · ${board.members.length} member${board.members.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBoardId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-8 w-px bg-black/[0.12] dark:bg-white/[0.12]" />
            <div>
              <h2 className="font-display text-2xl leading-tight">{activeBoard.title}</h2>
              {activeBoard.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{activeBoard.description}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {(["TODO", "IN_PROGRESS", "DONE"] as const).map((status) => {
              const statusLabel = status === "TODO" ? "To Do" : status === "IN_PROGRESS" ? "In Progress" : "Done";
              const StatusIcon = typeIcons[status] || Circle;
              const tasks = (activeBoard.items || []).filter((i: any) => i.type === status || (status === "TODO" && i.type === "TASK"));
              const nextStatus = status === "TODO" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "DONE" : "TODO";

              return (
                <div
                  key={status}
                  className={`space-y-3 rounded-2xl p-2 transition-colors ${dragOverCol === status ? "bg-primary/[0.06] ring-1 ring-primary/20" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
                  onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverCol(null); }}
                  onDrop={() => onDropToColumn(activeBoard.id, status)}
                >
                  <div className="flex items-center gap-2 px-1 pb-2 border-b border-black/[0.09] dark:border-white/[0.09]">
                    <StatusIcon className={`h-4 w-4 ${status === "DONE" ? "text-emerald-400" : status === "IN_PROGRESS" ? "text-amber-400" : "text-muted-foreground"}`} />
                    <span className="wayfinding text-black/70 dark:text-white/70">{statusLabel}</span>
                    <Badge variant="secondary" className="ml-auto tabular-nums">{tasks.length}</Badge>
                  </div>

                  <div className="space-y-2 min-h-[40px]">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingId(task.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                        className={`p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-card hover:border-black/[0.15] dark:hover:border-white/[0.15] transition-all duration-200 group/task cursor-grab active:cursor-grabbing ${draggingId === task.id ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => updateItemType(activeBoard.id, task.id, nextStatus)}
                            className="mt-0.5 shrink-0"
                          >
                            <StatusIcon className={`h-4 w-4 ${status === "DONE" ? "text-emerald-400" : status === "IN_PROGRESS" ? "text-amber-400" : "text-muted-foreground"} hover:text-primary transition-colors`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            {task.content && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{task.content}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteItem(activeBoard.id, task.id)}
                            className="p-1 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/task:opacity-100 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {status === "TODO" && (
                    <div>
                      {showNewTask ? (
                        <div className="flex gap-2">
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && addTask(activeBoard.id, "TODO")}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => addTask(activeBoard.id, "TODO")} className="h-8">
                            Add
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewTask(true)}
                          className="w-full p-2 rounded-xl border border-dashed border-black/[0.08] dark:border-white/[0.08] text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
                        >
                          + Add task
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
