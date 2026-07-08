/**
 * PUBLIC ROUTES — trang cho khách (trang chủ, menu, đặt bàn, bàn của tôi, QR bàn...).
 * Route gắn meta.requiresAuth cần đăng nhập; các trang giới thiệu để mở tự do.
 * Tất cả component đều lazy-load (import động) để chia nhỏ bundle, tải nhanh hơn.
 */
const LoginView = () => import("@/views/LoginView.vue");
const RegisterView = () => import("@/views/RegisterView.vue");
const MenuView = () => import("@/views/MenuView.vue");
const UserDashboard = () => import("@/features/user/dashboard/pages/UserDashboardPage.vue");
const UserProfile = () => import("@/views/UserProfile.vue");
const OrderMenu = () => import("@/views/OrderMenu.vue");
const Booking = () => import("@/views/Booking.vue");
const MyTable = () => import("@/views/MyTable.vue");
const ReservationBill = () => import("@/views/ReservationBillView.vue");
const TableQr = () => import("@/views/TableQr.vue");
const AboutView = () => import("@/views/AboutView.vue");
const SaleView = () => import("@/views/SaleView.vue");
const NewsView = () => import("@/views/NewsView.vue");
const ContactView = () => import("@/views/ContactView.vue");
const BranchesView = () => import("@/views/BranchesView.vue");
const NearbyBranchesView = () => import("@/views/NearbyBranchesView.vue");
const Home = () => import("@/views/Home.vue");

export const publicChildRoutes = [
  { path: "", name: "Home", component: Home },
  { path: "menu", name: "Menu", component: MenuView },
  { path: "about", name: "About", component: AboutView },
  { path: "branches", name: "Branches", component: BranchesView },
  { path: "branches/nearby", name: "BranchesNearby", component: NearbyBranchesView },
  { path: "sale", name: "Sale", component: SaleView },
  { path: "news", name: "News", component: NewsView },
  { path: "contact", name: "Contact", component: ContactView },
  { path: "booking", name: "Booking", component: Booking },
  { path: "order-menu", name: "OrderMenu", component: OrderMenu },
  {
    path: "dashboard",
    name: "UserDashboard",
    component: UserDashboard,
    meta: { requiresAuth: true },
  },
  { path: "profile", name: "UserProfile", component: UserProfile },
  {
    path: "profile/reservations/:orderId/bill",
    name: "ReservationBill",
    component: ReservationBill,
    meta: { requiresAuth: true },
  },
  { path: "my-table", name: "MyTable", component: MyTable, meta: { requiresAuth: true } },
  { path: "t/:token", name: "TableQr", component: TableQr },
];
