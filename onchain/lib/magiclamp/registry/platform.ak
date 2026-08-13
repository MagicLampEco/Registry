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
//     UTxO. Nhưng (a) nó không mang beacon NFT thật nên không hiện ra khi quét theo
//     policy, và (b) muốn chi tiêu nó vẫn phải có chữ ký authority (U-SIG/M-SIG). Nên
//     nó trơ: không lừa được người quét sổ, không rút được gì.

use aiken/primitive/bytearray
use cardano/assets.{Value}
use magiclamp/registry/types.{AssetKey}

/// Độ dài MỌI script hash / policy id trên Cardano: 28 byte (blake2b-224).
/// Ép độ dài này ở mọi trường "trỏ tới script/policy" chặn một lớp lỗ nguyên: giá trị
/// rác (#"" , 1 byte, 29 byte) trỏ tới một script KHÔNG TỒN TẠI và KHÔNG THỂ tồn tại
/// ⇒ mọi điều kiện đọc theo nó thành hằng False ⇒ hồ sơ tự khoá chết. Xem `governance_ref`.
pub const script_hash_len: Int = 28

/// Phiên bản lược đồ hồ sơ hiện hành. Đăng ký mới BẮT BUỘC khai đúng số này (R-VER);
/// `MigrateEntry` chỉ được TĂNG (M-VER). Tên hằng viết thường vì Aiken bắt const phải
/// snake_case (chữ hoa đầu = tên kiểu → parser báo lỗi).
pub const spec_version_v2: Int = 2

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

/// Entry well-formed tại đăng ký: định danh có, `governance_ref`/`beacon_policy` đúng
/// 28 byte, status Active, và hồ sơ thuộc ĐÚNG MỘT trong hai hạng hình dạng.
///
/// `governance_ref` BẮT BUỘC cho CẢ HAI hạng — không phải để gác tiền (hồ sơ không kho
/// chẳng có tiền để gác), mà để hồ sơ luôn có MỘT BÊN đồng thuận được. Hồ sơ không có
/// nó là hồ sơ mà authority một mình Retire vĩnh viễn được — đúng thứ U-GOV dựng ra để
/// chặn.
pub fn entry_well_formed(e: PlatformEntry) -> Bool {
  e.platform_id != #"" && bytearray.length(e.governance_ref) == script_hash_len && e.created_epoch >= 0 && e.status == Active && bytearray.length(e.beacon_policy) == script_hash_len && or {
    shape_custodial(e),
    shape_non_custodial(e),
  }
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
/// Dùng lại `shape_*` để hồ sơ sau cập nhật vẫn thuộc đúng một hạng — cấm mọi trạng thái
/// nửa vời. Việc CẤM CHUYỂN HẠNG ép riêng ở validator (`shape_custodial(in) ==
/// shape_custodial(out)`), vì hai hàm này chỉ nói về một entry đơn lẻ.
pub fn mutable_fields_valid(e: PlatformEntry) -> Bool {
  bytearray.length(e.governance_ref) == script_hash_len && or {
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
