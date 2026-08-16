# Registry — Math-Spec (đặc tả toán: bất biến hình thức, mô hình tin cậy, kẻ tấn công)

| Trường | Giá trị |
|---|---|
| Phiên bản | v0.2.0 |
| Trạng thái | `DRAFT` |
| Tầng phạm vi | `L1` (hạ tầng / nền tảng) |
| Người viết | Registry agent — 2026-08-13 |
| Người duyệt | **chưa ai duyệt** |
| Cập nhật cuối | 2026-08-15 (thêm §13 — tiêu chí biên nhận `T-RECEIPT`) |
| Loại toán | E (đúng đắn thuần) + B (cơ chế, phần quyền hạn) |
| Bộ trạng thái | StandardSpec — `DRAFT / IN-REVIEW / REVISE / APPROVED / CONDITIONALLY-APPROVED / LOCKED / SUPERSEDED / ARCHIVED / ABANDONED` (`TigerAgent/StandardSpec/_shared/overview/SPEC-OVERVIEW.md` Sơ đồ 4) |

> **Nguồn gốc bản này.** Nội dung §7 (mười một bất biến), §6.2 (mô hình tin cậy) và §8 (kẻ tấn
> công) **chuyển từ** `CONTRACT.md` — trước đây nằm ở §8 (dòng 276-312), §3.2 (dòng 110-121) và
> khối "Mô hình tin cậy khi route phí" (dòng 307-312) của bản trước ngày 2026-08-13. Đây là **di
> chuyển**, không phải viết mới. `CONTRACT.md` nay **trỏ sang đây**, không giữ bản sao — hai bản sẽ
> trôi khác nhau.

> ⚠ **Bản này mô tả trạng thái SAU đợt sửa validator v2** (`spec_version = 2`): định danh bất biến
> **sáu** trường, có nhánh di trú `MigrateEntry`, `→ Retired` đòi đồng thuận hai bên. ~~Mã v2 đã nằm
> trên đĩa nhưng **chưa commit** lúc viết~~ — **hết hiệu lực 2026-08-15**: mã v2 đã gộp vào `main`
> (PR #8, merge commit `c63372e`). Vẫn **chưa deploy** mạng nào. Cách tự kiểm: §17.

---

## §1. Tóm lược

Registry là **sổ chỉ đường** on-chain của hệ MagicLamp: mỗi platform một UTxO mang một beacon NFT
và một datum `PlatformEntry` trỏ tới kho (Treasury custody instance) của platform đó. Bản này phát
biểu hình thức **mười một bất biến PK1–PK11**, mô hình tin cậy của bên định tuyến phí, và tập kẻ
tấn công mà hai validator (`registry_beacon` đúc, `registry` chi tiêu) chống được — cùng tập mà
chúng **không** chống được.

Định lý được chứng minh: **T-CUSTODY** (registry không giữ giá trị), **T-INDEP** (đăng ký hai
platform không tranh chấp UTxO), **T-ID6** (sáu trường định danh bất biến trên mọi đường chi tiêu),
**T-SUPPLY** (cung beacon không giảm), **T-CONSENT** (mọi thay đổi không đảo ngược được đòi hai
chữ ký), **T-MIGRATE** (di trú bảo toàn định danh và trạng thái).

Mệnh đề **KHÔNG** chứng minh được và bị bác bằng phản ví dụ: **P-UNIQUE** — tính duy nhất của
`platform_id`. Nó là **van quy trình**, không phải bất biến mật mã. Xem §7 (PK3) và §14.

Phạm vi: chỉ tầng Registry. Kế toán kho, `Collect`/`Release`, split cut → thuộc Treasury
(`LAMP/Treasury/`), không chứng minh ở đây.

---

## §2. Ký hiệu

```
L               trạng thái sổ cái (tập UTxO chưa tiêu) tại một thời điểm
tx              một giao dịch; tx.mint, tx.inputs, tx.outputs, tx.reference_inputs,
                tx.extra_signatories, tx.withdrawals, tx.validity_range
A               registry_authority — khoá (hoặc script) gác niêm yết
H_reg           script hash của validator `registry`
P_b             policy id của `registry_beacon` = hash(registry_beacon(A, H_reg))
pid             platform_id (ByteArray) — cũng là asset name của beacon NFT
iid             instance_id — asset name của NFT xác thực kho
S_seed          seed_policy — policy NFT xác thực kho
H_cust          custody_hash — script hash kho của platform
G               governance_ref — script hash cổng quản trị của chính platform
e               một `PlatformEntry` (datum); e.f = trường f của e
σ(e)            e.status ∈ {Active, Paused, Retired}, mã constructor 0/1/2
v(e)            e.spec_version ∈ ℤ; v2 hiện hành = 2
Id(e)           bộ sáu định danh (e.platform_id, e.instance_id, e.custody_hash,
                e.seed_policy, e.beacon_policy, e.created_epoch)
val(u)          value của UTxO u; val_nat(u) = phần không-lovelace
E(L)            tập "ô hồ sơ" = { u ∈ L : ∃pid, quantity(val(u), P_b, pid) = 1 }
⊢               "giao dịch qua được validator"
```

Quy ước: `≡` là định nghĩa; `⇒` là kéo theo logic. "Kẻ tấn công" viết tắt **𝒜**.

---

## §3. Nguyên thuỷ và giả định

| Mã | Nội dung | Nguồn |
|---|---|---|
| A-LEDGER | Sổ cái eUTxO Cardano: một UTxO chi tiêu đúng một lần; validator chạy khi **chi tiêu** hoặc khi **đúc/đốt**, KHÔNG chạy khi một UTxO được **tạo** ở địa chỉ script | Ledger spec Cardano |
| A-SIG | Ed25519; `tx.extra_signatories` chỉ chứa khoá đã ký hợp lệ giao dịch | Ledger spec |
| A-HASH | blake2b-224 cho script hash; kháng tiền ảnh và kháng va chạm ở mức 112 bit | Plutus |
| A-DATA | `Plutus Data` mã hoá **theo vị trí**: thứ tự trường datum và chỉ số constructor là hợp đồng liên bên | `platform.ak` chú thích trường |
| A-AUTH | 𝒜 không có khoá `A` (nếu có, xem §8 T5) | giả định vận hành |
| A-GOV | Cổng `G` của platform chỉ đồng thuận khi platform thật sự muốn | giả định vận hành |

**A-AUTH và A-GOV là giả định VẬN HÀNH, không phải bảo đảm mật mã.** Mọi định lý dưới đây có tiền
đề này. Bỏ tiền đề ⇒ xem §8.

---

## §4. Mô hình hệ thống

Ba vai, quyền **tách bạch hoàn toàn**:

| Vai | Gác gì | KHÔNG gác gì |
|---|---|---|
| `registry_authority` (A) | niêm yết: đăng ký, đổi nhãn `Active ↔ Paused` | giá trị trong kho |
| `governance_ref` (G, riêng từng platform) | chi giá trị ở kho của platform đó | niêm yết |
| bên định tuyến phí (người đọc sổ) | không gác gì — chỉ **đọc** | — |

Hai tầng dữ liệu:

- **Sổ** (`E(L)`): mỗi phần tử là một UTxO ở `Script(H_reg)` mang đúng một beacon NFT + datum.
- **Kho**: UTxO ở `Script(H_cust)` mang NFT `(S_seed, iid)`, giữ giá trị thật. Thuộc Treasury.

**Không có UTxO trung tâm.** Toàn sổ = quét policy `P_b`.

---

## §5. Định nghĩa giao thức — ba phép chuyển trạng thái

### 5.1 `Register` (đúc — `registry_beacon(A, H_reg)`, redeemer `RegisterPlatform`, constr 0)

Đầu vào: không có UTxO sổ. Đầu ra: một `u ∈ E(L')` mới.

Điều kiện (mã ràng buộc lấy đúng tên trong `registry_beacon.ak`):

```
R-SIG      A ∈ tx.extra_signatories
R-MINT-1   tokens(tx.mint, P_b) = { pid ↦ 1 }
R-MINT-2   |policies(tx.mint)| = 1
R-OUT-1    ∃! o ∈ tx.outputs : quantity(val(o), P_b, pid) = 1  ∧  o.address = Script(H_reg)
R-NAME     e.platform_id = pid
R-POLICY   e.beacon_policy = P_b
R-VER      v(e) = 2
R-WF       entry_well_formed(e)  (mọi định danh ≠ ∅, 0 ≤ cut_bps ≤ 10000,
                                  accepted_assets ≠ [], σ(e) = Active)
R-VALUE    val_nat(o) = { (P_b, pid) ↦ 1 }
R-EPOCH    e.created_epoch = epoch(tx.validity_range)
R-BIND     ∃ r ∈ tx.reference_inputs : quantity(val(r), e.seed_policy, e.instance_id) = 1
                                       ∧ r.address = Script(e.custody_hash)
```

Mọi mục đích khác (kể cả **đốt**) → `fail` (`registry_beacon.ak:109-111`).

### 5.2 `UpdateEntry` (chi tiêu — `registry(A)`, constr 0)

```
U-SIG       A ∈ tx.extra_signatories
U-SINGLE    đúng 1 input ở Script(H_reg)
U-NFT       beacon NFT (e_in.beacon_policy, pid) có ở cả input lẫn output
U-ID        Id(e_in) = Id(e_out)                          [sáu trường]
U-VER       v(e_out) = v(e_in)
U-MUT       mutable_fields_valid(e_out)
U-MINT-0    tx.mint = ∅
U-TERMINAL  σ(e_in) ≠ Retired
U-VALUE     val_nat(out) = val_nat(in) ∧ lovelace(out) ≥ lovelace(in)
U-GOV       ( σ(e_out) = Retired  ∨  governed_fields_changed(e_in, e_out) )
            ⇒ governance_consented(tx, e_in.governance_ref)
```

`governed_fields_changed` = đổi một trong `{governance_ref, accepted_assets, cut_bps}`
(`platform.ak`). `governance_consented(tx, G)` ≡ tx **chi tiêu** một input ở `Script(G)` **hoặc**
mang một withdrawal từ `Script(G)` (`util.ak`).

### 5.3 `MigrateEntry { new_registry_hash, new_spec_version }` (chi tiêu — constr 1)

```
M-SIG      A ∈ tx.extra_signatories
M-GOV      governance_consented(tx, e_in.governance_ref)
M-DEST     new_registry_hash ≠ H_reg ∧ đúng 1 input ở Script(H_reg)
                                     ∧ đúng 1 output ở Script(new_registry_hash)
M-MINT-0   tx.mint = ∅
M-ID       Id(e_in) = Id(e_out)
M-STATUS   σ(e_out) = σ(e_in)
M-VER      new_spec_version > v(e_in) ∧ v(e_out) = new_spec_version
M-NFT      beacon NFT (e_in.beacon_policy, pid) ở cả input lẫn output
M-VALUE    như U-VALUE
```

**KHÔNG** ép `U-TERMINAL` ở nhánh này — cố ý, xem T-MIGRATE.

---

## §6. Tính chất cần chứng minh

### 6.1 Danh sách

| Mã | Phát biểu ngắn | Ứng với |
|---|---|---|
| T-CUSTODY | Sổ không giữ giá trị ngoài beacon NFT + ADA tối thiểu | PK1 |
| T-INDEP | Hai đăng ký khác `pid` không tranh chấp UTxO nào | PK2 |
| T-ID6 | Sáu trường định danh bất biến trên **mọi** đường chi tiêu | PK4 |
| T-SUPPLY | Cung beacon đơn điệu không giảm (không có đường đốt) | PK5 |
| T-CONSENT | Thay đổi không đảo ngược được đòi cả A lẫn G | PK9 mở rộng |
| T-MIGRATE | Di trú bảo toàn định danh + trạng thái, và mở được cho `Retired` | PK5, PK9 |
| T-SEPARATE | A không chi được giá trị; G không niêm yết được | PK3 |
| P-UNIQUE | `pid` duy nhất trên toàn sổ | PK3 — **BỊ BÁC**, xem §14 |

### 6.2 Mô hình tin cậy của bên định tuyến phí *(chuyển từ `CONTRACT.md` khối cuối §8)*

Đọc sổ **không đủ** để tin. Bên định tuyến phí PHẢI làm ba việc, theo thứ tự:

1. **Kiểm trùng `pid`** — `discoverPlatforms` đánh dấu `duplicate`; gọi
   `findDuplicatePlatformIds` trước khi tin (§14 L1).
2. **Đối soát kho thật** — `verifyEntryAgainstCustody(entry, custodyUtxo)`. R-BIND **không** thay
   được việc này: cả ba giá trị R-BIND kiểm đều lấy từ chính datum người đăng ký khai
   (`registry_beacon.ak:92-95`), nên một kho **tự dựng hoàn toàn** (policy riêng + script riêng)
   vẫn qua R-BIND. Đã kiểm bằng thực thi 2026-08-04.
3. **Kiểm dạng của A** — nếu `registry_authority` còn là một key-hash đơn thì **chưa đủ cho
   mainnet** (§8 T5, §14 L2).

Ba việc trên là **van SDK**, validator không ép được. Bỏ qua = định tuyến phí tới kho giả.

---

## §7. Mười một bất biến PK1–PK11 — phát biểu hình thức

*(chuyển từ `CONTRACT.md` §8; phát biểu lại cho hình thức, cập nhật theo v2)*

### PK1 — Registry là con trỏ, không giữ giá trị

> **T-CUSTODY.** ∀ u ∈ E(L) sinh bởi `Register` hoặc bảo toàn bởi `UpdateEntry`/`MigrateEntry`:
> `val_nat(u) = { (P_b, pid) ↦ 1 }`.

*Chứng minh.* Trường hợp cơ sở: R-VALUE ép đúng đẳng thức này tại `Register`
(`registry_beacon.ak:77-81`). Bước quy nạp: U-VALUE và M-VALUE ép `val_nat(out) = val_nat(in)`.
Vậy đẳng thức được bảo toàn qua mọi phép chuyển. ∎

**Giới hạn của T-CUSTODY:** nó chỉ phủ các UTxO **đi qua validator**. Theo A-LEDGER, không validator
nào chạy lúc một UTxO được **tạo** ở địa chỉ `Script(H_reg)`. Xem §8 T2.

### PK2 — Beacon-per-platform, không sổ trung tâm

> **T-INDEP.** Với `pid₁ ≠ pid₂`, tập input bắt buộc của `Register(pid₁)` và `Register(pid₂)` giao
> nhau bằng ∅.

*Chứng minh.* Điều kiện của `Register` (§5.1) không nhắc tới UTxO nào của sổ: R-BIND chỉ đòi một
**reference input** (không tiêu thụ), R-OUT-1 chỉ nói về output. Vậy hai đăng ký chỉ dùng chung
chữ ký `A` — không dùng chung UTxO nào. Không có UTxO nào phải tiêu tuần tự ⇒ không tranh chấp,
chi phí mỗi thao tác O(1) theo số platform. ∎

### PK3 — Có kiểm duyệt, quyền tách bạch

> **T-SEPARATE.** (a) Không giao dịch nào chỉ có chữ ký `A` mà chi được một UTxO kho.
> (b) Không giao dịch nào chỉ có đồng thuận `G` mà tạo được phần tử mới của `E(L)`.

*Chứng minh.* (a) Chi UTxO kho chạy `custody.ak` (Treasury), validator đó không đọc `A` và không
đọc sổ registry. (b) Tạo phần tử mới của `E(L)` đòi đúc beacon NFT ⇒ chạy `registry_beacon` ⇒
R-SIG đòi `A`. ∎

> **P-UNIQUE** (`pid` duy nhất) **KHÔNG** suy ra được từ đây. Xem §14 L1 — đó là mệnh đề bị bác.

### PK4 — Định danh bất biến: **SÁU** trường *(v2 — trước là năm)*

> **T-ID6.** ∀ phép chuyển `UpdateEntry` hoặc `MigrateEntry`: `Id(e_in) = Id(e_out)`, với
> `Id = (platform_id, instance_id, custody_hash, seed_policy, beacon_policy, created_epoch)`.

*Chứng minh.* U-ID và M-ID cùng gọi `platform.identity_preserved`, hàm này so đúng sáu trường
(`platform.ak`). Không có nhánh redeemer thứ ba. ∎

**Vì sao thêm `beacon_policy` vào bộ định danh (v2).** `registry` v2 đọc `beacon_policy` từ **datum**
thay vì từ tham số validator. Nếu trường này đổi được thì U-NFT/M-NFT bị dắt mũi: kẻ chi tiêu khai
một policy tự chế rồi "bảo toàn" một NFT vô giá trị. R-POLICY khoá nó **đúng** tại lúc đúc; T-ID6
khoá nó **mãi** về sau. Hai ràng buộc này phải đi cùng nhau — thiếu một là hỏng.

`spec_version` **không** thuộc `Id`: nó bất biến ở nhánh Update (U-VER) và **tăng nghiêm ngặt** ở
nhánh Migrate (M-VER).

### PK5 — Rút niêm yết = đổi nhãn, KHÔNG đốt

> **T-SUPPLY.** Với mọi `pid`, tổng cung asset `(P_b, pid)` là hàm **không giảm** theo thời gian.

*Chứng minh.* Đốt đòi `tx.mint` âm ở policy `P_b` ⇒ chạy `registry_beacon`. Nhánh duy nhất được
định nghĩa là `Mint` với `RegisterPlatform`, và R-MINT-1 ép `tokens(tx.mint, P_b) = { pid ↦ 1 }`
(lượng dương). Mọi mục đích khác rơi vào `else(_) { fail }` (`registry_beacon.ak:109-111`). Thêm
nữa U-MINT-0 và M-MINT-0 cấm mint/đốt trong lúc chi tiêu. Vậy không có đường giảm cung. ∎

*Hệ quả:* dấu vết kiểm toán không đứt; một `pid` đã cấp không bao giờ trống chỗ để cấp lại.

### PK6 — Mỗi platform một `governance_ref` riêng (khuyến nghị)

Không phải định lý — là **khuyến nghị vận hành**. Ràng buộc máy duy nhất: R-WF và U-MUT ép
`governance_ref ≠ ∅`. Việc "riêng" thì validator không kiểm được (nó không thấy platform khác).

Lý do giữ sau khi lỗ replay-chéo #1B đã đóng ở Treasury (`spend_spec_hash` gồm `instance_id`): **tách
quyền chi** ⇒ bán kính thiệt hại nhỏ khi một cổng quản trị bị chiếm.

### PK7 — Kho là nguồn chân lý cho `(cut_bps, accepted_assets, governance_ref)`

> **Mệnh đề.** Không ràng buộc nào ép ba trường này trong entry khớp datum kho.

*Chứng minh.* `registry.ak` không đọc kho (không có reference input kho ở nhánh spend);
`custody.ak` không đọc sổ. Không có mã ràng buộc nào nối hai bên sau lúc đăng ký. ∎

Vậy entry là **bản sao niêm yết**. Lệch nhau thì **kho là chuẩn**. Đây là điều phải đối soát ở §6.2
bước 2, không phải điều được bảo đảm.

### PK8 — Đăng ký buộc trỏ tới một kho đang tồn tại (R-BIND)

> **Mệnh đề (yếu, có chủ ý).** `Register` chỉ qua được nếu **tồn tại** một UTxO mang đúng 1 NFT
> `(e.seed_policy, e.instance_id)` ở `Script(e.custody_hash)` **tại thời điểm giao dịch**.

*Chứng minh.* R-BIND (`registry_beacon.ak:96-104`). ∎

> ⚠ **Đây KHÔNG phải phép xác thực "kho là Treasury thật".** Cả ba giá trị đều do người đăng ký tự
> khai trong datum. Một kho tự dựng hoàn toàn vẫn qua — kiểm bằng thực thi 2026-08-04. Thứ R-BIND
> mua được chỉ là: **thứ tự onboard bị ép** (kho phải lên chain trước sổ), và entry không trỏ vào hư
> không. Cổng thật lúc đăng ký là chữ ký `A`.

### PK9 — `Retired` là trạng thái cuối của đường Update, KHÔNG cuối của vòng đời hồ sơ *(v2 sửa)*

> **T-TERMINAL-U.** Không giao dịch `UpdateEntry` nào chi tiêu được một entry có `σ(e_in) = Retired`.

*Chứng minh.* U-TERMINAL (`registry.ak:88`). ∎

> **T-MIGRATE.** `MigrateEntry` **được** chi tiêu entry `Retired`, và với mọi giao dịch di trú qua
> được: `Id(e_out) = Id(e_in)` ∧ `σ(e_out) = σ(e_in)` ∧ `v(e_out) > v(e_in)` ∧ đích ≠ `H_reg`.

*Chứng minh.* Nhánh Migrate không gọi U-TERMINAL (`registry.ak:37-39`). Ba đẳng thức là M-ID,
M-STATUS, M-VER; đích khác là M-DEST. ∎

**Vì sao M-STATUS bắt buộc.** Không có nó, di trú thành một đường `Retire` trá hình bỏ qua U-GOV.

**Lỗ mà nhánh này vá.** Trước v2 không có đường di trú: datum không có trường phiên bản, redeemer
không có nhánh, và output bị ép về đúng script hash cũ. Xoay quyền đăng ký ⇒ mọi hồ sơ `Retired`
**kẹt vĩnh viễn**, phá thẳng cam kết PK5 "beacon sống suốt đời, dấu vết kiểm toán không đứt".

### PK10 — `status` là NHÃN NIÊM YẾT, KHÔNG phải van khoá tiền

> **T-NOGATE.** Đặt `σ(e) ∈ {Paused, Retired}` **không** làm thay đổi tập giao dịch hợp lệ ở kho
> của platform đó.

*Chứng minh.* `custody.ak` không có reference input nào tới sổ và không đọc `P_b`. Điều kiện chi ở
kho không chứa biến `σ(e)`. Vậy tập giao dịch hợp lệ ở kho độc lập với `σ(e)`. ∎

**Ai nói "Retired = quỹ đóng" là sai.** `Retired` chỉ ẩn hồ sơ khỏi sổ mặc định; kho vẫn thu/chi
qua cổng `G` riêng của nó. Muốn Pause thật ⇒ cho custody đọc entry qua reference input (đánh đổi:
thêm một reference input mỗi giao dịch kho + ràng vòng đời custody↔registry). v1/v2 **không** làm.

### PK11 — `app_id` / receipt CHƯA neo on-chain

> **Mệnh đề.** `app_id` trong redeemer `CollectItem` không bị ràng buộc bởi bất kỳ điều kiện nào,
> và `CustodyDatum` không có `receipt_root`.

*Chứng minh.* Kiểm bằng đọc `LAMP/Treasury` types — không xuất hiện `receipt_root`. ∎

*Hệ quả bắt buộc:* hệ uy tín / sức bỏ phiếu **KHÔNG được** tin `app_id` lấy từ `Collect` để cấp tín
dụng C1. Ai làm thế là mở đường bịa số. Hoặc thi công receipt, hoặc bỏ lời hứa — không có đường
giữa. Tiêu chí mà bản thi công receipt phải thoả: [§13](#13-biên-nhận--khi-nào-một-chữ-ký-tạo-ra-nghĩa-vụ).

### T-CONSENT — định lý mới của v2 (không có mã PK riêng)

> **T-CONSENT.** Mọi phép chuyển **không đảo ngược được** đều đòi **cả** `A` **và** `G`:
> (a) `σ → Retired`; (b) đổi `governance_ref` / `accepted_assets` / `cut_bps`; (c) di trú.

*Chứng minh.* (a) và (b): U-GOV (`registry.ak:104-114`) cộng U-SIG. (c): M-GOV cộng M-SIG. ∎

> **Nguyên tắc cắt quyền.** Việc **đảo ngược được** thì một bên quyết; việc **không đảo ngược
> được** thì hai bên cùng ký. Vì vậy `Active ↔ Paused` để `A` tự quyết: đó chính là quyền gỡ niêm
> yết một hồ sơ xấu, và nó đảo ngược được. Trước v2, **một chữ ký `A` là đủ** để ngừng hẳn một dịch
> vụ đang sống hoặc đổi cổng chi tiền của họ mà họ không biết.

---

## §8. Mô hình kẻ tấn công

*(chuyển từ `CONTRACT.md` §3.2 khối known-gap, dòng 110-121 bản trước)*

Năng lực của 𝒜: dựng giao dịch tuỳ ý, đọc toàn bộ sổ cái, dựng script và policy riêng, **không** có
khoá `A` (trừ T5), **không** phá được blake2b-224 hay Ed25519.

| Mã | Kẻ tấn công định làm gì | Chặn bởi | Kết quả |
|---|---|---|---|
| T1 | Đúc beacon rồi đặt hồ sơ ở **script lạ** để thoát quyền tài phán của `registry` | R-OUT-1 (v2 ép `is_at_script(_, H_reg)`) | **chặn** |
| T2 | **Tự dựng** một UTxO ở `Script(H_reg)` với datum bịa, không mang beacon thật | không validator nào chạy lúc tạo (A-LEDGER) | **không chặn được** — nhưng vô hại: không hiện khi quét theo `P_b`, và muốn chi vẫn cần `A` |
| T3 | Khai `beacon_policy` là một policy tự chế để dắt mũi U-NFT | R-POLICY lúc đúc + T-ID6 về sau | **chặn** |
| T4 | Khai `created_epoch = 0` để ra vẻ platform lâu đời nhất hệ | R-EPOCH (v2) | **chặn** |
| T5 | Chiếm khoá `A` (một key-hash đơn) ⇒ chiếm tên, onboard rác | — | **không chặn được**; giảm nhẹ duy nhất: `A` phải là multisig M-of-N trước mainnet |
| T6 | Nhét token lạ vào ô hồ sơ (rác sổ / lách kế toán về sau) | R-VALUE, U-VALUE, M-VALUE | **chặn** |
| T7 | Rút ADA khỏi ô hồ sơ cho tới khi nó không tồn tại được | U-VALUE `lovelace(out) ≥ lovelace(in)` | **chặn** |
| T8 | Đăng ký trỏ tới một kho **không tồn tại** | R-BIND | **chặn** |
| T9 | Đăng ký trỏ tới một kho **tự dựng** (policy riêng + script riêng) | — | **không chặn được** — xem PK8; đối soát ở §6.2 bước 2 |
| T10 | Gánh mint một policy lạ trong cùng giao dịch đăng ký | R-MINT-2 | **chặn** |
| T11 | Chi tiêu hai ô hồ sơ trong một giao dịch (double-satisfaction) | U-SINGLE, M-DEST | **chặn** |
| T12 | Hồi sinh một hồ sơ `Retired` qua đường Update | U-TERMINAL | **chặn** |
| T13 | Dùng di trú làm đường `Retire` trá hình, né U-GOV | M-STATUS | **chặn** |
| T14 | Di trú vòng về chính mình / hạ `spec_version` | M-DEST, M-VER | **chặn** |
| T15 | **Đăng ký trùng `pid`** với một platform đã có | — | **không chặn được on-chain** — xem §14 L1 |

Hai dòng đáng đọc kỹ: **T5** và **T15**. Chúng là hai chỗ duy nhất mà bảo đảm nằm ở con người, không
ở mã.

---

## §9. Bảo toàn và bất biến số học

| Đại lượng | Bất biến | Ràng buộc ép |
|---|---|---|
| cung `(P_b, pid)` | không giảm; tăng ≤ 1 mỗi giao dịch | R-MINT-1, `else fail`, U-MINT-0, M-MINT-0 |
| `\|tokens(tx.mint, P_b)\|` | = 1 tại `Register` | R-MINT-1 |
| `\|policies(tx.mint)\|` | = 1 tại `Register` | R-MINT-2 |
| `cut_bps` | 0 ≤ cut_bps ≤ 10000 | R-WF, U-MUT |
| `val_nat` của ô hồ sơ | hằng | R-VALUE, U-VALUE, M-VALUE |
| `lovelace` của ô hồ sơ | không giảm | U-VALUE, M-VALUE |
| `spec_version` | hằng ở Update, tăng nghiêm ngặt ở Migrate | U-VER, M-VER |
| `Id(e)` | hằng suốt đời hồ sơ | R-* (đặt) + U-ID + M-ID |

`cut_bps` tính theo điểm cơ bản: 10000 bps = 100%. Đơn vị này phải khớp Treasury — lệch đơn vị là
sai số tiền, không phải sai chính tả.

---

## §10. Phân tích trò chơi — mức tối thiểu

Registry không có phần thưởng on-chain nên không có trò chơi phí. Chỉ còn một cân nhắc:

**Vì sao có kiểm duyệt mà không tuỳ tiện.** Nếu `A` từ chối tuỳ ý, giá trị của sổ giảm (ít dịch vụ
⇒ ít cầu LAMP), nên `A` có động cơ **duyệt rộng**. Nếu `A` duyệt bừa, sổ đầy rác và người định tuyến
phí bỏ sổ, giá trị cũng giảm. Điểm cân bằng: duyệt theo tiêu chí công khai kiểm được. Đó là lý do
bốn tiêu chí ở `../REGISTRATION-STANDARD.md` §5 phải công khai — và **cạnh tranh với thành phần sẵn
có KHÔNG phải lý do từ chối**.

Đây là lập luận động cơ, **không phải chứng minh cân bằng**. Không tuyên bố mạnh hơn thế.

---

## §11. Biện minh tham số

| Tham số | Giá trị | Vì sao |
|---|---|---|
| `spec_version_v2` | 2 | v1 là lược đồ 9 trường không có trường phiên bản; đánh số 2 cho bản 11 trường |
| dải `cut_bps` | [0, 10000] | điểm cơ bản, khớp Treasury |
| ngưỡng multisig `A` | M-of-N, **chưa chốt** | phải chốt trước mainnet (§14 L2) |
| cửa sổ epoch của R-EPOCH | theo `validity_range` của chính giao dịch | quy ước epoch chép từ Treasury `util.ak` — hai sổ phải cùng quy ước, lệch là hỏng đối soát |

---

## §12. Ghép nối và ranh giới

| Ranh giới | Bên này bảo đảm | Bên kia phải bảo đảm |
|---|---|---|
| Registry ↔ Treasury | entry trỏ tới một `(S_seed, iid, H_cust)` tồn tại lúc đăng ký (PK8) | kho là Treasury thật; `spend_spec_hash` gồm `instance_id` |
| Registry ↔ Governance | đòi `governance_consented` cho việc không đảo ngược được | `G` chỉ đồng thuận khi platform thật sự muốn (A-GOV) |
| Registry ↔ SDK off-chain | thứ tự trường datum + chỉ số constructor cố định (A-DATA) | decode đúng thứ tự; gọi đủ ba van ở §6.2 |
| Registry ↔ Mint-Authority Registry của LAMP | **không liên quan** | hai sổ khác nhau: sổ này niêm yết platform; sổ kia gác quyền phát hành token |

---

## §13. Biên nhận — khi nào một chữ ký tạo ra nghĩa vụ

PK11 và L8 nói **receipt chưa có**. Mục này không thi công nó; nó chốt **tiêu chí** mà bất kỳ bản
thi công nào cũng phải thoả, để lần viết mã đầu tiên không phải quay lại chọn lại. Trước mục này,
câu hỏi lưu hành trong hệ là *"biên nhận đã ký thành **quyền** (entitlement) ngay lúc ký, hay là
**đơn chờ** (`pending`) tới khi neo on-chain?"* — và bốn chuyên gia không hội tụ.

**Câu hỏi đó sai kiểu: nó hỏi một câu cho hai vật khác nhau.** Hai đường thanh toán khác nhau sinh
ra hai loại biên nhận khác nhau; hỏi chung một câu thì mọi câu trả lời đều đúng một nửa.

### 13.1 `T-RECEIPT` — tiêu chí phân định

> **`T-RECEIPT`.** Một biên nhận đã ký thành **quyền ngay lúc ký** ⟺ bên **chịu thiệt** nếu biên
> nhận đó sai **chính là** bên đã **kiểm** nó, và kiểm bằng chứng cứ mà bên đòi tiền **không bịa
> được**.
>
> Không thoả cả hai vế ⇒ biên nhận chỉ là **đơn có bằng chứng** (`pending`).

Đây là tiêu chí **cấu trúc**, không phải chính sách: nó hỏi ai gánh sai số, không hỏi ai đáng tin.

> **`T-NO-THIRD-PARTY` (trụ đỡ, không đảo được bằng biểu quyết).** Hai bên **không** tạo được nghĩa
> vụ cho một bên thứ ba bằng cách ký với nhau.

`T-RECEIPT` là hệ quả trực tiếp của `T-NO-THIRD-PARTY`: khi bên chịu thiệt **không** nằm trong tập
bên ký-và-kiểm, chữ ký của hai bên kia đang phân bổ tài sản của người ngoài cuộc. Một biểu quyết
tuyên bố ngược lại không đổi được điều này — nó chỉ đổi được ai bị thiệt.

#### 13.1.1 Miền áp dụng — và phép thử để biết mình có ở trong miền không

`T-RECEIPT` hỏi *"nếu biên nhận đó **sai** thì ai chịu?"*. Câu hỏi này **giả định trước** rằng biên
nhận **sai được**. Có những lời khai không sai được, và với chúng câu hỏi rỗng chứ không phải có một
đáp án thứ ba.

Ca mẫu (PhoenixKey nêu 2026-08-15): khoá tra cứu là `content_cid = hash(dạng chuẩn tắc của nội
dung)`. Không tồn tại thao tác "khai vống" — khai khác đi thì ra khoá khác, mà khoá khác thì là bản
ghi khác, không phải bản đang tranh chấp. Không có bên kiểm, và cũng không cần bên nào.

> **`D-RECEIPT` (miền).** `T-RECEIPT` chỉ áp cho lời khai **phát biểu sai được** về một sự việc
> **ngoài chính lời khai**. Lời khai tự chứng — nội dung **chính là** vật — nằm **ngoài** miền: nó
> không phải biên nhận, nó là một **cái tên**. Tên không tạo nghĩa vụ cho ai, nên không có quyền nào
> để cấp.

> **Phép thử miền** (phát biểu của PhoenixKey, nhận nguyên): **hỏi *"khai vống thì khai thế nào?"***
> Phát biểu nổi câu khai vống ⇒ ở **trong** miền, `T-RECEIPT` áp, và nó hỏi ai gánh. Không phát biểu
> nổi ⇒ **ngoài** miền, không có gì để phân hạng.

⚠ **Đặt câu hỏi lên đúng vật thì phép thử mới chạy.** Phải hỏi về **mệnh đề mà nghĩa vụ đối với bên
thứ ba phụ thuộc vào**, không hỏi về thứ được băm. Ví dụ phản chứng: `hash(dạng chuẩn tắc của "tôi
đã phục vụ 1000 yêu cầu"))` là một băm hoàn toàn tự chứng — hỏi *"khai vống cái băm thế nào?"* thì
trả lời được là "không thể", và người đọc kết luận nhầm rằng mình ở ngoài miền. Nhưng nghĩa vụ không
phụ thuộc vào cái băm, nó phụ thuộc vào **con số 1000**; băm một con số bịa vẫn ra một băm hợp lệ.
Hỏi đúng vật thì câu khai vống phát biểu được ngay ⇒ ở trong miền ⇒ `T-RECEIPT` áp ⇒ hỏi tiếp ai
chịu thiệt.

**Vì sao "nghĩa vụ" chứ không phải "khoản tiền"** (đính chính theo PhoenixKey, thư 2026-08-15 §3 —
nhận nguyên): miền `D-RECEIPT` dựng trên *lời khai phát biểu sai được về sự việc ngoài nó*, mà tập đó
**rộng hơn** tập lời khai có tiền treo vào. Hai câu lệch cân thì lời khai phi-tiền-tệ lọt ra ngoài
bằng đúng lối vừa bịt. Ca thật, không phải giả định:

```
claim = "DID X là bên điều khiển anchor Y"
```

Không đồng nào treo vào nó. Hỏi *"khoản tiền phụ thuộc vào mệnh đề nào?"* → không có khoản tiền nào
⇒ ngoài miền ⇒ không ai kiểm. Nhưng nó phát biểu sai được, nó nói về sự việc ngoài chính nó, và bên
thứ ba tra `Y` ra `X` sẽ hành xử theo. Đó đúng là ca `T-RECEIPT` sinh ra để bắt. PhoenixKey ghi
nhận đây là loại lời khai họ phát ra nhiều nhất.

**Nghĩa vụ đo bằng phép thử phản-thực, không bằng cảm nhận** — nếu không thì chữ "nghĩa vụ" mơ hồ
hơn chữ "khoản tiền" và đổi chữ thành đổi tệ đi:

> Có **nghĩa vụ** ⟺ tồn tại một bên thứ ba **hành xử khác đi** nếu biết lời khai là sai.

Áp lại cả ba ca: `content_cid` — không ai đổi cách hành xử vì nó, nó chỉ là khoá tra cứu ⇒ **ngoài
miền** (giữ nguyên kết luận cũ). `"phục vụ 1000 yêu cầu"` ⇒ bên trả tiền đổi cách hành xử ⇒ trong
miền ⇒ `pending` (giữ nguyên). `"X điều khiển Y"` ⇒ bên tra cứu đổi cách hành xử ⇒ **nay vào miền**,
trước thì lọt.

Vì sao `D-RECEIPT` là **miền** chứ không phải nhánh thứ ba của phép tuyển: nếu viết thành *"quyền ⟸
(a) bên chịu thiệt là bên đã kiểm, **hoặc** (b) nội dung tự chứng"*, thì (b) trở thành một **đường
cấp quyền**, và ai cũng đi được đường đó chỉ bằng cách băm lời khai của mình lại. Cái chặn duy nhất
lúc đó là một câu văn xuôi dặn "đừng áp cho sự kiện ở ngoài" — mà văn xuôi thì không phải hình thức.
Đặt nó làm miền thì cái chặn nằm **trong** cấu trúc: ngoài miền nghĩa là **không có quyền nào được
cấp**, chứ không phải quyền được cấp theo lối khác.

### 13.2 Áp vào hai đường mã đang chạy — nghiệm bằng đọc mã

Chứng cứ dưới đây đọc trên repo **khác** (`LampNetCloud/lampnet-hivemind`, **chỉ đọc**), nhánh
`main`, SHA `3c2ec22`, đối chiếu 2026-08-15. Con trỏ mang đủ ba thứ theo
[`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §3.

| | đường **mobile lease** | đường **pool epoch** (V2, `allocate_rewards_v2`) |
|---|---|---|
| mã | `lampnet-mirage/src/mobile_settle.rs:27,39,295-333` | `lampnet-reward/src/allocate.rs:244-258` |
| trả thế nào | đơn giá phẳng `BASE_PRICE_COMPUTE_ULAMP = 10` (`:27`) — **không có pool trần** | emission **co giãn có trần**: `Σvalue ≤ pool` ⇒ trả nguyên giá tuyệt đối; `Σvalue > pool` ⇒ co tỉ lệ (`:252-257`) |
| ai ký | **thiết bị ký một mình** — `verify_receipt` nhận đúng một chữ ký (`:295-300`) | node khai, nhưng phải qua chữ ký peer đã kết nạp |
| ai kiểm | **chính bên trả**: server đối chiếu `expected_hash`, thứ *"KHÔNG serialize ra client"* (`:39`, so ở `:330-333`) | **có kiểm, và kiểm thật**: PoR + assignment mạng (`metering.rs:127,143`), quorum Splash (`:172`), cọc `BondEscrow` (`:155`), cổng `loa ≥ 1` (`allocate.rs:219`) |
| khai vống thì ai chịu | **bên trả** — đúng bên vừa kiểm | **không phải bên kiểm.** Dưới trần: bên cấp vốn cho pool (emission thật chảy ra). Trên trần: mọi node khác, bị co tỉ lệ. Cả hai đều là **bên thứ ba** |
| `T-RECEIPT` | **thoả** ⇒ entitlement, `W = 0` | **không thoả** ⇒ `pending`, `W > 0` |

Đường lease thoả tiêu chí **không phải nhờ chữ ký chéo hai bên** — nó chỉ có một chữ ký. Nó thoả nhờ
bên trả nắm một **ground truth** (`expected_hash`) mà bên đòi tiền không thấy, nên không bịa khớp
được. Đây là chỗ dễ đọc nhầm nhất của cả mục: **số chữ ký không quyết định gì; ai cầm chứng cứ mới
quyết định.**

Và đường pool trượt tiêu chí **không phải vì "không ai kiểm"** — nó có bốn lớp kiểm liệt kê ở trên,
đắt hơn hẳn đường lease. Nó trượt vì **người kiểm không phải người chịu thiệt**. Đây là phân biệt
load-bearing: siết thêm phép kiểm **không** đưa đường pool sang `W = 0`; chỉ đổi được **ai gánh sai
số** mới đổi được hạng. Ai đọc bảng này thành "pool kém an toàn hơn lease" là đọc sai — hai đường
hỏng theo hai kiểu khác nhau.

⚠ **Đừng trích `allocate_rewards` (V1) làm chứng cứ.** Nhánh `:92-94` (`share × pool`, chia tỉ lệ mù
trên pool cố định) mang nhãn `**[LEGACY V1]**` ngay trong mã (`allocate.rs:26-31`) và bị chính mã đó
tuyên là **vi phạm INV-R14 của V2**. Một vòng rà soát trước của nhà này đã trích đúng nhánh chết
này; con số dẫn ra vẫn đúng với V1 nhưng **không mô tả đường đang chạy**.

### 13.3 Hệ quả thi công — **một** kiểu, không hai

`pending` với `W = 0` **chính là** entitlement. Nên lược đồ datum viết **đúng một** kiểu biên nhận
mang tham số `W`, đặt `W = 0` cho đường lease. Tách làm hai kiểu là tự sinh ra một đường di trú
không cần có.

### 13.4 Bốn điều PHẢI viết kèm — thiếu là đặc tả nói dối

1. 🔴 **`pending` KHÔNG phải cổng chống Sybil.** Điều kiện thăng `pending → entitlement` là *"qua
   `W` epoch không phát hiện lỗi"*, **không phải** chứng minh danh tính. Đường supply-claim
   ([`../bench/DOI-CHIEU.md`](../bench/DOI-CHIEU.md) §1 — không đốt gì, chỉ khai **cung**, lãi dương
   với mọi `ρ` và mọi `α`) đi qua cửa `pending` y hệt node thật. Ai đọc `pending` như *"đã vá
   Sybil"* là tưởng nhầm.

   🔴 **Và nó tệ hơn "không chặn": cửa đó nghiêng về phía kẻ giả** (PhoenixKey nêu 2026-08-15, nhận
   nguyên). Điều kiện *"qua `W` epoch không phát hiện lỗi"* thưởng đúng thứ Sybil dư còn người thật
   thiếu — **thời gian không tốn chi phí**. Node thật muốn qua `W` epoch phải chạy máy thật `W`
   epoch; node giả chỉ cần **không làm gì** trong `W` epoch. Nên nới `W` **không** làm cửa lọc chặt
   hơn, nó chỉ kéo dài hàng chờ của người trung thực. Muốn cửa đó lọc được thì điều kiện thăng phải
   là thứ **tốn của kẻ giả nhiều hơn tốn của người thật**; *"không bị bắt lỗi"* thì cả hai đều đạt
   bằng cách nằm im. ⟹ chọn con số `W` không phải câu hỏi đúng cho tới khi đổi **loại** điều kiện.
2. 🔴 **Giá một danh tính trên đường lease đo được bằng 0 — nhưng nó không mua được gì.** Vào cửa
   `/v1/mobile/lease` chỉ cần một cặp khoá Ed25519 tự sinh: không ký quỹ, không phí, không
   attestation, không tra sổ peer; toàn bộ phép xác thực là *"ký được bằng khoá riêng của khoá công
   mình vừa tự khai"* (`mobile_settle.rs:215-220`), tuần hoàn. Không có rate-limit nào áp lên nhóm
   route `/v1/mobile/*` (đối chiếu router `lampnet-node.rs:1510-1515`). **Nhưng** `expected_hash`
   chặn ở cửa trả tiền, và giá phẳng nên `N` danh tính không nhân tiền lên — nút thắt là **công tính
   toán thật**. ⟹ danh tính miễn phí chỉ thành đòn bẩy ở nơi phần thưởng **co giãn theo số danh
   tính**, tức đường pool. Ở đó cổng danh tính là `loa ≥ 1` (`allocate.rs:213-222`) — **và tôi chưa
   nghiệm được đường dữ liệu nào nạp `loa` thật**. Đo lại 2026-08-15, chặt hơn: bốn chỗ gán `loa: 1`
   (`metering.rs:522,579` · `reliability.rs:65` · `tier.rs:200`) đều nằm sau một `#[cfg(test)]`
   (mở lần lượt ở `:277` · `:43` · `:147`), và **mọi** chỗ dựng `EpochContributionV2` trong toàn kho
   cũng vậy (`allocate.rs:403` · `metering.rs:511,568` · `reliability.rs:50` · `tier.rs:185`). Không
   có mã sản xuất nào dựng nổi cái struct mà cổng `loa` gác ⟹ cổng đó chưa **yếu**, nó đang gác một
   con đường **chưa ai đi**.
3. ⚠ **`pending` trên đường pool KHÔNG phải nhãn rỗng — nhưng cũng chưa phải lá chắn công bố
   được.** Có cơ chế phát hiện thật (PoR, quorum, bond, `loa`). Bốn chốt PA-4 mà LampNet hứa — hạn
   tự-thăng cứng · gom batch đơn định · M-of-N vai neo · `W` theo tài nguyên — thì **chưa**. Mục này
   nói `W > 0` là **đúng nguyên lý**, và nói cơ chế phát hiện **có tồn tại**; nó **không** nói mức
   bảo đảm đã đo được.
4. ⚠ **Không được bê lập luận của đường này sang đường kia.** Đường lease **không có** pool trần
   (`mobile_settle.rs:27`), nên mọi lập luận dựa trên "pool có trần" không áp được sang nó. Ngược
   lại, đường pool V2 **không** chia tỉ lệ mù — nó chỉ co khi vượt trần — nên lập luận "mọi khai
   vống đều pha loãng người khác" cũng không áp được sang nó. Hai vòng rà soát trước của nhà này
   ghép sai theo đúng hai chiều này.

### 13.5 Quan hệ với hạng chứng thực `EV-*`

`T-RECEIPT` **siết chặt** `EV-1` chứ không thay nó. `EV-1` hỏi *ai **ký***; `T-RECEIPT` hỏi *ai
**kiểm**, và kiểm bằng gì*. Một biên nhận đường lease chỉ có **một** chữ ký — của chính bên hưởng
lợi — nên đọc theo chữ `EV-*` thì nó là `EV-0`; nhưng nó vẫn thoả `T-RECEIPT` vì phép kiểm nằm ở bên
trả. Hai thang đo hai thứ khác nhau, và **`T-RECEIPT` không nâng hạng `EV-*` của bất kỳ dòng khai
nào** — đừng dùng mục này để xin hạng cao hơn ở hồ sơ đăng ký.

**Nguồn.** Chốt 2026-08-15 sau khi hội đồng bốn chuyên gia không hội tụ; bản luận đầy đủ và đường
dẫn tới bản nháp cơ chế phí ghi ở [`../ChangeLog.md`](../ChangeLog.md).

---

## §14. Giới hạn — thứ KHÔNG chứng minh được

Mục này viết để không ai đọc §7 rồi tưởng mọi thứ đã được chứng minh.

### L1 — `platform_id` duy nhất: mệnh đề BỊ BÁC ở mức validator

**Phát biểu hình thức của mệnh đề mong muốn:**

> **P-UNIQUE.** ∀ `pid`: tổng cung asset `(P_b, pid)` ≤ 1.

**P-UNIQUE là SAI** khi chỉ tính các ràng buộc validator. Phản ví dụ, hai giao dịch:

```
tx₁ : mint { (P_b, pid) ↦ 1 },  A ký,  output ở Script(H_reg) mang NFT đó, datum e₁ well-formed
tx₂ : mint { (P_b, pid) ↦ 1 },  A ký,  output ở Script(H_reg) mang NFT đó, datum e₂ well-formed
```

Cả hai qua **toàn bộ** R-SIG, R-MINT-1, R-MINT-2, R-OUT-1, R-NAME, R-POLICY, R-VER, R-WF, R-VALUE,
R-EPOCH, R-BIND. R-MINT-1 chỉ nói **trong một giao dịch** đúc đúng một token — nó không nói gì về
các giao dịch trước đó. `registry_beacon` **không one-shot**: nó không tiêu thụ một UTxO genesis duy
nhất, nên on-chain **không biết** `pid` đã từng được đúc. Sau `tx₂`, cung `(P_b, pid) = 2`. ∎ (bác)

**Vậy tính duy nhất dựa vào đâu:** hai **van quy trình**, không phải mật mã.

1. `registry_authority` không ký hai lần cùng một `pid` (A-AUTH, kỷ luật con người).
2. SDK khử trùng: `discoverPlatforms` đánh dấu `duplicate`; bên định tuyến phí PHẢI kiểm trước khi
   tin.

**Đường đóng thật (chưa thi công).** Đặt asset name dẫn xuất từ một `genesis_ref` **one-shot** mỗi
platform (đúng mẫu `custody_seed` của Treasury: tiêu thụ một UTxO duy nhất ⇒ tên asset duy nhất
theo cơ chế, không theo kỷ luật). Khi đó P-UNIQUE trở thành định lý. Đánh đổi: `pid` mất tính đọc
được cho người, hoặc phải giữ một bảng ánh xạ. Chưa quyết.

### L2 — `registry_authority` một khoá đơn

Một khoá rò = chiếm tên + onboard rác (T5). Trước mainnet **PHẢI** là committee multisig M-of-N.
Ngưỡng chưa chốt. Đây là giới hạn **vận hành**, không có ràng buộc mã nào ép.

### L3 — R-BIND không xác thực kho là thật

Xem PK8 và T9. Đã kiểm bằng thực thi 2026-08-04.

### L4 — Entry lệch datum kho

PK7: không ràng buộc nào giữ hai bên khớp sau lúc đăng ký. DAO đổi `cut_bps` ở kho mà không cập
nhật entry là trạng thái **hợp lệ** với validator. Người đọc sổ phải đối soát.

### L5 — `status` không khoá tiền

PK10 / T-NOGATE. Đây là quyết định tách tầng, không phải thiếu sót — nhưng phải ghi ra vì nó trái
trực giác.

### L6 — Chưa có chứng minh cơ giới hoá

Không có bản Coq/Lean/Isabelle. Mọi chứng minh trên là lập luận tay dựa vào đọc mã. Mức bảo đảm:
**đọc mã + kiểm thử đơn vị**, không hơn. Bộ kiểm thử tương ứng liệt kê ở §17.

### L7 — Chưa audit ngoài

Chưa có bên thứ ba nào audit. Bắt buộc trước mainnet.

### L8 — `receipt` chưa có

PK11. Mọi lời hứa về uy tín dựa trên `app_id` hiện **không có nền**. §13 chốt **tiêu chí** phân
định biên nhận (`T-RECEIPT`) nhưng **không** thi công gì: L8 vẫn mở nguyên.

---

## §15. Hợp đồng liên spec

| Spec | Bản này ràng buộc gì |
|---|---|
| [`CONTRACT.md`](./CONTRACT.md) | CONTRACT nêu bất biến bằng lời; bản này là **phát biểu hình thức duy nhất**. Lệch nhau ⇒ bản này là chuẩn về mặt hình thức, CONTRACT là chuẩn về mặt ý định |
| [`Tech-Spec.md`](./Tech-Spec.md) | mọi mã ràng buộc R-*/U-*/M-* phải khớp §5 |
| [`Feat-Spec.md`](./Feat-Spec.md) | hành vi nhìn thấy được không được hứa mạnh hơn §14 |
| [`Exec-Spec.md`](./Exec-Spec.md) | DoD phải phủ đủ tập kẻ tấn công §8 |
| [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) | tiêu chí duyệt là van cho L1 và L2 |

---

## §16. Câu hỏi toán còn mở

1. Chọn one-shot `genesis_ref` (đóng L1) hay giữ `pid` đọc được cho người? Chưa quyết.
2. Ngưỡng M-of-N của `A` là bao nhiêu, và ai giữ khoá? Chưa chốt.
3. Có nên cho custody đọc entry qua reference input để `Paused` khoá được tiền (đóng L5)? Đánh đổi
   là một reference input mỗi giao dịch kho + ràng vòng đời hai chiều.
4. `MigrateEntry` cần thêm chống hồi tố (replay sang một `new_registry_hash` cũ) không? Hiện M-VER
   tăng nghiêm ngặt đã chặn vòng lặp phiên bản, nhưng chưa chứng minh chặn được mọi chu trình.

---

## §17. Cách tự kiểm bản này

Không chép số. Chạy lệnh:

```bash
# sáu trường định danh + các mã ràng buộc v2 có thật trong mã
grep -n 'identity_preserved' -A6 /Users/ductiger/Projects/Registry/onchain/lib/magiclamp/registry/platform.ak
grep -o '[RUM]-[A-Z0-9-]*' /Users/ductiger/Projects/Registry/onchain/validators/*.ak | sort -u

# kiểm thử + build
cd /Users/ductiger/Projects/Registry/onchain && aiken check && aiken build

# script hash trước/sau khi sửa validator
cd /Users/ductiger/Projects/Registry/onchain && aiken build && \
  jq -r '.validators[] | "\(.title) \(.hash)"' plutus.json
```

Trạng thái thi công (nhánh nào, đã commit chưa) đọc ở [`../DevStatus.md`](../DevStatus.md) — **nơi
duy nhất** phát biểu hiện trạng.

---

## §18. Nhật ký thay đổi

Không ghi ở đây. Nguồn duy nhất: [`../ChangeLog.md`](../ChangeLog.md).
