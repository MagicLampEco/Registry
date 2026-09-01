// Registry shared helpers.
//
// Trọng tâm: đếm/tìm UTxO theo PAYMENT SCRIPT HASH (chống double-satisfaction qua
// stake credential — bài học audit C1/C2/M1 Distribution), KHÔNG so full Address.
//
// Đây là tập con của `util.ak` bên Treasury, giữ ĐÚNG những hàm hai validator
// registry dùng, cộng thêm helper epoch chép nguyên ngữ nghĩa từ Treasury (xem mục
// "Epoch từ validity_range" bên dưới) — hai sổ phải cùng một quy ước epoch, lệch là
// hỏng đối soát.

use aiken/collection/list
use aiken/interval.{Finite, IntervalBound, IntervalBoundType}
use cardano/address.{Address, Credential, Inline, Script, VerificationKey}
use cardano/assets.{Value}
use cardano/transaction.{InlineDatum, Input, NoDatum, Output, OutputReference,
  Transaction}

/// Address của chính UTxO đang spend.
pub fn own_address(own_ref: OutputReference, inputs: List<Input>) -> Address {
  expect Some(i) = list.find(inputs, fn(x) { x.output_reference == own_ref })
  i.output.address
}

/// Script hash của chính validator đang chạy.
pub fn own_script_hash(own_addr: Address) -> ByteArray {
  expect Script(h) = own_addr.payment_credential
  h
}

/// payment credential của address có phải Script(hash) không.
pub fn is_at_script(addr: Address, script_hash: ByteArray) -> Bool {
  when addr.payment_credential is {
    Script(h) -> h == script_hash
    _ -> False
  }
}

/// Address KHÔNG mang phần stake (= biến thể "enterprise" của script).
///
/// ⚠ VÌ SAO LÀ MỘT KIỂM RIÊNG, KHÔNG GỘP VÀO `is_at_script`. Chú thích đầu tệp chốt:
/// đếm/tìm PHẢI theo payment hash, cố ý bỏ stake — gộp stake vào phép tìm là mở lại lỗ
/// double-satisfaction C1/C2/M1 (phép ĐẾM "đúng 1 ô" sẽ không nhìn thấy biến thể stake,
/// nên hai ô cùng payment hash lọt qua như một). Nên phép đếm giữ nguyên, và ô ra bị
/// GHIM thêm bằng dòng này — hai ràng buộc cộng lại xác định địa chỉ ô ra DUY NHẤT.
///
/// Cái nó đóng KHÔNG phải rút tiền (sổ không giữ giá trị — PK1) mà là TÀNG HÌNH:
/// `scripts/config.ts:124` dựng địa chỉ enterprise (`credentialToAddress`, không phần
/// stake), nên ai lấy UTxO bằng `utxosAt(<địa chỉ đó>)` KHÔNG thấy hồ sơ đã dời sang
/// biến thể stake — dù hồ sơ vẫn hợp lệ và vẫn mang beacon NFT. Sổ chỉ đường mà đọc
/// bằng đường chuẩn lại không thấy mục thì nó thôi là sổ chỉ đường.
///
/// Đánh đổi, có chủ ý: ghim enterprise là bỏ quyền uỷ thác (delegate) phần ADA khoá
/// trong ô hồ sơ. Giá đó nhỏ (mỗi ô chỉ min-ADA) và đổi lại bỏ được một câu hỏi không
/// có người trả lời — ai giữ stake credential của ô hồ sơ, và quyền uỷ thác ấy của ai.
pub fn has_no_stake_part(addr: Address) -> Bool {
  addr.stake_credential == None
}

/// payment credential của address có phải VerificationKey(pkh) không (= ví thường).
pub fn is_vk(addr: Address) -> Bool {
  when addr.payment_credential is {
    VerificationKey(_) -> True
    _ -> False
  }
}

// ── Đếm/tìm theo SCRIPT HASH (chống double-satisfaction) ──

pub fn count_inputs_at_script(inputs: List<Input>, script_hash: ByteArray) -> Int {
  list.count(inputs, fn(x) { is_at_script(x.output.address, script_hash) })
}

pub fn count_outputs_at_script(outputs: List<Output>, script_hash: ByteArray) -> Int {
  list.count(outputs, fn(x) { is_at_script(x.address, script_hash) })
}

pub fn input_at_script(inputs: List<Input>, script_hash: ByteArray) -> Output {
  expect Some(i) =
    list.find(inputs, fn(x) { is_at_script(x.output.address, script_hash) })
  i.output
}

pub fn output_at_script(outputs: List<Output>, script_hash: ByteArray) -> Output {
  expect Some(o) = list.find(outputs, fn(x) { is_at_script(x.address, script_hash) })
  o
}

// ── Tìm output mang 1 token (policy,name) — self-ref NFT ──
// registry_beacon chọn output entry bằng CHÍNH NFT vừa mint (không cần registry_hash
// trong param → phá vòng phụ thuộc beacon↔registry). NFT bất khả phân (qty 1) ⇒ nằm
// trong đúng 1 output.

pub fn count_outputs_with_token(
  outputs : List<Output>,
  policy  : ByteArray,
  name    : ByteArray,
) -> Int {
  list.count(outputs, fn(o) { assets.quantity_of(o.value, policy, name) >= 1 })
}

pub fn output_with_token(
  outputs : List<Output>,
  policy  : ByteArray,
  name    : ByteArray,
) -> Output {
  expect Some(o) =
    list.find(outputs, fn(o) { assets.quantity_of(o.value, policy, name) >= 1 })
  o
}

// ── Ô THỜI GIAN từ validity_range ──
//
// ⚠ ĐỌC KỸ TÊN — ĐÂY KHÔNG PHẢI EPOCH CARDANO. `posix_ms / 432_000_000` là chỉ số
// "Ô 5 NGÀY KỂ TỪ MỐC UNIX (1970)", không phải số epoch của chuỗi. Số cụ thể:
//   · tại mốc Shelley (epoch 208 bắt đầu ở 1596059091 s) hàm này trả **3694**;
//   · biên ô lật SỚM hơn biên epoch thật khoảng **251.091 s ≈ 2,9 ngày**;
//   · trên **Preview** (epoch dài 1 ngày) sai số là **5×**.
// Vì thế v2 đổi CÁCH GỌI (`time_bucket`) chứ KHÔNG đổi số học — số học giữ nguyên để
// khớp helper Treasury. Bảo đảm mà R-EPOCH cần — "không khai được mình già hơn thực
// tế" — vẫn đứng, vì nó chỉ đòi MỘT THANG ĐƠN ĐIỆU theo thời gian, không đòi thang đó
// trùng biên epoch.
//
// CHÉP NGUYÊN NGỮ NGHĨA + HẰNG SỐ từ
//   /Users/ductiger/Projects/LAMP/Treasury/onchain/lib/magiclamp/treasury/util.ak:105
//   (`get_epoch_bounded`; bản Treasury lại mirror `Distribution util.get_epoch`)
// cộng một sửa lỗi fail-closed quá tay (`is_inclusive`, xem dưới).
//
// ⚠ "HAI SỔ CÙNG QUY ƯỚC" — CHƯA KIỂM, đừng viết như đã kiểm. Bên Treasury
// `ms_per_epoch` là THAM SỐ validator (LAMP/Treasury/onchain/validators/custody.ak:50),
// không phải hằng; giá trị 432_000_000 chỉ xuất hiện trong TEST
// (LAMP/Treasury/onchain/validators/collect_test.ak:25). Nên mệnh đề "Registry và
// Treasury dùng cùng thang thời gian" chỉ đúng NẾU bên triển khai truyền đúng
// 432_000_000 vào custody — chưa có bằng chứng deploy nào chứng minh điều đó.

/// Độ dài một Ô THỜI GIAN của quy ước này = 5 ngày = 432_000_000 ms.
/// (Tên cũ `ms_per_epoch` bị bỏ vì nói sai bản chất — xem khối chú thích trên.)
pub const ms_per_time_bucket: Int = 432_000_000

pub fn get_finite(bt: IntervalBoundType) -> Option<Int> {
  when bt is {
    Finite(s) -> Some(s)
    _ -> None
  }
}

/// Ô thời gian CÓ CHẶN — ép validity_range nằm GỌN trong 1 ô (lower & upper hữu hạn,
/// cùng ô). Chống "đóng băng" mốc: nếu range trải nhiều ô, kẻ đặt lower ở ô cũ rồi
/// submit muộn → mốc ghi vào sổ tụt hậu thời gian thật. Ép upper hữu hạn + cùng ô ⇒ tx
/// chỉ hợp lệ TRONG đúng ô đó ⇒ giá trị trả về == ô submit thật.
///
/// TÔN TRỌNG `is_inclusive` (sửa fail-closed quá tay của bản đầu): ledger mã hoá
/// `invalid_hereafter` thành biên trên LOẠI TRỪ, nên đọc thẳng `bound_type` sẽ từ chối
/// một tx hợp lệ đặt ttl đúng mốc biên — tx đó nằm TRỌN trong ô. Biên loại trừ ⇒ mốc
/// thật lệch 1 ms vào trong (`hi - 1`, `lo + 1`).
///
/// HỢP ĐỒNG VỚI OFF-CHAIN: đặt `invalid_hereafter ≤ (bucket + 1) * 432_000_000` và
/// `invalid_before ≥ bucket * 432_000_000`. (Bản khuyến nghị chặt hơn một nhịp —
/// `≤ (bucket+1) * 432_000_000 − 1` — cũng luôn qua; dùng nó nếu muốn dư biên.)
pub fn get_time_bucket_bounded(tx: Transaction, ms: Int) -> Int {
  let IntervalBound { bound_type: lo, is_inclusive: lo_inc } =
    tx.validity_range.lower_bound
  let IntervalBound { bound_type: hi, is_inclusive: hi_inc } =
    tx.validity_range.upper_bound
  expect Some(lo_raw) = get_finite(lo)
  expect Some(hi_raw) = get_finite(hi)
  let lo_ms =
    if lo_inc {
      lo_raw
    } else {
      lo_raw + 1
    }
  let hi_ms =
    if hi_inc {
      hi_raw
    } else {
      hi_raw - 1
    }
  let b = lo_ms / ms
  // upper PHẢI cùng ô với lower (range không trải qua biên ô).
  expect hi_ms / ms == b
  b
}

/// Ô thời gian hiện tại theo quy ước Registry (bọc `get_time_bucket_bounded`).
pub fn current_time_bucket(tx: Transaction) -> Int {
  get_time_bucket_bounded(tx, ms_per_time_bucket)
}

// ── Đồng thuận quản trị của chính platform ──

/// Platform đồng ý: giao dịch hoặc CHI TIÊU một input ở Script(governance_ref), hoặc
/// mang một withdrawal từ Script(governance_ref). Nhận CẢ HAI kiểu để không ép platform
/// phải theo đúng một kiểu tích hợp (validator giữ state thì spend; validator gác bằng
/// staking-credential thì withdraw-zero).
///
/// ⚠ Đây là "validator quản trị đã CHẠY và cho phép tx này", không phải "có ai đó ký".
/// Nội dung quyết định nằm ở chính validator quản trị của platform — Registry không
/// đọc datum của nó, chỉ đòi nó phải chạy.
///
/// ⚠ GIẢ ĐỊNH LOAD-BEARING (chốt: KHÔNG vá bằng mã ở v2 — đừng ai tự ý "sửa"):
/// hàm này KHÔNG ràng vào HÀNH ĐỘNG. Nó đòi "script quản trị có chạy trong tx", không
/// đòi "script đó phê duyệt ĐÚNG thay đổi này". Muốn ràng vào hành động thì phải ép
/// hình dạng redeemer của script quản trị, tức ép MỌI platform theo một kiểu tích hợp
/// duy nhất — giá quá đắt cho một cổng đăng ký mở. Ràng buộc được chuyển sang CHUẨN
/// ĐĂNG KÝ: `governance_ref` phải là script KHÔNG CÓ NHÁNH PERMISSIONLESS, và bên đăng
/// ký phải khai điều đó.
/// ⟹ AN TOÀN CỦA U-GOV/M-GOV = AN TOÀN CỦA VALIDATOR QUẢN TRỊ MÀ CHÍNH PLATFORM KHAI.
/// Nếu `governance_ref` có một nhánh ai cũng chạy được (vd withdraw-0 không điều kiện),
/// thì "đồng thuận quản trị" là thủ tục rỗng.
///
/// ⚠ GIẢ ĐỊNH LOAD-BEARING (v1 triển khai): `Specs/CONTRACT.md:129-131, 284-286` đặt
/// `registry_authority` và `governance_ref` là CÙNG một committee bootstrap ⇒ "hai bên
/// đồng thuận" trong v1 THỰC CHẤT LÀ MỘT BÊN. Đây là cấu hình triển khai, không vá được
/// bằng mã. Rào hai bên chỉ có nghĩa thật khi platform vận hành `governance_ref` riêng.
pub fn governance_consented(tx: Transaction, governance_ref: ByteArray) -> Bool {
  let spent =
    list.any(tx.inputs, fn(i) { is_at_script(i.output.address, governance_ref) })
  let withdrawn =
    list.any(
      tx.withdrawals,
      fn(p) {
        let Pair(cred, _amount) = p
        credential_is_script(cred, governance_ref)
      },
    )
  spent || withdrawn
}

fn credential_is_script(cred: Credential, script_hash: ByteArray) -> Bool {
  when cred is {
    Script(h) -> h == script_hash
    _ -> False
  }
}

// ── Bảo toàn value của ô hồ sơ ──

/// Ô hồ sơ KHÔNG được rút bớt: native asset giữ nguyên hệt (beacon NFT không rời, không
/// nhân bản, không nhét token lạ vào rồi rút ra), lovelace chỉ được bằng hoặc tăng.
/// Hôm nay sổ chưa giữ giá trị nên đây là ràng buộc dự phòng; bản sau đặt tiền cọc đăng
/// ký vào chính ô hồ sơ thì thiếu nó là lỗ rút tiền ngay.
///
/// ⚠ GIỚI HẠN ĐÃ BIẾT — CỐ Ý GIỮ, KHÔNG ĐƯỢC XOÁ: chỉ cho lovelace TĂNG ⇒ ADA dư ai đó
/// gửi nhầm vào ô hồ sơ là KẸT VĨNH VIỄN, không có đường rút. Đây là đánh đổi có chủ ý:
/// mở đường rút là mở đúng cái lỗ tệ hơn (authority tự rút giá trị khỏi ô hồ sơ, và về
/// sau là rút tiền cọc đăng ký). Ai định "vá" chỗ này phải trả lời được: ai ký lệnh rút,
/// và làm sao phân biệt "ADA gửi nhầm" với "tiền cọc".
pub fn value_not_drained(v_in: Value, v_out: Value) -> Bool {
  assets.without_lovelace(v_out) == assets.without_lovelace(v_in) && assets.lovelace_of(
    v_out,
  ) >= assets.lovelace_of(v_in)
}

// ── Test-support builders (mock UTxO/tx) ──

pub fn script_address(hash: ByteArray) -> Address {
  Address { payment_credential: Script(hash), stake_credential: None }
}

/// Biến thể STAKE của cùng một script hash — cùng payment credential, khác địa chỉ.
/// Dùng để dựng đúng ca mà `has_no_stake_part` chặn.
pub fn script_address_staked(hash: ByteArray, stake: ByteArray) -> Address {
  Address {
    payment_credential: Script(hash),
    stake_credential: Some(Inline(Script(stake))),
  }
}

pub fn vk_address(pkh: ByteArray) -> Address {
  Address { payment_credential: VerificationKey(pkh), stake_credential: None }
}

pub fn mk_output(addr: Address, value: Value, datum: Data) -> Output {
  Output {
    address: addr,
    value: value,
    datum: InlineDatum(datum),
    reference_script: None,
  }
}

pub fn mk_output_no_datum(addr: Address, value: Value) -> Output {
  Output { address: addr, value: value, datum: NoDatum, reference_script: None }
}

pub fn mk_input(ref: OutputReference, out: Output) -> Input {
  Input { output_reference: ref, output: out }
}

pub fn mk_ref(ix: Int) -> OutputReference {
  OutputReference { transaction_id: #"00", output_index: ix }
}
