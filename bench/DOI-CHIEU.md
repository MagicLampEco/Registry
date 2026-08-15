# Đối chiếu — hai bản phản biện độc lập, và những gì KHÔNG sống sót

Ngày: 2026-08-13. `RESULTS.md` là kết quả **đã chạy thật**. Tệp này là kết quả **đã bị đánh**.

Hai bản phản biện chạy song song trên cùng bộ mã, không thấy nhau: một nhà toán học (kiểm suy
diễn và mã có khớp công thức không) và một nhà lý thuyết trò chơi (kiểm động cơ và cân bằng).

Đọc tệp này **trước** khi dùng bất kỳ số nào trong `RESULTS.md`.

---

## 0. Kết luận một dòng

Phương pháp đứng được. **Các con số thì chưa** — bốn lỗi cứng và một lỗi mã đủ để đảo chiều một
số kết luận. Bộ số hiện tại là **số để thử**, không phải số để chốt vào mã.

---

## 1. 🔴 Chỗ nặng nhất: một khẳng định trung tâm của bản thiết kế phải HẠ XUỐNG

Bản thiết kế `_Agents/deliverables/kinh-te-tai-nguyen-lampnet.md` viết RE-1 là *"đường phòng thủ
duy nhất không đứng trên giả định danh tính đắt"*. Nhà lý thuyết trò chơi kiểm lại và bác:

RE-1 (`pool_E ≤ ρ · Σ MAGIC thực bị tiêu`) chỉ triệt **một** đường — đường **tự tạo cầu** (đốt
MAGIC của chính mình để bơm `Σ` rồi thu lại ở vai nhà cung cấp). Ở đường đó kẻ tấn công lỗ chắc
`(1−ρ)X` mỗi vòng, đúng như thiết kế nói.

Nhưng có **đường thứ hai** mà RE-1 im lặng hoàn toàn:

> **Không đốt gì cả. Chỉ khai CUNG, để lấy phần của `Σ` do người khác đốt.**
> Payoff `= ρ · s · Σ_người_khác`, chi phí ≈ chi phí danh tính.
> **Dương với mọi `s > 0` và mọi `ρ`.** Không `ρ` nào chặn được.

Chặn đường này cần đúng ba thứ mà thiết kế muốn tránh phải dựa vào: biên nhận do bên **không
hưởng lợi** ký (RE-5), thách thức có **phát hiện thật**, và cổng **DID** cho node.

**Sửa phát biểu:**

| Viết sai | Viết đúng |
|---|---|
| RE-1 là phòng tuyến duy nhất không cần danh tính đắt | RE-1 là phòng tuyến duy nhất chống **wash cầu**. Nó **không** chống Sybil nói chung. |

Hệ quả thực tế: câu *"personhood lên tới đâu, ρ nới tới đó"* vẫn đúng, nhưng câu *"Registry không
bị chặn ở Phoenix"* thì **hẹp hơn tôi tưởng** — không bị chặn ở phần wash cầu, vẫn bị chặn ở phần
cung giả. Đã gửi đính chính cho Phoenix và LampNet.

## 2. 🔴 Bốn lỗi cứng trong mô hình

| # | Chỗ | Sai gì | Hệ quả lên con số |
|---|---|---|---|
| 1 | **Sàn của ρ** — `ρ ≥ N·C/D` | Dùng chi phí **trung bình**. Sàn thật phải là chi phí **biên**: `ρ ≥ c(K_cần)·K_cần/D ≥ N·C̄/D` luôn luôn. Phản ví dụ 2 nhà cung cấp `C=(0,2; 1,8)`, `D=4`: tại `ρ=0,5` bên đắt nhận 1 < 1,8 ⇒ **rời đi**, sàn không giữ nổi tập nhà cung cấp | Miền khả thi in ra **rộng hơn thật**. Với dị biệt chi phí `δ=0,5` thì `ρ*` là **0,65**, không phải 0,55 |
| 2 | **Sàn của ρ, tầng sâu hơn** | `N` bị coi là ngoại sinh. Với **tự do gia nhập**, `N` tự điều chỉnh tới `ρD/N = C` với **mọi** ρ ⇒ sàn thoả bằng đẳng thức luôn luôn và **vô nghĩa** | "Epoch miền mở ra" (A3) là **hiện vật của việc giữ N cố định**. Và toàn bộ lý do tồn tại của trợ giá thừa hưởng lỗ này — trợ giá chỉ thật sự cần khi có **chi phí chìm / quy mô hiệu quả tối thiểu**, thứ mô hình không có |
| 3 | **Điều kiện răn đe** thiếu thừa số `n` | `ρ_spot` là tỉ lệ lấy mẫu **trên tác vụ**, mô hình dùng nó như xác suất bắt **trên epoch**. Ngưỡng đúng là `W · n · ρ_spot > b` với `n` = số tác vụ mỗi epoch | Với `n` hàng nghìn, kết luận **"sàn 0,01 không đủ răn đe" đảo chiều**. Đây là chỗ ảnh hưởng trực tiếp tới điều gì cần nói với LampNet |
| 4 | **Trợ giá** `D_TARGET = 4·NC/ρ` | ρ **triệt tiêu sạch** trong `ρ·D_E` ⇒ đường trợ giá trong mã **bất biến theo ρ**. Vậy mà báo cáo khai *"ρ thấp hơn ⇒ nhu cầu trợ giá cao hơn đúng tỉ lệ 1/ρ"* | Câu đó **mâu thuẫn trực tiếp với mã đang chạy**, không có phép đo nào đỡ. Bỏ |

## 3. 🔴 Một lỗi MÃ, đo được

`model_b_deter.py:140` so với `:157-164`: vế người làm thật cộng **150** khoản, vế kẻ gian chỉ cộng
**138** khoản — lệch đúng `W` khoản, tức kẻ gian bị chặt mất **7 % dòng tiền gộp bằng hiện vật mô
phỏng**.

| b | ngưỡng dạng đóng | ngưỡng THẬT của Monte-Carlo | mã in ra |
|---|---|---|---|
| 0,2 | 0,223 | **0,144** | 0,24 |
| 0,5 | 0,693 | **0,580** | 0,60 |
| 0,8 | 1,609 | **1,418** | 1,44 |

Monte-Carlo lệch xuống **13–36 %** một cách hệ thống — **không** phải "khớp trong sai số lưới" như
`RESULTS.md §2.1` tuyên bố. Mọi phán quyết "răn đe CÓ" trong bảng B3 **thiên vị về phía CÓ**.
Sửa: cộng vế gian tới `t = W+1 .. horizon+W`.

## 4. Ba chỗ số KHÔNG ổn định (đừng chốt)

| Số | Vấn đề |
|---|---|
| `α* = 0,25` | Cột thặng dư in **82,69 ở CẢ `α=0,25` lẫn `α=0,30`**. `max()` trả phần tử đầu ⇒ 0,25 thắng **bằng thứ tự danh sách**, không bằng số. Cả dải `α ∈ [0,20; 0,35]` nằm trong 0,3 % của đỉnh ⇒ argmax vô định ±0,10 |
| Toàn bộ đường cong `α` | Sống nhờ một **quy tắc chia việc chưa hề được phát biểu** (đơn vị biên chỉ phục vụ ở đỉnh). Dưới quy tắc chia **tỉ lệ** nhất quán thì `earn_i = ω·k_i` — **α biến mất hoàn toàn, trung tính tuyệt đối**. Nói `α* = 0,25` mà không nói quy tắc chia việc là nói không có nội dung |
| Quan hệ `ρ ↔ α` | `model_c_alpha.py:245` neo `C = cr·ρ·p`. Chi phí thật (điện, đĩa) là **ngoại sinh**, không co khi thuế chống farm tăng. Bằng chứng nội tại: cột phục vụ ở `α=0` **giống hệt 0,7402 ở cả bốn mức ρ**. Quan hệ "ρ=0,35 ⇒ α*=0,45" sinh từ chỗ neo này, **không phải từ cơ chế** |

## 5. Năm chỗ động cơ mà mô hình đơn giản không bắt

1. **Trần trợ giá `20·N·C` KHÔNG phải trần.** `N` và `C` đều **nội sinh và tự khai** — thêm đăng ký
   giả là trần tự giãn tuyến tính. Trần chỉ là trần khi ghi bằng **LAMP tuyệt đối, chốt lúc công
   bố**. Chưa có con số đó thì **đừng bật `S_E`**.
2. **`W` hiện là "hoãn CHI", chưa ai viết nó phải là "hoãn ACCRUAL".** Chủ đã gỡ quyền tịch thu.
   Nên mất `W·R` chỉ hợp lệ khi phần đó **chưa accrued**. Nếu reward ghi có ở `E` mà chỉ chi ở
   `E+W` thì tước nó **chính là** chạm phần đã accrued — đúng thứ vừa gỡ. Bắt buộc viết bất biến:
   `entitled(E) := tại E+W, với điều kiện không phát hiện lỗi trong [E, E+W)`. **Mốc accrual đó
   hôm nay chưa được định nghĩa ở đâu.**
3. **`ρ_spot = 0,35` ngầm giả định `P(bắt được | có kiểm) = 1`.** Với BANDWIDTH, "node tự khai đã
   đẩy bao nhiêu byte" là mệnh đề **không bác được** ⇒ `ρ_spot` hiệu lực ≈ 0 bất kể hằng số đặt bao
   nhiêu. Con số 0,35 chỉ có nghĩa cho **STORAGE (nơi có PoR)**. **Chốt một `ρ_spot` chung cho bốn
   tài nguyên là chốt sai.**
4. **`α > 0` + danh tính rẻ nghiêm ngặt TỆ HƠN `α = 0`.** Node ma sống `1/ρ_spot ≈ 2,9` epoch, chết
   rồi dựng lại miễn phí ⇒ ROI vô hạn (chi phí 0); node thật ROI hữu hạn. Vào cửa tự do ⇒ toàn bộ
   phần `α` chảy về ma. Model C so kẻ ăn không với node thật **trên một đời node** nên không thấy.
5. **Đổi bộ hệ số hạng KHÔNG sửa được lỗ tier tự khai.** Con số 2,72 % pool chuyển sai người đã
   tính theo bộ chuẩn; thu hẹp bảng chỉ thu hẹp **biên độ trả**, không sửa **sai người nhận**. Sửa
   nguồn của `tier` mới sửa được.

## 6. Cái gì SỐNG SÓT

- **Miền khả thi hai cận `N·C/D ≤ ρ ≤ 1 − V/X`** — dạng đúng, chỉ sai ở cách tính cận dưới (mục 2).
- **`ρ ≤ 1 − V/X`** — đại số đúng. Và một cách đọc `s = 1` mà tôi chưa nghĩ tới: nó **không** phải
  "chiếm cả mạng". Một cartel `k` người, mỗi người đốt `X` và giữ `1/k` pool, **tái tạo đúng cận
  `s=1`** (mỗi người thu `ρ·(1/k)·kX = ρX`). Đó mới là cách đọc đúng.
- **Điểm `√(lo·hi)`** tối đa hoá `min(ρ/lo, hi/ρ)` — chứng minh một dòng, đúng.
- **Dạng đóng `(1−ρ_spot)^W < 1−b`** — đúng. Xấp xỉ tuyến tính `W·ρ_spot` làm nhẹ đi 23 % ở
  `ρ_spot = 0,35`, hướng **thận trọng**, chấp nhận được.
- **Chuỗi trần trợ giá hội tụ thật** (`Σ S_0·γ^(E−1) = S_0/(1−γ) = 20`, `γ=0,95`), không phải cắt
  tay. Nhưng cái hội tụ là *"mức chi tối đa mình chịu"*, **không phải "nhu cầu"** — nhu cầu tuyến
  tính theo `τ` và **không có cận trên**; trần 20 chịu được `τ ≤ 146` epoch ≈ 2 năm.
- **Tồn tại và duy nhất của `K*`** trong mô hình α — chứng minh được (`π` lõm, `π'` giảm ngặt).
- **Ba con số thuần số học, đổi hạt giống không đổi**: `ρ`, `W`, bộ hệ số hạng, ngưỡng loại
  `1/(1+L)`. Chắc về **tái lập**; về **đúng** thì xem mục 2.

## 7. Ba chỗ phản biện tự nhận CHƯA chắc

- Phần "piggy-back đồng thuận quản trị" là **suy luận** về hành vi script ngoài repo, chưa dựng lại.
- Ca phân kỳ của mô hình α (`αω ≥ C` ⇒ năng lực tối ưu = ∞) có thật và mã **cắt tay ở `quantile(0.999)`
  không báo gì** — nhưng ở `α = 0,60` vẫn còn 13 % biên, nên chưa chạm ở dải đang xét.
- Tuyên bố "mục tiêu chọn α thiên vị α=0 **theo cấu tạo**" **chưa chứng minh** — tính đạo hàm tại
  `α=0` cho tỉ số 0,47, đó là một kết quả **số**, không phải cấu tạo. Đổi hằng chuẩn hoá là đổi kết
  quả. Hạ xuống "với hằng chuẩn hoá đã chọn".

## 8. Việc phải làm trước khi bất kỳ số nào vào mã

1. Sửa lỗi mã ở `model_b_deter.py` (mục 3), chạy lại.
2. Thay sàn ρ bằng **chi phí biên**, và mô hình hoá **tự do gia nhập** (mục 2.1, 2.2).
3. Thêm thừa số `n` vào điều kiện răn đe (mục 2.3).
4. Bỏ câu "nhu cầu trợ giá ∝ 1/ρ" (mục 2.4).
5. Phát biểu **quy tắc chia việc** trước khi nói bất cứ điều gì về α (mục 4).
6. Định nghĩa **mốc accrual** trước khi nói `W` răn đe được gì (mục 5.2).
7. Tách `ρ_spot` **theo từng tài nguyên**, không một số chung (mục 5.3).
8. Đo `b`, `V/X`, `q`, `L`, `n`, `N·C` bằng LAMP tuyệt đối — sáu đại lượng, **chưa cái nào được đo**.
