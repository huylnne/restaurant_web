/**
 * UTIL GHÉP BÀN — thuật toán chọn bàn đơn hoặc ghép bàn liền kề theo table_number.
 * Ctrl+F: ghép bàn, planTableAllocation, bàn liền kề, ADJACENCY
 * Dùng bởi: reservation.service.js khi đặt bàn
 */
/** Hai bàn được coi là "gần nhau" nếu số bàn chênh lệch tối đa bằng giá trị này (1 = liền kề). */
const ADJACENCY_GAP = 1;

/** Sắp xếp bàn tăng dần theo số bàn (table_number) — nền tảng để xét "liền kề". */
function sortByTableNumber(tables) {
  // Tạo bản sao ([...tables]) để KHÔNG làm thay đổi mảng gốc khi sort.
  // (a ?? 0): nếu thiếu table_number thì coi như 0 để tránh NaN khi trừ.
  return [...tables].sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
}

/** Chia danh sách bàn thành các cụm liền kề theo table_number. */
function clusterByProximity(tables) {
  // Sắp xếp trước để duyệt tuần tự từ số bàn nhỏ đến lớn.
  const sorted = sortByTableNumber(tables);
  const clusters = []; // danh sách các cụm hoàn chỉnh
  let current = []; // cụm đang gom dở

  for (const t of sorted) {
    // Bàn đầu tiên của một cụm: cứ đưa vào rồi qua bàn kế.
    if (!current.length) {
      current.push(t);
      continue;
    }
    // So sánh bàn hiện tại với bàn cuối trong cụm đang gom.
    const prev = current[current.length - 1];
    const gap = (t.table_number ?? 0) - (prev.table_number ?? 0);
    if (gap <= ADJACENCY_GAP) {
      // Chênh lệch số bàn ≤ 1 → coi là liền kề → thêm vào cụm hiện tại.
      current.push(t);
    } else {
      // Có "khoảng trống" (vd B3 → B7) → chốt cụm cũ, mở cụm mới bắt đầu từ bàn này.
      clusters.push(current);
      current = [t];
    }
  }
  // Đừng quên đẩy cụm cuối cùng còn dở vào kết quả.
  if (current.length) clusters.push(current);
  return clusters;
}

/**
 * So sánh 2 phương án ghép bàn để chọn phương án "tốt hơn" (trả về < 0 nếu a tốt hơn b).
 * Thứ tự ưu tiên: ít bàn hơn → thừa ít ghế hơn → khoảng cách bàn nhỏ hơn (ngồi sát nhau).
 */
function comparePlans(a, b) {
  // 1) Ưu tiên phương án dùng ít bàn hơn (đỡ phải ghép nhiều).
  if (a.tables.length !== b.tables.length) return a.tables.length - b.tables.length;
  // 2) Cùng số bàn → chọn phương án lãng phí ít ghế thừa hơn.
  const wasteA = a.waste;
  const wasteB = b.waste;
  if (wasteA !== wasteB) return wasteA - wasteB;
  // 3) Vẫn hòa → chọn cụm có span (khoảng cách số bàn đầu–cuối) nhỏ hơn cho khách ngồi gần.
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

  // i = bàn bắt đầu của cửa sổ.
  for (let i = 0; i < sorted.length; i++) {
    let seats = 0; // tổng ghế cộng dồn từ i đến j
    // j = bàn kết thúc của cửa sổ, mở rộng dần sang phải.
    for (let j = i; j < sorted.length; j++) {
      // Nếu mở rộng mà gặp khoảng trống (không liền kề) thì dừng cửa sổ này.
      if (j > i) {
        const gap = (sorted[j].table_number ?? 0) - (sorted[j - 1].table_number ?? 0);
        if (gap > ADJACENCY_GAP) break;
      }
      // Cộng dồn sức chứa của bàn thứ j.
      seats += sorted[j].capacity;
      // Khi tổng ghế đủ cho số khách → tạo một phương án ứng viên.
      if (seats >= guests) {
        const pick = sorted.slice(i, j + 1); // các bàn từ i..j
        const plan = {
          tables: pick,
          multi: pick.length > 1, // >1 bàn nghĩa là phải ghép bàn
          waste: seats - guests, // số ghế thừa (càng nhỏ càng tốt)
          span:
            (pick[pick.length - 1].table_number ?? 0) - (pick[0].table_number ?? 0),
        };
        // Giữ lại nếu tốt hơn ứng viên tốt nhất hiện tại.
        if (!best || comparePlans(plan, best) < 0) best = plan;
        // Đã đủ chỗ tại j nên không cần nới thêm; nhảy sang điểm bắt đầu i kế tiếp.
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
  // Chuẩn hóa số khách; số không hợp lệ (<1, NaN) hoặc không còn bàn trống → không xếp được.
  const g = Number(guests);
  if (!Number.isFinite(g) || g < 1 || !availableTables?.length) return null;

  // ƯU TIÊN 1: tìm MỘT bàn đơn nhỏ nhất mà vẫn đủ chỗ (sắp theo capacity tăng dần rồi lấy bàn đầu đủ chỗ).
  // Làm vậy để không "phá" bàn to khi một bàn nhỏ đã đủ.
  const byCapacityAsc = [...availableTables].sort((a, b) => a.capacity - b.capacity);
  const single = byCapacityAsc.find((t) => t.capacity >= g);
  if (single) {
    return { tables: [single], multi: false }; // multi:false = không cần ghép
  }

  // ƯU TIÊN 2: không bàn đơn nào đủ → xét ghép bàn trong từng cụm liền kề.
  const clusters = clusterByProximity(availableTables);
  let best = null;

  for (const cluster of clusters) {
    // Với mỗi cụm, tìm dãy con tốt nhất; rồi so sánh chọn phương án tốt nhất toàn cục.
    const plan = findBestPlanInCluster(g, cluster);
    if (plan && (!best || comparePlans(plan, best) < 0)) {
      best = plan;
    }
  }

  // Không cụm nào đủ chỗ → chịu, trả null (nhóm quá lớn cho sơ đồ bàn hiện có).
  if (!best) return null;

  // Trả về bàn đã sắp theo số bàn cho gọn khi hiển thị/lưu.
  best.tables = sortByTableNumber(best.tables);
  return { tables: best.tables, multi: best.multi };
}

/** Tổng chỗ ngồi nếu ghép được trong ít nhất một cụm liền kề. */
function maxAdjacentSeats(tables) {
  // Với mỗi cụm liền kề, cộng toàn bộ ghế rồi lấy cụm có tổng lớn nhất.
  return clusterByProximity(tables).reduce((max, cluster) => {
    const sum = cluster.reduce((s, t) => s + t.capacity, 0);
    return Math.max(max, sum);
  }, 0);
}

/** Ghép chuỗi hiển thị số bàn dạng "B1, B2, B3". */
function formatTableNumbers(tables) {
  return tables
    .map((t) => t.table_number) // lấy số bàn
    .filter((n) => n != null) // bỏ bàn thiếu số
    .sort((a, b) => a - b) // sắp tăng dần cho dễ đọc
    .map((n) => `B${n}`) // thêm tiền tố "B"
    .join(", ");
}

module.exports = {
  ADJACENCY_GAP,
  planTableAllocation,
  formatTableNumbers,
  clusterByProximity,
  maxAdjacentSeats,
};
