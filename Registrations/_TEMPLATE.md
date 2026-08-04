<!-- Mẫu hồ sơ đăng ký. Sao thành <ten-dich-vu>.md rồi điền.
     Quy tắc điền: mọi khai báo tuân thủ phải kèm CON TRỎ KIỂM ĐƯỢC (file:line, địa chỉ
     on-chain, endpoint). Chưa làm được thì ghi "chưa" + mốc dự kiến — không viết lời hứa
     suông, không để trống. Ô chưa có dữ liệu ghi rõ CHƯA CÓ. -->

# Hồ sơ đăng ký — <Tên dịch vụ>

| | |
|---|---|
| **Trạng thái hồ sơ** | Nháp / Chờ rà / Đã duyệt / Đã niêm yết |
| **Ngày nộp** | YYYY-MM-DD |
| **Ngày cập nhật gần nhất** | YYYY-MM-DD |

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | |
| `platform_id` đề nghị | |
| Repo / mã nguồn | |
| Đội hoặc người chịu trách nhiệm | |
| Đầu mối liên hệ | |
| Dịch vụ làm gì (một câu) | |

## (b) Khai báo tuân thủ bốn điều kiện

> Chuẩn: [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §2.

| Điều kiện | Đã đạt? | Con trỏ kiểm được |
|---|---|---|
| **2.1** Người dùng định danh bằng PhoenixKey DID, một người một DID, dịch vụ không giữ khoá riêng của người dùng | | |
| **2.2** Dùng chung LAMP · MAGIC · CARP; không đốt LAMP; không tạo đường-ra cho MAGIC; token/CARP biến thể (nếu có) đã qua đúng cổng | | |
| **2.3** Phí chảy vào Treasury custody instance on-chain của chính dịch vụ, không phải sổ nội bộ | | |
| **2.4** Chức năng cốt lõi không đặt trên hạ tầng đóng ngoài hệ | | |

Phần chưa đạt — ghi rõ còn thiếu gì và mốc dự kiến:

- 

## (c) Tham số kỹ thuật

> Ý nghĩa từng trường: [`../Specs/CONTRACT.md`](../Specs/CONTRACT.md) §2.

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `instance_id` | | = tên NFT xác thực của kho |
| `custody_hash` | | script hash kho của dịch vụ |
| `seed_policy` | | policy NFT xác thực kho |
| `governance_ref` | | cổng quản trị gác chi của **riêng** dịch vụ này |
| `accepted_assets` | | các asset dịch vụ thu |
| `cut_bps` | | ∈ [0, 10000] |
| Bucket kế toán | | id + nhãn từng khoang |
| `genesis_ref` | | UTxO tiêu khi dựng kho (một lần) |
| `created_epoch` | | epoch đăng ký |

## (d) Cam kết vận hành

| Câu hỏi | Trả lời |
|---|---|
| Ai giữ quyền quản trị kho? Bao nhiêu chữ ký? | |
| Khoá quản trị bị lộ thì xử lý thế nào? | |
| Dừng hoặc tạm dừng dịch vụ thì thông báo ra sao? | |
| Ai tiếp nhận nếu đội hiện tại ngừng duy trì? | |

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| | | |
