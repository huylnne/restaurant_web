/**
 * Unit tests for work shift time utilities.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseShiftMinutes, validateShiftTimes, isWithinShift } = require("../be/utils/workShiftTime");

describe("workShiftTime", () => {
  it("parseShiftMinutes accepts valid HH:MM", () => {
    assert.equal(parseShiftMinutes("08:30"), 8 * 60 + 30);
    assert.equal(parseShiftMinutes("23:59"), 23 * 60 + 59);
  });

  it("parseShiftMinutes rejects invalid values", () => {
    assert.equal(parseShiftMinutes("25:00"), null);
    assert.equal(parseShiftMinutes("abc"), null);
  });

  it("validateShiftTimes requires end after start", () => {
    assert.throws(() => validateShiftTimes("10:00", "09:00"), /Giờ kết thúc/);
    assert.deepEqual(validateShiftTimes("08:00", "17:00"), { start: 480, end: 1020 });
  });

  it("isWithinShift checks date and time window", () => {
    const shift = { shift_date: "2026-07-13", start_time: "08:00", end_time: "12:00" };
    assert.equal(isWithinShift(shift, new Date("2026-07-13T09:30:00")), true);
    assert.equal(isWithinShift(shift, new Date("2026-07-13T13:00:00")), false);
    assert.equal(isWithinShift(shift, new Date("2026-07-14T09:30:00")), false);
  });
});
