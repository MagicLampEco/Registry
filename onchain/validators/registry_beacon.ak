// PlatformKit registry_beacon — minting policy: đăng ký một Platform vào registry.
// Mỗi platform = 1 beacon NFT (name = platform_id) dưới policy CHUNG này → "tất cả
// platform" discoverable = tập UTxO mang token policy này.
//
// AUTHORITY-GATED (không permissionless): registry_authority (committee→DAO) PHẢI ký
// mỗi đăng ký → đảm bảo platform_id DUY NHẤT (authority không ký trùng) + kiểm duyệt
// onboarding (chống chiếm tên/rác). Phá vòng beacon↔registry bằng self-ref NFT.
//
// ÉP:
//   R-MINT-1  mint ĐÚNG 1 token policy này, qty +1 (name = platform_id).
//   R-SIG     tx ký bởi registry_authority.
//   R-OUT-1   ĐÚNG 1 output mang NFT đó (self-ref), ở MỘT script bất kỳ (KHÔNG ví thường) + datum.
//             ⚠ KHÔNG ép được output ở đúng script hash registry — né vòng apply-param bằng
//             self-ref NFT thì mất khả năng ép địa chỉ đích. Kiểm bằng thực thi 2026-08-04:
//             entry đặt ở Script lạ vẫn qua. Hệ quả: entry đó nằm ngoài quyền tài phán của
//             registry.ak nên U-ID/U-SIG/U-TERMINAL không áp. Van chặn duy nhất hiện nay là
//             authority soát ĐỊA CHỈ output, không chỉ soát datum.
//   R-WF      PlatformEntry well-formed (định danh khác rỗng, cut_bps∈[0,10000], Active).
//   R-NAME    entry.platform_id == NFT name.
// BURN — CẤM (else fail): beacon sống suốt vòng đời platform; retire = status trong datum.

use aiken/collection/dict
use aiken/collection/list
use cardano/address.{Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Transaction}
use magiclamp/registry/platform.{PlatformEntry, RegistryBeaconRedeemer}
use magiclamp/registry/util

validator registry_beacon(registry_authority: ByteArray) {
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

    // R-OUT-1: đúng 1 output mang NFT đó (self-ref), ở Script (registry), + datum.
    expect util.count_outputs_with_token(tx.outputs, policy_id, platform_id) == 1
    let entry_out = util.output_with_token(tx.outputs, policy_id, platform_id)
    expect !util.is_vk(entry_out.address)

    expect InlineDatum(od) = entry_out.datum
    expect entry: PlatformEntry = od

    // R-NAME: datum khai báo đúng platform_id đã mint.
    expect entry.platform_id == platform_id

    // R-WF: entry well-formed.
    expect platform.entry_well_formed(entry)

    // R-BIND: entry phải TỰ NHẤT QUÁN với một reference input đang tồn tại — mang đúng 1 NFT
    // (seed_policy, instance_id) ở đúng địa chỉ Script(custody_hash). Ép được thứ tự onboard
    // 2 bước (seed → register): không có kho trên chain thì không đăng ký được.
    // ⚠ ĐỌC KỸ GIỚI HẠN: cả ba giá trị đều lấy từ CHÍNH datum người đăng ký khai, nên đây KHÔNG
    // phải phép xác thực "custody là Treasury thật". Kiểm bằng thực thi 2026-08-04: một kho tự
    // dựng hoàn toàn (policy riêng + script riêng) vẫn qua R-BIND. Cổng thật lúc đăng ký là chữ
    // ký authority; bên định tuyến phí BẮT BUỘC tự đối soát kho, không được tin R-BIND là đủ.
    expect Some(cust_ref) =
      list.find(
        tx.reference_inputs,
        fn(i) {
          assets.quantity_of(i.output.value, entry.seed_policy, entry.instance_id) == 1
        },
      )
    expect Script(custody_h) = cust_ref.output.address.payment_credential
    expect custody_h == entry.custody_hash

    True
  }

  else(_) {
    fail
  }
}
