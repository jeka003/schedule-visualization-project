import { Card } from "@/components/ui/card";

interface Booking {
  time: string;
  hall: string;
  people: number;
}

const bookingsData: Booking[] = [
  { time: "09:00–11:00", hall: "Urban", people: 1 },
  { time: "09:00–11:00", hall: "17/11", people: 2 },
  { time: "09:30–18:30", hall: "Мастерская", people: 5 },
  { time: "10:00–11:00", hall: "Графит", people: 5 },
  { time: "11:00–12:00", hall: "Soft", people: 5 },
  { time: "11:00–14:00", hall: "Мишель", people: 4 },
  { time: "11:00–12:00", hall: "17/11", people: 3 },
  { time: "11:30–13:30", hall: "Монро", people: 1 },
  { time: "11:30–13:30", hall: "Моне", people: 1 },
  { time: "12:00–13:00", hall: "17/11", people: 6 },
  { time: "12:00–13:00", hall: "Shanti", people: 4 },
  { time: "12:00–13:00", hall: "Soft", people: 3 },
  { time: "13:00–14:00", hall: "Soft", people: 9 },
  { time: "13:00–14:00", hall: "17/11", people: 5 },
  { time: "13:00–14:00", hall: "Urban", people: 4 },
  { time: "13:00–15:00", hall: "Циклорама А", people: 0 },
  { time: "13:00–14:00", hall: "Циклорама Б", people: 3 },
  { time: "13:30–15:30", hall: "Моне", people: 4 },
  { time: "13:30–13:30", hall: "Монро", people: 2 },
  { time: "14:00–15:00", hall: "Shanti", people: 9 },
  { time: "14:00–15:00", hall: "17/11", people: 6 },
  { time: "14:00–15:00", hall: "Графит", people: 2 },
  { time: "14:00–15:00", hall: "Urban", people: 5 },
  { time: "14:00–15:00", hall: "Soft", people: 6 },
  { time: "14:00–15:00", hall: "Мишель", people: 5 },
  { time: "14:00–15:00", hall: "Циклорама Б", people: 3 },
  { time: "14:30–15:30", hall: "Монро", people: 2 },
  { time: "15:00–16:00", hall: "Мишель", people: 2 },
  { time: "15:00–17:00", hall: "Циклорама Б", people: 2 },
  { time: "15:00–17:00", hall: "Soft", people: 2 },
  { time: "15:00–16:00", hall: "17/11", people: 5 },
  { time: "15:00–16:00", hall: "Urban", people: 5 },
  { time: "15:00–16:00", hall: "Shanti", people: 4 },
  { time: "15:00–17:00", hall: "Графит", people: 2 },
  { time: "15:30–16:30", hall: "Моне", people: 3 },
  { time: "15:30–16:30", hall: "Монро", people: 1 },
  { time: "16:00–17:00", hall: "17/11", people: 3 },
  { time: "16:00–17:00", hall: "Urban", people: 4 },
  { time: "16:00–17:00", hall: "Shanti", people: 2 },
  { time: "16:00–17:00", hall: "Циклорама А", people: 3 },
];

const halls = [
  "Urban",
  "17/11",
  "Мастерская",
  "Графит",
  "Soft",
  "Мишель",
  "Монро",
  "Моне",
  "Shanti",
  "Циклорама А",
  "Циклорама Б",
];

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const hallColors = [
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-yellow-100 border-yellow-300 text-yellow-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-red-100 border-red-300 text-red-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
  "bg-violet-100 border-violet-300 text-violet-900",
];

const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const getBookingPosition = (timeRange: string) => {
  const [start, end] = timeRange.split("–");
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  const dayStartMinutes = parseTime("09:00");
  
  const top = ((startMinutes - dayStartMinutes) / 60) * 60;
  const height = ((endMinutes - startMinutes) / 60) * 60;
  
  return { top, height };
};

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Расписание фотостудии</h1>
          <p className="text-gray-600">13 декабря 2025</p>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <div className="flex">
            <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
              <div className="h-16 border-b border-gray-200"></div>
              <div className="relative" style={{ height: `${timeSlots.length * 60}px` }}>
                {timeSlots.map((time, idx) => (
                  <div key={time}>
                    <div
                      className="absolute w-full flex flex-col items-center"
                      style={{ top: `${idx * 60}px` }}
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        {time}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-3">
                        :30
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="grid grid-cols-11 min-w-[1400px]">
                {halls.map((hall, idx) => (
                  <div key={hall} className="border-r border-gray-200 last:border-r-0">
                    <div className="h-16 border-b border-gray-200 flex items-center justify-center bg-gray-100 px-2">
                      <span className="text-sm font-semibold text-gray-800 text-center">{hall}</span>
                    </div>

                    <div className="relative" style={{ height: `${timeSlots.length * 60}px` }}>
                      {timeSlots.map((_, timeIdx) => (
                        <div key={timeIdx}>
                          <div
                            className="absolute w-full border-b-2 border-gray-300"
                            style={{ top: `${timeIdx * 60}px` }}
                          ></div>
                          <div
                            className="absolute w-full border-b border-dashed border-gray-200"
                            style={{ top: `${timeIdx * 60 + 30}px` }}
                          ></div>
                        </div>
                      ))}

                      {bookingsData
                        .filter((booking) => booking.hall === hall)
                        .map((booking, bookingIdx) => {
                          const { top, height } = getBookingPosition(booking.time);
                          const colorClass = hallColors[idx % hallColors.length];

                          return (
                            <div
                              key={bookingIdx}
                              className={`absolute left-1 right-1 rounded-md border-2 shadow-sm ${colorClass} p-2 overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer`}
                              style={{
                                top: `${top}px`,
                                height: `${height - 4}px`,
                              }}
                            >
                              <div className="text-xs font-semibold mb-1">{booking.time}</div>
                              {booking.people > 0 && (
                                <div className="text-xs opacity-80">{booking.people} чел.</div>
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

        <div className="mt-6 text-sm text-gray-500 text-center">
          Наведите курсор на бронирование для подробностей
        </div>
      </div>
    </div>
  );
};

export default Index;