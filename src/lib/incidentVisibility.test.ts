import { describe, it, expect } from "vitest";

import { visibilityOnCreate, visibilityOnUpdate } from "@/lib/incidentVisibility";

describe("visibilityOnCreate", () => {
  it("keeps a report private when sharing wasn't asked for", () => {
    expect(visibilityOnCreate({ wantsShare: false, admin: false })).toEqual({ isPublic: false, shareRequest: null });
  });

  it("queues an RA's request instead of publishing it", () => {
    expect(visibilityOnCreate({ wantsShare: true, admin: false })).toEqual({
      isPublic: false,
      shareRequest: "pending",
    });
  });

  it("shares an admin's own report straight away", () => {
    expect(visibilityOnCreate({ wantsShare: true, admin: true })).toEqual({ isPublic: true, shareRequest: "approved" });
  });

  it("ignores admin rights when sharing wasn't asked for", () => {
    expect(visibilityOnCreate({ wantsShare: false, admin: true })).toEqual({ isPublic: false, shareRequest: null });
  });
});

describe("visibilityOnUpdate", () => {
  const base = { admin: false, wasPublic: false, wasApproved: false, contentChanged: false };

  it("leaves visibility alone when nothing about it was asked", () => {
    expect(visibilityOnUpdate(base)).toBeNull();
  });

  it("leaves a shared report shared when only its status moves", () => {
    // A status-only change must not quietly un-share a published report.
    expect(visibilityOnUpdate({ ...base, wasPublic: true, wasApproved: true })).toBeNull();
  });

  it("never publishes on an RA's request — the report stays private and pending", () => {
    expect(visibilityOnUpdate({ ...base, requestPublic: true })).toEqual({
      isPublic: false,
      shareRequest: "pending",
    });
  });

  it("publishes when an admin shares it themselves", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, requestPublic: true })).toEqual({
      isPublic: true,
      shareRequest: "approved",
    });
  });

  it("grants permission on approval without publishing anything", () => {
    // The whole point of the two-step model: nothing becomes visible until the
    // owner says so.
    expect(visibilityOnUpdate({ ...base, admin: true, review: "approve" })).toEqual({
      isPublic: false,
      shareRequest: "approved",
    });
  });

  it("lets the owner publish once an approval is on the record", () => {
    expect(visibilityOnUpdate({ ...base, wasApproved: true, requestPublic: true })).toEqual({
      isPublic: true,
      shareRequest: "approved",
    });
  });

  it("records a decline so the owner sees the answer", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, review: "decline" })).toEqual({
      isPublic: false,
      shareRequest: "rejected",
    });
  });

  it("records a request for changes as its own verdict", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, review: "changes" })).toEqual({
      isPublic: false,
      shareRequest: "changes",
    });
  });

  it("un-publishes a shared report when an admin reverses the verdict", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, wasPublic: true, wasApproved: true, review: "decline" })).toEqual({
      isPublic: false,
      shareRequest: "rejected",
    });
  });

  it("lets the owner withdraw a request without sign-off", () => {
    expect(visibilityOnUpdate({ ...base, requestPublic: false })).toEqual({ isPublic: false, shareRequest: null });
  });

  it("keeps the approval when the owner pulls a shared report back", () => {
    // Un-sharing shouldn't mean asking permission all over again.
    expect(visibilityOnUpdate({ ...base, wasPublic: true, wasApproved: true, requestPublic: false })).toEqual({
      isPublic: false,
      shareRequest: "approved",
    });
  });

  it("sends a rewritten shared report back for review", () => {
    // The approval covered the wording an admin read, not whatever replaced it.
    expect(visibilityOnUpdate({ ...base, wasPublic: true, wasApproved: true, contentChanged: true })).toEqual({
      isPublic: false,
      shareRequest: "pending",
    });
  });

  it("sends a rewritten but unpublished report back for review too", () => {
    expect(visibilityOnUpdate({ ...base, wasApproved: true, contentChanged: true })).toEqual({
      isPublic: false,
      shareRequest: "pending",
    });
  });

  it("lets an admin rewrite a shared report without un-sharing it", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, wasPublic: true, wasApproved: true, contentChanged: true })).toBeNull();
  });

  it("doesn't queue a rewrite of a report that was never shared", () => {
    expect(visibilityOnUpdate({ ...base, contentChanged: true })).toBeNull();
  });

  it("prefers the admin verdict over anything the body also asked for", () => {
    // A request bundled with a decline can't smuggle the report public.
    expect(visibilityOnUpdate({ ...base, admin: true, review: "decline", requestPublic: true })).toEqual({
      isPublic: false,
      shareRequest: "rejected",
    });
  });
});
