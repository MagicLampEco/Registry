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
    "custody":  "<CHỌN: CU-N | CU-0 | CU-1>",
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
    "cut_bps": "<số nguyên bps trong [0, 10000] — ghi 0 nếu không thu>",

    "thu_o_dau": "",
    "danh_sach_phu_thuoc": [],
    "duong_thay_the": [],
    "bang_chung_khong_phu_thuoc": "<CHỈ khi khai IN-3 — `<lệnh tra lại được> -> <kết quả nhận được>`, ví dụ: command grep -rn 'firebase|onesignal' src/ -> 0 dong>",
    "con_tro_cong_phat_hanh": "",
    "platform_id_he_danh_tinh": "",

    "nen_su_dung": [],

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

> ⚠ **Trục `custody` không có mặc định, và cố ý không có.** Ba trục kia mặc định là mã **thấp
> nhất** — để nguyên thì hồ sơ chỉ tự hạ hạng, không nói sai điều gì. Trục `custody` khác: `CU-0`
> **không** phải "chưa có gì", nó là lời khai *"có thu asset, nhưng đang giữ ở sổ nội bộ"*. Một
> dịch vụ **không thu asset** mà để nguyên mặc định thì vừa tự tụt hai hạng (`CU-N` là hạng 2),
> vừa khai một điều không đúng sự thật — tức tự đặt mình vào **R3** bằng cách không làm gì cả.
> Nên ô này để chỗ trống có chữ, và bộ chấm sẽ **đỏ** nếu bạn quên. Đỏ ồn ào đúng hơn im lặng sai.

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | |
| Dịch vụ làm gì (một câu) | |
| Đội hoặc người chịu trách nhiệm | |
| Con trỏ thực thi | ghi **từng** repo/module và phần lời khai nào dựa trên nó |

## (b) Giải thích bốn mã đã chọn

Mỗi dòng: vì sao chọn mã đó, con trỏ kiểm được, và nếu chưa đạt thì thiếu gì.

> **Khuôn con trỏ — máy đọc được.** Chuẩn (`../REGISTRATION-STANDARD.md` §3) đòi con trỏ mã nguồn
> mang **ba** thứ: `file:line`, **tên nhánh**, **SHA**. Chuẩn không cho cú pháp, nên bộ chấm nhận
> quy ước tối thiểu sau — viết khác đi thì máy không nhận ra và **hạ hạng**, dù con trỏ đúng:
>
> - tên nhánh viết **sau chữ `nhánh` hoặc `branch`** — `nhánh main`, `branch feat/abc`;
> - SHA là một chuỗi 7–40 ký tự hex;
> - chưa gộp thì ghi đúng chữ hoa **`CHƯA GỘP`** kèm tên nhánh, đừng bỏ trống.
>
> Đủ khuôn: `Core/rice.js:136, nhánh main, 7916d2e` · `rust/mls.rs:88, branch feat/mls, CHƯA GỘP`.
> Chứng cứ on-chain thì thay bằng **tx hash 64 hex**, không cần ba thứ trên.

| Trục | Mã | Vì sao | Con trỏ kiểm được | Thiếu gì để lên mã cao hơn |
|---|---|---|---|---|
| **2.1** Danh tính | | | | |
| **2.2** Hệ token | | | | |
| **2.3** Kho giá trị | | | | |
| **2.4** Hạ tầng ngoài | | | | |

## (c) Tham số kỹ thuật

> **`CU-1` điền cả bảng. `CU-N` cũng phải điền ba ô**, đừng đọc thành "CU-N thì bỏ trống hết":
> `governance_ref`, `governance_ref_tinh_chat` và `thu_o_dau` là `needs` của chính `CU-N`
> (`codes.json`), bỏ trống thì bộ chấm báo thiếu và trục kho **không có hạng**. Không thu asset ở
> tầng này thì vẫn phải nói tiền — nếu có — chảy vào đâu, và ai gác cửa chi.
> Ý nghĩa từng trường: [`../Specs/CONTRACT.md`](../Specs/CONTRACT.md) §2.

| Trường | Giá trị | Bắt buộc với | Ghi chú |
|---|---|---|---|
| `instance_id` | | `CU-1` | = tên NFT xác thực của kho |
| `custody_hash` | | `CU-1` | script hash kho của dịch vụ |
| `seed_policy` | | `CU-1` | policy NFT xác thực kho |
| `governance_ref` | | `CU-1` · `CU-N` | cổng quản trị gác chi của **riêng** dịch vụ này |
| `governance_ref_tinh_chat` | | `CU-1` · `CU-N` | bốn tính chất G1–G4, xem `codes.json` mục `governance_ref_yeu_cau` |
| `accepted_assets` | | `CU-1` | rỗng nếu `CU-N` |
| `cut_bps` | | `CU-1` | ∈ [0, 10000]; bằng 0 nếu `CU-N` |
| `thu_o_dau` | | `CU-N` | không thu ở tầng này thì tiền chảy vào đâu |
| Bucket kế toán | | — | id + nhãn từng khoang; không mã nào đòi, khai để người đọc hiểu dòng tiền |
| `genesis_ref` | | — | UTxO tiêu khi dựng kho (một lần); không mã nào đòi |
| `created_epoch` | | — | do giao dịch đăng ký ép, không tự khai được |
| `nen_su_dung` | | **mọi hồ sơ** | tên nền hệ đang dùng (`phoenixkey` · `magic` · `lampnet` · `vedata`). Lên chuỗi thành `substrate_flags`; `[]` là lời khai hợp lệ nhưng **phải điền** — xem `../REGISTRATION-STANDARD.md` §2.6 |

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
