/**
 * Smoke tests for shared business constants (node --test).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const orderStatus = require(path.join(__dirname, "../../shared/orderStatus"));
const tableStatus = require(path.join(__dirname, "../../shared/tableStatus"));
const branchHours = require(path.join(__dirname, "../../shared/branchHours"));

test("normalizeOrderStatus maps legacy values", () => {
  assert.equal(orderStatus.normalizeOrderStatus("open"), "pre-ordered");
  assert.equal(orderStatus.normalizeOrderStatus("IN_PROGRESS"), "in_progress");
  assert.equal(orderStatus.isActiveOrderStatus("waiting_payment"), true);
});

test("normalizeTableStatus maps reserved alias", () => {
  assert.equal(tableStatus.normalizeTableStatus("reserved"), "pre-ordered");
  assert.equal(tableStatus.isBookableTableStatus("available"), true);
});

test("branch hours validation", () => {
  const date = new Date(2026, 5, 29, 12, 0);
  assert.equal(
    branchHours.getBranchHoursValidationMessage(date, "08:00", "22:00"),
    null
  );
  const late = new Date(2026, 5, 29, 23, 0);
  assert.ok(branchHours.getBranchHoursValidationMessage(late, "08:00", "22:00"));
});
