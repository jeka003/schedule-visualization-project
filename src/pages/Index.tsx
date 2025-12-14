import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Booking {
  id?: string;
  row?: number;
  time: string;
  hall: string;
  people?: string;   // "2 чел"
  extras?: string;   // "допы"
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

const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const splitTimeRange = (timeRange: string) => {
  // поддержка "–" и "-"
  const parts = timeRange.split("–").length === 2 ? timeRange.split("–") : timeRange.split("-");
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
  const p = (people || "").trim();
  const e = (extras || "").trim();
  if (p && e) return `${p} · ${e}`;
  return p || e || "";
};

const Index = () => {
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] =
    useState<{ booking: Booking; hallIdx: number } | null>(null);
  const [currentTimePosition, setCurrentTimePosition] =
    useState(getCurrentTimePosition());

  const { data } = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      // ВАЖНО: тут должен быть реальный URL, без квадратных скобок/markdown
      const res = await fetch("https://functions.poehali.dev/72c23f35-8acf-4a85-8ad8-d945be4ad72e");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: statusesData, refetch: refetchStatuses } = useQuery({
    queryKey: ["statuses"],
    queryFn: async () => {
      const res = await fetch("https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0");
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    // ожидаем { bookings: [...] }
    if (data?.bookings && Array.isArray(data.bookings)) setBookingsData(data.bookings);
  }, [data]);

  useEffect(() => {
    const i = setInterval(
      () => setCurrentTimePosition(getCurrentTimePosition()),
      60000
    );
    return () => clearInterval(i);
  }, []);

  const updateStatus = async (key: string, status: string) => {
    await fetch("https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_key: key, status }),
    });
    refetchStatuses();
  };

  const deleteStatus = async (key: string) => {
    await fetch("https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0", {
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
          <div className="w-12 md:w-20 border-r bg-gray-50">
            <div className="h-10 md:h-16 border-b" />
            <div className="relative" style={{ height: `${timeSlots.length * 45}px` }}>
              {timeSlots.map((t, i) => (
                <div key={t} className="absolute w-full text-center" style={{ top: i * 45 }}>
                  <div className="text-[10px] md:text-sm font-semibold">{t}</div>
                  <div className="text-[8px] text-gray-400">:30</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${halls.length}, 1fr)` }}>
              {halls.map((hall, idx) => (
                <div key={hall} className="border-r">
                  <div className="h-10 md:h-16 border-b bg-gray-100 flex items-center justify-center text-xs font-semibold">
                    {hall}
                  </div>

                  <div className="relative" style={{ height: `${timeSlots.length * 45}px` }}>
                    <div
                      className="absolute w-full h-0.5 bg-red-500 z-10"
                      style={{ top: `${currentTimePosition * 0.75}px` }}
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
                            key={i}
                            onClick={() => setSelectedBooking({ booking, hallIdx: idx })}
                            className={`absolute left-1 right-1 rounded-md border-2 p-1 cursor-pointer ${color}`}
                            style={{
                              top: `${top * 0.75}px`,
                              height: `${(height - 4) * 0.75}px`,
                            }}
                          >
                            <div className="text-[9px] font-semibold">{booking.time}</div>

                            {infoLine && (
                              <div className="text-[10px] opacity-80 truncate">
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
