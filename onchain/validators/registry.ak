// PlatformKit registry — spend validator: cập nhật / di trú một entry platform đã đăng ký.
// Entry UTxO mang beacon NFT (policy khai trong datum) + datum PlatformEntry, sống ở
// địa chỉ validator này. Discoverable qua beacon policy; mỗi entry độc lập (no contention).
//
// THAM SỐ (v2): CHỈ `registry_authority`. Bỏ tham số `beacon_policy` — nay đọc từ
// `entry_in.beacon_policy`. Nhờ vậy hash của validator này tính được TRƯỚC, và
// `registry_beacon(authority, registry_hash)` mới ép được địa chỉ đích lúc đúc.
// ⚠ Đánh đổi (ghi rõ, không giấu): lời khai `beacon_policy` trong một UTxO TỰ DỰNG ở
// địa chỉ này có thể bịa. Hồ sơ bịa đó không mang beacon NFT thật nên không hiện ra khi
// quét sổ theo policy — và ĐÓ LÀ THỨ DUY NHẤT đỡ nó.
// ⛔ ĐÍNH CHÍNH 2026-08-15: bản trước viết tiếp "và muốn chi tiêu nó vẫn phải có chữ ký
// authority ⇒ trơ". SAI — PoC audit đối kháng PASS. Ngoại lệ U-SIG ở `:205-211` nhận
// `pure_revive && governance_consented(entry_in.governance_ref)`; trong ô tự dựng thì
// `governance_ref` CŨNG do kẻ dựng khai ⇒ spend `Paused → Active` với
// `extra_signatories: []` là ĐI QUA. Xem khối đính chính đầy đủ ở
// `lib/magiclamp/registry/platform.ak:19`.
//
// ÉP (chung cả hai nhánh):
//   S-GOVSELF `entry_in.governance_ref != own_hash`. LỖ ĐÃ CHẶN: `governance_consented`
//             quét MỌI tx.inputs tìm input ở Script(governance_ref), mà ô hồ sơ đang chi
//             tiêu LUÔN nằm ở Script(own_hash) ⇒ một hồ sơ khai `governance_ref = hash
//             của chính registry` biến `governance_consented` thành hằng True VĨNH VIỄN
//             ⇒ authority một mình Retire / đổi cut_bps / di trú được. Rào "hai bên" bị
//             mở lại bằng đúng MỘT GIÁ TRỊ DATUM. Cổng đúc cũng chặn ở R-GOVSELF.
//
// ÉP (UpdateEntry — authority + đồng thuận quản trị cho việc KHÔNG đảo ngược được):
//   U-SIG     tx ký bởi registry_authority — TRỪ ca hồi sinh thuần tuý (xem U-REVIVE).
//   U-REVIVE  Paused → Active mà MỌI trường khác Y HỆT: authority ký HOẶC đồng thuận
//             quản trị của chính platform. Lý do tách chiều (đặc tả gốc gộp một dòng
//             `Active ↔ Paused`, đó là lỗi đặc tả): nếu cả hai chiều đều chỉ cần
//             authority thì authority đặt Paused rồi KHÔNG BAO GIỜ ký lại — platform
//             không có cách tự đảo ngược. Hiệu ứng thật = gỡ vĩnh viễn, mà KHÔNG đi qua
//             rào "hai bên" mà chính luật này dựng ra. Nguồn cao hơn:
//             Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md:201 §8 bước 7 — "kết nạp DỄ,
//             gỡ KHÓ (ngưỡng cao hơn nhiều) — để không ai vũ-khí-hoá bước gỡ nhắm đối
//             thủ". Chiều `Active → Paused` GIỮ NGUYÊN chỉ-authority: cần van dừng nhanh.
//             "Mọi trường khác y hệt" ép CHẶT (identity 6 field + spec_version +
//             governance_ref + accepted_assets + cut_bps); lỏng một trường là platform
//             tự mở lại KÈM đổi cut_bps — đi vòng qua đúng ràng buộc vừa dựng.
//   U-SINGLE  ĐÚNG 1 entry input + 1 entry output theo SCRIPT HASH (chống double-sat).
//             ⚠ GIỚI HẠN ĐÃ BIẾT, CỐ Ý KHÔNG VÁ: đếm theo PAYMENT credential, KHÔNG so
//             stake credential. Đó là chủ ý (đếm theo payment-hash là cách chống
//             double-satisfaction qua stake credential — bài học audit C1/C2/M1
//             Distribution, xem util.ak đầu file). Hệ quả đo được (PoC `newD` PASS): ô hồ
//             sơ tiếp tục có thể mang stake credential KHÁC ô cũ — ai đẩy được một tx hợp
//             lệ (vd hồi sinh bằng đồng thuận quản trị) thì gắn stake credential của mình
//             vào ô hồ sơ. Thiệt hại nhỏ vì sổ KHÔNG giữ giá trị (PK1): chỉ min-ADA của ô
//             hồ sơ bị đổi quyền uỷ thác, không rút được gì. ⚠ Nếu bản sau đặt TIỀN CỌC
//             đăng ký vào chính ô hồ sơ thì phải cân lại chỗ này.
//   U-NFT     beacon NFT (entry_in.beacon_policy, platform_id) bảo toàn ở in & out.
//   U-ID      identity bất biến 6 field (thêm beacon_policy so với v1).
//   U-VER     spec_version KHÔNG đổi (đổi phiên bản phải đi đường MigrateEntry).
//   U-MUT     field khả biến sau cập nhật vẫn hợp lệ (governance_ref đúng 28 byte,
//             và entry vẫn thuộc ĐÚNG MỘT hạng hình dạng — không nửa vời).
//   U-GOVSELF-OUT `entry_out.governance_ref != own_hash`. ĐÂY LÀ NỬA CÒN LẠI của
//             S-GOVSELF: đợt trước chỉ chặn ở datum VÀO và ở cửa nộp, còn datum RA chỉ bị
//             `mutable_fields_valid` ép ĐỘ DÀI 28 — mà `own_hash` dài đúng 28. Hệ quả đã
//             dựng lại bằng thực thi (PoC `poc_new_a1` PASS trước bản vá): authority ký +
//             platform cho đồng thuận MỘT LẦN là ghi được `entry_out.governance_ref =
//             own_hash`; tx đó ĐƯỢC NHẬN, và từ giây đó ô hồ sơ KHÔNG spend được bằng bất
//             kỳ đường nào (Update chết ở S-GOVSELF, Migrate cũng chết ở đúng dòng đó)
//             ⇒ beacon NFT + min-ADA khoá vĩnh viễn ⇒ phá thẳng PK5 "beacon sống suốt đời".
//   U-GOV2    ĐỔI `governance_ref` = BÀN GIAO HAI CHIỀU: đòi đồng thuận của CẢ ref cũ LẪN
//             ref mới. Chỉ đòi ref cũ thì bên đương nhiệm (hoặc authority cùng bên, xem
//             giả định v1 ở util.ak) chỉ định được một cổng quản trị mà KHÔNG AI chứng
//             minh được nó chạy ⇒ hồ sơ mất đường đồng thuận về sau. Không đổi ref thì
//             không đòi gì thêm.
//   U-SHAPE   KHÔNG đổi hạng: `shape_custodial(in) == shape_custodial(out)`. Chuyển
//             có-kho ↔ không-kho = đổi bản chất dịch vụ ⇒ phải đăng ký mới.
//   U-MINT-0  KHÔNG mint/burn (update không đụng beacon supply).
//   U-TERMINAL KHÔNG chi tiêu hồ sơ đã Retired qua đường Update.
//   U-VALUE   không rút bớt native asset / lovelace khỏi ô hồ sơ.
//   U-GOV     ĐỔI KHÔNG ĐẢO NGƯỢC ĐƯỢC ⇒ cần đồng thuận quản trị của chính platform:
//             (a) status → Retired, (b) đổi governance_ref / accepted_assets / cut_bps.
//
// ÉP (MigrateEntry — đưa hồ sơ sang registry validator mới):
//   M-SIG/M-GOV   authority ký VÀ platform đồng thuận (di trú = ra khỏi quyền tài phán
//                 của validator này, platform phải đồng ý).
//   M-DEST        new_registry_hash ĐÚNG 28 BYTE và ≠ own_hash; đúng 1 input ở own_hash;
//                 đúng 1 output ở Script(new_registry_hash). Ràng buộc 28 byte loại được
//                 rác ĐỘ DÀI SAI (`#"00"`, `#""`): `is_at_script` chỉ so bytes, nên thiếu
//                 nó thì beacon NFT + min-ADA bay tới một địa chỉ không thể là script.
//                 ⚠ ĐỌC ĐÚNG SỨC MẠNH: đây CHỈ là kiểm ĐỘ DÀI, KHÔNG phải "đích là một
//                 script hash THẬT". Kiểm bằng thực thi (PoC `newF` PASS): di trú tới
//                 `Script(beacon_policy)` — một script chỉ có `mint` + `else fail`, không
//                 có handler `spend` — vẫn được nhận, và hồ sơ ở đó KHÔNG BAO GIỜ tiêu
//                 được nữa. Validator KHÔNG thể tự đối chiếu hash đích với blueprint (nó
//                 không biết mã của script đích); việc đó thuộc QUY TRÌNH DUYỆT DI TRÚ —
//                 người duyệt phải so `new_registry_hash` với hash trong `plutus.json` của
//                 bản registry mới TRƯỚC khi ký, không có lớp mã nào thay được bước đó.
//   M-MINT-0      không mint/burn.  M-ID  6 field định danh bất biến.
//   M-STATUS      status KHÔNG đổi — nếu không, di trú thành đường Retire trá hình.
//   M-VER         new_spec_version > cũ, và datum out khai đúng new_spec_version.
//   M-GOVSELF-OUT `entry_out.governance_ref` ≠ new_registry_hash VÀ ≠ own_hash. Biến thể
//                 thứ hai của cùng lỗ U-GOVSELF-OUT (PoC `poc_new_b` PASS trước bản vá):
//                 ghi `governance_ref = new_registry_hash` thì hồ sơ brick NGAY khi tới
//                 registry mới, vì validator mới mang cùng ràng buộc S-GOVSELF. Vế
//                 `≠ own_hash` (PoC `poc_new_b2`) chặn chiều còn lại: trỏ cổng quản trị về
//                 registry CŨ không brick nhưng biến "đồng thuận" thành "có ai đó tiêu một
//                 ô hồ sơ bất kỳ ở registry cũ" — thủ tục rỗng.
//   M-MUT         field khả biến của datum ĐÍCH vẫn hợp lệ. LỖ ĐÃ CHẶN: thiếu dòng này,
//                 di trú ghi được `governance_ref = #""`, `cut_bps = 99999`,
//                 `accepted_assets = []` ⇒ ở registry MỚI không script nào có hash rỗng ⇒
//                 `governance_consented` không bao giờ thoả ⇒ hồ sơ VĨNH VIỄN không
//                 Retire được, không di trú tiếp được. Chính là "hồ sơ kẹt vĩnh viễn" mà
//                 nhánh Migrate sinh ra để vá — nhánh cứu tự tạo lại cái nó cứu.
//   M-GOV2        ĐỔI `governance_ref` KHI DI TRÚ = BÀN GIAO HAI CHIỀU, y hệt U-GOV2 ở
//                 nhánh Update. M-GOV chỉ đòi ref CŨ, M-ID không gồm `governance_ref`,
//                 M-MUT chỉ ép ĐỘ DÀI 28 ⇒ trước bản vá, di trú là cửa sau đi vòng qua
//                 đúng ràng buộc U-GOV2 vừa dựng: ghi `governance_ref` = 28 byte bất kỳ
//                 chưa ai chứng minh là script sống. Hồ sơ tới registry mới rồi thì
//                 KHÔNG Retire được, KHÔNG di trú tiếp được, KHÔNG đổi gov được — vì mọi
//                 đường đó đều đòi đồng thuận của chính cái ref chết ấy. Kiểm bằng thực
//                 thi: ca `migrate_gov_ref_change_ok` PASS trước bản vá chính là lỗ đó.
//                 Không đổi ref thì KHÔNG phát sinh nghĩa vụ nào thêm.
//   M-SHAPE       KHÔNG đổi hạng hình dạng (như U-SHAPE).
//   M-NFT         beacon NFT có ở cả input lẫn output.   M-VALUE  như U-VALUE.
//   KHÔNG ép U-TERMINAL: hồ sơ Retired PHẢI di trú được — đó chính là lỗ đang vá
//   (trước v2, xoay quyền đăng ký làm hồ sơ Retired kẹt vĩnh viễn, phá cam kết
//   "beacon sống suốt đời, dấu vết kiểm toán không đứt").
//
// ⚠ GIẢ ĐỊNH LOAD-BEARING (chốt: KHÔNG vá bằng mã ở v2): MẤT KHOÁ AUTHORITY ⇒ TOÀN SỔ
// ĐÔNG CỨNG. U-SIG và M-SIG đều đòi ĐÚNG `registry_authority` được nướng vào tham số, kể
// cả nhánh cứu MigrateEntry (M-SIG đòi authority CŨ). Mất khoá là không hồ sơ nào cập
// nhật hay di trú được nữa. Đường đóng đúng là chuyển `registry_authority` sang một
// script nhiều chữ ký / DAO, KHÔNG phải thêm luật ở đây.
//
// ⚠ HỒI TỐ HAI TẦNG NGƯỢC NHAU (nói ra để đợt sau không quên): đổi TRƯỜNG trong datum
// thì hồi tố được nhưng tốn một chữ ký cho mỗi hồ sơ; đổi THAM SỐ validator thì đổi
// script hash, tức KHÔNG hồi tố — phải di trú từng hồ sơ. Hôm nay chưa có hồ sơ nào
// trên chuỗi nên chưa phải trả giá.
//
// else fail — KHÔNG xóa entry (retire = status, không spend-burn).

use aiken/collection/list
use aiken/primitive/bytearray
use cardano/assets
use cardano/transaction.{InlineDatum, OutputReference, Transaction}
use magiclamp/registry/platform.{Active, MigrateEntry, Paused, PlatformEntry,
  RegistryRedeemer, Retired, UpdateEntry}
use magiclamp/registry/util

/// registry parameterized CHỈ bởi registry_authority (v2 — bỏ beacon_policy).
validator registry(registry_authority: ByteArray) {
  spend(
    datum_opt : Option<PlatformEntry>,
    redeemer  : RegistryRedeemer,
    own_ref   : OutputReference,
    tx        : Transaction,
  ) {
    expect Some(entry_in) = datum_opt
    let own_addr = util.own_address(own_ref, tx.inputs)
    let own_hash = util.own_script_hash(own_addr)
    // beacon_policy nay lấy TỪ DATUM (không còn là tham số validator).
    let beacon_policy = entry_in.beacon_policy

    // S-GOVSELF: cổng đồng thuận KHÔNG được tự thoả. Ô hồ sơ đang chi tiêu luôn nằm ở
    // Script(own_hash) ⇒ nếu governance_ref == own_hash thì governance_consented là hằng
    // True vĩnh viễn và mọi rào "hai bên" biến mất. Áp cho CẢ HAI nhánh.
    expect entry_in.governance_ref != own_hash

    when redeemer is {
      UpdateEntry -> {
        // U-MINT-0: không mint/burn.
        expect assets.is_zero(tx.mint)

        // U-SINGLE: đúng 1 entry input + 1 output theo SCRIPT HASH.
        expect util.count_inputs_at_script(tx.inputs, own_hash) == 1
        expect util.count_outputs_at_script(tx.outputs, own_hash) == 1
        let reg_in = util.input_at_script(tx.inputs, own_hash)
        let reg_out = util.output_at_script(tx.outputs, own_hash)

        // U-ADDR: ô hồ sơ ra phải ở địa chỉ ENTERPRISE của chính registry. U-SINGLE ngay
        // trên kia đếm theo payment hash (cố ý — xem util.ak), nên nó một mình cho phép
        // dời hồ sơ sang biến thể stake CÙNG payment hash. Hồ sơ đó vẫn hợp lệ, vẫn mang
        // beacon NFT, và TÀNG HÌNH với `utxosAt(<địa chỉ enterprise>)` mà off-chain dựng
        // (`scripts/config.ts:124`). Hai dòng cộng lại ghim địa chỉ ô ra về DUY NHẤT.
        expect util.has_no_stake_part(reg_out.address)

        expect InlineDatum(od) = reg_out.datum
        expect entry_out: PlatformEntry = od

        // U-TERMINAL: Retired là trạng thái CUỐI của đường Update — không revive.
        // (Di trú vẫn được: xem nhánh MigrateEntry.)
        expect entry_in.status != Retired

        // U-ID: identity bất biến (6 field).
        expect platform.identity_preserved(entry_in, entry_out)
        // U-VER: spec_version KHÔNG đổi ở đường Update.
        expect entry_out.spec_version == entry_in.spec_version
        // U-MUT: field khả biến hợp lệ (gov 28 byte + đúng một hạng hình dạng).
        expect platform.mutable_fields_valid(entry_out)
        // U-GOVSELF-OUT: nửa còn lại của S-GOVSELF. `mutable_fields_valid` chỉ ép ĐỘ DÀI
        // 28, mà own_hash dài đúng 28 ⇒ thiếu dòng này thì một tx hợp lệ (authority ký +
        // platform đồng thuận một lần) ghi được `governance_ref = own_hash` và ô hồ sơ
        // KHOÁ VĨNH VIỄN — không đường Update nào, không đường Migrate nào (cả hai chết ở
        // S-GOVSELF trên datum VÀO).
        expect entry_out.governance_ref != own_hash
        // U-SHAPE: không đổi hạng có-kho ↔ không-kho.
        expect platform.shape_custodial(entry_in) == platform.shape_custodial(entry_out)

        // U-NFT: beacon NFT bảo toàn ở in & out (entry "thật" mang NFT).
        expect platform.has_one_nft(reg_in.value, beacon_policy, entry_in.platform_id)
        expect platform.has_one_nft(reg_out.value, beacon_policy, entry_out.platform_id)

        // U-VALUE: không rút bớt khỏi ô hồ sơ.
        expect util.value_not_drained(reg_in.value, reg_out.value)

        // U-REVIVE: hồi sinh THUẦN TUÝ = Paused → Active và MỌI trường khác y hệt.
        // Ép chặt từng trường khả biến, không chỉ identity: lỏng một trường là platform
        // tự mở lại KÈM đổi cut_bps/governance_ref, đi vòng qua U-GOV.
        let pure_revive =
          entry_in.status == Paused && entry_out.status == Active && entry_out.spec_version == entry_in.spec_version && entry_out.governance_ref == entry_in.governance_ref && entry_out.accepted_assets == entry_in.accepted_assets && entry_out.cut_bps == entry_in.cut_bps

        // U-SIG: authority ký. NGOẠI LỆ DUY NHẤT — hồi sinh thuần tuý cũng chấp nhận
        // đồng thuận quản trị của chính platform, để authority không biến `Paused` thành
        // "gỡ vĩnh viễn" bằng cách đơn giản là không bao giờ ký lại.
        expect or {
            list.has(tx.extra_signatories, registry_authority),
            pure_revive && util.governance_consented(
              tx,
              entry_in.governance_ref,
            ),
          }

        // U-GOV: việc KHÔNG đảo ngược được đòi đồng thuận quản trị của chính platform.
        // Dùng governance_ref CŨ (bên đương nhiệm phải đồng ý cả khi bị thay).
        let needs_consent =
          entry_out.status == Retired || platform.governed_fields_changed(
            entry_in,
            entry_out,
          )
        expect or {
            !needs_consent,
            util.governance_consented(tx, entry_in.governance_ref),
          }

        // U-GOV2: ĐỔI governance_ref = BÀN GIAO HAI CHIỀU. Ref cũ đã bị U-GOV đòi (đổi
        // governance_ref nằm trong `governed_fields_changed`); dòng này đòi thêm ref MỚI
        // phải CHẠY ĐƯỢC ngay trong tx bàn giao. Không có nó, "đồng thuận quản trị" của
        // mọi việc SAU đó treo vào một hash chưa ai chứng minh là script sống — ép 28 byte
        // là guard cú pháp, không phải bằng chứng tồn tại (PoC `newC4` PASS trước bản vá).
        expect or {
            entry_out.governance_ref == entry_in.governance_ref,
            util.governance_consented(tx, entry_out.governance_ref),
          }

        True
      }

      MigrateEntry { new_registry_hash, new_spec_version } -> {
        // M-MINT-0: không mint/burn.
        expect assets.is_zero(tx.mint)

        // M-SIG: authority ký.
        expect list.has(tx.extra_signatories, registry_authority)

        // M-GOV: platform đồng thuận (di trú đưa hồ sơ ra khỏi quyền tài phán này).
        expect util.governance_consented(tx, entry_in.governance_ref)

        // M-DEST: đích phải là một SCRIPT HASH THẬT (đúng 28 byte) và KHÁC chính mình;
        // đúng 1 input ở đây; đúng 1 output ở đích. Thiếu ràng buộc 28 byte thì di trú
        // tới #"00" là "hợp lệ" ⇒ beacon NFT bay vào địa chỉ không thể tồn tại.
        expect bytearray.length(new_registry_hash) == platform.script_hash_len
        expect new_registry_hash != own_hash
        expect util.count_inputs_at_script(tx.inputs, own_hash) == 1
        expect util.count_outputs_at_script(tx.outputs, new_registry_hash) == 1
        let reg_in = util.input_at_script(tx.inputs, own_hash)
        let reg_out = util.output_at_script(tx.outputs, new_registry_hash)

        // M-ADDR: cùng lỗ với U-ADDR, ở đường di trú. Đây là chỗ nó ĐẮT hơn: hồ sơ vừa
        // rời quyền tài phán này, nên nếu nó hạ cánh ở biến thể stake của registry mới
        // thì bên tiếp nhận quét địa chỉ enterprise sẽ thấy MỘT SỔ TRỐNG, và không đường
        // nào ở đây gọi nó về được nữa.
        expect util.has_no_stake_part(reg_out.address)

        expect InlineDatum(od) = reg_out.datum
        expect entry_out: PlatformEntry = od

        // M-ID: identity bất biến (6 field).
        expect platform.identity_preserved(entry_in, entry_out)
        // M-STATUS: di trú KHÔNG đổi trạng thái (chống Retire trá hình).
        expect entry_out.status == entry_in.status
        // M-VER: chỉ TIẾN, và datum out khai đúng phiên bản đã tuyên trong redeemer.
        expect new_spec_version > entry_in.spec_version
        expect entry_out.spec_version == new_spec_version
        // M-MUT: datum ĐÍCH vẫn hợp lệ. Thiếu dòng này, nhánh cứu tự ghi ra hồ sơ khoá
        // chết (gov rỗng / cut_bps ngoài dải / accepted rỗng) ở registry mới.
        expect platform.mutable_fields_valid(entry_out)
        // M-GOVSELF-OUT: cùng lỗ với U-GOVSELF-OUT, hai biến thể.
        //  · == new_registry_hash ⇒ hồ sơ BRICK NGAY khi tới registry mới (validator mới
        //    mang cùng ràng buộc S-GOVSELF trên datum VÀO).
        //  · == own_hash ⇒ không brick, nhưng cổng đồng thuận về sau chỉ còn nghĩa "có ai
        //    đó tiêu một ô hồ sơ bất kỳ ở registry CŨ" — thủ tục rỗng.
        expect entry_out.governance_ref != new_registry_hash
        expect entry_out.governance_ref != own_hash
        // M-GOV2: ĐỔI governance_ref khi di trú = BÀN GIAO HAI CHIỀU (cùng luật với
        // U-GOV2). M-GOV trên kia đã đòi ref CŨ; dòng này đòi thêm ref MỚI phải CHẠY ĐƯỢC
        // ngay trong tx di trú. Thiếu nó, Migrate là cửa sau đi vòng qua U-GOV2: cùng một
        // việc "trỏ hồ sơ vào một cổng quản trị chưa ai chứng minh sống", chỉ khác cửa vào.
        expect or {
            entry_out.governance_ref == entry_in.governance_ref,
            util.governance_consented(tx, entry_out.governance_ref),
          }
        // M-SHAPE: không đổi hạng có-kho ↔ không-kho.
        expect platform.shape_custodial(entry_in) == platform.shape_custodial(entry_out)

        // M-NFT: beacon NFT có ở cả input lẫn output.
        expect platform.has_one_nft(reg_in.value, beacon_policy, entry_in.platform_id)
        expect platform.has_one_nft(reg_out.value, beacon_policy, entry_out.platform_id)

        // M-VALUE: không rút bớt khỏi ô hồ sơ.
        expect util.value_not_drained(reg_in.value, reg_out.value)

        True
      }
    }
  }

  else(_) {
    fail
  }
}
