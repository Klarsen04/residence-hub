"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Kanban, GripVertical, CheckCircle2, Circle, Clock, ArrowLeft, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

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

  const allBoards = boards || [];
  const activeBoard = allBoards.find((b: any) => b.id === selectedBoardId);

  const createBoard = async () => {
    if (!newBoardTitle.trim()) return;
    try {
      await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle, description: newBoardDesc }),
      });
      toast.success("Board created!");
      setShowNewBoard(false);
      setNewBoardTitle("");
      setNewBoardDesc("");
      mutate();
    } catch {
      toast.error("Failed to create board");
    }
  };

  const addTask = async (boardId: string, type: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      await fetch(`/api/boards/${boardId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, type }),
      });
      setNewTaskTitle("");
      setShowNewTask(false);
      mutate();
    } catch {
      toast.error("Failed to add task");
    }
  };

  const updateItemType = async (boardId: string, itemId: string, newType: string) => {
    try {
      await fetch(`/api/boards/${boardId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, type: newType }),
      });
      mutate();
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteItem = async (boardId: string, itemId: string) => {
    try {
      await fetch(`/api/boards/${boardId}/items?itemId=${itemId}`, { method: "DELETE" });
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const boardColors = ["from-purple-500 to-indigo-500", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500"];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaboration</h1>
          <p className="text-muted-foreground mt-1">Plan together with your team</p>
        </div>
        <Button onClick={() => setShowNewBoard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </motion.div>

      {showNewBoard && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-purple-500/20">
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
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-2xl bg-purple-500/10">
                    <Kanban className="h-12 w-12 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No boards yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Create collaborative planning boards to brainstorm, share inspiration, and coordinate events.
                  </p>
                </div>
                <Button onClick={() => setShowNewBoard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Board
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {allBoards.map((board: any, idx: number) => {
                const color = boardColors[idx % boardColors.length];
                const todoCount = board.items?.filter((i: any) => i.type === "TODO" || i.type === "TASK").length || 0;
                const inProgressCount = board.items?.filter((i: any) => i.type === "IN_PROGRESS").length || 0;
                const doneCount = board.items?.filter((i: any) => i.type === "DONE").length || 0;
                const total = board.items?.length || 0;
                const progress = total > 0 ? (doneCount / total) * 100 : 0;

                return (
                  <Card
                    key={board.id}
                    className="cursor-pointer hover:border-white/[0.15] hover:-translate-y-1 group overflow-hidden"
                    onClick={() => setSelectedBoardId(board.id)}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${color}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{board.title}</h3>
                          {board.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>
                          )}
                        </div>
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${color} opacity-80`}>
                          <Kanban className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      {total > 0 && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>{doneCount}/{total} tasks complete</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
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

                      <p className="text-[11px] text-muted-foreground mt-3">
                        Created by {board.user?.name}
                        {board.members?.length > 0 && ` • ${board.members.length} member${board.members.length > 1 ? "s" : ""}`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBoardId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-purple-500 to-blue-500" />
            <div>
              <h2 className="font-semibold text-lg">{activeBoard.title}</h2>
              {activeBoard.description && (
                <p className="text-xs text-muted-foreground">{activeBoard.description}</p>
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
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <StatusIcon className={`h-4 w-4 ${status === "DONE" ? "text-emerald-400" : status === "IN_PROGRESS" ? "text-amber-400" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{statusLabel}</span>
                    <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-white/[0.08] bg-card/50 hover:border-white/[0.15] transition-all duration-200 group/task"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => updateItemType(activeBoard.id, task.id, nextStatus)}
                            className="mt-0.5 shrink-0"
                          >
                            <StatusIcon className={`h-4 w-4 ${status === "DONE" ? "text-emerald-400" : status === "IN_PROGRESS" ? "text-amber-400" : "text-muted-foreground"} hover:text-purple-400 transition-colors`} />
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
                          className="w-full p-2 rounded-xl border border-dashed border-white/[0.08] text-xs text-muted-foreground hover:border-purple-500/30 hover:text-purple-400 transition-all"
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
