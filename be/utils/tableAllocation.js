/**
 * UTIL GHÉP BÀN — thuật toán chọn bàn đơn hoặc ghép bàn liền kề theo table_number.
 * Ctrl+F: ghép bàn, planTableAllocation, bàn liền kề, ADJACENCY
 * Dùng bởi: reservation.service.js khi đặt bàn
 */
/** Hai bàn được coi là "gần nhau" nếu số bàn chênh lệch tối đa bằng giá trị này (1 = liền kề). */
const ADJACENCY_GAP = 1;

function sortByTableNumber(tables) {
  return [...tables].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
}

/** Chia danh sách bàn thành các cụm liền kề theo table_number. */
function clusterByProximity(tables) {
  const sorted = sortByTableNumber(tables);
  const clusters = [];
  let current = [];

  for (const t of sorted) {
    if (!current.length) {
      current.push(t);
      continue;
    }
    const prev = current[current.length - 1];
    const gap = (t.table_number ?? 0) - (prev.table_number ?? 0);
    if (gap <= ADJACENCY_GAP) {
      current.push(t);
    } else {
      clusters.push(current);
      current = [t];
    }
  }
  if (current.length) clusters.push(current);
  return clusters;
}

function comparePlans(a, b) {
  if (a.tables.length !== b.tables.length) return a.tables.length - b.tables.length;
  const wasteA = a.waste;
  const wasteB = b.waste;
  if (wasteA !== wasteB) return wasteA - wasteB;
  const spanA = a.span;
  const spanB = b.span;
  return spanA - spanB;
}

/**
 * Trong một cụm bàn liền kề, tìm dãy con liền kề ngắn nhất đủ chỗ (sliding window).
 */
function findBestPlanInCluster(guests, cluster) {
  const sorted = sortByTableNumber(cluster);
  let best = null;

  for (let i = 0; i < sorted.length; i++) {
    let seats = 0;
    for (let j = i; j < sorted.length; j++) {
      if (j > i) {
        const gap = (sorted[j].table_number ?? 0) - (sorted[j - 1].table_number ?? 0);
        if (gap > ADJACENCY_GAP) break;
      }
      seats += sorted[j].capacity;
      if (seats >= guests) {
        const pick = sorted.slice(i, j + 1);
        const plan = {
          tables: pick,
          multi: pick.length > 1,
          waste: seats - guests,
          span:
            (pick[pick.length - 1].table_number ?? 0) - (pick[0].table_number ?? 0),
        };
        if (!best || comparePlans(plan, best) < 0) best = plan;
        break;
      }
    }
  }

  return best;
}

/**
 * Lập kế hoạch phân bàn: một bàn vừa đủ, hoặc ghép các bàn liền kề (theo table_number).
 */
function planTableAllocation(guests, availableTables) {
  const g = Number(guests);
  if (!Number.isFinite(g) || g < 1 || !availableTables?.length) return null;

  const byCapacityAsc = [...availableTables].sort((a, b) => a.capacity - b.capacity);
  const single = byCapacityAsc.find((t) => t.capacity >= g);
  if (single) {
    return { tables: [single], multi: false };
  }

  const clusters = clusterByProximity(availableTables);
  let best = null;

  for (const cluster of clusters) {
    const plan = findBestPlanInCluster(g, cluster);
    if (plan && (!best || comparePlans(plan, best) < 0)) {
      best = plan;
    }
  }

  if (!best) return null;

  best.tables = sortByTableNumber(best.tables);
  return { tables: best.tables, multi: best.multi };
}

/** Tổng chỗ ngồi nếu ghép được trong ít nhất một cụm liền kề. */
function maxAdjacentSeats(tables) {
  return clusterByProximity(tables).reduce((max, cluster) => {
    const sum = cluster.reduce((s, t) => s + t.capacity, 0);
    return Math.max(max, sum);
  }, 0);
}

function formatTableNumbers(tables) {
  return tables
    .map((t) => t.table_number)
    .filter((n) => n != null)
    .sort((a, b) => a - b)
    .map((n) => `B${n}`)
    .join(", ");
}

module.exports = {
  ADJACENCY_GAP,
  planTableAllocation,
  formatTableNumbers,
  clusterByProximity,
  maxAdjacentSeats,
};
