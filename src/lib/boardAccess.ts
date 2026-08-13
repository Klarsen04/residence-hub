import { prisma } from "@/lib/prisma";

// A planning board (and its tasks) may be edited by its creator, anyone added
// as a collaborator (PlanningBoardMember), or an admin. Everyone can still view.
export async function canManageBoard(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.planningBoard.findUnique({
    where: { id: boardId },
    select: { userId: true, members: { where: { userId }, select: { id: true } } },
  });
  if (!board) return false;
  if (board.userId === userId) return true;
  if (board.members.length > 0) return true;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}
