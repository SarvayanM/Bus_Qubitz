import React, { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie"; // ✅ add this
import VirtualizedSelect from "../../components/common/VirtualizedSelect";
import { createBus } from "../../api/bus";
import { SRI_LANKA_LOCATIONS } from "../../data/sriLankaLocations";

const BUS_TYPES = [
  "Select Bus Type",
  "Super Luxury",
  "Luxury",
  "Semi-Luxury",
  "Normal",
];
const FREQUENCY = ["Select Frequency", "Daily", "Every Other Day"];
const PICKUP_COUNT = 5;

const norm = (s) => (s || "").toLowerCase().trim();
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export default function AddBus() {
  const locations = useMemo(() => {
    const uniq = Array.from(new Set(SRI_LANKA_LOCATIONS));
    return uniq.sort((a, b) => a.localeCompare(b));
  }, []);

  const makeInitialForm = (companyId = "") => ({
    companyId,
    busName: "",
    busNo: "",
    seats: "",
    from: "",
    to: "",
    depTime: "",
    arrTime: "",
    nextDayArrival: false,
    type: BUS_TYPES[0],
    frequency: FREQUENCY[0],
    pickups: Array.from({ length: PICKUP_COUNT }, () => ({
      place: "",
      time: "",
    })),
    price: "",
    imageUrl: "",
  });

  const [form, setForm] = useState(makeInitialForm());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ read cookie correctly and write into form.companyId
  useEffect(() => {
    const cid = Cookies.get("companyId") || ""; // NOTE: camelCase key
    setForm((f) => ({ ...f, companyId: cid }));
  }, []);

  const setPickup = (idx, key, val) => {
    setForm((f) => {
      const copy = [...f.pickups];
      copy[idx] = { ...copy[idx], [key]: val };
      return { ...f, pickups: copy };
    });
  };

  const handleImageFile = async (file) => {
    setUploadError("");
    if (!file) return;

    const isImage = file.type?.startsWith("image/");
    if (!isImage) {
      const msg = "Please select an image file (JPG/PNG/WebP).";
      setUploadError(msg);
      toast.error(msg);
      return;
    }
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      const msg = `Image must be ≤ ${MAX_MB} MB.`;
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    try {
      setUploading(true);
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) {
        throw new Error(
          "Cloudinary env vars missing. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
        );
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", uploadPreset);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: fd,
        }
      );
      if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);

      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.secure_url }));
      toast.success("Image uploaded successfully.");
    } catch (e) {
      console.error(e);
      setUploadError(e?.message || "Upload failed");
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const errors = [];

    if (!form.imageUrl || !/^https?:\/\/.+/i.test(form.imageUrl)) {
      errors.push("Please upload a valid bus image.");
    }

    const busRegNoPattern = /^[A-Z]{2}\s[A-Z]{2,3}\s\d{4}$/;
    const busNamePattern = /^[A-Za-z][A-Za-z\s'.-]{1,49}$/; // ✅ keep as RegExp

    if (!form.busName.trim()) {
      errors.push("Bus Name is required.");
    } else if (!busNamePattern.test(form.busName.trim())) {
      errors.push("Invalid Bus Name.");
    }

    if (!form.busNo.trim()) {
      errors.push("Bus Registration No is required.");
    } else if (!busRegNoPattern.test(form.busNo.trim().toUpperCase())) {
      errors.push(
        "Invalid Bus Registration No. Format: e.g., WP NK 1234 or WP NKD 1234."
      );
    }

    if (!form.seats || isNaN(Number(form.seats)) || Number(form.seats) < 10) {
      errors.push("Seat count must be a number (≥ 10).");
    }

    if (!form.from) errors.push("Route From is required.");
    if (!form.to) errors.push("Route To is required.");
    if (form.from && form.to && norm(form.from) === norm(form.to)) {
      errors.push("Route From and To cannot be the same.");
    }

    if (!form.depTime) errors.push("Departure time is required.");
    if (!form.arrTime) errors.push("Arrival time is required.");

    if (form.depTime && form.arrTime) {
      const dep = toMinutes(form.depTime);
      const arr = toMinutes(form.arrTime);
      const arrAbs = form.nextDayArrival ? arr + 24 * 60 : arr;
      if (arrAbs <= dep) {
        errors.push(
          "Arrival must be after departure. If the bus arrives next day, tick 'Arrives next day?'."
        );
      }
      if (arrAbs - dep > 48 * 60) {
        errors.push("Unrealistic duration (over 48 hours). Check times.");
      }
    }

    if (form.price === "" || form.price === null || form.price === undefined) {
      errors.push("Price is required.");
    } else if (isNaN(Number(form.price))) {
      errors.push("Price must be a valid number.");
    } else if (Number(form.price) <= 100) {
      errors.push("Price must be greater than 100.");
    }

    if (form.type === BUS_TYPES[0]) errors.push("Please select a Bus Type.");
    if (form.frequency === FREQUENCY[0])
      errors.push("Please select a Frequency.");

    const seenPlaces = new Set();
    const seenCombo = new Set();
    form.pickups.forEach((p, i) => {
      if (!p.place) errors.push(`Pickup #${i + 1}: place is required.`);
      if (!p.time) errors.push(`Pickup #${i + 1}: time is required.`);
      const placeKey = norm(p.place);
      const comboKey = `${placeKey}|${p.time}`;

      if (p.place) {
        if (seenPlaces.has(placeKey)) {
          errors.push(
            `Pickup #${i + 1}: duplicate place '${
              p.place
            }'. Each pickup must be different.`
          );
        }
        seenPlaces.add(placeKey);
      }
      if (p.place && p.time) {
        if (seenCombo.has(comboKey)) {
          errors.push(
            `Pickup #${i + 1}: duplicate (place + time) as another pickup.`
          );
        }
        seenCombo.add(comboKey);
      }
    });

    // ✅ companyId presence (must exist to add bus for a company)
    if (!form.companyId) {
      errors.push(
        "Missing company context. Please log in as a bus owner again."
      );
    }

    return errors;
  };

  const confirmToast = (message) =>
    new Promise((resolve) => {
      toast.custom(
        (t) => (
          <div className="rounded-xl border bg-white p-4 shadow-xl w-[320px]">
            <div className="text-sm">{message}</div>
            <div className="mt-3 flex gap-2 justify-end">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#2563EB] text-[#2563EB] text-sm hover:bg-[#2563EB] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-sm hover:bg-[#138535] transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        ),
        { duration: 4000, position: "top-center", id: "confirm-add-bus" }
      );
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    if (errs.length) {
      errs.forEach((msg, i) =>
        setTimeout(() => toast.error(msg, { position: "top-right" }), i * 80)
      );
      return;
    }

    const ok = await confirmToast("Add this bus to the system?");
    if (!ok) return;

    const payload = {
      companyId: form.companyId,
      busName: form.busName.trim().toUpperCase(),
      busNo: form.busNo.trim().toUpperCase(),
      seats: Number(form.seats),
      route: { from: form.from, to: form.to },
      schedule: {
        departure: form.depTime,
        arrival: form.arrTime,
        nextDayArrival: !!form.nextDayArrival,
      },
      type: form.type,
      frequency: form.frequency,
      pickups: form.pickups.map((p) => ({ place: p.place, time: p.time })),
      price: Number(form.price),
      imageUrl: form.imageUrl,
    };

    try {
      await createBus(payload);
      toast.success("Bus added successfully.", { position: "top-center" });
      // ✅ preserve companyId when clearing
      const cid = Cookies.get("companyId") || "";
      setForm(makeInitialForm(cid));
      setUploadError("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add bus. Please try again.";
      const list = err?.response?.data?.errors;
      toast.error(msg, { position: "top-center" });
      if (Array.isArray(list))
        list.forEach((m, i) => setTimeout(() => toast.error(m), 200 + i * 80));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2563EB]/10 to-[#16A34A]/10 py-8 mt-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 drop-shadow-md">
            Add New Bus
          </h1>
          <p className="text-gray-800 text-lg drop-shadow-sm">
            Create new bus routes and schedules
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-[#2563EB]/20 shadow-lg p-6 lg:p-8"
        >
          {/* Image Upload */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Bus Image <span className="text-red-500">*</span>
            </label>

            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 p-4 bg-[#F9FAFB] rounded-xl border border-[#2563EB]/20">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                  disabled={uploading}
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#2563EB] file:text-white hover:file:bg-[#1d4ed8] transition-colors"
                />
                {uploadError && (
                  <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                )}
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-[#2563EB]">
                  <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
              {form.imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={form.imageUrl}
                    alt="Bus preview"
                    className="h-20 w-28 object-cover rounded-lg border-2 border-[#16A34A] shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bus Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.busName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, busName: e.target.value }))
                  }
                  onBlur={(e) =>
                    setForm((f) => ({
                      ...f,
                      busName: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g., Wijitha"
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bus Registration No <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.busNo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, busNo: e.target.value }))
                  }
                  onBlur={(e) =>
                    setForm((f) => ({
                      ...f,
                      busNo: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g., WP NK 1234"
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seats <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={10}
                  value={form.seats}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, seats: e.target.value }))
                  }
                  placeholder="e.g., 49"
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price per Seat <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={101}
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="e.g., 1200"
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Route Information
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VirtualizedSelect
                label="From"
                required
                value={form.from}
                onChange={(v) => setForm((f) => ({ ...f, from: v }))}
                options={locations}
                placeholder="Start typing: C → Co → Col…"
              />
              <VirtualizedSelect
                label="To"
                required
                value={form.to}
                onChange={(v) => setForm((f) => ({ ...f, to: v }))}
                options={locations}
                placeholder="Start typing: K → Ka → Kan…"
              />
            </div>
          </div>

          {/* Schedule Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Schedule Information
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Departure Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.depTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, depTime: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Arrival Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.arrTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, arrTime: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                  required
                />
                <div className="mt-3 flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#2563EB]/20">
                  <input
                    id="nextDay"
                    type="checkbox"
                    checked={form.nextDayArrival}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nextDayArrival: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#16A34A] focus:ring-[#16A34A] border-[#2563EB] rounded"
                  />
                  <label
                    htmlFor="nextDay"
                    className="text-sm font-medium text-gray-700 select-none"
                  >
                    Arrives next day?
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Bus Type & Frequency */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bus Configuration
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bus Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                >
                  {BUS_TYPES.map((t, i) => (
                    <option key={t} value={t} disabled={i === 0}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, frequency: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[#2563EB]/30 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                >
                  {FREQUENCY.map((t, i) => (
                    <option key={t} value={t} disabled={i === 0}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pickup Points */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Pick-up Points (5)
              </h2>
              <span className="text-sm text-gray-500 mt-1 lg:mt-0">
                Each pickup must have unique place and time
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {form.pickups.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#2563EB]/20 bg-[#F9FAFB] p-4 flex flex-col gap-3"
                >
                  <div className="text-sm font-semibold text-[#2563EB]">
                    #{idx + 1}
                  </div>
                  <VirtualizedSelect
                    label="Place"
                    required
                    value={p.place}
                    onChange={(v) => setPickup(idx, "place", v)}
                    options={locations}
                    placeholder="Type location..."
                  />
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={p.time}
                      onChange={(e) => setPickup(idx, "time", e.target.value)}
                      className="w-full rounded-lg border border-[#2563EB]/30 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-colors"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-top border-gray-200">
            <button
              type="button"
              onClick={() => {
                const cid = Cookies.get("companyId") || "";
                setForm(makeInitialForm(cid)); // ✅ preserve companyId
                setUploadError("");
                toast.success("Form cleared successfully.");
              }}
              className="px-6 py-3 rounded-xl border border-[#2563EB] text-[#2563EB] font-semibold hover:bg-[#2563EB] hover:text-white transition-all duration-200"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-8 py-3 rounded-xl bg-[#16A34A] text-white font-semibold hover:bg-[#138535] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {uploading ? "Uploading..." : "Add Bus to System"}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-[#F9FAFB] rounded-xl border border-[#2563EB]/20">
          <p className="text-sm text-gray-600 text-center">
            <strong>Tip:</strong> The location dropdown filters by prefix of
            your typed letters. It's virtualized for optimal performance with
            thousands of locations.
          </p>
        </div>
      </div>
    </div>
  );
}
