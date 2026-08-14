import { prisma } from "@/lib/prisma";

// Known notification types the notifications page renders icons for:
// "event" | "approval" | "team" | "resource" | "ai" | "system".
export type NotificationType = "event" | "approval" | "team" | "resource" | "ai" | "system";

// Create an in-app notification for a user. Best-effort — never throws, so a
// notification failure can't break the action that triggered it.
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  description: string
): Promise<boolean> {
  try {
    await prisma.notification.create({ data: { userId, type, title, description } });
    return true;
  } catch (e) {
    console.error("[notify] failed:", e);
    return false;
  }
}
