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
    expect(visibilityOnCreate({ wantsShare: true, admin: true })).toEqual({ isPublic: true, shareRequest: null });
  });

  it("ignores admin rights when sharing wasn't asked for", () => {
    expect(visibilityOnCreate({ wantsShare: false, admin: true })).toEqual({ isPublic: false, shareRequest: null });
  });
});

describe("visibilityOnUpdate", () => {
  const base = { admin: false, wasPublic: false, contentChanged: false };

  it("leaves visibility alone when nothing about it was asked", () => {
    expect(visibilityOnUpdate(base)).toBeNull();
  });

  it("leaves an approved report shared when only its status moves", () => {
    // A status-only change must not quietly un-share an approved report.
    expect(visibilityOnUpdate({ ...base, wasPublic: true })).toBeNull();
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
      shareRequest: null,
    });
  });

  it("publishes on approval and clears the queue", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, approveShare: true })).toEqual({
      isPublic: true,
      shareRequest: null,
    });
  });

  it("records a decline so the owner sees the answer", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, approveShare: false })).toEqual({
      isPublic: false,
      shareRequest: "rejected",
    });
  });

  it("lets the owner withdraw a request without sign-off", () => {
    expect(visibilityOnUpdate({ ...base, requestPublic: false })).toEqual({ isPublic: false, shareRequest: null });
  });

  it("lets the owner make an approved report private again", () => {
    expect(visibilityOnUpdate({ ...base, wasPublic: true, requestPublic: false })).toEqual({
      isPublic: false,
      shareRequest: null,
    });
  });

  it("sends a rewritten shared report back for review", () => {
    // The approval covered the wording an admin read, not whatever replaced it.
    expect(visibilityOnUpdate({ ...base, wasPublic: true, contentChanged: true })).toEqual({
      isPublic: false,
      shareRequest: "pending",
    });
  });

  it("lets an admin rewrite a shared report without un-sharing it", () => {
    expect(visibilityOnUpdate({ ...base, admin: true, wasPublic: true, contentChanged: true })).toBeNull();
  });

  it("doesn't queue a rewrite of a report that was never shared", () => {
    expect(visibilityOnUpdate({ ...base, contentChanged: true })).toBeNull();
  });

  it("prefers the admin verdict over anything the body also asked for", () => {
    // A request bundled with an approval can't smuggle the report public.
    expect(visibilityOnUpdate({ ...base, admin: true, approveShare: false, requestPublic: true })).toEqual({
      isPublic: false,
      shareRequest: "rejected",
    });
  });
});
