import type { VercelRequest, VercelResponse } from "@vercel/node";

const GAS_API_URL = process.env.GAS_API_URL || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!GAS_API_URL) return res.status(500).json({ ok: false, error: "Missing GAS_API_URL" });

  if (req.method !== "POST" && req.method !== "DELETE")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = String(body.id || "");
    const status = req.method === "DELETE" ? "" : String(body.status || "");
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    const url = new URL(GAS_API_URL);
    url.searchParams.set("action", "setStatus");
    url.searchParams.set("id", id);
    url.searchParams.set("status", status);

    const r = await fetch(url.toString(), { method: "GET" });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}
