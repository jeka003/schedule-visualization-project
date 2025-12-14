import type { VercelRequest, VercelResponse } from '@vercel/node';

let statuses: Record<string, string> = {};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ✅ GET — отдать все статусы
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      statuses,
    });
  }

  // ✅ POST — установить статус
  if (req.method === 'POST') {
    const { booking_key, status } = req.body || {};

    if (!booking_key || !status) {
      return res.status(400).json({
        ok: false,
        error: 'booking_key and status are required',
      });
    }

    statuses[booking_key] = status;

    return res.status(200).json({
      ok: true,
    });
  }

  // ✅ DELETE — удалить статус
  if (req.method === 'DELETE') {
    const { booking_key } = req.body || {};

    if (!booking_key) {
      return res.status(400).json({
        ok: false,
        error: 'booking_key is required',
      });
    }

    delete statuses[booking_key];

    return res.status(200).json({
      ok: true,
    });
  }

  // ❌ остальные методы
  return res.status(405).json({
    ok: false,
    error: 'Method not allowed',
  });
}
