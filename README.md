# Registry

Cổng đăng ký hệ sinh thái MagicLamp.

Mọi platform, ứng dụng hay dịch vụ muốn hoạt động trong hệ sinh thái MagicLamp đều đi qua đây:
đăng ký một lần, tuân đúng một bộ chuẩn, rồi ghép được với mọi thành phần khác — dùng chung
danh tính **PhoenixKey**, dùng chung hệ token **LAMP · MAGIC · CARP** và các biến thể neo vào
chúng.

Sổ đăng ký sống on-chain: mỗi dịch vụ là **một NFT beacon** mang tên định danh của nó, cộng
một entry trỏ về kho giá trị của chính dịch vụ đó. Muốn biết trong hệ có những ai, chỉ cần quét
một policy — không có sổ trung tâm, nên đăng ký của bên này không chặn bên kia.

## Bắt đầu từ đâu

| Bạn là | Đọc |
|---|---|
| Đội muốn đưa dịch vụ vào hệ | [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md) — điều kiện, hồ sơ, quy trình bốn bước |
| Đội đã quyết đăng ký, cần làm từng bước | [`Specs/ONBOARDING.md`](Specs/ONBOARDING.md) |
| Người cần hiểu cơ chế đầy đủ | [`Specs/`](Specs/) — CONTRACT (bất biến) · FEAT (hành vi) · TECH (kiến trúc) · EXEC (lộ trình) |
| Người muốn xem ai đã đăng ký | [`Registrations/`](Registrations/) |

## Bản đồ repo

```
REGISTRATION-STANDARD.md   chuẩn vào hệ — tài liệu bên đăng ký đọc trước
Specs/                     đặc tả đầy đủ của cơ chế (CONTRACT/FEAT/TECH/EXEC/ONBOARDING)
Registrations/             hồ sơ đăng ký từng dịch vụ + mẫu
onchain/                   hai validator Aiken: registry_beacon (mint) + registry (spend)
Legacy/                    tài liệu đã bị thay, giữ để tra lịch sử
```

## Hai tầng, không lẫn quyền

- **Registry là sổ chỉ đường.** Nó nói ai tồn tại, trỏ đi đâu, đang ở trạng thái nào. Nó
  **không giữ giá trị** và không chi được tiền của ai.
- **Kho là nơi giữ giá trị.** Mỗi dịch vụ có kho riêng, do cổng quản trị riêng của dịch vụ đó
  gác chi.

Hệ quả cần nhớ: đặt một dịch vụ sang trạng thái tạm dừng hay ngừng hẳn **chỉ ẩn nó khỏi sổ**,
không khoá được dòng tiền ở kho. Chi tiết ở [`Specs/CONTRACT.md`](Specs/CONTRACT.md) bất biến PK10.

## Di chuyển từ repo LAMP (2026-07-29)

Lớp đăng ký này trước đây nằm trong repo [`MagicLampNetwork/LAMP`](https://github.com/MagicLampNetwork/LAMP)
dưới tên **PlatformKit**, chung cây với Treasury. Nó tách sang repo riêng vì đúng ranh giới
trách nhiệm: Treasury là **kho** của từng dịch vụ, Registry là **sổ niêm yết** của cả hệ — hai
việc khác nhau, hai vòng đời khác nhau.

**Đã di chuyển, có bằng chứng thực thi:**

- Toàn bộ on-chain — hai validator, thư viện dùng chung, 30 test. `aiken check` cho 30/30 pass;
  `aiken build` cho script hash **trùng khít từng bit** với bản đang ở LAMP:
  - `registry` → `b3b4c26a76eaadc4769746e4a5c6066e11f2b9677a7a90184d6489cd`
  - `registry_beacon` → `bc3b9041e74ace58c432adb204c24daaab6cd713dcd4963255cf5575`
  - Nghĩa là: di chuyển không đổi hành vi và không đổi địa chỉ validator. Không ai phải triển
    khai lại.
- Toàn bộ đặc tả (`Specs/`), nguyên văn, chỉ sửa đường dẫn trỏ tới file đã đổi chỗ.

**Chưa di chuyển:** phần off-chain (SDK dựng giao dịch, ví dụ cấu hình, kịch bản triển khai,
test off-chain) vẫn ở `PlatformKit/` trong repo LAMP. Lý do là một ràng buộc kỹ thuật thật:
mã off-chain hiện nhập trực tiếp SDK của Treasury bằng đường dẫn tương đối
(`../../../Treasury/offchain/src/...`), mà SDK đó chưa được đóng gói phát hành. Cắt sang repo
này ngay sẽ làm đứt các nhập đó. Cách xử lý đang được chốt.

Trong lúc chưa chốt, `PlatformKit/` bên LAMP vẫn là nơi chạy được của phần off-chain — đừng tạo
bản sao thứ hai của nó ở đây.
