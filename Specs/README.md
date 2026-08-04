# Specs — đặc tả sống của Registry

Bốn tài liệu đặc tả gốc của lớp onboarding (tên cũ là **PlatformKit**, nay là nội dung của
repo Registry), giữ nguyên văn khi di chuyển từ repo LAMP sang đây ngày 2026-07-29:

| File | Trả lời câu hỏi |
|---|---|
| [CONTRACT.md](CONTRACT.md) | Interface khoá + 11 bất biến `PK1…PK11`. Cái gì KHÔNG ai được đổi. |
| [FEAT.md](FEAT.md) | Hành vi: ba cửa onboarding, adapter thu phí, discover, vòng đời niêm yết. |
| [TECH.md](TECH.md) | Kiến trúc on-chain (2 validator) + off-chain SDK + known-gap. |
| [EXEC.md](EXEC.md) | Lộ trình bootstrap M0…M6, trạng thái thật, rủi ro vận hành. |
| [ONBOARDING.md](ONBOARDING.md) | Hướng dẫn từng bước cho team muốn onboard (a→f). |

Chuẩn dành cho bên đăng ký nằm ở [../REGISTRATION-STANDARD.md](../REGISTRATION-STANDARD.md) —
đó là tài liệu một platform đọc TRƯỚC khi nộp hồ sơ; bốn file trên là đặc tả đầy đủ của cơ chế.

---

## Quy ước đường dẫn trong bốn file trên

Bốn file này viết khi Registry còn nằm trong repo LAMP, nên đường dẫn tương đối trong đó
đọc theo quy ước sau — **chỉ ghi ở đây một lần**, không sửa rải rác vào từng file:

| Dạng đường dẫn | Trỏ tới |
|---|---|
| `onchain/...` | Trong repo này — đã di chuyển sang, script hash không đổi. |
| `Treasury/...`, `Governance/...`, `Genesis/...` | Repo [`MagicLampNetwork/LAMP`](https://github.com/MagicLampNetwork/LAMP), tính từ gốc repo đó. |
| `offchain/...`, `examples/...`, `scripts/...`, `tests/...` | **Chưa di chuyển** — vẫn ở `PlatformKit/` trong repo LAMP (xem `../README.md` §Di chuyển để biết vì sao). |

## Con số test trong bốn file trên

`EXEC.md` ghi các con số đo khi Registry còn nằm chung cây với Treasury (`aiken check` 137 pass
toàn cây, `vitest` 86 pass cho off-chain). Trong repo này, phạm vi đo hẹp lại đúng phần Registry:
**`aiken check` 30/30 pass**. Off-chain chưa di chuyển nên con số 86 vẫn thuộc về cây LAMP.

## Cái gì đã sang, cái gì chưa

- **Đã sang, verify bằng thực thi:** toàn bộ on-chain (2 validator + lib + 30 test). `aiken check`
  30/30 pass và `aiken build` cho script hash **trùng khít** bản cũ trong LAMP — di chuyển không
  đổi hành vi, không đổi địa chỉ validator.
- **Chưa sang:** off-chain SDK, examples, scripts deploy, tests off-chain. Lý do kỹ thuật ghi ở
  `../README.md` §Di chuyển.
