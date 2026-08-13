# Hồ sơ đăng ký — Trace

| | |
|---|---|
| **Trạng thái hồ sơ** | Nháp — Registry mở sẵn khung, chờ đội dịch vụ điền |
| **Ngày nộp** | (chưa nộp) |
| **Ngày cập nhật gần nhất** | 2026-07-29 |

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | Trace |
| `platform_id` đề nghị | `Trace` |
| Repo / mã nguồn | `/OriLifeTrace` |
| Đội hoặc người chịu trách nhiệm | OriLife agent |
| Đầu mối liên hệ | CHƯA CÓ — điền khi nộp |
| Dịch vụ làm gì (một câu) | Truy xuất nguồn gốc nông sản, gắn danh tính cho vật thể thật ngoài đồng. |

## (b) Khai báo tuân thủ bốn điều kiện

> Chuẩn: [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §2.

| Điều kiện | Đã đạt? | Con trỏ kiểm được |
|---|---|---|
| **2.1** PhoenixKey DID | CHỜ NỘP | Có tài liệu tích hợp DID cho cây trồng (`OriLifeTrace/field-reid/TREE-DID-INTEGRATION.md`); còn thiếu khai báo về danh tính **người dùng** và cam kết không giữ khoá riêng của họ. |
| **2.2** LAMP · MAGIC · CARP | CHỜ NỘP | |
| **2.3** Kho on-chain | CHỜ NỘP — có dấu hiệu đã tích hợp | `OriLifeTrace/orilife-fee/src/treasuryClient.ts` gọi thẳng bộ dựng giao dịch thu của Treasury. Cần làm rõ: kho đã dựng qua đúng ba cửa (dựng kho → niêm yết → nối thu) hay đang gọi tắt bộ SDK mà **chưa** có entry trong sổ. |
| **2.4** Không phụ thuộc hạ tầng đóng | CHỜ NỘP | |

Phần chưa đạt — ghi rõ còn thiếu gì và mốc dự kiến:

- CHỜ NỘP.

## (c) Tham số kỹ thuật

CHỜ NỘP — xem mẫu bảng trường ở [`template.md`](template.md) mục (c).

## (d) Cam kết vận hành

CHỜ NỘP.

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-07-29 | Mở hồ sơ, rà sơ bộ dấu vết tích hợp trong repo | Có tích hợp Treasury ở tầng mã nguồn; **chưa xác minh** đã đi qua cổng đăng ký. Cần đội dịch vụ xác nhận. |
