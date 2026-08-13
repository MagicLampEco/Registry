// Validator tests cho registry_beacon (minting policy — đăng ký Platform vào registry).
// Phủ: đăng ký đúng (pass); thiếu chữ ký authority (fail); mint qty 2 (fail);
//      mint 2 asset name (fail); output mang NFT ở SCRIPT LẠ (fail — ca từng lọt ở v1);
//      output ở ví thường (fail); entry.platform_id ≠ NFT name (fail);
//      beacon_policy khai sai (fail); spec_version ≠ 2 (fail); ô hồ sơ mang token lạ
//      (fail); created_epoch ngoài cửa sổ hiệu lực / range không gọn 1 epoch (fail);
//      entry KHÔNG well-formed các kiểu (fail); burn (mint âm) (fail); R-BIND (fail).
//
// Phong cách mirror custody_seed_test.ak: mint test + self-ref NFT, placeholder tx,
// authority vkh đặt trong extra_signatories.

use aiken/interval.{Finite, Interval, IntervalBound}
use cardano/assets
use cardano/transaction.{Input, Output, Transaction, ValidityRange, placeholder}
use magiclamp/registry/platform.{Active, Paused, PlatformEntry, RegisterPlatform}
use registry_beacon
use magiclamp/registry/types.{AssetKey}
use magiclamp/registry/util

// ── Hằng số test ──
const beacon_policy: assets.PolicyId = #"b3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3ac"

// registry_authority (committee→DAO) — vkh ký mỗi đăng ký.
const authority: ByteArray = #"a07a01"

// script hash registry validator (entry UTxO PHẢI sống ở đây — R-OUT-1 v2).
const reg_sh: ByteArray = #"4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f"

const platform_id: ByteArray = #"706b"

const instance_id: ByteArray = #"abcd"

const custody_hash: ByteArray = #"c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0"

const seed_policy: ByteArray = #"5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed"

const governance_ref: ByteArray = #"99999999999999999999999999999999999999999999999999999999"

const lamp_policy: ByteArray = #"1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b"

const lamp_name: ByteArray = #"4c414d50"

// Ô THỜI GIAN đăng ký của entry mặc định — tx mặc định đặt validity_range GỌN trong ô này.
// (Tên trường datum vẫn là `created_epoch`, nhưng đơn vị là ô 5 ngày kể từ mốc Unix.)
const reg_epoch: Int = 5

// governance_ref dài SAI (27 và 29 byte) — script hash Cardano luôn 28.
const gov_27: ByteArray = #"999999999999999999999999999999999999999999999999999999"

const gov_29: ByteArray =
  #"9999999999999999999999999999999999999999999999999999999999"

fn accepted() -> List<AssetKey> {
  [AssetKey { policy: #"", name: #"" }, AssetKey { policy: lamp_policy, name: lamp_name }]
}

// Entry well-formed mặc định (happy): spec_version v2, platform_id == NFT name,
// beacon_policy == policy thật, mọi định danh khác rỗng, cut_bps∈[0,10000],
// accepted khác [], status Active, created_epoch == epoch của tx.
fn entry() -> PlatformEntry {
  PlatformEntry {
    spec_version: platform.spec_version_v2,
    platform_id: platform_id,
    instance_id: instance_id,
    custody_hash: custody_hash,
    seed_policy: seed_policy,
    beacon_policy: beacon_policy,
    governance_ref: governance_ref,
    accepted_assets: accepted(),
    cut_bps: 1000,
    created_epoch: reg_epoch,
    status: Active,
  }
}

// validity_range GỌN trong ô e (lower = e*ms, upper = (e+1)*ms − 1, CẢ HAI bao gồm) —
// đúng quy ước get_time_bucket_bounded.
fn bucket_range(e: Int) -> ValidityRange {
  interval.between(e * util.ms_per_time_bucket, ( e + 1 ) * util.ms_per_time_bucket - 1)
}

// validity_range với biên trên LOẠI TRỪ tại mốc `hi` — đúng cách ledger mã hoá
// `invalid_hereafter`. Dùng cho các ca `is_inclusive`.
fn range_excl_upper(lo: Int, hi: Int) -> ValidityRange {
  Interval {
    lower_bound: IntervalBound { bound_type: Finite(lo), is_inclusive: True },
    upper_bound: IntervalBound { bound_type: Finite(hi), is_inclusive: False },
  }
}

// Mint beacon NFT name=name, qty.
fn beacon_mint(name: ByteArray, qty: Int) -> assets.Value {
  assets.add(assets.zero, beacon_policy, name, qty)
}

// Value entry mang beacon NFT (beacon_policy, name) qty 1 + min-ADA.
fn with_nft(name: ByteArray) -> assets.Value {
  assets.from_lovelace(2_000_000) |> assets.add(beacon_policy, name, 1)
}

// Output entry ở SCRIPT registry (đúng registry_hash) mang NFT name + datum.
fn entry_output(name: ByteArray, e: PlatformEntry) -> Output {
  util.mk_output(util.script_address(reg_sh), with_nft(name), e)
}

// Reference input custody (R-BIND): UTxO ở Script(sh) mang authenticity NFT
// (sp, iid) qty 1. Custody phải seed TRƯỚC đăng ký (onboard 2 bước).
fn custody_ref(sh: ByteArray, sp: ByteArray, iid: ByteArray) -> Input {
  let value = assets.from_lovelace(2_000_000) |> assets.add(sp, iid, 1)
  util.mk_input(util.mk_ref(9), util.mk_output_no_datum(util.script_address(sh), value))
}

// Reference custody hợp lệ cho entry mặc định: Script(custody_hash) mang (seed_policy, instance_id).
fn custody_ref_ok() -> Input {
  custody_ref(custody_hash, seed_policy, instance_id)
}

// Dựng tx đăng ký: mint NFT, outputs, reference custody, ký authority, validity_range
// GỌN trong epoch đăng ký mặc định.
fn reg_tx(
  mint    : assets.Value,
  outputs : List<Output>,
  refs    : List<Input>,
  signers : List<ByteArray>,
) -> Transaction {
  reg_tx_in_range(mint, outputs, refs, signers, bucket_range(reg_epoch))
}

// Bản có kiểm soát validity_range (dùng cho các ca R-EPOCH).
fn reg_tx_in_range(
  mint    : assets.Value,
  outputs : List<Output>,
  refs    : List<Input>,
  signers : List<ByteArray>,
  range   : ValidityRange,
) -> Transaction {
  Transaction {
    ..placeholder,
    outputs: outputs,
    reference_inputs: refs,
    mint: mint,
    extra_signatories: signers,
    validity_range: range,
  }
}

fn run(tx: Transaction) -> Bool {
  registry_beacon.registry_beacon.mint(
    authority, reg_sh, RegisterPlatform, beacon_policy, tx,
  )
}

// ════════════════════════════════════════════════════════════
// 1. ĐĂNG KÝ ĐÚNG (pass) — authority ký, mint 1 NFT name=platform_id,
//    1 output Ở ĐÚNG Script(registry_hash) mang NFT + datum well-formed
//    (platform_id==name, beacon_policy==policy thật, spec_version==2,
//    created_epoch == epoch của tx).
// ════════════════════════════════════════════════════════════
test register_happy() {
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 2. THIẾU CHỮ KÝ AUTHORITY (fail) — extra_signatories không có vkh authority (R-SIG).
//    Fail SỚM hơn R-BIND → không cần reference custody.
// ════════════════════════════════════════════════════════════
test register_no_authority_sig() fail {
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [],
      [#"deadbeef"],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 3. MINT QTY 2 (fail) — supply phải 1 (R-MINT-1).
// ════════════════════════════════════════════════════════════
test register_mint_two() fail {
  // output mang đủ 2 NFT để qua R-OUT-1 (count==1) → cô lập nguyên nhân = qty.
  let value = assets.from_lovelace(2_000_000) |> assets.add(beacon_policy, platform_id, 2)
  let out = util.mk_output(util.script_address(reg_sh), value, entry())
  let tx = reg_tx(beacon_mint(platform_id, 2), [out], [], [authority])
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 4. MINT 2 ASSET NAME CÙNG POLICY (fail) — dict.size > 1 (R-MINT-1).
// ════════════════════════════════════════════════════════════
test register_mint_two_names() fail {
  let mint = beacon_mint(platform_id, 1) |> assets.add(beacon_policy, #"ffff", 1)
  let tx = reg_tx(mint, [entry_output(platform_id, entry())], [], [authority])
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 5. R-OUT-1 (v2) — ô hồ sơ PHẢI ở đúng Script(registry_hash).
// ════════════════════════════════════════════════════════════
// 5a. Output mang NFT ở SCRIPT LẠ (fail). ĐÂY LÀ CA TỪNG LỌT Ở v1: cổng đúc chỉ ép
//     "không phải ví thường", nên hồ sơ đặt ở script bất kỳ vẫn qua — và khi đó
//     registry.ak không có quyền tài phán (không U-SIG, không U-ID, không U-NFT).
test register_output_foreign_script() fail {
  let foreign =
    util.mk_output(util.script_address(#"beefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef"), with_nft(platform_id), entry())
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [foreign],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// 5b. Output mang NFT ở VÍ THƯỜNG (fail) — giữ ca cũ.
test register_output_not_script() fail {
  let wallet_out =
    util.mk_output(util.vk_address(#"a0"), with_nft(platform_id), entry())
  let tx = reg_tx(beacon_mint(platform_id, 1), [wallet_out], [], [authority])
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 6. NFT NAME ≠ entry.platform_id (fail) — R-NAME.
//    Mint name=#"ffff" (output mang đúng nó qua R-OUT-1) nhưng datum.platform_id=#"706b".
// ════════════════════════════════════════════════════════════
test register_name_mismatch() fail {
  let tx =
    reg_tx(
      beacon_mint(#"ffff", 1),
      [entry_output(#"ffff", entry())],
      [],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 6b. R-POLICY — beacon_policy trong datum khai SAI (fail).
//     registry.ak đọc beacon_policy TỪ DATUM để đối chiếu NFT; nếu lời tự khai không
//     bị ép khớp policy thật lúc đúc thì hồ sơ tự trỏ sang một policy tự chế.
// ════════════════════════════════════════════════════════════
test register_beacon_policy_mismatch() fail {
  let e = PlatformEntry { ..entry(), beacon_policy: #"dead" }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 6c. R-VER — spec_version ≠ 2 lúc đăng ký (fail).
// ════════════════════════════════════════════════════════════
test register_spec_version_wrong() fail {
  let e = PlatformEntry { ..entry(), spec_version: 1 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 6d. R-VALUE — ô hồ sơ mang thêm TOKEN LẠ (fail).
// ════════════════════════════════════════════════════════════
test register_output_extra_token() fail {
  let value =
    with_nft(platform_id) |> assets.add(#"f0f0", #"00", 7)
  let out = util.mk_output(util.script_address(reg_sh), value, entry())
  let tx =
    reg_tx(beacon_mint(platform_id, 1), [out], [custody_ref_ok()], [authority])
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 6e. R-EPOCH — created_epoch phải là epoch của CHÍNH tx đăng ký.
// ════════════════════════════════════════════════════════════
// 6e-1. created_epoch NGOÀI cửa sổ hiệu lực (fail) — entry khai epoch 5, tx hiệu lực ở
//       epoch 6. Ca kinh điển: khai 0 để ra vẻ platform lâu đời nhất hệ.
test register_epoch_outside_window() fail {
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
      bucket_range(reg_epoch + 1),
    )
  run(tx)
}

// 6e-2. created_epoch = 0 (fail) — lời khai "lâu đời nhất hệ".
test register_epoch_zero_claim() fail {
  let e = PlatformEntry { ..entry(), created_epoch: 0 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// 6e-3. validity_range VÔ HẠN (fail) — không suy ra được epoch tin cậy.
test register_epoch_unbounded_range() fail {
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
      interval.everything,
    )
  run(tx)
}

// 6e-4. validity_range TRẢI QUA biên epoch (fail) — chống đặt lower ở epoch cũ rồi
//       submit muộn để đóng băng created_epoch.
test register_epoch_range_spans_two() fail {
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
      interval.between(
        reg_epoch * util.ms_per_time_bucket,
        ( reg_epoch + 1 ) * util.ms_per_time_bucket,
      ),
    )
  run(tx)
}

// 6e-5. created_epoch ĐÚNG cửa sổ ở một epoch khác (pass) — xác nhận R-EPOCH không
//       khoá cứng vào một epoch cố định, chỉ đòi khớp tx.
test register_epoch_other_epoch_ok() {
  let e = PlatformEntry { ..entry(), created_epoch: 42 }
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
      bucket_range(42),
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 7. ENTRY KHÔNG WELL-FORMED (fail) — R-WF, từng field vi phạm.
//    Mỗi ca giữ platform_id == NFT name (qua R-NAME) để cô lập nguyên nhân = R-WF.
// ════════════════════════════════════════════════════════════
// 7a. instance_id rỗng.
test register_not_wellformed_instance_empty() fail {
  let e = PlatformEntry { ..entry(), instance_id: #"" }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7b. custody_hash rỗng.
test register_not_wellformed_custody_empty() fail {
  let e = PlatformEntry { ..entry(), custody_hash: #"" }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7c. seed_policy rỗng.
test register_not_wellformed_seed_empty() fail {
  let e = PlatformEntry { ..entry(), seed_policy: #"" }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7d. governance_ref rỗng.
test register_not_wellformed_gov_empty() fail {
  let e = PlatformEntry { ..entry(), governance_ref: #"" }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7e. accepted_assets rỗng.
test register_not_wellformed_accepted_empty() fail {
  let e = PlatformEntry { ..entry(), accepted_assets: [] }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7f. cut_bps âm.
test register_not_wellformed_cut_negative() fail {
  let e = PlatformEntry { ..entry(), cut_bps: -1 }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7g. cut_bps > 10000.
test register_not_wellformed_cut_over() fail {
  let e = PlatformEntry { ..entry(), cut_bps: 10001 }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// 7h. status ≠ Active (Paused) — entry_well_formed ép status == Active.
test register_not_wellformed_status_paused() fail {
  let e = PlatformEntry { ..entry(), status: Paused }
  let tx = reg_tx(beacon_mint(platform_id, 1), [entry_output(platform_id, e)], [], [authority])
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 8. BURN (fail) — mint âm (qty -1) bị else/qty chặn (beacon sống suốt vòng đời).
//    qty == 1 fail trong nhánh mint; burn-only redeemer cũng rơi else fail.
// ════════════════════════════════════════════════════════════
test register_burn_rejected() fail {
  // output mang NFT qty 1 để qua R-OUT-1 → cô lập nguyên nhân = qty == -1.
  let tx =
    reg_tx(
      beacon_mint(platform_id, -1),
      [entry_output(platform_id, entry())],
      [],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 9. R-BIND — entry phải trỏ custody THẬT (reference input custody mang đúng
//    1 NFT authenticity (seed_policy, instance_id) ở Script(custody_hash)).
// ════════════════════════════════════════════════════════════
// 9a. KHÔNG có reference custody (fail) — đủ authority/mint/well-formed/epoch nhưng
//     reference_inputs rỗng → list.find không thấy → R-BIND fail.
test register_no_custody_ref() fail {
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [],
      [authority],
    )
  run(tx)
}

// 9b. Custody mang đúng NFT nhưng SAI script hash (fail) — Script ≠ entry.custody_hash
//     → custody_h == entry.custody_hash fail.
test register_custody_wrong_hash() fail {
  let bad = custody_ref(#"deaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead", seed_policy, instance_id)
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [bad],
      [authority],
    )
  run(tx)
}

// 9c. Custody ở đúng hash nhưng value KHÔNG mang (seed_policy, instance_id) NFT (fail)
//     → list.find không thấy input nào quantity_of == 1 → R-BIND fail.
test register_custody_missing_nft() fail {
  // NFT khác policy/name (không khớp seed_policy/instance_id của entry).
  let no_auth =
    util.mk_input(
      util.mk_ref(9),
      util.mk_output_no_datum(
        util.script_address(custody_hash),
        assets.from_lovelace(2_000_000) |> assets.add(#"beef", #"00", 1),
      ),
    )
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [no_auth],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 10. MINT POLICY LẠ KÈM ĐĂNG KÝ (fail) — [F5 R-MINT-2] least-authority.
//   tx mint beacon NFT (đúng) + token policy NGOÀI (#"f0f0") trong CÙNG tx →
//   policies(tx.mint) = 2 ≠ 1 → R-MINT-2 chặn. Đăng ký beacon KHÔNG ngầm cho phép
//   đồng-mint token lạ (chống beacon "gánh" mint policy khác để né kiểm soát supply).
// ════════════════════════════════════════════════════════════
test register_mint_foreign_policy() fail {
  let mint = beacon_mint(platform_id, 1) |> assets.add(#"f0f0", #"00", 1)
  let tx =
    reg_tx(
      mint,
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 11. R-GOVSELF — hồ sơ khai cổng quản trị CHÍNH LÀ registry (fail).
//     KHOÁ LỖ: `governance_consented` quét tx.inputs tìm input ở Script(governance_ref),
//     mà ô hồ sơ đang chi tiêu LUÔN nằm ở Script(registry_hash) ⇒ khai
//     `governance_ref = registry_hash` biến đồng thuận quản trị thành hằng True vĩnh
//     viễn ⇒ authority một mình Retire / đổi cut_bps / di trú được. Trước bản vá, hồ sơ
//     này ĐƯỢC NHẬN (PoC `poc_register_with_self_gov_accepted` PASS).
// ════════════════════════════════════════════════════════════
test register_self_gov_rejected() fail {
  let e = PlatformEntry { ..entry(), governance_ref: reg_sh }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// 11b. governance_ref dài 27 byte (fail) — script hash Cardano LUÔN 28 byte; giá trị rác
//      trỏ tới script không thể tồn tại ⇒ đồng thuận không bao giờ thoả ⇒ hồ sơ khoá chết.
test register_gov_ref_27_bytes() fail {
  let e = PlatformEntry { ..entry(), governance_ref: gov_27 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// 11c. governance_ref dài 29 byte (fail) — chặn cả chiều dài hơn, không chỉ ngắn hơn.
test register_gov_ref_29_bytes() fail {
  let e = PlatformEntry { ..entry(), governance_ref: gov_29 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 12. HẠNG KHÔNG KHO — dịch vụ không thu tiền vẫn lên sổ được (khép issue #5 mục 3).
//     Trước bản vá `entry_well_formed` đòi `accepted_assets != []` + mọi định danh khác
//     rỗng ⇒ hồ sơ không-kho KẸT VĨNH VIỄN ở cửa nộp.
// ════════════════════════════════════════════════════════════
// Hồ sơ KHÔNG KHO đúng hình dạng: instance_id/custody_hash/seed_policy rỗng,
// accepted rỗng, cut_bps 0 — nhưng governance_ref VẪN bắt buộc (để có bên đồng thuận).
fn entry_non_custodial() -> PlatformEntry {
  PlatformEntry {
    ..entry(),
    instance_id: #"",
    custody_hash: #"",
    seed_policy: #"",
    accepted_assets: [],
    cut_bps: 0,
  }
}

// 12a. Đăng ký hồ sơ KHÔNG KHO, KHÔNG có reference input kho (pass).
//      R-BIND không áp — ba giá trị đối chiếu đều rỗng, không có gì để đối chiếu.
test register_non_custodial_ok() {
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry_non_custodial())],
      [],
      [authority],
    )
  run(tx)
}

// 12b. NỬA VỜI — có custody_hash/seed_policy/instance_id nhưng accepted rỗng + cut 0
//      (fail). Không thuộc hạng nào: shape_custodial đòi accepted ≠ [],
//      shape_non_custodial đòi custody_hash rỗng.
test register_half_shape_custody_without_assets() fail {
  let e = PlatformEntry { ..entry(), accepted_assets: [], cut_bps: 0 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref_ok()],
      [authority],
    )
  run(tx)
}

// 12c. NỬA VỜI NGƯỢC LẠI — không kho (ba trường rỗng) nhưng vẫn khai accepted_assets
//      và cut_bps (fail).
test register_half_shape_assets_without_custody() fail {
  let e =
    PlatformEntry {
      ..entry(),
      instance_id: #"",
      custody_hash: #"",
      seed_policy: #"",
    }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [],
      [authority],
    )
  run(tx)
}

// 12d. Không kho mà governance_ref RỖNG (fail) — hồ sơ không có bên nào đồng thuận
//      được là hồ sơ authority một mình xoá vĩnh viễn được.
test register_non_custodial_gov_empty() fail {
  let e = PlatformEntry { ..entry_non_custodial(), governance_ref: #"" }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [],
      [authority],
    )
  run(tx)
}

// 12e. Không kho mà cut_bps ≠ 0 (fail) — không kho thì không có gì để cắt.
test register_non_custodial_cut_nonzero() fail {
  let e = PlatformEntry { ..entry_non_custodial(), cut_bps: 500 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [],
      [authority],
    )
  run(tx)
}

// 12f. Có kho nhưng custody_hash dài SAI (27 byte) (fail) — script hash luôn 28 byte.
test register_custody_hash_wrong_length() fail {
  let e = PlatformEntry { ..entry(), custody_hash: gov_27 }
  let tx =
    reg_tx(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, e)],
      [custody_ref(gov_27, seed_policy, instance_id)],
      [authority],
    )
  run(tx)
}

// ════════════════════════════════════════════════════════════
// 13. `is_inclusive` — sửa fail-closed quá tay (R-EPOCH).
//     Ledger mã hoá `invalid_hereafter` là biên LOẠI TRỪ. Bản đầu đọc thẳng `bound_type`
//     nên một tx đặt ttl ĐÚNG mốc biên — vốn nằm TRỌN trong ô — vẫn bị từ chối
//     (PoC `poc_epoch_exclusive_upper_at_boundary`). Không mất tiền, nhưng từ chối giao
//     dịch hợp lệ.
// ════════════════════════════════════════════════════════════
// 13a. upper LOẠI TRỪ đúng mốc biên ô (pass) — mốc thật là (e+1)*ms − 1, vẫn trong ô e.
test register_exclusive_upper_at_boundary() {
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
      range_excl_upper(
        reg_epoch * util.ms_per_time_bucket,
        ( reg_epoch + 1 ) * util.ms_per_time_bucket,
      ),
    )
  run(tx)
}

// 13b. upper LOẠI TRỪ vượt mốc biên 1 ms (fail) — mốc thật rơi sang ô sau ⇒ range trải
//      hai ô. Xác nhận bản vá KHÔNG nới lỏng ràng buộc "gọn trong 1 ô".
test register_exclusive_upper_past_boundary() fail {
  let tx =
    reg_tx_in_range(
      beacon_mint(platform_id, 1),
      [entry_output(platform_id, entry())],
      [custody_ref_ok()],
      [authority],
      range_excl_upper(
        reg_epoch * util.ms_per_time_bucket,
        ( reg_epoch + 1 ) * util.ms_per_time_bucket + 1,
      ),
    )
  run(tx)
}
