import { useLocation, useNavigate } from "react-router-dom";

export default function CheckoutSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const state =
    location.state ||
    JSON.parse(sessionStorage.getItem("checkout-summary") || "{}");

  const {
    from,
    to,
    date,
    bus = {},
    seats = [],
    passenger = {},
    pickup,
    drop,
    payment,
    total,
  } = state || {};

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-4">Checkout Summary</h1>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Item label="From" value={from} />
              <Item label="To" value={to} />
              <Item label="Date" value={date} />
              <Item label="Pickup" value={pickup} />
              <Item label="Drop" value={drop} />
            </div>
            <div className="space-y-2">
              <Item label="Bus No" value={bus.busNo} />
              <Item label="Bus Name" value={bus.busName} />
              <Item label="Type" value={bus.type} />
              <Item label="Frequency" value={bus.frequency} />
              <Item label="Departure" value={bus.depart} />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2">Seats</h3>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-500">
                    <th className="py-2 px-3 text-left font-medium">#</th>
                    <th className="py-2 px-3 text-left font-medium">Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map((s) => (
                    <tr key={s.number} className="border-t">
                      <td className="py-2 px-3">{s.number}</td>
                      <td className="py-2 px-3">{s.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Item
                label="Passenger"
                value={`${passenger.fname || ""} ${passenger.lname || ""}`}
              />
              <Item label="Phone" value={passenger.phone} />
            </div>
            <div className="space-y-2">
              <Item label="Payment" value={payment} />
              <Item
                label="Total"
                value={`LKR ${Number(total || 0).toFixed(2)}`}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
            >
              Back
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value ?? "-"}</span>
    </div>
  );
}
