# Hồ sơ đăng ký — Chat

| | |
|---|---|
| **Trạng thái hồ sơ** | Nháp — Registry mở sẵn khung, chờ đội dịch vụ điền |
| **Ngày nộp** | (chưa nộp) |
| **Ngày cập nhật gần nhất** | 2026-07-29 |

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | Chat |
| `platform_id` đề nghị | `Chat` |
| Repo / mã nguồn | `/ProofChat` |
| Đội hoặc người chịu trách nhiệm | ProofChat agent |
| Đầu mối liên hệ | CHƯA CÓ — điền khi nộp |
| Dịch vụ làm gì (một câu) | Kênh nhắn tin có bằng chứng, gắn nội dung trao đổi với danh tính kiểm chứng được. |

## (b) Khai báo tuân thủ bốn điều kiện

> Chuẩn: [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §2.

| Điều kiện | Đã đạt? | Con trỏ kiểm được |
|---|---|---|
| **2.1** PhoenixKey DID | CHỜ NỘP — có lớp xác thực | Chiến lược xác thực PhoenixKey trong backend: `ProofChat/BE/src/modules/auth/strategies/phoenixkey.strategy.ts`. Cần khai rõ một người một DID, và ai giữ khoá riêng. |
| **2.2** LAMP · MAGIC · CARP | CHỜ NỘP | |
| **2.3** Kho on-chain | CHỜ NỘP | |
| **2.4** Không phụ thuộc hạ tầng đóng | CHỜ NỘP | Nếu có kênh phân phối ngoài hệ, nêu rõ nó chỉ là kênh tiếp cận, không giữ danh tính hay dữ liệu gốc. |

Phần chưa đạt — ghi rõ còn thiếu gì và mốc dự kiến:

- CHỜ NỘP.

## (c) Tham số kỹ thuật

CHỜ NỘP — xem mẫu bảng trường ở [`_TEMPLATE.md`](_TEMPLATE.md) mục (c).

## (d) Cam kết vận hành

CHỜ NỘP.

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-07-29 | Mở hồ sơ, rà sơ bộ dấu vết tích hợp trong repo | Có lớp xác thực PhoenixKey ở backend; **chưa xác minh** phần token và kho on-chain. |
