import type { VercelRequest, VercelResponse } from "@vercel/node";

type Booking = {
  id?: string;
  row?: number;
  time: string;
  hall: string;
  status?: string;
};

// ВАЖНО:
// 1) Лучше вынести в переменные окружения (Vercel → Project → Settings → Environment Variables)
// 2) Если не хочешь — можешь прямо сюда вставить свой текущий SCHEDULE_URL вместо process.env.GAS_URL
const GAS_URL = process.env.GAS_URL || ""; // сюда можно вставить твой SCHEDULE_URL

function normalizeSchedulePayload(payload: any): Booking[] {
  if (payload && Array.isArray(payload.bookings)) return payload.bookings as Booking[];
  if (Array.isArray(payload)) return payload as Booking[];
  return [];
}

// booking_key во фронте формируется как `${time}_${hall}`
function makeFrontendKey(b: Booking) {
  return `${b.time}_${b.hall}`;
}

function mapUiStatusToGas(uiStatus: string) {
  const s = String(uiStatus || "").trim().toLowerCase();

  // твой UI сейчас использует arrived / entered / ""(сброс)
  if (!s) return "none";
  if (s === "entered") return "done";

  // если когда-то добавишь эти варианты в UI — пусть тоже работают
  if (s === "arrived") return "arrived";
  if (s === "done") return "done";
  if (s === "cancelled") return "cancelled";
  if (s === "none") return "none";
  if (s === "booked") return "booked";

  // по умолчанию не пишем мусор
  return "";
}

function mapGasStatusToUi(gasStatus: string) {
  const s = String(gasStatus || "").trim().toLowerCase();

  // чтобы НЕ менять фронт: зелёный статус у тебя ожидает "entered"
  if (s === "done") return "entered";

  return s;
}

async function fetchBookings(): Promise<Booking[]> {
  if (!GAS_URL) return [];

  // GAS по твоему скрипту: если action пустой — отдаёт расписание
  const r = await fetch(GAS_URL, { method: "GET" });
  const data = await r.json().catch(() => null);

  return normalizeSchedulePayload(data);
}

async function gasSetStatusByBooking(b: Booking, gasStatus: string) {
  if (!GAS_URL) return { ok: false, error: "GAS_URL is empty" };
  if (!b.row) return { ok: false, error: "Booking row not found" };
  if (!b.id) return { ok: false, error: "Booking id not found" };
  if (!gasStatus) return { ok: false, error: "Invalid status" };

  const url =
    `${GAS_URL}` +
    `&action=setStatus` +
    `&row=${encodeURIComponent(String(b.row))}` +
    `&status=${encodeURIComponent(gasStatus)}` +
    `&id=${encodeURIComponent(String(b.id))}`;

  const r = await fetch(url, { method: "GET" });
  const data = await r.json().catch(() => null);

  // твой Apps Script возвращает { success: true/false }
  if (data?.success === true) return { ok: true };
  return { ok: false, error: "GAS setStatus failed", details: data };
}

function parseBody(req: VercelRequest) {
  // твой фронт шлёт application/x-www-form-urlencoded
  // на Vercel body часто уже распарсен, но делаем устойчиво
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

  // ✅ GET — отдать все статусы (берём из Google Sheet через GAS)
  if (req.method === "GET") {
    try {
      const bookings = await fetchBookings();

      const statuses: Record<string, string> = {};
      for (const b of bookings) {
        const key = makeFrontendKey(b);
        const uiStatus = mapGasStatusToUi(b.status || "");

        // как у тебя раньше: если статуса нет — ключ можно не отдавать
        if (uiStatus && uiStatus !== "none" && uiStatus !== "booked") {
          statuses[key] = uiStatus;
        }
      }

      return res.status(200).json({ ok: true, statuses });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || "GET failed" });
    }
  }

  // ✅ POST — установить статус (пишем в Google Sheet через GAS)
  // ВАЖНО: оставляем контракт прежним: booking_key + status
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

  // ❌ остальные методы
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
