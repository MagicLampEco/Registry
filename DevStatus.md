# DevStatus — Registry

**Đây là ảnh chụp HIỆN TẠI, ghi đè mỗi đợt việc. Đây là nơi DUY NHẤT phát biểu hiện trạng của repo
này.** Chuyện đã xảy ra ghi ở [`ChangeLog.md`](./ChangeLog.md) — tệp đó cấm phát biểu hiện trạng, tệp
này cấm kể lịch sử.

Cần hiểu Registry thì đọc **hai tệp này trước**. Đừng quét repo, đừng đoán.

Cập nhật cuối: **2026-08-13**.

---

## Trạng thái từng phần

Trạng thái là **tập đóng chín bậc** (`$SYSTEME_HOME/_rules/agent-hygiene.md` §3.3):

`chưa làm` → 🔴 `làm ngoài git (CHƯA track)` → `đang làm (nhánh X)` → `xong local (commit Y)` →
🔴 `đã push chưa PR (nhánh X)` → `có PR (#N)` → `đã merge (commit Z)` → `đã deploy testnet (hash/tx)`
→ `đã deploy mainnet (hash/tx)`

Hai bậc 🔴 là hai chỗ công sức bốc hơi. `làm ngoài git` nặng hơn — git không cứu được.

| Thứ | Trạng thái | Neo | Lệnh kiểm | Chặn cái gì | Cập nhật |
|---|---|---|---|---|---|
| Validator on-chain v2 (`registry.ak`, `registry_beacon.ak`, `platform.ak`, `util.ak`) | `đang làm (nhánh feat/khep-issue-3-4-5-6-7)` — sửa nhưng CHƯA commit | nhánh `feat/khep-issue-3-4-5-6-7` | `git status --short -- onchain/` ; `cd onchain && aiken check && aiken build` | Math-Spec, Tech-Spec §1–§5, toàn bộ SDK off-chain | 2026-08-13 |
| Kiểm thử on-chain (`registry_test.ak`, `registry_beacon_test.ak`) | `đang làm (nhánh feat/khep-issue-3-4-5-6-7)` — CHƯA commit | cùng nhánh | `cd onchain && aiken check` | mốc M2, M3 của Exec-Spec | 2026-08-13 |
| SDK off-chain (`offchain/`) | 🔴 `làm ngoài git (CHƯA track)` | thư mục `offchain/` trong cây làm việc | `git status --short -- offchain/` ; `cd offchain && npm test` | mốc M4, M5 | 2026-08-13 |
| `bench/`, `examples/`, `tests/` | 🔴 `làm ngoài git (CHƯA track)` | các thư mục cùng tên | `git status --short -- bench/ examples/ tests/` | đo ExUnit, kịch bản E2E | 2026-08-13 |
| `Specs/Math-Spec.md` (đặc tả toán, mới) | 🔴 `làm ngoài git (CHƯA track)` | `Specs/Math-Spec.md` | `git log --all --oneline -- Specs/Math-Spec.md` (rỗng = chưa vào git) | cổng duyệt của cả bốn đặc tả | 2026-08-13 |
| `Specs/{CONTRACT,Tech-Spec,Feat-Spec,Exec-Spec,README}.md` + `onboarding.md` | `đang làm (nhánh feat/khep-issue-3-4-5-6-7)` — sửa/đổi tên, CHƯA commit | cùng nhánh | `git status --short -- Specs/` | — | 2026-08-13 |
| `Registrations/codes.json` | 🔴 `làm ngoài git (CHƯA track)` | `Registrations/codes.json` | `git status --short -- Registrations/` | hồ sơ đăng ký | 2026-08-13 |
| Nhánh `feat/khep-issue-3-4-5-6-7` | `đang làm` — chưa có upstream, chưa push, chưa PR | — | `git branch -vv \| grep khep-issue` (không có `[origin/...]` = chưa push) | mọi thứ ở trên | 2026-08-13 |
| Triển khai Preview / mainnet | `chưa làm` | — | `find . -iname '*LIVE_DEPLOY*'` (rỗng = chưa deploy) | mốc M5, M6 | 2026-08-13 |
| Duyệt đặc tả | `chưa làm` — **không tệp nào ở `Specs/` được duyệt** | `Specs/*.md` khối siêu dữ liệu | `grep -n 'Người duyệt' Specs/*.md` | theo chuẩn StandardSpec: mọi thứ dựng phía sau đang chạy trước cổng | 2026-08-13 |

**Không chép số kiểm thử vào tệp này.** Cột *Lệnh kiểm* là để người sau chạy một cái là biết. Số cũ
đã đo (`137 pass` cây Treasury, `86 pass` off-chain, `30/30` cây này) đều đo **trước** đợt sửa v2 và
**không còn đối chiếu được** — đã hạ khỏi `Specs/Exec-Spec.md` ngày 2026-08-13.

---

## Việc còn treo, biết mà chưa làm

| Việc | Vì sao chưa | Lệnh kiểm |
|---|---|---|
| `Specs/Tech-Spec.md` §1–§5 vẫn mô tả lược đồ v1 (9 trường, tham số cũ, chưa có `MigrateEntry`) | đợt này chỉ dán cảnh báo phiên bản + bảng đổi; chép v2 vào thân là việc riêng | `grep -n 'CẢNH BÁO PHIÊN BẢN' Specs/Tech-Spec.md` |
| Chưa có chứng minh cơ giới hoá (Coq/Lean) | mức bảo đảm hiện tại chỉ là đọc mã + kiểm thử đơn vị | `Specs/Math-Spec.md` §14 L6 |
| Chưa audit ngoài | bắt buộc trước mainnet | `Specs/Math-Spec.md` §14 L7 |
| `registry_authority` chưa chốt ngưỡng multisig | chưa có committee thật | `Specs/Math-Spec.md` §14 L2 |
| Chưa đo kích thước script và ExUnit | chưa đặt ngưỡng | `Specs/Tech-Spec.md` §22.F bảng chỉ tiêu |
| **Hai gương off-chain còn TUỲ CHỌN trong khi ràng buộc on-chain là VÔ ĐIỀU KIỆN** — `RegisterParams.registryHash?` và `UpdateOptions.ownRegistryHash?`. Bỏ trống thì R-GOVSELF / S-GOVSELF-vào / U-GOVSELF-ra **không chạy** ở tầng off-chain. Hai đường gọi thật (`scripts/03_register_platform.ts` và `onboard`) đều truyền, nên **hôm nay không hỏng** — nhưng một bên tích hợp thứ ba vẫn dựng được tx mà chain từ chối. | Bỏ dấu `?` là đúng, nhưng nó buộc sửa ~10 chỗ gọi trong test cùng lúc; để riêng một đợt thay vì làm cuối phiên | `grep -n 'registryHash?: string\|ownRegistryHash?: string' offchain/src/registrationBuilder.ts` (phải trả 2 dòng; sửa xong thì trả 0) |
| Bốn ràng buộc on-chain chưa có gương off-chain nào: `R-VALUE`, `U-SINGLE`, `U-MINT-0`, `M-MINT-0` | ba cái sau là ràng buộc tầng-tx trên nhánh Update/Migrate mà repo chưa có script dựng; `R-VALUE` thì `entryValue` trả đúng nhưng không hàm nào chặn bên gọi nhét token lạ | `grep -rn 'R-VALUE\|U-SINGLE\|U-MINT-0\|M-MINT-0' offchain/ scripts/ tests/` |

---

## Không được xoá

Những định danh dưới đây **nghe như chi tiết nội bộ nhưng là hợp đồng liên bên**. Xoá, đổi thứ tự,
hay đánh số lại một cái là phá bên còn lại — mà **không test nào đỏ và không compile nào gãy**.

> ⚠ Đọc kỹ: tính tới **2026-08-13 chưa có gì được triển khai lên bất kỳ mạng nào** — kiểm bằng
> `find . -iname '*LIVE_DEPLOY*'` (rỗng). Vì vậy đổi script hash lúc này còn **miễn phí**. Danh sách
> này là thứ **sẽ đóng băng ngay khi hồ sơ đầu tiên lên chuỗi**, và là thứ đã đóng băng **giữa
> on-chain và off-chain** ngay từ bây giờ.

### Chỉ số constructor Plutus Data — đóng băng theo vị trí

| Kiểu | Constructor | Chỉ số | Không được |
|---|---|---|---|
| `PlatformStatus` | `Active` | 0 | đổi số, chèn nhánh mới vào giữa |
| `PlatformStatus` | `Paused` | 1 | như trên |
| `PlatformStatus` | `Retired` | 2 | **xoá** — xem "Retired còn sống" dưới đây |
| `RegistryRedeemer` | `UpdateEntry` | 0 | đổi số |
| `RegistryRedeemer` | `MigrateEntry { new_registry_hash, new_spec_version }` | 1 | đổi số, đổi thứ tự hai trường |
| `RegistryBeaconRedeemer` | `RegisterPlatform` | 0 | đổi số |

Nguồn: `onchain/lib/magiclamp/registry/platform.ak`. Kiểm bằng
`grep -n 'pub type PlatformStatus' -A6 onchain/lib/magiclamp/registry/platform.ak`.

### Thứ tự trường `PlatformEntry` — đóng băng theo vị trí

`spec_version, platform_id, instance_id, custody_hash, seed_policy, beacon_policy, governance_ref,
accepted_assets, cut_bps, created_epoch, status`

Plutus Data mã hoá **theo vị trí**, không theo tên. Trường mới **chỉ được nối vào cuối**, và chỉ kèm
tăng `spec_version` cộng một đường di trú. Chèn giữa = mọi bên đang giải mã hỏng im lặng.
Kiểm: `grep -n 'pub type PlatformEntry' -A14 onchain/lib/magiclamp/registry/platform.ak`.

### Tên asset

| Tên asset | Là gì | Không được |
|---|---|---|
| `platform_id` | tên asset của beacon NFT dưới policy `registry_beacon` | tái cấp cho platform khác — beacon không đốt được (PK5), nên một `platform_id` đã cấp là cấp vĩnh viễn |
| `instance_id` | tên asset của NFT xác thực kho (thuộc Treasury) | đổi — nó nằm trong bộ sáu trường định danh bất biến |

### `Retired` nghe như chết nhưng còn sống

Ba điều dễ hiểu nhầm, và cả ba đều dẫn tới quyết định sai:

1. **`Retired` không đóng quỹ.** Nó chỉ ẩn hồ sơ khỏi sổ mặc định. Kho vẫn thu và chi bình thường
   qua cổng quản trị riêng của nó. Ai nói "Retired = quỹ đóng" là sai. (PK10 / `Math-Spec.md` §7.)
2. **Beacon NFT của hồ sơ `Retired` vẫn tồn tại vĩnh viễn.** Không có đường đốt. Đó là chủ ý: dấu vết
   kiểm toán không đứt, và `platform_id` không bị tái cấp.
3. **Hồ sơ `Retired` vẫn phải di trú được.** Từ v2, `MigrateEntry` **cố ý không** ép `U-TERMINAL` —
   nếu ép thì xoay quyền đăng ký sẽ làm mọi hồ sơ `Retired` kẹt vĩnh viễn. Ai "dọn dẹp" bằng cách
   thêm lại ràng buộc đó vào nhánh di trú là mở lại đúng cái lỗ v2 vừa vá.
   Kiểm: `grep -n 'KHÔNG ép U-TERMINAL' onchain/validators/registry.ak`.

### Hai sổ khác nhau — đừng gộp

- Sổ trong repo này niêm yết **platform**.
- Mint-Authority Registry (`LAMP/Genesis/onchain/lib/magiclamp/genesis/registry.ak`) gác **quyền phát
  hành token** dưới policy LAMP.

Trùng chữ "registry", khác hẳn việc. Gộp hai thứ này là lẫn quyền.
