export default function SeatLegend() {
  const items = [
    { label: "Available", cls: "bg-white border border-gray-400" },
    { label: "Selected", cls: "bg-emerald-500" },
    { label: "Booked (Male)", cls: "bg-blue-700" },
    { label: "Booked (Female)", cls: "bg-rose-600" },
    { label: "Booked (Other)", cls: "bg-violet-600" },
    { label: "Unavailable", cls: "bg-gray-500" },
  ];

  return (
    <div className="flex flex-wrap gap-4 justify-end">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 transition-transform hover:scale-105"
        >
          <span
            className={`inline-block w-4 h-4 rounded-md shadow-sm ${it.cls}`}
          />
          <span className="text-sm font-medium text-gray-700">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
