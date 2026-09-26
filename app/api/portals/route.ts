/**
 * Portals API — list and update portal connection statuses.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import { listPortalConnections, updatePortalStatus, PORTAL_DEFINITIONS } from "../../../lib/portals";
import { logActivity } from "../../../lib/activity";
import type { PortalId, PortalStatus } from "../../../lib/types";

export const runtime = "nodejs";

/** GET /api/portals — list all portal connections with their definitions */
export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const connections = await listPortalConnections(userId);

    // Merge connection state with portal definitions
    const portals = PORTAL_DEFINITIONS.map((def) => {
      const conn = connections.find((c) => c.portal === def.id);
      return {
        ...def,
        connectionStatus: conn?.status ?? "disconnected",
        lastSyncedAt: conn?.lastSyncedAt ?? null,
      };
    });

    return NextResponse.json({ portals });
  } catch {
    return NextResponse.json({ error: "Could not load portals." }, { status: 503 });
  }
}

/** PUT /api/portals — update a portal's connection status */
export async function PUT(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      portal?: PortalId;
      status?: PortalStatus;
    };

    if (!body.portal || !body.status) {
      return NextResponse.json({ error: "Portal id and status are required." }, { status: 400 });
    }

    const validPortals = PORTAL_DEFINITIONS.map((d) => d.id);
    if (!validPortals.includes(body.portal)) {
      return NextResponse.json({ error: `Invalid portal: ${body.portal}` }, { status: 400 });
    }

    const validStatuses: PortalStatus[] = ["disconnected", "connected", "expired", "needs_reauth"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
    }

    const updated = await updatePortalStatus(userId, body.portal, body.status);
    if (!updated) return NextResponse.json({ error: "Portal connection not found." }, { status: 404 });

    const action = body.status === "connected" ? "portal_connected" : "portal_disconnected";
    await logActivity(userId, action, { details: { portal: body.portal, status: body.status } });

    return NextResponse.json({ ok: true, connection: updated });
  } catch {
    return NextResponse.json({ error: "Could not update portal status." }, { status: 500 });
  }
}
