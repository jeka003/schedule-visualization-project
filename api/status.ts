import type { VercelRequest, VercelResponse } from "@vercel/node";

type Booking = {
  id?: string;
  row?: number;
  time: string;
  hall: string;
  status?: string;
};

const GAS_API_URL = process.env.GAS_API_URL || ""; // <- как на твоём скрине

function withParams(baseUrl: string, params: Record<string, string>) {
  const hasQuery = baseUrl.includes("?");
  const sep = hasQuery ? "&" : "?";
  const qs = new URLSearchParams(params).toString();
  return `${baseUrl}${sep}${qs}`;
}

function normalizeSchedulePayload(payload: any): Booking[] {
  if (payload && Array.isArray(payload.bookings)) return payload.bookings as Booking[];
  if (Array.isArray(payload)) return payload as Booking[];
  return [];
}

// booking_key во фронте: `${time}_${hall}`
function makeFrontendKey(b: Booking) {
  return `${b.time}_${b.hall}`;
}

// UI -> GAS (в GAS у тебя нет "entered", поэтому маппим в "done")
function mapUiStatusToGas(uiStatus: string) {
  const s = String(uiStatus ?? "").trim().toLowerCase();

  if (!s) return "none";
  if (s === "entered") return "done";

  if (s === "arrived") return "arrived";
  if (s === "done") return "done";
  if (s === "cancelled") return "cancelled";
  if (s === "none") return "none";
  if (s === "booked") return "booked";

  return "";
}

// GAS -> UI (чтобы не менять фронт: "done" показываем как "entered")
function mapGasStatusToUi(gasStatus: string) {
  const s = String(gasStatus ?? "").trim().toLowerCase();
  if (s === "done") return "entered";
  return s;
}

async function fetchBookings(): Promise<Booking[]> {
  if (!GAS_API_URL) return [];

  // В твоём GAS: action пустой или getSchedule -> отдаёт расписание
  const r = await fetch(GAS_API_URL, { method: "GET" });
  const data = await r.json().catch(() => null);

  return normalizeSchedulePayload(data);
}

async function gasSetStatusByBooking(b: Booking, gasStatus: string) {
  if (!GAS_API_URL) return { ok: false, error: "GAS_API_URL is empty" };
  if (!b.row) return { ok: false, error: "Booking row not found" };
  if (!b.id) return { ok: false, error: "Booking id not found" };
  if (!gasStatus) return { ok: false, error: "Invalid status" };

  const url = withParams(GAS_API_URL, {
    action: "setStatus",
    row: String(b.row),
    status: gasStatus,
    id: String(b.id),
  });

  const r = await fetch(url, { method: "GET" });
  const data = await r.json().catch(() => null);

  // GAS возвращает { success: true/false }
  if (data?.success === true) return { ok: true };
  return { ok: false, error: "GAS setStatus failed", details: data };
}

function parseBody(req: VercelRequest) {
  // фронт шлёт application/x-www-form-urlencoded
  const b: any = (req as any).body;

  if (!b) return {};
  if (typeof b === "string") {
    const p = new URLSearchParams(b);
    return Object.fromEntries(p.entries());
  }
  return b;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  // ✅ GET — отдать все статусы (из Google Sheet через GAS)
  if (req.method === "GET") {
    try {
      const bookings = await fetchBookings();

      const statuses: Record<string, string> = {};
      for (const b of bookings) {
        const key = makeFrontendKey(b);
        const uiStatus = mapGasStatusToUi(b.status || "");

        // как у тебя было: отдаём только реальные статусы (не booked/none)
        if (uiStatus && uiStatus !== "none" && uiStatus !== "booked") {
          statuses[key] = uiStatus;
        }
      }

      return res.status(200).json({ ok: true, statuses });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "GET failed" });
    }
  }

  // ✅ POST — установить статус (в Google Sheet через GAS)
  if (req.method === "POST") {
    try {
      const body = parseBody(req);
      const booking_key = String(body.booking_key || "").trim();
      const status = String(body.status ?? "").trim(); // может быть ""

      if (!booking_key) {
        return res.status(400).json({ ok: false, error: "booking_key is required" });
      }

      const gasStatus = mapUiStatusToGas(status);
      if (!gasStatus) {
        return res.status(400).json({ ok: false, error: "Invalid status" });
      }

      const bookings = await fetchBookings();
      const booking = bookings.find((b) => makeFrontendKey(b) === booking_key);

      if (!booking) {
        return res.status(404).json({ ok: false, error: "Booking not found in sheet" });
      }

      const result = await gasSetStatusByBooking(booking, gasStatus);
      if (!result.ok) return res.status(500).json({ ok: false, ...result });

      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "POST failed" });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
