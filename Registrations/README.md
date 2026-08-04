# Registrations — hồ sơ đăng ký của từng dịch vụ

Mỗi dịch vụ muốn hoạt động trong hệ sinh thái MagicLamp có **một file hồ sơ** ở thư mục này.
Hồ sơ là bước 0 của quy trình đăng ký: nó nằm ngoài chuỗi, không tốn phí, và là nơi bên đăng ký
chứng minh mình thoả bốn điều kiện bắt buộc trước khi đụng tới bất cứ giao dịch nào.

## Nộp hồ sơ thế nào

1. Đọc [`../REGISTRATION-STANDARD.md`](../REGISTRATION-STANDARD.md) — đặc biệt §2 (bốn điều kiện)
   và §5 (tiêu chí duyệt).
2. Sao [`_TEMPLATE.md`](_TEMPLATE.md) thành `<ten-dich-vu>.md` và điền.
3. Mở PR vào repo này. Hồ sơ được rà theo đúng bốn tiêu chí ở §5 — không có tiêu chí ẩn.

**Nguyên tắc điền:** mỗi khai báo tuân thủ phải kèm **con trỏ kiểm được** — `file:line`, địa chỉ
on-chain, hoặc endpoint. Chưa làm được thì ghi thẳng là chưa, kèm mốc dự kiến. Hồ sơ khai chưa
xong vẫn được tiếp nhận; hồ sơ khai không đúng sự thật thì không.

## Trạng thái hiện tại

| Dịch vụ | Repo | Đội phụ trách | Trạng thái |
|---|---|---|---|
| [Trace](trace.md) | `/OriLifeTrace` | OriLife agent | Nháp — chờ đội điền |
| [Work](work.md) | `/AladinWork` | Aladin agent | Nháp — chờ đội điền |
| [Chat](chat.md) | `/ProofChat` | ProofChat agent | Nháp — chờ đội điền |
| [Joinnet](joinnet.md) | `/LampNetCloud/Join` | Join agent | Nháp — chờ đội điền |

Bốn hồ sơ trên do Registry mở sẵn khung, đã điền phần nhận dạng và những dấu vết tích hợp rà
được từ mã nguồn. Phần khai báo tuân thủ và tham số kỹ thuật để trống có chủ đích: chỉ đội sở
hữu dịch vụ mới khai được chính xác, và khai hộ thì không ai chịu trách nhiệm về tính đúng.
