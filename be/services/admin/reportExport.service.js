const ExcelJS = require('exceljs');
const pdfMake = require('pdfmake');
const vfsFonts = require('pdfmake/build/vfs_fonts');
const reportService = require('./report.service');

pdfMake.setUrlAccessPolicy(() => false);

function formatMoneyVN(n) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);
}

function formatDateCell(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Gom dữ liệu báo cáo (cùng tham số với trang AdminReports).
 */
async function gatherReportData({ branchId, startDate, endDate, days, months, limit }) {
  const [
    overview,
    revenueByDay,
    topSellingItems,
    revenueByCategory,
    ordersByHour,
    topCustomers,
    tableStats,
    monthlyRevenue,
  ] = await Promise.all([
    reportService.getOverviewStats(branchId, startDate, endDate),
    reportService.getRevenueByDay(branchId, days),
    reportService.getTopSellingItems(branchId, limit),
    reportService.getRevenueByCategory(branchId),
    reportService.getOrdersByHour(branchId),
    reportService.getTopCustomers(branchId, limit),
    reportService.getTableStats(branchId),
    reportService.getMonthlyRevenue(branchId, months),
  ]);

  return {
    branchId,
    startDate: startDate || null,
    endDate: endDate || null,
    days,
    months,
    limit,
    generatedAt: new Date().toISOString(),
    overview,
    revenueByDay,
    topSellingItems,
    revenueByCategory,
    ordersByHour,
    topCustomers,
    tableStats,
    monthlyRevenue,
  };
}

async function buildExcel(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HL Food Admin';
  wb.created = new Date();

  const periodLabel =
    data.startDate && data.endDate
      ? `${data.startDate} → ${data.endDate}`
      : 'Toàn thời gian (tổng quan)';

  // --- Sheet: Tổng quan ---
  const ws0 = wb.addWorksheet('Tổng quan', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws0.addRow(['Báo cáo doanh thu chi nhánh']);
  ws0.addRow([`Chi nhánh (branch_id): ${data.branchId}`]);
  ws0.addRow([`Khoảng lọc tổng quan: ${periodLabel}`]);
  ws0.addRow([`Xuất lúc: ${data.generatedAt}`]);
  ws0.addRow([]);
  ws0.addRow(['Chỉ số', 'Giá trị']);
  ws0.addRow(['Tổng doanh thu (VND)', data.overview.totalRevenue]);
  ws0.addRow(['Đơn hoàn thành', data.overview.totalOrders]);
  ws0.addRow(['Đơn đang xử lý', data.overview.pendingOrders]);
  ws0.addRow(['Đặt bàn (trong khoảng lọc)', data.overview.totalReservations]);
  ws0.addRow(['Khách hàng (distinct, trong khoảng lọc)', data.overview.totalCustomers]);
  ws0.getColumn(1).width = 42;
  ws0.getColumn(2).width = 22;
  ws0.getRow(6).font = { bold: true };

  // --- Sheet: Doanh thu theo ngày ---
  const ws1 = wb.addWorksheet('Doanh thu theo ngày');
  ws1.addRow([`Doanh thu ${data.days} ngày gần nhất`]);
  ws1.addRow(['Ngày', 'Doanh thu (VND)']);
  for (const row of data.revenueByDay) {
    ws1.addRow([formatDateCell(row.date), Number(row.revenue) || 0]);
  }
  ws1.getColumn(1).width = 14;
  ws1.getColumn(2).width = 20;

  // --- Sheet: Top món ---
  const ws2 = wb.addWorksheet('Top món bán chạy');
  ws2.addRow(['Tên món', 'Danh mục', 'Giá (VND)', 'SL bán', 'Doanh thu (VND)']);
  for (const row of data.topSellingItems) {
    ws2.addRow([
      row.name,
      row.category,
      Number(row.price) || 0,
      Number(row.total_sold) || 0,
      Number(row.total_revenue) || 0,
    ]);
  }
  ws2.getRow(1).font = { bold: true };
  ws2.columns = [{ width: 28 }, { width: 18 }, { width: 14 }, { width: 10 }, { width: 18 }];

  // --- Sheet: Theo danh mục ---
  const ws3 = wb.addWorksheet('Theo danh mục');
  ws3.addRow(['Danh mục', 'Doanh thu (VND)', 'SL bán']);
  for (const row of data.revenueByCategory) {
    ws3.addRow([row.category, Number(row.revenue) || 0, Number(row.total_sold) || 0]);
  }
  ws3.getRow(1).font = { bold: true };

  // --- Sheet: Đơn theo giờ ---
  const ws4 = wb.addWorksheet('Đơn theo giờ (hôm nay)');
  ws4.addRow(['Giờ', 'Số đơn', 'Doanh thu (VND)']);
  for (const row of data.ordersByHour) {
    ws4.addRow([Number(row.hour), Number(row.order_count) || 0, Number(row.revenue) || 0]);
  }
  ws4.getRow(1).font = { bold: true };

  // --- Sheet: Top khách ---
  const ws5 = wb.addWorksheet('Top khách hàng');
  ws5.addRow(['Họ tên', 'SĐT', 'Số đơn', 'Tổng chi (VND)']);
  for (const row of data.topCustomers) {
    ws5.addRow([
      row.full_name,
      row.phone,
      Number(row.total_orders) || 0,
      Number(row.total_spent) || 0,
    ]);
  }
  ws5.getRow(1).font = { bold: true };

  // --- Sheet: Thống kê bàn ---
  const ts = data.tableStats;
  const ws6 = wb.addWorksheet('Thống kê bàn');
  ws6.addRow(['Chỉ số', 'Giá trị']);
  ws6.addRow(['Tổng số bàn', ts.totalTables]);
  ws6.addRow(['Bàn trống', ts.availableTables]);
  ws6.addRow(['Đang phục vụ', ts.occupiedTables]);
  ws6.addRow(['Đã đặt trước', ts.reservedTables]);
  ws6.addRow(['Tỷ lệ sử dụng (%)', ts.occupancyRate]);
  ws6.getRow(1).font = { bold: true };

  // --- Sheet: Doanh thu theo tháng ---
  const ws7 = wb.addWorksheet('Doanh thu theo tháng');
  ws7.addRow([`${data.months} tháng gần nhất`]);
  ws7.addRow(['Tháng', 'Doanh thu (VND)', 'Số đơn']);
  for (const row of data.monthlyRevenue) {
    ws7.addRow([row.month, Number(row.revenue) || 0, Number(row.order_count) || 0]);
  }
  ws7.getRow(2).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function ensurePdfFontsLoaded() {
  for (const k of Object.keys(vfsFonts)) {
    pdfMake.virtualfs.writeFileSync(k, vfsFonts[k], 'base64');
  }
  pdfMake.setFonts({
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  });
}

function tableBody(headerRow, rows) {
  return [headerRow, ...rows];
}

async function buildPdf(data) {
  ensurePdfFontsLoaded();

  const periodLabel =
    data.startDate && data.endDate
      ? `${data.startDate} → ${data.endDate}`
      : 'Không lọc (mặc định tổng quan)';

  const overviewBody = tableBody(
    [
      { text: 'Chỉ số', bold: true },
      { text: 'Giá trị', bold: true },
    ],
    [
      ['Tổng doanh thu', formatMoneyVN(data.overview.totalRevenue)],
      ['Đơn hoàn thành', String(data.overview.totalOrders)],
      ['Đơn đang xử lý', String(data.overview.pendingOrders)],
      ['Đặt bàn (khoảng lọc)', String(data.overview.totalReservations)],
      ['Khách (distinct)', String(data.overview.totalCustomers)],
    ]
  );

  const revenueDayBody = tableBody(
    [
      { text: 'Ngày', bold: true },
      { text: 'Doanh thu', bold: true },
    ],
    data.revenueByDay.map((r) => [formatDateCell(r.date), formatMoneyVN(r.revenue)])
  );

  const topDishBody = tableBody(
    [
      { text: 'Món', bold: true },
      { text: 'Danh mục', bold: true },
      { text: 'SL', bold: true },
      { text: 'Doanh thu', bold: true },
    ],
    data.topSellingItems.map((r) => [
      String(r.name),
      String(r.category || ''),
      String(r.total_sold),
      formatMoneyVN(r.total_revenue),
    ])
  );

  const catBody = tableBody(
    [
      { text: 'Danh mục', bold: true },
      { text: 'Doanh thu', bold: true },
    ],
    data.revenueByCategory.map((r) => [String(r.category), formatMoneyVN(r.revenue)])
  );

  const hourBody = tableBody(
    [
      { text: 'Giờ', bold: true },
      { text: 'Số đơn', bold: true },
    ],
    data.ordersByHour.map((r) => [`${r.hour}h`, String(r.order_count)])
  );

  const custBody = tableBody(
    [
      { text: 'Họ tên', bold: true },
      { text: 'SĐT', bold: true },
      { text: 'Chi tiêu', bold: true },
    ],
    data.topCustomers.map((r) => [
      String(r.full_name || ''),
      String(r.phone || ''),
      formatMoneyVN(r.total_spent),
    ])
  );

  const ts = data.tableStats;
  const tableBodyStats = tableBody(
    [
      { text: 'Chỉ số', bold: true },
      { text: 'Giá trị', bold: true },
    ],
    [
      ['Tổng bàn', String(ts.totalTables)],
      ['Trống', String(ts.availableTables)],
      ['Đang phục vụ', String(ts.occupiedTables)],
      ['Đặt trước', String(ts.reservedTables)],
      ['Tỷ lệ sử dụng', `${ts.occupancyRate}%`],
    ]
  );

  const monthBody = tableBody(
    [
      { text: 'Tháng', bold: true },
      { text: 'Doanh thu', bold: true },
    ],
    data.monthlyRevenue.map((r) => [String(r.month), formatMoneyVN(r.revenue)])
  );

  const docDefinition = {
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    pageMargins: [40, 48, 40, 48],
    content: [
      { text: 'Báo cáo doanh thu chi nhánh', style: 'h1' },
      {
        text: `Chi nhánh: ${data.branchId} | Lọc tổng quan: ${periodLabel} | Xuất: ${data.generatedAt}`,
        style: 'muted',
      },
      { text: 'Tổng quan', style: 'h2' },
      {
        layout: 'lightHorizontalLines',
        table: { widths: ['*', 'auto'], body: overviewBody },
      },
      { text: `Doanh thu theo ngày (${data.days} ngày)`, style: 'h2', pageBreak: 'before' },
      { layout: 'lightHorizontalLines', table: { widths: ['*', 'auto'], body: revenueDayBody } },
      { text: 'Top món bán chạy', style: 'h2', pageBreak: 'before' },
      {
        layout: 'lightHorizontalLines',
        table: { widths: ['*', 70, 40, 80], body: topDishBody },
      },
      { text: 'Doanh thu theo danh mục', style: 'h2' },
      { layout: 'lightHorizontalLines', table: { widths: ['*', 'auto'], body: catBody } },
      { text: 'Đơn hàng theo giờ (hôm nay)', style: 'h2', pageBreak: 'before' },
      { layout: 'lightHorizontalLines', table: { widths: [60, '*'], body: hourBody } },
      { text: 'Top khách hàng', style: 'h2' },
      {
        layout: 'lightHorizontalLines',
        table: { widths: ['*', 90, 90], body: custBody },
      },
      { text: 'Thống kê bàn', style: 'h2', pageBreak: 'before' },
      { layout: 'lightHorizontalLines', table: { widths: ['*', 'auto'], body: tableBodyStats } },
      { text: `Doanh thu theo tháng (${data.months} tháng)`, style: 'h2', pageBreak: 'before' },
      { layout: 'lightHorizontalLines', table: { widths: [70, '*'], body: monthBody } },
    ],
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
      h2: { fontSize: 12, bold: true, margin: [0, 14, 0, 6] },
      muted: { fontSize: 8, color: '#444444', margin: [0, 0, 0, 12] },
    },
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return pdfDoc.getBuffer();
}

module.exports = {
  gatherReportData,
  buildExcel,
  buildPdf,
};
