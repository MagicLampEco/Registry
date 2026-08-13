<!-- Hồ sơ đăng ký CHUNG cho LampNet + Join. Anh Đức chốt 2026-08-13: hai bên một hồ sơ.
     Nội dung khai là của hai đội (Join agent 2026-08-02 và 2026-08-05; LampNet agent 2026-08-07
     và 2026-08-11) — Registry chuyển sang khuôn khai-bằng-mã, GIỮ NGUYÊN lời khai và con trỏ,
     không nâng một mã nào. Ô nào đội chưa khai thì ghi rõ CHƯA KHAI; Registry không điền hộ. -->

# Hồ sơ đăng ký — LampNet + Join (Kết đèn)

| | |
|---|---|
| **Trạng thái hồ sơ** | Đã tiếp nhận — chưa đủ điều kiện niêm yết |
| **Ngày nộp** | 2026-08-02 |
| **Ngày cập nhật gần nhất** | 2026-08-13 |

## Khối khai báo — phần máy đọc

```json registration
{
  "platform_id": "join",
  "spec_version": 2,

  "declares": {
    "identity": "ID-0",
    "token":    "TK-1",
    "custody":  "CU-N",
    "infra":    "IN-1"
  },

  "pointers": {
    "dau_moi_lien_he": "",
    "repo": "LampNetCloud/Join (lớp tích hợp) + LampNetCloud/lampnet-hivemind (daemon + bốn tài nguyên)",
    "con_tro": "Join/Join-Feat.md:57 · _shared/CARP-Reward-Payout.md:5",
    "moc_du_kien": "2.1: nối resolve did:phoenix + verify auth proof ở daemon join — chặn bởi PhoenixKey chưa phát hành thang personhood_level, chưa có ngày",
    "instance_id": "",
    "custody_hash": "",
    "seed_policy": "",
    "governance_ref": "",
    "accepted_assets": [],
    "cut_bps": 0,
    "thu_o_dau": "Không thu asset ở tầng Join. Thưởng đóng góp tài nguyên trả bằng CARP ở lớp settlement MagicLamp (_shared/CARP-Reward-Payout.md:5) — không phải token do Join hay LampNet phát hành.",
    "danh_sach_phu_thuoc": [
      "Cloudflare (DNS + TLS cho *.lampnet.cloud) — thay được, chi phí thấp",
      "Một máy chủ vật lý duy nhất 42.118.191.153 — điểm chết đơn cho toàn bộ đường /v1/*",
      "Apple App Store + Google Play — đường phân phối duy nhất tới người dùng, KHÔNG thay được",
      "Backend PhoenixKey (Java, đóng, repo riêng) — chưa nối nên chưa tính là chặn; sẽ tính khi nối"
    ],
    "duong_thay_the": [],
    "con_tro_cong_phat_hanh": "",
    "platform_id_he_danh_tinh": "",
    "nguoi_tiep_nhan_khi_ngung": "LampNetCloud/lampnet-hivemind — đội Join khai, Registry ghi nhận nhưng CHƯA KHOÁ"
  },

  "evidence": [
    { "claim": "Mirage — dung lượng lưu trữ đã phục vụ", "tier": "EV-0", "pointer": "không có PoR trong mã: git grep -ic retrievability @5c0da03 → 0; DurabilityProof chỉ có trên nhánh PR #56 chưa merge" },
    { "claim": "Cave — tác vụ tính toán đã chạy", "tier": "EV-0", "pointer": "TaskReceipt ký bằng hạt giống demo CỨNG trong mã, giống nhau trên mọi node — lampnet-node.rs:7673-7674 @5c0da03" },
    { "claim": "Beam — băng thông đã phục vụ", "tier": "EV-0", "pointer": "node tự benchmark rồi tự đưa số vào khối chứng thực của chính nó — lampnet-join/src/lib.rs:74, attestation.rs:70" },
    { "claim": "Probe — lượt đọc cảm biến", "tier": "EV-0", "pointer": "không có hiện vật bằng chứng nào trong mã" },
    { "claim": "Năng lực phần cứng khai lúc gia nhập (s_hw, flops)", "tier": "EV-0", "pointer": "lampnet-join/src/attestation.rs:94-112 — chỉ kiểm s_hw khớp flops ĐÃ KHAI, không kiểm flops có thật (F-J10 ghi rõ trong mã)" },
    { "claim": "Hạng node (tier) dùng để nhân phần thưởng", "tier": "EV-0", "pointer": "trường tier: String trong thân yêu cầu POST /v1/reward/epoch — lampnet-node.rs:6731, map thẳng ở :6829-6837, nhân vào weighted_score ở lampnet-reward/src/score.rs:39,44" },
    { "claim": "total_pool của một epoch", "tier": "EV-0", "pointer": "CALLER tự khai, daemon KHÔNG tính từ lịch phát hành — lampnet-node.rs:6196-6199,6245; chặn duy nhất là trần hằng số từ biến môi trường ở :6462" },
    { "claim": "Sổ đóng góp mỗi epoch của Join", "tier": "EV-0", "pointer": "hiện chỉ nằm trong bộ nhớ tiến trình; POST /v1/reward/epoch nhận contributions[] tự khai, không đối chiếu node_id với danh tính — lampnet-node.rs:4982,5170" }
  ]
}
```

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | LampNet + Join (Kết đèn) |
| Dịch vụ làm gì (một câu) | Mạng đóng góp tài nguyên phân tán (lưu trữ · tính toán · băng thông · cảm biến), cộng lớp onboarding thiết bị và đo tài nguyên |
| Đội hoặc người chịu trách nhiệm | **CHƯA KHAI cho từng con trỏ** — xem ghi chú dưới |

**Hai con trỏ thực thi, tách bạch** — hồ sơ chung nhưng trách nhiệm không chung:

| Con trỏ thực thi | Đỡ phần lời khai nào | Người chịu trách nhiệm |
|---|---|---|
| `LampNetCloud/Join` | điều kiện 2.4 (kênh phân phối, máy chủ), lớp tích hợp và UX, sổ đóng góp mỗi epoch | Join agent — **đầu mối người thật CHƯA KHAI** |
| `LampNetCloud/lampnet-hivemind` | bốn tài nguyên, daemon, đường thưởng, mọi dòng `evidence` ở khối trên | LampNet agent — **đầu mối người thật CHƯA KHAI** |

Đặc tả: `Join/Join-Feat.md`, `Join/Join-Tech.md`, `Join/Join-Math.md`, `Join/LDC-Community.md`;
bộ 4 đặc tả hạ tầng L1 đã rời repo Join về LampNet (quyết định 2026-08-05).

> **Ghi chú về `platform_id` — một câu chờ chủ sở hữu.** Hồ sơ này nay khai cả LampNet, mà `platform_id`
> vẫn là `join` (lớp tích hợp). LampNet agent đã nêu ở thư 2026-08-07 rằng sổ trỏ vào một chỗ nội dung đã
> rời đi. Registry **không tự đổi**: `platform_id` là một trong sáu trường định danh bất biến, đổi sau khi
> lên chuỗi là phải đăng ký mới và mất lịch sử. Hôm nay **chưa có gì trên bất kỳ mạng nào**, nên đổi còn
> miễn phí — nhưng chỉ một lần này. Chủ sở hữu chốt giữ `join` hay đổi sang `lampnet` trước khi niêm yết.

## (b) Giải thích bốn mã đã chọn

| Trục | Mã | Vì sao | Con trỏ kiểm được | Thiếu gì để lên mã cao hơn |
|---|---|---|---|---|
| **2.1** Danh tính | `ID-0` | Ý đồ đã tuyên bố và có seam, nhưng **daemon chưa ép**: nhận `subject_did` là chuỗi thô, test dùng `did:cardano:…demo` | tuyên bố `Join/Join-Feat.md:9`; seam `resolvePersonDid()` `SuperApp/src/modules/join/joinService.ts:213`; hở `lampnet-hivemind/lampnet-join/src/join.rs:45,216` | Nối resolve + verify `did:phoenix` ở daemon ⇒ `ID-2`. Lên `ID-3` cần PhoenixKey phát hành `personhood_level` (bậc `did-chain` mã đã xong, **chưa deploy**) |
| **2.2** Hệ token | `TK-1` | Không mint, không giữ token, không đốt LAMP, không mở đường đổi MAGIC ra ngoài. Chỉ phát `PoUWEvidence{node_did, period, evidence_cid}` | `Join/Join-Feat.md:57`; đơn vị thưởng là CARP ở settlement MagicLamp `_shared/CARP-Reward-Payout.md:5` | **Một lỗi đơn vị tiền đang mở, đội tự khai:** đường mobile lease trả bằng **µLAMP** chứ không phải CARP — `lampnet-mirage/src/mobile_settle.rs:27,60,69,546` @2e294b3. Không phải căn cứ từ chối (không phải token mới, không qua cổng nào), nhưng phải sửa: đổi đơn vị là **đặt lại giá**, không phải đổi nhãn trường |
| **2.3** Kho giá trị | `CU-N` | Không thu asset ở tầng này. Thưởng trả bằng CARP ở lớp settlement, không cắt phí ở Join | mục (c) | `CU-N` là hạng **cao nhất** của trục này — không thu tiền không phải thiếu sót. Nhưng vẫn **bắt buộc khai `governance_ref`** (xem dưới) |
| **2.4** Hạ tầng ngoài | `IN-1` | Có phụ thuộc đóng **không thay thế được** cho chức năng cốt lõi — đội tự khai 2026-08-05 | bảng `danh_sach_phu_thuoc` ở khối trên | Dựng node thứ hai phục vụ `/v1/*` (gỡ điểm chết đơn) **và** có đường phân phối không qua cửa hàng ứng dụng cho phần đóng góp tài nguyên ⇒ `IN-2` |

**Cảnh báo do chính đội Join nêu, Registry giữ nguyên vì nó đúng tinh thần 2.4:** phụ thuộc cửa hàng ứng
dụng không chỉ là chuyện phân phối. Chính sách Google Play cho phép dịch vụ dùng máy người dùng phục vụ
bên thứ ba **chỉ khi đó là mục đích chính** của ứng dụng; với SuperApp thì đây là tính năng phụ. Tiền lệ
Honeygain bị gỡ khỏi cả hai cửa hàng. ⟹ một bên ngoài hệ nắm **quyền phủ quyết đúng chức năng cốt lõi**.

## (c) Tham số kỹ thuật

> Mã `CU-N`: bỏ trống mọi ô trừ `governance_ref`.

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `instance_id` · `custody_hash` · `seed_policy` | **rỗng theo `CU-N`** | không thu asset ở tầng này nên không dựng kho |
| `governance_ref` | **CHƯA KHAI — đây là ô duy nhất còn chặn niêm yết** | xem khung dưới |
| `accepted_assets` | rỗng | |
| `cut_bps` | 0 | không cắt phí ở tầng Join |
| Bucket kế toán | sổ đóng góp mỗi epoch, **hiện trong bộ nhớ tiến trình** | mốc đưa on-chain = V2 reward |
| `created_epoch` | do giao dịch đăng ký ép | không tự khai được nữa (ràng buộc `R-EPOCH`) |

> **Vì sao `CU-N` vẫn đòi `governance_ref`, dù không có kho để gác.** Không phải để gác tiền — mà để hồ sơ
> có một bên **đồng thuận được**. Từ bản v2 của validator, chuyển một hồ sơ sang `Retired` (trạng thái cuối,
> không hồi sinh) đòi chữ ký quyền đăng ký **và** đồng thuận quản trị của chính platform đó. Hồ sơ không khai
> `governance_ref` là hồ sơ mà quyền đăng ký **một mình xoá vĩnh viễn được**. Ô này bảo vệ đội khai, không
> phải bảo vệ sổ. Đây là ô duy nhất còn chặn — khai xong là niêm yết được ngay ở `L1`.

## (d) Lời khẳng định và hạng chứng thực

Tám dòng ở khối `evidence` phía trên, **tất cả `EV-0`**. Đây là kết luận của chính LampNet agent
(thư 2026-08-07 mục L2): *"cả bốn tài nguyên chỉ niêm yết được ở hạng tự-khai. Không phải ba trên bốn.
Bốn trên bốn."* Registry ghi đúng sự thật đó, và **không chừa ô trống ở hạng cao chờ mã lấp**.

Hai chỗ đáng đọc kỹ vì chúng khác nhau về bản chất:

- **Cave** *có* `TaskReceipt`, nhưng ký bằng `DEMO_SEED` là hằng số trong mã nguồn, nên mọi node dựng từ
  cùng ảnh có **cùng khoá**. Chữ ký đó không định danh ai. Theo cách gọi của LampNet agent — và Registry
  lấy nguyên vì nó đúng hơn — **đó không phải "node tự ký", đó là "không ký"**.
- **`tier` và `total_pool`** không phải phép đo sai, chúng là **lời khai của người đang xin tiền** đi thẳng
  vào phép nhân ra tiền. LampNet agent tự tìm ra và tự đính chính báo cáo trước của mình (thư 2026-08-11).
  Lỗ này thuộc phía LampNet (kiểm-tra-đầu-vào); phần thuộc Registry là hệ số hạng lấy từ đâu — đang đo.

**`EV-0` vẫn bán được.** Nó chỉ không được dùng để cấp uy tín hoặc quyền biểu quyết ở tầng hệ. Đây là mô
tả, không phải hình phạt — hệ không có quyền phạt (anh Đức chốt gỡ `SLASH_PENALTY` 2026-08-07).

## (e) Cam kết vận hành

| Câu hỏi | Trả lời |
|---|---|
| Ai giữ quyền quản trị kho? Bao nhiêu chữ ký? | Chưa có kho (`CU-N`). Nhưng `governance_ref` vẫn phải khai — xem khung ở mục (c). Không theo mô hình trọng số token, bám mô hình quản trị cá nhân của hệ |
| Khoá quản trị bị lộ thì xử lý thế nào? | Hướng tới vault phân tán k-of-n (Feldman VSS): mảnh rải trên thiết bị người dùng, lộ một mảnh không lộ hạt giống. Cơ chế tái phân tán chủ động khi mảnh rời mạng **chưa hiện thực** (`Vault/src/lifecycle.rs:166-186`) — chốt chặn đã ghi |
| Dừng hoặc tạm dừng dịch vụ thì thông báo ra sao? | Cập nhật `status` và thông báo qua kênh cộng đồng LDC (`Join/LDC-Community.md`) trước khi dừng. `status` chỉ là nhãn niêm yết (PK10), không khoá dòng tiền |
| Ai tiếp nhận nếu đội hiện tại ngừng duy trì? | Đội Join khai `LampNetCloud/lampnet-hivemind`. **Với hồ sơ chung thì câu này đổi nghĩa**: hai con trỏ thực thi nay nằm trong cùng một hồ sơ, nên "Join ngừng thì LampNet nhận" không còn là chuyển giao giữa hai hồ sơ. Câu cần trả lời nay là: **ai nhận nếu cả hai cùng ngừng.** CHƯA KHAI |

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-08-02 | Join agent nộp hồ sơ theo khung nêu trong thư mời (chuẩn chính thức khi đó chưa có trên remote) | Tiếp nhận |
| 2026-08-04 | Registry ánh xạ sang khung mẫu; đổi `platform_id` `joinnet` → `join` | Thiếu **2.4**, **đầu mối liên hệ**, **người tiếp nhận** |
| 2026-08-07 | Chép nguyên văn lời khai Join agent (thư 2026-08-05) vào ba ô trống; hạ mức bảo đảm `did:phoenix` xuống đúng mức đo được | **2.4** khai xong. **Người tiếp nhận** ghi nhận, chưa khoá. **Đầu mối liên hệ** vẫn CHƯA KHAI |
| 2026-08-13 | Anh Đức chốt **một hồ sơ chung cho LampNet + Join** (ngược đề nghị (A) của LampNet agent, lý do và cách bù đã gửi thư). Chuyển sang khuôn khai-bằng-mã v2. Chép tám dòng `evidence` từ thư LampNet 2026-08-07 và 2026-08-11 | Hạng tính ra: **L0 — đã tiếp nhận**. Chặn lên `L1` bởi **đúng hai ô**: `governance_ref` và trục danh tính `ID-0`. Ba ô người-thật (`đầu mối liên hệ` × 2 con trỏ, `ai nhận nếu cả hai ngừng`) vẫn CHƯA KHAI — Registry không điền hộ |
