# Legacy — sổ ghi những gì đã bị thay, và thay bằng cái gì

Thư mục này **không chứa bản sao**. Một nội dung chỉ được sống ở đúng một chỗ; giữ thêm một bản
ở đây là tự tạo ra hai nguồn rồi để chúng trôi khỏi nhau. Cái cần giữ lại là **con trỏ**: file nào
đã bị thay, thay bằng file nào, và tra bản cũ ở đâu.

Bản cũ luôn tra được trong lịch sử git. Sổ dưới đây nói cho người đọc biết phải tra ở đâu, để họ
khỏi phải đoán.

## Đã bị thay

| Ngày | File cũ | Nay ở đâu | Vì sao |
|---|---|---|---|
| 2026-08-04 | `Registrations/joinnet.md` | [`Registrations/lampnet.md`](../Registrations/lampnet.md) | Cùng một dịch vụ tồn tại ba bản: một khung rỗng do Registry mở sẵn, một bản khai thật của đội Join đã gộp vào `main`, và một bản đổi tên. Ba bản đó nay là một: nội dung khai của đội Join, đặt trong khung `Registrations/template.md`. Bản cũ tra ở lịch sử `main` trước ngày này. (`platform_id` lúc đó là `join`; xem dòng 2026-08-15.) |
| 2026-08-15 | `Registrations/join.md` (`platform_id: "join"`) | [`Registrations/lampnet.md`](../Registrations/lampnet.md) (`platform_id: "lampnet"`) | Chủ sở hữu chốt. `join` là **lớp tích hợp**; kho và bằng chứng nằm ở `LampNetCloud/lampnet-hivemind`. Quy tắc rút ra: **trường định danh bất biến đặt tên cho tầng giữ kho và giữ bằng chứng, không phải tầng giữ thương hiệu.** Đổi được vì chưa đúc beacon trên mạng nào — lần đổi **thứ ba** miễn phí, không phải lần cuối. Đổi kèm: `Registrations/README.md`, `tests/shapeMirror.test.ts` (fixture đang mang **tên thứ ba** `LampNetJoin` mà không test nào đỏ — chính là bằng chứng cái tên chưa gánh gì). |

## Quy tắc dùng thư mục này

- Một tài liệu bị thay → thêm **một dòng** vào bảng trên, không chép nội dung vào đây.
- Nội dung thật của bản cũ nằm ở lịch sử git. Cần đọc thì tra theo đường dẫn ghi trong bảng.
- Thư mục này không phải nơi để dành thứ "có thể còn dùng". Còn dùng thì nó chưa lỗi thời.
