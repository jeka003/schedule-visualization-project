import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Booking {
  id?: string;
  row?: number;
  time: string;
  hall: string;
  people?: string;
  extras?: string;
  status?: string;
  comment?: string;
}

const halls = [
  "Urban",
  "17/11",
  "Графит",
  "Soft",
  "Мишель",
  "Shanti",
  "Циклорама А",
  "Циклорама Б",
  "Мастерская",
  "Монро",
  "Моне",
];

const timeSlots = [
  "08:00","09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00",
  "21:00","22:00","23:00","00:00"
];

const hallColors = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-yellow-100 border-yellow-300 text-yellow-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-red-100 border-red-300 text-red-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-sky-100 border-sky-300 text-sky-900",
  "bg-rose-100 border-rose-300 text-rose-900",
];

const SCHEDULE_URL = "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhq7h637p_1Ic3WWNNol8axmGyeG4kWRu0moENv3Yugw0AefOytLTI28VKAHqwZUQ8Nso6cxCQoMN2TXdCuMA3PDrPmip42dWSGhvyO4L_-DfUiOYzIwWOIRSkD4a5ljRb9ic_UePindLbFs7oEPhJWjBCpemG8DcpRH5bciFk8tFwY4h7bB1Xs7BJ9ofKQqdFzhevLTidFvsCHwQNRaJJ8WpkBt_cf5dwnNLvigRtlP9vsdBSDu-o9zkqbXemNsWCZKYAuzl9_1X1NwU5HJRCzzuvRn8kIIbj9lMF9&lib=MRD1yFWDc3NAGH661xW6qx5qd5ql5Bsbc";
const STATUSES_URL = "https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0";

const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const splitTimeRange = (timeRange: string) => {
  const parts = timeRange.includes("–") ? timeRange.split("–") : timeRange.split("-");
  return [String(parts[0] || "").trim(), String(parts[1] || "").trim()] as const;
};

const getBookingPosition = (timeRange: string) => {
  const [start, end] = splitTimeRange(timeRange);
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  const dayStartMinutes = parseTime("08:00");

  return {
    top: ((startMinutes - dayStartMinutes) / 60) * 60,
    height: ((endMinutes - startMinutes) / 60) * 60,
  };
};

const getCurrentTimePosition = () => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return ((minutes - parseTime("08:00")) / 60) * 60;
};

const getStatusColor = (status: string | null) => {
  if (status === "arrived") return "bg-purple-100 border-purple-400 text-purple-900";
  if (status === "entered") return "bg-green-100 border-green-400 text-green-900";
  return "";
};

const joinPeopleExtras = (people?: string, extras?: string) => {
  const p = (people ?? "").trim();
  const e = (extras ?? "").trim();
  if (p && e) return `${p} · ${e}`;
  return p || e || "";
};

function normalizeSchedulePayload(payload: any): Booking[] {
  if (payload && Array.isArray(payload.bookings)) return payload.bookings as Booking[];
  if (Array.isArray(payload)) return payload as Booking[];
  return [];
}

/** Короткие подписи для узких колонок */
const getHallLabel = (hall: string, compact: boolean) => {
  if (!compact) return hall;
  if (hall === "Циклорама А") return "Цикл А";
  if (hall === "Циклорама Б") return "Цикл Б";
  if (hall === "Мастерская") return "Мастер";
  return hall;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const Index = () => {
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] =
    useState<{ booking: Booking; hallIdx: number } | null>(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

  // --- responsive geometry ---
  const [viewportW, setViewportW] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 390
  );

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Высота сетки (как у тебя): 45px на строку
  const rowPx = 45;
  const gridHeightPx = timeSlots.length * rowPx;

  // Во внутренних расчётах top/height считаются в "60px на час", потом масштабируются до 45px
  const pxScale = 0.75; // 60 -> 45

  // Сколько залов хотим видеть на мобильном в портретной ориентации
  const visibleCols = viewportW < 520 ? 8 : viewportW < 900 ? 10 : 12;

  // Ширина левой колонки со временем
  const timeColPx = viewportW < 520 ? 56 : 80;

  // Вычисляем ширину одной колонки зала так, чтобы влезало visibleCols.
  // Важно: делаем единый colWidth для всех залов => одинаковая ширина карточек.
  const colWidth = useMemo(() => {
    const padding = viewportW < 520 ? 12 : 32; // общий горизонтальный паддинг страницы
    const available = viewportW - padding - timeColPx;

    // Минимум — чтобы карточка не разваливалась; максимум — чтобы на десктопе не было слишком жирно
    const min = viewportW < 520 ? 44 : 90;
    const max = viewportW < 900 ? 130 : 180;

    return clamp(Math.floor(available / visibleCols), min, max);
  }, [viewportW, visibleCols, timeColPx]);

  const compactHeaders = colWidth <= 60;

  const { data } = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      const res = await fetch(SCHEDULE_URL);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: statusesData, refetch: refetchStatuses } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => {
      const res = await fetch(STATUSES_URL);
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    setBookingsData(normalizeSchedulePayload(data));
  }, [data]);

  useEffect(() => {
    const i = setInterval(() => setCurrentTimePosition(getCurrentTimePosition()), 60000);
    return () => clearInterval(i);
  }, []);

  const updateStatus = async (key: string, status: string) => {
    await fetch(STATUSES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_key: key, status }),
    });
    refetchStatuses();
  };

  const deleteStatus = async (key: string) => {
    await fetch(STATUSES_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_key: key }),
    });
    refetchStatuses();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="flex">
          {/* TIME COLUMN */}
          <div
            className="border-r bg-gray-50 shrink-0"
            style={{ width: `${timeColPx}px` }}
          >
            <div className="h-10 md:h-16 border-b" />
            <div className="relative" style={{ height: `${gridHeightPx}px` }}>
              {timeSlots.map((t, i) => (
                <div key={t} className="absolute w-full text-center" style={{ top: i * rowPx }}>
                  <div className="text-[10px] md:text-sm font-semibold tabular-nums leading-none">
                    {t}
                  </div>
                  <div className="text-[8px] text-gray-400 leading-none">:30</div>
                </div>
              ))}
            </div>
          </div>

          {/* HALLS */}
          <div
            className="flex-1 overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" as any }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${halls.length}, ${colWidth}px)`,
              }}
            >
              {halls.map((hall, idx) => (
                <div
                  key={hall}
                  className="border-r min-w-0"
                  style={{ width: `${colWidth}px` }}
                >
                  <div
                    className="h-10 md:h-16 border-b bg-gray-100 flex items-center justify-center px-1"
                    style={{ width: `${colWidth}px` }}
                  >
                    {/* Заголовок: либо компактная подпись + перенос, либо нормальная */}
                    <div
                      className={`w-full text-center font-semibold leading-tight overflow-hidden ${
                        compactHeaders ? "text-[10px]" : "text-xs"
                      }`}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={hall}
                    >
                      {getHallLabel(hall, compactHeaders)}
                    </div>
                  </div>

                  <div className="relative" style={{ height: `${gridHeightPx}px` }}>
                    {/* current time line */}
                    <div
                      className="absolute w-full h-0.5 bg-red-500 z-10"
                      style={{ top: `${currentTimePosition * pxScale}px` }}
                    />

                    {bookingsData
                      .filter(b => b.hall === hall)
                      .map((booking, i) => {
                        const { top, height } = getBookingPosition(booking.time);
                        const key = `${booking.time}_${booking.hall}`;
                        const synced = statusesData?.statuses?.[key] ?? null;

                        const color =
                          getStatusColor(synced) || hallColors[idx % hallColors.length];

                        const infoLine = joinPeopleExtras(booking.people, booking.extras);

                        return (
                          <div
                            key={`${key}_${i}`}
                            onClick={() => setSelectedBooking({ booking, hallIdx: idx })}
                            className={`absolute left-1 right-1 rounded-md border-2 cursor-pointer overflow-hidden ${color}`}
                            style={{
                              top: `${top * pxScale}px`,
                              height: `${Math.max(20, (height - 4) * pxScale)}px`,
                              padding: colWidth < 56 ? "4px" : "6px",
                            }}
                          >
                            <div className="text-[10px] font-semibold tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                              {booking.time}
                            </div>

                            {infoLine && (
                              <div className="text-[10px] opacity-80 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                {infoLine}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {selectedBooking && (
        <Dialog open onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Установить статус</DialogTitle>
            </DialogHeader>

            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold">{selectedBooking.booking.hall}</p>
              <p>{selectedBooking.booking.time}</p>
              <p>{joinPeopleExtras(selectedBooking.booking.people, selectedBooking.booking.extras)}</p>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1 bg-purple-500"
                onClick={() => {
                  updateStatus(
                    `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`,
                    "arrived"
                  );
                  setSelectedBooking(null);
                }}
              >
                Пришли
              </Button>
              <Button
                className="flex-1 bg-green-500"
                onClick={() => {
                  updateStatus(
                    `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`,
                    "entered"
                  );
                  setSelectedBooking(null);
                }}
              >
                Зашли
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                deleteStatus(`${ПselectedBooking.booking.time}_${selectedBooking.booking.hall}`);
                setSelectedBooking(null);
              }}
            >
              Сбросить статус
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Index;
