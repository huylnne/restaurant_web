/**
 * UTIL TABLE STATUS (BACKEND) — re-export trạng thái bàn dùng chung từ shared/tableStatus.
 * Ctrl+F: tableStatus util, TABLE_STATUS, isBookableTableStatus, isTableOrderableViaQr
 * Dùng bởi: đặt bàn, check-in, QR gọi món, phục vụ đổi trạng thái bàn.
 */
module.exports = require("../shared/tableStatus");
