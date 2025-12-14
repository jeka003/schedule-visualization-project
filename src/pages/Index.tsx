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
  people?: string;   // "1 чел"
  extras?: string;   // "софт + пост"
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

// Твои рабочие URL (оставь как есть)
const SCHEDULE_URL =
  "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhq7h637p_1Ic3WWNNol8axmGyeG4kWRu0moENv3Yugw0AefOytLTI28VKAHqwZUQ8Nso6cxCQoMN2TXdCuMA3PDrPmip42dWSGhvyO4L_-DfUiOYzIwWOIRSkD4a5ljRb9ic_UePindLbFs7oEPhJWjBCpemG8DcpRH5bciFk8tFwY4h7bB1Xs7BJ9ofKQqdFzhevLTidFvsCHwQNRaJJ8WpkBt_cf5dwnNLvigRtlP9vsdBSDu-o9zkqbXemNsWCZKYAuzl9_1X1NwU5HJRCzzuvRn8kIIbj9lMF9&lib=MRD1yFWDc3NAGH661xW6qx5qd5ql5Bsbc";

const STATUSES_URL =
  "https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0";

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

function normalizeSchedulePayload(payload: any): Booking[] {
  if (payload && Array.isArray(payload.bookings)) return payload.bookings as Booking[];
  if (Array.isArray(payload)) return payload as Booking[];
  return [];
}

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
  const [currentTimePosition, setCurrentTimePosition] =
    useState(getCurrentTimePosition());

  // responsive
  const [viewportW, setViewportW] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 390
  );

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // базовая геометрия
  const rowPx = 45; // как было
  const gridHeightPx = timeSlots.length * rowPx;

  // масштаб из расчётов (60px на час) в UI (45px на час)
  const pxScale = 0.75;

  // Хотим на телефоне: 7 залов
  const visibleCols =
    viewportW < 520 ? 7 : viewportW < 900 ? 10 : 12;

  // Уже колонка времени на телефоне
  const timeColPx =
    viewportW < 520 ? 46 : viewportW < 900 ? 70 : 80;

  const outerPadding = viewportW < 520 ? 8 : 32;

  // Ширина колонки зала: одинаковая для всех
  const colWidth = useMemo(() => {
    const available = viewportW - outerPadding - timeColPx;
    const min = viewportW < 520 ? 42 : 90;
    const max = viewportW < 900 ? 140 : 190;
    return clamp(Math.floor(available / visibleCols), min, max);
  }, [viewportW, outerPadding, timeColPx, visibleCols]);

  const compactHeaders = colWidth <= 62;

  // Отступы карточек (минимальные на телефоне)
  const cardInsetPx = viewportW < 520 ? 2 : 4;
  const cardPadPx = viewportW < 520 ? 4 : 6;
  const cardBorderPx = viewportW < 520 ? 1 : 2;

  const timeFontMain = viewportW < 520 ? "text-[9px]" : "text-[10px] md:text-sm";
  const timeFontHalf = viewportW < 520 ? "text-[7px]" : "text-[8px]";

  const cardTimeFont = viewportW < 520 ? "text-[10px]" : "text-[11px]";
  const cardExtraFont = viewportW < 520 ? "text-[10px]" : "text-[11px]";
  const cardPeopleFont = viewportW < 520 ? "text-[10px]" : "text-[11px]";

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
    <div
      className="min-h-screen bg-gray-50"
      style={{ padding: `${outerPadding}px` }}
    >
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
                <div
                  key={t}
                  className="absolute w-full text-center"
                  style={{ top: i * rowPx }}
                >
                  <div className={`${timeFontMain} font-semibold tabular-nums leading-none`}>
                    {t}
                  </div>
                  <div className={`${timeFontHalf} text-gray-400 leading-none`}>:30</div>
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
                    className="h-10 md:h-16 border-b bg-gray-100 flex items-center justify-center"
                    style={{ width: `${colWidth}px`, padding: compactHeaders ? "2px" : "4px" }}
                  >
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

                    {/* bookings */}
                    {bookingsData
                      .filter(b => b.hall === hall)
                      .map((booking, i) => {
                        const { top, height } = getBookingPosition(booking.time);
                        const key = `${booking.time}_${booking.hall}`;
                        const synced = statusesData?.statuses?.[key] ?? null;

                        const color =
                          getStatusColor(synced) || hallColors[idx % hallColors.length];

                        const extras = (booking.extras ?? "").trim();
                        const people = (booking.people ?? "").trim();

                        return (
                          <div
                            key={`${key}_${i}`}
                            onClick={() => setSelectedBooking({ booking, hallIdx: idx })}
                            className={`absolute rounded-md cursor-pointer overflow-hidden ${color}`}
                            style={{
                              left: `${cardInsetPx}px`,
                              right: `${cardInsetPx}px`,
                              top: `${top * pxScale}px`,
                              height: `${Math.max(22, (height - 4) * pxScale)}px`,
                              padding: `${cardPadPx}px`,
                              borderWidth: `${cardBorderPx}px`,
                              borderStyle: "solid",
                            }}
                          >
                            {/* 1) время — всегда видно, одной строкой */}
                            <div
                              className={`${cardTimeFont} font-semibold tabular-nums leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}
                            >
                              {booking.time}
                            </div>

                            {/* 2) допы — если есть */}
                            {extras && (
                              <div
                                className={`${cardExtraFont} opacity-85 leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}
                              >
                                {extras}
                              </div>
                            )}

                            {/* 3) люди — если есть */}
                            {people && (
                              <div
                                className={`${cardPeopleFont} opacity-80 leading-tight whitespace-nowrap overflow-hidden text-ellipsis`}
                              >
                                {people}
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
              {selectedBooking.booking.extras && <p>{selectedBooking.booking.extras}</p>}
              {selectedBooking.booking.people && <p>{selectedBooking.booking.people}</p>}
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
                deleteStatus(
                  `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`
                );
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
