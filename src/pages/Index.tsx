import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Booking {
  time: string;
  hall: string;
  people: number;
  status?: string;
  comment?: string;
}

// Порядок залов слева направо в расписании
// Мастерская, Монро, Моне - перенесены вправо
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
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"
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
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const getBookingPosition = (timeRange: string) => {
  const [start, end] = timeRange.split("–");
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  const dayStartMinutes = parseTime("08:00");
  
  const top = ((startMinutes - dayStartMinutes) / 60) * 60;
  const height = ((endMinutes - startMinutes) / 60) * 60;
  
  return { top, height };
};

const getCurrentTimePosition = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayStartMinutes = parseTime("08:00");
  
  const position = ((currentMinutes - dayStartMinutes) / 60) * 60;
  return position;
};

const getStatusColor = (localStatus: string | null) => {
  if (localStatus === 'arrived') {
    return 'bg-purple-100 border-purple-400 text-purple-900';
  }
  if (localStatus === 'entered') {
    return 'bg-green-100 border-green-400 text-green-900';
  }
  return '';
};

const Index = () => {
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<{ booking: Booking; hallIdx: number } | null>(null);
  const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition());

  const { data, isLoading, error } = useQuery({
    queryKey: ['schedule'],
    queryFn: async () => {
      const response = await fetch('https://functions.poehali.dev/72c23f35-8acf-4a85-8ad8-d945be4ad72e');
      if (!response.ok) throw new Error('Failed to fetch schedule');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: statusesData, refetch: refetchStatuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const response = await fetch('https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0');
      if (!response.ok) throw new Error('Failed to fetch statuses');
      return response.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (data?.bookings) {
      setBookingsData(data.bookings);
    }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePosition(getCurrentTimePosition());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (bookingKey: string, status: string) => {
    try {
      await fetch('https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_key: bookingKey, status }),
      });
      refetchStatuses();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const deleteStatus = async (bookingKey: string) => {
    try {
      await fetch('https://functions.poehali.dev/f4d79b06-ae92-448d-8215-d890aa8f58c0', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_key: bookingKey }),
      });
      refetchStatuses();
    } catch (e) {
      console.error('Failed to delete status:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-4 md:mb-8 px-2">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">ФОТОСТУДИИ</h1>
          <p className="text-sm md:text-base text-gray-600">13 декабря 2025 {isLoading && '• Загрузка...'}</p>
          {error && <p className="text-red-600 text-sm mt-1">Ошибка загрузки данных</p>}
        </div>

        <Card className="overflow-hidden shadow-lg">
          <div className="flex">
            <div className="w-12 md:w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
              <div className="h-10 md:h-16 border-b border-gray-200"></div>
              <div className="relative" style={{ height: `${timeSlots.length * 45}px` }}>
                {timeSlots.map((time, idx) => (
                  <div key={time}>
                    <div
                      className="absolute w-full flex flex-col items-center"
                      style={{ top: `${idx * 45}px` }}
                    >
                      <span className="text-[10px] md:text-sm font-semibold text-gray-700">
                        {time}
                      </span>
                      <span className="text-[8px] md:text-[10px] text-gray-400 mt-1 md:mt-3">
                        :30
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${halls.length}, minmax(60px, 1fr))` }}>
                {halls.map((hall, idx) => (
                  <div key={hall} className="border-r border-gray-200 last:border-r-0">
                    <div className="h-10 md:h-16 border-b border-gray-200 flex items-center justify-center bg-gray-100 px-1">
                      <span className="text-[10px] md:text-sm font-semibold text-gray-800 text-center leading-tight">{hall}</span>
                    </div>

                    <div className="relative" style={{ height: `${timeSlots.length * 45}px` }}>
                      {timeSlots.map((_, timeIdx) => (
                        <div key={timeIdx}>
                          <div
                            className="absolute w-full border-b-2 border-gray-300"
                            style={{ top: `${timeIdx * 45}px` }}
                          ></div>
                          <div
                            className="absolute w-full border-b border-dashed border-gray-200"
                            style={{ top: `${timeIdx * 45 + 22.5}px` }}
                          ></div>
                        </div>
                      ))}

                      <div
                        className="absolute w-full h-0.5 bg-red-500 z-10 shadow-md"
                        style={{ top: `${currentTimePosition * 0.75}px` }}
                      ></div>

                      {bookingsData
                        .filter((booking) => booking.hall === hall)
                        .map((booking, bookingIdx) => {
                          const { top, height } = getBookingPosition(booking.time);
                          const bookingKey = `${booking.time}_${booking.hall}`;
                          const syncedStatus = statusesData?.statuses?.[bookingKey];
                          const baseColorClass = hallColors[idx % hallColors.length];
                          const statusColorClass = getStatusColor(syncedStatus);
                          const finalColorClass = statusColorClass || baseColorClass;

                          return (
                            <div
                              key={bookingIdx}
                              onClick={() => setSelectedBooking({ booking, hallIdx: idx })}
                              className={`absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded-sm md:rounded-md border-2 shadow-sm ${finalColorClass} p-0.5 md:p-1.5 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer overflow-hidden`}
                              style={{
                                top: `${top * 0.75}px`,
                                height: `${(height - 4) * 0.75}px`,
                              }}
                            >
                              <div className="text-[6px] md:text-[9px] font-semibold leading-none mb-0.5 whitespace-nowrap overflow-visible">{booking.time}</div>
                              {booking.people > 0 && (
                                <div className="text-[7px] md:text-[10px] opacity-80 leading-none whitespace-nowrap overflow-hidden text-ellipsis">{booking.people} чел.</div>
                              )}
                              {booking.comment && (
                                <div className="text-[6px] md:text-[9px] mt-0.5 opacity-70 leading-tight line-clamp-2 break-words">{booking.comment}</div>
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
          <Dialog open={true} onOpenChange={() => setSelectedBooking(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Установить статус брони</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="font-semibold">{selectedBooking.booking.hall}</p>
                  <p>{selectedBooking.booking.time}</p>
                  <p>{selectedBooking.booking.people} чел.</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      const key = `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`;
                      updateStatus(key, 'arrived');
                      setSelectedBooking(null);
                    }}
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                  >
                    Пришли
                  </Button>
                  <Button
                    onClick={() => {
                      const key = `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`;
                      updateStatus(key, 'entered');
                      setSelectedBooking(null);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Зашли
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const key = `${selectedBooking.booking.time}_${selectedBooking.booking.hall}`;
                    deleteStatus(key);
                    setSelectedBooking(null);
                  }}
                  className="w-full"
                >
                  Сбросить статус
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default Index;