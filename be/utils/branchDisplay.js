/**
 * UTIL BRANCH DISPLAY (BACKEND) — wrapper tên nhà hàng mặc định từ ENV.
 * Ctrl+F: branchDisplay util, DEFAULT_RESTAURANT_NAME, splitRestaurantAndBranch
 * Dùng bởi: lịch sử đặt bàn, báo cáo/hiển thị chi nhánh.
 */
const { splitRestaurantAndBranch } = require("../shared/branchDisplay");

const DEFAULT_RESTAURANT_NAME = process.env.RESTAURANT_NAME || "ABC Restaurant";

module.exports = {
  DEFAULT_RESTAURANT_NAME,
  // [HIỂN THỊ] Tách tên chi nhánh theo tên nhà hàng cấu hình trong RESTAURANT_NAME.
  splitRestaurantAndBranch: (fullBranchName) =>
    splitRestaurantAndBranch(fullBranchName, DEFAULT_RESTAURANT_NAME),
};
