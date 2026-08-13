// PlatformKit registry_beacon — minting policy: đăng ký một Platform vào registry.
// Mỗi platform = 1 beacon NFT (name = platform_id) dưới policy CHUNG này → "tất cả
// platform" discoverable = tập UTxO mang token policy này.
//
// AUTHORITY-GATED (không permissionless): registry_authority (committee→DAO) PHẢI ký
// mỗi đăng ký → đảm bảo platform_id DUY NHẤT (authority không ký trùng) + kiểm duyệt
// onboarding (chống chiếm tên/rác).
//
// THAM SỐ (v2): (registry_authority, registry_hash). Vòng beacon↔registry nay phá theo
// CHIỀU NGƯỢC v1: `registry` bỏ tham số beacon_policy ⇒ hash của nó tính được TRƯỚC ⇒
// truyền vào đây ⇒ cổng đúc ÉP ĐƯỢC địa chỉ đích. v1 chọn output bằng self-ref NFT nên
// không ép được đích: hồ sơ đặt ở script lạ vẫn lọt (kiểm bằng thực thi 2026-08-04) và
// khi đó registry.ak không có quyền tài phán — U-ID/U-SIG/U-TERMINAL/U-NFT đều không áp.
//
// ÉP:
//   R-MINT-1  mint ĐÚNG 1 token policy này, qty +1 (name = platform_id).
//   R-MINT-2  tx đăng ký KHÔNG gánh mint policy NGOÀI (least-authority).
//   R-SIG     tx ký bởi registry_authority.
//   R-OUT-1   ĐÚNG 1 output mang NFT đó (self-ref), Ở ĐÚNG Script(registry_hash) + datum.
//   R-NAME    entry.platform_id == NFT name.
//   R-POLICY  entry.beacon_policy == policy_id — lời tự khai phải khớp policy THẬT.
//   R-VER     entry.spec_version == spec_version_v2.
//   R-WF      PlatformEntry well-formed: platform_id khác rỗng, governance_ref và
//             beacon_policy ĐÚNG 28 byte, status Active, và hồ sơ thuộc ĐÚNG MỘT hạng
//             hình dạng — CÓ KHO (instance_id/custody_hash/seed_policy/accepted đủ) hoặc
//             KHÔNG KHO (rỗng hết, cut_bps 0). Không có trạng thái nửa vời.
//   R-GOVSELF entry.governance_ref != registry_hash. Nếu hồ sơ khai cổng quản trị CHÍNH
//             LÀ registry, thì `governance_consented` bên spend (quét tx.inputs tìm input
//             ở Script(governance_ref), mà ô hồ sơ luôn ở đó) thành hằng True vĩnh viễn ⇒
//             authority một mình Retire / đổi cut_bps / di trú được. Chặn ngay từ cửa nộp.
//   R-VALUE   ô hồ sơ chỉ mang beacon NFT + ADA, KHÔNG token lạ.
//   R-EPOCH   created_epoch == Ô THỜI GIAN của CHÍNH tx đăng ký (validity_range gọn 1 ô).
//             ⚠ "ô 5 ngày kể từ mốc Unix", KHÔNG phải epoch Cardano — xem util.ak.
//   R-BIND    CHỈ ÁP CHO HỒ SƠ CÓ KHO: entry tự nhất quán với một reference input mang NFT
//             (seed_policy, instance_id) ở đúng Script(custody_hash). Hồ sơ KHÔNG KHO thì
//             ba giá trị đó rỗng — không có gì để đối chiếu. Bỏ R-BIND cho hạng không kho
//             KHÔNG hạ an toàn: R-BIND vốn chỉ kiểm entry TỰ NHẤT QUÁN (xem chú thích tại
//             chỗ — một kho tự dựng hoàn toàn vẫn qua được), cổng thật là chữ ký authority.
// BURN — CẤM (else fail): beacon sống suốt vòng đời platform; retire = status trong datum.

use aiken/collection/dict
use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Transaction}
use magiclamp/registry/platform.{PlatformEntry, RegistryBeaconRedeemer}
use magiclamp/registry/util

/// R-BIND: có một reference input mang ĐÚNG 1 NFT (seed_policy, instance_id) ở đúng
/// Script(custody_hash) không? Trả Bool (không `expect`) để gọi được có điều kiện —
/// hạng KHÔNG KHO không có kho để đối chiếu.
fn custody_bound(tx: Transaction, entry: PlatformEntry) -> Bool {
  when
    list.find(
      tx.reference_inputs,
      fn(i) {
        assets.quantity_of(i.output.value, entry.seed_policy, entry.instance_id) == 1
      },
    )
  is {
    Some(cust_ref) ->
      util.is_at_script(cust_ref.output.address, entry.custody_hash)
    None -> False
  }
}

validator registry_beacon(registry_authority: ByteArray, registry_hash: ByteArray) {
  mint(_redeemer: RegistryBeaconRedeemer, policy_id: PolicyId, tx: Transaction) {
    // R-SIG: authority ký (kiểm duyệt + đảm bảo platform_id duy nhất).
    expect list.has(tx.extra_signatories, registry_authority)

    // R-MINT-1: mint đúng 1 token, qty 1.
    let own_tokens = assets.tokens(tx.mint, policy_id)
    expect dict.size(own_tokens) == 1
    expect [Pair(platform_id, qty)] = dict.to_pairs(own_tokens)
    expect qty == 1
    // R-MINT-2 (F5): tx đăng ký KHÔNG gánh mint policy NGOÀI (least-authority — beacon
    // không ngầm cho phép đồng-mint token lạ trong cùng tx).
    expect list.length(assets.policies(tx.mint)) == 1

    // R-OUT-1: đúng 1 output mang NFT đó (self-ref), Ở ĐÚNG địa chỉ registry + datum.
    // Ép đích là chỗ v1 thiếu: có nó thì mọi hồ sơ đã đăng ký đều nằm trong quyền tài
    // phán của registry.ak (chữ ký authority, định danh bất biến, bảo toàn NFT).
    expect util.count_outputs_with_token(tx.outputs, policy_id, platform_id) == 1
    let entry_out = util.output_with_token(tx.outputs, policy_id, platform_id)
    expect util.is_at_script(entry_out.address, registry_hash)

    expect InlineDatum(od) = entry_out.datum
    expect entry: PlatformEntry = od

    // R-NAME: datum khai báo đúng platform_id đã mint.
    expect entry.platform_id == platform_id

    // R-POLICY: datum khai đúng policy beacon THẬT. Không có ràng buộc này thì
    // registry.ak (đọc beacon_policy từ datum) bị dắt mũi bằng một policy tự chế.
    expect entry.beacon_policy == policy_id

    // R-VER: đăng ký mới phải theo đúng lược đồ hiện hành.
    expect entry.spec_version == platform.spec_version_v2

    // R-WF: entry well-formed (gồm cả phép chọn hạng hình dạng — xem platform.ak).
    expect platform.entry_well_formed(entry)

    // R-GOVSELF: cổng đồng thuận KHÔNG được là chính registry. Đây là chỗ hồ sơ tự
    // thoả `governance_consented` vĩnh viễn — chặn ngay tại cửa nộp, đừng để lọt vào sổ
    // rồi mới phát hiện (hồ sơ đã lọt thì spend cũng chặn, nhưng khi đó nó KẸT).
    expect entry.governance_ref != registry_hash

    // R-VALUE: ô hồ sơ chỉ mang beacon NFT + ADA. Chặn nhét token lạ vào ô hồ sơ
    // (rác sổ, và về sau là đường lách kế toán khi ô hồ sơ có giữ giá trị).
    expect assets.without_lovelace(entry_out.value) == assets.from_asset(
      policy_id,
      platform_id,
      1,
    )

    // R-EPOCH: created_epoch phải là Ô THỜI GIAN của CHÍNH tx đăng ký. Trước v2 chỉ ép
    // `created_epoch >= 0`, nên khai 0 để ra vẻ platform lâu đời nhất hệ là ĐƯỢC — mà
    // trường này lại bị khoá bất biến ⇒ lời khai sai thành sự thật vĩnh viễn của sổ.
    // ⚠ Tên trường nói "epoch" nhưng đơn vị là ô 5 ngày kể từ mốc Unix, KHÔNG phải epoch
    // Cardano (chênh ~2,9 ngày ở mốc Shelley, sai 5× trên Preview) — xem util.ak. Bảo đảm
    // cần ở đây chỉ là "không khai được mình già hơn thực tế", một thang đơn điệu là đủ.
    expect entry.created_epoch == util.current_time_bucket(tx)

    // R-BIND: entry phải TỰ NHẤT QUÁN với một reference input đang tồn tại — mang đúng 1 NFT
    // (seed_policy, instance_id) ở đúng địa chỉ Script(custody_hash). Ép được thứ tự onboard
    // 2 bước (seed → register): không có kho trên chain thì không đăng ký được.
    // ⚠ ĐỌC KỸ GIỚI HẠN: cả ba giá trị đều lấy từ CHÍNH datum người đăng ký khai, nên đây KHÔNG
    // phải phép xác thực "custody là Treasury thật". Kiểm bằng thực thi 2026-08-04: một kho tự
    // dựng hoàn toàn (policy riêng + script riêng) vẫn qua R-BIND. Cổng thật lúc đăng ký là chữ
    // ký authority; bên định tuyến phí BẮT BUỘC tự đối soát kho, không được tin R-BIND là đủ.
    // ⚠ CHỈ ÁP CHO HẠNG CÓ KHO. Hạng KHÔNG KHO có seed_policy/instance_id/custody_hash rỗng —
    // không có gì để đối chiếu. Bỏ R-BIND ở đó KHÔNG hạ an toàn vì R-BIND vốn chỉ kiểm entry
    // tự nhất quán (xem giới hạn ngay trên), và `entry_well_formed` đã ép rỗng ĐỦ CẢ NĂM
    // trường ⇒ không có hồ sơ nửa vời nào lách được bằng cách khai "không kho".
    expect or {
        !platform.shape_custodial(entry),
        custody_bound(tx, entry),
      }

    True
  }

  else(_) {
    fail
  }
}
