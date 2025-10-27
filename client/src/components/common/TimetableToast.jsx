import React from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ListChecks, X, MapPin } from "lucide-react";

/**
 * showTimetableToast(pickups: Array<{place, time}>, onClose?: fn)
 * Renders a toast with boarding/dropoff points in a two-column table.
 */
export function showTimetableToast(pickups = [], onClose) {
  const id = toast.custom(
    (t) => (
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        className={`w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden ${
          t.visible ? "animate-in" : "animate-out"
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <ListChecks className="w-4 h-4 text-blue-700" />
            Timetable
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onClose?.();
            }}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5">
          <div className="rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <p className="text-sm font-semibold text-gray-800">
                Boarding Points
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-gray-500">
                    <th className="py-2 px-3 text-left font-medium">#</th>
                    <th className="py-2 px-3 text-left font-medium">
                      Location
                    </th>
                    <th className="py-2 px-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {pickups.map((p, i) => (
                    <tr
                      key={`${p.place}-${p.time}-${i}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                      <td className="py-2 px-3 text-gray-900">{p.place}</td>
                      <td className="py-2 px-3 text-blue-700 font-medium">
                        {p.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-700" />
              <p className="text-sm font-semibold text-gray-800">
                Drop-off Points
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-gray-500">
                    <th className="py-2 px-3 text-left font-medium">#</th>
                    <th className="py-2 px-3 text-left font-medium">
                      Location
                    </th>
                    <th className="py-2 px-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pickups].reverse().map((p, idx, arr) => (
                    <tr
                      key={`drop-${p.place}-${p.time}-${idx}`}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-600">
                        {arr.length - idx}
                      </td>
                      <td className="py-2 px-3 text-gray-900">{p.place}</td>
                      <td className="py-2 px-3 text-blue-700 font-medium">
                        {p.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    ),
    { duration: 600000 }
  );

  return id;
}

export function TimetableButton({
  pickups = [],
  disabled = false,
  className = "",
  children = "Timetable",
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => showTimetableToast(pickups)}
      className={`${className} inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2.5 rounded-lg transition`}
      title="View timetable"
    >
      {children}
    </button>
  );
}
