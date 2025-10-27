import React from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ListChecks, X, MapPin } from "lucide-react";

/** Centered full-screen timetable toast */
export function showTimetableToast(pickups = [], onClose) {
  toast.dismiss("timetable"); // close prior instance if any

  const id = toast.custom(
    (t) =>
      // Render the toast into document.body via a portal so it's not clipped
      createPortal(
        // fixed wrapper ensures the toast is centered regardless of Toaster containers
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            paddingLeft: 16,
            paddingRight: 16,
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            style={{ pointerEvents: "auto" }}
            className={`w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
              t.visible ? "animate-in" : "animate-out"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3 text-gray-900 font-semibold text-lg">
                <ListChecks className="w-5 h-5 text-blue-900" />
                Bus Timetable
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  onClose?.();
                }}
                className="p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 max-h-[80vh] overflow-y-auto">
              <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-900" />
                  <p className="text-base font-semibold text-gray-900">
                    Boarding Points
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200">
                      <tr className="text-gray-700">
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          #
                        </th>
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          Location
                        </th>
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pickups.map((p, i) => (
                        <tr
                          key={`${p.place}-${p.time}-${i}`}
                          className="hover:bg-blue-50 transition-colors duration-150"
                        >
                          <td className="py-3 px-6 text-gray-600 font-medium">
                            {i + 1}
                          </td>
                          <td className="py-3 px-6 text-gray-900 font-medium">
                            {p.place}
                          </td>
                          <td className="py-3 px-6 text-blue-900 font-semibold">
                            {p.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-900" />
                  <p className="text-base font-semibold text-gray-900">
                    Drop-off Points
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-gray-200">
                      <tr className="text-gray-700">
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          #
                        </th>
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          Location
                        </th>
                        <th className="py-3 px-6 text-left font-semibold text-xs uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...pickups].reverse().map((p, idx, arr) => (
                        <tr
                          key={`drop-${p.place}-${p.time}-${idx}`}
                          className="hover:bg-blue-50 transition-colors duration-150"
                        >
                          <td className="py-3 px-6 text-gray-600 font-medium">
                            {arr.length - idx}
                          </td>
                          <td className="py-3 px-6 text-gray-900 font-medium">
                            {p.place}
                          </td>
                          <td className="py-3 px-6 text-blue-900 font-semibold">
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
        </div>,
        document.body
      ),
    { id: "timetable", duration: Infinity, position: "top-center" } // position doesn't matter with overlay
  );
  return id;
}
