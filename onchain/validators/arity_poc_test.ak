// PoC ARITY — câu hỏi phải trả lời TRƯỚC hồ sơ đầu tiên lên chuỗi.
//
// `registry.ak:297` giải mã datum ĐÍCH của một lần di trú bằng
//     expect entry_out: PlatformEntry = od
// tức validator phiên bản HIỆN TẠI phán xử hình dạng datum của phiên bản SAU.
//
// Nếu phép ép kiểu mềm của Aiken kiểm SỐ TRƯỜNG, thì `MigrateEntry` không bao giờ đưa
// hồ sơ sang một lược đồ có thêm trường được — và `MigrateEntry` là đường nâng lược đồ
// DUY NHẤT. Khi đó cửa sổ thêm trường vào `PlatformEntry` đóng lại vĩnh viễn ở lần
// deploy đầu tiên, chứ không phải "đóng dần".
//
// Hôm nay chi phí trả lời bằng 0: chưa có gì trên bất kỳ mạng nào. Sau hồ sơ đầu tiên,
// câu trả lời "có kiểm" sẽ tốn một lần thay validator cho MỌI platform trong sổ, và
// `registry.ak:275-278` đòi đồng thuận quản trị của TỪNG platform — platform nào có cổng
// quản trị chết thì entry của nó kẹt lại ở lược đồ cũ, không ai gỡ được.
//
// Hai bài dưới đây đo hai chiều. Chúng KHÔNG khẳng định hành vi nào là đúng — chúng ghi
// lại hành vi THẬT của `aiken v1.1.21`, và sẽ đỏ nếu một bản Aiken sau đổi hành vi đó.
// Đỏ ở đây có nghĩa: đọc lại kết luận trước khi tin nó.

use magiclamp/registry/platform.{Active, PlatformEntry, PlatformStatus}
use magiclamp/registry/types.{AssetKey}

const gov: ByteArray = #"9019019019019019019019019019019019019019019019019019019a"

const hash28: ByteArray = #"c05dc05dc05dc05dc05dc05dc05dc05dc05dc05dc05dc05dc05dc05d"

// Lược đồ GIẢ ĐỊNH của một phiên bản sau: y hệt `PlatformEntry` v2, thêm ĐÚNG MỘT
// trường ở CUỐI. Thêm ở cuối là cách thêm ít phá nhất (Plutus Data đọc theo vị trí),
// nên nếu ngay cách này cũng không qua được thì mọi cách khác cũng không.
type PlatformEntryV3 {
  spec_version: Int,
  platform_id: ByteArray,
  instance_id: ByteArray,
  custody_hash: ByteArray,
  seed_policy: ByteArray,
  beacon_policy: ByteArray,
  governance_ref: ByteArray,
  accepted_assets: List<AssetKey>,
  cut_bps: Int,
  created_epoch: Int,
  status: PlatformStatus,
  substrate_flags: Int,
  display_name: ByteArray,
}

// Lược đồ giả định THIẾU một trường — chiều ngược lại, để biết phép kiểm chặt ở đâu.
// (Thiếu ĐÚNG trường cuối của lược đồ hiện hành: `substrate_flags`.)
type PlatformEntryThieu {
  spec_version: Int,
  platform_id: ByteArray,
  instance_id: ByteArray,
  custody_hash: ByteArray,
  seed_policy: ByteArray,
  beacon_policy: ByteArray,
  governance_ref: ByteArray,
  accepted_assets: List<AssetKey>,
  cut_bps: Int,
  created_epoch: Int,
  status: PlatformStatus,
}

fn v3_mau() -> PlatformEntryV3 {
  PlatformEntryV3 {
    spec_version: 3,
    platform_id: #"7468752d6c33",
    instance_id: #"696e73742d3031",
    custody_hash: hash28,
    seed_policy: hash28,
    beacon_policy: hash28,
    governance_ref: gov,
    accepted_assets: [],
    cut_bps: 250,
    created_epoch: 4000,
    status: Active,
    substrate_flags: 15,
    display_name: #"5468752033",
  }
}

fn entry_mau() -> PlatformEntry {
  PlatformEntry {
    spec_version: 2,
    platform_id: #"7468752d6c33",
    instance_id: #"696e73742d3031",
    custody_hash: hash28,
    seed_policy: hash28,
    beacon_policy: hash28,
    governance_ref: gov,
    accepted_assets: [],
    cut_bps: 250,
    created_epoch: 4000,
    status: Active,
    substrate_flags: 15,
  }
}

fn thieu_mau() -> PlatformEntryThieu {
  PlatformEntryThieu {
    spec_version: 3,
    platform_id: #"7468752d6c33",
    instance_id: #"696e73742d3031",
    custody_hash: hash28,
    seed_policy: hash28,
    beacon_policy: hash28,
    governance_ref: gov,
    accepted_assets: [],
    cut_bps: 250,
    created_epoch: 4000,
    status: Active,
  }
}

/// CHỨNG DƯƠNG — bắt buộc có, nếu không thì hai bài dưới vô nghĩa: một `if is` luôn trả
/// `False` vì lý do nào khác cũng cho ra đúng kết quả "đo được" ấy. Bài này khoá rằng phép
/// ép kiểm mềm CHẤP NHẬN khi hình dạng khớp.
test arity_khop_thi_qua() {
  let d: Data = entry_mau()
  if d is PlatformEntry {
    True
  } else {
    False
  }
}

/// ĐO ĐƯỢC (aiken v1.1.21, 2026-08-27): datum có ĐÚNG cấu trúc `PlatformEntry` cộng MỘT
/// trường thừa ở cuối **bị từ chối**. Tức phép ép kiểu mềm kiểm SỐ TRƯỜNG, không chỉ kiểm
/// constructor tag và bóc theo vị trí.
///
/// Hệ quả cho `registry.ak:297`: nhánh `MigrateEntry` KHÔNG đưa được hồ sơ sang một lược đồ
/// có thêm trường — validator hiện tại từ chối datum đích trước khi bất kỳ luật nào của
/// nhánh đó chạy. `MigrateEntry` là đường nâng lược đồ duy nhất, nên cửa sổ thêm trường vào
/// `PlatformEntry` đóng ở lần deploy đầu tiên chứ không đóng dần.
///
/// Bài này là **bài gác**: nó đỏ nếu một bản Aiken sau nới phép kiểm. Đỏ = đọc lại kết luận
/// trên trước khi tin nó, đừng sửa bài cho xanh.
test arity_thua_mot_truong_bi_tu_choi() {
  let d: Data = v3_mau()
  !if d is PlatformEntry {
    True
  } else {
    False
  }
}

/// Chiều ngược lại, cùng ngày đo: thiếu một trường cũng bị từ chối. Hai chiều cùng bị chặn
/// ⇒ phép kiểm là "khớp đúng arity", không phải "đủ tối thiểu theo vị trí".
test arity_thieu_mot_truong_bi_tu_choi() {
  let d: Data = thieu_mau()
  !if d is PlatformEntry {
    True
  } else {
    False
  }
}
