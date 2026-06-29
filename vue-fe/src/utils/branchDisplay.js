import shared from "@shared/branchDisplay.js";
import { BRAND } from "@/config/siteContent";

const splitRestaurantAndBranch = (name) =>
  shared.splitRestaurantAndBranch(name, BRAND.name);

export function getRestaurantAndBranchNames(fullBranchName) {
  const { restaurant_name, branch_display_name } = splitRestaurantAndBranch(fullBranchName);
  return {
    restaurantName: restaurant_name,
    branchName: branch_display_name || "-",
  };
}

export function formatRestaurantNameFromRow(row) {
  if (row?.restaurant_name) return row.restaurant_name;
  const { restaurantName } = getRestaurantAndBranchNames(row?.Branch?.name);
  return restaurantName;
}

export function formatBranchNameFromRow(row) {
  if (row?.branch_display_name) return row.branch_display_name;
  const { branchName } = getRestaurantAndBranchNames(row?.Branch?.name);
  if (branchName !== "-") return branchName;
  if (row?.branch_id) return `Chi nhánh #${row.branch_id}`;
  return "-";
}

export function formatBranchTooltipFromRow(row) {
  const restaurant = formatRestaurantNameFromRow(row);
  const branch = formatBranchNameFromRow(row);
  const addr = row?.Branch?.address;
  const lines = [restaurant, branch];
  if (addr) lines.push(addr);
  return lines.join("\n");
}
