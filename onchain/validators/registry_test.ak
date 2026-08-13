// Validator tests cho registry (spend validator — cập nhật / di trú entry platform).
//
// Phủ (UpdateEntry): cập nhật đúng (pass); thiếu chữ ký authority (fail); đổi identity
//      bất biến kể cả beacon_policy (fail); out KHÔNG mang beacon NFT (fail); mint≠0
//      (fail); 2 entry input cùng script (fail); cut_bps>10000 (fail); out ở ví thường
//      (fail); Retired là cuối của đường Update (fail); tách quyền authority ↔ đồng
//      thuận quản trị (Paused tự quyết pass / Retire + đổi cut_bps thiếu đồng thuận
//      fail, đủ hai bên pass); spec_version đổi (fail); rút bớt token/ADA (fail).
// Phủ (MigrateEntry): di trú hồ sơ Retired (pass — chính lỗ đang vá); đổi status (fail);
//      new_spec_version không tiến (fail); thiếu đồng thuận quản trị (fail); đích trùng
//      chính mình (fail); đổi trường định danh (fail); đồng thuận qua withdrawal (pass).
//
// Phong cách mirror custody_seed_test.ak: placeholder tx, beacon NFT trong value,
// authority vkh đặt trong extra_signatories.

use cardano/address.{Script}
use cardano/assets
use cardano/transaction.{Input, Output, OutputReference, Transaction, placeholder}
use magiclamp/registry/platform.{Active, MigrateEntry, Paused, PlatformEntry,
  Retired, UpdateEntry}
use registry
use magiclamp/registry/types.{AssetKey}
use magiclamp/registry/util

// ── Hằng số test ──
const beacon_policy: assets.PolicyId = #"b3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3acb3ac"

const authority: ByteArray = #"a07a01"

// script hash registry validator (param own_ref trỏ vào input ở đây).
const reg_sh: ByteArray = #"4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f4e6f"

// script hash registry validator MỚI (đích di trú).
const new_reg_sh: ByteArray = #"7e777e777e777e777e777e777e777e777e777e777e777e777e777e77"

const platform_id: ByteArray = #"706b"

const instance_id: ByteArray = #"abcd"

const custody_hash: ByteArray = #"c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0"

const seed_policy: ByteArray = #"5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed"

const governance_ref: ByteArray = #"99999999999999999999999999999999999999999999999999999999"

const lamp_policy: ByteArray = #"1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b1a3b"

const lamp_name: ByteArray = #"4c414d50"

// governance_ref dài SAI (27 và 29 byte) — script hash Cardano luôn 28.
const gov_27: ByteArray = #"999999999999999999999999999999999999999999999999999999"

const gov_29: ByteArray =
  #"9999999999999999999999999999999999999999999999999999999999"

fn accepted() -> List<AssetKey> {
  [AssetKey { policy: #"", name: #"" }, AssetKey { policy: lamp_policy, name: lamp_name }]
}

// Entry input (đã đăng ký, status Active, lược đồ v2).
fn entry_in() -> PlatformEntry {
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
    created_epoch: 5,
    status: Active,
  }
}

// own_ref: tham chiếu UTxO entry đang spend.
fn own_ref() -> OutputReference {
  util.mk_ref(0)
}

// Value entry mang beacon NFT (beacon_policy, platform_id) qty 1 + min-ADA (U-NFT).
fn with_nft(name: ByteArray) -> assets.Value {
  assets.from_lovelace(2_000_000) |> assets.add(beacon_policy, name, 1)
}

// Input entry ở SCRIPT registry (mang beacon NFT + datum).
fn reg_input(ref: OutputReference, name: ByteArray, e: PlatformEntry) -> Input {
  util.mk_input(ref, util.mk_output(util.script_address(reg_sh), with_nft(name), e))
}

// Output entry ở SCRIPT registry (mang beacon NFT + datum).
fn reg_output(name: ByteArray, e: PlatformEntry) -> Output {
  util.mk_output(util.script_address(reg_sh), with_nft(name), e)
}

// Output entry ở SCRIPT registry MỚI (đích di trú).
fn new_reg_output(name: ByteArray, e: PlatformEntry) -> Output {
  util.mk_output(util.script_address(new_reg_sh), with_nft(name), e)
}

// Input CHỨNG MINH đồng thuận quản trị: một UTxO ở Script(governance_ref) bị CHI TIÊU
// trong cùng tx ⇒ validator quản trị của platform đã chạy và cho phép.
fn gov_input() -> Input {
  util.mk_input(
    util.mk_ref(5),
    util.mk_output_no_datum(
      util.script_address(governance_ref),
      assets.from_lovelace(2_000_000),
    ),
  )
}

// Dựng tx cập nhật: inputs, outputs, mint, ký authority (extra_signatories).
fn upd_tx(
  inputs   : List<Input>,
  outputs  : List<Output>,
  mint     : assets.Value,
  signers  : List<ByteArray>,
) -> Transaction {
  Transaction {
    ..placeholder,
    inputs: inputs,
    outputs: outputs,
    mint: mint,
    extra_signatories: signers,
  }
}

fn run(datum: PlatformEntry, tx: Transaction) -> Bool {
  registry.registry.spend(authority, Some(datum), UpdateEntry, own_ref(), tx)
}

fn run_migrate(
  datum       : PlatformEntry,
  dest        : ByteArray,
  new_version : Int,
  tx          : Transaction,
) -> Bool {
  registry.registry.spend(
    authority,
    Some(datum),
    MigrateEntry { new_registry_hash: dest, new_spec_version: new_version },
    own_ref(),
    tx,
  )
}

// ════════════════════════════════════════════════════════════
// 1. CẬP NHẬT ĐÚNG (pass) — authority ký, 1 entry in + 1 out theo script hash,
//    beacon NFT bảo toàn in&out, identity bất biến, đổi status Active→Paused.
//    Active↔Paused ĐẢO NGƯỢC ĐƯỢC ⇒ authority tự quyết, KHÔNG cần đồng thuận quản trị.
// ════════════════════════════════════════════════════════════
test update_happy() {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 2. THIẾU CHỮ KÝ AUTHORITY (fail) — U-SIG.
// ════════════════════════════════════════════════════════════
test update_no_authority_sig() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [#"deadbeef"],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 3. ĐỔI IDENTITY BẤT BIẾN (fail) — U-ID (identity_preserved).
//    Đổi instance_id ở out → identity_preserved fail.
//    Out vẫn mang beacon NFT name=platform_id (giữ U-NFT) để cô lập = U-ID.
// ════════════════════════════════════════════════════════════
test update_identity_tamper() fail {
  let e_out = PlatformEntry { ..entry_in(), instance_id: #"ffff" }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 3b. Đổi beacon_policy (trường định danh THỨ SÁU, mới ở v2) → fail.
//     Nếu không khoá, kẻ đổi được beacon_policy sẽ tự chọn policy mà U-NFT đối chiếu.
test update_identity_tamper_beacon_policy() fail {
  let e_out = PlatformEntry { ..entry_in(), beacon_policy: #"dead" }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 4. OUT KHÔNG MANG BEACON NFT (fail) — U-NFT (has_one_nft out).
//    Out ở đúng script hash + datum hợp lệ nhưng value KHÔNG có beacon NFT.
// ════════════════════════════════════════════════════════════
test update_drop_beacon_nft() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let out =
    util.mk_output(util.script_address(reg_sh), assets.from_lovelace(2_000_000), e_out)
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [out],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 5. TX CÓ MINT ≠ 0 (fail) — U-MINT-0 (update không đụng beacon supply).
// ════════════════════════════════════════════════════════════
test update_mint_rejected() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.add(assets.zero, beacon_policy, #"ffff", 1),
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 6. 2 ENTRY INPUT CÙNG SCRIPT HASH (fail) — U-SINGLE (count_inputs_at_script == 1).
// ════════════════════════════════════════════════════════════
test update_double_entry() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let in1 = reg_input(own_ref(), platform_id, entry_in())
  let in2 = reg_input(util.mk_ref(1), platform_id, entry_in())
  let tx =
    upd_tx([in1, in2], [reg_output(platform_id, e_out)], assets.zero, [authority])
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 7. MUTABLE INVALID (fail) — U-MUT (mutable_fields_valid): cut_bps > 10000 ở out.
//    Identity bất biến (giữ 6 field) để cô lập = U-MUT.
// ════════════════════════════════════════════════════════════
test update_mutable_invalid() fail {
  let e_out = PlatformEntry { ..entry_in(), cut_bps: 10001 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 8. ENTRY OUT Ở VÍ THƯỜNG (fail) — U-SINGLE.
//    Out mang beacon NFT + datum hợp lệ nhưng ở địa chỉ ví (VerificationKey).
//    count_outputs_at_script(reg_sh) == 0 → chặn (NFT không lạc khỏi registry).
// ════════════════════════════════════════════════════════════
test update_out_not_script() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let out = util.mk_output(util.vk_address(#"a0"), with_nft(platform_id), e_out)
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [out],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 9. U-TERMINAL — Retired là trạng thái CUỐI của đường Update (chống revive).
// ════════════════════════════════════════════════════════════
// 9a. entry_in Retired → thử update (sang Active) FAIL — entry_in.status != Retired.
test update_retired_terminal() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Retired }
  let e_out = PlatformEntry { ..entry_in(), status: Active }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in)],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(e_in, tx)
}

// 9b. entry_in Paused → out Active PASS — revive từ Paused vẫn cho phép
//     (chỉ Retired là cuối; Paused chưa terminal, và Paused↔Active không cần
//     đồng thuận quản trị vì đảo ngược được).
test update_paused_to_active() {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Active }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in)],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(e_in, tx)
}

// ════════════════════════════════════════════════════════════
// 10. U-GOV — tách quyền: việc KHÔNG đảo ngược được đòi CẢ authority LẪN đồng thuận
//     quản trị của chính platform.
// ════════════════════════════════════════════════════════════
// 10a. Active → Retired CHỈ có chữ ký authority (fail). Đây là lỗ v1: một chữ ký là đủ
//      để khai tử vĩnh viễn một dịch vụ đang sống, không cần họ biết.
test update_retire_authority_only() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Retired }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 10b. Active → Retired có CẢ HAI (pass) — đường retire hợp lệ.
test update_retire_with_consent() {
  let e_out = PlatformEntry { ..entry_in(), status: Retired }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 10c. Đổi cut_bps CHỈ có authority (fail) — tỉ lệ cắt là tiền của platform.
test update_cut_bps_authority_only() fail {
  let e_out = PlatformEntry { ..entry_in(), cut_bps: 2000 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 10d. Đổi cut_bps có CẢ HAI (pass).
test update_cut_bps_with_consent() {
  let e_out = PlatformEntry { ..entry_in(), cut_bps: 2000 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 10e. Đổi governance_ref có CẢ HAI (pass) — đồng thuận đọc theo governance_ref CŨ
//      (bên đương nhiệm phải đồng ý cả khi bị thay).
test update_governance_ref_with_consent() {
  let e_out = PlatformEntry { ..entry_in(), governance_ref: #"88888888888888888888888888888888888888888888888888888888" }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 10f. Đồng thuận qua WITHDRAWAL từ Script(governance_ref) (pass) — kiểu tích hợp thứ
//      hai; Registry không ép platform phải giữ state UTxO mới quản trị được.
test update_retire_consent_by_withdrawal() {
  let e_out = PlatformEntry { ..entry_in(), status: Retired }
  let tx =
    Transaction {
      ..upd_tx(
        [reg_input(own_ref(), platform_id, entry_in())],
        [reg_output(platform_id, e_out)],
        assets.zero,
        [authority],
      ),
      withdrawals: [Pair(Script(governance_ref), 0)],
    }
  run(entry_in(), tx)
}

// 10g. Đồng thuận SAI ĐỊA CHỈ (fail) — input ở một script khác governance_ref không
//      chứng minh được gì.
test update_retire_wrong_governance() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Retired }
  let fake =
    util.mk_input(
      util.mk_ref(5),
      util.mk_output_no_datum(
        util.script_address(#"11111111111111111111111111111111111111111111111111111111"),
        assets.from_lovelace(2_000_000),
      ),
    )
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), fake],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 11. U-VER — UpdateEntry KHÔNG được đổi spec_version (nâng phiên bản phải đi
//     đường MigrateEntry, nơi có đồng thuận quản trị).
// ════════════════════════════════════════════════════════════
test update_spec_version_changed() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 12. U-VALUE — không rút bớt khỏi ô hồ sơ.
// ════════════════════════════════════════════════════════════
// 12a. Rút bớt ADA (fail).
test update_drain_lovelace() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let out =
    util.mk_output(
      util.script_address(reg_sh),
      assets.from_lovelace(1_000_000) |> assets.add(beacon_policy, platform_id, 1),
      e_out,
    )
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [out],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 12b. Rút token khác khỏi ô hồ sơ (fail) — input có LAMP, output không.
//      Beacon NFT vẫn bảo toàn ⇒ cô lập nguyên nhân = U-VALUE, không phải U-NFT.
test update_drain_token() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let in_val =
    with_nft(platform_id) |> assets.add(lamp_policy, lamp_name, 1_000)
  let inp =
    util.mk_input(
      own_ref(),
      util.mk_output(util.script_address(reg_sh), in_val, entry_in()),
    )
  let tx =
    upd_tx([inp], [reg_output(platform_id, e_out)], assets.zero, [authority])
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 13. MigrateEntry — đường di trú sang registry validator MỚI.
// ════════════════════════════════════════════════════════════
// 13a. Di trú một hồ sơ RETIRED (pass) — CHÍNH LÀ LỖ ĐANG VÁ: trước v2, hồ sơ Retired
//      kẹt vĩnh viễn khi xoay quyền đăng ký, phá cam kết "beacon sống suốt đời, dấu vết
//      kiểm toán không đứt".
test migrate_retired_ok() {
  let e_in = PlatformEntry { ..entry_in(), status: Retired }
  let e_out = PlatformEntry { ..e_in, spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(e_in, new_reg_sh, 3, tx)
}

// 13b. Di trú hồ sơ Active (pass) — đường chung, không chỉ dành cho Retired.
test migrate_active_ok() {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 14. Di trú mà ĐỔI STATUS (fail) — M-STATUS: nếu không, di trú thành Retire trá hình
//     (né đúng cái cổng đồng thuận vừa dựng ở U-GOV).
test migrate_status_changed() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3, status: Retired }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 15. new_spec_version KHÔNG tiến (fail) — M-VER (bằng phiên bản cũ).
test migrate_version_not_forward() fail {
  let e_out = entry_in()
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, platform.spec_version_v2, tx)
}

// 15b. Datum out khai phiên bản KHÁC redeemer (fail) — M-VER vế sau.
test migrate_version_datum_mismatch() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 4 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 16. Di trú KHÔNG có đồng thuận quản trị (fail) — M-GOV.
test migrate_no_governance_consent() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in())],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 16b. Di trú thiếu chữ ký authority (fail) — M-SIG.
test migrate_no_authority_sig() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [#"deadbeef"],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 17. Đích di trú TRÙNG chính mình (fail) — M-DEST. Nếu cho phép, MigrateEntry thành
//     một đường Update KHÔNG có U-TERMINAL / U-VER.
test migrate_dest_is_self() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), reg_sh, 3, tx)
}

// 18. Di trú mà đổi MỘT trong sáu trường định danh (fail) — M-ID.
//     Chọn custody_hash (trỏ kho khác = platform khác).
test migrate_identity_tamper() fail {
  let e_out =
    PlatformEntry { ..entry_in(), spec_version: 3, custody_hash: #"deaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead" }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 18b. Di trú mà mint/burn (fail) — M-MINT-0.
test migrate_mint_rejected() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.add(assets.zero, beacon_policy, #"ffff", 1),
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 18c. Di trú mà output đích KHÔNG mang beacon NFT (fail) — M-NFT.
test migrate_drop_beacon_nft() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let out =
    util.mk_output(
      util.script_address(new_reg_sh),
      assets.from_lovelace(2_000_000),
      e_out,
    )
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [out],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 18d. Di trú mà rút bớt ADA khỏi ô hồ sơ (fail) — M-VALUE.
test migrate_drain_lovelace() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let out =
    util.mk_output(
      util.script_address(new_reg_sh),
      assets.from_lovelace(1_000_000) |> assets.add(beacon_policy, platform_id, 1),
      e_out,
    )
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [out],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 18e. HAI hồ sơ cùng script trong một tx di trú (fail) — M-DEST vế "đúng 1 input"
//      (chống double satisfaction: một output đích thoả cho hai input).
test migrate_double_entry() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let in1 = reg_input(own_ref(), platform_id, entry_in())
  let in2 = reg_input(util.mk_ref(1), platform_id, entry_in())
  let tx =
    upd_tx(
      [in1, in2, gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// ════════════════════════════════════════════════════════════
// 19. S-GOVSELF — hồ sơ khai `governance_ref` = chính registry ⇒ cổng đồng thuận TỰ
//     THOẢ. Ô hồ sơ đang chi tiêu LUÔN nằm ở Script(own_hash), nên
//     `governance_consented` thành hằng True vĩnh viễn và rào "hai bên" biến mất.
//     Ba PoC từng PASS trước bản vá: `poc_self_gov_retire_by_authority_alone`,
//     `poc_self_gov_migrate_by_authority_alone`, `poc_register_with_self_gov_accepted`.
// ════════════════════════════════════════════════════════════
// Hồ sơ độc: governance_ref == script hash của chính registry.
fn entry_self_gov() -> PlatformEntry {
  PlatformEntry { ..entry_in(), governance_ref: reg_sh }
}

// 19a. Retire CHỈ bằng chữ ký authority, không có input quản trị riêng nào (fail).
//      Trước bản vá: input hồ sơ ở Script(reg_sh) tự đóng vai "đồng thuận" ⇒ PASS.
test update_self_gov_retire_rejected() fail {
  let e_out = PlatformEntry { ..entry_self_gov(), status: Retired }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_self_gov())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_self_gov(), tx)
}

// 19b. Đổi cut_bps CHỈ bằng chữ ký authority trên hồ sơ tự-quản-trị (fail).
test update_self_gov_cut_bps_rejected() fail {
  let e_out = PlatformEntry { ..entry_self_gov(), cut_bps: 9000 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_self_gov())],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_self_gov(), tx)
}

// 19c. Di trú CHỈ bằng chữ ký authority trên hồ sơ tự-quản-trị (fail) — M-GOV bị vô
//      hiệu hoá theo đúng cách trên.
test migrate_self_gov_rejected() fail {
  let e_out = PlatformEntry { ..entry_self_gov(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_self_gov())],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_self_gov(), new_reg_sh, 3, tx)
}

// 19d/19e. governance_ref ở datum ĐÍCH dài sai (27 / 29 byte) → U-MUT chặn.
//     Giá trị rác trỏ tới script không thể tồn tại ⇒ đồng thuận không bao giờ thoả ⇒
//     hồ sơ khoá chết (không Retire được, không di trú tiếp được).
test update_gov_ref_27_bytes() fail {
  let e_out = PlatformEntry { ..entry_in(), governance_ref: gov_27 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

test update_gov_ref_29_bytes() fail {
  let e_out = PlatformEntry { ..entry_in(), governance_ref: gov_29 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// ════════════════════════════════════════════════════════════
// 20. M-MUT — MigrateEntry KHÔNG được ghi ra hồ sơ TỰ KHOÁ CHẾT.
//     PoC từng PASS: `poc_migrate_writes_out_of_range_fields`. Nhánh Migrate sinh ra để
//     CỨU hồ sơ kẹt, mà lại tự tạo lại đúng cái kẹt đó.
// ════════════════════════════════════════════════════════════
test migrate_out_of_range_fields_rejected() fail {
  let e_out =
    PlatformEntry {
      ..entry_in(),
      spec_version: 3,
      governance_ref: #"",
      cut_bps: 99999,
      accepted_assets: [],
    }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 20b. Chỉ đổi cut_bps ra ngoài dải ở đích (fail) — cô lập vế cut_bps của M-MUT.
test migrate_cut_bps_out_of_range() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3, cut_bps: 99999 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// ════════════════════════════════════════════════════════════
// 21. M-DEST 28 byte — đích di trú phải là script hash THẬT.
//     PoC từng PASS: `poc_migrate_dest_hash_1_byte`. `is_at_script` chỉ so bytes ⇒ di trú
//     tới #"00" là "hợp lệ" ⇒ beacon NFT + min-ADA bay tới địa chỉ script KHÔNG TỒN TẠI
//     và KHÔNG THỂ tồn tại ⇒ mất beacon vĩnh viễn, phá PK5 "beacon sống suốt đời".
// ════════════════════════════════════════════════════════════
test migrate_dest_hash_1_byte() fail {
  let e_out = PlatformEntry { ..entry_in(), spec_version: 3 }
  let out = util.mk_output(util.script_address(#"00"), with_nft(platform_id), e_out)
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [out],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), #"00", 3, tx)
}

// ════════════════════════════════════════════════════════════
// 22. U-REVIVE — tách chiều `Active → Paused` và `Paused → Active`.
//     LỖ (đội đỏ, Nghiêm trọng): nếu cả hai chiều chỉ cần authority thì authority đặt
//     Paused rồi KHÔNG BAO GIỜ ký lại — platform không có cách tự đảo ngược. Hiệu ứng
//     thật = gỡ vĩnh viễn, mà KHÔNG đi qua rào "hai bên". Nguồn cao hơn:
//     Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md:201 §8 bước 7.
// ════════════════════════════════════════════════════════════
// 22a. Paused → Active CHỈ có đồng thuận quản trị, mọi trường khác Y HỆT (pass).
test update_revive_by_governance_only() {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Active }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// 22b. Hồi sinh KÈM đổi cut_bps, chỉ có đồng thuận (fail) — nếu lỏng, platform tự mở lại
//      kèm sửa tỉ lệ cắt, đi vòng qua đúng U-GOV vừa dựng.
test update_revive_with_cut_bps_change() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Active, cut_bps: 2000 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// 22c. Hồi sinh KÈM đổi governance_ref, chỉ có đồng thuận (fail).
test update_revive_with_gov_ref_change() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out =
    PlatformEntry {
      ..entry_in(),
      status: Active,
      governance_ref: #"88888888888888888888888888888888888888888888888888888888",
    }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// 22d. Hồi sinh KÈM đổi spec_version, chỉ có đồng thuận (fail) — U-VER chặn trước, và
//      pure_revive cũng không thoả.
test update_revive_with_spec_version_change() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Active, spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// 22e. Active → Paused CHỈ có đồng thuận quản trị, KHÔNG có authority (fail) —
//      chiều DỪNG vẫn là van của authority, ngoại lệ chỉ mở cho chiều HỒI SINH.
test update_pause_by_governance_only() fail {
  let e_out = PlatformEntry { ..entry_in(), status: Paused }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(entry_in(), tx)
}

// 22f. Paused → Retired CHỈ có đồng thuận (fail) — Retire luôn cần CẢ HAI bên.
test update_paused_to_retired_by_governance_only() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Retired }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// 22g. Paused → Active không authority, không đồng thuận (fail) — ngoại lệ U-REVIVE đòi
//      ĐÚNG MỘT trong hai bên, không phải "miễn kiểm".
test update_revive_no_party() fail {
  let e_in = PlatformEntry { ..entry_in(), status: Paused }
  let e_out = PlatformEntry { ..entry_in(), status: Active }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in)],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [],
    )
  run(e_in, tx)
}

// ════════════════════════════════════════════════════════════
// 23. HẠNG KHÔNG KHO trên đường spend (khép issue #5 mục 3).
// ════════════════════════════════════════════════════════════
fn entry_non_custodial() -> PlatformEntry {
  PlatformEntry {
    ..entry_in(),
    instance_id: #"",
    custody_hash: #"",
    seed_policy: #"",
    accepted_assets: [],
    cut_bps: 0,
  }
}

// 23a. Cập nhật hồ sơ KHÔNG KHO (Active → Paused, authority) — pass. Hồ sơ không kho
//      không chỉ nộp được, mà còn sống được trên đường spend.
test update_non_custodial_happy() {
  let e_in = entry_non_custodial()
  let e_out = PlatformEntry { ..e_in, status: Paused }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in)],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(e_in, tx)
}

// 23b. Di trú hồ sơ KHÔNG KHO — pass.
test migrate_non_custodial_ok() {
  let e_in = entry_non_custodial()
  let e_out = PlatformEntry { ..e_in, spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, e_in), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(e_in, new_reg_sh, 3, tx)
}

// 23c. UpdateEntry biến hồ sơ CÓ KHO thành KHÔNG KHO (fail) — chuyển hạng = đổi bản chất
//      dịch vụ, phải đăng ký mới. Chặn bởi U-ID (ba trường định danh bị xoá).
test update_shape_flip_to_non_custodial() fail {
  let e_out = entry_non_custodial()
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 23d. UpdateEntry chỉ XOÁ accepted_assets + cut_bps, giữ nguyên định danh kho (fail) —
//      trạng thái NỬA VỜI, chặn bởi U-MUT. Đây là ca U-ID KHÔNG bắt được.
test update_half_shape_clear_assets() fail {
  let e_out = PlatformEntry { ..entry_in(), accepted_assets: [], cut_bps: 0 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run(entry_in(), tx)
}

// 23e. MigrateEntry chuyển hạng (fail) — chặn bởi M-ID.
test migrate_shape_flip() fail {
  let e_out = PlatformEntry { ..entry_non_custodial(), spec_version: 3 }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}

// 23f. MigrateEntry xoá accepted_assets + cut_bps, giữ định danh kho (fail) — nửa vời,
//      chặn bởi M-MUT (ràng buộc MỚI của đợt này; trước đó Migrate không ép mutable).
test migrate_half_shape_clear_assets() fail {
  let e_out =
    PlatformEntry {
      ..entry_in(),
      spec_version: 3,
      accepted_assets: [],
      cut_bps: 0,
    }
  let tx =
    upd_tx(
      [reg_input(own_ref(), platform_id, entry_in()), gov_input()],
      [new_reg_output(platform_id, e_out)],
      assets.zero,
      [authority],
    )
  run_migrate(entry_in(), new_reg_sh, 3, tx)
}
