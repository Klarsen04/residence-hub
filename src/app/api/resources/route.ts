import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

async function isAdmin(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === "ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await isAdmin(session.user.id);

  // Admins see everything (incl. pending). Everyone else sees approved
  // resources plus their own (so they can see their pending submissions).
  const resources = await prisma.resource.findMany({
    where: admin ? {} : { OR: [{ approved: true }, { userId: session.user.id }] },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const withMeta = resources.map((r) => ({
    ...r,
    ownerId: r.userId,
    canEdit: r.userId === session.user.id || admin,
    canApprove: admin,
  }));

  return NextResponse.json(withMeta);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, type, fileUrl, externalUrl, tags, isPublic } = body;

  if (!title || !type) {
    return NextResponse.json({ message: "Title and type are required" }, { status: 400 });
  }

  const admin = await isAdmin(session.user.id);

  const resource = await prisma.resource.create({
    data: {
      userId: session.user.id,
      title,
      description,
      type,
      fileUrl,
      externalUrl,
      tags: JSON.stringify(tags || []),
      isPublic: isPublic ?? true,
      // Admin submissions are auto-approved; everyone else needs approval.
      approved: admin,
      approvedById: admin ? session.user.id : null,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, title, description, type, fileUrl, externalUrl, tags, isPublic, approved } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await isAdmin(session.user.id);
  const isOwner = existing.userId === session.user.id;
  if (!isOwner && !admin) {
    return NextResponse.json({ error: "You can only edit your own resources" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (type !== undefined) data.type = type;
  if (fileUrl !== undefined) data.fileUrl = fileUrl;
  if (externalUrl !== undefined) data.externalUrl = externalUrl;
  if (tags !== undefined) data.tags = JSON.stringify(tags || []);
  if (isPublic !== undefined) data.isPublic = isPublic;
  // Only admins may change approval state.
  if (approved !== undefined && admin) {
    data.approved = approved;
    data.approvedById = approved ? session.user.id : null;
  }

  const resource = await prisma.resource.update({ where: { id }, data });

  // Notify the submitter when their resource is newly approved.
  if (approved === true && !existing.approved && admin) {
    const owner = await prisma.user.findUnique({ where: { id: existing.userId }, select: { name: true, email: true } });
    if (owner?.email && existing.userId !== session.user.id) {
      await sendEmail({
        to: owner.email,
        subject: `Your resource "${resource.title}" was approved`,
        html: `<p>Hi ${owner.name || "there"},</p>
<p>Your submitted resource <strong>${resource.title}</strong> has been approved and is now visible to everyone on the platform.</p>
<p>Thanks for contributing!</p>`,
      });
    }
  }

  return NextResponse.json(resource);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = await isAdmin(session.user.id);
  if (existing.userId !== session.user.id && !admin) {
    return NextResponse.json({ error: "You can only delete your own resources" }, { status: 403 });
  }

  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
