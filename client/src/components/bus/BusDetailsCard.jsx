export default function BusDetailsCard({ bus }) {
  const { route = {}, schedule = {} } = bus || {};
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        🚌 Bus Details
      </h2>
      <div className="space-y-2 text-sm">
        <Item label="Bus Number" value={bus?.busNo} />
        <Item label="Bus Name" value={bus?.busName} />
        <Item label="Type" value={bus?.type} />
        <Item label="Frequency" value={bus?.frequency} />
        <Item
          label="Route"
          value={`${route?.from || "-"} → ${route?.to || "-"}`}
        />
        <Item label="Departure" value={schedule?.departure || "-"} />
        <Item
          label="Price/Seat"
          value={`LKR ${Number(bus?.price || 0).toFixed(2)}`}
        />
        <Item label="Total Seats" value={bus?.seats} />
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
