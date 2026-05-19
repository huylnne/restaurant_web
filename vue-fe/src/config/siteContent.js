/** Nội dung tĩnh cho trang Giới thiệu, Khuyến mãi, Tin tức, Liên hệ */

export const BRAND = {
  name: "ABC Restaurant",
  shortName: "ABC",
  logo: "/images/logo.svg",
  tagline: "Hương vị tinh tế — trải nghiệm ẩm thực trong không gian ấm cúng",
  hotline: "19001234",
  email: "contact@abcrestaurant.vn",
  hours: "8:00 – 22:00",
  hoursDisplay: "8AM - 10PM",
};

export const ABOUT_VALUES = [
  {
    icon: "Dish",
    title: "Nguyên liệu tươi",
    desc: "Chọn lọc từng ngày, ưu tiên nguồn cung địa phương và mùa vụ.",
  },
  {
    icon: "User",
    title: "Phục vụ tận tâm",
    desc: "Đội ngũ được đào tạo quy trình chuẩn, đồng bộ qua hệ thống quản lý.",
  },
  {
    icon: "OfficeBuilding",
    title: "Đa chi nhánh",
    desc: "Mở rộng chuỗi nhà hàng, dữ liệu đặt bàn và order được quản lý tập trung.",
  },
  {
    icon: "Clock",
    title: "Đặt bàn linh hoạt",
    desc: "Đặt trước online, chọn bàn phù hợp và gọi món ngay trên điện thoại.",
  },
];

export const ABOUT_MILESTONES = [
  { year: "2015", text: "Khai trương chi nhánh đầu tiên với thực đơn món Việt truyền thống." },
  { year: "2019", text: "Mở rộng mô hình nhiều chi nhánh, chuẩn hóa quy trình phục vụ." },
  { year: "2024", text: "Triển khai hệ thống quản lý nhà hàng: đặt bàn, order, bếp và báo cáo." },
  { year: "2026", text: "Nâng cấp trải nghiệm khách hàng với QR bàn và thanh toán tiện lợi." },
];

export const PROMOTIONS = [
  {
    id: "weekday-lunch",
    badge: "Hàng ngày",
    title: "Ưu đãi trưa trong tuần",
    discount: "Giảm 15%",
    description:
      "Áp dụng 11:00 – 14:00 từ thứ Hai đến thứ Sáu cho nhóm từ 2 khách trở lên. Không áp dụng ngày lễ.",
    validUntil: "31/12/2026",
    image: "/images/homeimg2.png",
    cta: { label: "Đặt bàn ngay", to: "/booking" },
  },
  {
    id: "birthday",
    badge: "Sinh nhật",
    title: "Combo sinh nhật ấm cúng",
    discount: "Tặng bánh + nước",
    description:
      "Đặt trước ít nhất 24 giờ, xuất trình CMND/CCCD trùng ngày sinh. Áp dụng tối đa 1 combo/bàn.",
    validUntil: "31/12/2026",
    image: "/images/homeimg1.png",
    cta: { label: "Xem thực đơn", to: "/menu" },
  },
  {
    id: "family-weekend",
    badge: "Cuối tuần",
    title: "Gia đình cuối tuần",
    discount: "Giảm 10%",
    description:
      "Thứ Bảy & Chủ nhật cho hóa đơn từ 4 khách. Kết hợp đặt bàn online để được ưu tiên bàn lớn.",
    validUntil: "31/12/2026",
    image: "/images/homeimg3.png",
    cta: { label: "Đặt bàn", to: "/booking" },
  },
  {
    id: "new-member",
    badge: "Thành viên mới",
    title: "Chào mừng thành viên",
    discount: "Voucher 50.000đ",
    description:
      "Đăng ký tài khoản và hoàn tất lần đặt bàn đầu tiên để nhận voucher (áp dụng hóa đơn từ 300.000đ).",
    validUntil: "30/06/2026",
    image: "/images/homeimg2.png",
    cta: { label: "Đăng ký", to: "/register" },
  },
];

export const NEWS_ARTICLES = [
  {
    id: 1,
    slug: "mo-rong-chi-nhanh",
    title: "ABC Restaurant mở rộng hệ thống chi nhánh",
    excerpt:
      "Chúng tôi tiếp tục đầu tư không gian phục vụ và đồng bộ quy trình vận hành trên nền tảng quản lý tập trung.",
    date: "2026-04-10",
    category: "Tin công ty",
    image: "/images/homeimg1.png",
    body: `ABC Restaurant hướng tới mô hình chuỗi nhà hàng hiện đại: khách đặt bàn trực tuyến, nhân viên phục vụ và bếp phối hợp qua hệ thống, quản lý theo dõi doanh thu theo từng chi nhánh.

Mỗi chi nhánh mới đều được chuẩn hóa thực đơn, sơ đồ bàn và quy trình thanh toán để đảm bảo trải nghiệm đồng nhất.`,
  },
  {
    id: 2,
    slug: "thuc-don-mua-he",
    title: "Ra mắt thực đơn mùa hè",
    excerpt:
      "Bổ sung các món thanh mát, salad và đồ uống trái cây — phù hợp đi cùng gia đình và bạn bè cuối tuần.",
    date: "2026-03-22",
    category: "Thực đơn",
    image: "/images/homeimg2.png",
    body: `Đầu bếp ABC Restaurant giới thiệu series món mùa hè với nguyên liệu tươi, ít dầu mỡ. Khách có thể xem menu theo chi nhánh và đặt món trước khi đến nhà hàng.

Một số món nổi bật sẽ được gắn nhãn "Món nổi bật" trên trang chủ để bạn dễ lựa chọn.`,
  },
  {
    id: 3,
    slug: "dat-ban-qr",
    title: "Trải nghiệm đặt bàn & QR tại bàn",
    excerpt:
      "Quét mã QR trên bàn để xem hóa đơn tạm tính, gọi thêm món và gửi yêu cầu thanh toán cho nhân viên.",
    date: "2026-02-05",
    category: "Công nghệ",
    image: "/images/homeimg3.png",
    body: `Sau khi được phục vụ vào bàn, khách quét QR để theo dõi trạng thái món và tổng tiền. Nhân viên nhận thông báo khi khách yêu cầu thanh toán, giúp rút ngắn thời gian chờ.

Tính năng phù hợp nhóm đông, tiệc sinh nhật và các buổi sum họp gia đình.`,
  },
  {
    id: 4,
    slug: "an-toan-thuc-pham",
    title: "Cam kết an toàn thực phẩm",
    excerpt:
      "Kiểm soát nguồn gốc nguyên liệu, quy trình bếp và lưu trữ theo tiêu chuẩn nội bộ nghiêm ngặt.",
    date: "2026-01-15",
    category: "Tin công ty",
    image: "/images/homeimg2.png",
    body: `ABC Restaurant duy trì quy trình nhập kho, sơ chế và chế biến có checklist. Đội ngũ bếp cập nhật trạng thái món trên hệ thống để giảm nhầm lẫn khi phục vụ.

Chúng tôi định kỳ đào tạo nhân viên về vệ sinh và phục vụ khách hàng.`,
  },
];
