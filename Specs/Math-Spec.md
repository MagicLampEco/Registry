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

Mọi mục đích khác (kể cả **đốt**) → `fail` (`registry_beacon.ak:202-204`).

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
   (`registry_beacon.ak:77-82`), nên một kho **tự dựng hoàn toàn** (policy riêng + script riêng)
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
(`registry_beacon.ak:169-173`). Bước quy nạp: U-VALUE và M-VALUE ép `val_nat(out) = val_nat(in)`.
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
(lượng dương). Mọi mục đích khác rơi vào `else(_) { fail }` (`registry_beacon.ak:202-204`). Thêm
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

*Chứng minh.* R-BIND (`registry_beacon.ak:194-197`). ∎

> ⚠ **Đây KHÔNG phải phép xác thực "kho là Treasury thật".** Cả ba giá trị đều do người đăng ký tự
> khai trong datum. Một kho tự dựng hoàn toàn vẫn qua — kiểm bằng thực thi 2026-08-04. Thứ R-BIND
> mua được chỉ là: **thứ tự onboard bị ép** (kho phải lên chain trước sổ), và entry không trỏ vào hư
> không. Cổng thật lúc đăng ký là chữ ký `A`.

### PK9 — `Retired` là trạng thái cuối của đường Update, KHÔNG cuối của vòng đời hồ sơ *(v2 sửa)*

> **T-TERMINAL-U.** Không giao dịch `UpdateEntry` nào chi tiêu được một entry có `σ(e_in) = Retired`.

*Chứng minh.* U-TERMINAL (`registry.ak:204`). ∎

> **T-MIGRATE.** `MigrateEntry` **được** chi tiêu entry `Retired`, và với mọi giao dịch di trú qua
> được: `Id(e_out) = Id(e_in)` ∧ `σ(e_out) = σ(e_in)` ∧ `v(e_out) > v(e_in)` ∧ đích ≠ `H_reg`.

*Chứng minh.* Nhánh Migrate không gọi U-TERMINAL (`registry.ak:135-137`). Ba đẳng thức là M-ID,
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

*Chứng minh.* (a) và (b): U-GOV (`registry.ak:245-255`) cộng U-SIG. (c): M-GOV cộng M-SIG. ∎

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
| T16 | Đặt ô hồ sơ ở **biến thể stake** của `H_reg` (cùng payment credential, khác địa chỉ) để nó TÀNG HÌNH với `utxosAt(<địa chỉ enterprise>)` | R-ADDR, U-ADDR, M-ADDR (v2.1) | **chặn** |

Hai dòng đáng đọc kỹ: **T5** và **T15**. Chúng là hai chỗ duy nhất mà bảo đảm nằm ở con người, không
ở mã.

**Vì sao T16 là một dòng RIÊNG, không phải một ca của T1.** T1 nói "script lạ" và bị R-OUT-1 chặn
bằng `is_at_script(_, H_reg)`. Ô hồ sơ của T16 có payment credential **đúng là** `Script(H_reg)`, nên
`is_at_script` xanh, R-OUT-1 xanh, U-SINGLE đếm đủ "đúng một ô", beacon NFT vẫn nằm trong đó — hồ sơ
hợp lệ mọi đường. Cái khác là ĐỊA CHỈ, và bên nào đọc sổ quét theo địa chỉ enterprise sẽ không
thấy nó.

⚠ **Bên đọc ấy ở NGOÀI kho** (đo 2026-09-01): `command grep -rn "utxosAt(" offchain/src scripts/*.ts
tests/` → 3 dòng, cả ba là chú thích; `scripts/03_*` đọc bằng `utxosByOutRef`. `config.ts:126` chỉ
DỰNG địa chỉ, không ĐỌC theo nó. Bản trước của dòng này viết như thể có một call site trong kho —
sai, và sai theo chiều làm cái giá của R-ADDR/U-ADDR/M-ADDR (bỏ quyền uỷ thác của mọi ô) trông như
đang trả cho một bên hưởng lợi ở đây.

⚠ **Và ba cổng đó KHÔNG đủ để hai đường đọc luôn đồng ý** (audit đối kháng 2026-09-01, có PoC).
Chiều còn hở là chiều ngược lại: ai cũng trả ~2 ADA tạo được một ô **rác** ở đúng địa chỉ enterprise
với datum tự khai, vì lúc TẠO ô không validator nào chạy. Đường địa chỉ thấy nó, đường beacon NFT
thì không. Bản vá còn biến enterprise thành địa chỉ **chính tắc**, tức đúng chỗ kẻ gieo rác nhắm
tới. ⇒ Kết luận cho bên đọc: đọc theo **beacon NFT với policy tự tính lại** (không lấy từ datum) là
đường lành duy nhất; `utxosAt` là đường KHÔNG LÀNH kể cả sau v2.1.

Thiệt hại không phải mất tiền — sổ không giữ giá trị (PK1). Thiệt hại là **sổ chỉ đường mà đường
chuẩn đọc không ra mục**, tức đúng thứ sổ này tồn tại để làm. Và nó không tự kêu: không phép đo nào
đỏ, hồ sơ vẫn ở đó, chỉ là không ai thấy.

Phép đếm KHÔNG được sửa để đóng chỗ này. `is_at_script` cố ý chỉ so payment credential
(`onchain/lib/magiclamp/registry/util.ak:3-4`, bài học audit C1/C2/M1): gộp stake vào phép TÌM là mở
lại double-satisfaction, vì khi đó hai ô cùng payment hash khác stake đếm thành hai chứ không phải
một, và "đúng một ô" không còn chặn được gì. Nên đếm giữ nguyên theo payment hash, còn ô RA bị ghim
thêm bằng `has_no_stake_part`. Hai ràng buộc cộng lại xác định địa chỉ ô ra là duy nhất.

Ghim ở CẢ BA cửa vì mỗi cửa bỏ sót thì hai cửa kia không cứu được: R-ADDR là cửa sinh (không hồ sơ
nào ra đời ở chỗ không quét tới), U-ADDR là cửa sửa, M-ADDR là cửa đi — và M-ADDR đắt nhất, vì hồ sơ
đã rời quyền tài phán này thì không đường nào ở đây gọi nó về.

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
| `spec_version_v2` | 2 | v1 là lược đồ 9 trường không có trường phiên bản; đánh số 2 cho bản 12 trường |
| dải `cut_bps` | [0, 10000] | điểm cơ bản, khớp Treasury |
| ngưỡng multisig `A` | M-of-N, **chưa chốt** | phải chốt trước mainnet (§14 L2) |
| cửa sổ epoch của R-EPOCH | theo `validity_range` của chính giao dịch | quy ước epoch chép từ Treasury `util.ak` — hai sổ phải cùng quy ước, lệch là hỏng đối soát |

---

## §12. Ghép nối và ranh giới

| Ranh giới | Bên này bảo đảm | Bên kia phải bảo đảm |
|---|---|---|
| Registry ↔ Treasury | entry trỏ tới một `(S_seed, iid, H_cust)` tồn tại lúc đăng ký (PK8) | kho là Treasury thật; `spend_spec_hash` gồm `instance_id` |
| Registry ↔ Governance | đòi `governance_consented` cho việc không đảo ngược được | `G` chỉ đồng thuận khi platform thật sự muốn (A-GOV) |
| Registry ↔ SDK off-chain | thứ tự trường datum + chỉ số constructor cố định (A-DATA) | decode đúng thứ tự; gọi đủ bốn van ở §6.2 |
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

**Ví dụ thứ tư — không có đồng nào trong câu, mà vẫn trong miền.** PhoenixKey gửi sang
(thư 2026-08-17) một ca đo được cùng ngày, và nó là ca đắt nhất trong bốn ca vì nó cho thấy phép
thử bắt được thứ mà câu hỏi cũ (*"có nói về một khoản tiền không"*) cho đi thẳng qua:

> *"Cổng khử trùng danh tính của PhoenixKey đang hoạt động."*

Không có số tiền, không có bên trả tiền, không có hoá đơn. Nhưng ba nhà khác đang cân phương án
phân phối token dựa trên câu ấy, và cả ba **sẽ chọn khác** nếu biết nó sai — mà PhoenixKey đo được
là nó **sai**: cổng đó chưa tồn tại trên chuỗi. Phép thử phản-thực bắt ca này ở dòng đầu; câu hỏi
cũ trượt hoàn toàn, vì nó soi **hình dạng** của lời khai (có con số tiền không) thay vì soi **hậu
quả** của lời khai.

**Ví dụ thứ năm — lời khai ĐÚNG về cơ chế, SAI về độ phủ.** PhoenixKey gửi sang (thư 2026-08-28)
một ca ở chính nhà họ, và nó là biến thể khó bắt nhất trong năm ca: một bài kiểm được viết để
*"ghim chính lý do của bản vá"*, và bài kiểm ấy **xanh**. Một agent đối kháng soi lại thì thấy nó
ghim đúng lý do mà **không ghim phạm vi áp dụng** — trong khi phạm vi mới là chỗ hỏng: hai luồng ký
vẫn còn khuôn cũ đi qua sạch, và một luồng thứ bảy thêm vào ngày mai cũng sẽ đi qua sạch.

Áp phép thử phản-thực vào chính bài kiểm ấy: *có ai hành xử khác đi nếu biết nó chỉ gác một phần
không?* **Có** — người đọc màu xanh rồi kết luận đã vá xong. ⇒ trong miền.

Chỗ ca này khác bốn ca trên: bốn ca kia sai ở **nội dung** lời khai (sự việc không xảy ra, cổng
chưa tồn tại). Ca này **không sai câu nào** — cơ chế đúng, bản vá đúng, bài kiểm đúng. Nó sai ở
**biên** của lời khai, và biên là thứ không được nói ra nên không ai kiểm. Một lời khai không nêu
biên thì người đọc tự điền biên rộng nhất, và đó chính là bên thứ ba hành xử khác đi.

⇒ Hệ quả cho bốn trục khai báo của chuẩn đăng ký: một lời khai `EV-1`/`EV-2` trỏ tới một bài kiểm
phải khai **bài kiểm ấy phủ tới đâu**, không chỉ khai nó xanh. Đây đúng là chỗ ô thứ ba của bằng
chứng phủ định đã siết (`REGISTRATION-STANDARD.md` §3) — cùng một lỗ, gặp lại ở một trục khác.

Rút ra, và đây là lý do phép thử được giữ ở dạng phản-thực chứ không dạng liệt kê: một tiêu chí
không có phép thử thì mỗi người áp một kiểu, và cái đó **tệ hơn tiêu chí lỏng — nó lỏng mà trông
chặt**. PhoenixKey lấy câu này làm ràng buộc chung cho mọi tiêu chí phân định ở nhà họ, không riêng
§13; ghi lại ở đây vì nó áp được cho cả bốn trục khai báo của chuẩn đăng ký.

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
được cho người, hoặc phải giữ một bảng ánh xạ. **Chưa quyết** — và bốn dữ kiện dưới đây phải nằm
trên bàn trước khi quyết.

#### D1 — lập luận "đổi không-lùi-được lấy lùi-được" chạy ngược chiều

Bản trước của mục này nghiêng về máy-sinh với lý do: va chạm **tên hiển thị** sửa được, còn một
`pid` bất biến bị chiếm thì không. Phản biện của ProofChat (thư 2026-08-18, hai agent soát độc lập)
đo ba van định tuyến phí ở `offchain/src/registryQuery.ts:275-295` với một kẻ **đăng ký hợp lệ**:

| Van | Hôm nay (pid chữ) | Sau máy-sinh |
|---|---|---|
| #2 trùng khít pid (`:192-200`) | `duplicate=true` ⇒ `safeToRouteFees` từ chối (`:280`) | pid duy nhất **theo cấu tạo** ⇒ `duplicate` vĩnh viễn `false` — van thành **hằng đúng** |
| #1 `verifyEntryAgainstCustody` (`:234-268`) | PASS — chỉ kiểm hồ sơ tự nhất quán với kho bên gọi đưa vào | PASS, y hệt |
| #3 `foreignScript`/`policyMismatch` | PASS | PASS, y hệt |

Van #1 PASS với **kho tự dựng hoàn toàn** — chính `onchain/validators/registry_beacon.ak:186-189`
ghi điều đó bằng thực thi. ⇒ sau máy-sinh, hồ sơ mang tên hiển thị của người khác nhận
`{ ok: true, reasons: [] }` và **phí chảy vào kho kẻ chiếm**. Tiền đã chảy thì không lùi. Nên phép
đánh đổi thật là: đổi một hỏng hóc **thẩm mỹ, không lùi được** lấy một hỏng hóc **mất tiền, im
lặng**. Hệ quả thứ hai: R1 trùng-khít là căn cứ từ chối **duy nhất máy tự tuyên được**
(`tools/check-registration.mjs` — chỉ `hong` và `trungY` làm đỏ); máy-sinh cộng "tên hiển thị không
được phép từ chối ai" đưa số căn cứ máy kiểm được về **0**.

#### D2 — bộ chấm sẽ chết CÂM, đo được hôm nay

`KHUON_PID` (`tools/check-registration-core.mjs:47`) là `^[a-z][a-z0-9-]{1,30}[a-z0-9]$` — tối đa
**32** ký tự, phải bắt đầu bằng chữ thường. Một pid blake2b-224 hex dài **56** ký tự. Đo:

```
'0f3a…93a4' (56 ký tự, đầu '0') → ĐỎ        'af3a…93a4' (56 ký tự, đầu 'a') → ĐỎ
```

Cả hai đỏ vì độ dài, không riêng vì ký tự đầu. Và hồ sơ sai khuôn bị **loại khỏi tập so trùng**, nên
R1 in `R1 — 0 platform_id, không trùng` — đúng theo nghĩa rỗng. Chọn máy-sinh mà không sửa khuôn
trước thì cổng đăng ký báo xanh về một tập rỗng.

#### D3 — tam đề `display_name`, và một đường thứ tư

Máy-sinh buộc phải thêm một trường tên hiển thị, và trường đó rơi vào đúng một trong ba nhóm của
`onchain/lib/magiclamp/registry/platform.ak`; ProofChat chỉ ra cả ba đều gãy một vế:

| Nhóm | Đặt ở đâu | Gãy chỗ nào |
|---|---|---|
| bất biến | `identity_preserved` | tên không sửa được ⇒ toàn bộ lý do mua biến mất |
| khả biến CÓ đồng thuận | `governed_fields_changed` | đổi tên đòi đồng thuận của **chính platform đó** ⇒ kẻ chiếm tên không bao giờ bị đổi tên |
| khả biến KHÔNG cần đồng thuận | không thêm vào cả hai | `registry_authority` — **một khoá đơn** (L2) — ghi lại tên của **mọi** hồ sơ trong sổ |

**Đường thứ tư, nhà này từng đề — BỊ BÁC 2026-08-27.** Giữ nguyên phát biểu vì lý do nó hỏng đáng
đọc hơn bản thân nó: *tách quyền **gỡ** nhãn khỏi quyền **đặt** nhãn — authority đơn phương xoá được
`display_name` nhưng không viết được giá trị mới; đặt tên mới đòi đồng thuận quản trị của chính
platform.* ProofChat phá bằng năm đường (thư 2026-08-27), bốn trong đó đứng độc lập:

1. **Không chấm dứt được chiếm tên, chỉ làm chậm.** Kẻ chiếm tên **là** một platform trong sổ, nên
   ngay sau khi bị gỡ nó đặt lại đúng cái tên ấy qua đúng đường hợp lệ. Vòng `gỡ → đặt lại → gỡ`
   không có điểm dừng, và bất đối xứng theo hướng xấu: authority phải canh mãi, kẻ kia chỉ cần
   thắng một lần lúc không ai canh. Muốn có điểm dừng thì cần trạng thái *"tên này bị cấm đặt lại"*
   — tức **thêm một trường nữa**.
2. **Vế "đòi đồng thuận" là tautology với đúng kẻ nó nhắm.** `governance_ref` chỉ đòi **chạy được**
   (G1), không đòi *ai* nó phục vụ. Kẻ tấn công tự viết script quản trị tự duyệt mọi thứ nó đề
   xuất. Cùng hình dạng với van #2: một phép kiểm hỏi một bên tự trả lời về chính nó. ⇒ vế **gỡ**
   có giá trị thật; vế **đặt** không mua được gì trước kẻ tấn công, chỉ tăng ma sát cho người ngay.
3. **D4 nuốt D3.** D4 chứng minh sau deploy đầu không thêm trường được, mà D3 cần **nhiều hơn một**
   trường: `display_name`; một cờ phân biệt *chưa bao giờ đặt* / *authority vừa gỡ* / *platform tự
   gỡ* (D3 gộp cả ba vào "rỗng" — ba nguyên nhân, một hiển thị); và trạng thái *cấm đặt lại* ở
   đường 1.
4. **Xoá hàng loạt chưa được cân.** `registry_authority` hôm nay là một khoá đơn (L2). Với D3, khoá
   rò thì kẻ cầm nó không chiếm được tên của ai — nhưng **gỡ được tên của tất cả** trong một lượt.
   Tấn công O(1), khôi phục O(n) vòng quản trị, mà phần lớn platform chưa có quản trị chạy được.
   Trong lúc đó mọi mục trong sổ hiển thị không tên — đúng trạng thái mà R1 sinh ra để chặn.
5. Front-run: D3 chặn kẻ **đổi** tên, không chặn kẻ **đăng ký trước**. Lần ghi đầu buộc phải là
   ngoại lệ (lúc `RegisterEntry` chưa có đồng thuận nào để đòi), nên kẻ front-run đặt luôn
   `display_name` trong cùng giao dịch đăng ký, hợp lệ hoàn toàn.

**Rút ra, và nó rộng hơn D3:** một cổng hỏi *"platform này có đồng ý không"* thì vô hiệu trước đúng
kẻ nó nhắm, vì kẻ đó điều khiển cả hai đầu câu hỏi. Chỉ cổng hỏi **một bên khác** mới là cổng.

#### D4 — hai câu hỏi này HẾT HẠN CÙNG LÚC, và vì một lý do mạnh hơn đã tưởng

Thêm `display_name` là thêm một trường vào `PlatformEntry`. Đo 2026-08-27
(`onchain/validators/arity_poc_test.ak`): phép ép kiểu mềm của Aiken **kiểm khớp đúng arity**, nên
`registry.ak:297` từ chối mọi datum đích có số trường khác hiện tại ⇒ `MigrateEntry` — đường nâng
lược đồ duy nhất — **không thêm trường được**. Xem `DevStatus.md` mục "Thứ tự trường `PlatformEntry`".

⇒ `display_name` phải có mặt **trước lần deploy đầu tiên** hoặc không bao giờ. Nên câu hỏi
`platform_id` không đóng lúc "hồ sơ đầu tiên lên chuỗi" vì pid đã đặt — nó đóng vì **cái trường đi
kèm nó không thêm được nữa**. Hôm nay chi phí bằng 0; sau đó không có giá nào mua lại được.

⚠ **Hạn chót này CÓ ĐIỀU KIỆN, và điều kiện đó chưa được chứng minh khi mục này viết ra.** Nó chỉ
áp nếu `display_name` buộc phải nằm **trên chuỗi**. Đọc **D5** trước khi trích D4 làm lý do quyết
gấp — D5 trả lời rằng không có lý do nào buộc như vậy, và nếu tên hiển thị sống ngoài chuỗi thì
mục này **không áp** và hạn chót tan.

#### D5 — câu chưa ai hỏi, và nó làm hạn chót D4 biến mất

D4 kết *"quyết trước deploy hoặc mất phương án"*. Kết luận đó đúng **với điều kiện `display_name`
phải nằm trên chuỗi** — và điều kiện ấy chưa ai chứng minh. ProofChat đặt câu hỏi; nhà này trả lời.

**Trả lời: KHÔNG có lý do buộc `display_name` lên chuỗi.** Ba dữ kiện.

*Thứ nhất — không mã nào đọc nó.* Định tuyến phí đi qua `platform_id` và đối soát `custody_hash`
(`offchain/src/registryQuery.ts:275-295`); `grep -rn 'display_name\|displayName' offchain/src/` trả
**rỗng**. Tên hiển thị chưa tồn tại trong bất kỳ đường quyết định nào của máy — nó là thứ cho **mắt
người**.

*Thứ hai — lên chuỗi KHÔNG làm nó đáng tin hơn.* Nguồn thẩm quyền của tên là chữ ký authority, dù
tên nằm trong datum hay trong một bảng ký ngoài chuỗi. Trên chuỗi chỉ thêm đúng hai tính chất:
chống chối bỏ theo thời gian, và đọc được không cần máy chủ. Cả hai đều mua được **không tốn trường
nào** — xem dưới.

*Thứ ba — áp chính phép thử của §13.1.1 vào nó.* Có bên thứ ba hành xử khác đi nếu tên sai không?
**Có** (người gửi tiền). ⇒ tên hiển thị **thuộc miền nghĩa vụ**. Nhưng thuộc miền nghĩa vụ đòi
**truy được trách nhiệm**, không đòi **bất biến** — và một chữ ký truy được trách nhiệm dù nằm ở
đâu. Đây là chỗ hai khái niệm hay bị gộp: *kiểm được* ≠ *không sửa được*.

**Đường nhà này đề, chưa kiểm:** bảng `platform_id → display_name` sống ngoài chuỗi do authority ký,
và **neo bằng metadata giao dịch** (`tx metadata`, không phải datum) — một băm của bảng, ký định kỳ.
Metadata không nằm trong `PlatformEntry` nên **D4 không áp**: không thêm trường nào, hạn chót tan.
Chống chối bỏ vẫn có (ai cũng kiểm được bảng tại thời điểm khối đó), gỡ nhãn là sửa một dòng —
không giao dịch, không phí, hiệu lực ngay — và khoá rò thì **thay khoá rồi ký lại được**, thứ mà
một trường trên chuỗi không làm được.

Giá phải trả, nói trước: tên hiển thị mất tính chống chối bỏ **liên tục** (chỉ neo tại các mốc ký),
và ai muốn xác minh tên phải lấy được bảng — tức có thêm một nguồn phải giữ sống. Đây là đánh đổi
thật, không phải bữa trưa miễn phí.

**Ba chỗ đường ngoài-chuỗi này còn hở, và cả ba đều phải nằm trong spec trước khi ai cài đặt.**
Không chỗ nào lật kết luận trên; chúng là điều kiện để kết luận đó không hỏng lúc thi công.

*Hở thứ nhất — luật thuộc về BÊN ĐỌC, không thuộc về bảng.* Lý do duy nhất chọn ngoài-chuỗi là sửa
tên nhanh, nên sẽ có áp lực hiển thị tên mới **trước khi** nó được ký. Nếu bên tiêu thụ hiển thị
phần bảng mà chữ ký chưa phủ, cái neo thành đồ trang trí — nó chứng thực một thứ khác với thứ người
dùng đang nhìn. ⇒ Luật: **chỉ hiển thị phần mà chữ ký phủ; phần chưa được phủ hiển thị như CHƯA CÓ
TÊN, không hiển thị như một cái tên.** Đây là một dòng trong hợp đồng đọc, không phải một khuyến nghị.

*Hở thứ hai — một bảng tươi và một bảng chết ba tháng trả về Y HỆT NHAU.* Không có gì đỏ vì không có
gì phân biệt được: đây là **đầu dò mù**, không phải rủi ro vận hành. ⇒ Chữ ký phải mang `valid_until`,
và bên tiêu thụ **hỏng ĐÓNG** khi quá hạn: bảng hết hạn hiển thị "chưa xác minh", không bao giờ hiển
thị tên. Khi đó không ai cần ép tần suất ký — cơ chế tự ép, vì không ký lại thì tên biến mất khỏi màn
hình chứ không âm thầm cũ đi. **Cạm phải chặn ngay trong spec: `valid_until` VẮNG MẶT nghĩa là ĐÃ HẾT
HẠN, không phải vô hạn.**

*Hở thứ ba — "một băm của bảng" ở trên là băm PHẲNG, và nó hỏng ba đường.* Muốn xác minh tên của một
platform phải có toàn bộ bảng, nên bên tiêu thụ nhẹ (ví, màn hình điện thoại) hoặc tải hết hoặc phải
tin một máy chủ — mà "phải tin một máy chủ" đúng là thứ đường này nói nó tránh được; ai giữ bản sao cũ
chỉ biết băm khác chứ **không biết mục nào đổi**, nên không cảnh báo có mục tiêu được; và câu **ai phục
vụ bảng** thì đoạn trên chưa trả lời, tức là dựng một điểm chết mới đúng chỗ vừa rời khỏi chuỗi. ⇒ Neo
bằng **gốc Merkle** trên tập `(platform_id, display_name)` **đã sắp xếp**, thay cho băm phẳng. Được ba
thứ cùng lúc: chứng minh **theo từng mục** (một nhánh, không cần cả bảng), phân giải **mục nào đổi**, và
bảng nhân bản ở đâu cũng được vì bản sao nào cũng dựng được nhánh chứng minh — không ai phải là máy chủ
tin cậy. **Cạm: spec phải chốt thứ tự sắp xếp VÀ cách mã hoá lá.** Hai bản cài đặt dựng ra hai gốc khác
nhau cho cùng một bảng sẽ trông y hệt một cuộc tấn công.

Chi phí của cả ba trên chuỗi: **bằng 0** — không mục nào thêm trường vào `PlatformEntry`, nên D4 vẫn
không áp.

⇒ **Hình đúng của câu hỏi trình lên chủ nhân đã đổi.** Không còn là *"pid do người đặt hay máy
sinh, quyết gấp trước deploy"*. Nó là hai câu, câu sau chỉ hỏi khi câu trước trả lời một cách:

1. `display_name` lên chuỗi hay ngoài chuỗi? — **ngoài chuỗi thì không có hạn chót nào**.
2. Chỉ khi chọn *trên chuỗi*: chốt **toàn bộ hình dạng** hôm nay (tên + cờ ba-nguyên-nhân + trạng
   thái cấm-đặt-lại), không chỉ chốt "có thêm `display_name` hay không" — chốt thiếu một cờ hôm nay
   là mất nó vĩnh viễn theo D4.

#### D6 — cửa sổ thêm trường có BA ứng viên, không phải một, và chúng dùng chung MỘT hạn chót

D4 nói cửa sổ thêm trường vào `PlatformEntry` đóng ở lần deploy đầu. D1–D5 bàn cửa sổ ấy như thể chỉ
có một ứng viên (`display_name`). Đo lại thì có **ba**, và hai cái sau chưa từng được đặt cạnh D4:

| ứng viên | ai cần | nếu thiếu thì hỏng ra sao |
|---|---|---|
| `display_name` | máy-sinh `platform_id` (D3) | **BỊ BÁC** — D5: không có lý do nào buộc nó lên chuỗi |
| `payee_did` | trả thưởng cho một chủ thể | hồ sơ không nói được **trả cho ai**; hôm nay không trường nào giữ DID người nhận |
| bản đồ `thread → operator` | quy gán tiêu thụ về một bên | quy gán phải sống ngoài chuỗi, và bên khai tự chọn thứ mình được đối chiếu (đúng lớp **L9**) |

Ba ứng viên độc lập về mục đích nhưng **dùng chung đúng một cửa sổ**. Nên câu hỏi thật không phải
*"có thêm trường X không"* mà là *"chốt toàn bộ hình dạng hồ sơ, một lần"*. Chốt thiếu một trường hôm
nay là mất nó vĩnh viễn, không phải hoãn nó.

**Và hai ứng viên sau còn vướng một chỗ thứ hai mà D4 không nói tới.** `governed_fields_changed`
(`onchain/lib/magiclamp/registry/platform.ak:254-256`) chỉ khoá **ba** trường — `governance_ref`,
`accepted_assets`, `cut_bps`. Một trường mới **mặc định KHÔNG nằm trong nhóm ấy**, nghĩa là nó đổi được
bằng **một chữ ký `registry_authority`**, không cần đồng thuận của chính platform (nhánh U-SIG,
`onchain/validators/registry.ak:237-243`). Cộng với L2 — authority hôm nay là **một khoá đơn** — thì
một trường quyết định *tiền đi về đâu* mà nằm ngoài nhóm quản trị là một đường O(1): chiếm khoá là
viết lại toàn bộ hướng chi trong một giao dịch, và LAMP không đốt nên phần đã phát không thu về được.

⇒ Ràng buộc bắt buộc, nếu ứng viên nào được chốt là CÓ: **trường đó phải vào `governed_fields_changed`
ngay trong cùng lần chốt lược đồ.** Thêm trường mà quên nhóm quản trị thì hai lỗ cộng lại chứ không
cộng dồn tuyến tính — cửa sổ lược đồ đã đóng, mà cửa quản trị thì chưa bao giờ mở.

**Ràng buộc TẠM THỜI đang có hiệu lực (fail-closed):** chưa hồ sơ nào lên chuỗi
(`DevStatus.md` §trạng thái triển khai), nên chưa mất phương án nào và đổi script hash còn miễn phí.
Điều kiện chấm dứt trạng thái tạm này là **lần deploy đầu tiên**, không phải một ngày trên lịch.

#### D7 — chốt SuperApp gỡ MỘT ứng viên khỏi cửa sổ D6, và đúng một cái thôi

Chủ nhân chốt 2026-08-30: **instance của SuperApp nằm DƯỚI định danh SuperApp**, không niêm yết
riêng. Mỗi instance có một Phoenix DID riêng, nhưng DID là **tầng danh tính**, không phải một mục
trong sổ này — hai sổ khác nhau. Đường tuân thủ bắc cầu: instance → luật SuperApp → Registry. Trong
sổ: **một** thực thể, tên SuperApp.

Trước chốt này, cửa sổ D6 còn treo một ứng viên thứ tư chưa đặt tên rõ: *một chỗ trong hồ sơ cho mỗi
instance* — vì hai yêu cầu đã chốt của SuperApp kéo ngược nhau (thêm app phải miễn phí và không qua
đội lõi ⟂ mỗi instance là pháp nhân riêng ở thế giới ngoài). Chốt trên **đóng ứng viên đó**: hồ sơ
không cần trường nào cho instance, vì không có instance nào đứng trong sổ.

**Nó gỡ đúng một ứng viên, không gỡ hai.** Bản đồ `thread → operator` của D6 phục vụ quy gán tiêu thụ
cho **mọi** đường vào — API trực tiếp, web, app ngoài SuperApp — nên nó không sống nhờ và cũng không
chết theo chốt này. Đọc chốt thành "hồ sơ không cần thêm gì nữa" là đọc rộng hơn thứ đã chốt.

**Một hệ quả về Sybil, và nó nhỏ hơn nó trông.** Trục "một người dựng nhiều HỒ SƠ để lách trần
30%/app" đóng **ở riêng đường instance của SuperApp**: hàng nghìn instance ra đời thì sổ vẫn thấy
đúng một hồ sơ. Trục ấy còn nguyên với các đường vào khác, và chốt này không tuyên gì về chúng.

#### D8 — hai ứng viên bị BÁC, và cửa thứ hai mà D6 chưa kê. Lược đồ hôm nay: 12 trường

Hội đồng đã chạy trên ba ứng viên còn lại của cửa sổ D6 — `payee_did`, bản đồ `thread → operator`,
và không-thêm-gì. **Chốt (2026-08-30): bác cả hai ứng viên.**

⚠ **Chốt này bác HAI ỨNG VIÊN CỤ THỂ, nó KHÔNG đóng lược đồ.** Bản trước của mục này viết *"không
thêm trường nào — lược đồ đứng ở 11 trường"*, và câu ấy đã hết đúng ba ngày sau: `substrate_flags`
vào lược đồ ngày 2026-09-02, nâng lên **12 trường**. Sửa ở đây chứ không đính chính bên cạnh, vì
hai bản cùng đứng thì bản cũ vẫn ngang quyền với bản mới trong mắt người đọc sau.

**Vì sao `substrate_flags` không rơi vào cùng nhóm với hai ứng viên bị bác** — cả hai lý lẽ bác ở
dưới đều không bắt được nó, và đó là phép thử để dùng lại cho ứng viên thứ tư:

1. Lý lẽ *"mua tính bất biến trong khi thứ cần là truy được trách nhiệm"* không áp: cờ bit không
   phải một đích trả tiền, nó không thay thế một chặng phân giải nào.
2. Lý lẽ *"để một khoá đơn ghi byte do nó tự chọn"* không áp: `substrate_flags` nằm trong
   `governed_fields_changed`, nên đổi nó đòi authority ký **và** đồng thuận quản trị của chính
   platform. Đây là điều kiện phải giữ — trường mới nào không vào được nhóm đó thì lý lẽ 2 bắt
   được nó, và nó phải bị bác.
3. Chi phí min-ADA cố định, không tăng theo N — khác hẳn bản đồ `thread → operator` ở dưới.

**Và cửa sổ nay ĐÃ ĐÓNG, bằng một cơ chế khác chốt này.** Không phải vì hội đồng quyết dừng, mà vì
soft-cast của Aiken kiểm khớp **đúng arity**: sau tx đầu tiên, thêm hay bớt một trường đều bị mọi
validator hiện hành từ chối. Nên câu hỏi "còn thêm được không" từ nay có câu trả lời cơ học, tra ở
`DevStatus.md` §"Thứ tự trường `PlatformEntry`", không tra ở mục này.

**Vì sao, gọn trong một câu:** cả hai trường định thêm đều mua *tính bất biến*, trong khi thứ bài
toán cần là *truy được trách nhiệm* — và một chữ ký truy được trách nhiệm dù nó nằm ở đâu. §D5 đã
tách sẵn hai thứ đó ("kiểm được ≠ không sửa được"); chỗ này chỉ là áp câu ấy cho hai ứng viên.

**Ba dữ kiện dẫn tới chốt, mỗi cái tự đứng được:**

1. **Thứ `payee_did` định mua thì hồ sơ đã có, rẻ hơn.** Đích trả tiền nằm sẵn ở `custody_hash` +
   `instance_id` + `seed_policy` (`platform.ak:126-128`), và chi tiêu chỗ đó đã bị `governance_ref`
   của chính platform gác. `payee_did` **không khép được vòng**: DID không phải payment credential,
   vẫn phải phân giải DID → địa chỉ ở ngoài chuỗi. Nó đổi một trường bất biến lấy thêm một chặng
   tin cậy — đúng biến thể L9 của cửa phân giải.
2. **Bản đồ `thread → operator` không giải được bài toán nó nhắm, và kho này đã có phản chứng.**
   `bench/DOI-CHIEU.md:30-35`: đường "không đốt gì, chỉ khai CUNG để lấy phần của tổng do người khác
   đốt" có lợi nhuận dương với **mọi** tham số, và chặn được bằng đúng ba thứ — biên nhận do bên
   **không hưởng lợi** ký, thách thức có phát hiện thật, cổng danh tính cho node. Không thứ nào
   trong ba là một trường datum. Bản đồ do chính bên hưởng lợi khai, đặt lên chuỗi, chỉ làm **lời
   khai sai thành bất biến** — và tốn ADA vĩnh viễn: ở N=100 cặp, min-ADA ô hồ sơ ước lượng ~29 ADA
   so với ~1,5–2 ADA hôm nay, khoá cứng vì `value_not_drained` (`util.ak:263-267`) chỉ cho lovelace
   **tăng**. Thêm thread từng cái một là O(N²) ExUnit, và vượt trần kích thước tx thì hồ sơ **không
   spend được nữa** — gạch chết mang theo beacon, phá thẳng PK5.
3. **Không validator nào ở LAMP đọc entry này để quyết đích chi** (đo 2026-08-30):
   `LAMP/Distribution/onchain/validators/claim_account.ak:117` dùng `tx.reference_inputs` để lấy
   beacon **của Distribution**, không phải entry Registry; đích chi là `util.vk_address(t_owner)`
   (`:401`), tức chủ tài khoản claim. Đây là giả định load-bearing của chốt này, nên nó được viết ra
   để có người giữ: **nếu** về sau một validator chia thưởng đọc entry Registry làm đầu vào tham
   chiếu để lấy đích chi, **và** tập người nhận gồm cả hạng KHÔNG KHO, thì chốt này hụt và không mua
   lại được. Điều kiện chấm dứt: lần deploy đầu tiên.

**Hai luật thay cho hai trường** — cả hai sửa được sau deploy, hồi tố được, giá 0 giao dịch:
- thay `payee_did`: **muốn nhận thưởng thì phải đăng ký ở hạng CÓ KHO** (`REGISTRATION-STANDARD.md`
  §2.3). Người nhận thưởng khi ấy được gác bằng cổng quản trị của chính họ — chặt hơn một chuỗi DID
  nằm trong datum;
- thay bản đồ: quy gán bằng **biên nhận do bên không hưởng lợi ký**, neo ở metadata giao dịch chứ
  không ở datum — đúng khuôn D5 đã dùng khi bác `display_name`.

**Cái mà chốt này giữ được, và chưa tài liệu nào ghi:** 12 trường hôm nay chia hết thành 1
`spec_version` (đóng băng ở Update — khối U-VER @ `registry.ak`) + 6 trường định danh
(`identity_preserved` @ `platform.ak`) + 4 trường quản trị + `status`. **Không trường nào để một
khoá đơn ghi byte do nó tự chọn.** Đó là tính chất mạnh nhất của lược đồ hiện tại; cả `payee_did`
lẫn bản đồ đều phá nó, còn `substrate_flags` thì giữ được nó nhờ nằm trong nhóm quản trị.

**Giá phải trả, nói trước:** mất tính chống-chối-bỏ *liên tục* của đích trả và của quy gán — chỉ còn
neo tại mốc ký — và phải giữ sống một nguồn ngoài chuỗi. Đây là đánh đổi thật, không phải chi phí ẩn.

##### D8-b — điều kiện của D6 từng kê thiếu một chỗ, và chỗ đó nay đóng bằng CƠ CHẾ

D6 chốt: trường mới phải vào `governed_fields_changed` ngay trong cùng lần chốt lược đồ. Đúng, nhưng
đã từng **chưa đủ** — và cách nó chưa đủ đáng giữ lại, vì nó là một hình dạng lỗi tái diễn chứ không
phải một lần sơ ý.

`pure_revive` (hàm `spend` của `registry.ak`, nhánh `UpdateEntry`) trước đây **liệt kê bằng tay**
từng trường khả biến phải y hệt: `spec_version`, `governance_ref`, `accepted_assets`, `cut_bps`. Một
trường mới không có trong danh sách ấy ⇒ đường **Paused → Active** thành cửa đổi trường mới mà
**không cần chữ ký authority nào** — chỉ cần cổng quản trị của chính platform chạy. Và nó đã xảy ra
đúng như thế: `substrate_flags` vào lược đồ 2026-09-02, vào `governed_fields_changed` cùng ngày, mà
danh sách kia không theo kịp. Cùng một trường, hai đường đi, hai luật — trình biên dịch im lặng, vì
thiếu một vế trong một hội chỉ làm vị từ **lỏng hơn**, không làm nó sai kiểu.

⇒ Vá 2026-09-05 (`registry.ak`, `pure_revive`): thay danh sách bằng **một phép so trên cả bản ghi**,
chừa đúng `status`:

```
entry_in.status == Paused && entry_out == PlatformEntry { ..entry_in, status: Active }
```

Tương đương với bản cũ tại chỗ nó đứng, và điều đó kiểm được bằng cách đếm: 12 trường = `status`
(chừa ra, ép `Active`) + `spec_version` (U-VER ép ngay trên) + sáu trường định danh (U-ID qua
`identity_preserved`) + bốn trường quản trị (danh sách cũ). Không trường nào ở ngoài. Đo bằng đột
biến: gỡ vế so cả bản ghi ⇒ **3 bài đỏ**; khôi phục ⇒ 138/138.

⇒ **Điều kiện của D6 nay chỉ còn một vế**: trường mới phải vào `governed_fields_changed`. Vế
`pure_revive` không còn là một chỗ phải nhớ — trường thứ 13 nào cũng tự nằm trong phép so, và ai muốn
cho một trường mới đổi được khi hồi sinh thì phải viết ngoại lệ ra bằng chữ, tức quyết định ấy hiện
lên trong diff thay vì trốn trong một dòng bị bỏ quên.

#### L10 — tính DUY NHẤT của `platform_id` đứng trên một chữ ký người, không trên một dòng mã

R1 của chuẩn đăng ký từ chối hồ sơ trùng `platform_id`, và nó **kiểm được bằng máy** — nhưng máy đó
là bộ quét thư mục `Registrations/` chạy ngoài chuỗi (`REGISTRATION-STANDARD.md` §R1). Trên chuỗi,
`onchain/validators/registry_beacon.ak` ép: mint đúng một token của policy này (R-MINT-1, `:92-95`),
tên token khớp `entry.platform_id` (R-NAME, `:120-121`), và authority ký (R-SIG, `:89`). **Không bước
nào so tên vừa mint với các beacon đã mint trước đó** — không có phép đo nào làm được việc ấy trong
một validator, vì nó cần biết trạng thái toàn sổ.

Chỗ này validator tự khai, không phải phát hiện ngầm — `registry_beacon.ak:6`:

> mỗi đăng ký → đảm bảo platform_id DUY NHẤT (**authority không ký trùng**)

⇒ Bất biến "một tên, một platform" là **giả định về hành vi của người giữ khoá**, không phải một
ràng buộc mã. Hai lần ký cho cùng một tên — do bị lừa, do bất cẩn, do quy trình duyệt ngoài chuỗi
chạy chậm hơn tốc độ ký — sinh **hai beacon cùng tên dưới cùng policy**, và validator nhận cả hai là
hợp lệ. Bên đọc sổ theo tên sẽ thấy hai hồ sơ chính danh, không có căn cứ trên chuỗi để phân định.

**Hai hệ quả phải nói ra:**

1. **Nó độc lập với hình dạng hồ sơ.** Chọn thêm trường hay không thêm trường đều không chạm tới lỗ
   này — nó nằm ở tầng mint. Đừng tính nó vào bảng so sánh D6 như một điểm trừ của phương án nào.
2. **Nó cộng hưởng với L2.** Khoá authority là khoá đơn, và cùng khoá đó vừa gác tính duy nhất vừa
   là đường cứu duy nhất: `registry.ak:139-143` ghi thẳng — *"MẤT KHOÁ AUTHORITY ⇒ TOÀN SỔ ĐÔNG CỨNG.
   U-SIG và M-SIG đều đòi ĐÚNG `registry_authority`, kể cả nhánh cứu MigrateEntry"*. Nên hỏng ở đây
   không có đường lùi trên chuỗi: phải triển khai registry mới với policy beacon mới và onboard lại
   từ đầu.

Đường đóng đúng là đường validator đã tự chỉ: chuyển `registry_authority` sang script nhiều chữ ký
hoặc DAO — **không** thêm luật vào validator này. Và chừng nào chưa chuyển, chuẩn đăng ký phải nói
thẳng rằng tính duy nhất được bảo đảm bằng quy trình, không bằng mã.

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

### L9 — cổng nhận ĐẦU-BÊN-KIA làm đối số: `verifyEntryAgainstCustody`

`verifyEntryAgainstCustody(entry, custodyUtxo)` (`offchain/src/registryQuery.ts:234-268`) mang tên
"đối soát với kho", nhưng nó chỉ kiểm hồ sơ **tự nhất quán** với một UTxO mà **bên gọi tự đưa vào**.
Kẻ gọi chọn luôn thứ mình sẽ bị đối chiếu với. Bảng ở §14 L1 D1 đã ghi hệ quả đo được: van này PASS
với một kho **tự dựng hoàn toàn** (`onchain/validators/registry_beacon.ak:186-189`).

Đây không phải "cổng thiếu", cũng không phải "cổng sai" — nó là một lớp riêng, và lớp đó cần một câu
hỏi riêng để bắt. Ba câu vẫn dùng để soi một cổng là: *(1) đầu bên kia có tồn tại không · (2) cổng
kiểm có đúng điều nó khai không · (3) cổng có kiểm CHẶT HƠN thứ đặc tả hứa không.* Cả ba đều cho
`verifyEntryAgainstCustody` đi qua: kho tồn tại, hàm làm đúng điều nó làm, và nó không chặt quá.

**Câu thứ tư, do LAMP đề (thư 2026-08-28), là câu bắt được nó:**

> **Cổng đối chiếu với CÁI GÌ, và AI chọn cái đó?**

Bên gọi chọn ⇒ cổng chỉ là một phép kiểm **hình dạng** đội lốt một phép kiểm **danh tính**.

Lớp này có ít nhất một biến thể khác cơ chế, cùng chỗ hổng, đo được ở kho LAMP: một validator gác
quyền bằng cách đếm `extra_signatories`, nhưng danh sách người ký lại là apply-param **nướng vào
chính script hash** — nên "đối soát với uỷ ban" thật ra là "đối soát với một bản sao uỷ ban đã đông
cứng lúc deploy". Điểm chung: **cái được đối chiếu và cái đáng lẽ phải được đối chiếu là hai thứ
khác nhau, và không dòng mã nào nói ra điều đó.** Tên hàm là chỗ duy nhất nói rằng có một kho thật,
và tên hàm thì không thi hành được.

**Biến thể thứ hai, PhoenixKey đề (thư 2026-08-30), cùng chỉ vào một chỗ:**

> **Cổng của tôi an toàn với ĐIỀU KIỆN nào, và AI bảo đảm điều kiện đó?**

Ca thật đi kèm: một trình phân giải danh tính công khai an toàn **với điều kiện chuỗi định danh khó
lấy**. Điều kiện ấy chưa từng được viết ra ở đâu, nên không ai nhận trách nhiệm giữ nó — và một nhà
khác công bố đúng chuỗi ấy trên một trang tra cứu, phá điều kiện đó, **mà không ai làm sai cả**. Mỗi
bên soi cổng của mình đều thấy đúng vai.

Hai biến thể ghép lại thành một mệnh đề dùng được: **một cổng đứng trên một giả định không được viết
ra thì giả định đó không có người giữ.** Biến thể của LAMP hỏi về *đối tượng* đối chiếu; biến thể của
PhoenixKey hỏi về *điều kiện* nền. Cả hai đều là thứ không lộ ra khi đọc một tệp — chỉ lộ khi có người
đứng ở chỗ nhìn được cả hai đầu, và trong một hệ nhiều nhà thì thường không ai đứng ở đó.

Chưa vá. Vá đúng nghĩa đòi nguồn của `custodyUtxo` **không do bên gọi chọn** — tra từ `custody_hash`
trong chính entry, hoặc từ một reference input mà validator ràng. Ghi ra ở đây vì cả bộ kiểm hiện
tại lẫn ba câu cũ đều không bắt được nó.

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
grep -n 'identity_preserved' -A6 /Users/ductiger/Projects/MagicLampEco/Registry/onchain/lib/magiclamp/registry/platform.ak
grep -o '[RUM]-[A-Z0-9-]*' /Users/ductiger/Projects/MagicLampEco/Registry/onchain/validators/*.ak | sort -u

# kiểm thử + build
cd /Users/ductiger/Projects/MagicLampEco/Registry/onchain && aiken check && aiken build

# script hash trước/sau khi sửa validator
cd /Users/ductiger/Projects/MagicLampEco/Registry/onchain && aiken build && \
  jq -r '.validators[] | "\(.title) \(.hash)"' plutus.json
```

Trạng thái thi công (nhánh nào, đã commit chưa) đọc ở [`../DevStatus.md`](../DevStatus.md) — **nơi
duy nhất** phát biểu hiện trạng.

---

## §18. Nhật ký thay đổi

Không ghi ở đây. Nguồn duy nhất: [`../ChangeLog.md`](../ChangeLog.md).
