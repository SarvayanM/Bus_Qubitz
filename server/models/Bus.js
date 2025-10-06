// models/Bus.js
import mongoose from "mongoose";

// ---------- Helpers ----------
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // 00:00..23:59
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const norm = (s) => (s || "").trim().toLowerCase();
const isHttpsUrl = (v) => /^https?:\/\/.+/i.test(v || "");

const PickupSchema = new mongoose.Schema(
  {
    place: {
      type: String,
      required: [true, "Pickup place is required"],
      trim: true,
    },
    time: {
      type: String,
      required: [true, "Pickup time is required"],
      validate: {
        validator: (v) => HHMM_RE.test(v),
        message: "Pickup time must be HH:MM (24h)",
      },
    },
  },
  { _id: false }
);

const BusSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    busName: {
      type: String,
      required: [true],
      trim: true,
      unique: true,
    },
    busNo: {
      type: String,
      required: [true, "Bus Registration No is required"],
      trim: true,
      unique: true,
      match: [
        /^[A-Z]{2}\s[A-Z]{2,3}\s\d{4}$/,
        "Bus Registration No format looks invalid (e.g., WP NK 1234)",
      ],
    },

    seats: {
      type: Number,
      required: [true, "Seat count is required"],
      min: [10, "Seat count must be at least 10"],
      max: [100, "Seat count seems unrealistic (max 100)"],
      validate: {
        validator: Number.isInteger,
        message: "Seat count must be an integer",
      },
    },

    // Price per seat
    price: {
      type: Number,
      required: [true, "Price per seat is required"],
      min: [101, "Price must be greater than 100"],
    },

    // 👇 New: Image URL (Cloudinary or any https URL)
    imageUrl: {
      type: String,
      required: [true, "Bus image is required"],
      trim: true,
      validate: [
        {
          validator: isHttpsUrl,
          message: "Image URL must be a valid http(s) URL",
        },
        {
          // Soft hint to catch obvious non-image links; keep loose to allow Cloudinary transformations
          validator: (v) =>
            /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(v) ||
            /res\.cloudinary\.com/i.test(v),
          message:
            "Image URL should point to an image (png/jpg/webp) or a Cloudinary resource",
        },
      ],
    },

    route: {
      from: {
        type: String,
        required: [true, "Route 'From' is required"],
        trim: true,
      },
      to: {
        type: String,
        required: [true, "Route 'To' is required"],
        trim: true,
      },
    },

    schedule: {
      departure: {
        type: String,
        required: [true, "Departure time is required"],
        validate: {
          validator: (v) => HHMM_RE.test(v),
          message: "Departure must be HH:MM (24h)",
        },
      },
      arrival: {
        type: String,
        required: [true, "Arrival time is required"],
        validate: {
          validator: (v) => HHMM_RE.test(v),
          message: "Arrival must be HH:MM (24h)",
        },
      },
      nextDayArrival: {
        type: Boolean,
        default: false,
      },
    },

    type: {
      type: String,
      required: [true, "Bus Type is required"],
      enum: ["Super Luxury", "Luxury", "Semi-Luxury", "Normal"],
    },

    frequency: {
      type: String,
      required: [true, "Frequency is required"],
      enum: ["Daily", "Every Other Day"],
    },

    pickups: {
      type: [PickupSchema],
      validate: [
        {
          validator: (arr) => Array.isArray(arr) && arr.length === 5,
          message: "Exactly 5 pickup points are required",
        },
        {
          validator: (arr) => {
            const set = new Set(arr.map((p) => norm(p.place)));
            return set.size === arr.length;
          },
          message:
            "Pickup places must be unique; duplicate place detected among the 5",
        },
        {
          validator: (arr) => {
            const combo = new Set(arr.map((p) => `${norm(p.place)}|${p.time}`));
            return combo.size === arr.length;
          },
          message:
            "Pickup (place + time) pairs must be unique; duplicate pair detected",
        },
      ],
    },
  },
  { timestamps: true }
);

// --------- Cross-field Validators ---------
BusSchema.pre("validate", function (next) {
  if (
    this.route?.from &&
    this.route?.to &&
    norm(this.route.from) === norm(this.route.to)
  ) {
    this.invalidate("route.to", "Route 'From' and 'To' cannot be the same");
  }

  if (this.schedule?.departure && this.schedule?.arrival) {
    const dep = toMinutes(this.schedule.departure);
    const arr = toMinutes(this.schedule.arrival);
    let arrAbs = arr;
    if (this.schedule.nextDayArrival) arrAbs += 24 * 60;

    if (arrAbs <= dep) {
      this.invalidate(
        "schedule.arrival",
        "Arrival must be after departure. If it arrives next day, set 'nextDayArrival'"
      );
    }

    const total = arrAbs - dep;
    const MAX_ROUTE_MIN = 48 * 60;
    if (total > MAX_ROUTE_MIN) {
      this.invalidate(
        "schedule.arrival",
        "Unrealistic duration (over 48 hours). Check times"
      );
    }
  }

  next();
});

// Helpful indexes
BusSchema.index({ "route.from": 1, "route.to": 1 });
BusSchema.index({ "schedule.departure": 1 });

export default mongoose.model("Bus", BusSchema);
