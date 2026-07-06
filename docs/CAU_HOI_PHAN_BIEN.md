# Câu hỏi & Trả lời phản biện — Restaurant Web

Tài liệu ôn phản biện đồ án **Hệ thống quản lý nhà hàng đa chi nhánh** theo kiểu trả lời miệng, thiên về nghiệp vụ.

> Mục tiêu: trả lời ngắn, dễ nói, dễ nhớ; ưu tiên nghiệp vụ vận hành nhà hàng.

---

## Mục lục

1. [Tổng quan & bài toán](#i-tổng-quan--bài-toán)
2. [Đặt bàn (UC05)](#ii-đặt-bàn-uc05)
3. [Trạng thái bàn & tiếp nhận (UC10)](#iii-trạng-thái-bàn--tiếp-nhận-uc10)
4. [Gọi món & bếp (UC08)](#iv-gọi-món--bếp-uc08)
5. [Thanh toán](#v-thanh-toán)
6. [Đánh giá (UC13)](#vi-đánh-giá-uc13)
7. [Báo cáo & quản trị](#vii-báo-cáo--quản-trị)
8. [Bảo mật & ràng buộc](#viii-bảo-mật--ràng-buộc-nghiệp-vụ)
9. [Thiết kế dữ liệu & kiến trúc](#ix-thiết-kế-dữ-liệu--kiến-trúc)
10. [Sơ đồ luồng nghiệp vụ](#x-sơ-đồ-luồng-nghiệp-vụ)
11. [Câu bẫy thường gặp](#xi-câu-bẫy-thường-gặp)

---

## I. Tổng quan & bài toán

### H1. Đồ án giải quyết bài toán gì?

**Đ:** Hệ thống quản lý nhà hàng **đa chi nhánh**, phủ toàn bộ vòng đời phục vụ: khách xem menu → đặt bàn / walk-in → check-in → gọi món → bếp chế biến (realtime) → thanh toán → đánh giá; đồng thời quản trị thực đơn, nhân sự, báo cáo doanh thu.

### H2. Vì sao chọn mô hình đa chi nhánh thay vì một nhà hàng đơn lẻ?

**Đ:** Vì mỗi cơ sở có thực đơn, nhân sự, lượng khách và giờ hoạt động khác nhau. Mô hình này giống vận hành thực tế của chuỗi nhà hàng: cấp trung tâm nhìn tổng thể, còn từng cơ sở tự xử lý phần việc của mình.

### H3. Có bao nhiêu vai trò? Phân quyền thế nào?

**Đ:** Có 5 nhóm chính:

| Vai trò | Nghiệp vụ chính |
|---------|-----------------|
| Khách hàng | Đặt bàn, gọi món, thanh toán, đánh giá |
| Phục vụ | Quản lý bàn, tiếp nhận khách, hỗ trợ gọi món, chốt thanh toán |
| Bếp | Nhận món, chế biến, báo món xong |
| Quản lý chi nhánh | Quản lý thực đơn, nhân sự, báo cáo, chất lượng dịch vụ |
| Quản trị hệ thống | Quản lý toàn chuỗi: cơ sở, tài khoản, vận hành tổng |

Tóm lại: ai làm việc nào thì chỉ thấy đúng màn hình và dữ liệu của việc đó.

---

## II. Đặt bàn (UC05)

### H4. Luồng đặt bàn của khách diễn ra thế nào?

**Đ:**

1. Khách chọn chi nhánh, giờ đến, số người.
2. Hệ thống kiểm tra giờ đó nhà hàng có nhận khách không.
3. Tự xếp bàn phù hợp: một bàn hoặc ghép vài bàn gần nhau.
4. Tạo lượt đặt bàn để nhân viên tiếp nhận khi khách tới.
5. Nếu khách muốn thì đặt trước món ngay lúc đó.

### H5. “Buffer 2 giờ” khi đặt bàn nghĩa là gì?

**Đ:** Nghĩa là một lượt đặt sẽ giữ bàn khoảng **2 tiếng** để tránh trùng lịch. Nếu đặt quá sát giờ đóng cửa, không đủ thời gian phục vụ thì hệ thống sẽ báo chọn giờ khác.

### H6. Hệ thống chọn bàn như thế nào khi số khách lớn?

**Đ:** Về nghiệp vụ, em ưu tiên như sau:

- Ưu tiên một bàn vừa đủ chỗ để vận hành gọn.
- Nếu không đủ thì ghép vài bàn gần nhau cho cùng một nhóm.
- Mục tiêu là dùng ít bàn nhất, vẫn đủ chỗ và dễ phục vụ.

### H7. Khách được đặt tối đa bao nhiêu lượt trong tương lai?

**Đ:** Tối đa **2** lượt đặt trước chưa tới giờ, để tránh chiếm chỗ ảo.

### H8. Số khách tối đa mỗi lần đặt?

**Đ:** Một lượt đặt tối đa 20 khách; mỗi bàn tiêu chuẩn 6 chỗ.

### H9. Khách hủy đặt bàn khi nào được?

**Đ:** Hủy được khi lượt đặt vẫn còn ở giai đoạn chờ/đã xác nhận, tức là chưa vào bàn thực tế.

### H10. Xử lý race condition khi hai khách cùng đặt một slot?

**Đ:** Em xử lý theo nguyên tắc “ai chốt trước thì được trước”. Hệ thống khóa lúc chọn bàn để tránh hai người cùng giành một bàn cùng thời điểm.

---

## III. Trạng thái bàn & tiếp nhận (UC10)

### H11. Có mấy trạng thái bàn? Ý nghĩa từng trạng thái?

**Đ:** 4 trạng thái:

| Trạng thái | Ý nghĩa |
|-----------|---------|
| Trống | Có thể xếp khách mới |
| Sắp có khách đặt | Có lịch đến gần giờ, cần giữ bàn |
| Đang phục vụ | Đang có khách dùng bữa |
| Chờ dọn | Khách đã xong, bàn đang chờ vệ sinh |

### H12. Bàn chuyển sang “sắp có khách đặt” khi nào?

**Đ:** Khi còn khoảng **15 phút** nữa tới giờ khách hẹn mà khách chưa vào bàn, hệ thống đổi sang “sắp có khách đặt” để nhân viên chuẩn bị.

### H13. No-show xử lý thế nào?

**Đ:** Quá **15 phút** sau giờ hẹn mà khách chưa tới:

- Lượt đặt bị xem là no-show.
- Bàn được nhả ra để nhận khách khác.
- Tài khoản khách có thể bị khóa để hạn chế tái diễn.

### H14. Check-in đặt bàn khác walk-in thế nào?

**Đ:**

- **Đặt bàn trước:** khách đã book online, tới nơi thì nhân viên bấm tiếp nhận.
- **Walk-in:** khách tới trực tiếp không đặt trước, nhân viên xếp bàn trống và mở phiên phục vụ ngay.

### H15. Một khách có thể theo dõi bàn đang ngồi ở đâu?

**Đ:** Khách có thể vào trang “Bàn của tôi” hoặc quét QR tại bàn. QR chủ yếu để xem menu, xem bill, thanh toán; còn gọi món thì chỉ mở khi bàn đang phục vụ thực tế.

---

## IV. Gọi món & bếp (UC08)

### H16. Trạng thái đơn hàng (order) có những gì?

**Đ:** Về nghiệp vụ thì đi theo các bước: tạo lượt đặt/chờ xác nhận → khách tới bàn → đang phục vụ → chờ thanh toán → hoàn tất (hoặc hủy / khách không tới).

### H17. Trạng thái từng món (order_item) và pipeline bếp?

**Đ:** Món đi theo chuỗi đơn giản: nhận món → bếp làm → bếp báo xong → phục vụ đem ra khách.

### H18. Khi bếp bắt đầu làm món, trạng thái đơn có đổi không?

**Đ:** Có. Khi bếp bắt đầu làm món đầu tiên thì đơn chuyển sang “đang phục vụ”.

### H19. Realtime giữa bếp và phục vụ hoạt động ra sao?

**Đ:** Bếp và phục vụ nhìn cùng một dữ liệu theo thời gian thực. Bếp báo “xong món” là phục vụ thấy ngay để đem ra, tránh món bị nguội.

### H20. Ai được gọi món?

**Đ:** Cả khách và nhân viên phục vụ đều có thể gọi món. Nhưng gọi qua QR chỉ hoạt động khi bàn đang có khách thật, nên không thể lấy link cũ để gọi món ngoài ca phục vụ.

### H21. Giá món tính thế nào trên hóa đơn?

**Đ:** Giá trên bill chốt theo thời điểm khách gọi món, nên nếu hôm sau đổi giá menu thì bill cũ vẫn không đổi.

---

## V. Thanh toán

### H22. Luồng thanh toán end-to-end?

**Đ:**

1. Khách bấm yêu cầu thanh toán.
2. Nhân viên xác nhận thanh toán tại quầy hoặc khách tự thanh toán online.
3. Khi thanh toán thành công, lượt phục vụ được đóng.
4. Bàn chuyển sang chờ dọn để tránh xếp khách mới quá sớm.
5. Có thể in/xuất hóa đơn cho khách.

### H23. Hỗ trợ những phương thức thanh toán nào?

**Đ:** Có tiền mặt, chuyển khoản, thẻ, ví điện tử và quét mã ngân hàng. Thanh toán tại quầy thì nhân viên xác nhận; thanh toán online thì hệ thống tự đối soát để tránh ghi nhận sai hoặc trùng.

### H24. VietQR/SePay khớp đơn hàng thế nào?

**Đ:** Khi khách chuyển khoản, hệ thống kiểm tra đúng đơn và đúng số tiền rồi mới chốt thành công. Một giao dịch chỉ được ghi nhận một lần để tránh cộng trùng.

### H25. Thanh toán xong bàn có tự giải phóng không?

**Đ:** Không trống ngay. Bàn phải qua bước chờ dọn; dọn xong mới mở lại để đón khách mới.

### H26. Ghép nhiều bàn thì thanh toán một lần hay nhiều lần?

**Đ:** Nhóm ghép nhiều bàn vẫn thanh toán theo một lượt chính cho gọn. Khi thanh toán xong thì toàn bộ bàn trong nhóm đều được cập nhật đồng bộ.

---

## VI. Đánh giá (UC13)

### H27. Khách đánh giá khi nào?

**Đ:** Chỉ sau khi khách dùng bữa xong và thanh toán xong mới được đánh giá. Mỗi lượt phục vụ chỉ đánh giá một lần.

### H28. Đánh giá qua QR bàn có được không?

**Đ:** Có. Khách có thể đánh giá trong một khoảng thời gian ngắn sau bữa ăn để phản hồi còn chính xác.

### H29. Manager/Admin quản lý đánh giá làm gì?

**Đ:** Xem danh sách theo chi nhánh, lọc, theo dõi phản hồi khách — phục vụ cải thiện dịch vụ.

---

## VII. Báo cáo & quản trị

### H30. Báo cáo doanh thu tính trên cơ sở nào?

**Đ:** Doanh thu lấy từ các lượt đã hoàn tất, lọc theo cơ sở và theo thời gian. Ngoài ra có thống kê số lượt phục vụ, số lượt đặt bàn, món bán chạy và hỗ trợ xuất báo cáo.

### H31. Dashboard và màn quản lý bàn có số liệu khác nhau không?

**Đ:** Không. Hai màn hình dùng cùng một nguồn số liệu nên các chỉ số chính là thống nhất.

### H32. Nhật ký thao tác (operation log) ghi gì?

**Đ:** Có ghi nhật ký thao tác quan trọng để truy vết khi có sự cố: ai làm, làm lúc nào, ở cơ sở nào và thao tác gì.

### H33. Menu mỗi chi nhánh có khác nhau không?

**Đ:** Có. Mỗi cơ sở quản lý thực đơn riêng để phù hợp nguồn hàng và nhu cầu địa phương; cấp trung tâm vẫn theo dõi được toàn hệ thống.

---

## VIII. Bảo mật & ràng buộc nghiệp vụ

### H34. Chống spam đăng ký tài khoản?

**Đ:** Có lớp chống đăng ký ảo và giới hạn tần suất thao tác để giảm spam.

### H35. Tài khoản bị khóa khi nào?

**Đ:** Tài khoản có thể bị khóa nếu vi phạm quy định đặt bàn (ví dụ vắng mặt nhiều lần), hoặc do quản trị viên xử lý thủ công.

### H36. Nhân viên bếp có sửa món chi nhánh khác không?

**Đ:** Không. Nhân sự bếp chỉ thao tác trong phạm vi cơ sở mình phụ trách.

### H37. Validate SĐT và mật khẩu thế nào?

**Đ:** Có kiểm tra định dạng số điện thoại, không cho trùng tài khoản, và mật khẩu được bảo vệ theo chuẩn an toàn.

---

## IX. Thiết kế dữ liệu & kiến trúc

### H38. Vì sao gộp “đặt bàn” và “phiên phục vụ” vào một luồng dữ liệu?

**Đ:** Vì về bản chất đều là một lượt khách tại nhà hàng, chỉ khác lúc bắt đầu. Gộp chung một luồng giúp nghiệp vụ mượt hơn ở các bước gọi món, thanh toán và đánh giá, tránh tách rời rồi lệch dữ liệu.

### H39. Vì sao cần chuẩn hóa quy tắc dùng chung?

**Đ:** Để mọi màn hình và mọi bộ phận hiểu cùng một quy tắc vận hành, tránh nơi này nói một kiểu, nơi kia xử lý kiểu khác.

### H40. Vì sao dùng PostgreSQL + Sequelize?

**Đ:** Vì hệ thống có nhiều nghiệp vụ cần độ chính xác cao như giữ bàn, thanh toán và báo cáo tổng hợp. Cấu trúc dữ liệu quan hệ giúp kiểm soát đồng bộ tốt hơn khi vận hành thật.

### H41. Điểm khác biệt / đóng góp so với POS đơn giản?

**Đ:**

- Đặt bàn online + **tự phân bàn** (ghép bàn liền kề).
- **Đa chi nhánh** với phân quyền theo chi nhánh.
- Bếp và phục vụ cập nhật theo thời gian thực.
- Khách tự phục vụ qua QR tại bàn (xem menu, xem bill, thanh toán), gọi món chỉ khi bàn đang phục vụ.
- Tự động **no-show** + khóa tài khoản.
- Tích hợp **MoMo / VietQR (SePay)**.

### H42. Hạn chế hiện tại của hệ thống?

**Đ:**

- Chống spam hiện vẫn ở mức cơ bản, chưa tối ưu cho quy mô lớn.
- Ghép bàn hiện dựa trên số bàn liền nhau, chưa có sơ đồ khu vực trực quan.
- Xử lý khách no-show còn cứng, chưa có quy trình mở khóa mềm.
- Chưa có quản lý kho nguyên liệu, lương và chương trình khách hàng thân thiết.

---

## X. Sơ đồ luồng nghiệp vụ

```
Khách đặt bàn / khách vào trực tiếp
        ↓
Nhân viên tiếp nhận → bàn đang phục vụ
        ↓
Gọi món
        ↓
Bếp nhận món → làm món → báo xong
        ↓
Phục vụ đem món ra
        ↓
Yêu cầu thanh toán
        ↓
Xác nhận thanh toán → kết thúc lượt phục vụ → bàn chờ dọn
        ↓
Đánh giá sau bữa ăn
```

### Công nghệ (tham khảo nhanh)

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend   | Vue 3, Vite, Element Plus, Vue Router, Axios |
| Backend    | Node.js, Express 5, Sequelize |
| Database   | PostgreSQL |
| Cập nhật thời gian thực | Kênh realtime giữa bếp và phục vụ |

---

## XI. Câu bẫy thường gặp

| Câu hỏi | Trả lời gọn |
|---------|-------------|
| Khách đặt 19h, đến 19h14 có được không? | Được, vì nhà hàng cho thời gian chờ 15 phút. |
| Đặt 21h30, nhà hàng đóng 22h? | Bị từ chối — không đủ buffer 2h trước giờ đóng. |
| Hai nhóm cùng 8 khách, mỗi bàn 4 chỗ liền kề? | Ghép 2 bàn liền kề nếu cùng cluster và không conflict slot 2h. |
| Walk-in có cần tài khoản? | Không bắt buộc, vì nhân viên có thể mở lượt phục vụ trực tiếp tại quầy. |
| Hủy đặt bàn sau khi khách đã vào bàn? | Không hủy theo kiểu đặt trước nữa; lúc này xử lý như một lượt phục vụ đang diễn ra. |
| Quét QR 1 lần rồi về nhà spam gọi món? | Không gọi được, vì hệ thống chỉ nhận gọi món khi bàn đang phục vụ thật. Ngoài ra còn giới hạn tần suất thao tác để chặn spam. |
| Doanh thu có tính lượt đã hủy không? | Không, chỉ tính các lượt phục vụ đã hoàn tất. |

---

## Tài khoản demo (ôn thao tác)

| Username | Vai trò | Ghi chú |
|----------|---------|---------|
| Tài khoản quản trị | Quản trị | Toàn hệ thống |
| Tài khoản quản lý | Quản lý | Cơ sở 1 |
| Tài khoản phục vụ | Phục vụ | Cơ sở 1 |
| Tài khoản bếp | Bếp | Cơ sở 1 |
| Tài khoản khách | Khách | Cơ sở 1 |

Mật khẩu demo: 123456

---

*Tài liệu tạo tự động từ phân tích codebase — cập nhật khi có thay đổi nghiệp vụ.*
