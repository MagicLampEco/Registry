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
| Người chưa biết đây là gì | [`OVERVIEW.md`](OVERVIEW.md) — giới thiệu ngắn: giải vấn đề gì, được gì, và **không** làm gì |
| Đội muốn đưa dịch vụ vào hệ | [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md) — điều kiện, hồ sơ, quy trình bốn bước |
| Đội đã quyết đăng ký, cần làm từng bước | [`Specs/onboarding.md`](Specs/onboarding.md) |
| Người cần hiểu cơ chế đầy đủ | [`Specs/`](Specs/) — CONTRACT (bất biến) · FEAT (hành vi) · TECH (kiến trúc) · EXEC (lộ trình) |
| Người muốn xem ai đã đăng ký | [`Registrations/`](Registrations/) |

## Bản đồ repo

```
OVERVIEW.md                giới thiệu cho người ngoài hệ — đọc trước nếu chưa biết đây là gì
REGISTRATION-STANDARD.md   chuẩn vào hệ — tài liệu bên đăng ký đọc trước
DevStatus.md               hiện trạng ĐO ĐƯỢC (script hash, số test, việc treo) — nơi DUY NHẤT nói hiện trạng
ChangeLog.md               chuyện đã xảy ra, thêm vào đầu, không sửa dòng cũ
Specs/                     đặc tả đầy đủ (CONTRACT · Math · Feat · Tech · Exec · onboarding)
Registrations/             hồ sơ đăng ký từng dịch vụ + mẫu + codes.json (tập đóng các mã khai báo)
onchain/                   hai validator Aiken: registry_beacon (mint) + registry (spend)
offchain/                  SDK dựng giao dịch + bốn van đối soát trước khi route phí
tools/                     bộ chấm hồ sơ đăng ký bằng máy
bench/                     mô phỏng tìm số cho các tham số kinh tế
tests/ examples/ scripts/  kiểm thử, ví dụ cấu hình, kịch bản triển khai
```

**Script hash không chép vào tài liệu này.** Nó đổi theo tham số validator, và mỗi bản chép là
một chỗ để lệch. Số sống ở [`DevStatus.md`](DevStatus.md) kèm lệnh kiểm; nguồn gốc là
`onchain/plutus.json`.

## Hai tầng, không lẫn quyền

- **Registry là sổ chỉ đường.** Nó nói ai tồn tại, trỏ đi đâu, đang ở trạng thái nào. Nó
  **không giữ giá trị** và không chi được tiền của ai.
- **Kho là nơi giữ giá trị.** Mỗi dịch vụ có kho riêng, do cổng quản trị riêng của dịch vụ đó
  gác chi.

Hệ quả cần nhớ: đặt một dịch vụ sang trạng thái tạm dừng hay ngừng hẳn **chỉ ẩn nó khỏi sổ**,
không khoá được dòng tiền ở kho. Chi tiết ở [`Specs/CONTRACT.md`](Specs/CONTRACT.md) bất biến PK10.

## Di chuyển từ repo LAMP (2026-07-29)

Lớp đăng ký này trước đây nằm trong repo [`MagicLampEco/LAMP`](https://github.com/MagicLampEco/LAMP)
dưới tên **PlatformKit**, chung cây với Treasury. Nó tách sang repo riêng vì đúng ranh giới
trách nhiệm: Treasury là **kho** của từng dịch vụ, Registry là **sổ niêm yết** của cả hệ — hai
việc khác nhau, hai vòng đời khác nhau.

**Đợt 1 (2026-07-29) — on-chain và đặc tả.** Hai validator, thư viện dùng chung, bộ test, và toàn
bộ `Specs/`. Lúc đó `aiken build` cho script hash **trùng khít từng bit** với bản ở LAMP: di chuyển
không đổi hành vi, không đổi địa chỉ validator.

**Đợt 2 (2026-08-13) — off-chain, và hash đổi CÓ CHỦ Ý.** Hai việc trong cùng một đợt:

- **Phần off-chain đã sang** — SDK dựng giao dịch, ví dụ cấu hình, kịch bản triển khai, bộ test.
  Ràng buộc từng chặn việc này là mã off-chain nhập thẳng SDK Treasury bằng đường dẫn tương đối
  (`../../../Treasury/offchain/src/...`), mà SDK đó chưa đóng gói phát hành. Gỡ bằng **đảo chiều
  phụ thuộc**: hàm onboard nhận hàm dựng kho từ bên gọi, mọi kiểu mượn của Treasury khai lại tại
  chỗ. Repo này nay typecheck và test xanh **mà không cần repo LAMP có mặt trên đĩa** — có một ca
  kiểm khoá đúng tính chất đó (`tests/noExternalImports.test.ts`).
- **Script hash đổi** vì validator đổi tham số và lược đồ datum (khép issue #3 và #6: ép hồ sơ nằm
  đúng địa chỉ registry, thêm đường di trú, tách quyền gỡ-mềm và gỡ-cứng). Đổi được **miễn phí vì
  chưa triển khai gì lên bất kỳ mạng nào** — sau giao dịch đầu tiên trên preview thì mỗi lần đổi là
  di trú toàn sổ. Hash cũ và mới ghi ở [`ChangeLog.md`](ChangeLog.md).

`PlatformKit/` bên LAMP nay là bản **thừa**, và hai bản sẽ trôi khác nhau nếu để nguyên. Registry
đã gửi thư đề nghị LAMP gỡ phần đã chuyển và trỏ về repo này.
