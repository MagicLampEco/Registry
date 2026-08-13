<!-- Mẫu hồ sơ đăng ký. Sao thành <ten-dich-vu>.md rồi điền.
     Cách điền: KHÔNG viết văn xuôi cho phần tuân thủ — CHỌN MÃ từ tập đóng ở
     `codes.json`, mỗi mã kèm con trỏ kiểm được. Chưa đạt thì chọn đúng mã "chưa đạt";
     đó là khai ĐÚNG, không phải khai xấu. Chỉ khai SAI SỰ THẬT mới là căn cứ từ chối.
     Chấm thử trước khi mở PR:  node tools/check-registration.mjs Registrations/<tên>.md -->

# Hồ sơ đăng ký — <Tên dịch vụ>

| | |
|---|---|
| **Trạng thái hồ sơ** | Nháp / Đã tiếp nhận / Đã niêm yết / Bị từ chối |
| **Ngày nộp** | YYYY-MM-DD |
| **Ngày cập nhật gần nhất** | YYYY-MM-DD |

## Khối khai báo — phần máy đọc

Đây là phần quyết định hạng niêm yết. Mọi thứ dưới nó là giải thích cho người đọc.

```json registration
{
  "platform_id": "<id-de-nghi>",
  "spec_version": 2,

  "declares": {
    "identity": "ID-0",
    "token":    "TK-0",
    "custody":  "CU-0",
    "infra":    "IN-0"
  },

  "pointers": {
    "dau_moi_lien_he": "",
    "repo": "",
    "con_tro": "",
    "moc_du_kien": "",

    "instance_id": "",
    "custody_hash": "",
    "seed_policy": "",
    "governance_ref": "",
    "governance_ref_tinh_chat": "",
    "accepted_assets": [],
    "cut_bps": 0,

    "thu_o_dau": "",
    "danh_sach_phu_thuoc": [],
    "duong_thay_the": [],
    "con_tro_cong_phat_hanh": "",
    "platform_id_he_danh_tinh": "",

    "nguoi_tiep_nhan_khi_ngung": ""
  },

  "evidence": [
    { "claim": "<lời khẳng định dịch vụ đưa ra và tính tiền trên đó>", "tier": "EV-0", "pointer": "" }
  ]
}
```

**Bốn mã trên là tập đóng.** Ý nghĩa từng mã, và dữ kiện mỗi mã bắt buộc phải kèm, ở
[`codes.json`](codes.json). Chọn mã cao hơn thực tế = khai sai sự thật = căn cứ từ chối **R3**.
Chọn đúng mã thấp = hồ sơ vẫn được tiếp nhận.

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | |
| Dịch vụ làm gì (một câu) | |
| Đội hoặc người chịu trách nhiệm | |
| Con trỏ thực thi | ghi **từng** repo/module và phần lời khai nào dựa trên nó |

## (b) Giải thích bốn mã đã chọn

Mỗi dòng: vì sao chọn mã đó, con trỏ kiểm được, và nếu chưa đạt thì thiếu gì.

| Trục | Mã | Vì sao | Con trỏ kiểm được | Thiếu gì để lên mã cao hơn |
|---|---|---|---|---|
| **2.1** Danh tính | | | | |
| **2.2** Hệ token | | | | |
| **2.3** Kho giá trị | | | | |
| **2.4** Hạ tầng ngoài | | | | |

## (c) Tham số kỹ thuật

> Chỉ điền khi `custody = CU-1`. Với `CU-N` (không thu asset ở tầng này) thì bỏ trống mọi ô
> trừ `governance_ref`, và ghi rõ tiền — nếu có — chảy vào đâu.
> Ý nghĩa từng trường: [`../Specs/CONTRACT.md`](../Specs/CONTRACT.md) §2.

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `instance_id` | | = tên NFT xác thực của kho |
| `custody_hash` | | script hash kho của dịch vụ |
| `seed_policy` | | policy NFT xác thực kho |
| `governance_ref` | | cổng quản trị gác chi của **riêng** dịch vụ này — bắt buộc kể cả với `CU-N` |
| `accepted_assets` | | rỗng nếu `CU-N` |
| `cut_bps` | | ∈ [0, 10000]; bằng 0 nếu `CU-N` |
| Bucket kế toán | | id + nhãn từng khoang |
| `genesis_ref` | | UTxO tiêu khi dựng kho (một lần) |
| `created_epoch` | | do giao dịch đăng ký ép, không tự khai được |

## (d) Lời khẳng định và hạng chứng thực

Liệt kê **mọi** con số dịch vụ khai ra rồi tính tiền hoặc xin uy tín dựa trên nó. Mỗi dòng khai
riêng một hạng — một dịch vụ khai nhiều hạng cho nhiều chặng là bình thường.

| Lời khẳng định | Hạng | Ai ký | Con trỏ |
|---|---|---|---|
| | `EV-0` / `EV-1` / `EV-2` | | |

> `EV-0` **vẫn bán được**. Nó chỉ không được dùng để cấp uy tín hoặc quyền biểu quyết ở tầng hệ.
> Đây là mô tả, không phải hình phạt — hệ không có quyền phạt.

## (e) Cam kết vận hành

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
