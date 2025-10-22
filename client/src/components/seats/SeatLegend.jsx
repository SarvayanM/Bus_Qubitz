export default function SeatLegend() {
  const items = [
    { label: "Available", cls: "bg-white border border-blue-600" },
    { label: "Selected", cls: "bg-emerald-600" }, // single green selected
    { label: "Booked (Male)", cls: "bg-blue-900" },
    { label: "Booked (Female)", cls: "bg-pink-800" },
    { label: "Booked (Other)", cls: "bg-purple-800" },
    { label: "Unavailable", cls: "bg-gray-600" },
  ];
  return (
    <div className="flex flex-wrap gap-3 justify-end">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`inline-block w-3.5 h-3.5 rounded ${it.cls}`} />
          <span className="text-xs text-gray-600">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
