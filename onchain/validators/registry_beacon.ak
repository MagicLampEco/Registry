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
//   R-GOVDIST entry.governance_ref KHÁC custody_hash, seed_policy, beacon_policy — ba định
//             danh KHÁC của chính hồ sơ đó. Anh em của R-GOVSELF, chỉ đổi giá trị bị cấm.
//             `== custody_hash` là ca ĐẮT: kho Treasury có nhánh `Collect` permissionless
//             (đo 2026-09-01: 0 lần `extra_signatories` trong custody.ak) ⇒ ai cũng ghép
//             được input kho ⇒ `governance_consented` thành thủ tục rỗng ⇒ authority MỘT
//             MÌNH Retire được (PoC đã dựng). `== seed_policy`/`== beacon_policy` là ca tự
//             khoá: minting policy không có nhánh spend ⇒ đồng thuận hằng False.
//             Ép trong `platform.governance_ref_distinct`, gọi từ `mutable_fields_valid`
//             ⇒ áp CẢ BA cửa (R-WF ở đây, U-MUT và M-MUT ở registry.ak). Lý lẽ đầy đủ +
//             phân biệt với chốt "không vá bằng mã" ở util.ak:200 — xem platform.ak.
//   R-CAP     len(accepted_assets) ≤ platform.max_accepted_assets (=32). Danh sách này là
//             kênh duy nhất bên đăng ký bơm dài tuỳ ý; số đo + vì sao 32 ở platform.ak.
//             Cùng đường ép với R-GOVDIST ⇒ cũng áp đủ ba cửa.
//   R-GOVSELF entry.governance_ref != registry_hash. Nếu hồ sơ khai cổng quản trị CHÍNH
//             LÀ registry, thì `governance_consented` bên spend (quét tx.inputs tìm input
//             ở Script(governance_ref), mà ô hồ sơ luôn ở đó) thành hằng True vĩnh viễn ⇒
//             authority một mình Retire / đổi cut_bps / di trú được. Chặn ngay từ cửa nộp.
//   R-GOVLIVE entry.governance_ref phải CHẠY ĐƯỢC ngay trong chính tx đăng ký (spend một
//             input ở Script(governance_ref) hoặc withdrawal từ đó). Ép 28 byte
//             (R-WF) là guard CÚ PHÁP, KHÔNG chứng minh script tồn tại và có nhánh chạy
//             được. Kiểm bằng thực thi (PoC `newC1` PASS trước bản vá): đăng ký với
//             governance_ref là 28 byte bất kỳ được NHẬN, và sau đó hồ sơ không sửa được
//             (đổi governance_ref cần đồng thuận từ chính nó), không Retire được, không di
//             trú được; authority đặt `Paused` rồi im lặng là tái lập đúng "Paused vĩnh
//             viễn" mà nhánh hồi sinh U-REVIVE sinh ra để đóng.
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

    // R-ADDR: ô hồ sơ đăng ký ở địa chỉ ENTERPRISE của registry, không phải biến thể
    // stake cùng payment hash. Đây là cửa vào DUY NHẤT của mọi hồ sơ, nên ghim ở đây là
    // ghim được điều kiện đầu: không hồ sơ nào SINH RA ở chỗ off-chain không quét tới.
    // Ghi lại vì bản ghi cũ nói ngược: chỗ này từng bị xếp là "giới hạn cấu trúc, không
    // đóng được ở beacon". Câu đó đúng với cách vá `reg_out.address == own_addr` —
    // beacon không biết `own_addr`. Nó SAI với cách vá này, vì `has_no_stake_part` chỉ
    // đọc chính ô ra, không cần biết địa chỉ của ai.
    expect util.has_no_stake_part(entry_out.address)

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

    // R-GOVLIVE: bắt cổng quản trị CHẠY THẬT ngay lúc đăng ký. Đây là điểm DUY NHẤT trong
    // vòng đời hồ sơ mà ta có đòn bẩy: sau khi đã lên sổ, MỌI đường sửa/gỡ/di trú đều đi
    // qua chính `governance_ref` ⇒ một ref chết là hồ sơ chết mà không ai gỡ được. Ép 28
    // byte không thay được kiểm này: 28 byte đúng độ dài vẫn có thể là hash của script
    // không tồn tại, hoặc script không có nhánh nào chạy được.
    // ⚠ Giới hạn kế thừa từ `governance_consented` (xem util.ak): nó chứng minh "script
    // ĐÃ CHẠY", KHÔNG chứng minh "script phê duyệt ĐÚNG việc này", và cũng không loại
    // được script có nhánh permissionless. Ràng buộc đó nằm ở CHUẨN ĐĂNG KÝ, không ở đây.
    //
    // ⚠⚠ XUNG ĐỘT ĐÃ BIẾT, CỐ Ý KHÔNG VÁ BẰNG MÃ — R-GOVLIVE ⟂ R-MINT-2.
    // R-GOVLIVE bắt cổng quản trị chạy TRONG CHÍNH tx đăng ký; R-MINT-2 ngay trên kia cấm
    // tx đăng ký gánh policy mint NÀO KHÁC ngoài beacon. Hệ quả: một validator quản trị mà
    // nhánh đồng thuận của nó CẦN mint/burn — mẫu rất phổ thông, ví dụ đốt NFT đề xuất khi
    // thực thi quyết định — thì VĨNH VIỄN không đăng ký được. Kiểm bằng thực thi: PoC
    // `poc_register_gov_needs_mint_blocked` FAIL đúng tại dòng
    // `list.length(assets.policies(tx.mint)) == 1` của R-MINT-2, KHÔNG phải tại R-GOVLIVE.
    // KHÔNG nới R-MINT-2: nó là guard least-authority thật (beacon không được ngầm cấp
    // quyền đồng-mint token lạ trong cùng tx). Hai ĐƯỜNG VÒNG hợp lệ, cả hai đều chỉ cần
    // phía cổng quản trị làm, không cần đổi mã ở đây:
    //   (1) withdraw-0: cổng quản trị lộ một staking-script validator; tx đăng ký gắn
    //       withdrawal 0 lovelace từ Script(governance_ref). `governance_consented` nhận
    //       kiểu này (xem util.ak) và withdrawal KHÔNG đụng `tx.mint` ⇒ R-MINT-2 im lặng.
    //   (2) một nhánh SPEND KHÔNG MINT của chính script quản trị: cổng quản trị giữ một
    //       redeemer "chứng thực đăng ký" chỉ tiêu-và-tái-tạo UTxO của mình, không đúc,
    //       không đốt.
    // Nghĩa vụ này thuộc CHUẨN ĐĂNG KÝ (đội đăng ký phải chứng minh cổng quản trị của mình
    // có ít nhất một trong hai đường), Registry agent đưa vào REGISTRATION-STANDARD.md.
    expect util.governance_consented(tx, entry.governance_ref)

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
