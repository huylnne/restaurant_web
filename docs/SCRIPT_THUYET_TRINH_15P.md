# Script thuyết trình 15 phút — Lê Ngọc Huy (20225858)

> Hệ thống quản lý nhà hàng đa chi nhánh | Template HUST BLUE 16x9  
> Script cũng được ghi trong **Speaker Notes** của file PowerPoint (View → Notes).

---

## Hướng dẫn chèn ảnh

1. Mở file `20225858_LeNgocHuy_ThuyetTrinh.pptx`
2. Các slide có dòng `[CHÈN ẢNH]` — click khung **Picture** (layout Title Only) hoặc chèn ảnh đè lên vùng trống
3. Ảnh PNG có sẵn tại: `d:\DATN\_pptx_inspect\report-images\`
4. Nếu chưa có PNG, chạy: `node d:\DATN\_pptx_inspect\render-pdf-pages.cjs`
5. Sau khi chèn xong, xóa dòng `[CHÈN ẢNH]...` trên subtitle nếu muốn gọn slide

| Slide | Hình | PDF trang | File PNG |
|-------|------|-----------|----------|
| 6 | Hình 2.2 Use Case | 17 | `hinh_2_2_usecase.png` |
| 7 | Hình 3.1 Kiến trúc | 39 | `hinh_3_1_kien_truc.png` |
| 8 | Hình 3.5 ERD | 46 | `hinh_3_5_erd.png` |
| 9 | Hình 3.3 Gọi món | 42 | `hinh_3_3_go_mon.png` |
| 10 | Hình 3.4 Thanh toán | 44 | `hinh_3_4_thanh_toan.png` |
| 11 | Hình 4.1 Đăng nhập | 61 | `hinh_4_1_dang_nhap.png` |
| 12 | Hình 4.2 Menu | 62 | `hinh_4_2_menu.png` |
| 13 | Hình 4.3 Đặt bàn | 63 | `hinh_4_3_dat_ban.png` |
| 14 | Hình 4.4 Quản lý bàn | 64 | `hinh_4_4_quan_ly_ban.png` |
| 15 | Hình 4.5 Bếp | 65 | `hinh_4_5_bep.png` |
| 16 | Hình 4.6 Quản lý CN | 65 | `hinh_4_6_quan_ly_cn.png` |

**Tổng thời gian gợi ý:** ~14–15 phút (18 slide)

---

## Slide 1 — Bìa HUST (~30 giây)

*Chờ vài giây, giới thiệu tên trường, chuyển slide.*

---

## Slide 2 — Tiêu đề đề tài (~1 phút)

Kính chào thầy cô và hội đồng.

Em tên **Lê Ngọc Huy**, MSSV **20225858**, sinh viên chuyên ngành **CNTT Việt-Nhật**, Khoa CNTT&TT, Đại học Bách khoa Hà Nội.

Em xin trình bày đồ án tốt nghiệp: **Thiết kế và xây dựng hệ thống quản lý nhà hàng**, dưới sự hướng dẫn của **TS. Vũ Tuyết Trinh**.

---

## Slide 3 — Nội dung trình bày (~30 giây)

Bài trình bày gồm 5 phần chính:

1. Đặt vấn đề và mục tiêu  
2. Phân tích yêu cầu — 17 use case  
3. Thiết kế hệ thống và CSDL  
4. Demo giao diện và chức năng  
5. Kết quả và kết luận  

---

## Slide 4 — Đặt vấn đề (~1 phút)

Bài toán xuất phát từ thực tế vận hành **chuỗi nhà hàng**.

Hiện nay nhiều cơ sở vẫn quản lý **thủ công** bằng sổ sách hoặc Excel → dẫn đến **sai sót** và **dữ liệu phân tán** giữa các chi nhánh.

Khách hàng cũng thiếu **kênh trực tuyến thống nhất** cho đặt bàn, gọi món và thanh toán.

Vì vậy em xây dựng **hệ thống web quản lý tổng thể**, hỗ trợ **đa chi nhánh**.

---

## Slide 5 — Mục tiêu & công nghệ (~1 phút)

**Mục tiêu:** xây dựng nguyên mẫu web phục vụ 5 nhóm người dùng — khách hàng, phục vụ, bếp, quản lý chi nhánh và admin.

**Công nghệ:**
- Frontend: **Vue.js 3**, **Element Plus**
- Backend: **Node.js**, **Express**, **PostgreSQL**
- Giao tiếp: **REST API** + **WebSocket** realtime
- Bảo mật: **JWT**, mã hóa mật khẩu **bcrypt**

---

## Slide 6 — Hình 2.2 Use Case (~1 phút)

**[CHÈN ẢNH: hinh_2_2_usecase.png]**

Em xin giới thiệu biểu đồ Use Case tổng quát.

Hệ thống có **5 nhóm tác nhân**: Khách hàng, Nhân viên phục vụ, Bếp, Quản lý chi nhánh, Quản trị hệ thống.

Tổng cộng **17 use case**, bao phủ toàn bộ vòng đời phục vụ: đặt bàn → gọi món → chế biến → thanh toán → quản trị.

Mỗi vai trò chỉ thao tác **đúng phần việc** của mình — tránh chồng chéo quyền hạn.

---

## Slide 7 — Hình 3.1 Kiến trúc (~1 phút)

**[CHÈN ẢNH: hinh_3_1_kien_truc.png]**

Hệ thống thiết kế theo mô hình **đa tầng MVC**:

- **Presentation:** Vue.js 3 + Element Plus  
- **Business:** Node.js + Express — xử lý logic nghiệp vụ  
- **Data Access:** PostgreSQL qua ORM  

Frontend và backend giao tiếp qua **REST API**; cập nhật realtime (bếp, bàn) dùng **WebSocket**.

---

## Slide 8 — Hình 3.5 ERD (~1 phút)

**[CHÈN ẢNH: hinh_3_5_erd.png]**

Lược đồ CSDL với các thực thể chính: User, Branch, Table, Reservation, Order, OrderItem, MenuItem, Payment, Review.

Thiết kế theo mô hình **đa chi nhánh**: mỗi cơ sở có bàn, thực đơn, nhân sự riêng; dữ liệu vẫn **quản trị tập trung**.

Ràng buộc toàn vẹn đảm bảo **không trùng lịch đặt bàn** và đồng bộ trạng thái đơn hàng.

---

## Slide 9 — Hình 3.3 Gọi món (~45 giây)

**[CHÈN ẢNH: hinh_3_3_go_mon.png]**

Luồng gọi món: khách/phục vụ tạo đơn → gửi **realtime** tới bếp → bếp chế biến → báo hoàn thành → phục vụ mang ra.

Trạng thái cập nhật **đồng bộ**, tránh sót món hoặc gọi trùng.

---

## Slide 10 — Hình 3.4 Thanh toán (~45 giây)

**[CHÈN ẢNH: hinh_3_4_thanh_toan.png]**

Khi thanh toán, phục vụ tổng hợp hóa đơn từ các món đã phục vụ.

Hỗ trợ **tiền mặt** và **chuyển khoản**. Sau xác nhận, bàn về trạng thái trống; doanh thu ghi nhận cho **báo cáo**.

---

## Slide 11 — Hình 4.1 Đăng nhập (~45 giây)

**[CHÈN ẢNH: hinh_4_1_dang_nhap.png]**

Màn hình đăng nhập — xác thực bằng **JWT**, mật khẩu mã hóa **bcrypt**.

Sau đăng nhập, người dùng được chuyển **đúng dashboard theo vai trò**.

---

## Slide 12 — Hình 4.2 Menu (~45 giây)

**[CHÈN ẢNH: hinh_4_2_menu.png]**

Khách xem thực đơn theo chi nhánh, lọc danh mục, xem giá và mô tả.

Có thể thêm vào giỏ, đặt bàn hoặc gọi món khi đã check-in.

---

## Slide 13 — Hình 4.3 Đặt bàn (~45 giây)

**[CHÈN ẢNH: hinh_4_3_dat_ban.png]**

Khách chọn chi nhánh, ngày giờ, số khách. Hệ thống **kiểm tra trùng lịch** trước khi xác nhận.

Quản lý có thể duyệt hoặc từ chối yêu cầu.

---

## Slide 14 — Hình 4.4 Quản lý bàn (~45 giây)

**[CHÈN ẢNH: hinh_4_4_quan_ly_ban.png]**

Phục vụ theo dõi **sơ đồ bàn realtime**: trống, đang phục vụ, đã đặt.

Tiếp nhận khách **walk-in**, gán bàn và bắt đầu phiên phục vụ ngay.

---

## Slide 15 — Hình 4.5 Bếp (~45 giây)

**[CHÈN ẢNH: hinh_4_5_bep.png]**

Bếp nhận món mới qua **WebSocket**. Cập nhật: đang chế biến → hoàn thành.

Phục vụ được thông báo ngay khi món sẵn sàng.

---

## Slide 16 — Hình 4.6 Quản lý chi nhánh (~45 giây)

**[CHÈN ẢNH: hinh_4_6_quan_ly_cn.png]**

Quản lý chi nhánh: thực đơn, nhân sự, báo cáo doanh thu, đánh giá khách hàng.

Mỗi chi nhánh vận hành **độc lập**, dữ liệu **đồng bộ** về hệ thống trung tâm.

---

## Slide 17 — Kết quả & kết luận (~1 phút)

**Kết quả:**
- 17 use case, 25+ màn hình, demo 7 chi nhánh  
- Luồng end-to-end ổn định  
- Giảm trùng lịch đặt bàn, đồng bộ bếp–phục vụ, ghi nhận doanh thu tập trung  

**Hạn chế:** nguyên mẫu; thanh toán điện tử chưa end-to-end.

**Hướng phát triển:** MoMo/VNPay, mobile/PWA, kiểm thử tự động.

---

## Slide 18 — Cảm ơn

Em xin **cảm ơn thầy cô và hội đồng** đã lắng nghe.

Em **sẵn sàng trả lời câu hỏi**.

---

*Tài liệu ôn phản biện chi tiết: [CAU_HOI_PHAN_BIEN.md](./CAU_HOI_PHAN_BIEN.md)*
