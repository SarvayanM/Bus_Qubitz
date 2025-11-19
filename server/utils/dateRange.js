// backend/utils/dateRange.js
export const toDateStr = (d) => d.toISOString().slice(0, 10); // "YYYY-MM-DD"

export const getRangeDates = (rangeType, fromStr, toStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let fromDate;
  let toDate;

  switch (rangeType) {
    case "last7":
      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 6);
      break;
    case "last30":
      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setDate(today.getDate() - 29);
      break;
    case "thisMonth": {
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-based
      fromDate = new Date(year, month, 1);
      toDate = new Date(year, month + 1, 0); // last day of month
      break;
    }
    case "custom": {
      if (!fromStr || !toStr) {
        throw new Error("Custom range requires from and to");
      }
      fromDate = new Date(fromStr);
      toDate = new Date(toStr);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(0, 0, 0, 0);
      break;
    }
    case "today":
    default:
      fromDate = new Date(today);
      toDate = new Date(today);
      break;
  }

  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const from = toDateStr(fromDate);
  const to = toDateStr(toDate);

  const days =
    Math.floor(
      (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;

  const prevToDate = new Date(fromDate);
  prevToDate.setDate(fromDate.getDate() - 1);
  const prevFromDate = new Date(prevToDate);
  prevFromDate.setDate(prevToDate.getDate() - (days - 1));

  const prevFrom = toDateStr(prevFromDate);
  const prevTo = toDateStr(prevToDate);

  return {
    rangeType: rangeType || "today",
    from,
    to,
    fromDate,
    toDate,
    previous: {
      from: prevFrom,
      to: prevTo,
      fromDate: prevFromDate,
      toDate: prevToDate,
    },
  };
};

export const computeDeltaPercent = (current, previous) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100; // arbitrary: 100% up from 0
  }
  return ((current - previous) / previous) * 100;
};
