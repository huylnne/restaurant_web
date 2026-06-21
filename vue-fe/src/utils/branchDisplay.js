import { BRAND } from "@/config/siteContent";

/**
 * Tách tên đầy đủ chi nhánh thành tên nhà hàng và tên/địa điểm chi nhánh.
 * Ví dụ: "ABC Restaurant Hà Nội - Cầu Giấy" → { restaurantName, branchName }
 */
export function getRestaurantAndBranchNames(fullBranchName) {
  const fallbackRestaurant = BRAND.name;
  if (!fullBranchName || !String(fullBranchName).trim()) {
    return { restaurantName: fallbackRestaurant, branchName: "-" };
  }

  const name = String(fullBranchName).trim();

  if (name.startsWith(fallbackRestaurant)) {
    const locationPart = name.slice(fallbackRestaurant.length).trim().replace(/^[-–]\s*/, "");
    return {
      restaurantName: fallbackRestaurant,
      branchName: locationPart || name,
    };
  }

  const dashIdx = name.indexOf(" - ");
  if (dashIdx > 0) {
    const left = name.slice(0, dashIdx).trim();
    const right = name.slice(dashIdx + 3).trim();
    const cityMatch = left.match(/^(.+?)\s+(Hà Nội|TP\.HCM|Đà Nẵng|Hồ Chí Minh)$/i);
    if (cityMatch) {
      return {
        restaurantName: cityMatch[1].trim(),
        branchName: `${cityMatch[2]} - ${right}`,
      };
    }
    return { restaurantName: left, branchName: right };
  }

  return { restaurantName: fallbackRestaurant, branchName: name };
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
