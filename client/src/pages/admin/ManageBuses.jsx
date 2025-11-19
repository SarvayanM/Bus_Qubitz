// src/pages/ManageBuses.jsx
import { useEffect, useState, useRef } from "react";
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
import { motion } from "framer-motion";

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
  const [dragIndex, setDragIndex] = useState(-1);
  const [dragOverIndex, setDragOverIndex] = useState(-1);

  // View modal
  const [selectedBus, setSelectedBus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ref for edit form (scroll into view when editing)
  const editFormRef = useRef(null);

  const openViewModal = (bus) => {
    setSelectedBus(bus);
    setIsModalOpen(true);
  };

  const closeViewModal = () => {
    setIsModalOpen(false);
    setSelectedBus(null);
  };

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

        // company
        const c = await getCompanyById(companyId).catch((e) => {
          console.warn("getCompanyById failed:", e);
          throw e;
        });
        if (mounted)
          setCompanyName(c?.name || c?.companyName || c?.title || "(Company)");
        setCompanyEmail(
          c?.email || c?.companyEmail || c?.contactEmail || "(Email)"
        );

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

      // Smoothly scroll the user to the edit form at the bottom
      setTimeout(() => {
        if (editFormRef.current) {
          editFormRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 50);
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

  const movePickup = (from, to) =>
    setEditing((e) => {
      const arr = [...e.pickups];
      if (from < 0 || from >= arr.length) return e;
      if (to < 0) to = 0;
      if (to >= arr.length) to = arr.length - 1;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...e, pickups: arr };
    });

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    } catch (err) {
      // some browsers may throw when access denied
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
    try {
      e.dataTransfer.dropEffect = "move";
    } catch (err) {}
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromStr = e.dataTransfer?.getData?.("text/plain");
    const from = dragIndex >= 0 ? dragIndex : Number(fromStr ?? -1);
    if (from >= 0 && from !== index) {
      movePickup(from, index);
    }
    setDragIndex(-1);
    setDragOverIndex(-1);
  };

  const handleDragEnd = () => {
    setDragIndex(-1);
    setDragOverIndex(-1);
  };

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

  // Toast-based delete confirmation
  const handleDelete = (id) => {
    toast.custom(
      (t) => {
        const confirmDelete = async () => {
          try {
            await deleteBus(id);
            toast.dismiss(t.id);
            toast.success("Bus deleted.");
            const list = await getBusesByCompany(companyId);
            setBuses(Array.isArray(list) ? list : []);
            if (editing._id === id) cancelEdit();
          } catch (err) {
            toast.dismiss(t.id);
            toast.error(
              err?.response?.data?.message || err?.message || "Delete failed"
            );
          }
        };

        return (
          <div
            className={`max-w-sm w-full rounded-2xl border border-slate-200 bg-white shadow-xl px-4 py-3 sm:px-5 sm:py-4 transition-all duration-200 ${
              t.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 h-8 w-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-600">
                !
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  Delete this bus?
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  This action cannot be undone. The bus will be permanently
                  removed from your operational fleet.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 hover:shadow-md transition-all duration-150"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-150"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      },
      { duration: 10000 }
    );
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
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <BusLoader
          message="Error loading buses"
          subtext={
            err ||
            "Make sure you are logged in and the companyId cookie is set."
          }
          height="h-56"
          className="max-w-lg"
        />
      </div>
    );
  }

  // No company cookie → show a clear message (instead of a blank page)
  if (!companyId) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 shadow max-w-lg text-center">
          <h1 className="text-xl font-bold text-blue-900 mb-2">
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
    <div className="min-h-screen ">
      {/* Header (kept as you have it) */}
      <header className="bg-white/80 backdrop-blur-xl shadow-md border-b border-slate-200/70 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 mt-14">
          {/* Centered Company Name */}
          <div className="w-full flex flex-col items-center justify-center text-center gap-1 in-view animate-fly-in-from-top">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight">
              Manage Your Operational Bus Fleet
            </h1>

            <p className="mt-1 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Oversee all buses assigned to your company. Edit or delete buses
              as needed. Core company information is restricted and cannot be
              modified.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Company */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 transition-all duration-300 ease-out hover:shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Readonly label="Company" value={companyName} />
            <Readonly label="Company Email" value={companyEmail} />
            <div className="flex items-end">
              <p className="text-slate-600 text-sm">
                Select a bus below to view, edit, or delete
              </p>
            </div>
          </div>
        </motion.div>

        {/* List of buses - CARD layout */}
        <motion.section
          className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div className="px-6 py-6">
            {buses.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {buses.map((b, idx) => (
                  <motion.div
                    key={b._id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:shadow-2xl"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.3 }}
                    transition={{
                      duration: 0.4,
                      ease: "easeOut",
                      delay: (idx % 3) * 0.05,
                    }}
                    whileHover={{ y: -4 }}
                  >
                    {/* Top: Bus name & type */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Bus Name
                        </p>
                        <h2 className="text-base md:text-lg font-bold text-blue-900 truncate">
                          {b.busName || "-"}
                        </h2>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-900 border border-blue-100">
                        {b.type || "Normal"}
                      </span>
                    </div>

                    {/* Middle: Bus number + route */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          Bus No.
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {b.busNo || "-"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          Route
                        </span>
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 border border-slate-200">
                          <span>{b?.route?.from || "From ?"}</span>
                          <span className="text-slate-400">→</span>
                          <span>{b?.route?.to || "To ?"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Schedule / price / seats */}
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-500 uppercase">
                          Departure
                        </p>
                        <p className="font-semibold text-slate-800">
                          {b?.schedule?.departure || "-"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-500 uppercase">
                          Arrival
                        </p>
                        <p className="font-semibold text-slate-800">
                          {b?.schedule?.arrival || "-"}
                          {b?.schedule?.nextDayArrival ? (
                            <span className="ml-1 text-[10px] text-blue-700 font-semibold">
                              (Next Day)
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-500 uppercase">
                          Price
                        </p>
                        <p className="font-semibold text-blue-900">
                          LKR {Number(b.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-500 uppercase">
                          Seats
                        </p>
                        <p className="font-semibold text-slate-800">
                          {b.seats || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Frequency */}
                    <div className="mt-3">
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 border border-slate-200">
                        Frequency: {b.frequency || "Daily"}
                      </span>
                    </div>

                    {/* Actions: View + Edit + Delete */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(b)}
                        className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-800 hover:shadow-md"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(b._id)}
                        className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b._id)}
                        className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 hover:shadow-md"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-600 text-sm">
                No buses found. Add one first.
              </div>
            )}
          </div>
        </motion.section>

        {/* Edit form */}
        <motion.form
          ref={editFormRef}
          onSubmit={handleUpdate}
          className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 md:p-8 transition-all duration-300 ease-out hover:shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
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
            <ImagePicker
              label="Image"
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
            <Select
              searchable
              label="Route From"
              value={editing.route.from}
              onChange={(v) => setRoute("from", v)}
              options={SRI_LANKA_LOCATIONS}
            />
            <Select
              searchable
              label="Route To"
              value={editing.route.to}
              onChange={(v) => setRoute("to", v)}
              options={SRI_LANKA_LOCATIONS}
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-600">
                Add or remove pick-up places and times. Drag cards to reorder.
              </p>
              <button
                type="button"
                onClick={addPickup}
                className="cursor-pointer rounded-xl bg-blue-900 text-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-blue-800 hover:shadow-md transition-all duration-200"
              >
                + Add pickup
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {editing.pickups.map((p, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-xl border border-slate-200 bg-white p-4 flex items-end gap-3 shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing ${
                    dragIndex === i ? "opacity-70" : ""
                  } ${
                    dragOverIndex === i
                      ? "ring-2 ring-dashed ring-blue-200"
                      : ""
                  }`}
                >
                  <div className="flex-1">
                    <Select
                      searchable
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
                    className="cursor-pointer h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
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
              className={`rounded-xl px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 cursor-pointer ${
                editing._id
                  ? "bg-blue-900 hover:bg-blue-800 hover:shadow-lg"
                  : "bg-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="cursor-pointer rounded-xl px-6 py-3 font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      </main>

      {/* VIEW MODAL (full bus details) */}
      {isModalOpen && selectedBus && (
        <BusDetailsModal bus={selectedBus} onClose={closeViewModal} />
      )}
    </div>
  );
}

/* ---------------- atoms ---------------- */
function SectionTitle({ title }) {
  return (
    <h2 className="col-span-full mb-1 text-lg font-semibold text-blue-900">
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
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}
function Select({ label, value, onChange, options = [], searchable = false }) {
  if (!searchable) {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          {label}
        </label>
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
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

  // Searchable custom select (prefix filtering)
  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}

function SearchableSelect({ label, value, onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  // If a value is selected, show it in the input
  useEffect(() => {
    setFilter(value || "");
  }, [value]);

  const matches = options.filter((o) =>
    (o || "").toLowerCase().startsWith((filter || "").toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <input
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search..."
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-200"
      />

      {open && (
        <ul className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow z-50 p-1">
          {matches.length ? (
            matches.map((o) => (
              <li
                key={o}
                onClick={() => {
                  onChange(o);
                  setFilter(o);
                  setOpen(false);
                }}
                className="px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 rounded cursor-pointer"
              >
                {o}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}

function ImagePicker({ label, value, onChange }) {
  const [preview, setPreview] = useState(value || "");

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      onChange && onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-28 h-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-400 px-2">No image</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              handleFile(f);
            }}
            className="text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // clear
                setPreview("");
                onChange && onChange("");
              }}
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                // trigger file input click
                const el = document.getElementById("image-upload");
                if (el) el.click();
              }}
              className="cursor-pointer rounded-lg bg-blue-900 text-white px-3 py-1.5 text-sm hover:bg-blue-800 hover:shadow-sm transition-all duration-200"
            >
              Upload / Replace
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Accepted: images. Uploaded image will be saved as data URL.
          </p>
        </div>
      </div>
    </div>
  );
}
function Checkbox({ label, checked, onChange }) {
  return (
    <label className="mt-6 inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-500"
      />
      <span className="text-sm text-slate-800">{label}</span>
    </label>
  );
}

/* -------- View Modal (all details about a bus) -------- */
function BusDetailsModal({ bus, onClose }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
    >
      <motion.div
        className="max-w-3xl w-full rounded-2xl bg-white shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-blue-900 text-white">
          <div>
            <h2 className="text-lg font-bold">
              {bus.busName || "Bus Details"}
            </h2>
            <p className="text-xs text-blue-100">
              {bus.busNo ? `Registration: ${bus.busNo}` : "No registration set"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-50 hover:bg-blue-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid gap-6 md:grid-cols-[2fr,1.3fr]">
          {/* Left: text info */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Route
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {bus?.route?.from || "From ?"}{" "}
                <span className="text-slate-400">→</span>{" "}
                {bus?.route?.to || "To ?"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">
                  Departure
                </p>
                <p className="font-semibold text-slate-900">
                  {bus?.schedule?.departure || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">
                  Arrival
                </p>
                <p className="font-semibold text-slate-900">
                  {bus?.schedule?.arrival || "-"}
                  {bus?.schedule?.nextDayArrival ? (
                    <span className="ml-1 text-[10px] text-blue-700 font-semibold">
                      (Next Day)
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">Type</p>
                <p className="font-semibold text-slate-900">
                  {bus.type || "Normal"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">
                  Frequency
                </p>
                <p className="font-semibold text-slate-900">
                  {bus.frequency || "Daily"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">Price</p>
                <p className="font-semibold text-blue-900">
                  LKR {Number(bus.price || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-500 uppercase">Seats</p>
                <p className="font-semibold text-slate-900">
                  {bus.seats || "-"}
                </p>
              </div>
            </div>

            {/* Pickups */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Pick-up Points
              </p>
              {Array.isArray(bus.pickups) && bus.pickups.length ? (
                <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {bus.pickups.map((p, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-800">
                        {p.place || "Pickup location"}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {p.time || "--:--"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  No pick-up points configured.
                </p>
              )}
            </div>
          </div>

          {/* Right: image preview */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center h-48 md:h-full">
              {bus.imageUrl ? (
                <img
                  src={bus.imageUrl}
                  alt={bus.busName || "Bus"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 text-xs px-4">
                  <span className="font-semibold mb-1">No image available</span>
                  <span>
                    Upload a bus image in the edit section to show it here.
                  </span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              These details are read-only here. Use the{" "}
              <span className="font-semibold text-blue-900">Edit</span> button
              in the main list to make changes.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
