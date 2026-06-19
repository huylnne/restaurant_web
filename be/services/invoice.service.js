const pdfMake = require("pdfmake");
const vfsFonts = require("pdfmake/build/vfs_fonts");

pdfMake.setUrlAccessPolicy(() => false);

function ensurePdfFontsLoaded() {
  for (const k of Object.keys(vfsFonts)) {
    pdfMake.virtualfs.writeFileSync(k, vfsFonts[k], "base64");
  }
  pdfMake.setFonts({
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  });
}

function formatMoneyVN(n) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(n) || 0
  );
}

function formatDateTime(v) {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  return d.toLocaleString("vi-VN");
}

function buildItemRows(items = []) {
  if (!items.length) return [["-", "", "", "0 đ"]];
  return items.map((it) => [
    String(it.name || "Món"),
    String(it.quantity || 0),
    formatMoneyVN(it.unit_price),
    formatMoneyVN(it.line_total),
  ]);
}

async function buildInvoicePdf({ payment, order, reservation, bill, branch, table, user, methodLabel }) {
  ensurePdfFontsLoaded();

  const invoiceNo = payment?.invoice_no || `INV-${payment?.payment_id || ""}`;
  const issuedAt = payment?.invoice_issued_at || payment?.paid_at || new Date();
  const tableNumber = table?.table_number ?? bill?.table?.table_number ?? "-";
  const sessionOrderId =
    order?.order_id ??
    reservation?.order_id ??
    reservation?.reservation_id ??
    bill?.order?.order_id ??
    bill?.reservation?.reservation_id ??
    "-";

  const doc = {
    content: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Hóa đơn thanh toán", style: "title" },
              { text: branch?.name ? String(branch.name) : "Restaurant", style: "subtitle" },
              branch?.address ? { text: `Địa chỉ: ${branch.address}` } : {},
              branch?.phone ? { text: `SĐT: ${branch.phone}` } : {},
            ].filter((x) => Object.keys(x).length),
          },
          {
            width: "auto",
            stack: [
              { text: `Số hóa đơn: ${invoiceNo}` },
              { text: `Ngày: ${formatDateTime(issuedAt)}` },
              { text: `Bàn: ${tableNumber}` },
              { text: `Mã đơn: ${sessionOrderId}` },
            ],
          },
        ],
      },
      { text: "", margin: [0, 8] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Khách hàng", style: "section" },
              { text: user?.full_name ? String(user.full_name) : "Khách tại bàn" },
              user?.phone ? { text: `SĐT: ${user.phone}` } : {},
            ].filter((x) => Object.keys(x).length),
          },
          {
            width: "auto",
            stack: [
              { text: "Thanh toán", style: "section" },
              { text: `Phương thức: ${methodLabel || payment?.method || "-"}` },
              payment?.transaction_ref ? { text: `Mã giao dịch: ${payment.transaction_ref}` } : {},
            ].filter((x) => Object.keys(x).length),
          },
        ],
      },
      { text: "", margin: [0, 8] },
      {
        table: {
          widths: ["*", 50, 80, 90],
          body: [
            [
              { text: "Món", bold: true },
              { text: "SL", bold: true },
              { text: "Đơn giá", bold: true },
              { text: "Thành tiền", bold: true },
            ],
            ...buildItemRows(bill?.items || []),
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            table: {
              body: [
                ["Tổng cộng", formatMoneyVN(bill?.total_amount || payment?.amount)],
              ],
            },
            layout: "noBorders",
            margin: [0, 10, 0, 0],
          },
        ],
      },
      { text: "", margin: [0, 6] },
      { text: "Cảm ơn quý khách!", italics: true, alignment: "center" },
    ],
    styles: {
      title: { fontSize: 16, bold: true },
      subtitle: { fontSize: 11, color: "#666" },
      section: { bold: true, margin: [0, 0, 0, 4] },
    },
    defaultStyle: { font: "Roboto" },
  };

  const pdf = pdfMake.createPdf(doc);
  return new Promise((resolve, reject) => {
    pdf.getBuffer((buffer) => {
      if (!buffer) return reject(new Error("PDF_EMPTY"));
      resolve(Buffer.from(buffer));
    });
  });
}

module.exports = {
  buildInvoicePdf,
  formatMoneyVN,
};
