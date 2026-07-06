/**
 * CONFIG QUY TẮC NHÀ HÀNG — các giới hạn nghiệp vụ dùng chung backend.
 * Ctrl+F: restaurant rules, TABLE_CAPACITY, MAX_GUESTS, số khách tối đa
 * Luồng demo: đặt bàn 4 khách nằm trong MAX_GUESTS, nhóm lớn cần liên hệ nhà hàng.
 */
/** Sức chứa chuẩn khi seed/chuẩn hóa bàn nếu dữ liệu thiếu capacity. Ctrl+F: TABLE_CAPACITY */
const TABLE_CAPACITY = 6;
/** Số khách tối đa cho một lượt đặt online/walk-in trong demo. Ctrl+F: MAX_GUESTS */
const MAX_GUESTS = 20;

module.exports = { TABLE_CAPACITY, MAX_GUESTS };
