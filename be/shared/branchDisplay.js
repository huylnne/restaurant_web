/**
 * SHARED BRANCH DISPLAY — tách tên nhà hàng và tên/địa điểm chi nhánh để UI hiển thị gọn.
 * Ctrl+F: branch display, splitRestaurantAndBranch, chi nhánh
 * Ví dụ: "ABC Restaurant - Hà Nội, Cầu Giấy" → restaurant_name + branch_display_name.
 */
function splitRestaurantAndBranch(fullBranchName, defaultRestaurantName = "ABC Restaurant") {
  // Trường hợp rỗng: không có tên chi nhánh → trả tên nhà hàng mặc định, không có tên địa điểm.
  if (!fullBranchName || !String(fullBranchName).trim()) {
    return { restaurant_name: defaultRestaurantName, branch_display_name: null };
  }

  // Chuẩn hóa chuỗi đầu vào (bỏ space thừa).
  const name = String(fullBranchName).trim();

  // TH1: tên bắt đầu bằng tên nhà hàng mặc định, ví dụ "ABC Restaurant - Hà Nội".
  if (name.startsWith(defaultRestaurantName)) {
    // Cắt bỏ phần tên nhà hàng ở đầu, rồi bỏ dấu gạch nối "-"/"–" và space đứng đầu → còn lại là địa điểm.
    const locationPart = name.slice(defaultRestaurantName.length).trim().replace(/^[-–]\s*/, "");
    return {
      restaurant_name: defaultRestaurantName,
      // Nếu cắt xong rỗng thì hiển thị lại nguyên tên để không mất thông tin.
      branch_display_name: locationPart || name,
    };
  }

  // TH2: tên có dạng "Trái - Phải" (phân tách bằng " - ").
  const dashIdx = name.indexOf(" - ");
  if (dashIdx > 0) {
    const left = name.slice(0, dashIdx).trim(); // phần trước dấu gạch
    const right = name.slice(dashIdx + 3).trim(); // phần sau dấu gạch (+3 để bỏ " - ")
    // Nếu phần trái kết thúc bằng tên thành phố (vd "ABC Hà Nội") thì tách riêng tên nhà hàng và thành phố.
    const cityMatch = left.match(/^(.+?)\s+(Hà Nội|TP\.HCM|Đà Nẵng|Hồ Chí Minh)$/i);
    if (cityMatch) {
      return {
        restaurant_name: cityMatch[1].trim(), // phần tên nhà hàng (bỏ tên thành phố)
        branch_display_name: `${cityMatch[2]} - ${right}`, // "Thành phố - Quận/địa điểm"
      };
    }
    // Không khớp mẫu thành phố → coi trái là tên nhà hàng, phải là tên chi nhánh.
    return { restaurant_name: left, branch_display_name: right };
  }

  // TH3: không theo mẫu nào → coi cả chuỗi là tên địa điểm, tên nhà hàng dùng mặc định.
  return { restaurant_name: defaultRestaurantName, branch_display_name: name };
}

module.exports = {
  splitRestaurantAndBranch,
};
