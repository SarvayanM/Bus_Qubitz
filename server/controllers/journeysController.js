// backend/controllers/journeysController.js
import Bus from "../models/Bus.js";

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Escape user input before creating RegExp to avoid special-character issues
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getJourneys(req, res) {
  try {
    let { from = "", to = "", date = "", page = "1", limit = "8" } = req.query;

    // Trim inputs
    from = typeof from === "string" ? from.trim() : from;
    to = typeof to === "string" ? to.trim() : to;
    date = typeof date === "string" ? date.trim() : date;

    const pageNum = toInt(page, 1);
    const limitNum = Math.min(toInt(limit, 8), 48);
    const skip = (pageNum - 1) * limitNum;

    // Build base match only using from/to (do NOT filter by date here)
    const match = {};
    if (from) {
      match["route.from"] = { $regex: new RegExp(escapeRegExp(from), "i") };
    }
    if (to) {
      match["route.to"] = { $regex: new RegExp(escapeRegExp(to), "i") };
    }

    // Build pipeline:
    //  - match by from/to only
    //  - lookup company
    //  - optionally lookup bookings for the specific date (to compute seatsBooked/seatsAvailable)
    //  - compute fields
    //  - sort/skip/limit & facet for total
    const pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },

      // If date provided, lookup bookings for that date to compute seatsBooked
      ...(date
        ? [
            {
              $lookup: {
                from: "bookings",
                let: { busId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$busId", "$$busId"] },
                          // travelDate may be stored as a string 'YYYY-MM-DD' in bookings
                          // or as Date — the equality below assumes the stored value equals `date`.
                          // If you store travelDate as an ISO Date, convert accordingly in queries.
                          { $eq: ["$travelDate", date] },
                          { $ne: ["$status", "Cancelled"] },
                        ],
                      },
                    },
                  },
                  // If seats are stored as an array of seat objects/ids in booking.seats, unwind & count
                  {
                    $unwind: {
                      path: "$seats",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      count: {
                        $sum: { $cond: [{ $ifNull: ["$seats", false] }, 1, 0] },
                      },
                    },
                  },
                ],
                as: "bookings",
              },
            },
          ]
        : []),

      {
        $addFields: {
          operatorName: { $ifNull: ["$company.name", "$busName"] },
          companyName: "$company.name",
          plateNo: "$busNo",
          from: "$route.from",
          to: "$route.to",
          departureTime: "$schedule.departure",
          seatsTotal: "$seats",
          seatsBooked: {
            $ifNull: [{ $arrayElemAt: ["$bookings.count", 0] }, 0],
          },
          seatsAvailable: {
            $cond: {
              // if date provided, subtract booked seats; otherwise leave as total seats
              if: date && date !== "",
              then: {
                $subtract: [
                  "$seats",
                  { $ifNull: [{ $arrayElemAt: ["$bookings.count", 0] }, 0] },
                ],
              },
              else: "$seats",
            },
          },
        },
      },

      {
        $facet: {
          pageData: [
            {
              $sort: {
                "route.from": 1,
                "route.to": 1,
                "schedule.departure": 1,
                _id: 1,
              },
            },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                busName: 1,
                plateNo: 1,
                operatorName: 1,
                companyName: 1,
                route: 1,
                schedule: 1,
                from: 1,
                to: 1,
                departureTime: 1,
                seatsTotal: 1,
                seatsBooked: 1,
                seatsAvailable: 1,
                price: 1,
                pickups: 1,
                // include type/frequency so frontend cards can show consistent details
                type: 1,
                frequency: 1,
                features: 1,
              },
            },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
      {
        $project: {
          items: "$pageData",
          total: { $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0] },
        },
      },
    ];

    const [result] = await Bus.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return res.status(200).json({
      ok: true,
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    });
  } catch (err) {
    console.error("getJourneys error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch journeys.",
      error: err?.message,
    });
  }
}
