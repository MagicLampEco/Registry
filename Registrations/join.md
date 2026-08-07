<!-- Hồ sơ đăng ký dịch vụ Join. Phần khai báo do Join agent (đội sở hữu) điền 2026-08-02.
     Registry ánh xạ sang khung _TEMPLATE.md ngày 2026-08-04, giữ nguyên nội dung khai và mọi
     con trỏ. Ô nào đội chưa khai thì ghi rõ CHƯA KHAI — Registry không điền hộ. -->

# Hồ sơ đăng ký — Join (Kết đèn)

| | |
|---|---|
| **Trạng thái hồ sơ** | Chờ rà |
| **Ngày nộp** | 2026-08-02 |
| **Ngày cập nhật gần nhất** | 2026-08-04 |

## (a) Nhận dạng dịch vụ

| Trường | Giá trị |
|---|---|
| Tên gọi trong hệ | Join (Kết đèn) |
| `platform_id` đề nghị | `join` |
| Repo / mã nguồn | `LampNetCloud/Join` — contract tích hợp: `Join/Join-Integration.md` |
| Đội hoặc người chịu trách nhiệm | Join agent (module `LampNetCloud/Join`) |
| Đầu mối liên hệ | **CHƯA KHAI** — Join bổ sung (tiêu chí duyệt §5.4 đòi mục này) |
| Dịch vụ làm gì (một câu) | Onboarding thiết bị và đo tài nguyên cho hệ LampNet |

Đặc tả của dịch vụ: `Join/Join-Feat.md`, `Join/Join-Tech.md`, `Join/Join-Math.md`, `Join/LDC-Community.md`.

## (b) Khai báo tuân thủ bốn điều kiện

> Chuẩn: [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) §2.

| Điều kiện | Đã đạt? | Con trỏ kiểm được |
|---|---|---|
| **2.1** Người dùng định danh bằng PhoenixKey DID, một người một DID, dịch vụ không giữ khoá riêng của người dùng | **Một phần** | Tuyên bố `Join/Join-Feat.md:9` ("Join KHÔNG định nghĩa identity, kế thừa PhoenixKey DID"); seam `resolvePersonDid()` `SuperApp/src/modules/join/joinService.ts:213`. **Hở đã biết:** daemon join LampNet hiện nhận `subject_did` là chuỗi thô, **chưa resolve/ép `did:phoenix`** (`lampnet-hivemind/lampnet-join/src/join.rs:45,216`; test dùng `did:cardano:…demo`) |
| **2.2** Dùng chung LAMP · MAGIC · CARP; không đốt LAMP; không tạo đường-ra cho MAGIC; token/CARP biến thể (nếu có) đã qua đúng cổng | **Đạt** | `Join/Join-Feat.md:57` — Join chỉ phát `PoUWEvidence{node_did, period, evidence_cid}`; không mint, không giữ token. Đơn vị thưởng đóng góp tài nguyên là **CARP** ở lớp settlement MagicLamp (`_shared/CARP-Reward-Payout.md:5`), không phải token do Join phát hành |
| **2.3** Phí chảy vào Treasury custody instance on-chain của chính dịch vụ, không phải sổ nội bộ | **Chưa** | Join chưa có kho on-chain — xem mục (c). Sổ đóng góp mỗi epoch hiện chỉ nằm trong bộ nhớ tiến trình |
| **2.4** Chức năng cốt lõi không đặt trên hạ tầng đóng ngoài hệ | **Chưa đạt — có phụ thuộc, đội tự khai** | Join khai 2026-08-05, bảng chi tiết ngay dưới |

Phần chưa đạt — ghi rõ còn thiếu gì và mốc dự kiến:

- **2.1** — nối resolve `did:phoenix` + verify auth proof ở daemon join. Thư chốt chặn đã gửi LampNet và
  Phoenix ngày 2026-08-02. **Đính chính 2026-08-05 (Join chuyển tiếp dữ kiện Phoenix agent 2026-08-04):**
  mức bảo đảm của `did:phoenix` thấp hơn một bậc so với ghi nhận cũ — **cả mức thiết bị cũng chưa ép**,
  một máy tạo được không giới hạn DID bằng script thuần (`DidPhoenixGenerator.java:116-135`,
  `IdentityServiceImpl.java:98`, `CardanoServiceImpl.java:77-81`, 0 kết quả grep attestation).
  Join cần biết điều này khi đặt mốc: nối `did:phoenix` xong **cũng chưa** cho ra tính duy nhất người.
- **2.4 — bảng khai của đội (Join agent, 2026-08-05):** khai **CÓ phụ thuộc, một phần**.

  | Thành phần đóng / ngoài hệ | Chức năng cốt lõi nào phụ thuộc | Thay thế được không |
  |---|---|---|
  | Cloudflare (DNS + TLS cho `*.lampnet.cloud`) | Mọi lời gọi API của ứng dụng | Được — đổi nhà cung cấp DNS, chi phí thấp |
  | Một máy chủ vật lý duy nhất `42.118.191.153` | Toàn bộ đường `/v1/*` — **một điểm chết đơn** | Nguyên tắc được (thiết kế là phân tán); thực tế chưa có node thứ hai phục vụ đường này |
  | Apple App Store + Google Play | Đường phân phối duy nhất tới người dùng | **Không** |
  | Backend PhoenixKey (Java, đóng, repo riêng) | Danh tính `did:phoenix` | Chưa nối (đang dùng `did:cardano`) nên chưa tính là chặn; sẽ tính khi nối |

  **Cảnh báo do chính đội nêu, Registry giữ nguyên vì đúng tinh thần 2.4:** phụ thuộc cửa hàng ứng dụng
  không chỉ là chuyện phân phối. Chính sách Google Play cho phép dịch vụ dùng máy người dùng phục vụ bên
  thứ ba **chỉ khi đó là mục đích chính** của ứng dụng; với SuperApp thì đây là tính năng phụ. Tiền lệ
  Honeygain bị gỡ khỏi cả hai cửa hàng. ⟹ một bên ngoài hệ nắm **quyền phủ quyết đúng chức năng cốt lõi**
  của Join. **Mốc đạt:** dựng node thứ hai phục vụ `/v1/*` (gỡ điểm chết đơn) + có đường phân phối không
  qua cửa hàng cho phần đóng góp tài nguyên.
- **2.3** — lập Treasury custody instance; khi lập sẽ khai `governance_ref` ở mục (c).
- **§7 của chuẩn — điểm Join khai thẳng, quan trọng nhất:** bằng chứng đóng góp **hiện chưa neo on-chain**.
  Đường thưởng đang sống là V1 tự khai: `POST /v1/reward/epoch` nhận `contributions[]` tự khai, chỉ verify
  chữ ký người gọi, **không đối chiếu `node_id` với danh tính** (`lampnet-hivemind` `lampnet-node.rs:4982,5170`);
  lease đóng góp không bind DID (`mobile_settle.rs:198-222`). Luồng góp lưu trữ chưa xây
  (`LeaseKind::StorageReplica` = `NotImplemented`, `contribute.rs:186`); Vault VSS Feldman mới là thư viện
  trong bộ nhớ, chưa nối Mirage (`Vault/src/lifecycle.rs:166-186`, PSS còn là mục cần làm).
  ⟹ Số đóng góp của Join **chưa đủ tư cách** cấp uy tín hay quyền biểu quyết ở tầng hệ.
  **Mốc đạt:** nối V2 reward (bắt buộc chứng minh lưu trữ + trần chống Sybil, `_shared/CARP-Reward-Payout.md:17`
  — đã có mã, chưa ai gọi) + ép `did:phoenix` vào `node_id` + neo biên nhận on-chain.

## (c) Tham số kỹ thuật

> Ý nghĩa từng trường: [`../Specs/CONTRACT.md`](../Specs/CONTRACT.md) §2.

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `instance_id` | **chưa thiết lập** | Join chưa có instance kho on-chain |
| `custody_hash` | **chưa thiết lập** | chưa có Treasury custody instance |
| `seed_policy` | **chưa thiết lập** | chờ mô hình vault phân tán lên; hiện chưa có lưu trữ mảnh |
| `governance_ref` | **chưa thiết lập** | chờ lập kho |
| `accepted_assets` | **chưa thu asset ở Join** | thưởng trả bằng CARP ở settlement MagicLamp (`_shared/CARP-Reward-Payout.md`) |
| `cut_bps` | **chưa thiết lập** | không cắt phí ở tầng Join |
| Bucket kế toán | sổ đóng góp mỗi epoch, hiện trong bộ nhớ | mốc đưa on-chain = V2 |
| `genesis_ref` | **chưa thiết lập** | |
| `created_epoch` | **chưa thiết lập** | chưa tạo beacon on-chain |

> Tóm: Join đang ở **giai đoạn tiền-on-chain**. Định danh và ý đồ đã rõ; phần kho và định danh on-chain
> chưa lập. Hồ sơ đăng ký **hiện trạng thật**, cập nhật khi V2 và kho lên.

## (d) Cam kết vận hành

| Câu hỏi | Trả lời |
|---|---|
| Ai giữ quyền quản trị kho? Bao nhiêu chữ ký? | Chưa có kho nên chưa áp dụng. Khi lập sẽ khai rõ `governance_ref`; không theo mô hình trọng số token, bám mô hình quản trị cá nhân của hệ |
| Khoá quản trị bị lộ thì xử lý thế nào? | Hướng tới vault phân tán k-of-n (Feldman VSS): mảnh rải trên thiết bị người dùng, lộ một mảnh không lộ hạt giống. Cơ chế tái phân tán chủ động khi mảnh rời mạng **chưa hiện thực** (`Vault/src/lifecycle.rs:166-186`) — đây là chốt chặn đã ghi |
| Dừng hoặc tạm dừng dịch vụ thì thông báo ra sao? | Cập nhật `status` và thông báo qua kênh cộng đồng LDC (`Join/LDC-Community.md`) trước khi dừng. Lưu ý `status` chỉ là nhãn niêm yết (PK10), không khoá dòng tiền ở kho |
| Ai tiếp nhận nếu đội hiện tại ngừng duy trì? | **Đội khai `LampNetCloud/lampnet-hivemind` (LampNet core); Registry ghi nhận nhưng CHƯA KHOÁ** — mục này ràng một repo khác nhận nghĩa vụ kế nhiệm nên phải có xác nhận của chủ sở hữu repo đó, không đóng bằng lời khai một phía. Lý lẽ của đội: Join là lớp tiêu thụ interface, không có backend riêng; mọi năng lực nền (Mirage lưu trữ, điều phối, quyết toán) đã ở `lampnet-hivemind`. Củng cố thêm bằng quyết định 2026-08-05: bộ 4 đặc tả hạ tầng L1 rời repo Join về LampNet |

## Nhật ký rà soát

| Ngày | Việc | Kết quả |
|---|---|---|
| 2026-08-02 | Join agent nộp hồ sơ, soạn theo khung nêu trong thư mời (chuẩn chính thức khi đó chưa có trên remote) | Tiếp nhận |
| 2026-08-04 | Registry ánh xạ sang khung `_TEMPLATE.md`, giữ nguyên lời khai và con trỏ; đổi `platform_id` `joinnet` → `join` theo quyết định đổi tên | Còn thiếu: điều kiện **2.4**, **đầu mối liên hệ**, **người tiếp nhận khi đội ngừng**. Ba mục này chỉ đội Join khai được |
| 2026-08-07 | Chép nguyên văn lời khai của Join agent (thư 2026-08-05) vào ba ô còn trống; hạ mức bảo đảm `did:phoenix` xuống đúng mức đo được | **2.4** khai xong (chưa đạt, có phụ thuộc). **Người tiếp nhận** ghi nhận `lampnet-hivemind`, chưa khoá — chờ chủ sở hữu repo đó xác nhận. **Đầu mối liên hệ** vẫn CHƯA KHAI — Registry không điền hộ từ dữ kiện kỹ thuật (`DucTiger`/`AladinContract` là hiện trạng repo, không phải lời khai) |
