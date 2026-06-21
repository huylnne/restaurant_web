const DEFAULT_RESTAURANT_NAME = process.env.RESTAURANT_NAME || "ABC Restaurant";

function splitRestaurantAndBranch(fullBranchName) {
  if (!fullBranchName || !String(fullBranchName).trim()) {
    return { restaurant_name: DEFAULT_RESTAURANT_NAME, branch_display_name: null };
  }

  const name = String(fullBranchName).trim();
  if (name.startsWith(DEFAULT_RESTAURANT_NAME)) {
    const locationPart = name.slice(DEFAULT_RESTAURANT_NAME.length).trim().replace(/^[-–]\s*/, "");
    return {
      restaurant_name: DEFAULT_RESTAURANT_NAME,
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

  return { restaurant_name: DEFAULT_RESTAURANT_NAME, branch_display_name: name };
}

module.exports = {
  DEFAULT_RESTAURANT_NAME,
  splitRestaurantAndBranch,
};
