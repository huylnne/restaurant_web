# Câu hỏi phản biện theo báo cáo & hệ thống thực tế

> Ôn theo đồ án **Lê Ngọc Huy — Thiết kế và xây dựng hệ thống quản lý nhà hàng**.  
> Cách trả lời: **ngắn, nói miệng, thiên nghiệp vụ** — tránh đọc tên biến/tên bảng trừ khi thầy hỏi sâu.

---

## I. Giới thiệu & bài toán (Chương 1)

### B1. Em chọn đề tài này vì sao?

**Đ:** Vì nhà hàng hiện nay hay vận hành rời rạc: đặt bàn một kiểu, gọi món một kiểu, bếp và quầy không đồng bộ. Em xây một hệ thống web gom toàn bộ luồng phục vụ — từ lúc khách xem menu đến lúc thanh toán và đánh giá — để giảm sai sót và phù hợp mô hình chuỗi nhiều chi nhánh.

### B2. Mục tiêu và phạm vi đồ án là gì?

**Đ:** Mục tiêu là làm nguyên mẫu hệ thống quản lý chuỗi nhà hàng trên web, kết nối khách hàng, phục vụ, bếp, quản lý và quản trị. Phạm vi tập trung các nghiệp vụ cốt lõi: đặt bàn, gọi món, vận hành bàn, thanh toán, báo cáo cơ bản — chưa đi sâu kho nguyên liệu hay ứng dụng mobile riêng.

### B3. Hệ thống khác gì so với chỉ có app đặt bàn hoặc POS đơn giản?

**Đ:** Không chỉ đặt bàn hay chỉ ghi order tại quầy. Em có **đặt bàn online + tự xếp bàn**, **đa chi nhánh**, **bếp–phục vụ cập nhật gần thời gian thực**, **QR tại bàn**, **xử lý khách không tới (no-show)**, và **thanh toán/báo cáo** trên cùng một nền tảng.

### B4. Sao em chọn Vue + Node + PostgreSQL?

**Đ:** Vue làm giao diện nhanh và dễ tách theo vai trò; Node xử lý nghiệp vụ cùng hệ sinh thái với frontend; PostgreSQL phù hợp vì đặt bàn và thanh toán cần dữ liệu chính xác, có quan hệ phức tạp giữa bàn, lượt phục vụ, món và hóa đơn.

### B5. Em thiết kế theo kiến trúc nào?

**Đ:** Theo hướng tách lớp: giao diện — xử lý nghiệp vụ — cơ sở dữ liệu. Mỗi phần làm một việc rõ ràng để sau này dễ bảo trì và mở rộng thêm chi nhánh hay thêm chức năng.

---

## II. Khảo sát & quy trình (Chương 2)

### B6. Hiện trạng nhà hàng em khảo sát có vấn đề gì?

**Đ:** Nhiều nơi vẫn ghi sổ, gọi điện đặt bàn, chuyển order bằng giấy. Hệ quả là trùng lịch, nhầm món, khó tổng hợp doanh thu, khách không theo dõi được tiến độ phục vụ.

### B7. Hệ thống có những ai tham gia?

**Đ:** Sáu nhóm tác nhân trong báo cáo, gom lại thành 5 vai trò sử dụng: **khách hàng**, **phục vụ**, **bếp**, **quản lý chi nhánh**, **quản trị hệ thống**. Mỗi người chỉ thấy phần việc của mình.

### B8. Quy trình phục vụ khách từ đầu đến cuối?

**Đ:** Khách xem chi nhánh và menu → đặt bàn hoặc tới trực tiếp → nhân viên tiếp nhận → gọi món → bếp chế biến → phục vụ đem ra → thanh toán → đánh giá. Toàn bộ nằm trên một luồng dữ liệu thống nhất.

### B9. Em có bao nhiêu use case? Nhóm chính là gì?

**Đ:** 17 use case (UC01–UC17), chia 5 nhóm: tài khoản chung; khách hàng; vận hành tại nhà hàng; bếp; quản lý chi nhánh; quản trị toàn hệ thống. Em đã hiện thực đủ nhóm chức năng cốt lõi trong phạm vi đồ án.

---

## III. Đặt bàn & giữ chỗ (UC05, mục 2.4.7)

### B10. Quy tắc giữ bàn 2 giờ nghĩa là gì?

**Đ:** Mỗi lượt đặt hoặc mỗi buổi phục vụ được giữ bàn khoảng **2 tiếng** kể từ giờ khách đến. Trong khoảng đó bàn không bị xếp cho nhóm khác, tránh hai đoàn chen vào cùng một bàn.

### B11. Khách đặt 20h thì bàn giữ đến mấy giờ?

**Đ:** Giữ đến khoảng **22h**. Nếu 21h mà tất cả bàn đều còn bận đến sau 21h thì khách đặt 21h sẽ không còn chỗ — đúng với logic giữ chỗ theo khung thời gian.

### B12. Khách được đặt trước trong khoảng thời gian nào?

**Đ:** Tối thiểu **30 phút** sau thời điểm hiện tại, tối đa **14 ngày**, và phải nằm trong giờ mở cửa của chi nhánh.

### B13. Một khách được giữ tối đa mấy lượt đặt trước?

**Đ:** Tối đa **2** lượt chưa tới giờ, để tránh spam chiếm chỗ.

### B14. Nhóm đông hơn một bàn thì xử lý sao?

**Đ:** Hệ thống ưu tiên một bàn vừa đủ chỗ. Nếu không đủ thì **ghép vài bàn gần nhau** cho cùng một nhóm, giống cách nhà hàng thật xếp bàn cho đoàn đông.

### B15. Khách hủy đặt bàn khi nào được?

**Đ:** Hủy được khi lượt đặt còn ở giai đoạn chờ hoặc đã xác nhận, **chưa vào bàn**, và còn **ít nhất 2 giờ** trước giờ hẹn (theo quy tắc trong báo cáo).

### B16. Hai khách cùng đặt một giờ một bàn thì sao?

**Đ:** Ai được hệ thống xác nhận trước thì giữ bàn trước. Người sau sẽ báo hết chỗ hoặc gợi ý đổi giờ — tránh trùng lịch.

### B17. Khách đặt mà không tới (no-show) xử lý thế nào?

**Đ:** Quá **15 phút** sau giờ hẹn mà chưa được tiếp nhận thì coi là không tới, **nhả bàn** và có thể **khóa tài khoản** để hạn chế lặp lại.

---

## IV. Tiếp nhận & trạng thái bàn (UC06, UC10)

### B18. Đặt trước khác walk-in thế nào?

**Đ:** **Đặt trước** là khách book online, tới nơi nhân viên bấm tiếp nhận. **Walk-in** là khách tới liền không đặt — nhân viên chọn bàn trống và mở phiên phục vụ ngay.

### B19. Bàn có những trạng thái nào?

**Đ:** Bốn trạng thái dễ nhớ: **trống**, **sắp có khách đặt**, **đang phục vụ**, **chờ dọn**. Phục vụ nhìn sơ đồ là biết bàn nào rảnh, bàn nào đang bận.

### B20. Bàn “sắp có khách đặt” khi nào?

**Đ:** Khi còn khoảng **15 phút** nữa tới giờ khách hẹn mà khách chưa vào bàn — để nhân viên chuẩn bị đón.

### B21. QR trên bàn để làm gì?

**Đ:** Khách quét QR để vào đúng bàn: xem menu, xem bill tạm tính, thanh toán qua mã ngân hàng. **Gọi món qua QR chỉ mở khi bàn đang phục vụ thật** — không dùng link cũ để gọi món bừa được.

### B22. Quét QR một lần rồi về nhà spam gọi món thì sao?

**Đ:** Không gọi được nếu bàn chưa có phiên phục vụ hoặc buổi ăn đã kết thúc. Hệ thống chỉ nhận gọi món khi bàn đang phục vụ; ngoài ra còn giới hạn tần suất thao tác để chặn bấm dồn dập.

### B23. Thanh toán xong bàn có trống ngay không?

**Đ:** Không. Bàn chuyển **chờ dọn** trước; nhân viên dọn xong mới mở lại cho khách mới.

---

## V. Gọi món & bếp (UC07, UC08, UC09)

### B24. Ai được gọi món?

**Đ:** Cả **khách** (trang “Bàn của tôi” hoặc QR) và **nhân viên phục vụ**. Món luôn gắn với lượt phục vụ đang diễn ra tại bàn đó.

### B25. Luồng món từ bếp đến khách?

**Đ:** Gọi món → bếp nhận → **đang làm** → **xong** → phục vụ **đem ra khách**. Mỗi bước cập nhật một lần, bếp và phục vụ nhìn cùng dữ liệu.

### B26. Sao cần cập nhật gần thời gian thực?

**Đ:** Vì bếp làm xong mà phục vụ không biết thì món nguội, khách chờ lâu. Hệ thống báo ngay cho phục vụ cùng chi nhánh khi món xong.

### B27. Giá trên hóa đơn lấy ở đâu?

**Đ:** **Chốt theo thời điểm gọi món**, không lấy giá menu sau này — tránh tranh cãi lúc thanh toán nếu giá đã đổi.

### B28. Khách có đặt món trước khi tới không?

**Đ:** Có. Sau khi đặt bàn, khách có thể chọn đặt trước món; khi tới nhà hàng nhân viên tiếp nhận và bếp xử lý như gọi món bình thường.

---

## VI. Thanh toán & hóa đơn (UC11)

### B29. Luồng thanh toán diễn ra thế nào?

**Đ:** Khách xem bill tạm tính → gửi yêu cầu thanh toán hoặc nhân viên chốt tại quầy → xác nhận phương thức (tiền mặt, chuyển khoản, thẻ, ví) → hoàn tất lượt phục vụ → bàn chờ dọn → có thể xuất hóa đơn.

### B30. VietQR hoạt động thế nào?

**Đ:** Hệ thống tạo mã chuyển khoản gắn đúng lượt phục vụ và đúng số tiền. Khi ngân hàng báo về, hệ thống đối chiếu rồi mới chốt thành công — tránh ghi nhận sai hoặc trùng.

> **Lưu ý khi bảo vệ:** Báo cáo ghi “chưa tự động đối soát” ở phần hạn chế; **code thực tế đã có webhook SePay**. Nếu thầy hỏi, em nói: phần đối soát tự động đã làm ở backend, báo cáo viết trước khi hoàn thiện tính năng này.

### B31. MoMo đã dùng được chưa?

**Đ:** Backend đã có tích hợp thử nghiệm; **giao diện khách hàng chưa gắn đầy đủ luồng thanh toán MoMo end-to-end** — em ghi rõ trong phần hạn chế và hướng phát triển.

### B32. Ghép nhiều bàn thì thanh toán một lần hay nhiều lần?

**Đ:** Một lần cho cả nhóm. Khi thanh toán xong, toàn bộ bàn trong nhóm được cập nhật đồng bộ.

---

## VII. Đánh giá & báo cáo (UC12, UC13, UC14)

### B33. Khách đánh giá khi nào?

**Đ:** Sau khi dùng bữa xong và thanh toán xong. Mỗi lượt phục vụ chỉ đánh giá **một lần**.

### B34. Đánh giá qua QR bàn có được không?

**Đ:** Có, trong khoảng thời gian ngắn sau buổi ăn (báo cáo ghi 4 giờ) để phản hồi còn chính xác.

### B35. Doanh thu tính thế nào?

**Đ:** Chỉ tính các lượt **đã hoàn tất thanh toán**, lọc theo chi nhánh và khoảng thời gian. Lượt hủy hoặc chưa xong không tính vào doanh thu.

### B36. Quản lý chi nhánh xem được gì?

**Đ:** Doanh thu, món bán chạy, đánh giá khách, quản lý thực đơn và thông tin cơ sở được phân công — không thấy dữ liệu chi nhánh khác.

---

## VIII. Quản trị & bảo mật (UC15–UC17)

### B37. Admin quản lý những gì?

**Đ:** Toàn chuỗi: danh sách chi nhánh, tài khoản nhân viên và khách, phân quyền, cấu hình bàn và mã QR, dashboard tổng quan.

### B38. Em chống spam đăng ký và đặt bàn thế nào?

**Đ:** Có mã xác minh khi đăng ký, giới hập số lượt đặt trước, giới hạn tần suất gửi yêu cầu, và có thể khóa tài khoản vi phạm (ví dụ no-show nhiều lần).

### B39. Mật khẩu lưu thế nào?

**Đ:** Không lưu plain text — mật khẩu được mã hóa trước khi ghi vào cơ sở dữ liệu. Đăng nhập dùng cơ chế xác thực an toàn, mỗi vai trò chỉ truy cập đúng phần việc.

### B40. Bếp có sửa được món chi nhánh khác không?

**Đ:** Không. Nhân sự bếp chỉ thao tác trong phạm vi cơ sở mình phụ trách.

---

## IX. Thiết kế dữ liệu (Chương 3 — khi thầy hỏi sâu)

### B41. Sao gộp đặt bàn và phục vụ tại bàn vào một luồng?

**Đ:** Vì về bản chất đều là **một lượt khách tại nhà hàng** — chỉ khác lúc bắt đầu (đặt trước hay walk-in). Gộp chung giúp gọi món, thanh toán, đánh giá không bị tách rời và lệch dữ liệu.

### B42. Một lượt phục vụ có thể dùng nhiều bàn không?

**Đ:** Có, khi ghép bàn cho nhóm đông. Hệ thống vẫn quản lý như một buổi phục vụ, thanh toán một lần.

### B43. Các bảng dữ liệu chính là gì? (nói đơn giản)

**Đ:** Em có các nhóm: **người dùng & chi nhánh**, **bàn & thực đơn**, **lượt phục vụ & món đã gọi**, **thanh toán & đánh giá**. Quan hệ giữa các nhóm đảm bảo tra cứu đúng bàn, đúng bill, đúng doanh thu.

---

## X. Cài đặt, kiểm thử & hạn chế (Chương 4–5)

### B44. Em kiểm thử thế nào?

**Đ:** Kiểm thử thủ công theo checklist từng use case và luồng nghiệp vụ end-to-end. Chưa có bộ test tự động — em ghi trong hạn chế.

### B45. Hiệu năng em đánh giá ra sao?

**Đ:** Trên môi trường phát triển local, các thao tác phổ biến thường dưới 1 giây. Chưa kiểm thử tải với hàng trăm người dùng đồng thời — phù hợp phạm vi nguyên mẫu đồ án.

### B46. Kết quả đạt được là gì?

**Đ:** Hoàn thiện chuỗi nghiệp vụ khép kín từ đặt bàn đến thanh toán; 17 use case cốt lõi đã có phần mềm chạy được; hơn 25 màn hình theo vai trò; dữ liệu mẫu 7 chi nhánh phục vụ demo.

### B47. Hạn chế của đồ án?

**Đ:** Còn ở mức nguyên mẫu, chưa triển khai production; MoMo chưa gắn đầy đủ giao diện khách; chưa có app mobile riêng; kiểm thử mới thủ công; ghép bàn theo số bàn liền nhau chứ chưa có sơ đồ khu vực trực quan; chưa có quản lý kho nguyên liệu.

### B48. Hướng phát triển tiếp theo?

**Đ:** Triển khai thật, hoàn thiện thanh toán điện tử phía khách, thông báo realtime cho khách khi món xong, kiểm thử tự động, module khuyến mãi/kho, và phân tích doanh thu nâng cao.

---

## XI. Câu bẫy hay gặp từ báo cáo

| Thầy hỏi | Em trả lời ngắn |
|----------|-----------------|
| Đặt 19h, tới 19h14? | Vẫn được — cho 15 phút, quá 19h15 mới coi là không tới. |
| Đặt 21h30, đóng 22h? | Không cho — không đủ 2 giờ giữ bàn trước giờ đóng. |
| Đặt tối thiểu bao lâu trước? | Ít nhất 30 phút. |
| Đặt xa nhất bao lâu? | Tối đa 14 ngày. |
| Hủy đặt bàn trước giờ đến bao lâu? | Còn ít nhất 2 giờ và chưa vào bàn. |
| Hủy sau khi đã check-in? | Không hủy kiểu đặt trước nữa — xử lý như lượt phục vụ đang diễn ra. |
| Walk-in cần tài khoản không? | Không bắt buộc — nhân viên mở lượt tại quầy. |
| Doanh thu tính lượt đã hủy? | Không — chỉ lượt đã hoàn tất. |
| QR có thay nhân viên gọi món hoàn toàn? | Không — QR hỗ trợ tự phục vụ, nhưng vẫn cần mở phiên phục vụ và nhân viên/bếp vận hành thực tế. |
| Báo cáo nói chưa đối soát VietQR? | Backend đã có webhook; phần hạn chế trong báo cáo viết trước khi hoàn thiện — em có thể demo nếu thầy yêu cầu. |

---

## XII. Gợi ý demo nhanh khi bị hỏi “chứng minh”

1. **Khách:** xem menu → đặt bàn → (tuỳ chọn) đặt món trước.
2. **Phục vụ:** tiếp nhận / walk-in → mở bàn → gọi thêm món.
3. **Bếp:** nhận món → đang làm → xong.
4. **Phục vụ:** đã bưng ra → yêu cầu thanh toán → chốt bill.
5. **Khách:** quét QR xem bill / thanh toán / đánh giá.

Nói kèm: *“Dạ đây là luồng em mô tả ở Hình 2.1 và các biểu đồ trình tự chương 3 ạ.”*

---

## Tài khoản demo (ôn thao tác)

| Tài khoản | Vai trò |
|-----------|---------|
| admin | Quản trị toàn hệ thống |
| manager1 | Quản lý chi nhánh 1 |
| waiter1 | Phục vụ chi nhánh 1 |
| kitchen1 | Bếp chi nhánh 1 |
| ngochuy | Khách hàng |

Mật khẩu demo: **123456**

---

*Cập nhật theo báo cáo `20225858_LeNgocHuy_20252.pdf` và codebase `restaurant_web/`.*
