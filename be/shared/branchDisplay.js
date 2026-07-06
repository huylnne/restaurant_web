/**
 * SHARED BRANCH DISPLAY — tách tên nhà hàng và tên/địa điểm chi nhánh để UI hiển thị gọn.
 * Ctrl+F: branch display, splitRestaurantAndBranch, chi nhánh
 * Ví dụ: "ABC Restaurant - Hà Nội, Cầu Giấy" → restaurant_name + branch_display_name.
 */
function splitRestaurantAndBranch(fullBranchName, defaultRestaurantName = "ABC Restaurant") {
  if (!fullBranchName || !String(fullBranchName).trim()) {
    return { restaurant_name: defaultRestaurantName, branch_display_name: null };
  }

  const name = String(fullBranchName).trim();
  if (name.startsWith(defaultRestaurantName)) {
    const locationPart = name.slice(defaultRestaurantName.length).trim().replace(/^[-–]\s*/, "");
    return {
      restaurant_name: defaultRestaurantName,
      branch_display_name: locationPart || name,
    };
  }

  const dashIdx = name.indexOf(" - ");
  if (dashIdx > 0) {
    const left = name.slice(0, dashIdx).trim();
    const right = name.slice(dashIdx + 3).trim();
    const cityMatch = left.match(/^(.+?)\s+(Hà Nội|TP\.HCM|Đà Nẵng|Hồ Chí Minh)$/i);
    if (cityMatch) {
      return {
        restaurant_name: cityMatch[1].trim(),
        branch_display_name: `${cityMatch[2]} - ${right}`,
      };
    }
    return { restaurant_name: left, branch_display_name: right };
  }

  return { restaurant_name: defaultRestaurantName, branch_display_name: name };
}

module.exports = {
  splitRestaurantAndBranch,
};
