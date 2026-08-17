# DevStatus — Registry

**Đây là ảnh chụp HIỆN TẠI, ghi đè mỗi đợt việc. Đây là nơi DUY NHẤT phát biểu hiện trạng của repo
này.** Chuyện đã xảy ra ghi ở [`ChangeLog.md`](./ChangeLog.md) — tệp đó cấm phát biểu hiện trạng, tệp
này cấm kể lịch sử.

Cần hiểu Registry thì đọc **hai tệp này trước**. Đừng quét repo, đừng đoán.

Cập nhật cuối: **2026-08-17**.

---

## Trạng thái từng phần

Trạng thái là **tập đóng chín bậc** (`$SYSTEME_HOME/_rules/agent-hygiene.md` §3.3):

`chưa làm` → 🔴 `làm ngoài git (CHƯA track)` → `đang làm (nhánh X)` → `xong local (commit Y)` →
🔴 `đã push chưa PR (nhánh X)` → `có PR (#N)` → `đã merge (commit Z)` → `đã deploy testnet (hash/tx)`
→ `đã deploy mainnet (hash/tx)`

Hai bậc 🔴 là hai chỗ công sức bốc hơi. `làm ngoài git` nặng hơn — git không cứu được.

| Thứ | Trạng thái | Neo | Lệnh kiểm | Chặn cái gì | Cập nhật |
|---|---|---|---|---|---|
| Validator on-chain v2 (`registry.ak`, `registry_beacon.ak`, `platform.ak`, `util.ak`) | `đã merge (commit c63372e)` | PR #8 gộp vào `main` 2026-08-15 | `git log --oneline main -- onchain/` ; `cd onchain && aiken check && aiken build` | Math-Spec, Tech-Spec §1–§5, toàn bộ SDK off-chain | 2026-08-17 |
| Kiểm thử on-chain (`registry_test.ak`, `registry_beacon_test.ak`) | `đã merge (commit c63372e)` | cùng PR | `cd onchain && aiken check` (110 test) | mốc M2, M3 của Exec-Spec | 2026-08-17 |
| SDK off-chain (`offchain/`) | `đã merge (commit c63372e)` | cùng PR | `npm test` ; `npm run typecheck` | mốc M4, M5 | 2026-08-17 |
| `bench/`, `examples/`, `tests/` | `đã merge (commit c63372e)` | cùng PR | `git ls-files bench/ examples/ tests/` (có tệp = đã track) | đo ExUnit, kịch bản E2E | 2026-08-17 |
| `Specs/Math-Spec.md` (đặc tả toán) | `đã merge (commit c63372e)` | cùng PR | `git log --oneline main -- Specs/Math-Spec.md` (**có** dòng = đã vào `main`) | cổng duyệt của cả bốn đặc tả | 2026-08-17 |
| `Specs/{CONTRACT,Tech-Spec,Feat-Spec,Exec-Spec,README}.md` + `onboarding.md` | `đã merge (commit c63372e)` | cùng PR | `git status --short -- Specs/ onboarding.md` (rỗng = không còn sửa treo) | — | 2026-08-17 |
| `Registrations/codes.json` | `đã merge (commit c63372e)`, có sửa tiếp trên nhánh đang chạy | PR #8; sửa tiếp ở `34db63b` (R1 hai mức) và đợt rà 2026-08-17 | `node tools/check-registration.mjs` ; `bash tools/test-check.sh` | hồ sơ đăng ký | 2026-08-17 |
| Quyết định `platform_id` do NGƯỜI đặt hay MÁY sinh | `đã merge (commit 51c5401)` — câu hỏi đã được nhặt lại vào `Math-Spec.md` L1, **chủ nhân chưa chốt** | PR #10, base `main` | `grep -n 'platform_id' Specs/Math-Spec.md \| head` | cửa sổ đóng lúc hồ sơ đầu tiên lên chuỗi | 2026-08-17 |
| Nhánh `feat/chot-bien-nhan-codeowners` | `xong local` — 8 commit, chưa push | `main` ở `51c5401`; nhánh chứa biên nhận PK11, CODEOWNERS, từ điển tài nguyên, E2E bốn chặng, đợt rà nhất quán 2026-08-17 | `git log --oneline main..HEAD` ; `git merge-tree $(git merge-base HEAD main) HEAD main \| grep -c '<<<<<<<'` (0 = không xung đột) | mọi thứ ở trên | 2026-08-17 |
| Triển khai Preview / mainnet | `chưa làm` | — | `find . -iname '*LIVE_DEPLOY*'` (rỗng = chưa deploy) | mốc M5, M6 | 2026-08-17 |
| Duyệt đặc tả | `chưa làm` — **không tệp nào ở `Specs/` được duyệt** | `Specs/*.md` khối siêu dữ liệu | `grep -n 'Người duyệt' Specs/*.md` | theo chuẩn StandardSpec: mọi thứ dựng phía sau đang chạy trước cổng | 2026-08-17 |

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
| **Ba gương off-chain còn TUỲ CHỌN trong khi ràng buộc on-chain là VÔ ĐIỀU KIỆN** — `RegisterParams.registryHash?` và `UpdateOptions.ownRegistryHash?` (`offchain/src/registrationBuilder.ts`), cộng `registryHash?` của `onboard` (`offchain/src/onboard.ts`, chuyển tiếp **có điều kiện** xuống bước đăng ký). Bỏ trống thì R-GOVSELF / S-GOVSELF-vào / U-GOVSELF-ra **không chạy** ở tầng off-chain. Hai đường gọi thật (`scripts/03_register_platform.ts` và `onboard`) đều truyền, nên **hôm nay không hỏng** — nhưng một bên tích hợp thứ ba vẫn dựng được tx mà chain từ chối. | Bỏ dấu `?` là đúng, nhưng nó buộc sửa ~10 chỗ gọi trong test cùng lúc; để riêng một đợt thay vì làm cuối phiên | `command grep -rn 'registryHash?: string\|ownRegistryHash?: string' offchain/src/` (phải trả **3** dòng — chỉ soi `registrationBuilder.ts` là bỏ sót chỗ thứ ba và báo "đã vá" khi mới vá 2/3; sửa xong thì trả 0) |
| Bốn ràng buộc on-chain chưa có gương off-chain nào: `R-VALUE`, `U-SINGLE`, `U-MINT-0`, `M-MINT-0` | ba cái sau là ràng buộc tầng-tx trên nhánh Update/Migrate mà repo chưa có script dựng; `R-VALUE` thì `entryValue` trả đúng nhưng không hàm nào chặn bên gọi nhét token lạ | `command grep -rn 'R-VALUE\|U-SINGLE\|U-MINT-0\|M-MINT-0' offchain/ scripts/ tests/` (rỗng = chưa có gương nào) |
| Khối "⛔ CẢNH BÁO PHIÊN BẢN" của `Specs/Tech-Spec.md` **cũ hơn mã**: nó liệt ràng buộc v2 nhưng thiếu sáu mã mà đợt vá on-chain thêm vào (`R-GOVLIVE`, `R-GOVSELF`, `U-GOV2`, `U-GOVSELF-OUT`, `U-REVIVE`, `U-SHAPE`) | khối cảnh báo được viết trước đợt vá và không cập nhật theo; nguy hơn thân §1–§5 lỗi thời vì nó **tự xưng là bản đã cập nhật** nên người đọc tin nó | `for m in R-GOVLIVE R-GOVSELF U-GOV2 U-GOVSELF-OUT U-REVIVE U-SHAPE; do printf "%s " $m; command grep -c "$m" Specs/Tech-Spec.md; done` (mọi số phải > 0) |
| **Branch protection BẤT KHẢ trên gói hiện tại** ⇒ quyền gộp vào repo vẫn chưa bị ràng bởi thứ gì cưỡng chế được. `CODEOWNERS` **đã có** (`.github/CODEOWNERS`) nhưng GitHub chỉ cưỡng chế nó khi kho public, hoặc khi gói lên Pro/Team/Enterprise — kho này private trên gói **free**. Chuyển sang tổ chức `MagicLampEcosystem` **không** gỡ được: cửa khoá là phép nhân *gói free × kho private*, chuyển chủ sở hữu chỉ đổi vế thứ ba. | Chờ chủ nhân quyết một trong hai: nâng gói, hoặc để kho public. Phải siết TRƯỚC hồ sơ đầu tiên lên chuỗi, không phải sau. Trong lúc chờ, cổng gác thật đang chạy là `.github/workflows/kiem-ho-so.yml` (chấm hồ sơ + bắt `platform_id` trùng + kiểm kiểu), nó chạy được trên gói free | `GH_TOKEN=$TOKEN gh api repos/MagicLampEcosystem/Registry/rulesets` (403 "Upgrade to GitHub Pro…" = còn khoá) |
| **`EV-2` không được xác minh trên chuỗi.** Bộ chấm chỉ khớp một chuỗi 64 hex trong câu con trỏ; nó không hỏi explorer. Một `openssl rand -hex 32` bịa ra vẫn qua. Đã tự thú tại chỗ trong `REGISTRATION-STANDARD.md` §3 | Cần một bước tra explorer trong bộ chấm, hoặc chấp nhận đây là việc của người duyệt vĩnh viễn — chưa quyết | `grep -n 'CO_TX' tools/check-registration-core.mjs` (chỉ dùng cho evidence, không gọi mạng) |
| **Luật ba-thứ chỉ được kiểm ở mức ĐỊNH DẠNG.** Chuẩn §3 nêu `git branch --contains` và `git cat-file -e` như cách kiểm, nhưng máy không chạy lệnh nào trong hai lệnh đó — chỉ khớp regex. SHA bịa đúng hình dạng vẫn qua | Chạy hai lệnh đó cần biết con trỏ thuộc repo nào và có bản sao cục bộ không; chưa có đường | `grep -n 'conTroDuBaThu' -A 8 tools/check-registration-core.mjs` |
| **R2 vế 2 máy không đọc được** — "mục (e) không nêu ai tiếp nhận nếu đội ngừng duy trì" là văn xuôi. Máy nêu vế 1, người duyệt kết. Nên R2 **không** làm CI đỏ | Muốn máy kết thì phải có ô json cho vế 2; `pointers.nguoi_tiep_nhan_khi_ngung` có trong mẫu nhưng không mã nào đòi và không dòng mã nào đọc | `grep -n 'nguoi_tiep_nhan_khi_ngung' tools/*.mjs` (rỗng = chưa ai đọc) |
| **RD-9 chưa có bề mặt thi hành trong Registry** — `Specs/Resource-Dictionary.md` buộc vector phân rã thiếu rơi vào R3, nhưng không mẫu nào có ô để khai vector | Cần thêm khối khai vector vào `Registrations/template.md` + `codes.json`, và phép kiểm tương ứng | `grep -c 'op_type\|op_count\|base_price' Registrations/template.md Registrations/codes.json` (0 = chưa có ô nào) |

---

## Không được xoá

Những định danh dưới đây **nghe như chi tiết nội bộ nhưng là hợp đồng liên bên**. Xoá, đổi thứ tự,
hay đánh số lại một cái là phá bên còn lại — mà **không test nào đỏ và không compile nào gãy**.

> ⚠ Đọc kỹ: tính tới **2026-08-17 chưa có gì được triển khai lên bất kỳ mạng nào** — kiểm bằng
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
