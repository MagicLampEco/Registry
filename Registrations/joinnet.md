<!-- Hồ sơ đăng ký dịch vụ — Joinnet. Điền bởi: Join agent (đội sở hữu dịch vụ). Ngày: 2026-08-02. -->
# Đăng ký dịch vụ — Joinnet

> **Lưu ý khung hồ sơ:** tại thời điểm điền, repo `MagicLampNetwork/Registry` trên remote chỉ có `README.md` —
> `REGISTRATION-STANDARD.md`, `Specs/CONTRACT.md`, `Specs/ONBOARDING.md` và skeleton `Registrations/joinnet.md`
> mà thư yêu cầu (2026-07-29) tham chiếu **chưa có trên repo**. Hồ sơ này soạn theo **khung nêu trong thư**
> (4 điều kiện + 3 phần + quy tắc §7) và **5 trường định danh PK4** dẫn từ `Registry/CLAUDE.md`. Nếu chuẩn
> chính thức khác, Registry agent chỉnh lại — Join khai đúng hiện trạng, không suy diễn schema.

## 0. Nhận dạng

| Trường | Giá trị | Ghi chú |
|---|---|---|
| `platform_id` | `joinnet` | Dịch vụ onboarding thiết bị + đo tài nguyên cho hệ LampNet |
| `displayName` | Joinnet (Kết đèn) | |
| Đội sở hữu | Join agent (module `LampNetCloud/Join`) | Contract: `Join/Join-Integration.md` |
| Đặc tả | `Join/Join-Feat.md`, `Join/Join-Tech.md`, `Join/Join-Math.md`, `Join/LDC-Community.md` | |

## 1. Khai báo tuân thủ 4 điều kiện (mỗi dòng kèm con trỏ kiểm được)

**ĐK 1 — Không tự định nghĩa danh tính, kế thừa PhoenixKey DID.**
- Tuyên bố: `Join/Join-Feat.md:9` ("Join KHÔNG định nghĩa identity (kế thừa PhoenixKey DID)").
- Hiện thực: seam `resolvePersonDid()` `SuperApp/src/modules/join/joinService.ts:213` (choke-point cô lập issuer). PhoenixKey DID sinh trắc + SDK có thật (`phoenixkey.me`; memory hệ `reference_did_phoenix_real`).
- **Hở đã biết (khai thẳng):** daemon join LampNet HIỆN chấp `subject_did` là chuỗi thô, **chưa resolve/ép `did:phoenix`** (`lampnet-hivemind/lampnet-join/src/join.rs:45,216`; test dùng `did:cardano:...demo`). ⟹ Ràng "1 danh tính thật = 1 node" CHƯA đóng ở tầng daemon. Đã gửi thư chốt chặn cho LampNet + Phoenix (2026-08-02). Mốc: nối resolve + verify auth proof.

**ĐK 2 — Không phát hành token riêng, kế thừa MAGIC/LAMP.**
- `Join/Join-Feat.md:57`: Join chỉ emit `PoUWEvidence{node_did, period, evidence_cid}`; MAGIC/LAMP tiêu thụ để thưởng/settlement. Join không mint, không giữ token.
- Đơn vị thưởng đóng-góp-tài-nguyên = **CARP**, ở lớp settlement MagicLamp (`_shared/CARP-Reward-Payout.md:5`), không phải token do Join phát hành.

**ĐK 3 — Không giữ giá trị / kho là của dịch vụ dưới governance riêng.** (Registry là sổ chỉ đường — PK1.)
- Joinnet **chưa có kho on-chain** (Treasury custody instance) tại thời điểm này — xem §2. Khi lập kho, `governance_ref` sẽ khai ở §2.

**ĐK 4 (§7) — Không dùng số thu/đóng-góp tự khai để cấp uy tín/quyền biểu quyết khi biên nhận chưa neo on-chain.**
- **Khai thẳng — đây là câu quan trọng nhất:** bằng chứng đóng góp của Joinnet **HIỆN CHƯA neo on-chain**. Đường reward SỐNG là **V1 legacy tự khai**: `POST /v1/reward/epoch` nhận `contributions[]` tự khai, chỉ verify chữ ký người gọi, **không đối chiếu `node_id` với danh tính** (`lampnet-hivemind` `lampnet-node.rs:4982,5170`). Lease đóng góp **không bind DID** (`mobile_settle.rs:198-222`). Sổ phí hiện chỉ trong RAM.
- Luồng góp **lưu trữ / mảnh khoá phân tán chưa xây**: `LeaseKind::StorageReplica` = `NotImplemented` (`lampnet-hivemind/.../contribute.rs:186`); Vault VSS Feldman mới là thư viện in-memory, chưa nối Mirage/persistence (`Vault/src/lifecycle.rs:166-186`, PSS = SPEC-TODO).
- ⟹ Tầng uy tín/PoUW của Joinnet **đang dựa trên số tự khai chưa kiểm chứng từ ngoài**. Theo §7, số này **chưa đủ tư cách** cấp uy tín/quyền biểu quyết ở tầng hệ. **Mốc đạt chuẩn:** nối **V2 reward** (PoR bắt buộc + Sybil cap, `_shared/CARP-Reward-Payout.md:17` — đã có code, chưa ai gọi) + ép `did:phoenix` vào `node_id` + neo biên nhận on-chain.

## 2. Tham số kỹ thuật

| Trường (PK4 + thư §2) | Giá trị | Ghi chú |
|---|---|---|
| `instance_id` | **chưa thiết lập** | Joinnet chưa có instance kho on-chain |
| `custody_hash` | **chưa thiết lập** | chưa có Treasury custody instance |
| `seed_policy` | **chưa thiết lập** | chờ mô hình vault phân tán (nghĩa vụ 1GB giữ mảnh) lên; hiện chưa có persistence shard |
| `created_epoch` | **chưa thiết lập** | chưa tạo beacon on-chain |
| `governance_ref` | **chưa thiết lập** | chờ lập kho |
| Asset thu | (chưa) — thưởng trả bằng **CARP** ở settlement MagicLamp, không thu asset ở Join | `_shared/CARP-Reward-Payout.md` |
| `cut_bps` | **chưa thiết lập** | không cắt phí ở tầng Join |
| Bucket kế toán | hiện: sổ đóng góp/epoch trong RAM (chưa on-chain) | mốc on-chain = V2 |
| `genesis_ref` | **chưa thiết lập** | |

> Tóm: Joinnet đang ở **giai đoạn tiền-on-chain**. Định danh + ý đồ đã rõ; phần kho/định danh on-chain chưa lập. Hồ sơ này đăng ký **hiện trạng thật**, cập nhật khi V2 + kho lên.

## 3. Cam kết vận hành

- **Ai giữ quyền quản trị kho:** chưa có kho → chưa áp dụng. Khi lập, `governance_ref` sẽ khai rõ (không token-weighted; theo mô hình governance cá nhân của hệ).
- **Xử lý khi khoá bị lộ:** mô hình hướng tới là vault phân tán k-of-n (Vault Feldman VSS) — mảnh giữ rải trên thiết bị người dùng (nghĩa vụ 1GB), lộ 1 mảnh không lộ seed. Cơ chế tái phân tán chủ động (PSS) khi mảnh rời mạng **chưa hiện thực** (`Vault/src/lifecycle.rs:166-186`) — là chốt chặn đã ghi.
- **Thông báo khi dừng dịch vụ:** `status` là nhãn niêm yết (PK10) — `Paused`/`Retired` chỉ ẩn khỏi sổ, không khoá tiền. Joinnet cam kết cập nhật `status` + thông báo qua kênh cộng đồng LDC (`Join/LDC-Community.md`) trước khi dừng.

## 4. Bốn dịch vụ cùng đợt
Trace · Work · Chat · **Joinnet** (hồ sơ này).

---
*Điền bởi Join agent 2026-08-02. Con trỏ neo `file:line` tại thời điểm điền; chỗ "chưa thiết lập" là hiện trạng thật, không phải bỏ trống.*

Join agent
