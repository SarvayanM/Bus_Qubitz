// src/pages/ManageBuses.jsx
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import BusLoader from "../../components/bus/BusLoader";
import {
  getBusesByCompany,
  getBusById,
  updateBus,
  deleteBus,
} from "../../api/bus";
import { getCompanyById } from "../../api/company";
import { SRI_LANKA_LOCATIONS } from "../../data/sriLankaLocations";

/* ---------------- helpers ---------------- */
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const emptyBus = {
  _id: "",
  companyId: "",
  busName: "",
  busNo: "",
  seats: "",
  price: "",
  imageUrl: "",
  route: { from: "", to: "" },
  schedule: { departure: "", arrival: "", nextDayArrival: false },
  type: "Normal",
  frequency: "Daily",
  pickups: [{ place: "", time: "" }],
};

export default function ManageBuses() {
  const [companyId, setCompanyId] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [buses, setBuses] = useState([]);
  const [editing, setEditing] = useState(emptyBus);

  /* -------- read cookie once -------- */
  useEffect(() => {
    const cid = Cookies.get("companyId") || "";
    setCompanyId(cid);
  }, []);

  /* -------- fetch company + buses -------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        if (!companyId) {
          // No cookie? show page with a helper message instead of blank screen
          return;
        }

        // company name
        const c = await getCompanyById(companyId).catch((e) => {
          console.warn("getCompanyById failed:", e);
          throw e;
        });
        if (mounted)
          setCompanyName(c?.name || c?.companyName || c?.title || "(Company)");
        setCompanyEmail(
          c?.email || c?.companyEmail || c?.contactEmail || "(Email)"
        );
        console.log(c.email);
        // buses
        const list = await getBusesByCompany(companyId).catch((e) => {
          console.warn("getBusesByCompany failed:", e);
          throw e;
        });
        if (mounted) setBuses(Array.isArray(list) ? list : []);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [companyId]);

  /* -------- editing helpers -------- */
  const pick = (b) => ({
    _id: b?._id || "",
    companyId: b?.companyId || companyId || "",
    busName: b?.busName || "",
    busNo: b?.busNo || "",
    seats: b?.seats || "",
    price: b?.price || "",
    imageUrl: b?.imageUrl || "",
    route: { from: b?.route?.from || "", to: b?.route?.to || "" },
    schedule: {
      departure: b?.schedule?.departure || "",
      arrival: b?.schedule?.arrival || "",
      nextDayArrival: !!b?.schedule?.nextDayArrival,
    },
    type: b?.type || "Normal",
    frequency: b?.frequency || "Daily",
    pickups:
      Array.isArray(b?.pickups) && b.pickups.length
        ? b.pickups.map((p) => ({ place: p.place || "", time: p.time || "" }))
        : [{ place: "", time: "" }],
  });

  const startEdit = async (id) => {
    try {
      const b = await getBusById(id);
      setEditing(pick(b));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e?.message || "Failed to load bus");
    }
  };

  const cancelEdit = () => setEditing(emptyBus);

  const setField = (key, val) => setEditing((e) => ({ ...e, [key]: val }));
  const setRoute = (key, val) =>
    setEditing((e) => ({ ...e, route: { ...e.route, [key]: val } }));
  const setSchedule = (key, val) =>
    setEditing((e) => ({ ...e, schedule: { ...e.schedule, [key]: val } }));

  const setPickup = (i, key, val) =>
    setEditing((e) => {
      const arr = [...e.pickups];
      arr[i] = { ...arr[i], [key]: val };
      return { ...e, pickups: arr };
    });

  const addPickup = () =>
    setEditing((e) => ({
      ...e,
      pickups: [...e.pickups, { place: "", time: "" }],
    }));

  const removePickup = (i) =>
    setEditing((e) => {
      const arr = e.pickups.filter((_, idx) => idx !== i);
      return { ...e, pickups: arr.length ? arr : [{ place: "", time: "" }] };
    });

  /* -------- validate + submit -------- */
  const validate = () => {
    const errs = [];
    if (!editing._id) errs.push("Select a bus to update.");
    if (!editing.busName.trim()) errs.push("Bus name is required.");
    if (!editing.busNo.trim()) errs.push("Bus number is required.");
    if (!editing.seats || Number(editing.seats) < 10)
      errs.push("Seats must be ≥ 10.");
    if (editing.price === "" || isNaN(Number(editing.price)))
      errs.push("Valid price is required.");
    if (!editing.route.from) errs.push("Route From is required.");
    if (!editing.route.to) errs.push("Route To is required.");
    if (
      editing.route.from &&
      editing.route.to &&
      editing.route.from === editing.route.to
    )
      errs.push("From and To cannot be same.");
    if (!editing.schedule.departure) errs.push("Departure time is required.");
    if (!editing.schedule.arrival) errs.push("Arrival time is required.");
    const dep = toMinutes(editing.schedule.departure);
    const arr = toMinutes(editing.schedule.arrival);
    const arrAbs = editing.schedule.nextDayArrival ? arr + 24 * 60 : arr;
    if (dep != null && arr != null && arrAbs <= dep)
      errs.push("Arrival must be after departure.");
    (editing.pickups || []).forEach((p, i) => {
      if (!p.place) errs.push(`Pickup #${i + 1}: place is required.`);
      if (!p.time) errs.push(`Pickup #${i + 1}: time is required.`);
    });
    return errs;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      errs.forEach((msg, i) => setTimeout(() => toast.error(msg), i * 60));
      return;
    }
    try {
      const payload = {
        companyId: editing.companyId,
        busName: editing.busName.trim().toUpperCase(),
        busNo: editing.busNo.trim().toUpperCase(),
        seats: Number(editing.seats),
        price: Number(editing.price),
        imageUrl: editing.imageUrl,
        route: { ...editing.route },
        schedule: { ...editing.schedule },
        type: editing.type,
        frequency: editing.frequency,
        pickups: editing.pickups.map((p) => ({ place: p.place, time: p.time })),
      };
      await updateBus(editing._id, payload);
      toast.success("Bus updated.");
      const list = await getBusesByCompany(companyId);
      setBuses(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Update failed"
      );
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Delete this bus? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteBus(id);
      toast.success("Bus deleted.");
      const list = await getBusesByCompany(companyId);
      setBuses(Array.isArray(list) ? list : []);
      if (editing._id === id) cancelEdit();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    }
  };

  /* -------------------- UI -------------------- */

  // Loading state (full-screen so you SEE something)
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Loading buses..."
          subtext="Fetching company buses"
          height="h-56"
          className="max-w-lg"
        />
      </div>
    );
  }

  // Explicit error state
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="rounded-xl border border-rose-200 bg-white px-6 py-4 shadow max-w-lg text-center">
          <div className="text-rose-600 font-semibold text-lg mb-1">Error</div>
          <p className="text-slate-700">{err}</p>
        </div>
      </div>
    );
  }

  // No company cookie → show a clear message (instead of a blank page)
  if (!companyId) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 shadow max-w-lg text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            No Company Selected
          </h1>
          <p className="text-slate-700">
            We couldn’t find{" "}
            <code className="px-1 py-0.5 bg-slate-100 rounded">companyId</code>{" "}
            in your cookies. Make sure you’re logged in as a bus owner and try
            again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Manage Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600">
              Operational Bus Fleet
            </span>
          </h1>
          <p className="mt-2 text-slate-600">
            Oversee all buses assigned to your company. Edit or delete buses as
            needed. Core company information is restricted and cannot be
            modified
          </p>
        </header>

        {/* Company */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Readonly label="Company" value={companyName} />
            <Readonly label="Company Email" value={companyEmail} />
            <div className="flex items-end">
              <p className="text-slate-600 text-sm">
                Select a bus below to edit or delete.
              </p>
            </div>
          </div>
        </div>

        {/* List / table */}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-indigo-600 text-white">
            <div className="text-lg font-semibold">Your Buses</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>No</Th>
                  <Th>Seats</Th>
                  <Th>Price</Th>
                  <Th>Route</Th>
                  <Th>Depart</Th>
                  <Th>Arrive</Th>
                  <Th>Type</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buses.map((b, i) => (
                  <tr key={b._id} className="odd:bg-white even:bg-slate-50">
                    <Td className="font-medium">{b.busName}</Td>
                    <Td>{b.busNo}</Td>
                    <Td>{b.seats}</Td>
                    <Td>LKR {Number(b.price).toFixed(2)}</Td>
                    <Td>
                      {b?.route?.from} → {b?.route?.to}
                    </Td>
                    <Td>{b?.schedule?.departure}</Td>
                    <Td>
                      {b?.schedule?.arrival}
                      {b?.schedule?.nextDayArrival ? " (Next Day)" : ""}
                    </Td>
                    <Td>{b.type}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(b._id)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b._id)}
                          className="rounded-lg bg-rose-600 text-white px-3 py-1.5 text-xs shadow hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {!buses.length && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-8 text-center text-slate-600"
                    >
                      No buses found. Add one first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {/* Edit form */}
        <form
          onSubmit={handleUpdate}
          className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 md:p-8"
        >
          <SectionTitle title="Edit Bus Details" />
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="Bus Name"
              value={editing.busName}
              onChange={(v) => setField("busName", v)}
            />
            <Field
              label="Bus Registration No"
              value={editing.busNo}
              onChange={(v) => setField("busNo", v)}
            />
            <Field
              label="Seats"
              type="number"
              value={editing.seats}
              onChange={(v) => setField("seats", v)}
            />
            <Field
              label="Price (LKR)"
              type="number"
              value={editing.price}
              onChange={(v) => setField("price", v)}
            />
            <Field
              label="Image URL"
              value={editing.imageUrl}
              onChange={(v) => setField("imageUrl", v)}
            />
            <Select
              label="Type"
              value={editing.type}
              onChange={(v) => setField("type", v)}
              options={["Super Luxury", "Luxury", "Semi-Luxury", "Normal"]}
            />
            <Select
              label="Frequency"
              value={editing.frequency}
              onChange={(v) => setField("frequency", v)}
              options={["Daily", "Every Other Day"]}
            />
            <Field
              label="Route From"
              value={editing.route.from}
              onChange={(v) => setRoute("from", v)}
            />
            <Field
              label="Route To"
              value={editing.route.to}
              onChange={(v) => setRoute("to", v)}
            />
            <Field
              label="Departure (HH:MM)"
              type="time"
              value={editing.schedule.departure}
              onChange={(v) => setSchedule("departure", v)}
            />
            <Field
              label="Arrival (HH:MM)"
              type="time"
              value={editing.schedule.arrival}
              onChange={(v) => setSchedule("arrival", v)}
            />
            <Checkbox
              label="Arrives next day?"
              checked={editing.schedule.nextDayArrival}
              onChange={(v) => setSchedule("nextDayArrival", v)}
            />
          </div>

          {/* Pickups */}
          <div className="mt-8">
            <SectionTitle title="Pick-up Points" />
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Add or remove pick-up places and times.
              </p>
              <button
                type="button"
                onClick={addPickup}
                className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm shadow hover:bg-indigo-700"
              >
                + Add pickup
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {editing.pickups.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-end gap-3"
                >
                  <div className="flex-1">
                    <Select
                      label={`Place #${i + 1}`}
                      value={p.place}
                      onChange={(v) => setPickup(i, "place", v)}
                      options={SRI_LANKA_LOCATIONS}
                    />
                  </div>
                  <div className="w-40">
                    <Field
                      label="Time"
                      type="time"
                      value={p.time}
                      onChange={(v) => setPickup(i, "time", v)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePickup(i)}
                    className="h-10 rounded-lg border px-3 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!editing._id}
              className={`rounded-xl px-6 py-3 font-semibold text-white shadow transition ${
                editing._id
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl px-6 py-3 font-semibold border text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- atoms ---------------- */
function SectionTitle({ title }) {
  return (
    <h2 className="col-span-full mb-1 text-lg font-semibold text-slate-900">
      {title}
    </h2>
  );
}
function Readonly({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <input
        value={value || "-"}
        readOnly
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm"
      />
    </div>
  );
}
function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            type === "number"
              ? e.target.valueAsNumber || e.target.value
              : e.target.value
          )
        }
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}
function Select({ label, value, onChange, options = [] }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="mt-6 inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="text-sm text-slate-800">{label}</span>
    </label>
  );
}
function Th({ children }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap">
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return (
    <td
      className={`px-4 py-3 text-slate-900 align-top whitespace-nowrap ${className}`}
    >
      {children}
    </td>
  );
}
