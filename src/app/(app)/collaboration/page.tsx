"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Kanban, GripVertical, MoreHorizontal, CheckCircle2, Circle, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
}

interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: Task[];
}

const defaultBoards: Board[] = [
  {
    id: "1",
    name: "Welcome Week Planning",
    description: "Coordinate all welcome week activities",
    color: "from-purple-500 to-indigo-500",
    tasks: [
      { id: "t1", title: "Book event space for Floor Olympics", assignee: "You", status: "done", priority: "high" },
      { id: "t2", title: "Order supplies for ice cream social", assignee: "Team", status: "in-progress", priority: "medium" },
      { id: "t3", title: "Create flyers for movie night", assignee: "You", status: "todo", priority: "low" },
      { id: "t4", title: "Coordinate with dining hall", assignee: "Team", status: "todo", priority: "high" },
    ],
  },
  {
    id: "2",
    name: "Monthly Programming",
    description: "Regular monthly event planning",
    color: "from-blue-500 to-cyan-500",
    tasks: [
      { id: "t5", title: "Survey residents for event preferences", assignee: "You", status: "in-progress", priority: "medium" },
      { id: "t6", title: "Schedule study break for midterms", assignee: "Team", status: "todo", priority: "high" },
      { id: "t7", title: "Plan wellness Wednesday", assignee: "You", status: "todo", priority: "medium" },
    ],
  },
];

const priorityColors = {
  low: "bg-blue-500/15 text-blue-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

const statusIcons = {
  todo: Circle,
  "in-progress": Clock,
  done: CheckCircle2,
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
  const [boards, setBoards] = useState<Board[]>(defaultBoards);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const addTask = (boardId: string) => {
    if (!newTaskTitle.trim()) return;
    setBoards(boards.map(b => {
      if (b.id === boardId) {
        return {
          ...b,
          tasks: [...b.tasks, {
            id: `t${Date.now()}`,
            title: newTaskTitle,
            assignee: "You",
            status: "todo" as const,
            priority: "medium" as const,
          }],
        };
      }
      return b;
    }));
    setNewTaskTitle("");
    setShowNewTask(false);
    if (selectedBoard?.id === boardId) {
      setSelectedBoard(boards.find(b => b.id === boardId) || null);
    }
  };

  const toggleTaskStatus = (boardId: string, taskId: string) => {
    setBoards(boards.map(b => {
      if (b.id === boardId) {
        return {
          ...b,
          tasks: b.tasks.map(t => {
            if (t.id === taskId) {
              const nextStatus = t.status === "todo" ? "in-progress" : t.status === "in-progress" ? "done" : "todo";
              return { ...t, status: nextStatus };
            }
            return t;
          }),
        };
      }
      return b;
    }));
  };

  const activeBoard = selectedBoard ? boards.find(b => b.id === selectedBoard.id) : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaboration</h1>
          <p className="text-muted-foreground mt-1">Plan together with your team</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </motion.div>

      {!activeBoard ? (
        <motion.div variants={item} className="grid gap-4 md:grid-cols-2">
          {boards.map((board) => {
            const todoCount = board.tasks.filter(t => t.status === "todo").length;
            const inProgressCount = board.tasks.filter(t => t.status === "in-progress").length;
            const doneCount = board.tasks.filter(t => t.status === "done").length;
            const progress = board.tasks.length > 0 ? (doneCount / board.tasks.length) * 100 : 0;

            return (
              <Card
                key={board.id}
                className="cursor-pointer hover:border-white/[0.15] hover:-translate-y-1 group overflow-hidden"
                onClick={() => setSelectedBoard(board)}
              >
                <div className={`h-1.5 bg-gradient-to-r ${board.color}`} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{board.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>
                    </div>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${board.color} opacity-80`}>
                      <Kanban className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{doneCount}/{board.tasks.length} tasks complete</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${board.color} transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Circle className="h-3 w-3 text-muted-foreground" />
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
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBoard(null)}>
              Back
            </Button>
            <div className={`h-6 w-1 rounded-full bg-gradient-to-b ${activeBoard.color}`} />
            <div>
              <h2 className="font-semibold text-lg">{activeBoard.name}</h2>
              <p className="text-xs text-muted-foreground">{activeBoard.description}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {(["todo", "in-progress", "done"] as const).map((status) => {
              const statusLabel = status === "todo" ? "To Do" : status === "in-progress" ? "In Progress" : "Done";
              const StatusIcon = statusIcons[status];
              const tasks = activeBoard.tasks.filter(t => t.status === status);

              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <StatusIcon className={`h-4 w-4 ${status === "done" ? "text-emerald-400" : status === "in-progress" ? "text-amber-400" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">{statusLabel}</span>
                    <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-xl border border-white/[0.08] bg-card/50 hover:border-white/[0.15] transition-all duration-200 cursor-pointer group/task"
                        onClick={() => toggleTaskStatus(activeBoard.id, task.id)}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[11px] text-muted-foreground">{task.assignee}</span>
                              <Badge className={`text-[10px] ${priorityColors[task.priority]}`}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {status === "todo" && (
                    <div>
                      {showNewTask ? (
                        <div className="flex gap-2">
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Task title..."
                            className="h-8 text-sm"
                            onKeyDown={(e) => e.key === "Enter" && addTask(activeBoard.id)}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => addTask(activeBoard.id)} className="h-8">
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
