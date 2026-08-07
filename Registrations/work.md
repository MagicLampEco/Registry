# Hồ sơ đăng ký — Work

| | |
|---|---|
| **Trạng thái hồ sơ** | Nháp — Registry mở sẵn khung, chờ đội dịch vụ điền |
| **Ngày nộp** | (chưa nộp) |
| **Ngày cập nhật gần nhất** | 2026-07-29 |

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | Work |
| `platform_id` đề nghị | `Work` |
| Repo / mã nguồn | `/AladinWork` |
| Đội hoặc người chịu trách nhiệm | Aladin agent |
| Đầu mối liên hệ | CHƯA CÓ — điền khi nộp |
| Dịch vụ làm gì (một câu) | Nền tảng việc làm và cộng tác, khớp người với việc kèm bằng chứng đóng góp. |

## (b) Khai báo tuân thủ bốn điều kiện

> Chuẩn: [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §2.

| Điều kiện | Đã đạt? | Con trỏ kiểm được |
|---|---|---|
| **2.1** PhoenixKey DID | CHỜ NỘP — có lớp nối | Bộ nối PhoenixKey tồn tại ở nhiều module: `AladinWork/Core/adapters/phoenixkey.js`, `AladinWork/Eye/src/adapters/phoenixkey.js`, `AladinWork/Flow/src/adapters/phoenixkey.js`. Cần khai rõ một người một DID và ai giữ khoá. |
| **2.2** LAMP · MAGIC · CARP | CHỜ NỘP | Cần nêu rõ hiện trạng MAGIC: đang là kế toán ngoài chuỗi hay đã là token chuyển nhượng thật. |
| **2.3** Kho on-chain | CHỜ NỘP | |
| **2.4** Không phụ thuộc hạ tầng đóng | CHỜ NỘP | Có bộ nối LampNet (`AladinWork/Core/adapters/lampnet.js`) — cần nêu hành vi khi hạ tầng ngoại tuyến. |

Phần chưa đạt — ghi rõ còn thiếu gì và mốc dự kiến:

- CHỜ NỘP.

## (c) Tham số kỹ thuật

CHỜ NỘP — xem mẫu bảng trường ở [`_TEMPLATE.md`](_TEMPLATE.md) mục (c).

## (d) Cam kết vận hành

CHỜ NỘP.

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-07-29 | Mở hồ sơ, rà sơ bộ dấu vết tích hợp trong repo | Có lớp nối PhoenixKey và LampNet ở tầng mã nguồn; **chưa xác minh** kho on-chain và trạng thái MAGIC. |
