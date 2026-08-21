import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

// Boards you can use: every "shared" board (admin-created, all RAs) + your own
// "personal" (private) boards.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  const boards = await prisma.checkInBoard.findMany({
    where: { OR: [{ scope: "shared" }, { ownerId: session.user.id }] },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withMeta = boards.map((b) => ({
    ...b,
    ownerName: b.owner?.name || "Unknown",
    canDelete: b.ownerId === session.user.id || admin,
    canEdit: b.ownerId === session.user.id || admin,
    // Whether this person may move the board between shared and private at all —
    // renaming is open to the owner, re-scoping isn't.
    canReScope: admin,
    owner: undefined,
  }));

  return NextResponse.json(withMeta);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, scope } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const admin = await isAdmin(session.user.id);
  // Only admins can create shared boards; everyone else gets a personal one.
  const resolvedScope = scope === "shared" && admin ? "shared" : "personal";

  const board = await prisma.checkInBoard.create({
    data: { title: title.trim(), scope: resolvedScope, ownerId: session.user.id },
  });

  return NextResponse.json(board, { status: 201 });
}

// Rename a board, or move it between shared and private. Owners rename their own
// boards; only an admin decides who a board is for.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, scope } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.checkInBoard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await isAdmin(session.user.id);
  if (existing.ownerId !== session.user.id && !admin) {
    return NextResponse.json({ error: "You can only edit your own boards" }, { status: 403 });
  }

  const data: { title?: string; scope?: string } = {};

  if (title !== undefined) {
    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    data.title = title.trim();
  }

  if (scope !== undefined && scope !== existing.scope) {
    if (scope !== "shared" && scope !== "personal") {
      return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
    }
    // Same rule as creation: sharing a board with every RA is an admin's call.
    // That covers un-sharing too — other RAs' entries live on a shared board, so
    // making it private takes them off it.
    if (!admin) {
      return NextResponse.json({ error: "Only an admin can change who a board is for" }, { status: 403 });
    }
    data.scope = scope;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const board = await prisma.checkInBoard.update({ where: { id }, data });
  return NextResponse.json(board);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.checkInBoard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== session.user.id && !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.checkInBoard.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
