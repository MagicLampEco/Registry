# Registrations — hồ sơ đăng ký của từng dịch vụ

Mỗi dịch vụ muốn hoạt động trong hệ sinh thái MagicLamp có **một file hồ sơ** ở thư mục này.
Hồ sơ là bước 0 của quy trình đăng ký: nằm ngoài chuỗi, không tốn phí, và là nơi bên đăng ký
khai mình đang đứng ở đâu trên bốn trục điều kiện.

## Khai bằng **mã**, không viết văn xuôi

Đây là điểm khác với cách làm cũ. Hồ sơ có một khối ` ```json registration ` chọn **một mã từ tập
đóng** cho mỗi trục, kèm những con trỏ mà mã đó bắt buộc phải có. Tập đóng ở
[`codes.json`](codes.json).

Hệ quả: **hạng niêm yết tính ra được bằng máy**, nên người giữ quyền đăng ký chuyển từ vai người
phán xử sang vai người đối chiếu — và bên nộp biết chính xác mình đang ở đâu, thiếu gì, mà không
phải hỏi ai.

```bash
node ../tools/check-registration.mjs <ten-dich-vu>.md   # chấm một hồ sơ
node ../tools/check-registration.mjs                    # chấm hết
```

## Nộp thế nào

1. Đọc [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) — §2 (điều kiện), §3 (hồ sơ),
   §5 (duyệt).
2. Sao [`template.md`](template.md) thành `<ten-dich-vu>.md`, chọn mã, điền con trỏ.
3. Chạy bộ chấm ở trên tới khi hết dòng `✗`.
4. Mở PR vào repo này.

## Ba điều nên biết trước khi lo lắng về việc chưa đủ điều kiện

- **Khai "chưa đạt" không phải căn cứ từ chối.** Chỉ có ba căn cứ, và chúng nằm trong một **tập
  đóng**: `platform_id` trùng · không có ai chịu trách nhiệm liên hệ được · **khai không đúng sự
  thật**. Chọn đúng một mã thấp là khai ĐÚNG.
- **Chỉ trục hệ token (`2.2`) là cổng cứng.** Ba trục kia — danh tính, kho giá trị, hạ tầng ngoài
  — là **lời khai có phân hạng**: chúng quyết định hạng niêm yết, không quyết định việc được vào.
- **Không thu asset thì khai `CU-N`**, hạng ngang với có kho. Không thu tiền không phải thiếu sót.

## Trạng thái hiện tại

Đo bằng `node ../tools/check-registration.mjs`, không chép tay.

| Dịch vụ | Con trỏ thực thi | Đội phụ trách | Trạng thái |
|---|---|---|---|
| [Trace](trace.md) | `/OriLifeTrace` | OriLife agent | Chưa nộp — chờ đội điền |
| [Work](work.md) | `/AladinWork` | AladinWork agent | Chưa nộp — chờ đội điền |
| [Chat](chat.md) | `/ProofChat` | ProofChat agent | Chưa nộp — chờ đội điền |
| [LampNet + Join](lampnet.md) | `/LampNetCloud/Join` + `/LampNetCloud/lampnet-hivemind` | Join agent · LampNet agent | **L0 — đã tiếp nhận.** Chặn lên `L1` bởi đúng hai ô: `governance_ref` và trục danh tính |

Ba hồ sơ "chưa nộp" do Registry mở sẵn khung, đã điền phần nhận dạng và những dấu vết tích hợp rà
được từ mã nguồn. Phần khai báo để trống **có chủ đích**: chỉ đội sở hữu mới khai được chính xác,
và khai hộ thì không ai chịu trách nhiệm về tính đúng.
