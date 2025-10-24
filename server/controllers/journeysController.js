// backend/controllers/journeysController.js
import Bus from "../models/Bus.js";

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export async function getJourneys(req, res) {
  try {
    const {
      from = "",
      to = "",
      date = "",
      page = "1",
      limit = "8",
    } = req.query;

    const pageNum = toInt(page, 1);
    const limitNum = Math.min(toInt(limit, 8), 48);
    const skip = (pageNum - 1) * limitNum;

    const match = {};
    if (from) match["route.from"] = { $regex: new RegExp(from, "i") };
    if (to) match["route.to"] = { $regex: new RegExp(to, "i") };

    let weekday = null;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
      weekday = new Date(date + "T00:00:00").getDay();

    const pipeline = [
      { $match: match },
      ...(weekday !== null
        ? [
            {
              $match: {
                $or: [
                  {
                    "schedule.days": { $exists: true, $ne: [], $in: [weekday] },
                  },
                  { operatingDates: { $exists: true, $in: [date] } },
                ],
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      // Lookup bookings for the specified date to calculate available seats
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
                          { $eq: ["$travelDate", date] },
                          { $ne: ["$status", "Cancelled"] },
                        ],
                      },
                    },
                  },
                  { $unwind: "$seats" },
                  { $group: { _id: null, count: { $sum: 1 } } },
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
              if: date,
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
                fare: 1,
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
