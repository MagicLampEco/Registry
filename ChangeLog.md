# ChangeLog — Registry

**Đây KHÔNG phải nhật ký phát hành theo phiên bản** (không theo Keep a Changelog, không theo SemVer).
Thứ ghi ở đây là **quyết định về đặc tả** — mà quyết định đặc tả không đi theo số phiên bản.

Quy tắc ghi: **mới nhất trên đầu; không bao giờ sửa dòng cũ**. Mỗi mục ba vế — **đổi gì · vì sao ·
cái gì gãy nếu ai đó đang bám bản cũ**. Vế ba là vế hay bị bỏ và là vế duy nhất người đọc cần.

**Cấm phát biểu hiện trạng ở đây** ("hiện đang…", "nay là…"). Hiện trạng nằm ở
[`DevStatus.md`](./DevStatus.md) — nơi duy nhất.

---

## 2026-08-13 — Tách đặc tả toán ra tệp riêng (`Specs/Math-Spec.md`)

- **Đổi gì:** phát biểu hình thức của mười một bất biến `PK1…PK11`, mô hình tin cậy khi định tuyến
  phí, và bảng kẻ tấn công **chuyển** khỏi `Specs/CONTRACT.md` (§8 và §3.2 của bản trước) sang
  `Specs/Math-Spec.md`. `CONTRACT.md` giữ lại một **chỉ mục ý định** một dòng mỗi bất biến, trỏ sang.
- **Vì sao:** Registry ở tầng hạ tầng nền và là hai validator on-chain, nên chuẩn StandardSpec đòi đủ
  bốn đặc tả — đang thiếu hẳn đặc tả toán. Nội dung đã tồn tại, chỉ nằm sai chỗ.
- **Gãy gì nếu bám bản cũ:** ai trích `CONTRACT.md §8` để lấy phát biểu đầy đủ sẽ chỉ còn thấy một
  dòng tóm tắt. Đường dẫn mới: `Specs/Math-Spec.md` §7 (bất biến), §6.2 (tin cậy), §8 (kẻ tấn công),
  §14 (giới hạn).

## 2026-08-13 — Mệnh đề duy nhất `platform_id` bị khai thẳng là KHÔNG chứng minh được

- **Đổi gì:** mệnh đề "`platform_id` duy nhất" được phát biểu hình thức (`P-UNIQUE`) rồi **bác bằng
  phản ví dụ hai giao dịch** trong `Specs/Math-Spec.md` §14 L1, thay vì để nó nằm lẫn trong phần
  known-gap của `CONTRACT.md`.
- **Vì sao:** `registry_beacon` không one-shot, nên on-chain không biết một `platform_id` đã từng
  được đúc. Để nó trông như đã chứng minh là mời người ta tin sai.
- **Gãy gì nếu bám bản cũ:** ai đọc `PK3` rồi tưởng tính duy nhất được bảo đảm bằng mật mã đang
  định tuyến phí trên một giả định sai. Van thay thế: kiểm trùng ở SDK + kỷ luật ký của authority.

## 2026-08-13 — Bốn đặc tả được ghi trạng thái thật là CHƯA DUYỆT

- **Đổi gì:** thêm khối siêu dữ liệu (phiên bản, trạng thái, tầng phạm vi, người viết, người duyệt,
  ngày cập nhật) vào đầu mọi tệp trong `Specs/`, dùng bộ trạng thái đóng của StandardSpec. Mọi tệp
  ghi `DRAFT` và "chưa ai duyệt".
- **Vì sao:** chuẩn quy định phía sau chỉ được bắt đầu khi đặc tả phía trước đã duyệt. Không tệp nào
  từng qua cổng đó. Đánh dấu duyệt hộ ai là làm hỏng chính cái cổng.
- **Gãy gì nếu bám bản cũ:** ai từng đọc dòng "khung interface đã chốt" trong `Feat-Spec.md` và hiểu
  là đã duyệt thì hiểu sai — "chốt" ở đó nghĩa là tác giả không tự đổi nữa, không phải đã qua duyệt.

## 2026-08-13 — Hạ các con số kiểm thử không kiểm chứng được

- **Đổi gì:** trong `Specs/Exec-Spec.md`, hai mục "Tiêu chí xong" đang đánh dấu hoàn thành kèm
  "137 pass" và "86 test xanh" bị hạ xuống chưa hoàn thành, thay số bằng **lệnh kiểm**
  (`cd onchain && aiken check`, `cd offchain && npm test`). Mục tương tự ở `Specs/README.md` bỏ hẳn số.
- **Vì sao:** các số đó đo ngày 2026-07-29 ở cây Treasury, trước đợt sửa validator v2, nên không còn
  đối chiếu được từ nội dung repo. Số chép tay tạo ra một sự thật không ai kiểm lại được.
- **Gãy gì nếu bám bản cũ:** ai trích "86 test xanh" làm bằng chứng cho mốc M4 đang trích một con số
  không có nguồn sống. Chạy lệnh, đừng chép số.

## 2026-08-13 — Đổi tên `Specs/ONBOARDING.md` thành `Specs/onboarding.md`

- **Đổi gì:** đổi tên tệp cho khớp quy ước (viết hoa toàn bộ chỉ dành cho từ viết tắt).
- **Vì sao:** dọn nốt đợt đổi tên theo StandardSpec đã làm ở `e62cb5e` (TECH→Tech-Spec,
  FEAT→Feat-Spec, EXEC→Exec-Spec) nhưng bỏ sót tệp này.
- **Gãy gì nếu bám bản cũ:** mọi liên kết `Specs/ONBOARDING.md` chết. Đã vá ở `Specs/README.md`.
  **Còn hai chỗ ngoài thư mục `Specs/` chưa vá** — `README.md` gốc repo (hai chỗ) và
  `REGISTRATION-STANDARD.md`. Kiểm bằng
  `grep -rn 'ONBOARDING' --include='*.md' . | grep -v '/_Agents/'`.

## 2026-08-13 — Tiêu đề tệp đổi từ "PlatformKit" sang "Registry"

- **Đổi gì:** bốn tệp trong `Specs/` mở đầu bằng tiêu đề "PlatformKit" (tên module cũ) đổi sang
  "Registry"; các chỗ dùng "PlatformKit" như **tên module** trong thân tệp cũng đổi theo.
- **Vì sao:** PlatformKit là tên lớp này khi nó còn sống trong repo LAMP. Giữ tên cũ ở tiêu đề làm
  người đọc tưởng đây là hai thứ khác nhau.
- **Gãy gì nếu bám bản cũ:** chữ "PlatformKit" **còn lại có chủ ý** ở những chỗ chỉ **đường dẫn lịch
  sử trong repo LAMP** (`PlatformKit/offchain/...`). Đừng đổi nốt những chỗ đó — đổi là làm chết
  đường dẫn thật.

## 2026-08-13 — Cặp `ChangeLog.md` + `DevStatus.md` ở gốc repo

- **Đổi gì:** dựng hai tệp này theo rule vệ sinh nhà agent (`$SYSTEME_HOME/_rules/agent-hygiene.md`
  §3). Repo một module ⟹ một cặp ở gốc.
- **Vì sao:** đã đo được ba vụ mất công sức cùng một cơ chế ở các repo khác — không có nơi nào ghi
  "đã build cái gì, và nó đang ở đâu".
- **Gãy gì nếu bám bản cũ:** agent nào còn quét repo để đoán hiện trạng là đang làm sai quy trình.
  Đọc `DevStatus.md` trước.
