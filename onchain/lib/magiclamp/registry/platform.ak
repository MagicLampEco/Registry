// PlatformKit — Registry on-chain: sổ đăng ký các Platform instance (khuôn mẫu
// onboarding). Mỗi platform (PhoenixKey, OriLife, ...) đăng ký một entry trỏ tới
// Treasury custody instance của mình → discoverable: "tất cả platform" = tập UTxO
// mang NFT của registry_beacon policy.
//
// FIRST-PRINCIPLES (vì sao beacon-per-platform + authority, KHÔNG registry UTxO trung tâm):
//   - Một registry UTxO trung tâm = điểm contention + bloat (bài học consumed_proposals
//     Treasury). Thay vào đó MỖI platform = 1 beacon NFT (name=platform_id) dưới MỘT
//     policy chung → query policy ra toàn bộ registry, không contention, không bloat.
//   - Tính DUY NHẤT platform_id: Cardano KHÔNG ép unique asset-name dưới 1 policy mà
//     không có state trung tâm. Dùng registry_authority (committee→DAO) ký mỗi đăng ký
//     → authority không ký trùng id. Đây là "đăng ký có kiểm duyệt" — đúng mô hình
//     platform onboarding (không permissionless để tránh chiếm tên + rác).
//   - Phá vòng beacon↔registry — CHIỀU MỚI (v2, đảo so với v1): `registry` chỉ nhận
//     `registry_authority` (bỏ tham số beacon_policy, đọc từ datum) ⇒ hash của nó tính
//     được TRƯỚC; `registry_beacon(registry_authority, registry_hash)` nhận hash đó ⇒
//     cổng đúc ÉP ĐƯỢC địa chỉ đích (R-OUT-1). Đổi chiều này là lý do datum có thêm
//     `beacon_policy` (lời tự khai, bị ép khớp policy thật lúc mint qua R-POLICY).
//   ⚠ RỦI RO CÒN LẠI (ghi ra, không giấu): một UTxO TỰ DỰNG đặt ở địa chỉ `registry`
//     với `beacon_policy` khai bậy vẫn tồn tại được — không validator nào chạy lúc TẠO
//     UTxO. Cái ĐỠ nó hôm nay là ĐÚNG MỘT thứ: nó không mang beacon NFT thật nên không
//     hiện ra khi quét sổ theo policy.
//     ⛔ ĐÍNH CHÍNH 2026-08-15 — bản trước của khối này còn viết thêm "muốn chi tiêu nó
//     vẫn phải có chữ ký authority (U-SIG/M-SIG)". Câu đó SAI, và audit đối kháng
//     (lĩnh vực cardano) đã dựng PoC PASS. Đường đi: `validators/registry.ak:205-211`
//     cho U-SIG một NGOẠI LỆ — `pure_revive && governance_consented(entry_in.
//     governance_ref)`. Trong ô TỰ DỰNG thì kẻ dựng khai CẢ BA lời: `beacon_policy`
//     (qua U-NFT bằng policy hắn tự đúc), `governance_ref` (trỏ script hắn kiểm soát),
//     `status: Paused`. Rồi spend `Paused → Active` với `extra_signatories: []` ⇒ PASS.
//     Ba lời tự khai khép kín vòng xác thực. S-GOVSELF không chặn: nó chỉ cấm
//     `governance_ref == own_hash`, còn đây là script CỦA KẺ DỰNG.
//     Thiệt hại hôm nay = 0, nhưng vì tính chất ỨNG DỤNG (sổ không giữ giá trị — PK1;
//     hồ sơ bịa vô hình khi quét theo policy), KHÔNG phải vì validator chặn.
//     ⇒ Bản nào đặt TIỀN CỌC hay bất kỳ giá trị nào vào ô hồ sơ phải cân lại chỗ này
//     TRƯỚC, không được kế thừa câu "nó trơ".

use aiken/collection/list
use aiken/primitive/bytearray
use cardano/assets.{Value}
use magiclamp/registry/types.{AssetKey}

/// Độ dài MỌI script hash / policy id trên Cardano: 28 byte (blake2b-224).
/// Ép độ dài này ở mọi trường "trỏ tới script/policy" loại được giá trị SAI ĐỘ DÀI
/// (#"", 1 byte, 29 byte) — thứ không thể là script hash nên mọi điều kiện đọc theo nó
/// thành hằng False ⇒ hồ sơ tự khoá chết. Xem `governance_ref`.
///
/// ⚠ ĐỌC ĐÚNG SỨC MẠNH — ĐÂY LÀ GUARD CÚ PHÁP, KHÔNG PHẢI BẰNG CHỨNG TỒN TẠI. 28 byte
/// đúng độ dài vẫn có thể là hash của một script KHÔNG TỒN TẠI, hoặc của một script tồn
/// tại nhưng KHÔNG CÓ nhánh chạy được (vd chỉ có `mint` + `else fail`). Kiểm bằng thực
/// thi (PoC `newC1`/`newC4`/`newF` PASS trước bản vá đợt này). Bằng chứng "cổng quản trị
/// CHẠY ĐƯỢC" chỉ có một cách lấy: bắt nó CHẠY THẬT trong chính tx — đó là việc của
/// R-GOVLIVE (lúc đăng ký) và U-GOV2 (lúc bàn giao), không phải của hằng số này.
pub const script_hash_len: Int = 28

/// Phiên bản lược đồ hồ sơ hiện hành. Đăng ký mới BẮT BUỘC khai đúng số này (R-VER);
/// `MigrateEntry` chỉ được TĂNG (M-VER). Tên hằng viết thường vì Aiken bắt const phải
/// snake_case (chữ hoa đầu = tên kiểu → parser báo lỗi).
pub const spec_version_v2: Int = 2

/// TRẦN độ dài `accepted_assets`. Không có nó, danh sách này là kênh DUY NHẤT trong hồ
/// sơ mà bên đăng ký tự bơm dài tuỳ ý, và mỗi phần tử phải được duyệt LẠI nhiều lần trong
/// một lần chi tiêu (`mutable_fields_valid` ở ra, `governed_fields_changed` so vào↔ra,
/// `shape_*` ở cả hai đầu).
///
/// SỐ ĐO (aiken v1.1.21, chính kho này, 2026-09-01 — bài đo tạm trong `registry_test.ak`,
/// nhánh `UpdateEntry`, đã gỡ sau khi đo). Bốn điểm N = 2 / 32 / 64 / 132, mem của bài:
/// 526.881 / 1.068.021 / 1.645.237 / 2.871.821. Trừ chi phí RIÊNG của fixture (cùng hàm
/// dựng, thân bài không gọi validator): 103.619 tại N=2 và 822.259 tại N=132 ⇒ 5.528
/// mem/phần tử là của fixture. Dốc TỔNG là 18.038 mem/phần tử, TUYẾN TÍNH khít trên cả ba
/// khoảng (541.140/30 = 577.216/32 = 1.226.584/68 = 18.038) ⇒ phần của RIÊNG validator là
/// 18.038 − 5.528 = **12.510 mem/phần tử**, nền (N=0) ≈ 398.242 mem.
///   · riêng validator chạm `maxTxExMem` = 14.000.000 ở N ≈ **1.087**;
///   · tại trần 32: ≈ 798.562 mem = **5,7%** ngân sách tx ⇒ còn ~13,2M cho validator quản
///     trị của platform chạy CÙNG tx.
/// Đây là CẬN DƯỚI: chưa tính phần ledger tính cho việc nạp/giải mã datum vào.
///
/// VÌ SAO CẦN TRẦN chứ không phải "để ledger tự chặn": mọi việc KHÔNG đảo ngược được
/// (Retire, Migrate, đổi `governance_ref`/`cut_bps`/`accepted_assets`) đều buộc validator
/// quản trị của platform chạy TRONG CÙNG tx và chia chung 14M — kể cả việc CỨU là rút
/// ngắn chính danh sách này. Đường chỉ-authority (Pause) thì không cần ai chạy cùng, nên
/// nó sống lâu hơn. Hồ sơ phình quá cỡ ⇒ kẹt ở trạng thái CHỈ authority điều khiển được,
/// đúng thứ rào "hai bên" sinh ra để chặn.
///
/// VÌ SAO 32 chứ không cao hơn: hai chiều sai lệch nhau về giá. Trần quá THẤP = phiền
/// (dịch vụ nhận ít loại tài sản hơn mong muốn), sửa được bằng một lần đăng ký lại. Trần
/// quá CAO = hồ sơ kẹt vĩnh viễn ở đường một-bên. Nên chọn phía rẻ. 32 vẫn dư cho hình
/// dạng thật của hệ (ADA + LAMP + vài chục token).
/// ⚠ Trần nằm trong MÃ, không trong datum ⇒ đổi nó sau khi triển khai = đổi script hash =
/// phải di trú từng hồ sơ, mà di trú lại cần đúng cái đồng thuận đang kẹt. Chốt bây giờ.
pub const max_accepted_assets: Int = 32

/// Vòng đời một platform trong registry. Constr index theo thứ tự khai báo (khớp offchain).
pub type PlatformStatus {
  Active
  Paused
  Retired
}

/// Một entry registry — trỏ platform_id → Treasury custody instance của nó.
/// platform_id == asset name của registry_beacon NFT (duy nhất, authority kiểm duyệt).
///
/// ⚠ THỨ TỰ TRƯỜNG LÀ HỢP ĐỒNG LIÊN BÊN (Plutus Data theo vị trí) — off-chain decode
/// theo đúng thứ tự này. Đổi thứ tự/chèn giữa = phá mọi bên đọc.
pub type PlatformEntry {
  spec_version    : Int,              // phiên bản lược đồ hồ sơ (v2 = 2)
  platform_id     : ByteArray,        // định danh platform (= beacon NFT name)
  instance_id     : ByteArray,        // Treasury custody instance_id (= seed NFT name)
  custody_hash    : ByteArray,        // script hash custody.ak của platform
  seed_policy     : ByteArray,        // policy NFT authenticity custody (custody_seed)
  beacon_policy   : ByteArray,        // policy beacon NFT — tự khai, ép khớp lúc mint (R-POLICY)
  governance_ref  : ByteArray,        // script hash DAO/committee gác release (LUÔN 28 byte)
  accepted_assets : List<AssetKey>,   // assets platform thu (LAMP/ADA/token)
  cut_bps         : Int,              // protocol_cut_bps của instance
  // ⚠ TÊN TRƯỜNG NÓI SAI ĐƠN VỊ — giữ tên vì đó là hợp đồng với off-chain (đổi tên =
  // đổi lược đồ). Giá trị thật là "Ô 5 NGÀY kể từ mốc Unix" (posix_ms / 432_000_000),
  // KHÔNG phải số epoch Cardano: tại mốc Shelley (epoch 208 = 1596059091 s) hàm trả
  // 3694, biên ô lật sớm hơn biên epoch thật ~251.091 s ≈ 2,9 ngày; trên Preview
  // (epoch = 1 ngày) sai số là 5×. Xem `util.get_time_bucket_bounded`.
  created_epoch   : Int,              // ô-thời-gian đăng ký (ép == ô của chính tx đăng ký)
  status          : PlatformStatus,
}

/// Redeemer minting policy registry_beacon.
pub type RegistryBeaconRedeemer {
  // Đăng ký platform mới: mint 1 beacon NFT (name=platform_id), authority ký.
  RegisterPlatform
}

/// Redeemer spend validator registry.
pub type RegistryRedeemer {
  // constr 0 — Cập nhật field khả biến (status / governance_ref / accepted / cut_bps).
  // Authority ký; các đổi KHÔNG đảo ngược được đòi thêm đồng thuận quản trị của platform.
  UpdateEntry
  // constr 1 — Di trú hồ sơ sang một registry validator MỚI (xoay quyền/nâng lược đồ).
  // Đưa hồ sơ ra khỏi quyền tài phán của validator này ⇒ đòi cả authority lẫn quản trị.
  MigrateEntry { new_registry_hash: ByteArray, new_spec_version: Int }
}

// ── Tính hợp lệ một entry tại đăng ký (S-REG-*) ──

/// Hồ sơ CÓ KHO — dịch vụ thu tiền qua một Treasury custody instance.
/// `instance_id` là ASSET NAME (độ dài tuỳ ý, chỉ ép khác rỗng); `custody_hash` và
/// `seed_policy` là script hash / policy id ⇒ ĐÚNG 28 byte.
pub fn shape_custodial(e: PlatformEntry) -> Bool {
  bytearray.length(e.instance_id) > 0 && bytearray.length(e.custody_hash) == script_hash_len && bytearray.length(e.seed_policy) == script_hash_len && e.accepted_assets != [] && e.cut_bps >= 0 && e.cut_bps <= 10000
}

/// Hồ sơ KHÔNG KHO — dịch vụ không thu tiền qua hệ. RỖNG HẾT, không nửa vời.
///
/// VÌ SAO HÌNH DẠNG LÀ HẠNG, không thêm trường phân loại: một trường tách rời hình dạng
/// làm trạng thái NỬA VỜI biểu diễn được (khai "không kho" mà vẫn trỏ `custody_hash`),
/// và chính cái nửa vời đó mới là chỗ hỏng. Dùng hình dạng làm phân loại thì nửa vời
/// KHÔNG TỒN TẠI ĐƯỢC — không có giá trị nào thoả cả hai, cũng không có giá trị nào lọt
/// giữa hai hàm này mà qua được `entry_well_formed`.
pub fn shape_non_custodial(e: PlatformEntry) -> Bool {
  e.instance_id == #"" && e.custody_hash == #"" && e.seed_policy == #"" && e.accepted_assets == [] && e.cut_bps == 0
}

/// GOV-DISTINCT — `governance_ref` KHÔNG được trùng bất kỳ định danh script/policy nào
/// khác của CHÍNH hồ sơ đó. Ba giá trị, hai lý do khác nhau:
///
///  · `== custody_hash` — CỬA GIẢ MẠO ĐỒNG THUẬN, đã dựng lại bằng thực thi. Kho Treasury
///    của platform (`LAMP/Treasury/onchain/validators/custody.ak`) có nhánh `Collect`
///    PERMISSIONLESS — đo 2026-09-01: `command grep -c "extra_signatories" custody.ak` →
///    **0**, tức không nhánh nào của kho đòi chữ ký. `governance_consented` (util.ak:215)
///    chỉ hỏi "có input nào ở `Script(governance_ref)` bị chi tiêu không", nên ai cũng
///    ghép được một input kho vào tx. Hệ quả: `registry_authority` MỘT MÌNH dựng được tx
///    {ô hồ sơ + một input kho redeemer `Collect`} và đặt `status = Retired` — U-GOV qua,
///    U-TERMINAL (`registry.ak:185`) khoá luôn ⇒ gỡ niêm yết VĨNH VIỄN bằng một chữ ký.
///    Cùng đường đó đổi được `cut_bps`, `accepted_assets`, hoặc di trú hồ sơ đi. Mà khai
///    `governance_ref = custody_hash` là nhầm lẫn RẤT tự nhiên ("kho của tôi gác luật của
///    tôi"), không cần ác ý ai cũng khai được.
///  · `== seed_policy` / `== beacon_policy` — CỬA TỰ KHOÁ. Hai giá trị đó là minting
///    policy: `registry_beacon` có `else(_) { fail }` (registry_beacon.ak:189) nên MỌI
///    input đặt ở `Script(beacon_policy)` làm hỏng tx, và `custody_seed` cùng hình dạng.
///    Không input nào ở đó chi tiêu được ⇒ `governance_consented` là hằng False vĩnh viễn
///    ⇒ hồ sơ không Retire, không di trú, không đổi ba trường quản trị được nữa. Cùng họ
///    với PoC `newF` (di trú tới một script chỉ có `mint`, ghi ở registry.ak:83-90).
///
/// ⚠ ĐỪNG NHẦM VỚI CHỐT Ở `util.ak:200-210` ("KHÔNG vá bằng mã ở v2"). Chốt ấy nói về ca
/// TỔNG QUÁT — "cổng quản trị của platform có một nhánh permissionless" — thứ validator
/// KHÔNG kiểm được on-chain (nó không đọc được mã của script lạ) và đã chuyển sang chuẩn
/// đăng ký. Đây là ca RIÊNG và KIỂM ĐƯỢC: `governance_ref` trùng ĐÚNG MỘT giá trị khác
/// nằm trong CHÍNH datum này — so hai trường với nhau, không cần biết gì về script bên
/// ngoài. Cùng họ với `R-GOVSELF` (registry_beacon.ak:123) và `entry_out.governance_ref
/// != own_hash` (registry.ak:198), hai cổng đã có sẵn. Ai định xoá dòng này: đọc lại đoạn
/// trên, đó là ca có PoC.
pub fn governance_ref_distinct(e: PlatformEntry) -> Bool {
  e.governance_ref != e.custody_hash && e.governance_ref != e.seed_policy && e.governance_ref != e.beacon_policy
}

/// Entry well-formed tại đăng ký: định danh có, `beacon_policy` đúng 28 byte, status
/// Active, CỘNG toàn bộ điều kiện của `mutable_fields_valid`.
///
/// ⚠ VÌ SAO GỌI `mutable_fields_valid` THAY VÌ CHÉP LẠI ĐIỀU KIỆN. Registry đã ăn đúng
/// lỗi này một lần (M-GOV2, xem registry.ak:107-115): một ràng buộc dựng ở cửa này, cửa
/// anh em ghi được cùng trường mà không mang cùng ràng buộc ⇒ mới vá nửa lỗ. Hai hàm này
/// gác CÙNG một datum ở hai thời điểm — đăng ký (cửa đúc) và sau cập nhật/di trú (hai cửa
/// spend). Ràng thành quan hệ BAO HÀM thì "vá nửa đường" không biểu diễn được nữa: mọi
/// điều kiện thêm vào `mutable_fields_valid` tự động áp cho cả cửa đúc.
/// Chiều ngược lại có giá: NỚI `mutable_fields_valid` là nới luôn cửa đúc. Đó là chủ ý —
/// nới cửa đúc mà quên cửa spend còn tệ hơn, và cách này bắt người nới phải nhìn thấy cả
/// hai.
///
/// `governance_ref` BẮT BUỘC cho CẢ HAI hạng — không phải để gác tiền (hồ sơ không kho
/// chẳng có tiền để gác), mà để hồ sơ luôn có MỘT BÊN đồng thuận được. Hồ sơ không có
/// nó là hồ sơ mà authority một mình Retire vĩnh viễn được — đúng thứ U-GOV dựng ra để
/// chặn.
pub fn entry_well_formed(e: PlatformEntry) -> Bool {
  e.platform_id != #"" && e.created_epoch >= 0 && e.status == Active && bytearray.length(
    e.beacon_policy,
  ) == script_hash_len && mutable_fields_valid(e)
}

/// Identity (6 field) bảo toàn giữa entry_in và entry_out — áp cho CẢ UpdateEntry lẫn
/// MigrateEntry. `spec_version` KHÔNG nằm ở đây: nó bất biến ở nhánh Update (ép riêng
/// U-VER) và TĂNG ở nhánh Migrate (M-VER).
pub fn identity_preserved(a: PlatformEntry, b: PlatformEntry) -> Bool {
  a.platform_id == b.platform_id && a.instance_id == b.instance_id && a.custody_hash == b.custody_hash && a.seed_policy == b.seed_policy && a.beacon_policy == b.beacon_policy && a.created_epoch == b.created_epoch
}

/// Field khả biến sau cập nhật/di trú vẫn hợp lệ.
///
/// Ép ĐÚNG 28 byte cho `governance_ref` (không chỉ "khác rỗng"): một giá trị rác trỏ tới
/// script không tồn tại làm `governance_consented` thành hằng False vĩnh viễn ⇒ hồ sơ
/// không Retire được, không di trú tiếp được, không đổi được ba trường quản trị. Nhánh
/// cứu (MigrateEntry) mà thiếu ràng buộc này thì TỰ TẠO LẠI đúng cái kẹt nó sinh ra để cứu.
///
/// ⚠ HÀM NÀY KHÔNG ĐỦ ĐỂ CHẶN HỒ SƠ TỰ KHOÁ. `own_hash` / `new_registry_hash` dài ĐÚNG
/// 28 byte nên qua được đây; chặn hai giá trị đó là việc của U-GOVSELF-OUT /
/// M-GOVSELF-OUT trong `registry.ak` (chúng cần biết hash của chính validator, thứ hàm
/// thuần này không có). Đừng đọc hàm này là "datum ra an toàn".
///
/// Dùng lại `shape_*` để hồ sơ sau cập nhật vẫn thuộc đúng một hạng — cấm mọi trạng thái
/// nửa vời. Việc CẤM CHUYỂN HẠNG ép riêng ở validator (`shape_custodial(in) ==
/// shape_custodial(out)`), vì hai hàm này chỉ nói về một entry đơn lẻ.
///
/// ⚠ HÀM NÀY LÀ ĐÁY CHUNG CỦA CẢ BA CỬA. `entry_well_formed` gọi nó ⇒ cửa đúc
/// (registry_beacon.ak:118, R-WF) áp; `registry.ak:192` (U-MUT) và `:225` (M-MUT) gọi
/// thẳng ⇒ hai cửa spend áp. Thêm điều kiện ở đây là thêm cho cả ba; đừng thêm ở một chỗ
/// khác rồi tưởng đã đủ.
pub fn mutable_fields_valid(e: PlatformEntry) -> Bool {
  bytearray.length(e.governance_ref) == script_hash_len && governance_ref_distinct(e) && list.length(
    e.accepted_assets,
  ) <= max_accepted_assets && or {
    shape_custodial(e),
    shape_non_custodial(e),
  }
}

/// Có đổi field nào thuộc nhóm "cần đồng thuận quản trị" không?
/// Ba field này quyết định TIỀN đi đâu và ai gác chi của platform — đổi mà platform
/// không biết là tước quyền, nên không cho một mình authority quyết.
pub fn governed_fields_changed(a: PlatformEntry, b: PlatformEntry) -> Bool {
  a.governance_ref != b.governance_ref || a.accepted_assets != b.accepted_assets || a.cut_bps != b.cut_bps
}

/// Có đúng 1 token (policy, name) trong value (beacon NFT hiện diện).
pub fn has_one_nft(v: Value, policy: ByteArray, name: ByteArray) -> Bool {
  assets.quantity_of(v, policy, name) == 1
}
