# Registry — Tech-Spec (kiến trúc on-chain Aiken + off-chain SDK)

| Trường | Giá trị |
|---|---|
| Phiên bản | v1.0.1 |
| Trạng thái | `DRAFT` |
| Tầng phạm vi | `L1` (hạ tầng / nền tảng) |
| Loại dự án | **F — Blockchain / Smart Contract** (phụ lục §22.F bắt buộc) |
| Người viết | LAMP agent 2026-06-15; Registry agent cập nhật 2026-08-13; §1–§5 chép sang v2.1 ngày 2026-09-01 |
| Người duyệt | **chưa ai duyệt** |
| Cập nhật cuối | 2026-09-01 |
| Bộ trạng thái | StandardSpec — `DRAFT / IN-REVIEW / REVISE / APPROVED / CONDITIONALLY-APPROVED / LOCKED / SUPERSEDED / ARCHIVED / ABANDONED` (`TigerAgent/StandardSpec/_shared/overview/SPEC-OVERVIEW.md` Sơ đồ 4) |

> ⚠ **Chuẩn StandardSpec: phía sau chỉ được bắt đầu khi phía trước ĐÃ DUYỆT.** Bản này chưa duyệt,
> và SDK off-chain đã dựng xong trên nền nó. Ghi ra, không đánh dấu duyệt hộ ai.

> **Tên cũ của lớp này là "PlatformKit"** (khi nó còn sống trong repo LAMP). Tên hiện hành: **Registry**.

Bám **xương sống** [CONTRACT.md](./CONTRACT.md) —
KHÔNG mâu thuẫn. Tài liệu này là tầng **kỹ thuật** (datum/redeemer/bất biến/validator + SDK off-chain)
của lớp Registry. Hành vi ở [FEAT](./Feat-Spec.md), lộ trình ở [EXEC](./Exec-Spec.md).

**Tái dùng nền sống cùng cây Treasury:**
[`onchain/lib/magiclamp/registry/platform.ak`](../onchain/lib/magiclamp/registry/platform.ak)
(types + helper) + [`validators/registry_beacon.ak`](../onchain/validators/registry_beacon.ak)
(minting) + [`validators/registry.ak`](../onchain/validators/registry.ak) (spend) + helper
[`lib/magiclamp/registry/util.ak`](../onchain/lib/magiclamp/registry/util.ak). Custody/seed của
platform là Treasury (`Treasury/TECH.md`) — TECH này CHỈ đặc tả tầng Registry quanh nó.

---

## 0. Mục tiêu + phạm vi

### Thuộc spec này (TECH)
- 2 validator Registry: **`registry_beacon`** (minting — đăng ký platform) + **`registry`** (spend —
  cập nhật VÀ di trú hồ sơ). Param + redeemer + bất biến từng cái.
- Datum **`PlatformEntry`** (11 trường + Constr order) + enum `PlatformStatus`.
- **Phá vòng** beacon↔registry theo chiều v2: `registry(authority)` biên dịch trước, `registry_beacon`
  nhận `registry_hash` (§5).
- **Authority-gated** (R-SIG/U-SIG) — duy nhất `platform_id` + curated, KHÔNG state trung tâm.
- Off-chain SDK: `onboard` / `registrationBuilder` / `collectAdapter` / `registryQuery`.

### KHÔNG thuộc spec này
- **Custody/Collect/Release** internals (value, sổ bucket, split cut, release-gate): ở `Treasury/TECH.md`.
  Registry **trỏ tới** custody nhưng KHÔNG enforce kế toán của nó.
- **`custody_seed`** (cửa 1 onboard): minting policy của Treasury (`Treasury/EXEC.md §16`). Registry
  nhận `instance_id/custody_hash/seed_policy` đầu ra của nó làm input đăng ký.
- **Định giá / oracle**: app-side, NGOÀI Registry.
- **Đếm phiếu / VP** (đích `governance_ref`): `Governance/VotingPower/*`.

### Bất biến cốt lõi (nhắc lại — sai là hỏng)
- Registry KHÔNG giữ value (PK1) — entry UTxO chỉ mang **beacon NFT + min-ADA**, KHÔNG asset thu.
- Beacon-per-platform (PK2): mỗi platform một NFT name=`platform_id` dưới **một** policy chung.
- Authority gác **niêm yết**, KHÔNG gác **value** (PK3); value gác bởi `governance_ref` riêng (PK6).
- Retire = status, NO-BURN (PK5): beacon sống suốt đời, vòng đời chỉ tiến.

---

> ⛔ **LỊCH SỬ LƯỢC ĐỒ v1 → v2 → v2.1.** Thân bài (§1–§5) nay mô tả **v2.1 — bản mã đang nằm trên
> đĩa**, không còn v1. Khối này giữ lại vì người cầm bản cũ cần biết cái gì đã đổi và vì sao; đừng
> đọc nó như đặc tả hiện hành — đặc tả ở §2–§5, mỗi mục neo `tệp:dòng`.
>
> | Đổi gì | v1 | v2 (mã trên đĩa) |
> |---|---|---|
> | Số trường datum | 9 | **11** — thêm `spec_version` (đầu) và `beacon_policy` (`platform.ak:71-88`) |
> | Chiều tham số | `registry(authority, beacon_policy)`, `registry_beacon(authority)` | **đảo**: `registry(authority)` (`registry.ak:144`), `registry_beacon(authority, registry_hash)` (`registry_beacon.ak:74`) |
> | R-OUT-1 | chỉ cấm ví thường | ép **đúng** `Script(registry_hash)` (`registry_beacon.ak:93`) |
> | Định danh bất biến | 5 trường | **6** — thêm `beacon_policy` (`platform.ak:143-145`) |
> | Redeemer spend | chỉ `UpdateEntry` | thêm **`MigrateEntry`** (constr 1 — `platform.ak:103`) |
> | `→ Retired` / đổi `cut_bps`… | một chữ ký authority là đủ | đòi **thêm** đồng thuận quản trị (U-GOV — `registry.ak:228-236`) |
> | Hạng hình dạng hồ sơ | chỉ một hạng (mọi hồ sơ phải có kho) | **hai** hạng loại trừ nhau: `shape_custodial` / `shape_non_custodial` (`platform.ak:111-124`) |
> | `governance_ref` | `≠ ""` | **`len == 28`** (ĐÚNG một script hash) ở cả R-WF (`platform.ak:134`) lẫn U-MUT/M-MUT (`platform.ak:163`) |
> | Ràng buộc mới | — | **đúc:** R-POLICY, R-VER, R-VALUE, R-EPOCH, R-GOVSELF, R-GOVLIVE · **chung hai nhánh spend:** S-GOVSELF · **Update:** U-VER, U-VALUE, U-GOV, U-REVIVE, U-GOVSELF-OUT, U-GOV2, U-SHAPE · **Migrate:** toàn bộ 13 mã M-SIG, M-GOV, M-DEST, M-MINT-0, M-ID, M-STATUS, M-VER, M-MUT, M-GOVSELF-OUT, M-GOV2, M-SHAPE, M-NFT, M-VALUE |
>
> **v2.1 thêm ĐÚNG ba mã, cùng một bất biến ở ba cửa**: `R-ADDR` (`registry_beacon.ak:102`) ·
> `U-ADDR` (`registry.ak:178`) · `M-ADDR` (`registry.ak:275`) — ô hồ sơ phải ở địa chỉ **enterprise**,
> không phải biến thể stake cùng payment hash. Đây là lỗ TÀNG HÌNH, không phải lỗ mất tiền:
> [`Math-Spec.md`](./Math-Spec.md) §8 T16.
>
> **Tổng mã ràng buộc sau v2.1, đếm từ mã, không nhớ mòn:** **14** `R-*` (cửa đúc —
> `registry_beacon.ak:77-184`) + **1** `S-*` (chung hai nhánh spend — `registry.ak:160`) + **15** `U-*`
> (`registry.ak:165-246`) + **14** `M-*` (`registry.ak:253-313`) = **44**. Phát biểu hình thức của
> trạng thái sau v2.1: [`Math-Spec.md`](./Math-Spec.md) §5 và §7.
>
> ⚠ **SDK off-chain đã theo v2 rồi, đừng đọc §6 là bằng chứng ngược lại.** `identityPreserved` so đúng
> SÁU trường (`offchain/src/registrationBuilder.ts:242-250`), datum mã hoá đúng MƯỜI MỘT trường
> (`offchain/src/registryDatum.ts:127-137`), và `planMigrateEntry` đã có
> (`offchain/src/registrationBuilder.ts:865`). Hai con số cũ trong §6 chỉ là chữ sót, đã sửa tại chỗ.

---

## 1. Tổng quan kiến trúc — 2 validator Registry quanh Treasury custody

Sơ đồ dưới đây là **v2.1**, đếm mã trực tiếp từ validator — không nhớ mòn.

```
   authority ký                ┌───────────────────────────────────────────────┐
   RegisterPlatform ──────────▶│  registry_beacon (MINTING policy)             │
   (cửa 2 onboard)             │  param: (registry_authority, registry_hash)   │
                               │  14 mã R-* (registry_beacon.ak:77-184):       │
                               │   R-SIG · R-MINT-1 · R-MINT-2 · R-OUT-1       │
                               │   R-ADDR · R-NAME · R-POLICY · R-VER · R-WF   │
                               │   R-GOVSELF · R-GOVLIVE · R-VALUE · R-EPOCH   │
                               │   R-BIND                                      │
                               │  BURN cấm (else fail — :189-191)              │
                               └────────────────────┬──────────────────────────┘
                                                    │ đúc beacon NFT (name = platform_id)
                               ┌────────────────────▼──────────────────────────┐
                               │  ô hồ sơ @ registry — địa chỉ ENTERPRISE      │
                               │  beacon NFT + min-ADA + datum PlatformEntry   │
                               │  (11 trường, status = Active)  ── trỏ ──▶ kho (Treasury)
                               └────────────────────┬──────────────────────────┘
   authority ký                                     │ chi tiêu: cập nhật HOẶC di trú
   UpdateEntry / MigrateEntry ─▶┌───────────────────▼──────────────────────────┐
                               │  registry (SPEND validator)                   │
                               │  param: registry_authority — CHỈ MỘT (:144)   │
                               │  beacon_policy đọc TỪ DATUM, không phải param  │
                               │  chung hai nhánh: S-GOVSELF (:160)            │
                               │  Update — 15 mã (:165-246):                   │
                               │   U-MINT-0 · U-SINGLE · U-ADDR · U-TERMINAL   │
                               │   U-ID · U-VER · U-MUT · U-GOVSELF-OUT        │
                               │   U-SHAPE · U-NFT · U-VALUE · U-REVIVE        │
                               │   U-SIG · U-GOV · U-GOV2                      │
                               │  Migrate — 14 mã (:253-313):                  │
                               │   M-MINT-0 · M-SIG · M-GOV · M-DEST · M-ADDR  │
                               │   M-ID · M-STATUS · M-VER · M-MUT             │
                               │   M-GOVSELF-OUT · M-GOV2 · M-SHAPE · M-NFT    │
                               │   M-VALUE                                     │
                               └───────────────────────────────────────────────┘
```

**Chiều deploy một chiều:** `registry(authority)` biên dịch TRƯỚC (nó không cần biết gì về beacon —
`registry.ak:144`) → ra `registry_hash` → truyền vào `registry_beacon(authority, registry_hash)`
(`registry_beacon.ak:74`). Đây là chiều **đảo** so với v1; lý do và cái giá phải trả ở §5.

**Quyết định first-principles — beacon-per-platform, KHÔNG registry UTxO trung tâm.** Một UTxO "danh
sách tất cả" là điểm contention tuần tự + O(N) bloat (vết `consumed_proposals` Treasury §10 H3). Thay
bằng: mỗi platform một beacon NFT độc lập một UTxO → register/update song song, O(1)/thao tác, discover =
quét policy. (CONTRACT §3.1.)

**Hai nhánh chi tiêu, không phải một.** `UpdateEntry` sửa hồ sơ tại chỗ; `MigrateEntry` đưa hồ sơ sang
một validator `registry` KHÁC (`registry.ak:251`). Nhánh thứ hai có vì tham số validator đổi thì script
hash đổi, tức địa chỉ đổi — không hồi tố được, phải dời từng hồ sơ (`registry.ak:128-131`).

---

## 2. Datum `PlatformEntry` — field + Constr order

Nguồn: `platform.ak` (đã sống). Constr index theo **thứ tự khai báo** — KHỚP off-chain (đổi thứ tự một
bên phá decode bên kia, cùng quy tắc Treasury datum).

```aiken
// enum PlatformStatus — Constr index: Active=0, Paused=1, Retired=2 (thứ tự khai báo).
pub type PlatformStatus {
  Active       // 0
  Paused       // 1
  Retired      // 2
}

// PlatformEntry — Constr 0, 11 trường theo thứ tự (v2 — off-chain Data.Object phải khớp ĐÚNG thứ tự).
// Nguồn: platform.ak:71-88.
pub type PlatformEntry {
  spec_version    : Int,              // 0  phiên bản lược đồ hồ sơ (v2 = 2)  ← THÊM Ở v2
  platform_id     : ByteArray,        // 1  = beacon NFT name (duy nhất, authority kiểm duyệt)
  instance_id     : ByteArray,        // 2  Treasury custody instance_id (= seed NFT name)
  custody_hash    : ByteArray,        // 3  script hash custody.ak của platform
  seed_policy     : ByteArray,        // 4  policy NFT authenticity custody (custody_seed)
  beacon_policy   : ByteArray,        // 5  policy beacon NFT — tự khai, ép khớp lúc mint (R-POLICY)  ← THÊM Ở v2
  governance_ref  : ByteArray,        // 6  script hash DAO/committee gác release (RIÊNG — PK6). LUÔN 28 byte.
  accepted_assets : List<AssetKey>,   // 7  assets platform thu (AssetKey{policy,name} — types.ak)
  cut_bps         : Int,              // 8  protocol_cut_bps của instance
  created_epoch   : Int,              // 9  ô-thời-gian đăng ký (ô 5 ngày kể từ mốc Unix, KHÔNG phải epoch Cardano)
  status          : PlatformStatus,   // 10
}
```

> **`accepted_assets` dùng `AssetKey`** (`onchain/lib/magiclamp/registry/types.ak`), KHÔNG
> `BucketKey`. Lý do: entry niêm yết chỉ cần `(policy, name)` của asset — KHÔNG có khái niệm bucket ở
> tầng registry (bucket là chuyện kế toán nội bộ custody). Dùng `AssetKey{policy,name}` gọn + đúng tầng.

**Định danh (6 trường bất biến — PK4, v2):** `platform_id`(1), `instance_id`(2), `custody_hash`(3),
`seed_policy`(4), `beacon_policy`(5), `created_epoch`(9). Khoá cứng ở **cả** `UpdateEntry` (U-ID) **lẫn**
`MigrateEntry` (M-ID) — `platform.identity_preserved` (`platform.ak:143-145`). Đổi = platform mới, đăng
ký lại. `spec_version` KHÔNG nằm trong nhóm này: nó bất biến ở nhánh Update (ép riêng U-VER) và **tăng**
ở nhánh Migrate (M-VER) — `platform.ak:141-142`.

**Khả biến (4 trường):** `governance_ref`(6), `accepted_assets`(7), `cut_bps`(8), `status`(10). Đổi qua
`UpdateEntry`, authority ký.

⚠ **Đọc kỹ chỗ này — hai cấp quyền khác nhau, đừng gộp.** 11 − 6 = **5 trường** đổi được, nhưng
`spec_version` bị U-VER khoá ở nhánh Update, nên đường Update còn đúng bốn trường trên. Trong bốn:

| Trường | Đổi bằng gì |
|---|---|
| `governance_ref`, `accepted_assets`, `cut_bps` | authority ký **VÀ** đồng thuận quản trị — `governed_fields_changed` khoá đúng ba trường này (`platform.ak:172-174`) |
| `status: → Retired` | authority ký **VÀ** đồng thuận quản trị (`registry.ak:229-232`) |
| `status: Active → Paused` | **MỘT chữ ký authority là đủ** |

Tức cổng quản trị không phủ hết phần khả biến. `Active → Paused` là van dừng nhanh, cố ý để một bên
quyết (`registry.ak:36`); chiều ngược lại được U-REVIVE bù để authority không biến `Paused` thành gỡ
niêm yết vĩnh viễn bằng cách đơn giản là không ký lại (§4.1).

### Redeemer

```aiken
pub type RegistryBeaconRedeemer { RegisterPlatform }   // minting (cửa 2) — MỘT action

pub type RegistryRedeemer {                             // spend — HAI action (v2)
  UpdateEntry                                           // constr 0 — cập nhật field khả biến
  MigrateEntry { new_registry_hash: ByteArray,          // constr 1 — di trú sang registry validator MỚI
                 new_spec_version: Int }
}
```

`registry_beacon` **một action** (`RegisterPlatform`); `registry` **hai action** (`UpdateEntry` constr 0,
`MigrateEntry` constr 1 — `platform.ak:97-104`). Mọi nhánh khác else-fail.

> **Nhánh di trú CỐ Ý KHÔNG áp `U-TERMINAL`** (`registry.ak:118-120`; ràng buộc `entry_in.status !=
> Retired` chỉ nằm ở nhánh Update — `registry.ak:185`). Lý do: nếu áp cả hai nhánh thì mỗi lần xoay quyền
> đăng ký (đổi `registry_authority` ⇒ đổi script hash ⇒ phải di trú từng hồ sơ) sẽ làm **mọi hồ sơ
> `Retired` kẹt vĩnh viễn** ở validator cũ — beacon NFT không đi theo được, phá thẳng cam kết PK5 "beacon
> sống suốt đời, dấu vết kiểm toán không đứt". Di trú không phải cửa Retire trá hình: M-STATUS ép
> `status` KHÔNG đổi khi di trú.

---

## 3. `registry_beacon` (minting) — đăng ký platform (cửa 2)

`validator registry_beacon(registry_authority: ByteArray, registry_hash: ByteArray)` —
**hai** tham số (`registry_beacon.ak:74`). `registry_hash` là thứ v1 không có; nhờ nó cửa đúc ép được
địa chỉ đích ngay lúc sinh hồ sơ (R-OUT-1). Kiểm **mười bốn** ràng buộc, cộng BURN cấm (else fail —
`registry_beacon.ak:189-191`). Thứ tự dưới đây là thứ tự chạy thật trong mã:

```
R-SIG     authority ký:  list.has(tx.extra_signatories, registry_authority)     (`:77`)
          ⇒ kiểm duyệt + đảm bảo platform_id DUY NHẤT (authority không ký trùng id). KHÔNG state trung
            tâm — duy nhất bằng kỷ luật ký. (CONTRACT §3.2.)

R-MINT-1  mint ĐÚNG 1 token policy này, qty +1:                                 (`:80-83`)
            own_tokens = assets.tokens(tx.mint, policy_id)
            dict.size(own_tokens) == 1  ∧  [Pair(platform_id, qty)] = to_pairs  ∧  qty == 1
          ⇒ một đăng ký = một beacon NFT (name = platform_id). Không mint lô / không qty>1.

R-MINT-2  least-authority (vá lần 2 LỖ #F5):  list.length(assets.policies(tx.mint)) == 1   (`:86`)
          ⇒ tx đăng ký CHỈ mint policy beacon NÀY, KHÔNG gánh mint policy NGOÀI cùng tx. Beacon không
            ngầm cho phép đồng-mint token lạ trong cùng tx đăng ký (đối xứng `custody_seed` S-MINT-2 của
            Treasury). (4 trục: bền vững — thu hẹp quyền tx; first-principles — minting policy chỉ chịu
            trách nhiệm token của nó.)
          > ⚠ Dòng này va vào R-GOVLIVE. Xem cảnh báo ở R-GOVLIVE dưới đây trước khi định nới nó.

R-OUT-1   ĐÚNG 1 output mang NFT đó (SELF-REF), ở ĐÚNG Script(registry_hash) + có datum
          (`registry_beacon.ak:91-93`, datum đọc ở :104-105):
            count_outputs_with_token(tx.outputs, policy_id, platform_id) == 1
            entry_out = output_with_token(...)              // output mang chính token vừa mint
            util.is_at_script(entry_out.address, registry_hash)   // ĐÚNG registry, không phải Script bất kỳ
            expect InlineDatum(od) = entry_out.datum
            expect entry: PlatformEntry = od
          ⇒ hồ sơ SINH RA đã nằm trong quyền tài phán của `registry` — chữ ký authority, định danh bất
            biến, bảo toàn NFT đều áp được ngay.
          > ⚠ ĐỔI SO VỚI v1, đây là chỗ đắt nhất của cả đợt. v1 chỉ ép `!is_vk` (Script BẤT KỲ), nên hồ
            sơ đặt ở một script lạ vẫn lọt — kiểm bằng thực thi 2026-08-04 — và khi đó `registry.ak`
            KHÔNG có quyền tài phán: U-ID/U-SIG/U-TERMINAL/U-NFT đều không áp
            (`registry_beacon.ak:9-13`). Ép được đích là hệ quả trực tiếp của việc đảo chiều tham số (§5).
          > Self-ref vẫn còn: output được CHỌN bằng "token tôi vừa mint". Đổi là chỗ nó bị ép thêm, không
            phải chỗ nó bị bỏ.

R-ADDR    ô hồ sơ ra ở địa chỉ ENTERPRISE của registry (v2.1 — `:102`):
            util.has_no_stake_part(entry_out.address)     // stake_credential == None (`util.ak:55-57`)
          ⇒ R-OUT-1 ép PAYMENT credential đúng `Script(registry_hash)`, và dừng ở đó. Một ô ở BIẾN THỂ
            STAKE của cùng hash qua được R-OUT-1 — hồ sơ hợp lệ, mang beacon NFT thật — nhưng
            bất kỳ ai đọc sổ bằng `utxosAt(<địa chỉ enterprise>)` KHÔNG thấy nó.
            Đây là cửa SINH của mọi hồ sơ, nên ghim ở đây là ghim điều kiện đầu: không hồ sơ nào ra đời
            ở chỗ đường đọc ấy không tới. [`Math-Spec.md`](./Math-Spec.md) §8 T16.
          ⚠ ĐÍNH CHÍNH (đo 2026-09-01) — bản trước của dòng này, và chú thích trong `util.ak`, ghi rằng
            đó là "đường mà `scripts/02_*`/`03_*` thật sự dùng". SAI:
              command grep -rn "utxosAt(" offchain/src scripts/*.ts tests/  → 3 dòng, CẢ BA là chú thích
              command grep -rn "utxosByOutRef" scripts/*.ts                → 03_register_platform.ts:228,341,354
            Kho này KHÔNG có call site `utxosAt` nào; `scripts/config.ts:124` chỉ DỰNG địa chỉ, không ĐỌC
            theo nó. Bên hưởng lợi thật của R-ADDR là bên tích hợp NGOÀI kho (SDK riêng, dịch vụ định
            tuyến phí, bảng theo dõi). Phân biệt quan trọng vì cái giá — bỏ quyền uỷ thác của mọi ô, ép
            đích di trú phải enterprise — là thật và vĩnh viễn: trả nó cho một bên hưởng lợi ngoài kho là
            một quyết định; trả cho một call site không tồn tại thì không phải.
          ⚠ VÀ R-ADDR KHÔNG ĐỦ để hai đường đọc luôn đồng ý (audit đối kháng 2026-09-01, có PoC chạy
            được). Ca rẻ nhất: ai cũng trả ~2 ADA tạo được một ô rác ở ĐÚNG địa chỉ enterprise với datum
            tự khai — lúc TẠO ô không validator nào chạy, nên không cổng nào chạm tới. Đường địa chỉ thấy
            nó, đường beacon NFT thì không. Bản vá này còn biến địa chỉ enterprise thành địa chỉ CHÍNH
            TẮC, tức đúng chỗ kẻ gieo rác nhắm tới. Thiệt hại hôm nay = 0 vì PK1 (sổ không giữ giá trị),
            nhưng đó là tính chất của ỨNG DỤNG, không phải của validator.
            ⇒ Kết luận cho bên đọc: đọc sổ bằng `utxosAt` là đường KHÔNG LÀNH. Đường lành duy nhất là
              đọc theo beacon NFT với policy TỰ TÍNH LẠI, không lấy từ datum — đúng cái `discoverPlatforms`
              đang làm.
          > Đánh đổi có chủ ý (`util.ak:52-54`): ghim enterprise là BỎ quyền uỷ thác phần ADA khoá trong
            ô hồ sơ. Giá nhỏ (mỗi ô chỉ min-ADA), đổi lại bỏ được một câu hỏi không ai trả lời — ai giữ
            stake credential của ô hồ sơ, và quyền uỷ thác ấy của ai.
          > Vì sao KHÔNG gộp vào `is_at_script` (`util.ak:40-44`): phép ĐẾM phải theo payment hash, cố ý
            bỏ stake. Gộp stake vào phép tìm là mở lại lỗ double-satisfaction C1/C2/M1. Phép đếm giữ
            nguyên, ô ra bị ghim thêm bằng dòng này — hai ràng buộc cộng lại mới xác định địa chỉ duy nhất.

R-NAME    entry.platform_id == platform_id   // datum khai đúng tên NFT đã mint (`:108`)
          ⇒ platform_id trong datum == asset name → entry không thể nói dối định danh.

R-POLICY  entry.beacon_policy == policy_id                              (`:112`)
          ⇒ `beacon_policy` là LỜI TỰ KHAI trong datum, và `registry.ak` đọc thẳng lời khai đó
            (`registry.ak:155`). Không có dòng này thì bên spend bị dắt mũi bằng một policy tự chế.
            Ép khớp policy THẬT ngay tại cửa đúc là chỗ DUY NHẤT làm được việc ấy — sau khi ô hồ sơ ra
            đời thì không ai đối chiếu lại nữa.

R-VER     entry.spec_version == platform.spec_version_v2   // = 2 (`platform.ak:57`, ép ở `:115`)
          ⇒ đăng ký mới phải theo lược đồ hiện hành. Đường tăng phiên bản DUY NHẤT là `MigrateEntry`
            (M-VER); nhánh Update khoá cứng (U-VER).

R-WF      platform.entry_well_formed(entry)  — v2, nguồn `platform.ak:133-138`:

          (a) phần CHUNG cho mọi hồ sơ:
                platform_id≠""  ∧  len(governance_ref)==28  ∧  len(beacon_policy)==28
                ∧ created_epoch≥0  ∧  status==Active

          (b) VÀ hồ sơ phải thuộc ĐÚNG MỘT trong hai HẠNG HÌNH DẠNG (or{...}):

              shape_custodial      — hồ sơ CÓ KHO (mã niêm yết `CU-1`):
                len(instance_id)>0 ∧ len(custody_hash)==28 ∧ len(seed_policy)==28
                ∧ accepted_assets≠[] ∧ 0≤cut_bps≤10000

              shape_non_custodial  — hồ sơ KHÔNG KHO (mã niêm yết `CU-N`):
                instance_id=="" ∧ custody_hash=="" ∧ seed_policy=="" ∧ accepted_assets==[] ∧ cut_bps==0

          ⇒ entry well-formed + **khởi tạo Active** (không register thẳng vào Paused/Retired).
          > `governance_ref` bắt buộc cho CẢ HAI hạng, kể cả hạng không kho (`platform.ak:129-132`).
            Không phải để gác tiền — hồ sơ không kho chẳng có tiền để gác — mà để hồ sơ luôn có MỘT BÊN
            đồng thuận được. Hồ sơ thiếu nó là hồ sơ mà authority một mình Retire vĩnh viễn được.

R-GOVSELF entry.governance_ref != registry_hash                          (`:123`)
          ⇒ nếu hồ sơ khai cổng quản trị CHÍNH LÀ registry thì `governance_consented` (quét tx.inputs
            tìm input ở Script(governance_ref), mà ô hồ sơ LUÔN nằm ở đó) thành hằng True vĩnh viễn ⇒
            authority một mình Retire / đổi cut_bps / di trú được. Rào "hai bên" bị mở lại bằng đúng
            MỘT giá trị datum. Chặn ở cửa nộp vì hồ sơ đã lọt thì bên spend cũng chặn (S-GOVSELF),
            nhưng khi đó nó KẸT.

R-GOVLIVE util.governance_consented(tx, entry.governance_ref)            (`:152`)
          ⇒ cổng quản trị phải CHẠY THẬT ngay trong chính tx đăng ký (chi tiêu một input ở
            Script(governance_ref), hoặc một withdrawal từ đó — `util.ak:215-227`). Ép 28 byte ở R-WF
            chỉ là guard CÚ PHÁP: 28 byte đúng độ dài vẫn có thể là hash của script không tồn tại, hoặc
            của script không có nhánh nào chạy được (`platform.ak:46-51`). Kiểm bằng thực thi — PoC
            `newC1` PASS trước bản vá.
          > Vì sao ép ở ĐÂY: đăng ký là điểm DUY NHẤT trong vòng đời còn đòn bẩy. Sau khi lên sổ, MỌI
            đường sửa/gỡ/di trú đều đi qua chính `governance_ref` ⇒ một ref chết là hồ sơ chết mà không
            ai gỡ được (`registry_beacon.ak:125-129`).
          > ⚠ **XUNG ĐỘT ĐÃ BIẾT, CỐ Ý KHÔNG VÁ: R-GOVLIVE ⟂ R-MINT-2** (`registry_beacon.ak:134-151`).
            R-GOVLIVE bắt cổng quản trị chạy trong tx đăng ký; R-MINT-2 cấm tx đó gánh policy mint nào
            khác. Hệ quả: validator quản trị nào có nhánh đồng thuận CẦN mint/burn — mẫu rất phổ thông,
            ví dụ đốt NFT đề xuất khi thực thi quyết định — thì VĨNH VIỄN không đăng ký được. Kiểm bằng
            thực thi: PoC `poc_register_gov_needs_mint_blocked` FAIL đúng tại dòng R-MINT-2, KHÔNG phải
            tại R-GOVLIVE. Hai đường vòng hợp lệ, cả hai đều do phía cổng quản trị làm: (1) withdraw-0
            từ Script(governance_ref) — không đụng `tx.mint`; (2) một nhánh spend KHÔNG MINT của chính
            script quản trị. Nghĩa vụ chứng minh thuộc CHUẨN ĐĂNG KÝ, không phải thuộc mã.
          > ⚠ Giới hạn kế thừa: `governance_consented` chứng minh "script ĐÃ CHẠY", KHÔNG chứng minh
            "script phê duyệt ĐÚNG việc này", và không loại được script có nhánh permissionless
            (`util.ak:200-209`). ⟹ an toàn của R-GOVLIVE/U-GOV/M-GOV = an toàn của validator quản trị
            mà chính platform khai.

R-VALUE   without_lovelace(entry_out.value) == from_asset(policy_id, platform_id, 1)   (`:156-160`)
          ⇒ ô hồ sơ chỉ mang beacon NFT + ADA, KHÔNG token lạ. Hôm nay là chống rác sổ; ngày sổ có giữ
            giá trị thì đây là chống lách kế toán.

R-EPOCH   entry.created_epoch == util.current_time_bucket(tx)            (`:168`)
          ⇒ mốc tạo phải là ô thời gian của CHÍNH tx đăng ký. Trước v2 chỉ ép `created_epoch >= 0`, nên
            khai 0 để ra vẻ platform lâu đời nhất hệ là ĐƯỢC — mà trường này lại bị khoá bất biến (U-ID)
            ⇒ lời khai sai thành sự thật vĩnh viễn của sổ.
          > ⚠ **TÊN TRƯỜNG NÓI SAI ĐƠN VỊ.** `created_epoch` KHÔNG phải epoch Cardano: giá trị là "ô 5
            ngày kể từ mốc Unix" (`posix_ms / 432_000_000` — `util.ak:113-121, 137`). Tại mốc Shelley
            hàm trả **3694**; biên ô lật sớm hơn biên epoch thật ~**251.091 s ≈ 2,9 ngày**; trên Preview
            (epoch 1 ngày) sai số là **5×**. Giữ tên vì đổi tên = đổi lược đồ (`platform.ak:81-86`).
            Bảo đảm mà R-EPOCH cần — "không khai được mình già hơn thực tế" — chỉ đòi một thang đơn điệu,
            không đòi thang trùng biên epoch.
          > ⚠ "Registry và Treasury cùng quy ước thời gian" — **CHƯA KIỂM**, đừng viết như đã kiểm. Bên
            Treasury `ms_per_epoch` là THAM SỐ validator, không phải hằng; 432_000_000 chỉ xuất hiện
            trong test (`util.ak:128-133`). Mệnh đề đó chỉ đúng NẾU bên triển khai truyền đúng số ấy.

R-BIND    entry trỏ kho THẬT — CHỈ ÁP CHO HẠNG CÓ KHO (`:181-184`):
            or { !platform.shape_custodial(entry), custody_bound(tx, entry) }
          với `custody_bound` (`:59-72`): có một reference input mang ĐÚNG 1 NFT
            (entry.seed_policy, entry.instance_id) ở đúng Script(entry.custody_hash).
          ⇒ hồ sơ CÓ KHO phải reference một custody UTxO thật ⇒ ép được thứ tự onboard hai bước
            (seed → register): không có kho trên chuỗi thì không đăng ký được.
          > **Bỏ R-BIND cho hạng KHÔNG KHO không hạ an toàn** (`registry_beacon.ak:177-180`): ba giá trị
            đó rỗng, không có gì để đối chiếu, và R-WF đã ép rỗng ĐỦ CẢ NĂM trường ⇒ không có hồ sơ nửa
            vời nào lách được bằng cách khai "không kho".
          > ⚠ **ĐỌC ĐÚNG SỨC MẠNH.** Cả ba giá trị đều lấy từ CHÍNH datum người đăng ký khai, nên đây
            KHÔNG phải phép xác thực "kho là Treasury thật" — nó chỉ kiểm entry TỰ NHẤT QUÁN. Kiểm bằng
            thực thi 2026-08-04: một kho tự dựng hoàn toàn (policy riêng + script riêng) vẫn qua R-BIND
            (`registry_beacon.ak:173-176`). Cổng thật lúc đăng ký là chữ ký authority. Bên định tuyến phí
            BẮT BUỘC tự đối soát kho, không được tin R-BIND là đủ. Off-chain gương ở
            `registrationBuilder.verifyCustodyBinding` + `registryQuery.verifyEntryAgainstCustody` (§6).

BURN — CẤM (else fail — `:189-191`): beacon sống suốt vòng đời platform; retire = status trong datum (PK5).
```

**Vì sao R-WF đòi `status==Active` lúc register:** đăng ký = "platform vừa ra đời, đang hoạt động". Cho
register thẳng vào `Retired`/`Paused` = một entry chết-từ-lúc-sinh (rác). Vòng đời tiến từ Active (CONTRACT
§4) — Pause/Retire là bước **sau** qua `UpdateEntry`.

---

## 4. `registry` (spend) — cập nhật và di trú hồ sơ

`validator registry(registry_authority: ByteArray)` — **MỘT** tham số (`registry.ak:144`). v2 bỏ tham số
`beacon_policy`; nay nó đọc từ `entry_in.beacon_policy` (`registry.ak:155`). Nhờ vậy hash của validator
này tính được TRƯỚC và cửa đúc mới ép được địa chỉ đích (§5).

Hai action: `UpdateEntry` (constr 0) và `MigrateEntry` (constr 1) — `platform.ak:97-104`.

### 4.0 Ràng buộc CHUNG cho cả hai nhánh

```
S-GOVSELF entry_in.governance_ref != own_hash                            (`registry.ak:160`)
          ⇒ ô hồ sơ đang chi tiêu LUÔN nằm ở Script(own_hash), mà `governance_consented` quét MỌI
            tx.inputs tìm input ở Script(governance_ref) (`util.ak:216-217`). Nên một hồ sơ khai
            `governance_ref = hash của chính registry` biến `governance_consented` thành hằng True
            VĨNH VIỄN ⇒ authority một mình Retire / đổi cut_bps / di trú được. Rào "hai bên" bị mở lại
            bằng đúng MỘT giá trị datum. Cửa đúc chặn cùng lỗ ở R-GOVSELF.
```

### 4.1 `UpdateEntry` — 15 mã (`registry.ak:165-246`)

```
U-MINT-0  assets.is_zero(tx.mint)                                        (`:165`)
          ⇒ update KHÔNG đụng beacon supply (không mint, không burn).

U-SINGLE  ĐÚNG 1 ô hồ sơ vào + 1 ô ra, đếm theo SCRIPT HASH:             (`:168-171`)
            count_inputs_at_script(tx.inputs, own_hash) == 1
            count_outputs_at_script(tx.outputs, own_hash) == 1
          ⇒ chống double-satisfaction gộp N hồ sơ vào một tx.

U-ADDR    ô hồ sơ ra ở địa chỉ ENTERPRISE của chính registry (v2.1):     (`:178`)
            util.has_no_stake_part(reg_out.address)
          ⇒ U-SINGLE ngay trên đếm theo PAYMENT hash (cố ý — xem khối dưới), nên nó MỘT MÌNH cho phép
            dời hồ sơ sang biến thể stake cùng payment hash. Hai dòng cộng lại ghim địa chỉ ô ra về DUY
            NHẤT. Không được đóng bằng cách cho U-SINGLE so full-address: làm thế là mở lại C1/C2.

U-TERMINAL entry_in.status != Retired                                    (`:185`)
          ⇒ Retired là trạng thái CUỐI của ĐƯỜNG UPDATE. Vòng đời một chiều: Active⇄Paused→Retired.
            ⚠ Không phải "hồ sơ Retired thì bất động": nó vẫn DI TRÚ được — nhánh Migrate cố ý không
            áp mã này (`:118-120`). Xem §4.2.

U-ID      platform.identity_preserved(entry_in, entry_out)               (`:188`)
            platform_id ∧ instance_id ∧ custody_hash ∧ seed_policy ∧ beacon_policy ∧ created_epoch
            BẢO TOÀN — SÁU trường (`platform.ak:143-145`)
          ⇒ update KHÔNG đổi định danh — đổi = platform khác, phải đăng ký mới.

U-VER     entry_out.spec_version == entry_in.spec_version                (`:190`)
          ⇒ đổi phiên bản lược đồ phải đi đường MigrateEntry (M-VER). `spec_version` KHÔNG nằm trong
            nhóm identity vì nó bất biến ở đây nhưng TĂNG ở kia (`platform.ak:141-142`).

U-MUT     platform.mutable_fields_valid(entry_out)                       (`:192`)
            len(governance_ref) == 28  ∧  entry_out thuộc ĐÚNG MỘT hạng hình dạng
            (`platform.ak:162-167`)
          ⇒ ép ĐÚNG 28 byte, không chỉ "khác rỗng": một giá trị rác trỏ tới script không tồn tại làm
            `governance_consented` thành hằng False vĩnh viễn ⇒ hồ sơ không Retire được, không di trú
            được, không đổi được ba trường quản trị (`platform.ak:149-152`).
          > ⚠ Hàm này KHÔNG đủ để chặn hồ sơ tự khoá — `own_hash` dài đúng 28 byte nên qua được nó
            (`platform.ak:154-157`). Việc chặn là của U-GOVSELF-OUT ngay dưới.

U-GOVSELF-OUT entry_out.governance_ref != own_hash                       (`:198`)
          ⇒ NỬA CÒN LẠI của S-GOVSELF. Đợt trước chỉ chặn ở datum VÀO và ở cửa nộp; datum RA chỉ bị
            U-MUT ép ĐỘ DÀI 28 — mà `own_hash` dài đúng 28. Kiểm bằng thực thi (PoC `poc_new_a1` PASS
            trước bản vá): authority ký + platform đồng thuận MỘT LẦN là ghi được
            `entry_out.governance_ref = own_hash`; tx đó ĐƯỢC NHẬN, và từ giây đó ô hồ sơ KHÔNG spend
            được bằng bất kỳ đường nào — Update chết ở S-GOVSELF, Migrate cũng chết ở đúng dòng đó ⇒
            beacon NFT + min-ADA khoá vĩnh viễn ⇒ phá thẳng PK5 (`registry.ak:55-62`).

U-SHAPE   shape_custodial(entry_in) == shape_custodial(entry_out)        (`:200`)
          ⇒ không đổi hạng có-kho ↔ không-kho. Chuyển hạng = đổi bản chất dịch vụ ⇒ phải đăng ký mới.

U-NFT     beacon NFT bảo toàn ở vào & ra:                                (`:203-204`)
            has_one_nft(reg_in.value,  beacon_policy, entry_in.platform_id)
            has_one_nft(reg_out.value, beacon_policy, entry_out.platform_id)
          với `beacon_policy = entry_in.beacon_policy` (`:155`) — lấy từ datum, không phải tham số.
          ⇒ chỉ hồ sơ "thật" (mang beacon NFT) mới chi tiêu được; NFT không rời ô hồ sơ.

U-VALUE   util.value_not_drained(reg_in.value, reg_out.value)            (`:207`)
            without_lovelace(out) == without_lovelace(in)  ∧  lovelace(out) ≥ lovelace(in)
          ⇒ không rút bớt khỏi ô hồ sơ. Hôm nay sổ chưa giữ giá trị nên đây là ràng buộc dự phòng; bản
            nào đặt tiền cọc vào ô hồ sơ thì thiếu nó là lỗ rút tiền ngay (`util.ak:238-241`).
          > ⚠ GIỚI HẠN CỐ Ý GIỮ (`util.ak:243-247`): chỉ cho lovelace TĂNG ⇒ ADA ai đó gửi nhầm vào ô
            hồ sơ là KẸT VĨNH VIỄN. Mở đường rút là mở đúng cái lỗ tệ hơn. Ai định "sửa" chỗ này phải
            trả lời được: ai ký lệnh rút, và phân biệt "gửi nhầm" với "tiền cọc" bằng gì.

U-REVIVE  pure_revive = entry_in.status == Paused ∧ entry_out.status == Active
            ∧ spec_version, governance_ref, accepted_assets, cut_bps GIỮ NGUYÊN     (`:212-213`)
          ⇒ đây là VỊ TỪ, dùng làm ngoại lệ của U-SIG ngay dưới, không phải một phép kiểm độc lập.
          > Vì sao tách chiều (đặc tả gốc gộp một dòng `Active ↔ Paused` — đó là LỖI ĐẶC TẢ,
            `registry.ak:29-36`): nếu cả hai chiều đều chỉ cần authority thì authority đặt Paused rồi
            KHÔNG BAO GIỜ ký lại — platform không có cách tự đảo ngược. Hiệu ứng thật = gỡ vĩnh viễn,
            mà KHÔNG đi qua rào "hai bên" mà chính luật này dựng ra. Nguồn cao hơn:
            `Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md:201` §8 bước 7 — "kết nạp DỄ, gỡ KHÓ".
            Chiều `Active → Paused` GIỮ NGUYÊN chỉ-authority: cần van dừng nhanh.
          > "Mọi trường khác y hệt" ép CHẶT từng trường khả biến, không chỉ identity. Lỏng một trường
            là platform tự mở lại KÈM đổi cut_bps — đi vòng qua đúng U-GOV.

U-SIG     authority ký, TRỪ ca hồi sinh thuần tuý:                       (`:218-224`)
            list.has(tx.extra_signatories, registry_authority)
            ∨ (pure_revive ∧ governance_consented(tx, entry_in.governance_ref))
          ⇒ ngoại lệ DUY NHẤT của chữ ký authority trong cả validator.
          > ⛔ **Ngoại lệ này có giá, ghi ra để đợt sau không quên** (`platform.ak:23-35`): trong một ô
            TỰ DỰNG ở địa chỉ registry, kẻ dựng khai CẢ BA lời — `beacon_policy` (policy hắn tự đúc),
            `governance_ref` (script hắn kiểm soát), `status: Paused`. Rồi chi tiêu `Paused → Active`
            với `extra_signatories: []` ⇒ PASS. Audit đối kháng đã dựng PoC. Ba lời tự khai khép kín
            vòng xác thực; S-GOVSELF không chặn vì nó chỉ cấm `governance_ref == own_hash`.
            **Thiệt hại hôm nay = 0 vì tính chất ỨNG DỤNG** (sổ không giữ giá trị — PK1; hồ sơ bịa vô
            hình khi quét theo policy), **KHÔNG phải vì validator chặn.** Bản nào đặt tiền cọc hay bất
            kỳ giá trị nào vào ô hồ sơ phải cân lại chỗ này TRƯỚC.

U-GOV     việc KHÔNG ĐẢO NGƯỢC ĐƯỢC đòi đồng thuận quản trị:             (`:228-236`)
            needs_consent = (entry_out.status == Retired)
                          ∨ governed_fields_changed(entry_in, entry_out)
            !needs_consent  ∨  governance_consented(tx, entry_in.governance_ref)
          với `governed_fields_changed` khoá ĐÚNG BA trường — `governance_ref`, `accepted_assets`,
            `cut_bps` (`platform.ak:172-174`).
          ⇒ dùng `governance_ref` CŨ: bên đương nhiệm phải đồng ý cả khi bị thay.

U-GOV2    ĐỔI governance_ref = BÀN GIAO HAI CHIỀU:                       (`:243-246`)
            entry_out.governance_ref == entry_in.governance_ref
            ∨ governance_consented(tx, entry_out.governance_ref)
          ⇒ U-GOV đã đòi ref CŨ; dòng này đòi thêm ref MỚI phải CHẠY ĐƯỢC ngay trong tx bàn giao.
            Thiếu nó, "đồng thuận quản trị" của mọi việc SAU đó treo vào một hash chưa ai chứng minh là
            script sống — ép 28 byte là guard cú pháp, không phải bằng chứng tồn tại (PoC `newC4` PASS
            trước bản vá). Không đổi ref thì không phát sinh nghĩa vụ nào thêm.
```

**Cổng quản trị KHÔNG phủ hết phần khả biến** — U-GOV khoá ba trường, còn `Active → Paused` chỉ cần một
chữ ký authority. Bảng đếm đầy đủ ở §2 ("hai cấp quyền khác nhau"); đây là chỗ nó được ép.

> **`status` KHÔNG nằm trong `mutable_fields_valid`** — vì mọi giá trị `PlatformStatus` đều hợp lệ về
> mặt **cấu trúc** (`platform.ak:162-167` không nhắc tới nó). Ràng buộc **vòng đời** ép riêng qua
> U-TERMINAL + U-GOV + U-REVIVE.

**U-SINGLE đếm theo PAYMENT SCRIPT HASH** (`util.ak:69-75`) — KHÔNG full-address: chống
double-satisfaction N× hồ sơ khác stake-cred (đúng lỗ C1/C2 mà Distribution sửa, generators còn hở —
`Treasury/FEAT.md §2.2`).

> ⚠ **Hệ quả đã đo của phép đếm ấy, cố ý không vá** (`registry.ak:41-49`): ô hồ sơ RA vẫn có thể mang
> stake credential KHÁC ô cũ — U-ADDR ép nó là `None`, nên ca còn lại là "ai đẩy được một tx hợp lệ thì
> gắn được stake credential của mình" chỉ đúng với bản TRƯỚC U-ADDR (PoC `newD` PASS khi đó). Sau v2.1,
> U-ADDR ghim ô ra về enterprise ⇒ đường này đóng. Ghi lại vì mã còn giữ nguyên chú thích cũ.

### 4.2 `MigrateEntry` — 14 mã (`registry.ak:253-313`)

Di trú đưa hồ sơ sang một validator `registry` KHÁC. Có nhánh này vì đổi tham số validator thì đổi
script hash, tức đổi địa chỉ — không hồi tố được (`registry.ak:128-131`).

```
M-MINT-0  assets.is_zero(tx.mint)                                        (`:253`)
M-SIG     list.has(tx.extra_signatories, registry_authority)             (`:256`)
          ⇒ KHÔNG có ngoại lệ kiểu U-REVIVE ở nhánh này.
M-GOV     governance_consented(tx, entry_in.governance_ref)              (`:259`)
          ⇒ luôn đòi, không điều kiện: di trú đưa hồ sơ ra khỏi quyền tài phán của validator này, nên
            platform phải đồng ý.

M-DEST    len(new_registry_hash) == 28  ∧  new_registry_hash != own_hash  (`:264-265`)
            count_inputs_at_script(tx.inputs, own_hash) == 1              (`:266`)
            count_outputs_at_script(tx.outputs, new_registry_hash) == 1   (`:267`)
          ⇒ ràng buộc 28 byte loại rác ĐỘ DÀI SAI (`#"00"`, `#""`): `is_at_script` chỉ so bytes, nên
            thiếu nó thì beacon NFT + min-ADA bay tới một địa chỉ không thể là script.
          > ⚠ **ĐỌC ĐÚNG SỨC MẠNH: đây CHỈ là kiểm ĐỘ DÀI**, không phải "đích là script hash THẬT".
            Kiểm bằng thực thi (PoC `newF` PASS): di trú tới `Script(beacon_policy)` — một script chỉ
            có `mint` + `else fail`, không có handler `spend` — vẫn ĐƯỢC NHẬN, và hồ sơ ở đó KHÔNG BAO
            GIỜ tiêu được nữa. Validator không tự đối chiếu hash đích với blueprint được (nó không biết
            mã của script đích). Việc đó thuộc QUY TRÌNH DUYỆT DI TRÚ: người duyệt phải so
            `new_registry_hash` với hash trong `plutus.json` của bản registry mới TRƯỚC khi ký. Không
            có lớp mã nào thay được bước đó (`registry.ak:83-90`).

M-ADDR    util.has_no_stake_part(reg_out.address)   (v2.1)               (`:275`)
          ⇒ cùng lỗ với U-ADDR, và ĐẮT HƠN ở đây: hồ sơ vừa rời quyền tài phán này, nên nếu nó hạ cánh
            ở biến thể stake của registry MỚI thì bên tiếp nhận quét địa chỉ enterprise sẽ thấy MỘT SỔ
            TRỐNG, và không đường nào ở đây gọi nó về được nữa (`registry.ak:271-274`).

M-ID      platform.identity_preserved(entry_in, entry_out)  — SÁU trường (`:281`)
M-STATUS  entry_out.status == entry_in.status                            (`:283`)
          ⇒ chống Retire trá hình: di trú KHÔNG phải cửa gỡ niêm yết.
M-VER     new_spec_version > entry_in.spec_version                       (`:285`)
            ∧ entry_out.spec_version == new_spec_version                 (`:286`)
          ⇒ chỉ TIẾN, và datum ra phải khai đúng phiên bản đã tuyên trong redeemer.
M-MUT     platform.mutable_fields_valid(entry_out)                       (`:289`)
          ⇒ thiếu dòng này, nhánh CỨU tự ghi ra hồ sơ khoá chết (gov rỗng / cut_bps ngoài dải) ở
            registry mới — nhánh cứu tự tạo lại đúng cái nó sinh ra để cứu (`registry.ak:101-106`).

M-GOVSELF-OUT entry_out.governance_ref != new_registry_hash              (`:295`)
            ∧ entry_out.governance_ref != own_hash                       (`:296`)
          ⇒ hai biến thể của cùng lỗ U-GOVSELF-OUT, cả hai đều có PoC PASS trước bản vá:
            · `== new_registry_hash` (PoC `poc_new_b`) ⇒ hồ sơ BRICK NGAY khi tới registry mới, vì
              validator mới mang cùng ràng buộc S-GOVSELF trên datum VÀO;
            · `== own_hash` (PoC `poc_new_b2`) ⇒ không brick, nhưng cổng đồng thuận về sau chỉ còn
              nghĩa "có ai đó tiêu một ô hồ sơ bất kỳ ở registry CŨ" — thủ tục rỗng.

M-GOV2    entry_out.governance_ref == entry_in.governance_ref            (`:301-304`)
            ∨ governance_consented(tx, entry_out.governance_ref)
          ⇒ cùng luật U-GOV2. Thiếu nó, Migrate là CỬA SAU đi vòng qua U-GOV2: M-GOV chỉ đòi ref CŨ,
            M-ID không gồm `governance_ref`, M-MUT chỉ ép ĐỘ DÀI 28. Ca `migrate_gov_ref_change_ok`
            PASS trước bản vá chính là lỗ đó (`registry.ak:107-115`).

M-SHAPE   shape_custodial(entry_in) == shape_custodial(entry_out)        (`:306`)
M-NFT     beacon NFT có ở cả vào lẫn ra                                  (`:309-310`)
M-VALUE   util.value_not_drained(reg_in.value, reg_out.value)            (`:313`)

KHÔNG ép U-TERMINAL ở nhánh này — CỐ Ý.
else fail — KHÔNG xoá hồ sơ (retire = status, không spend-burn — PK5).
```

> **Vì sao nhánh di trú cố ý KHÔNG áp U-TERMINAL** (`registry.ak:118-120`): nếu áp cả hai nhánh thì mỗi
> lần xoay quyền đăng ký (đổi `registry_authority` ⇒ đổi script hash ⇒ phải di trú từng hồ sơ) sẽ làm
> **mọi hồ sơ `Retired` kẹt vĩnh viễn** ở validator cũ — beacon NFT không đi theo được, phá thẳng cam kết
> PK5 "beacon sống suốt đời, dấu vết kiểm toán không đứt". Di trú không phải cửa Retire trá hình:
> M-STATUS ép `status` KHÔNG đổi.

> ⚠ **GIẢ ĐỊNH LOAD-BEARING — MẤT KHOÁ AUTHORITY ⇒ TOÀN SỔ ĐÔNG CỨNG** (`registry.ak:122-126`). U-SIG và
> M-SIG đều đòi ĐÚNG `registry_authority` được nướng vào tham số, kể cả nhánh cứu MigrateEntry (M-SIG đòi
> authority CŨ). Mất khoá là không hồ sơ nào cập nhật hay di trú được nữa. Đường đóng đúng là chuyển
> `registry_authority` sang một script nhiều chữ ký / DAO, KHÔNG phải thêm luật ở validator. Chốt v2:
> KHÔNG vá bằng mã.

> ⚠ **GIẢ ĐỊNH LOAD-BEARING — v1 "hai bên" THỰC CHẤT LÀ MỘT BÊN** (`util.ak:211-214`).
> `Specs/CONTRACT.md:129-131, 284-286` đặt `registry_authority` và `governance_ref` là CÙNG một committee
> bootstrap. Rào hai bên (U-GOV/M-GOV) chỉ có nghĩa thật khi platform vận hành `governance_ref` riêng.
> Đây là cấu hình triển khai, không vá được bằng mã.

> ⛔ **F7 (vá lần 2 — reconcile): `registry` KHÔNG gác custody on-chain.** `registry.ak` (UpdateEntry) chỉ
> ép U-* về ENTRY (status/identity/mutable/NFT/authority) — **KHÔNG đọc custody UTxO**, và **custody
> validator (`custody.ak`) KHÔNG đọc registry** (không reference input registry ở nhánh Collect/Release).
> Hai validator **độc lập hoàn toàn về dòng tiền**. Hệ quả: `entry.status` (kể cả `Retired`) là **NHÃN
> DISCOVERY**, KHÔNG phải van chặn — đặt Retired KHÔNG dừng được Collect/Release ở custody (kho vẫn thu/
> chi qua `governance_ref` riêng). Người tin "Retired = quỹ đóng" HIỂU NHẦM (CONTRACT PK10). **v1.x nếu
> muốn Pause THẬT:** custody param thêm `registry_beacon_policy` + đọc entry qua reference input + nhánh
> Collect/Release ép `entry.status == Active`. Đánh đổi: +1 reference input/tx custody + ràng buộc vòng đời
> custody↔registry. v1 KHÔNG làm — tách tầng PK1 (registry = con trỏ; custody = kho).

---

## 5. Phá vòng beacon↔registry — chiều v2 (đảo so với v1)

**Vòng (nếu naïve):** `registry_beacon` muốn ép ô hồ sơ đáp đúng ở registry → cần param `registry_hash`;
`registry` muốn ép beacon NFT → cần param `beacon_policy = hash(registry_beacon(...))`. Hai bên cần hash
của nhau trước khi biên dịch → vòng, không deploy được. Phải cắt một chiều. **v1 và v2 cắt hai chiều
khác nhau**, và chỗ đó quyết định lỗ R-OUT-1 ở §3.

| | v1 | v2 (mã trên đĩa) |
|---|---|---|
| Bên bị cắt tham số | `registry_beacon` bỏ `registry_hash` | `registry` bỏ `beacon_policy` (`registry.ak:5-7`) |
| Bên đó lấy thông tin ở đâu | self-ref NFT: chọn ô ra bằng "token tôi vừa mint" | đọc từ datum: `entry_in.beacon_policy` (`registry.ak:155`) |
| Biên dịch trước | `registry_beacon(authority)` | `registry(authority)` (`registry.ak:144`) |
| Biên dịch sau | `registry(authority, beacon_policy)` | `registry_beacon(authority, registry_hash)` (`registry_beacon.ak:74`) |
| Cửa đúc ép được đích không | **KHÔNG** — chỉ ép `!is_vk` (Script bất kỳ) | **CÓ** — `is_at_script(entry_out.address, registry_hash)` (`registry_beacon.ak:93`) |

**Vì sao đảo.** Chiều v1 để hở đúng một thứ: hồ sơ đặt ở một script LẠ vẫn qua cửa đúc, và khi đó
`registry.ak` không có quyền tài phán — U-ID/U-SIG/U-TERMINAL/U-NFT đều không áp. Kiểm bằng thực thi
2026-08-04 (`registry_beacon.ak:9-13`). Đảo chiều là cách DUY NHẤT ép được đích ngay tại cửa sinh: bên
đúc phải biết hash đích, nên bên kia phải là bên bị cắt tham số.

Self-ref NFT KHÔNG bị bỏ — `output_with_token` vẫn là cách CHỌN ô ra (`registry_beacon.ak:92`,
`util.ak:101-109`). v2 chỉ ép thêm một dòng lên ô đã chọn. Gương mẫu `custody_seed` Treasury
(`Treasury/EXEC.md §16`) vì thế vẫn đứng.

**Cái giá phải trả, ghi rõ không giấu.** `beacon_policy` nay là **lời tự khai trong datum**, và
`registry.ak` đọc thẳng lời khai đó. Ở đường ĐĂNG KÝ thật thì R-POLICY ép nó khớp policy id thật
(`registry_beacon.ak:112`), nên hồ sơ hợp lệ không nói dối được. Nhưng một UTxO **TỰ DỰNG** đặt thẳng ở
địa chỉ `registry` với `beacon_policy` khai bậy vẫn tồn tại được — không validator nào chạy lúc TẠO một
UTxO (`platform.ak:19-22`).

> ⛔ **ĐÍNH CHÍNH 2026-08-15 — đừng kế thừa câu "nó trơ".** Bản trước của mục này viết rằng ô tự dựng
> muốn chi tiêu vẫn phải có chữ ký authority. Câu đó **SAI**, và audit đối kháng (lĩnh vực cardano) đã
> dựng PoC PASS (`platform.ak:23-35`, `registry.ak:11-16`). Đường đi: ngoại lệ U-SIG ở
> `registry.ak:218-224` nhận `pure_revive ∧ governance_consented(entry_in.governance_ref)`. Trong ô tự
> dựng thì kẻ dựng khai CẢ BA lời — `beacon_policy`, `governance_ref` (trỏ script hắn kiểm soát),
> `status: Paused` — rồi chi tiêu `Paused → Active` với `extra_signatories: []`. S-GOVSELF không chặn:
> nó chỉ cấm `governance_ref == own_hash`, còn đây là script CỦA KẺ DỰNG.
>
> Thứ ĐỠ hôm nay là ĐÚNG MỘT điều, và nó thuộc tầng ứng dụng chứ không phải tầng validator: hồ sơ bịa
> không mang beacon NFT thật nên **không hiện ra khi quét sổ theo policy**, và sổ KHÔNG giữ giá trị
> (PK1) nên chẳng có gì để rút. ⟹ **Bản nào đặt tiền cọc hay bất kỳ giá trị nào vào ô hồ sơ phải cân
> lại chỗ này TRƯỚC.**

**Cái đã ĐÓNG nhờ đảo chiều:** hồ sơ đặt ở Script LẠ. R-OUT-1 v2 ép đúng `Script(registry_hash)`, và
R-ADDR ép tiếp biến thể enterprise. Đây là lý do known-gap GAP-5 ở §7 không còn đúng như viết — xem ghi
chú tại chỗ.

---

## 6. Off-chain SDK

ES modules, Lucid Evolution (gương `Treasury/offchain`). Bốn nhóm hàm:

### 6.1 `onboard` — điều phối ba cửa
`onboard(config) -> { instanceId, custodyHash, seedPolicy, platformId }`. Gọi tuần tự:
1. **cửa 1** `seedCustody()` (tái dùng Treasury custody_seed off-chain) → `instance_id/custody_hash/
   seed_policy`;
2. **cửa 2** `registrationBuilder()` → entry UTxO niêm yết;
3. trả handle để **cửa 3** `collectAdapter` dùng. Một hàm cho team eco chạy trọn onboard.

### 6.2 `registrationBuilder` — build tx RegisterPlatform / UpdateEntry
- `planRegister(params)` — mint beacon NFT + tạo entry UTxO (datum `PlatformEntry`, status Active).
  Gương R-MINT-1/R-OUT-1/R-WF/R-NAME **TRƯỚC** khi build (tự kiểm well-formed off-chain, không để
  validator reject vô ích). **R-BIND (mới):** nhận `custodyUtxo: CustodyRef` + gương R-BIND fail-fast
  qua `verifyCustodyBinding` — custody ref PHẢI mang đúng 1 NFT authenticity `(seed_policy, instance_id)`
  Ở `Script(custody_hash)`, nếu thiếu/sai ném `REG-BIND`. `RegisterPlan.custodyRef` báo caller phải
  `readFrom` UTxO custody này khi dựng tx thật (reference input on-chain). Custody phải seed TRƯỚC.
- `verifyCustodyBinding(custody, seedPolicy, instanceId, custodyHash) -> {ok, reason?}` — gương R-BIND
  thuần (kiểm NFT qty==1 + script hash địa chỉ == custody_hash). Dùng cả ở builder (fail-fast) lẫn audit.
- `planUpdateEntry(entryIn, changes, beaconPolicy, authority)` — spend entry, tạo entry_out đổi mutable
  fields (gồm `status`). Gương U-ID (giữ SÁU trường định danh —
  `offchain/src/registrationBuilder.ts:242-250`) + U-MUT + U-NFT. **U-TERMINAL (mới):** reject nếu
  `entryIn.status === "Retired"` (ném `UPD-TERMINAL`) — Retired terminal, không revive.

### 6.3 `collectAdapter` — sự kiện app → CollectItem (cửa 3, FEAT §2)
- `collectAdapter(events) -> CollectItem[]` — map sự kiện platform `{amount đã định giá, category}` sang
  `CollectItem{app_id, policy, name, amount, category}` (schema Treasury). Pricing **KHÔNG ở đây** (app
  điền `amount`).
  > ⛔ **F8 (vá lần 2): `app_id` trong CollectItem là VÔ DANH on-chain.** `app_id` chỉ nằm ở **redeemer**
  > Collect, KHÔNG neo vào CustodyDatum (Treasury chưa có `receipt_root` — `Treasury/TECH.md §6`). Sau khi
  > tx confirm, không hash/UTxO nào chứng thực `app_id` đã khai. **VP/uy tín KHÔNG được tin `app_id` từ
  > Collect** để cấp tín dụng C1 (MAGIC tiêu thụ) tới khi receipt được thực thi — nếu tin, kẻ tấn công khai
  > `app_id` người khác để bơm VP. receipt_root là v1.x hoặc bỏ lời hứa. (CONTRACT PK11.)
- `buildCollectBatchTx(items)` — gom N item thành một `Collect` settlement tx (tái dùng `buildCollectTx`
  của Treasury). Batch theo cửa-sổ (tham số mở).

### 6.4 `registryQuery` — discover (FEAT §3)
- `discoverPlatforms(utxos, beaconPolicy, opts?) -> DiscoveredPlatform[]` — lọc UTxO mang beacon NFT,
  decode `PlatformEntry`, gương R-NAME (`platform_id == NFT name`, lệch = loại). THUẦN (nhận `utxos[]`
  đã fetch, không cần chain). Trả kèm 2 cờ cảnh báo audit:
  - **`duplicate`** (audit #2): TRUE cho MỌI entry có `platform_id` xuất hiện ≥2 lần trong lô — KHÔNG im
    lặng chọn cái đầu. On-chain KHÔNG ép `platform_id` duy nhất (beacon không one-shot) → đây là VAN dedup
    off-chain. `findDuplicatePlatformIds(platforms)` trả map id→entry trùng (rỗng = sạch).
  - **`foreignScript`** (audit #3): nếu cấp `opts.registryScriptHash`, TRUE khi `utxo.scriptHash` khác
    registry thật (beacon NFT bị gửi ra ngoài registry validator).
- **`verifyEntryAgainstCustody(entry, custodyUtxo) -> {ok, reason?}` (audit #6 — BẮT BUỘC trước route phí):**
  `discoverPlatforms` CHỈ đọc datum → KHÔNG đủ tin (entry có thể khai `seed_policy/instance_id/custody_hash`
  bất kỳ). Người tin (route phí) PHẢI gọi hàm này đối soát entry với UTxO custody THẬT, gương R-BIND
  on-chain: (1) `quantity_of(custody.value, seed_policy, instance_id) == 1`; (2) custody payment
  credential (script hash) == `entry.custody_hash`. R-BIND ép lúc ĐĂNG KÝ; reader hậu kỳ vẫn nên đối
  soát lại (custody có thể đã được spend/đổi sau register).
  > ⛔ **F13 (vá lần 2 — nhấn mạnh): `verifyEntryAgainstCustody` + dedup CHỈ là VAN SDK, KHÔNG bất biến
  > on-chain.** SDK KHÔNG thể ép người tích hợp gọi — đây là kỷ luật phía caller. **Người tích hợp PHẢI gọi
  > `verifyEntryAgainstCustody` + `findDuplicatePlatformIds`/`duplicate` (audit #2) TRƯỚC khi route phí.**
  > Bỏ qua = route phí tới custody giả mạo (entry nói dối) hoặc entry trùng `platform_id`. Đây là known-gap
  > còn lại (van quy trình, không mật mã) — xem GAP-2/GAP-4 §7.
- `getPlatform(platform_id)` / `findPlatform(platforms, id)` — đọc/tìm một entry (findPlatform trả cái
  ĐẦU — KHÔNG an toàn khi `duplicate` → kiểm `findDuplicatePlatformIds` trước).
- `reconcileWithCustody(entry)` — đọc custody datum của `instance_id`, đối soát `(cut_bps, accepted_assets,
  governance_ref)`; custody là chuẩn (PK7) → cảnh báo nếu entry lệch.

`decodePlatformEntry` / `encodePlatformEntry` — schema `Data.Object`/`Data.Enum` **khớp ĐÚNG** Constr
order §2 (**11 trường**, status enum 0/1/2 — `offchain/src/registryDatum.ts:127-137, 152-162`). Lệch thứ
tự phá decode (cùng quy tắc Treasury datum). Redeemer spend cũng đã có nhánh
`MigrateEntry = Constr(1, [bytes, int])` (`offchain/src/registryDatum.ts:192`) và hàm dựng tương ứng
`planMigrateEntry` (`offchain/src/registrationBuilder.ts:865`).

---

## 7. Bất biến + lý do quyết định (4 trục build mode)

| Bất biến | Ép ở | Lý do (trục) |
|---|---|---|
| **PK2 beacon-per-platform** | `registry_beacon` R-MINT-1/R-OUT-1 | **first-principles + tối ưu:** bỏ UTxO trung tâm → bỏ contention tuần tự + O(N) bloat (vết `consumed_proposals` §10 H3). Discover = quét policy O(1). |
| **PK3 authority-gated, curated** | R-SIG / U-SIG | **bền vững:** uy tín registry = uy tín platform trong đó; chống chiếm tên + rác. `platform_id` duy nhất KHÔNG cần state trung tâm (Cardano không ép unique asset-name) → authority ký không trùng. |
| **PK4 identity SÁU trường bất biến** | U-ID + M-ID (`platform.ak:143-145`) | **first-principles:** đổi định danh = platform khác → phải đăng ký mới, không lén qua update. v2 thêm `beacon_policy` vào nhóm. |
| **PK5 retire = status, NO-BURN** | else-fail (cả 2) + U-MINT-0 | **dài hạn + bền vững:** beacon sống suốt đời → audit trail không đứt, `platform_id` không tái cấp; đồng nhất no-burn LAMP/Treasury. |
| **R-BIND entry trỏ custody THẬT** | `registry_beacon` R-BIND (ref-input) | **an toàn (đóng audit #6 mức đăng ký):** entry KHÔNG nói dối custody — `(seed_policy, instance_id, custody_hash)` phải khớp custody THẬT đã seed (ref-input mang NFT authenticity @ Script(custody_hash)). Buộc onboard tuần tự seed→register. |
| **U-TERMINAL Retired = trạng thái CUỐI** | `registry` U-TERMINAL (`entry_in.status != Retired`) | **bền vững:** vòng đời một chiều Active⇄Paused→Retired; cấm revive Retired→Active (đóng GAP-1 cũ — thứ tự status NAY ép on-chain, không còn là chính sách authority off-chain). |
| **PK6 governance_ref RIÊNG/platform** | R-WF (`len == 28` — `platform.ak:134`) + R-GOVLIVE + checklist onboard | **bền vững (tách quyền):** #1B Treasury **ĐÓNG** (F10 — spec_hash gồm instance_id); dùng chung KHÔNG còn replay chéo. PK6 nay là **khuyến nghị tách quyền release** (blast-radius nhỏ), không bắt buộc bởi replay. Governance commit đúng instance_id khi tạo proposal. |
| **PK1 registry KHÔNG giữ value** | R-OUT-1 (entry = NFT+min-ADA) + tách custody | **first-principles:** registry là con trỏ, value ở custody. Sai tầng = bloat + lẫn quyền. |
| **phá vòng, chiều v2** | R-OUT-1 (chọn ô ra bằng token vừa mint, RỒI ép đúng `Script(registry_hash)`) | **first-principles + an toàn:** deploy một chiều **registry → beacon** (đảo so với v1 — §5), nhờ đó cửa đúc ép được đích. Giá phải trả: `beacon_policy` thành lời tự khai trong datum. |
| **đếm payment-script-hash** | U-SINGLE (`count_*_at_script`) | **an toàn:** chống double-satisfaction N× entry khác stake-cred (lỗ C1/C2 Distribution). |
| **R-MINT-2 least-authority (F5)** | `registry_beacon` R-MINT-2 (`length(policies(tx.mint))==1`) | **bền vững + first-principles:** tx đăng ký chỉ mint policy beacon, không gánh mint policy ngoài (đối xứng custody_seed S-MINT-2). |
| **PK10 status = nhãn discovery (F7)** | KHÔNG ép on-chain (registry ⊥ custody) | **reconcile:** registry không gác custody — status không chặn dòng tiền; ghi rõ chống hiểu nhầm "Retired=quỹ đóng". v1.x custody đọc entry nếu cần Pause thật. |
| **PK11 app_id vô danh (F8)** | KHÔNG neo on-chain (chưa receipt_root) | **reconcile (an toàn VP):** VP không tin app_id từ Collect tới khi receipt thực thi (chống bịa C1). |

**Tổng hợp 4 trục:**
- **(a) Dài hạn — open SDK:** Registry là khuôn để **mọi** team Cardano dựng platform tương tự
  MagicLamp mà không fork → mỗi platform một caller `collectToTreasury` → cầu LAMP.
- **(b) First-principles — beacon:** discover = "tập UTxO mang một policy" thay vì danh bạ ai-đó-vận-hành;
  duy nhất id bằng kỷ luật ký (Cardano không ép unique asset-name) thay vì state trung tâm.
- **(c) Tối ưu — no-contention:** beacon-per-platform → register/update/discover song song, O(1)/thao tác,
  không UTxO nóng tuần tự, không O(N) bloat.
- **(d) Bền vững — authority-curated:** sổ niêm yết uy tín (chống chiếm tên/rác), no-burn (lịch sử bền),
  quyền tách bạch (authority gác niêm yết ≠ governance gác value), lộ trình committee → DAO.

### Đã đóng (đánh dấu — không còn gap)
- **~~GAP-1 vòng đời status~~ — ĐÓNG bằng U-TERMINAL.** Cấm Retired→Active NAY ép cứng on-chain
  (`registry` U-TERMINAL: `entry_in.status != Retired`), không còn là chính sách authority off-chain.
  Off-chain `planUpdateEntry` gương (`UPD-TERMINAL`). (§4.)
- **audit #6 custody (mức ĐĂNG KÝ) — ĐÓNG bằng R-BIND.** Entry không nói dối custody lúc register:
  `registry_beacon` ép reference-input custody mang đúng 1 NFT authenticity `(seed_policy, instance_id)`
  Ở `Script(custody_hash)`. (§3.)

### Known-gap (đánh dấu — chờ; ghi rõ van + lộ trình)
- **GAP-2 (audit #2) — `platform_id` duy nhất = AUTHORITY-CURATED, CHƯA bất biến mật mã.** `registry_beacon`
  KHÔNG one-shot (không consume genesis ref) → on-chain KHÔNG biết `platform_id` đã mint trước đó; R-MINT-1
  chỉ ép "mint đúng 1 token/tx". Tính duy nhất dựa **van quy trình** (KHÔNG bất biến mật mã):
  (1) `registry_authority` (committee→DAO) không ký 2 lần cùng `platform_id`; (2) SDK dedup —
  `discoverPlatforms` đánh dấu `duplicate=true` cho mọi entry trùng + `findDuplicatePlatformIds` liệt kê
  (caller route phí PHẢI kiểm trước khi tin). Đề xuất v1.x đóng bằng bất biến mật mã: **one-shot
  `genesis_ref` per platform** (consume một UTxO duy nhất → asset-name duy nhất, mẫu `custody_seed`) hoặc
  **registry-state roster** (đánh đổi: thêm contention — cân nhắc kỹ). (CONTRACT §3.2.)
- **GAP-3 (audit #4) — `registry_authority` hiện 1 vkh = single point of failure.** Param hiện 1 `ByteArray`
  (1 key-hash) → một khóa rò = chiếm tên/onboard rác. NÊN nâng lên **multisig/committee script** (M-of-N
  native/Plutus), `governance_ref` committee → DAO. Lộ trình ở EXEC §6.1. Trước mainnet PHẢI là committee
  multisig, KHÔNG key đơn.
- **GAP-4 (audit #6, hậu kỳ) — discover chỉ đọc datum, KHÔNG đủ tin để route phí.** R-BIND đóng ở mức
  ĐĂNG KÝ; nhưng reader hậu kỳ (custody có thể đã spend/đổi sau register) PHẢI gọi
  `verifyEntryAgainstCustody(entry, custodyUtxo)` đối soát với custody THẬT trước khi route phí. Van SDK,
  không phải gap on-chain — ghi rõ để caller không tin mù datum.
- **~~GAP-5 (audit #3) — hồ sơ lạc chỗ ở Script lạ~~ — ĐÓNG bằng R-OUT-1 v2 + R-ADDR v2.1.** Mô tả cũ
  ("`registry_beacon` chỉ ép output ở Script **bất kỳ**") là của **v1** và nay SAI. Cửa đúc ép đúng
  `Script(registry_hash)` (`registry_beacon.ak:93`) rồi ép tiếp biến thể enterprise
  (`registry_beacon.ak:102`) — đảo chiều tham số là thứ làm được việc đó (§5). Cờ `foreignScript` của
  `discoverPlatforms` GIỮ LẠI: nó vẫn bắt được ô TỰ DỰNG mà không validator nào chạy lúc tạo
  (`platform.ak:19-22`), thứ R-OUT-1 không đụng tới.
- **~~GAP-6 — `governance_ref` riêng vì replay-chéo #1B~~ — KHÔNG còn là gap an toàn (vá lần 2 F10).**
  #1B đã ĐÓNG ở Treasury (`spend_spec_hash` gồm `instance_id` — `Treasury/CONTRACT.md §10 H1B`): dùng chung
  `governance_ref` KHÔNG còn gây replay-chéo. PK6 (governance_ref riêng) NAY giữ như **khuyến nghị tách
  quyền release** (blast-radius nhỏ), KHÔNG còn ràng buộc an toàn cứng. R-WF nay đòi chặt hơn `≠ ""`:
  `len(governance_ref) == 28` (`platform.ak:134`), cộng R-GOVLIVE bắt cổng quản trị chạy thật lúc đăng ký.
  ⛔ Yêu cầu interface thay thế: Governance commit đúng `instance_id` khi tạo proposal. (CONTRACT §5, PK6.)

---

## 8. Phản hồi vá audit lần 2 (vòng 2026-06-15)

Đợt vá thứ hai chạm Registry: 1 lỗ on-chain (F5), 2 reconcile (F7, F8), 1 known-gap nhấn mạnh (F13),
+ hệ quả #1B đóng (F10). Code đã áp; spec này mô tả lại.

| Lỗ | Mức | Sửa gì | Mã | Nơi | Code |
|---|---|---|---|---|---|
| **F5** | major | `registry_beacon` ép `length(policies(tx.mint)) == 1` (least-authority — không gánh mint policy ngoài; đối xứng custody_seed S-MINT-2 Treasury). | R-MINT-2 | §3 R-MINT-2, §1 sơ đồ, §7 bảng | registry_beacon.ak L37 |
| **F7** | reconcile | Registry status (Paused/Retired) KHÔNG gác custody on-chain (custody ⊥ registry). status = nhãn discovery, KHÔNG van chặn dòng tiền; "Retired=quỹ đóng" là HIỂU NHẦM. v1.x: custody đọc entry qua reference nếu muốn Pause thật. | PK10 | CONTRACT §4 + PK10, §4 note, §7 bảng | registry.ak (không ref custody) |
| **F8** | reconcile | `app_id` (CollectItem redeemer) vô danh on-chain; CustodyDatum không có `receipt_root`. VP/uy tín KHÔNG tin app_id từ Collect tới khi receipt thực thi (chống bịa C1). receipt = v1.x / bỏ lời hứa. | PK11 | CONTRACT PK11, §6.3 note | (Treasury types.ak — chưa có receipt) |
| **F10** | — (đóng) | #1B ĐÓNG ở Treasury (`spend_spec_hash` gồm instance_id). PK6 governance_ref riêng → từ ràng-buộc-an-toàn thành KHUYẾN NGHỊ tách quyền. GAP-6 hết là gap an toàn. Governance build-side PHẢI commit đúng instance_id. | PK6 | CONTRACT §5/PK6, §7 GAP-6 | (Treasury release.ak) |
| **F13** | known-gap | `verifyEntryAgainstCustody` + dedup chỉ là VAN SDK — người tích hợp PHẢI gọi TRƯỚC khi route phí (SDK không ép được). Bỏ qua = route phí tới custody giả / entry trùng. | — | §6.4 note, CONTRACT §8 | registryQuery (SDK) |

---

## 9. Mô hình đe doạ hệ thống (STRIDE — mức hệ thống)

> Khác **mức mật mã / giao thức**: phân tích kẻ tấn công ở tầng validator nằm ở
> [`Math-Spec.md`](./Math-Spec.md) §8 (bảng T1–T15). Mục này là mức **hệ thống**: hạ tầng, chuỗi
> cung ứng, vận hành, ranh giới tích hợp — thứ mà không validator nào chặn được.

### 9.1 Kiểm kê tài sản

| Tài sản | Loại | Độ nhạy | Mất thì sao |
|---|---|---|---|
| Khoá `registry_authority` | bí mật | **Nghiêm trọng** | Chiếm tên platform, onboard rác, gỡ niêm yết dịch vụ thật |
| Khoá cổng quản trị `governance_ref` từng platform | bí mật | **Nghiêm trọng** | Đồng thuận giả ⇒ đổi được cổng chi tiền của platform đó |
| Script hash `registry` + policy `registry_beacon` | định danh công khai | Cao | Sai một ký tự = định tuyến phí sai địa chỉ |
| Datum `PlatformEntry` của từng hồ sơ | dữ liệu công khai | Trung bình | Bịa hồ sơ ⇒ định tuyến phí tới kho giả |
| Bộ ánh xạ `platform_id → kho` mà SDK dựng | dữ liệu dẫn xuất | Cao | Nguồn duy nhất bên tích hợp dựa vào |
| Toàn bộ giá trị trong kho | giá trị | **Nghiêm trọng** | KHÔNG nằm trong Registry — thuộc Treasury (PK1) |

### 9.2 STRIDE theo thành phần

| Thành phần | S (giả danh) | T (sửa lén) | R (chối bỏ) | I (lộ tin) | D (từ chối dịch vụ) | E (leo quyền) |
|---|---|---|---|---|---|---|
| `registry_beacon` (đúc) | R-SIG chặn kẻ không có `A` | R-POLICY/R-NAME/R-VER/R-EPOCH khoá lời tự khai | mọi đăng ký có chữ ký `A` trên chuỗi ⇒ chối không được | sổ vốn công khai — không có gì để lộ | không có UTxO chung ⇒ không chặn nhau được (T-INDEP) | R-MINT-2 chặn gánh mint policy lạ |
| `registry` (chi tiêu) | U-SIG/M-SIG | U-ID/M-ID + U-VALUE/M-VALUE | chữ ký trên chuỗi | — | U-SINGLE chặn gộp nhiều hồ sơ một tx | U-GOV/M-GOV chặn một bên tự quyết việc không đảo ngược |
| SDK off-chain | — | **chuỗi cung ứng npm** — xem 9.3 | — | biến môi trường chứa khoá | — | bên tích hợp bỏ qua van ⇒ tự hại |
| Người vận hành `A` | phishing / kỹ nghệ xã hội | — | — | rò khoá | — | **khoá đơn = leo quyền toàn phần** |
| Đường chỉ mục (Blockfrost/Kupo) | nhà cung cấp trả dữ liệu sai | dữ liệu chỉ mục cũ | — | lộ mẫu truy vấn | nhà cung cấp chết ⇒ không quét được sổ | — |

### 9.3 Bề mặt tấn công

- **Bên ngoài:** bất kỳ ai cũng dựng được giao dịch tới hai validator. Cổng duy nhất là chữ ký.
- **Chuỗi cung ứng:** SDK off-chain phụ thuộc `lucid` + thư viện CBOR. Một bản phát hành bị chèn mã
  đọc được biến môi trường của bên tích hợp. Ghim phiên bản + kiểm chữ ký gói là bắt buộc.
- **Chỉ mục:** `discoverPlatforms` tin nhà cung cấp chỉ mục. Nhà cung cấp trả thiếu một hồ sơ trùng
  `platform_id` ⇒ van khử trùng ở §6.4 mất tác dụng mà không báo lỗi. Nên đối chiếu ít nhất hai nguồn
  trước khi định tuyến phí.
- **Nội bộ:** người giữ khoá `A`. Hiện là một khoá đơn — xem `Math-Spec.md` §14 L2.

### 9.4 Ranh giới tin cậy

```
   [ bên tích hợp ]  ──đọc──▶  [ chỉ mục ]  ──▶  [ sổ on-chain ]
        │                          ▲                    ▲
        │ tin: SDK + 3 van §6.4    │ KHÔNG tin          │ tin: ledger
        ▼                          │                    │
   [ kho của platform ] ◀──────────┴────────────────────┘
        ▲  gác bởi governance_ref RIÊNG — KHÔNG phải registry_authority
```

Ba đường cắt: (1) `registry_authority` ⊥ giá trị; (2) sổ ⊥ kho (không bên nào đọc bên kia on-chain);
(3) chỉ mục ⊥ sự thật (chỉ mục là tiện ích, không phải nguồn chân lý).

### 9.5 Giới hạn đã chấp nhận

| Đe doạ | Xử lý | Vì sao chấp nhận |
|---|---|---|
| Trùng `platform_id` | van quy trình + van SDK | đóng thật đòi one-shot `genesis_ref`, đánh đổi `platform_id` mất tính đọc được (`Math-Spec.md` §14 L1) |
| `A` là khoá đơn | phải thành multisig trước mainnet | chưa có committee thật |
| Kho tự dựng vẫn qua R-BIND | đối soát ở bên đọc | validator không phân biệt được kho Treasury thật (`Math-Spec.md` §14 L3) |
| UTxO tự dựng ở địa chỉ registry | vô hại, chấp nhận | ledger không chạy validator lúc tạo UTxO (`Math-Spec.md` §8 T2) |
| An ninh vật lý nơi giữ khoá | **ngoài phạm vi** | thuộc quy trình vận hành, không thuộc spec này |

---

## 22. Phụ lục dành cho dự án blockchain

### §22.F Blockchain / Smart Contract (Type F)

**Ngăn xếp**

| Chuỗi | Ngôn ngữ | Công cụ | Kiểm thử |
|---|---|---|---|
| Cardano (eUTxO) | [Aiken](https://aiken-lang.org/) | `aiken check`, `aiken build` | kiểm thử đơn vị trong chính cây `onchain/` |
| Off-chain | TypeScript | `lucid`, `vitest` | `offchain/` |

**Chiến lược nâng cấp.** Cardano không có proxy — nâng cấp = **script mới + di trú datum**. Đây chính
là lý do v2 thêm nhánh `MigrateEntry`:

| Kiểu đổi | Hồi tố được không | Giá phải trả |
|---|---|---|
| Đổi một trường trong datum | **được** | một chữ ký cho mỗi hồ sơ |
| Đổi tham số validator | **không** — đổi script hash, tức đổi địa chỉ | phải di trú từng hồ sơ qua `MigrateEntry` |

Hôm nay chưa có hồ sơ nào trên chuỗi nên chưa phải trả giá. Ghi ra để đợt sau không quên.

**Quyền nâng cấp.** `registry_authority` + đồng thuận `governance_ref` của chính platform (M-SIG +
M-GOV). Không có nút dừng khẩn cấp, và **cố ý không có**: `status` là nhãn niêm yết, không phải van
khoá tiền (PK10). Ai muốn dừng dòng tiền phải dừng ở kho, qua cổng quản trị của kho.

**Oracle.** Registry **không dùng oracle**. Định giá nằm ở app (cửa 3). Ghi ra vì đây là câu hỏi
người audit luôn hỏi.

**Tối ưu phí / ExUnit.**

- Không có UTxO trung tâm ⇒ mỗi thao tác O(1) theo số platform (T-INDEP). Đây là khoản tiết kiệm lớn
  nhất, và nó là quyết định kiến trúc chứ không phải tinh chỉnh.
- R-BIND dùng **reference input** (đọc kho, không tiêu) ⇒ không tranh chấp UTxO kho.
- `accepted_assets` là danh sách trong datum: dài ra thì mọi lần chi tiêu hồ sơ đắt lên. Hiện chưa đặt
  trần — xem "còn thiếu" dưới đây.
- Nên công bố script dưới dạng **reference script** khi deploy, để giao dịch không phải mang cả mã.

**Bố cục lưu trữ (datum).** Thứ tự trường `PlatformEntry` là **hợp đồng liên bên** (Plutus Data mã hoá
theo vị trí). Thêm trường **chỉ được nối vào cuối**, và chỉ kèm tăng `spec_version` + một đường di trú.
Chèn giữa hay đổi thứ tự = phá mọi bên đang decode.

**Lỗ hổng thường gặp — đối chiếu**

| Lỗ | Có áp cho Registry không | Phòng bằng gì |
|---|---|---|
| Double satisfaction | **có** | U-SINGLE; M-DEST (đúng 1 input ở script này) |
| Token dust / nhét token lạ vào UTxO | **có** | R-VALUE, U-VALUE, M-VALUE |
| Rút cạn ADA khỏi UTxO | **có** | U-VALUE `lovelace(out) ≥ lovelace(in)` |
| Đặt hồ sơ ở script lạ để thoát quyền tài phán | **có** (đã từng lọt ở v1) | R-OUT-1 v2 ép đúng `Script(registry_hash)` |
| Đặt hồ sơ ở **biến thể stake** của đúng script ⇒ tàng hình với `utxosAt(enterprise)` | **có** (lọt tới v2 — R-OUT-1 chỉ so payment credential) | R-ADDR, U-ADDR, M-ADDR (v2.1) |
| Datum khai gian (`beacon_policy`, `created_epoch`) | **có** | R-POLICY, R-EPOCH |
| Gánh mint policy ngoài trong cùng tx | **có** | R-MINT-2 |
| Reentrancy | **không** — mô hình eUTxO không có lời gọi lại | — |
| Tràn số nguyên | **thấp** — `Int` của Plutus là số nguyên lớn | dải `cut_bps` vẫn ép ở R-WF/U-MUT |
| Front-running / MEV | **thấp** — không có định giá, không có thứ tự sinh lợi | chữ ký `A` bắt buộc |
| Replay chữ ký | **không** — chữ ký Cardano gắn với thân giao dịch | — |
| Nhạy với tái tổ chức chuỗi | **có** | chờ đủ số block xác nhận trước khi coi đăng ký là chắc |

**Quy trình audit**

| Bậc | Công cụ | Nhịp | Hiện trạng |
|---|---|---|---|
| Kiểm tra tĩnh | `aiken check` | mỗi PR | có |
| Kiểm thử đơn vị | kiểm thử trong cây `onchain/` | mỗi PR | có — số liệu ở [`../DevStatus.md`](../DevStatus.md), KHÔNG chép số vào đây |
| So script hash trước/sau | `aiken build` + đọc `plutus.json` | mỗi lần đụng validator | bắt buộc theo `CLAUDE.md` |
| Chứng minh cơ giới hoá | — | — | **chưa có** (`Math-Spec.md` §14 L6) |
| Audit ngoài | bên thứ ba | trước mainnet | **chưa có** (`Math-Spec.md` §14 L7) |
| Giám sát on-chain | — | — | **chưa dựng** |

**Chỉ tiêu phi chức năng đặc thù blockchain**

| Chỉ tiêu | Mục tiêu | Đo chưa |
|---|---|---|
| Kích thước script (`registry`, `registry_beacon`) | vừa giới hạn giao dịch Cardano | **chưa đo** — chạy `aiken build` rồi đọc `plutus.json` |
| ExUnit mỗi giao dịch đăng ký | chưa đặt ngưỡng | **chưa đo** |
| ExUnit mỗi giao dịch cập nhật | chưa đặt ngưỡng | **chưa đo** |
| Số block chờ trước khi tin một đăng ký | chưa chốt | **chưa chốt** |

Bốn dòng "chưa đo" là **thiếu sót có thật**, không phải chỗ trống hình thức. Đặt ngưỡng rồi mới nói
được câu "đủ rẻ".
