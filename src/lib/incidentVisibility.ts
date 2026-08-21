/**
 * Who can see an incident report.
 *
 * Reports are private to the RA who filed them. Sharing one with the whole team
 * takes two separate steps: an admin grants permission, and then the owner
 * decides to publish. Approval on its own changes nothing anyone can see — so a
 * report is never pushed out from under the person who wrote it.
 *
 * Pure on purpose: the rules are the security boundary, so they're worth testing
 * without a database or a session in the way.
 */

/**
 * Where a request to share stands.
 * - null      nothing asked
 * - pending   waiting on an admin
 * - approved  cleared to share; the owner still chooses whether to publish
 * - rejected  an admin said no
 * - changes   an admin wants the report reworded before it goes out
 */
export type ShareRequest = "pending" | "approved" | "rejected" | "changes" | null;

/** What an admin can say about an outstanding request. */
export type Review = "approve" | "decline" | "changes";

export const REVIEWS: Review[] = ["approve", "decline", "changes"];

export interface Visibility {
  isPublic: boolean;
  shareRequest: ShareRequest;
}

/** Filing a report, optionally asking to share it at the same time. */
export function visibilityOnCreate({ wantsShare, admin }: { wantsShare: boolean; admin: boolean }): Visibility {
  if (!wantsShare) return { isPublic: false, shareRequest: null };
  // An admin ticking the box is both the asker and the approver, so their own
  // report goes out right away. Anyone else joins the queue.
  return admin ? { isPublic: true, shareRequest: "approved" } : { isPublic: false, shareRequest: "pending" };
}

export interface UpdateInput {
  /** Whether the person making the change is an admin. */
  admin: boolean;
  /** Whether the report is currently shared with everyone. */
  wasPublic: boolean;
  /** Whether an admin has already cleared this report for sharing. */
  wasApproved: boolean;
  /** The owner publishing (true) or pulling it back / withdrawing (false). */
  requestPublic?: boolean;
  /** An admin's verdict on an outstanding request. Admin-only — check first. */
  review?: Review;
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
  wasApproved,
  requestPublic,
  review,
  contentChanged,
}: UpdateInput): Visibility | null {
  // Approving grants permission; it doesn't publish. The owner still has to
  // choose to share, so nothing becomes visible behind their back.
  if (review === "approve") return { isPublic: false, shareRequest: "approved" };
  // A no and a "reword it" are both recorded, so the owner sees the answer
  // instead of wondering why nothing happened.
  if (review === "decline") return { isPublic: false, shareRequest: "rejected" };
  if (review === "changes") return { isPublic: false, shareRequest: "changes" };

  if (requestPublic === true) {
    // Publishing needs standing permission: an admin has it inherently, anyone
    // else needs an approval already on the record. Without one this is just the
    // request itself.
    if (admin || wasApproved) return { isPublic: true, shareRequest: "approved" };
    return { isPublic: false, shareRequest: "pending" };
  }

  if (requestPublic === false) {
    // Only lowers visibility, so it needs no sign-off. An approval already given
    // survives, so pulling a report back doesn't mean asking again.
    return { isPublic: false, shareRequest: wasApproved ? "approved" : null };
  }

  // An approval covered the wording an admin actually read. Rewriting the report
  // sends it back for review rather than pushing the new text out.
  if (contentChanged && !admin && (wasPublic || wasApproved)) {
    return { isPublic: false, shareRequest: "pending" };
  }

  return null;
}
