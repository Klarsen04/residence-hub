/**
 * Who can see an incident report.
 *
 * Reports are private to the RA who filed them. Sharing one with the whole team
 * is an admin decision, so the owner can only *ask* — the two steps are kept
 * apart here rather than trusting an `isPublic` flag off the wire.
 *
 * Pure on purpose: the rules are the security boundary, so they're worth testing
 * without a database or a session in the way.
 */

/** Where a request to share stands. Null means nothing is outstanding. */
export type ShareRequest = "pending" | "rejected" | null;

export interface Visibility {
  isPublic: boolean;
  shareRequest: ShareRequest;
}

/** Filing a report, optionally asking to share it at the same time. */
export function visibilityOnCreate({ wantsShare, admin }: { wantsShare: boolean; admin: boolean }): Visibility {
  // An admin filing their own report is already the approver, so theirs goes
  // public straight away. Anyone else joins the queue.
  if (!wantsShare) return { isPublic: false, shareRequest: null };
  return admin ? { isPublic: true, shareRequest: null } : { isPublic: false, shareRequest: "pending" };
}

export interface UpdateInput {
  /** Whether the person making the change is an admin. */
  admin: boolean;
  /** Whether the report was already approved for sharing. */
  wasPublic: boolean;
  /** The owner asking to share (true) or to stop sharing / withdraw (false). */
  requestPublic?: boolean;
  /** An admin's verdict on an outstanding request. Admin-only — check first. */
  approveShare?: boolean;
  /** Whether this same update rewrites what the report says. */
  contentChanged: boolean;
}

/**
 * Visibility after an update, or null when it shouldn't move at all — so a
 * status-only change leaves an approval alone.
 */
export function visibilityOnUpdate({
  admin,
  wasPublic,
  requestPublic,
  approveShare,
  contentChanged,
}: UpdateInput): Visibility | null {
  if (approveShare === true) return { isPublic: true, shareRequest: null };
  // Declining is recorded rather than silently dropped, so the owner sees the
  // answer instead of wondering why nothing happened.
  if (approveShare === false) return { isPublic: false, shareRequest: "rejected" };

  if (requestPublic === true) {
    return admin ? { isPublic: true, shareRequest: null } : { isPublic: false, shareRequest: "pending" };
  }
  // Withdrawing or unsharing only lowers visibility, so it needs no sign-off.
  if (requestPublic === false) return { isPublic: false, shareRequest: null };

  // An approval covered the text an admin actually read. Rewriting a shared
  // report sends it back for review rather than pushing the new wording out.
  if (contentChanged && wasPublic && !admin) return { isPublic: false, shareRequest: "pending" };

  return null;
}
