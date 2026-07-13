const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  findBestReservationAllocation,
} = require("../be/utils/reservationReallocation");

const slot = {
  windowStart: "2026-07-20T10:00:00.000Z",
  windowEnd: "2026-07-20T12:00:00.000Z",
};

const tables = [
  { table_id: 2, table_number: 2, capacity: 4 },
  { table_id: 3, table_number: 3, capacity: 5 },
  { table_id: 4, table_number: 4, capacity: 6 },
];

function assignmentFor(result, bookingId) {
  return result?.assignments.find((row) => row.bookingId === bookingId);
}

describe("reservation reallocation", () => {
  it("moves a flexible booking to preserve an adjacent pair for a larger group", () => {
    const result = findBestReservationAllocation({
      tables,
      bookings: [
        {
          id: 101,
          guests: 5,
          currentTableIds: [3],
          fixed: false,
          ...slot,
        },
        {
          id: "new",
          guests: 9,
          currentTableIds: [],
          fixed: false,
          isNew: true,
          ...slot,
        },
      ],
    });

    assert.deepEqual(assignmentFor(result, 101).tableIds, [4]);
    assert.deepEqual(assignmentFor(result, "new").tableIds, [2, 3]);
    assert.equal(result.cost.moved, 1);
  });

  it("never moves a checked-in or otherwise fixed booking", () => {
    const result = findBestReservationAllocation({
      tables,
      bookings: [
        {
          id: 101,
          guests: 5,
          currentTableIds: [3],
          fixed: true,
          ...slot,
        },
        {
          id: "new",
          guests: 9,
          currentTableIds: [],
          fixed: false,
          isNew: true,
          ...slot,
        },
      ],
    });

    assert.equal(result, null);
  });

  it("prefers a solution that does not move an existing booking", () => {
    const result = findBestReservationAllocation({
      tables,
      bookings: [
        {
          id: 101,
          guests: 5,
          currentTableIds: [4],
          fixed: false,
          ...slot,
        },
        {
          id: "new",
          guests: 9,
          currentTableIds: [],
          fixed: false,
          isNew: true,
          ...slot,
        },
      ],
    });

    assert.deepEqual(assignmentFor(result, 101).tableIds, [4]);
    assert.deepEqual(assignmentFor(result, "new").tableIds, [2, 3]);
    assert.equal(result.cost.moved, 0);
  });

  it("allows a table to be reused by bookings whose windows do not overlap", () => {
    const result = findBestReservationAllocation({
      tables: [{ table_id: 1, table_number: 1, capacity: 6 }],
      bookings: [
        {
          id: 1,
          guests: 5,
          currentTableIds: [1],
          fixed: true,
          windowStart: "2026-07-20T08:00:00.000Z",
          windowEnd: "2026-07-20T10:00:00.000Z",
        },
        {
          id: "new",
          guests: 5,
          isNew: true,
          fixed: false,
          windowStart: "2026-07-20T10:00:00.000Z",
          windowEnd: "2026-07-20T12:00:00.000Z",
        },
      ],
    });

    assert.deepEqual(assignmentFor(result, 1).tableIds, [1]);
    assert.deepEqual(assignmentFor(result, "new").tableIds, [1]);
  });
});
