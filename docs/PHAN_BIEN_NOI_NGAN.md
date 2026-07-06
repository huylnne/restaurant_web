# Trả lời phản biện bằng lời — gợi ý cho sinh viên

> Đọc to trước gương 2–3 lần. Mỗi câu khoảng **30–60 giây**. Không học thuộc word-by-word — nhớ **ý chính** là đủ.

---

## Công thức 3 bước (dùng cho mọi câu)

1. **Chốt thẳng** (1 câu): “Dạ em làm … vì …”
2. **Giải thích đơn giản** (1–2 câu): ví dụ thực tế nhà hàng.
3. **Dừng** — không lan man sang code trừ khi thầy hỏi sâu.

**Mẫu mở đầu lịch sự:**

- “Dạ em xin phép trả lời ạ.”
- “Dạ câu này em thiết kế như sau ạ.”
- “Dạ nếu thầy cho em nói ngắn gọn thì …”

**Khi không chắc:**

- “Dạ phần này em nhớ là …, em xin phép mở lại slide / demo nhanh ạ.”
- “Dạ em chưa tối ưu hết phần đó, hạn chế em ghi trong slide cuối ạ.”

---

## 1. Giới thiệu đồ án (khoảng 1 phút — hay bị hỏi đầu)

**Thầy: Em làm cái gì? Giải quyết vấn đề gì?**

> Dạ em xây website quản lý nhà hàng nhiều chi nhánh. Trước giờ khách gọi điện đặt bàn, nhân viên ghi sổ, bếp và phục vụ hay lệch thông tin — em gom hết lên một hệ thống: khách tự đặt bàn, gọi món; phục vụ quản bàn; bếp thấy món realtime; cuối buổi thanh toán và đánh giá. Admin quản lý nhiều cơ sở trên cùng một nền tảng ạ.

---

## 2. Vai trò & phân quyền

**Thầy: Có những ai dùng hệ thống?**

> Dạ có 5 nhóm: khách hàng; nhân viên phục vụ; bếp; quản lý chi nhánh; admin. Mỗi người chỉ thấy menu và dữ liệu đúng việc mình — ví dụ bếp chi nhánh 1 không sửa được món chi nhánh 2. Em dùng đăng nhập JWT và kiểm tra role trên backend để chắc chắn không lách từ giao diện ạ.

---

## 3. Đặt bàn

**Thầy: Khách đặt bàn thì hệ thống làm gì?**

> Dạ khách chọn chi nhánh, giờ đến và số người. Em kiểm tra giờ mở cửa, rồi **tự chọn bàn trống** vừa sức chứa. Nếu đông quá một bàn thì em **ghép vài bàn liền nhau** — giống nhà hàng thật hay xếp nhóm lớn. Xong tạo đơn đặt bàn, nhân viên thấy trên màn hình để đón khách ạ.

**Thầy: Sao giữ bàn 2 tiếng?**

> Dạ vì một lượt ăn thường kéo dài, em giữ bàn **2 giờ** kể từ giờ khách hẹn để tránh hai nhóm bị trùng cùng một bàn. Nếu khách đặt quá sát giờ đóng cửa mà không đủ 2 giờ thì hệ thống báo chọn giờ khác ạ.

**Thầy: Khách đặt nhiều lần được không?**

> Dạ em giới hạn **tối đa 2 lượt đặt trước** chưa tới, để tránh spam chiếm bàn. Hủy được khi đơn còn trạng thái chờ hoặc đã xác nhận, chưa vào bàn ạ.

**Thầy: Hai người cùng đặt một giờ một bàn thì sao?**

> Dạ em bọc trong **giao dịch database** và khóa bàn lúc chọn — ai ghi nhận trước thì được, người sau hệ thống báo hết bàn hoặc gợi ý giờ khác ạ.

---

## 4. Bàn & tiếp khách

**Thầy: Trạng thái bàn em có những gì?**

> Dạ em chia 4 trạng thái dễ nhớ: **trống**; **sắp có khách đặt**; **đang phục vụ**; **chờ dọn**. Phục vụ nhìn sơ đồ là biết bàn nào rảnh, bàn nào đang bận ạ.

**Thầy: Khách đặt mà không tới?**

> Dạ em coi là **no-show**: quá **15 phút** sau giờ hẹn mà chưa check-in thì hủy lượt đó, nhả bàn, và **khóa tài khoản** khách để hạn chế lặp lại. Job quét định kỳ khoảng mỗi phút ạ.

**Thầy: Walk-in khác đặt trước thế nào?**

> Dạ **đặt trước** là khách book online, tới thì phục vụ bấm tiếp nhận. **Walk-in** là khách tới liền không đặt — phục vụ chọn bàn trống, nhập số người, mở phiên phục vụ ngay ạ.

**Thầy: QR trên bàn để làm gì?**

> Dạ khách quét QR thì vào trang bàn đó để xem menu, xem bill, thanh toán VietQR. Còn gọi món thì chỉ mở khi bàn đang phục vụ thật, nên link cũ đem về nhà cũng không gọi món linh tinh được ạ.

---

## 5. Gọi món & bếp

**Thầy: Luồng món từ bếp đến khách?**

> Dạ khách hoặc phục vụ gọi món → bếp thấy hàng chờ → **đang làm** → **xong** → phục vụ **đã bưng ra**. Mỗi bước đổi trạng thái một lần, bếp và phục vụ **cùng nhìn một dữ liệu**, cập nhật qua WebSocket nên không phải hét qua quầy ạ.

**Thầy: Sao cần realtime?**

> Dạ vì bếp làm xong mà phục vụ không biết thì món nguội, khách chờ lâu. Em push thông báo theo **chi nhánh** — ai đang mở màn phục vụ/bếp của chi nhánh đó thì thấy ngay ạ.

**Thầy: Giá món trên hóa đơn lấy ở đâu?**

> Dạ em **lưu giá tại lúc gọi món**, không lấy giá menu sau này — tránh lúc thanh toán giá đã đổi, khách và quầy tranh cãi ạ.

---

## 6. Thanh toán

**Thầy: Thanh toán diễn ra thế nào?**

> Dạ khách bấm yêu cầu thanh toán → phục vụ xác nhận tiền mặt/chuyển khoản/thẻ, hoặc khách quét **VietQR / MoMo**. Khi thành công, đơn **hoàn tất**, bàn chuyển **chờ dọn** — chưa coi là trống ngay vì nhân viên còn dọn bàn ạ.

**Thầy: Chuyển khoản tự nhận đơn được không?**

> Dạ được phần VietQR: mã chuyển khoản gắn mã đơn, webhook về server so **đúng số tiền** mới chốt, tránh cộng nhầm hoặc cộng hai lần ạ.

---

## 7. Đánh giá & báo cáo

**Thầy: Khi nào khách đánh giá?**

> Dạ sau khi **ăn xong và thanh toán xong**, mỗi đơn một lần đánh giá. Qua QR bàn thì trong vòng **4 giờ** sau buổi ăn ạ.

**Thầy: Doanh thu em tính sao?**

> Dạ cộng tiền các món thuộc đơn **đã hoàn tất**, lọc theo chi nhánh và khoảng ngày. Đơn hủy hoặc chưa xong không tính vào doanh thu ạ.

---

## 8. Thiết kế & công nghệ (khi thầy hỏi “vì sao”)

**Thầy: Sao gộp đặt bàn và gọi món vào một bảng order?**

> Dạ em coi cả hai đều là **một phiên khách tại nhà hàng** — từ lúc có bàn đến lúc trả tiền. Gộp một bảng thì thanh toán, món, đánh giá dùng chung một luồng, đỡ trùng logic ạ.

**Thầy: Sao dùng Vue + Node + PostgreSQL?**

> Dạ Vue làm giao diện nhanh; Node một ngôn ngữ với frontend; PostgreSQL chắc cho **giao dịch đặt bàn** và **báo cáo** ạ. Em chọn stack phổ biến, dễ triển khai và bảo trì sau này.

**Thầy: Điểm mới của em so với POS đơn giản?**

> Dạ em có **đặt bàn online + tự xếp bàn**, **đa chi nhánh**, **bếp realtime**, **QR tại bàn**, **no-show tự động**, và **VietQR/MoMo** — gần với mô hình nhà hàng hiện đại hơn chỉ ghi order tại quầy ạ.

**Thầy: Hạn chế?**

> Dạ thật thì em còn vài điểm: CAPTCHA lưu tạm bộ nhớ server; ghép bàn theo số bàn liền kề chứ chưa có sơ đồ khu vực; no-show khóa cứng chưa có bước mở khóa tự động; chưa làm kho nguyên liệu. Em ghi rõ trong phần hướng phát triển ạ.

---

## 9. Câu bẫy — trả lời một hơi

| Thầy hỏi | Em nói |
|----------|--------|
| Đặt 19h, tới 19h14? | Dạ vẫn được, em cho 15 phút, quá 19h15 mới no-show ạ. |
| Đặt 21h30, đóng 22h? | Dạ không cho vì không đủ 2 giờ giữ bàn trước giờ đóng ạ. |
| Thanh toán xong bàn trống liền? | Dạ không, chuyển **chờ dọn**, phục vụ dọn xong mới trống ạ. |
| Quét QR 1 lần rồi về nhà spam gọi món? | Dạ không gọi được ạ, vì hệ thống chỉ nhận gọi món khi bàn đang có khách phục vụ. Bàn chưa mở phiên hoặc đã kết thúc thì tự chặn. |
| Doanh thu tính đơn hủy? | Dạ không, chỉ đơn **hoàn tất** ạ. |

---

## 10. Mẹo khi đứng nói

1. **Nhìn thầy**, nói chậm hơn bình thường một chút.
2. **Không đọc slide** — slide là gợi ý, miệng giải thích “vì sao”.
3. Câu hỏi dài → nhắc lại: “Dạ ý thầy là … đúng không ạ?”
4. Được hỏi demo → “Dạ em xin phép mở tab phục vụ / khách hàng ạ.”
5. Hết giờ → “Dạ em tóm lại: …” một câu rồi dừng.

---

## Bài tập luyện (15 phút)

1. Đọc to phần **giới thiệu 1 phút** (mục 1).
2. Chọn **5 câu** thầy hay hỏi nhất (đặt bàn, no-show, realtime, thanh toán, hạn chế) — trả lời không nhìn giấy.
3. Mở app demo: đặt bàn → check-in → gọi 1 món → bếp đổi trạng thái → thanh toán. Vừa làm vừa nói theo luồng mục 3–6.

*Chúc em bảo vệ tự tin — biết mình làm gì và **vì sao** là đủ.*
