# Registry — Exec-Spec: lộ trình bootstrap & mốc

| Trường | Giá trị |
|---|---|
| Phiên bản | v1.0.1 |
| Trạng thái | `DRAFT` |
| Tầng phạm vi | `L1` (hạ tầng / nền tảng) |
| Pha hiện tại | M0–M4 đã có mã; **chưa mốc nào có bằng chứng kiểm chứng lại được** (xem §9) |
| Người viết | LAMP agent 2026-06-15; Registry agent cập nhật 2026-08-13 |
| Người duyệt | **chưa ai duyệt** |
| Cập nhật cuối | 2026-08-13 |
| Bộ trạng thái | StandardSpec — `DRAFT / IN-REVIEW / REVISE / APPROVED / CONDITIONALLY-APPROVED / LOCKED / SUPERSEDED / ARCHIVED / ABANDONED` (`TigerAgent/StandardSpec/_shared/overview/SPEC-OVERVIEW.md` Sơ đồ 4) |

> **Tên cũ của lớp này là "PlatformKit"** (khi nó còn sống trong repo LAMP). Tên hiện hành: **Registry**.

Bám [`CONTRACT.md`](./CONTRACT.md) (khung interface
khóa) — KHÔNG mâu thuẫn. EXEC KHÔNG định nghĩa lại datum/bất biến (việc của [TECH](./Tech-Spec.md)) — chỉ
định **thứ tự deploy, onboard, tích hợp, checklist, DoD, known-gap**.

Nguồn chuẩn đọc trước: [`CONTRACT.md`](./CONTRACT.md) (platform = instance Treasury + entry Registry;
ba cửa onboard; PK1–PK11), [`Treasury/EXEC.md`](https://github.com/MagicLampEco/LAMP/blob/main/Treasury/EXEC.md) (mẫu lộ trình M0…M7 + custody_seed
§16 + hardening v1 §17), [`onchain/validators/{registry_beacon,registry}.ak`] (đã sống).

---

## 0. Mục tiêu & phạm vi

### 0.1 Mục tiêu
Đưa Registry từ **registry on-chain đã viết** (`registry_beacon.ak` + `registry.ak` + `platform.ak`)
tới **bootstrap chạy thật**: deploy registry (param authority) → onboard **PhoenixKey + OriLife** (config
+ seed + register) → tích hợp **collect ở lớp touchable** (PhoenixKey Frontend/SDK; OriLife mobile/SDK).
Bám cách Treasury/Distribution đã làm (deploy theo bước, mỗi bước ghi output bước sau dùng).

### 0.2 Thuộc EXEC
- Thứ tự deploy `registry_beacon` + `registry` (param `registry_authority`, phá vòng self-ref).
- Onboard PhoenixKey + OriLife: config tham số → seed custody (cửa 1) → register (cửa 2).
- Tích hợp collect (cửa 3) ở lớp touchable (KHÔNG đụng backend).
- Checklist onboard + DoD (bằng chứng) + rủi ro + known-gap.

### 0.3 KHÔNG thuộc EXEC
- Datum/redeemer/bất biến validator: [TECH](./Tech-Spec.md).
- Custody/collect/release internals + deploy custody: [`Treasury/EXEC.md`](https://github.com/MagicLampEco/LAMP/blob/main/Treasury/EXEC.md).
- Định giá/oracle: app-side (OriLife `animal_fee`, PhoenixKey phí DID).
- Sửa **backend Java PhoenixKey** (`PhoenixKeyDID/Database`) hoặc **backend OriLife** — NGOÀI ranh giới
  (xem §5).

---

## 1. Trạng thái thật hiện tại (bám sự thật, không trí nhớ)
- Registry on-chain **đã viết + đã có vá an ninh** cùng cây Treasury: `onchain/lib/magiclamp/registry/platform.ak`
  + `validators/registry_beacon.ak` (thêm **R-BIND** ref-input custody + **R-MINT-2** least-authority, F5)
  + `validators/registry.ak` (thêm **U-TERMINAL** Retired terminal). **`aiken check`: CHƯA KIỂM CHỨNG ĐƯỢC tại thời điểm viết** (số cũ đo 2026-07-29 ở cây Treasury, không còn đối chiếu được với cây này sau đợt sửa v2) — kiểm bằng `cd onchain && aiken check`
  (toàn cây); chưa deploy testnet.
- Treasury custody/collect/seed: đã viết, hardening v1 áp (`Treasury/EXEC.md §16/§17`); chưa deploy.
- Governance: **chưa thật** → `registry_authority` + `governance_ref` bootstrap bằng **committee multisig**
  (known-gap §6; audit #4 — KHÔNG key đơn).
- Off-chain SDK Registry (`onboard/registrationBuilder/collectAdapter/registryQuery`): **đã viết; số kiểm thử CHƯA KIỂM CHỨNG ĐƯỢC tại thời điểm viết** — kiểm bằng `cd offchain && npm test` (gồm gương R-BIND `verifyCustodyBinding`/`verifyEntryAgainstCustody`, U-TERMINAL
  `UPD-TERMINAL`, dedup `findDuplicatePlatformIds`, `foreignScript`). **Chưa deploy/E2E Preview** (M5).

> Vì chưa deploy gì → đổi param `registry_authority` ⇒ đổi script hash registry KHÔNG cần migrate (lý do
> chốt param authority cho đúng NGAY bây giờ — như Treasury hardening v1).

---

## 2. Lộ trình bootstrap theo mốc (M0…M6)

| Mốc | Nội dung | Phụ thuộc | DoD (bằng chứng) |
|---|---|---|---|
| **M0** | `aiken build` + `aiken check` xác nhận `registry_beacon` + `registry` + `platform.ak` compile cùng cây Treasury; import `util` (count_*_at_script, output_with_token, is_vk). | Treasury onchain build xanh | `aiken build` xanh; `plutus.json` ra 2 validator; **`aiken check`: CHƯA KIỂM CHỨNG ĐƯỢC tại thời điểm viết** (số cũ đo 2026-07-29 ở cây Treasury, không còn đối chiếu được với cây này sau đợt sửa v2) — kiểm bằng `cd onchain && aiken check` (toàn cây Treasury + Registry); unit `entry_well_formed`/`identity_preserved`/`mutable_fields_valid` round-trip. |
| **M1** | **Datum + redeemer test** (TECH §2): encode/decode `PlatformEntry` (9 field, Constr order) + `PlatformStatus` (0/1/2) round-trip Aiken↔off-chain. Invariant: entry register-status==Active. | M0 | datum round-trip pass; **register status≠Active → reject** (R-WF); **platform_id≠NFT name → reject** (R-NAME). |
| **M2** | **`registry_beacon` (mint) test** (TECH §3): R-SIG/R-MINT-1/**R-MINT-2**/R-OUT-1/R-WF/R-NAME/**R-BIND** + BURN cấm. | M1 | unit: happy register pass; **không-authority-ký → reject** (R-SIG); **mint 2 token / qty>1 → reject** (R-MINT-1); **mint thêm policy ngoài → reject** (R-MINT-2, F5); **output ví thường (is_vk) → reject** (R-OUT-1); **entry malformed → reject** (R-WF); **burn beacon → reject** (else fail); **thiếu ref-input custody / custody NFT≠1 / custody ở Script khác custody_hash → reject** (R-BIND). |
| **M3** | **`registry` (spend) test** (TECH §4): U-SIG/U-SINGLE/U-NFT/U-ID/U-MUT/U-MINT-0/**U-TERMINAL**. | M1 | unit: happy update (đổi status / mutable) pass; **không-authority → reject** (U-SIG); **đổi identity (custody_hash…) → reject** (U-ID); **2 entry input (double-sat khác stake-cred) → reject** (U-SINGLE); **mint/burn trong update → reject** (U-MINT-0); **mutable hạ governance_ref="" → reject** (U-MUT); **mất beacon NFT out → reject** (U-NFT); **spend entry status=Retired (Retired→Active / Retired→Retired) → reject** (U-TERMINAL). |
| **M4** | **Off-chain SDK** (TECH §6): `onboard/registrationBuilder/collectAdapter/registryQuery`. `decodePlatformEntry` khớp Aiken (9 field). Tái dùng config/lucid Treasury. | M1–M3 | **vitest: CHƯA KIỂM CHỨNG ĐƯỢC tại thời điểm viết** — kiểm bằng `cd offchain && npm test` (offchain Registry): datum decode khớp Aiken; `planRegister`/`planUpdateEntry` dry-run hợp lệ + reject path (`REG-BIND` thiếu/sai custody, `UPD-TERMINAL` Retired); `discoverPlatforms` quét policy giả-lập trả entry + đánh dấu `duplicate`/`foreignScript`; `verifyEntryAgainstCustody` đối soát custody. |
| **M5** | **E2E Preview** (harness kiểu Treasury): `01_deploy_registry` (param authority, self-ref chiều beacon→registry) → `02_onboard` PhoenixKey + OriLife (seed custody cửa 1 + register cửa 2) → `03_collect` (gộp lô cửa 3) → `04_update_status` (pause/resume/retire) → verify on-chain (tx hash + explorer). | M4, **Treasury custody/seed deploy Preview** (`Treasury/EXEC.md M6`) | record `LIVE_DEPLOY_PREVIEW.md` riêng Registry với tx hash thật; discover quét policy ra đúng 2 platform Active. |
| **M6** | **Tích hợp collect lớp touchable** (§5): PhoenixKey Frontend/SDK + OriLife mobile/SDK. KHÔNG đụng backend. | M5 | e2e: sự kiện app → CollectItem → settlement tx → custody tăng + receipt; **không touch backend Java / backend OriLife** (diff chỉ Frontend/SDK/mobile). |

### 2.1 Chi tiết từng mốc — mười thành phần bắt buộc

Bảng §2 ở trên chỉ có **bốn** thành phần (Mốc, Nội dung = *Task*, Phụ thuộc = *Depends on*, DoD =
*Acceptance*). Chuẩn Exec-Spec đòi **mười**
(`TigerAgent/StandardSpec/_shared/standards/Exec-Spec.standard.md` §3.4). Sáu thành phần còn thiếu —
**Output, Test (tách khỏi Acceptance), Evidence, Tech + Libs, Docs, Skill + Provides** — bổ sung dưới
đây. Bảng §2 giữ nguyên làm bản tóm tắt.

Trạng thái mốc dùng bộ đóng của chuẩn: `not_started` / `blocked-by-<X>` / `ready` / `in_progress` /
`complete` / `pivoted`. **Không có cột ngày** — mốc sẵn sàng khi phụ thuộc xong, không theo lịch.

---

**M0 — Biên dịch hai validator**  ·  trạng thái `in_progress`

- **Output:** `onchain/plutus.json` chứa đúng hai validator `registry` và `registry_beacon`, mỗi cái
  có trường `hash`.
- **Test:** `aiken check` không có ca đỏ; `aiken build` thoát mã 0.
- **Acceptance:** hai điều trên xanh **và** script hash được ghi lại trước/sau mỗi lần đụng validator.
- **Evidence:** output thô của `aiken check` và `aiken build`; hai script hash dán vào
  [`../ChangeLog.md`](../ChangeLog.md) khi chúng đổi.
- **Tech:** Aiken. **Libs:** `aiken-lang/stdlib` (ghim phiên bản trong `onchain/aiken.toml`).
- **Docs:** [`Tech-Spec.md`](./Tech-Spec.md) §1–§5, [`Math-Spec.md`](./Math-Spec.md) §5.
- **Skill:** kỹ sư Aiken/Plutus, hiểu mô hình eUTxO. **Provides:** script hash cho M5 bước 01.

**M1 — Vòng khứ hồi datum + redeemer**  ·  trạng thái `in_progress`

- **Output:** bộ kiểm thử vòng khứ hồi `PlatformEntry` ↔ Plutus Data, chạy được ở **cả hai** bên
  (Aiken và off-chain).
- **Test:** mã hoá rồi giải mã ra đúng giá trị ban đầu, với **mọi** trường và **mọi** nhánh
  `PlatformStatus` (0/1/2); đăng ký với `status ≠ Active` bị từ chối (R-WF); `platform_id ≠` tên NFT
  bị từ chối (R-NAME).
- **Acceptance:** thứ tự trường ở off-chain khớp **đúng** thứ tự khai báo trong `platform.ak` — kiểm
  bằng một ca so byte, không bằng mắt.
- **Evidence:** output thô của bộ kiểm thử hai bên.
- **Tech:** Aiken + TypeScript. **Libs:** `aiken-lang/stdlib`, thư viện CBOR của `lucid`.
- **Docs:** [`Tech-Spec.md`](./Tech-Spec.md) §2 (kèm cảnh báo phiên bản), [`Math-Spec.md`](./Math-Spec.md) §3 A-DATA.
- **Skill:** người hiểu mã hoá Plutus Data theo vị trí. **Provides:** lược đồ chung cho M2, M3, M4.

**M2 — Cổng đúc `registry_beacon`**  ·  trạng thái `in_progress`

- **Output:** `registry_beacon.ak` cùng bộ kiểm thử phủ đủ mười một ràng buộc R-*.
- **Test:** mỗi ràng buộc một ca **từ chối** riêng: R-SIG, R-MINT-1, R-MINT-2, R-OUT-1 (gồm ca **đặt
  hồ sơ ở script lạ** — ca đã từng lọt ở v1), R-NAME, R-POLICY, R-VER, R-WF, R-VALUE, R-EPOCH,
  R-BIND; cộng một ca đốt beacon → từ chối.
- **Acceptance:** mọi dòng trong bảng kẻ tấn công [`Math-Spec.md`](./Math-Spec.md) §8 ghi "chặn" đều
  có ít nhất một ca kiểm thử tương ứng.
- **Evidence:** output thô liệt kê tên từng ca.
- **Tech:** Aiken. **Libs:** `aiken-lang/stdlib`.
- **Docs:** [`Math-Spec.md`](./Math-Spec.md) §5.1 và §8. **Skill:** kỹ sư Aiken + tư duy đối kháng.
- **Provides:** cổng đăng ký dùng được cho M4 và M5.

**M3 — Validator chi tiêu `registry`**  ·  trạng thái `in_progress`

- **Output:** `registry.ak` với **hai** nhánh redeemer (`UpdateEntry`, `MigrateEntry`) cùng bộ kiểm thử.
- **Test:** ca từ chối cho U-SIG, U-SINGLE, U-NFT, U-ID (sáu trường), U-VER, U-MUT, U-MINT-0,
  U-TERMINAL, U-VALUE, U-GOV; ca từ chối cho M-SIG, M-GOV, M-DEST, M-STATUS, M-VER, M-ID, M-NFT,
  M-VALUE, M-MINT-0; và hai ca **chấp nhận** quan trọng: `Active → Paused` chỉ với chữ ký authority,
  và **di trú một hồ sơ `Retired`** (chính lỗ mà v2 vá).
- **Acceptance:** không ca nào cũ bị xoá để cho xanh; ca hỏng vì đổi lược đồ thì **sửa**, không xoá.
- **Evidence:** output thô + `git diff --stat` cho thấy số ca không giảm.
- **Tech:** Aiken. **Libs:** `aiken-lang/stdlib`.
- **Docs:** [`Math-Spec.md`](./Math-Spec.md) §5.2, §5.3, §7 T-CONSENT.
- **Skill:** kỹ sư Aiken. **Provides:** đường cập nhật và đường di trú cho M4, M5.

**M4 — SDK off-chain**  ·  trạng thái `in_progress`

- **Output:** gói TypeScript trong `offchain/` với bốn khối `onboard`, `registrationBuilder`,
  `collectAdapter`, `registryQuery`.
- **Test:** giải mã datum khớp Aiken; `planRegister` / `planUpdateEntry` dựng được giao dịch hợp lệ
  và **từ chối** đúng chỗ (`REG-BIND`, `UPD-TERMINAL`); `discoverPlatforms` đánh dấu `duplicate` và
  `foreignScript`; `verifyEntryAgainstCustody` bắt được entry lệch kho.
- **Acceptance:** **ba van** ở [`Math-Spec.md`](./Math-Spec.md) §6.2 đều gọi được và đều có ca kiểm
  thử; tài liệu SDK nói rõ bỏ van là tự chịu.
- **Evidence:** output thô của bộ kiểm thử.
- **Tech:** TypeScript, Node. **Libs:** `lucid` (ghim phiên bản), `vitest`.
- **Docs:** [`Tech-Spec.md`](./Tech-Spec.md) §6, [`Feat-Spec.md`](./Feat-Spec.md) §3.
- **Skill:** kỹ sư TypeScript có kinh nghiệm dựng giao dịch Cardano.
- **Provides:** công cụ chạy M5.

**M5 — Chạy thật trên Preview**  ·  trạng thái `blocked-by-M4` *(và chờ Treasury deploy Preview)*

- **Output:** một tệp `LIVE_DEPLOY_PREVIEW.md` của Registry, mang **tx hash thật**.
- **Test:** bốn kịch bản chạy trên mạng Preview — triển khai, onboard hai platform, thu gộp lô, đổi
  trạng thái (tạm dừng / mở lại / ngừng hẳn).
- **Acceptance:** quét policy trả về **đúng hai** platform `Active`, và mỗi tx tra được trên explorer.
- **Evidence:** tx hash + đường dẫn explorer cho từng bước.
- **Tech:** TypeScript + mạng Preview. **Libs:** `lucid`, nhà cung cấp chỉ mục (Blockfrost hoặc Kupo).
- **Docs:** §3 và §4 của tài liệu này. **Skill:** người vận hành có khoá Preview.
- **Provides:** bằng chứng cho M6 và cho quyết định lên mainnet.

**M6 — Nối thu phí ở lớp chạm được**  ·  trạng thái `blocked-by-M5`

- **Output:** hai bản tích hợp — PhoenixKey (Frontend/SDK) và OriLife (mobile/SDK).
- **Test:** một sự kiện app đi hết đường tới giao dịch thanh toán và kho tăng đúng số.
- **Acceptance:** **diff KHÔNG chạm** backend Java của PhoenixKey và backend OriLife.
- **Evidence:** `git diff --stat` của cả hai repo, cho thấy phạm vi chạm.
- **Tech:** TypeScript / Flutter. **Libs:** SDK Registry (M4).
- **Docs:** §5 của tài liệu này. **Skill:** kỹ sư của chính đội sở hữu từng app.
- **Provides:** dòng thu thật — mốc cuối của lộ trình bootstrap.

> **Tỉ lệ song song.** M0 và M1 độc lập; M2, M3 cùng phụ thuộc M1 và chạy song song được; M4 phụ
> thuộc M1–M3; M5 phụ thuộc M4; M6 phụ thuộc M5. Chuỗi cuối (M4→M5→M6) là **đường găng**, và nó tuần
> tự thật — không cắt ngắn được, vì mỗi bước cần đầu ra thật của bước trước.

---

## 3. Deploy registry (M5 bước 01) — phá vòng self-ref

Thứ tự deploy (một chiều, không vòng — TECH §5):

1. **Chốt `registry_authority`** — v1 = committee multisig pubkey hash (known-gap §6). Đặt vào `.env`
   Registry (`REGISTRY_AUTHORITY`).
2. **Compile `registry_beacon(registry_authority)`** → `beacon_policy = hash`. Ghi `BEACON_POLICY` `.env`.
3. **Compile `registry(registry_authority, beacon_policy)`** → `registry_hash`. Ghi `REGISTRY_HASH` `.env`.
4. Không có UTxO trung tâm phải khởi tạo — registry **không cần seed** (khác custody). Platform đầu tiên
   register là đã sống. Đây là lợi no-contention: deploy registry = chỉ compile + công bố policy/hash.

---

## 4. Onboard PhoenixKey + OriLife (M5 bước 02)

Mỗi platform: **config → seed custody (cửa 1) → register (cửa 2)**. Hai platform **độc lập** (no
contention — register A không đụng B).

### 4.1 Config tham số (per-platform)

| Field | PhoenixKey | OriLife | Ghi chú |
|---|---|---|---|
| `platform_id` | `"phoenixkey"` | `"orilife"` | duy nhất (authority không ký trùng) |
| `accepted_assets` | `[LAMP, ADA]` | `[LAMP, ADA]` | per-platform |
| `cut_bps` | DAO định | DAO định | trùng custody datum |
| `governance_ref` | DAO PhoenixKey | DAO OriLife | **RIÊNG — khuyến nghị** (PK6; #1B đã đóng) |

> ✅ **#1B ĐÓNG (vá lần 2 F10) — PK6 nay là KHUYẾN NGHỊ tách quyền, không bắt buộc bởi replay.**
> `governance_ref` riêng PhoenixKey/OriLife vẫn nên giữ (tách quyền release → blast-radius nhỏ), nhưng
> dùng chung KHÔNG còn gây replay chéo (Treasury `spend_spec_hash` gồm `instance_id`). Authority vẫn kiểm
> để tách quyền (kỷ luật onboard — TECH GAP-6 hết là gap an toàn). ⛔ Governance build-side PHẢI commit
> đúng `instance_id` khi tạo proposal.

### 4.2 Cửa 1 — seed custody (tái dùng Treasury)
Chạy `custody_seed` (Treasury) cho mỗi platform → `instance_id/custody_hash/seed_policy` + custody UTxO
base-case đúng (seed guards Treasury §16). Ghi ba output vào config platform.

### 4.3 Cửa 2 — register
Authority ký `planRegister(params)` cho mỗi platform: mint beacon NFT(name=`platform_id`) + entry UTxO
ở registry, status Active. **R-BIND — thứ tự bắt buộc:** cửa 1 (seed custody) phải đã **submit on-chain
TRƯỚC** cửa 2; tx register PHẢI `readFrom` custody UTxO (mang NFT authenticity `(seed_policy, instance_id)`
Ở `Script(custody_hash)`). `planRegister` nhận `custodyUtxo` + gương R-BIND fail-fast (`REG-BIND`). Sau
M5 bước 02: `discoverPlatforms`/`listPlatforms({status:Active})` trả đúng **2** platform.

---

## 5. Tích hợp collect ở lớp touchable (M6) — KHÔNG đụng backend

Cửa 3 (integrate collect) tích hợp ở **lớp touchable** mỗi platform. **Ranh giới sửa code cứng:**

| Platform | ĐƯỢC nối collect ở | KHÔNG đụng |
|---|---|---|
| **PhoenixKey** | **Frontend / SDK** (`PhoenixKeyDID/Frontend`, `PhoenixKeyDID/SDK`) | **backend Java** `PhoenixKeyDID/Database` (ngoài ranh giới — báo Long nếu cần đổi) |
| **OriLife** | **mobile / SDK** (`orilife-mobile-app`, OriLife SDK) | **backend OriLife** (ngoài ranh giới) |

Luồng tích hợp (cả hai):
1. Lớp touchable **nghe sự kiện** app (PhoenixKey: cấp/gia hạn DID; OriLife: định danh con vật) + **định
   giá** `amount` ở app (PhoenixKey phí DID; OriLife `animal_fee` — bò ≠ gà, app-level).
2. `collectAdapter(events)` → `CollectItem[]` (TECH §6.3). Pricing KHÔNG ở adapter.
3. `buildCollectBatchTx(items)` gộp lô mỗi cửa-sổ → một settlement tx → custody tăng + receipt.

> **Vì sao chỉ lớp touchable, không backend (ranh giới + first-principles):** collect là một **tx
> Cardano** ký bởi ví/SDK phía client — thuộc lớp chạm blockchain (Frontend/SDK/mobile), KHÔNG phải
> backend nghiệp vụ (Java/OriLife backend) vốn KHÔNG cầm khóa ký Cardano. Backend chỉ cung cấp **sự
> kiện + giá** (đã có); việc dịch sang tx + ký nằm ở lớp touchable. Đụng backend = sai tầng + vượt ranh
> giới sửa code (`PhoenixKeyDID/Database` thuộc Long; backend OriLife ngoài phạm vi). Phát hiện backend
> thiếu field cần cho collect → **báo, KHÔNG tự sửa**.

---

## 6. Phụ thuộc Governance + known-gap

### 6.1 `registry_authority` committee → DAO (bootstrap) — KHÔNG key đơn (audit #4)
Governance chưa thật → v1 `registry_authority` = **committee multisig** (nhóm bootstrap ký register/update).
Vai: kiểm tham số + ký + đảm bảo `platform_id` duy nhất + `governance_ref` riêng. **KHÔNG động value**
(value gác bởi `governance_ref` từng platform). Khi Governance chạy → `UpdateEntry`-equivalent đổi
`registry_authority` về DAO (đổi param ⇒ đổi script hash registry ⇒ deploy registry mới + migrate entry;
làm sớm khi chưa nhiều platform).

> ⛔ **AUDIT #4 — deploy: authority PHẢI là committee multisig, KHÔNG key đơn.** Validator hiện param 1
> `ByteArray` (1 key-hash). Nếu `REGISTRY_AUTHORITY` chốt là **một vkh đơn** = **single point of failure**:
> một khóa rò = kẻ tấn công chiếm tên/onboard rác cho cả registry. **Bắt buộc trước mainnet:** nâng
> `registry_authority` lên **multisig/committee script** (M-of-N native hoặc Plutus) — `list.has(extra_signatories,
> authority)` đổi sang một check multisig, hoặc `registry_authority` là **script hash** một committee
> validator (gate bằng governance_ref committee → DAO). Lộ trình: v1 committee multisig (bootstrap) →
> DAO khi Governance chạy. (Xem `Tech-Spec.md` GAP-3.)

### 6.2 `governance_ref` riêng từng instance (#1B — nay ĐÓNG)
✅ **#1B ĐÓNG (vá lần 2 F10).** Treasury `spend_spec_hash` NAY gồm `instance_id`
(`Treasury/CONTRACT.md §10 H1B`) → hai instance cùng `governance_ref` KHÔNG còn replay chéo (hash khác
instance ⇒ release reject). PK6 (governance_ref riêng) chuyển từ **bắt buộc** thành **khuyến nghị tách
quyền release** (blast-radius nhỏ) — dùng chung KHÔNG còn rủi ro an toàn, nhưng giữ riêng vẫn tốt.
⛔ **Yêu cầu interface thay thế (Governance build-side):** khi tạo proposal, Governance PHẢI tính
`spend_spec_hash` với ĐÚNG `instance_id` đích. Tính sai ⇒ proposal không chi được. (CONTRACT §5, PK6.)

### Đã đóng bằng vá an ninh (không còn gap)
- **~~vòng đời status off-chain~~ — ĐÓNG bằng U-TERMINAL.** Cấm Retired→Active NAY ép cứng on-chain
  (`registry` U-TERMINAL: `entry_in.status != Retired`). Off-chain `planUpdateEntry` gương (`UPD-TERMINAL`).
- **audit #6 (mức ĐĂNG KÝ) — ĐÓNG bằng R-BIND.** Entry không nói dối custody lúc register (ref-input
  custody mang NFT authenticity @ Script(custody_hash)). Reader hậu kỳ vẫn đối soát (G6 dưới).

### Known-gap (đánh dấu — chờ; ghi rõ van + lộ trình)
- **G1 — Governance chưa thật.** Authority + governance_ref bootstrap committee. Đóng khi Governance chạy
  → chuyển DAO (§6.1).
- **~~G2 — #1B replay chéo cùng governance_ref~~ — ĐÓNG (vá lần 2 F10).** Treasury `spend_spec_hash` gồm
  `instance_id` → replay chéo cùng governance_ref bị chặn on-chain. PK6 governance_ref riêng nay là
  khuyến nghị tách quyền (không còn van an toàn). Yêu cầu thay thế: Governance commit đúng instance_id
  khi tạo proposal (§6.2). (Trước đây chờ `target_instance`; nay đã giải bằng instance_id trong spec_hash.)
- **G3 (audit #4) — `registry_authority` 1 key-hash = single point of failure.** Bắt buộc nâng committee
  multisig trước mainnet (§6.1). Van tạm: bootstrap committee. (TECH GAP-3.)
- **G4 (audit #2) — `platform_id`/`governance_ref` duy nhất = van quy trình, CHƯA ép unique on-chain.**
  beacon KHÔNG one-shot → on-chain không so được id đã mint (cần state trung tâm — đúng thứ ta tránh).
  Van: (1) authority không ký trùng; (2) SDK `discoverPlatforms` đánh dấu `duplicate` + `findDuplicatePlatformIds`.
  Đề xuất đóng v1.x: one-shot `genesis_ref` per platform hoặc registry-state roster. (TECH GAP-2.)
- **G5 (audit #3) — entry lạc-chỗ ở Script lạ.** registry_beacon ép output ở Script bất kỳ (self-ref phá
  vòng §5 TECH). Van: authority chỉ ký tx đặt đúng registry + `discoverPlatforms` nhận `registryScriptHash`
  → đánh dấu `foreignScript`. v1.x khóa cứng nếu cần. (TECH GAP-5.)
- **G6 (audit #6, hậu kỳ) — discover chỉ đọc datum, không đủ tin route phí.** R-BIND đóng mức đăng ký;
  reader route phí PHẢI gọi `verifyEntryAgainstCustody(entry, custodyUtxo)` đối soát custody THẬT (custody
  có thể đã spend/đổi sau register). Van SDK, không phải gap on-chain. (TECH GAP-4, FEAT §3.4.)
- **G7 (vá lần 2 F7) — `status` KHÔNG gác custody (registry ⊥ custody).** `Paused`/`Retired` là nhãn
  discovery, KHÔNG dừng Collect/Release. "Retired=quỹ đóng" là HIỂU NHẦM. v1.x: custody đọc entry qua
  reference input nếu cần Pause thật. (CONTRACT PK10, TECH §4.)
- **G8 (vá lần 2 F8) — receipt/app_id chưa neo on-chain.** `app_id` (CollectItem redeemer) vô danh;
  CustodyDatum không có `receipt_root`. VP/uy tín KHÔNG tin app_id từ Collect tới khi receipt thực thi
  (chống bịa C1). receipt = v1.x / bỏ lời hứa. (CONTRACT PK11, `Treasury/TECH.md §6`.)
- **G9 (vá lần 2 F13) — `verifyEntryAgainstCustody`+dedup chỉ là VAN SDK.** Người tích hợp PHẢI gọi TRƯỚC
  khi route phí; SDK không ép được. Bỏ qua = route phí tới custody giả / entry trùng. (TECH §6.4.)

---

## 7. Checklist onboard một platform

- [ ] **Config:** `platform_id` (duy nhất), `accepted_assets`, `cut_bps`, `governance_ref` **RIÊNG**
      (≠ mọi platform khác — PK6).
- [ ] **Cửa 1 seed:** `custody_seed` chạy → `instance_id/custody_hash/seed_policy`; custody base-case đúng
      (seed guards Treasury §16).
- [ ] **Cửa 2 register:** authority ký `RegisterPlatform` → beacon NFT(name=platform_id) + entry Active;
      `listPlatforms` thấy platform.
- [ ] **Tách quyền (PK6, #1B đã đóng F10):** khuyến nghị `governance_ref` riêng per-platform; emergency
      custody tách nên `governance_ref` khác custody chính (blast-radius nhỏ — không còn vì replay).
- [ ] **Cửa 3 integrate:** collect nối ở **lớp touchable** (Frontend/SDK/mobile), KHÔNG backend; sự kiện
      → CollectItem → settlement tx → custody tăng + receipt.
- [ ] **Đối soát:** `reconcileWithCustody(entry)` — entry `(cut_bps/accepted/governance_ref)` khớp custody
      (custody là chuẩn — PK7).

---

## 8. Rủi ro vận hành & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Authority tập trung (curated) | Quyền authority CHỈ niêm yết, KHÔNG value (tách `governance_ref`); lộ trình committee → DAO (§6.1). |
| **Authority 1 key-hash = SPOF (audit #4)** | **PHẢI** chốt `registry_authority` là **committee multisig** (M-of-N), KHÔNG vkh đơn, trước mainnet (§6.1, G3). |
| `platform_id` chiếm tên / trùng (audit #2) | Van quy trình (KHÔNG mật mã): authority không ký trùng (R-SIG) + SDK `discoverPlatforms.duplicate`/`findDuplicatePlatformIds`. v1.x: one-shot genesis_ref. |
| **Entry nói dối custody (audit #6)** | **R-BIND** ép entry trỏ custody THẬT lúc đăng ký; reader route phí gọi `verifyEntryAgainstCustody` đối soát custody hậu kỳ (G6). |
| **Revive platform đã Retired** | **U-TERMINAL** ép on-chain (Retired terminal, cấm spend entry Retired); off-chain `UPD-TERMINAL`. |
| Replay chéo proposal (#1B) | **ĐÓNG (F10)** — Treasury `spend_spec_hash` gồm `instance_id`. PK6 governance_ref riêng nay là khuyến nghị tách quyền. Governance commit đúng instance_id khi tạo proposal. |
| Entry lệch custody (DAO đổi custody) | `reconcileWithCustody`; custody là chuẩn (PK7); SDK gợi ý update entry. |
| Entry beacon đặt sai Script (audit #3, G5) | Authority chỉ ký tx đặt đúng registry; `discoverPlatforms` đánh dấu `foreignScript`; v1.x khóa cứng nếu cần. |
| Đụng backend ngoài ranh giới | Chỉ nối lớp touchable; phát hiện backend thiếu field → báo, KHÔNG tự sửa (§5). |
| **Hiểu nhầm "Retired=quỹ đóng" (F7)** | Ghi rõ status = nhãn discovery, KHÔNG gác custody (registry ⊥ custody). Đóng quỹ thật = release/governance ở custody. v1.x custody đọc entry nếu cần Pause thật (G7). |
| **VP tin app_id bịa từ Collect (F8)** | app_id vô danh (chưa receipt_root). VP KHÔNG tin app_id tới khi receipt thực thi. receipt = v1.x (G8). |
| **Route phí không đối soát custody (F13)** | `verifyEntryAgainstCustody`+dedup là VAN SDK — người tích hợp PHẢI gọi trước route phí (G9). |
| **Tx đăng ký gánh mint policy ngoài (F5)** | `registry_beacon` R-MINT-2 ép `policies(tx.mint)==1` (least-authority). |

---

## 9. Tiêu chí "xong" (Definition of Done)

- [ ] `aiken build` 2 validator xanh + `aiken check` xanh (M0); unit R-*/U-* đủ reject
      path gồm **R-MINT-2** (least-authority, F5) + **R-BIND** (ref-input custody) + **U-TERMINAL** (Retired
      terminal) (M2/M3).
- [ ] Off-chain SDK: bộ kiểm thử xanh; datum decode khớp Aiken; `onboard/registrationBuilder/collectAdapter/
      registryQuery` có test, gồm `verifyCustodyBinding`/`verifyEntryAgainstCustody` (R-BIND/audit #6),
      `UPD-TERMINAL`, `findDuplicatePlatformIds`/`duplicate` (audit #2), `foreignScript` (audit #3) (M4).
- [ ] E2E Preview: deploy registry → onboard PhoenixKey + OriLife → collect → update status → verify
      on-chain (tx hash thật, `LIVE_DEPLOY_PREVIEW.md`); discover ra đúng 2 platform Active (M5).
- [ ] Tích hợp collect lớp touchable: PhoenixKey Frontend/SDK + OriLife mobile/SDK; **diff KHÔNG chạm
      backend Java / backend OriLife** (M6).
- [ ] Mọi `governance_ref` per-platform RIÊNG (PK6 — nay khuyến nghị tách quyền, #1B đã đóng F10);
      known-gap G1–G9 ghi rõ, không tuyên bố đóng sớm (vòng đời status + audit #6 mức đăng ký đã đóng bằng
      U-TERMINAL/R-BIND; #1B/G2 đóng bằng F10; F7/F8/F13 = G7/G8/G9 ghi rõ van + lộ trình).
- [ ] **Trước mainnet:** `registry_authority` là **committee multisig** (KHÔNG vkh đơn — audit #4, G3).

---

## 10. Phụ thuộc
- **Treasury** (repo LAMP) — custody/collect/release + `custody_seed` (cửa 1). Registry on-chain nay
  sống trong repo Registry (`onchain/`), tách khỏi cây `Treasury/onchain/` từ 2026-07-29. Không sửa Treasury.
- **Governance** (`Governance/VotingPower/`) — đích `governance_ref`; v1 bootstrap committee.
- **PhoenixKey** — tích hợp Frontend/SDK; KHÔNG đụng `PhoenixKeyDID/Database` (backend Java, thuộc Long).
- **OriLife** — tích hợp mobile/SDK; KHÔNG đụng backend OriLife.
- **Oracle** LAMP↔USD/ADA — app-side định giá (cửa 3), ngoài Registry.
