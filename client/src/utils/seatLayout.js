export function computeSeatLayout(busId, totalSeats) {
  if (!busId || !totalSeats) return [];
  const rows = [];
  let next = 1;

  // Reserve 5 seats for last row
  let preLast = Math.max(0, totalSeats - 5);
  const fullRows = Math.floor(preLast / 4);
  let remainder = preLast % 4;

  for (let i = 0; i < fullRows; i++) {
    rows.push({
      row: rows.length + 1,
      left: [next, next + 1],
      right: [next + 2, next + 3],
      lastRow: false,
    });
    next += 4;
  }

  // Right-only 2-seat row if remainder == 2 (covers 51 seats case)
  if (remainder === 2) {
    rows.push({
      row: rows.length + 1,
      rightOnly: true,
      right: [next, next + 1],
      lastRow: false,
    });
    next += 2;
  }

  rows.push({
    row: rows.length + 1,
    lastRow: true,
    lastSeats: [next, next + 1, next + 2, next + 3, next + 4],
  });

  return rows;
}
