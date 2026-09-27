import { describe, it, expect } from "vitest";
import {
  PORTAL_DEFINITIONS,
  getPortalDefinition,
  listPortalConnections,
  updatePortalStatus,
  getConnectedPortals,
} from "../lib/portals";

describe("portals data layer", () => {
  it("contains all required career portals", () => {
    const ids = PORTAL_DEFINITIONS.map((p) => p.id);
    expect(ids).toContain("handshake");
    expect(ids).toContain("goinglobal");
    expect(ids).toContain("linkedin");
    expect(ids).toContain("greenhouse");
    expect(ids).toContain("lever");
    expect(ids).toContain("workday");
    expect(ids).toContain("simplify");
    expect(ids).toContain("jobright");
  });

  it("configures the exact requested Columbia Handshake login URL", () => {
    const handshake = getPortalDefinition("handshake");
    expect(handshake).toBeDefined();
    expect(handshake?.loginUrl).toBe("https://columbiaengineering.joinhandshake.com/login");
  });

  it("configures the exact GoinGlobal login URL", () => {
    const goinglobal = getPortalDefinition("goinglobal");
    expect(goinglobal).toBeDefined();
    expect(goinglobal?.loginUrl).toBe("https://online.goinglobal.com/");
  });

  it("ensures all portal URLs are valid HTTPS URLs", () => {
    for (const portal of PORTAL_DEFINITIONS) {
      expect(portal.loginUrl.startsWith("https://")).toBe(true);
      expect(() => new URL(portal.loginUrl)).not.toThrow();
    }
  });

  it("lists all default portal connections with 'disconnected' status", async () => {
    const testUserId = "user_test_portals_1";
    const connections = await listPortalConnections(testUserId);

    expect(connections.length).toBe(PORTAL_DEFINITIONS.length);
    for (const conn of connections) {
      expect(conn.userId).toBe(testUserId);
      expect(conn.status).toBe("disconnected");
      expect(conn.loginUrl).toBeTruthy();
    }
  });

  it("updates portal connection status to connected and tracks lastSyncedAt", async () => {
    const testUserId = "user_test_portals_2";
    await listPortalConnections(testUserId);

    const updated = await updatePortalStatus(testUserId, "handshake", "connected");
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("connected");
    expect(updated?.lastSyncedAt).toBeTruthy();

    const connected = await getConnectedPortals(testUserId);
    expect(connected.length).toBe(1);
    expect(connected[0].portal).toBe("handshake");
  });

  it("classifies greenhouse and lever as ats_import, and other portals as bookmark", () => {
    for (const portal of PORTAL_DEFINITIONS) {
      if (portal.id === "greenhouse" || portal.id === "lever") {
        expect(portal.type).toBe("ats_import");
      } else {
        expect(portal.type).toBe("bookmark");
      }
    }
  });
});
