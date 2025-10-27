export default function BusDetailsCard({ bus }) {
  const { route = {}, schedule = {} } = bus || {};
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        🚌 Bus Details
      </h2>
      <div className="space-y-2 text-sm">
        <Item label="Bus Name" value={bus?.busName} />

        <Item
          label="Route"
          value={`${route?.from || "-"} → ${route?.to || "-"}`}
        />
        <Item label="Departure" value={schedule?.departure || "-"} />
        <Item
          label="Price/Seat"
          value={`LKR ${Number(bus?.price || 0).toFixed(2)}`}
        />
      </div>
    </section>
  );
}

function Item({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? "-"}</span>
    </div>
  );
}
