# Hồ sơ đã bị từ chối

Luật: `REGISTRATION-STANDARD.md` §5 — *"Hồ sơ bị từ chối thì tệp đi đâu"*.

Tệp ở đây **nằm ngoài** tập so trùng R1, nên `platform_id` của nó **đã được thả** — người khác nộp
sau lấy được tên đó. Nhưng bộ chấm liệt kê mọi tên trong thư mục này ở cuối mỗi lượt chạy, và báo
kèm nếu một hồ sơ đang nộp dùng lại một tên đã từng bị từ chối.

Mỗi tệp phải mở đầu bằng ba thứ, vì thiếu một thứ thì người đọc sau không tra lại được:

- **mã từ chối** — `R1`, `R2` hoặc `R3` (bộ chấm bóc mã từ nội dung tệp, không từ tên tệp);
- **ngày** ra quyết định;
- **câu giải thích** đã trả cho bên nộp — với `R3` thì phải nêu dòng khai nào sai và bằng chứng nào
  cho thấy nó sai, đúng như §5 đòi.

Bên bị từ chối **nộp lại được**: đặt một tệp mới ở `Registrations/`, không sửa tệp trong thư mục
này. Tệp ở đây là nhật ký, không phải hàng đợi.
