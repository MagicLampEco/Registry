# RESULTS — kết quả ĐÃ CHẠY THẬT

**Ngày chạy:** 2026-08-13 23:17:20 +07 · **python:** 3.14.5 · **hạt giống:** `20260813` ·
**lệnh:** `bench/run_all.sh` · **mã thoát:** 0 · **936 dòng output**.

Mọi con số trong tài liệu này đều lấy từ output thô dán ở §2. Không có số nào viết tay.
Hai lần chạy đầy đủ cho kết quả **giống hệt** (kiểm bằng `diff`, bỏ dòng ngày chạy).

---

## 1. BẢNG SỐ ĐỀ NGHỊ CHỐT

| # | Tham số | Giá trị đề nghị | Dải mà nó còn đúng | Mô hình nào cho ra | Giả định nào mà sai thì số này sai |
|---|---|---|---|---|---|
| 1 | **ρ** (RE-1) — hệ đã vá | **0,55** | `0,34 ≤ ρ ≤ 0,95` | A5 (điểm hình học của `√(lo·hi)`) | (a) `V/X ≤ 0,05` — số tự khai KHÔNG được cấp uy tín/quyền biểu quyết; (b) cầu đã chín `D ≥ 3·N·C`; (c) `φ = 0` — `Σ required` chỉ đếm lượng ĐỐT bất khả nghịch |
| 2 | **ρ** — mã HÔM NAY | **0,45** | `0,34 ≤ ρ ≤ 0,70` | A5 | như trên nhưng `V/X = 0,30` vì hạng tự khai nhân thẳng vào `weighted_score`. `V/X` thật CHƯA ĐO ĐƯỢC — 0,30 là giả định thận trọng, không phải số đo |
| 3 | **W** (cửa sổ chi trả) | **4 epoch = 20 ngày** | 3 epoch nếu `b=0,2`; 8 epoch nếu `b=0,8` | B5 (rẻ nhất trong số ô đạt răn đe) | `b = 0,5`, `r_năm = 15 %`, `W0 = 12 epoch`, ba chi phí cộng ngang trọng số 1 |
| 4 | **ρ_spot** (tác vụ CÓ thưởng) | **0,35** | `0,20` nếu `b=0,2`; `0,50` nếu `b=0,8`. Với W khác: `ρ_spot ≥ 2·(−ln(1−b))/W` | B3 + B5 | danh tính RẺ (tẩy trắng gần như miễn phí — đúng với hôm nay). Danh tính ĐẮT thì `ρ_spot` thấp hơn nhiều cũng đủ |
| 5 | **α** (RE-7) | **0** hôm nay · **0,25** khi đã có thách thức | `0,15` nếu `ρ=0,75`; `0,45` nếu `ρ=0,35`; `0,35` nếu cầu đuôi dày | C3 + C4 (tối đa thặng dư) | mọi đơn vị phục vụ có giá trị BẰNG NHAU (`p=1`). α và ρ KHÔNG độc lập — chốt cùng nhau |
| 6 | **S_0** (trợ giá epoch đầu) | **1,0 · N·C** | — | D2 | `ρ = 0,55`; cầu chín `ρ·D = 4·N·C` |
| 7 | **γ** (suy giảm trợ giá) | **0,95/epoch** (nửa đời 13,5 epoch = 68 ngày) | 0,90 nếu chấp nhận biên 1,2x thay vì 2,4x | D2 | dạng cầu `D_E = D_target(1−e^{−E/τ})`, `τ ∈ {8, 24, 60}` epoch |
| 8 | **Trần tổng ΣS_E** | **20 · N·C** (= 20 epoch chi phí toàn mạng) | phủ nhu cầu xấu nhất đo được 8,49·N·C với biên 2,36x | D2 + D5 | KHÔNG quy ra LAMP được — xem dòng "không kết luận được" ở dưới |
| 9 | **Hệ số hạng** | Newbie **0,909** · Contributor **0,978** · Trusted **1,000** | với `L=1`; ở `L=5` thành 0,722 / 0,933 / 1,000 | E1 + E6 | `q_N=0,05 · q_C=0,016 · q_T=0,005 · L=1`. Cả bốn CHƯA ĐO |
| 10 | **Ngưỡng LOẠI** (kèm bảng hệ số) | `q > 1/(1+L)` — ở `L=1` là **50 %** | `L=5` ⇒ 16,7 %; `L=10` ⇒ 9,1 % | E3 | như trên |

### Bốn con số PHẢI SỬA trong mã hiện hành (có bằng chứng ở §2)

| Chỗ | Hiện hành | Đo được | Nguồn |
|---|---|---|---|
| `RHO_SPOT_MIN` cho tác vụ có thưởng | `0,01` (`params.rs:43`) | 0,01 đòi treo tiền `W ≥ 139 epoch = 1,9 năm` mới răn đe nổi loại gian rẻ nhất | B5 |
| Hệ số hạng | `0,5 / 0,75 / 1,0` (`types.rs:70-76`) | `0,909 / 0,978 / 1,000` — bộ hiện hành giãn rộng gấp **5,5 lần** mức dẫn được | E6 |
| `tier` do bên gọi khai (`lampnet-node.rs:6268`) | tự khai | cân bằng là MỌI node khai Trusted ⇒ **2,72 %** pool mỗi epoch chuyển từ node tốt sang node kém | E5 |
| `total_pool` do bên gọi khai, chỉ chặn bằng trần hằng (`lampnet-node.rs:6196-6230, 6245, 6461`) | tự khai | tính `Σ` theo giá KHAI ⇒ `φ → 1` ⇒ **RE-1 sập hoàn toàn**, không ρ nào cứu | A4 |

### Chỗ KHÔNG KẾT LUẬN ĐƯỢC (ghi rõ, không lấp bằng số bịa)

1. **Trần trợ giá tính bằng LAMP.** Nó là `20 × N·C`, mà `N·C` (chi phí vận hành toàn mạng mỗi
   epoch, tính bằng LAMP) chưa ai đo. D4 cho bảng quy đổi đủ dải: `N·C = 0,1 LAMP/epoch` (đúng
   quy mô thưởng hôm nay) ⇒ trần 2 LAMP; `N·C = 10⁶ LAMP/epoch` ⇒ trần 2·10⁷ LAMP = 0,056 %
   nguồn cung. Phần đo được đã đo; phần chưa đo thì không bịa.
2. **`b` thật của từng tài nguyên** (phần chi phí mà gian tránh được, tính theo bội số thu nhập
   một epoch). Quét `b ∈ {0,2 · 0,5 · 0,8}`, không chốt được một giá trị. `b ≥ 1` thì
   `−ln(1−b)` phân kỳ ⇒ **không W nào răn đe nổi** khi danh tính còn rẻ.
3. **`V/X` thật** — mua được bao nhiêu uy tín/thứ hạng trên mỗi đồng MAGIC đốt. Chưa có phép đo.
   Hệ ĐÃ VÁ đặt `V ≈ 0` theo thiết kế; mã hôm nay thì `V > 0` mà không đo được là bao nhiêu.
4. **`q` (tỉ lệ hỏng) và `L` (chi phí một lần hỏng) theo hạng.** Chưa có phép đo nào trong mã.
   Nghĩa là bộ `0,5/0,75/1,0` đang phát biểu một mệnh đề định lượng về chất lượng mà không ai đo.
5. **α > 0 có đáng không, nếu đỉnh cầu đắt hơn nền.** Mô hình định giá mọi đơn vị phục vụ bằng
   nhau. Trượt đỉnh mà làm mất khách vĩnh viễn hoặc kích hoạt phạt SLA thì α* cao hơn số ở dòng 5.

---

## 2. Sáu phát hiện mà mô phỏng cho ra, ngoài các con số

**2.1 — Điều kiện răn đe trong đặc tả THIẾU, không sai.** Đặc tả viết `W·ρ_spot > b`. Mô phỏng
trò chơi lặp (B3) cho ngưỡng đúng là `W·ρ_spot > −ln(1−b)`, vì phần thưởng epoch `e` chỉ tới tay
nếu không bị bắt trong suốt `W` epoch sau đó ⇒ tỉ lệ nhận được là `(1−ρ_spot)^W`, không phải
tuyến tính. Chênh: 1,12x ở `b=0,2`, 1,39x ở `b=0,5`, **2,01x** ở `b=0,8`, phân kỳ khi `b → 1`.
Monte-Carlo 200 đường/ô đo được ngưỡng 0,24 / 0,60 / 1,44 so với dạng đóng 0,223 / 0,693 / 1,609 —
khớp trong sai số lưới.

**2.2 — Răn đe phụ thuộc DANH TÍNH CÓ ĐẮT KHÔNG, và điều đó quyết định hơn cả W lẫn ρ_spot.**
Cùng một ô `(W=12, ρ_spot=0,05, b=0,5)`: nếu bị bắt là loại vĩnh viễn thì PV(gian)/PV(thật) =
**0,181x** (răn đe thừa); nếu tẩy trắng được thì **0,985x** (răn đe sát mép). Hôm nay chưa có cổng
personhood ⇒ phải đọc cột tẩy trắng.

**2.3 — Vế TIỀN TRỰC TIẾP của RE-1 đứng vững kể cả khi hạng tự khai.** Hạng tự khai khuếch đại
tỉ phần `s` tới 2x ở `c` nhỏ, nhưng `s ≤ 1` theo cấu tạo ⇒ `ρ·s < 1` với mọi `ρ < 1`. Chỗ hạng
tự khai thật sự phá là vế `V` (uy tín mua bằng 0 đồng), không phải vế tiền.

**2.4 — Ba đường tấn công RE-1, kết quả khác nhau rõ rệt:**
- tự tiêu vòng tròn hai ví cùng chủ → `φ = 0` → **RE-1 ĐỨNG** (MAGIC vẫn bị đốt thật);
- hoàn phí sau khi đã tính vào `Σ` → `φ` = tỉ lệ hoàn → trần ρ tụt đúng `φ`; `φ=1` ⇒ **SẬP**;
- tính `Σ` theo giá KHAI → `φ → 1` ⇒ **SẬP HOÀN TOÀN**.
Hai điều kiện phụ bắt buộc: `Σ` chốt SAU cửa sổ hoàn phí, và `Σ` lấy từ lượng đốt on-chain chứ
không lấy từ trường giá bên gọi khai.

**2.5 — Mục tiêu chọn α mà đặc tả viết ra thiên vị α=0 theo cấu tạo.** "(phần cầu được phục vụ) −
(chi phí trên đơn vị chuẩn hoá)" trừ chi phí trên MỘT đơn vị phục vụ; tăng năng lực luôn hạ hiệu
suất ⇒ số bị trừ luôn tăng ⇒ α=0 luôn thắng, ở cả hai dạng cầu. Đổi sang thặng dư (giá trị phục
vụ − chi phí năng lực) thì α mới nói được nó để làm gì: **bù đúng phần thiếu hụt năng lực do
chính ρ<1 gây ra** (tối ưu xã hội đòi `P(d>k)=C/p`, cân bằng α=0 chỉ cho `P(d>k)=C/(ρp)`).
Cả hai kết quả đều nộp, không giấu cái nào.

**2.6 — α và ρ không độc lập.** `ρ=0,95 ⇒ α*=0,05`; `ρ=0,75 ⇒ α*=0,15`; `ρ=0,55 ⇒ α*=0,25`;
`ρ=0,35 ⇒ α*=0,45`. Chốt riêng từng cái là chốt sai.

---

## 3. OUTPUT THÔ — `bench/run_all.sh`, dán nguyên

```text
==============================================================================
 BỘ MÔ PHỎNG KINH TẾ TÀI NGUYÊN LAMPNET
 ngày chạy : 2026-08-13 23:17:20 +07
 python    : Python 3.14.5
 hạt giống : 20260813 (cố định trong từng script)
 thư mục   : /Users/ductiger/Projects/MagicLampEco/Registry/bench
==============================================================================

###### model_a_rho.py ######
##############################################################################################
MÔ HÌNH A — hệ số rho (RE-1) · hạt giống 20260813 · chạy ngày 2026-08-13
##############################################################################################

==============================================================================================
A1. Miền khả thi  N*C/D <= rho <= 1 - V/X   (quét rho bước 0,01)
==============================================================================================
Ô ghi: số điểm rho khả thi trên lưới 99 điểm / [rho_min .. rho_max].
'RONG' = không có rho nào vừa nuôi nổi nhà cung cấp vừa chặn được farm.

Cột = V/X (giá trị gián tiếp mua được trên mỗi đồng MAGIC đốt).
Hàng = D/(N*C) (độ chín của cầu).
D/(N*C)|         0.00         0.05         0.10         0.15         0.20         0.25         0.30         0.35         0.40         0.45         0.50
----------------------------------------------------------------------------------------------
   0.50 |         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG
   0.80 |         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG
   1.00 |         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG         RONG
   1.25 | 20/0.80-0.99 16/0.80-0.95 11/0.80-0.90  6/0.80-0.85  1/0.80-0.80         RONG         RONG         RONG         RONG         RONG         RONG
   1.50 | 33/0.67-0.99 29/0.67-0.95 24/0.67-0.90 19/0.67-0.85 14/0.67-0.80  9/0.67-0.75  4/0.67-0.70         RONG         RONG         RONG         RONG
   2.00 | 50/0.50-0.99 46/0.50-0.95 41/0.50-0.90 36/0.50-0.85 31/0.50-0.80 26/0.50-0.75 21/0.50-0.70 16/0.50-0.65 11/0.50-0.60  6/0.50-0.55  1/0.50-0.50
   3.00 | 66/0.34-0.99 62/0.34-0.95 57/0.34-0.90 52/0.34-0.85 47/0.34-0.80 42/0.34-0.75 37/0.34-0.70 32/0.34-0.65 27/0.34-0.60 22/0.34-0.55 17/0.34-0.50
   5.00 | 80/0.20-0.99 76/0.20-0.95 71/0.20-0.90 66/0.20-0.85 61/0.20-0.80 56/0.20-0.75 51/0.20-0.70 46/0.20-0.65 41/0.20-0.60 36/0.20-0.55 31/0.20-0.50
  10.00 | 90/0.10-0.99 86/0.10-0.95 81/0.10-0.90 76/0.10-0.85 71/0.10-0.80 66/0.10-0.75 61/0.10-0.70 56/0.10-0.65 51/0.10-0.60 46/0.10-0.55 41/0.10-0.50
----------------------------------------------------------------------------------------------
Tổng ô: 99 · ô RỖNG: 43 (43.4 %)
Đọc: cầu chưa chín (D/(N*C) <= 1) thì miền RỖNG với MỌI V/X — đây chính là
lý do RE-2 (trợ giá khởi động) phải tồn tại, không phải tuỳ chọn.

==============================================================================================
A2. Chọn rho trong miền — hai quy tắc 'tối đa biên nhỏ nhất của hai vế'
==============================================================================================
QT-số học : rho_a = (lo+hi)/2      biên = min(rho-lo, hi-rho)  [đơn vị tuyệt đối]
QT-hình học: rho_g = sqrt(lo*hi)   biên = min(rho/lo, hi/rho)  [đơn vị tỉ lệ]

 D/(NC)    V/X     lo     hi   rho_a  biên_a   rho_g  biên_g
----------------------------------------------------------------------------------------------
   1.25   0.00   0.80   1.00   0.900   0.100   0.894    1.12x
   1.25   0.10   0.80   0.90   0.850   0.050   0.849    1.06x
   1.25   0.20   0.80   0.80   0.800   0.000   0.800    1.00x
   1.25   0.30   0.80   0.70    RONG       -    RONG       -
   1.25   0.40   0.80   0.60    RONG       -    RONG       -
   1.25   0.50   0.80   0.50    RONG       -    RONG       -
   1.50   0.00   0.67   1.00   0.833   0.167   0.816    1.22x
   1.50   0.10   0.67   0.90   0.783   0.117   0.775    1.16x
   1.50   0.20   0.67   0.80   0.733   0.067   0.730    1.10x
   1.50   0.30   0.67   0.70   0.683   0.017   0.683    1.02x
   1.50   0.40   0.67   0.60    RONG       -    RONG       -
   1.50   0.50   0.67   0.50    RONG       -    RONG       -
   2.00   0.00   0.50   1.00   0.750   0.250   0.707    1.41x
   2.00   0.10   0.50   0.90   0.700   0.200   0.671    1.34x
   2.00   0.20   0.50   0.80   0.650   0.150   0.632    1.26x
   2.00   0.30   0.50   0.70   0.600   0.100   0.592    1.18x
   2.00   0.40   0.50   0.60   0.550   0.050   0.548    1.10x
   2.00   0.50   0.50   0.50   0.500   0.000   0.500    1.00x
   3.00   0.00   0.33   1.00   0.667   0.333   0.577    1.73x
   3.00   0.10   0.33   0.90   0.617   0.283   0.548    1.64x
   3.00   0.20   0.33   0.80   0.567   0.233   0.516    1.55x
   3.00   0.30   0.33   0.70   0.517   0.183   0.483    1.45x
   3.00   0.40   0.33   0.60   0.467   0.133   0.447    1.34x
   3.00   0.50   0.33   0.50   0.417   0.083   0.408    1.22x
   5.00   0.00   0.20   1.00   0.600   0.400   0.447    2.24x
   5.00   0.10   0.20   0.90   0.550   0.350   0.424    2.12x
   5.00   0.20   0.20   0.80   0.500   0.300   0.400    2.00x
   5.00   0.30   0.20   0.70   0.450   0.250   0.374    1.87x
   5.00   0.40   0.20   0.60   0.400   0.200   0.346    1.73x
   5.00   0.50   0.20   0.50   0.350   0.150   0.316    1.58x
  10.00   0.00   0.10   1.00   0.550   0.450   0.316    3.16x
  10.00   0.10   0.10   0.90   0.500   0.400   0.300    3.00x
  10.00   0.20   0.10   0.80   0.450   0.350   0.283    2.83x
  10.00   0.30   0.10   0.70   0.400   0.300   0.265    2.65x
  10.00   0.40   0.10   0.60   0.350   0.250   0.245    2.45x
  10.00   0.50   0.10   0.50   0.300   0.200   0.224    2.24x
----------------------------------------------------------------------------------------------
CHỌN QT-hình học. Lý do: cả hai cận là đại lượng TỈ LỆ, không phải mức tuyệt đối.
  - cận dưới N*C/D dịch theo TỈ LỆ khi chi phí nhà cung cấp tăng x%;
  - cận trên 1-V/X dịch theo TỈ LỆ khi giá trị gián tiếp tăng x%.
Biên tuyệt đối 0,10 là rất rộng khi lo=0,10 và rất hẹp khi lo=0,80; biên tỉ lệ
không có tật đó. Nhược: QT-hình học kéo rho về phía cận dưới ⇒ an toàn hơn cho
vế chống farm, khắt khe hơn với nhà cung cấp. Đó là đánh đổi có chủ ý.

==============================================================================================
A3. Cầu tăng dần — epoch nào miền khả thi MỞ RA
==============================================================================================
Giả định (khai rõ): D_0 = 0,25*N*C (miền rỗng), tăng nền 8 %/epoch,
nhiễu log-chuẩn sigma=0,12/epoch, N*C giữ nguyên. 1 epoch = 5 ngày.
Số đường mô phỏng: 400, hạt giống 20260813.

  V/X  trần rho |  E_mở p10  trung vị       p90 |  trung vị (ngày)  không mở
----------------------------------------------------------------------------------------------
 0.00      1.00 |        12      18.0        28 |               90         0
 0.10      0.90 |        12      20.0        32 |              100         0
 0.20      0.80 |        14      22.0        33 |              110         0
 0.30      0.70 |        16      23.0        34 |              115         0
 0.40      0.60 |        18      25.0        37 |              125         0
 0.50      0.50 |        20      28.0        40 |              140         0
----------------------------------------------------------------------------------------------
Đọc: 'E_mở' = epoch đầu tiên mà miền mở và GIỮ mở 5 epoch liên tiếp.
Trước mốc đó, mọi rho hợp lệ đều làm nhà cung cấp lỗ ⇒ phải có S_E (Mô hình D).

==============================================================================================
A4. Kiểm định đối kháng — bơm SUM required mà KHÔNG thật sự mất MAGIC
==============================================================================================
Đặt phi = phần MAGIC đã tính vào SUM nhưng kẻ tấn công LẤY LẠI ĐƯỢC.
Có lãi khi rho*s*X + V >= (1-phi)*X. Xấu nhất s->1 ⇒ trần: rho <= 1 - phi - V/X.

   phi |    V/X=0.00    V/X=0.10    V/X=0.20    V/X=0.30    V/X=0.50
----------------------------------------------------------------------------------------------
  0.00 |        1.00        0.90        0.80        0.70        0.50
  0.05 |        0.95        0.85        0.75        0.65        0.45
  0.10 |        0.90        0.80        0.70        0.60        0.40
  0.25 |        0.75        0.65        0.55        0.45        0.25
  0.50 |        0.50        0.40        0.30        0.20    KHÔNG CÓ
  1.00 |    KHÔNG CÓ    KHÔNG CÓ    KHÔNG CÓ    KHÔNG CÓ    KHÔNG CÓ
----------------------------------------------------------------------------------------------
Ba đường tấn công cụ thể, và phi tương ứng:
  (i)  Tự tiêu vòng tròn giữa hai tài khoản cùng chủ.
       MAGIC bị ĐỐT thật ⇒ phi = 0 ⇒ RE-1 ĐỨNG. Vòng tròn không tạo lại MAGIC;
       kẻ tấn công vẫn mất (1-rho)*X mỗi vòng. Điều kiện phụ: SUM chỉ đếm lượng
       ĐỐT bất khả nghịch, không đếm 'chuyển giữa hai ví'.
  (ii) Hoàn phí / huỷ giao dịch SAU khi đã tính vào SUM.
       phi = tỉ lệ hoàn. Bảng trên: phi=0,25 kéo trần rho từ 1,00 xuống 0,75;
       phi=0,50 xuống 0,50; phi=1,00 ⇒ KHÔNG CÓ rho nào cứu được ⇒ RE-1 SẬP.
       Điều kiện phụ BẮT BUỘC: SUM chốt SAU cửa sổ hoàn phí, hoặc hoàn phí phải
       trừ ngược vào SUM của epoch đang mở.
  (iii) Tính SUM theo giá KHAI thay vì giá THU.
       Giá khai tự do ⇒ phi -> 1 ⇒ RE-1 SẬP HOÀN TOÀN. Điều kiện phụ: SUM lấy từ
       lượng đốt on-chain (consume.ak), KHÔNG lấy từ trường giá do bên gọi khai.
       Đây trùng đúng lỗ đã đo: total_pool do BÊN GỌI tự khai, chỉ chặn bằng
       một trần hằng số (lampnet-mirage/src/bin/lampnet-node.rs:6196-6230,6245,6461
       @HEAD e5d144d).

Khuếch đại 's' do hạng TỰ KHAI (hệ số: lampnet-reward/src/types.rs:70-76;
trường tier nhận từ request: lampnet-node.rs:6268, struct #[derive(Deserialize)]):
kẻ tấn công khai Trusted (1,0) trong khi node thật mới vào là Newbie (0,5).
s = 1,0*c / (1,0*c + 0,5*(1-c)) với c = tỉ phần NĂNG LỰC THẬT.

     c  s (khai gian)  s (khai thật) |     V/X cần @rho=0.3    V/X cần @rho=0.5    V/X cần @rho=0.7
----------------------------------------------------------------------------------------------
  0.05          0.095          0.050 |                0.971               0.952               0.933
  0.10          0.182          0.100 |                0.945               0.909               0.873
  0.20          0.333          0.200 |                0.900               0.833               0.767
  0.35          0.519          0.350 |                0.844               0.741               0.637
  0.50          0.667          0.500 |                0.800               0.667               0.533
  0.80          0.889          0.800 |                0.733               0.556               0.378
  1.00          1.000          1.000 |                0.700               0.500               0.300
----------------------------------------------------------------------------------------------
Đọc: hạng tự khai khuếch đại s tới 2x ở c nhỏ, nhưng s <= 1 theo cấu tạo ⇒ vế
TIỀN TRỰC TIẾP của RE-1 vẫn đứng (rho*s < 1 với mọi rho < 1). Chỗ hạng tự khai
thật sự phá là vế V: hạng tự khai được nhân thẳng vào weighted_score ⇒ mua được
uy tín/thứ hạng bằng 0 đồng ⇒ V/X > 0 mà không đo được. Đó là lý do phải báo HAI
giá trị rho: một cho mã hôm nay, một cho hệ đã vá.

==============================================================================================
A5. SỐ ĐỀ NGHỊ CHỐT — Mô hình A
==============================================================================================
hệ ĐÃ VÁ (V~0, cầu chín D/(N*C)=3)         -> lo=0.33 hi=0.95  rho* = 0.56  (biên tỉ lệ 1.69x)
hệ ĐÃ VÁ, cầu vừa chín D/(N*C)=2           -> lo=0.50 hi=0.95  rho* = 0.69  (biên tỉ lệ 1.38x)
mã HÔM NAY (hạng tự khai ⇒ V/X=0,30)       -> lo=0.33 hi=0.70  rho* = 0.48  (biên tỉ lệ 1.45x)
mã HÔM NAY, thêm rủi ro hoàn phí phi=0,10  -> lo=0.33 hi=0.60  rho* = 0.45  (biên tỉ lệ 1.34x)

Làm tròn XUỐNG lưới 0,05 (xuống, không lên — sai về phía an toàn chống farm):
  rho = 0.55  cho hệ ĐÃ VÁ   (dải còn đúng: 0.34 <= rho <= 0.95)
  rho = 0.45  cho mã HÔM NAY  (dải còn đúng: 0.34 <= rho <= 0.70)
Cả hai đều giả định phi = 0 (SUM chỉ đếm lượng đốt bất khả nghịch). phi > 0
thì trừ thẳng vào trần: trần = 1 - phi - V/X.

###### model_b_deter.py ######
##############################################################################################
MÔ HÌNH B — rho_spot và cửa sổ chi trả W · hạt giống 20260813 · chạy ngày 2026-08-13
##############################################################################################

==============================================================================================
B1. B TUYỆT ĐỐI — gian vì lợi ích NGOÀI hệ (phá đối thủ, nhét dữ liệu giả)
==============================================================================================
R_epoch toàn mạng hôm nay = 0.1 LAMP/epoch (10.000 tác vụ x 10 uLAMP).
Ca thuận lợi nhất cho răn đe: TOÀN BỘ thưởng mạng dồn vào 1 node.
W cần = MARGIN(2x) * B / (R_epoch * rho_spot). 1 epoch = 5 ngày.

  B (LAMP) |         rs=0.01         rs=0.02         rs=0.05         rs=0.10         rs=0.20         rs=0.35         rs=0.50
----------------------------------------------------------------------------------------------
      0.01 |      20.0ep/ 3.3th      10.0ep/ 1.6th       4.0ep/ 0.7th       2.0ep/ 0.3th       1.0ep/ 0.2th       0.6ep/ 0.1th       0.4ep/ 0.1th
      0.10 |       200ep/   3n       100ep/   1n      40.0ep/ 6.6th      20.0ep/ 3.3th      10.0ep/ 1.6th       5.7ep/ 0.9th       4.0ep/ 0.7th
      1.00 |      2000ep/  27n      1000ep/  14n       400ep/   5n       200ep/   3n       100ep/   1n      57.1ep/ 9.4th      40.0ep/ 6.6th
     10.00 |     20000ep/ 274n     10000ep/ 137n      4000ep/  55n      2000ep/  27n      1000ep/  14n       571ep/   8n       400ep/   5n
    100.00 |    200000ep/2740n    100000ep/1370n     40000ep/ 548n     20000ep/ 274n     10000ep/ 137n      5714ep/  78n      4000ep/  55n
   1000.00 |   2000000ep/27397n   1000000ep/13699n    400000ep/5479n    200000ep/2740n    100000ep/1370n     57143ep/ 783n     40000ep/ 548n
----------------------------------------------------------------------------------------------
Đọc: 'ep' = epoch, 'n' = năm, 'th' = tháng.
Tại sàn rho_spot=0.01 và B=1 LAMP: W cần = 2000 epoch = 27.4 năm.
KẾT LUẬN B1: với quy mô thưởng HÔM NAY, răn đe bằng tiền cho loại gian 'lợi ích
ngoài' KHÔNG ĐẠT ĐƯỢC với bất kỳ W hợp lý nào. Kết luận của LampNet ĐÚNG cho cách
đặt B này. Phải dùng công cụ khác: (a) sao chép M-of-N để một node gian không đủ
quyết định kết quả, (b) bằng chứng bên thứ ba ký (RE-5), (c) hạn chế thiệt hại
bằng thiết kế (không để một node đơn lẻ chốt dữ liệu có giá trị pháp lý).

==============================================================================================
B2. B TỈ LỆ — gian để TIẾT KIỆM CHI PHÍ của chính mình (B = b * R_epoch)
==============================================================================================
Điều kiện rút gọn: W * rho_spot > b  ⇒  KHÔNG còn phụ thuộc quy mô tuyệt đối.
Yêu cầu biên 2x: W * rho_spot >= 2b.
b = phần chi phí một epoch tiết kiệm được khi gian, tính theo bội số thu nhập
một epoch. b=0,5: gian bớt được nửa chi phí. b=1,0: bỏ hẳn phần việc.

  b = 0.5
     W |   rs=0.01   rs=0.02   rs=0.05   rs=0.10   rs=0.20   rs=0.35   rs=0.50
----------------------------------------------------------------------------------------------
     1 |     0.0x      0.0x      0.1x      0.2x      0.4x      0.7x      1.0x 
     2 |     0.0x      0.1x      0.2x      0.4x      0.8x      1.4x      2.0x*
     3 |     0.1x      0.1x      0.3x      0.6x      1.2x      2.1x*     3.0x*
     4 |     0.1x      0.2x      0.4x      0.8x      1.6x      2.8x*     4.0x*
     6 |     0.1x      0.2x      0.6x      1.2x      2.4x*     4.2x*     6.0x*
     8 |     0.2x      0.3x      0.8x      1.6x      3.2x*     5.6x*     8.0x*
    12 |     0.2x      0.5x      1.2x      2.4x*     4.8x*     8.4x*    12.0x*
    16 |     0.3x      0.6x      1.6x      3.2x*     6.4x*    11.2x*    16.0x*
    20 |     0.4x      0.8x      2.0x*     4.0x*     8.0x*    14.0x*    20.0x*
    24 |     0.5x      1.0x      2.4x*     4.8x*     9.6x*    16.8x*    24.0x*
    36 |     0.7x      1.4x      3.6x*     7.2x*    14.4x*    25.2x*    36.0x*
    52 |     1.0x      2.1x*     5.2x*    10.4x*    20.8x*    36.4x*    52.0x*
   104 |     2.1x*     4.2x*    10.4x*    20.8x*    41.6x*    72.8x*   104.0x*
----------------------------------------------------------------------------------------------
  b = 1.0
     W |   rs=0.01   rs=0.02   rs=0.05   rs=0.10   rs=0.20   rs=0.35   rs=0.50
----------------------------------------------------------------------------------------------
     1 |     0.0x      0.0x      0.1x      0.1x      0.2x      0.3x      0.5x 
     2 |     0.0x      0.0x      0.1x      0.2x      0.4x      0.7x      1.0x 
     3 |     0.0x      0.1x      0.2x      0.3x      0.6x      1.0x      1.5x 
     4 |     0.0x      0.1x      0.2x      0.4x      0.8x      1.4x      2.0x*
     6 |     0.1x      0.1x      0.3x      0.6x      1.2x      2.1x*     3.0x*
     8 |     0.1x      0.2x      0.4x      0.8x      1.6x      2.8x*     4.0x*
    12 |     0.1x      0.2x      0.6x      1.2x      2.4x*     4.2x*     6.0x*
    16 |     0.2x      0.3x      0.8x      1.6x      3.2x*     5.6x*     8.0x*
    20 |     0.2x      0.4x      1.0x      2.0x*     4.0x*     7.0x*    10.0x*
    24 |     0.2x      0.5x      1.2x      2.4x*     4.8x*     8.4x*    12.0x*
    36 |     0.4x      0.7x      1.8x      3.6x*     7.2x*    12.6x*    18.0x*
    52 |     0.5x      1.0x      2.6x*     5.2x*    10.4x*    18.2x*    26.0x*
   104 |     1.0x      2.1x*     5.2x*    10.4x*    20.8x*    36.4x*    52.0x*
----------------------------------------------------------------------------------------------
  b = 2.0
     W |   rs=0.01   rs=0.02   rs=0.05   rs=0.10   rs=0.20   rs=0.35   rs=0.50
----------------------------------------------------------------------------------------------
     1 |     0.0x      0.0x      0.0x      0.1x      0.1x      0.2x      0.2x 
     2 |     0.0x      0.0x      0.1x      0.1x      0.2x      0.3x      0.5x 
     3 |     0.0x      0.0x      0.1x      0.2x      0.3x      0.5x      0.8x 
     4 |     0.0x      0.0x      0.1x      0.2x      0.4x      0.7x      1.0x 
     6 |     0.0x      0.1x      0.2x      0.3x      0.6x      1.0x      1.5x 
     8 |     0.0x      0.1x      0.2x      0.4x      0.8x      1.4x      2.0x*
    12 |     0.1x      0.1x      0.3x      0.6x      1.2x      2.1x*     3.0x*
    16 |     0.1x      0.2x      0.4x      0.8x      1.6x      2.8x*     4.0x*
    20 |     0.1x      0.2x      0.5x      1.0x      2.0x*     3.5x*     5.0x*
    24 |     0.1x      0.2x      0.6x      1.2x      2.4x*     4.2x*     6.0x*
    36 |     0.2x      0.4x      0.9x      1.8x      3.6x*     6.3x*     9.0x*
    52 |     0.3x      0.5x      1.3x      2.6x*     5.2x*     9.1x*    13.0x*
   104 |     0.5x      1.0x      2.6x*     5.2x*    10.4x*    18.2x*    26.0x*
----------------------------------------------------------------------------------------------
Đọc: ô có dấu * = thoả răn đe với biên >= 2x. Ô không dấu = chưa đủ.
KẾT LUẬN B2: cách đặt B tỉ lệ CỨU ĐƯỢC — vì cả lợi lẫn thiệt đều co theo thu nhập,
quy mô 0,1 LAMP/epoch không còn cản. Ví dụ b=1: W=12 & rho_spot=0,20 cho biên 2,4x.

==============================================================================================
B3. Trò chơi lặp có chiết khấu — kiểm lại B2 bằng Monte-Carlo
==============================================================================================
Điểm mấu chốt: hình phạt phụ thuộc DANH TÍNH CÓ ĐẮT KHÔNG. Mô phỏng hai giả định:
  (a) danh tính ĐẮT  — bị bắt ⇒ loại vĩnh viễn, mất luôn thu nhập tương lai;
  (b) danh tính RẺ   — bị bắt ⇒ CHỈ mất số dư treo, dựng danh tính mới, chạy tiếp.
      (b) đúng với hôm nay: chưa có cổng personhood ⇒ tẩy trắng gần như miễn phí.
Thưởng epoch e được chi ở epoch e+W; bị bắt ở epoch c thì mọi thưởng có e <= c < e+W
bị mất. Gian tiết kiệm b mỗi epoch, nhận NGAY. Chiết khấu r_năm=15 %.
Chuẩn hoá R_epoch = 1. Số đường: 800, chân trời 150 epoch, hạt giống 20260813.
delta/epoch = 0.998087

PV_thật = thu thưởng (trả chậm W) TRỪ chi phí b mỗi epoch. PV_gian = thu thưởng
còn nhận được (phần chưa chi bị mất khi bị bắt), KHÔNG trừ b.

   b    W  rho_spot   PV_thật |  PV_gian(a)  tỉ lệ(a) |  PV_gian(b)  tỉ lệ(b)  răn đe(b)    W*rs
----------------------------------------------------------------------------------------------
 0.2    4      0.01    103.21 |       62.45    0.605x |      120.18    1.164x      KHÔNG    0.04
 0.2    4      0.05    103.21 |       14.56    0.141x |       97.92    0.949x         CÓ    0.20
 0.2    4      0.20    103.21 |        1.82    0.018x |       40.78    0.395x         CÓ    0.80
 0.2    4      0.50    103.21 |        0.11    0.001x |        3.85    0.037x         CÓ    2.00
 0.2   12      0.01    101.25 |       62.24    0.615x |      103.73    1.024x      KHÔNG    0.12
 0.2   12      0.05    101.25 |       10.17    0.100x |       59.80    0.591x         CÓ    0.60
 0.2   12      0.20    101.25 |        0.43    0.004x |        6.45    0.064x         CÓ    2.40
 0.2   12      0.50    101.25 |        0.00    0.000x |        0.01    0.000x         CÓ    6.00
 0.2   24      0.01     98.36 |       52.37    0.532x |       83.35    0.847x         CÓ    0.24
 0.2   24      0.05     98.36 |        5.61    0.057x |       29.72    0.302x         CÓ    1.20
 0.2   24      0.20     98.36 |        0.05    0.000x |        0.65    0.007x         CÓ    4.80
 0.2   24      0.50     98.36 |        0.00    0.000x |        0.00    0.000x         CÓ   12.00
 0.2   52      0.01     91.86 |       31.12    0.339x |       47.54    0.517x         CÓ    0.52
 0.2   52      0.05     91.86 |        1.74    0.019x |        4.97    0.054x         CÓ    2.60
 0.2   52      0.20     91.86 |        0.00    0.000x |        0.00    0.000x         CÓ   10.40
 0.2   52      0.50     91.86 |        0.00    0.000x |        0.00    0.000x         CÓ   26.00
 0.5    4      0.01     64.14 |       65.05    1.014x |      120.06    1.872x      KHÔNG    0.04
 0.5    4      0.05     64.14 |       15.74    0.245x |       97.74    1.524x      KHÔNG    0.20
 0.5    4      0.20     64.14 |        2.17    0.034x |       41.42    0.646x         CÓ    0.80
 0.5    4      0.50     64.14 |        0.10    0.002x |        3.88    0.060x         CÓ    2.00
 0.5   12      0.01     62.17 |       61.05    0.982x |      103.22    1.660x      KHÔNG    0.12
 0.5   12      0.05     62.17 |       11.24    0.181x |       61.25    0.985x         CÓ    0.60
 0.5   12      0.20     62.17 |        0.31    0.005x |        6.87    0.110x         CÓ    2.40
 0.5   12      0.50     62.17 |        0.00    0.000x |        0.02    0.000x         CÓ    6.00
 0.5   24      0.01     59.28 |       50.27    0.848x |       84.67    1.428x      KHÔNG    0.24
 0.5   24      0.05     59.28 |        4.90    0.083x |       29.42    0.496x         CÓ    1.20
 0.5   24      0.20     59.28 |        0.02    0.000x |        0.49    0.008x         CÓ    4.80
 0.5   24      0.50     59.28 |        0.00    0.000x |        0.00    0.000x         CÓ   12.00
 0.5   52      0.01     52.79 |       31.78    0.602x |       47.53    0.900x         CÓ    0.52
 0.5   52      0.05     52.79 |        1.63    0.031x |        5.53    0.105x         CÓ    2.60
 0.5   52      0.20     52.79 |        0.00    0.000x |        0.00    0.000x         CÓ   10.40
 0.5   52      0.50     52.79 |        0.00    0.000x |        0.00    0.000x         CÓ   26.00
 0.8    4      0.01     25.06 |       64.09    2.558x |      120.04    4.790x      KHÔNG    0.04
 0.8    4      0.05     25.06 |       15.95    0.637x |       97.38    3.886x      KHÔNG    0.20
 0.8    4      0.20     25.06 |        1.92    0.077x |       41.56    1.659x      KHÔNG    0.80
 0.8    4      0.50     25.06 |        0.13    0.005x |        4.11    0.164x         CÓ    2.00
 0.8   12      0.01     23.09 |       59.05    2.557x |      104.60    4.530x      KHÔNG    0.12
 0.8   12      0.05     23.09 |       10.03    0.434x |       59.58    2.580x      KHÔNG    0.60
 0.8   12      0.20     23.09 |        0.26    0.011x |        6.44    0.279x         CÓ    2.40
 0.8   12      0.50     23.09 |        0.00    0.000x |        0.02    0.001x         CÓ    6.00
 0.8   24      0.01     20.20 |       51.70    2.559x |       82.53    4.085x      KHÔNG    0.24
 0.8   24      0.05     20.20 |        5.52    0.273x |       29.12    1.442x      KHÔNG    1.20
 0.8   24      0.20     20.20 |        0.02    0.001x |        0.46    0.023x         CÓ    4.80
 0.8   24      0.50     20.20 |        0.00    0.000x |        0.00    0.000x         CÓ   12.00
 0.8   52      0.01     13.71 |       30.96    2.258x |       46.44    3.388x      KHÔNG    0.52
 0.8   52      0.05     13.71 |        0.89    0.065x |        5.62    0.410x         CÓ    2.60
 0.8   52      0.20     13.71 |        0.00    0.000x |        0.00    0.000x         CÓ   10.40
 0.8   52      0.50     13.71 |        0.00    0.000x |        0.00    0.000x         CÓ   26.00
----------------------------------------------------------------------------------------------
Đọc: 'răn đe(b) CÓ' = PV(gian) < PV(thật) khi danh tính RẺ.
Cột (a) răn đe được ở hầu hết ô — nhưng chỉ vì giả định danh tính ĐẮT, thứ hệ hôm
nay KHÔNG có. Cột (b) mới là mức răn đe thật.

Dạng đóng của cột (b): thưởng epoch e chỉ tới tay nếu không bị bắt trong W epoch
kế tiếp ⇒ tỉ lệ nhận được = (1-rho_spot)^W. Răn đe ⟺ (1-rho_spot)^W < 1-b
⟺ W*rho_spot > -ln(1-b)  (xấp xỉ rho_spot nhỏ).
So với điều kiện TĨNH của đặc tả (W*rho_spot > b) thì ngưỡng đúng LỚN HƠN, và
chênh càng lớn khi b tiến tới 1. Kiểm số:

     b   ngưỡng tĩnh (=b)   ngưỡng tẩy trắng    chênh |    MC đo được (W=12)
----------------------------------------------------------------------------------------------
  0.20              0.200              0.223    1.12x |       0.24 (rs=0.02)
  0.50              0.500              0.693    1.39x |       0.60 (rs=0.05)
  0.80              0.800              1.609    2.01x |       1.44 (rs=0.12)
  0.90              0.900              2.303    2.56x |       2.16 (rs=0.18)
  0.95              0.950              2.996    3.15x |       2.88 (rs=0.24)
  0.99              0.990              4.605    4.65x |         PV_thật <= 0
----------------------------------------------------------------------------------------------
Kết luận B3: điều kiện đúng để chốt W và rho_spot là  W*rho_spot >= 2 * (-ln(1-b)),
KHÔNG phải W*rho_spot >= 2b. Với b >= 1 (gian bỏ được toàn bộ chi phí) thì
-ln(1-b) phân kỳ ⇒ KHÔNG CÓ W nào răn đe nổi khi danh tính còn rẻ.

==============================================================================================
B4. Đánh đổi ba chi phí — chọn (W, rho_spot) rẻ nhất trong số ô ĐẠT răn đe
==============================================================================================
Ba chi phí, đều chuẩn hoá theo doanh thu một epoch (GIẢ ĐỊNH: cộng ngang trọng số 1):
  1. chi phí kiểm  = k_a * rho_spot, k_a = 1,0
     (giả định của đặc tả: một lần kiểm tốn bằng ~1 lần thực thi lại tác vụ)
  2. chi phí vốn   = 1 - (1+r)^(-W), r = suất chiết khấu MỖI EPOCH
  3. chi phí rời bỏ = 1 - exp(-W/W0), W0 = hằng chịu đựng treo tiền (epoch)
Lọc: dùng ngưỡng ĐÚNG của B3 — giữ ô có W*rho_spot >= 2*(-ln(1-b)) = 1.386, với b = 0.5.

  r_năm=5%  W0=6 epoch  (r/epoch=0.00067)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0027   0.4866   0.8393
        2     3      0.50   0.5000   0.0020   0.3935   0.8955
        3     8      0.20   0.2000   0.0053   0.7364   0.9417
        4     6      0.35   0.3500   0.0040   0.6321   0.9861
        5     4      0.50   0.5000   0.0027   0.4866   0.9893

  r_năm=5%  W0=12 epoch  (r/epoch=0.00067)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0027   0.2835   0.6361
        2     8      0.20   0.2000   0.0053   0.4866   0.6919
        3     3      0.50   0.5000   0.0020   0.2212   0.7232
        4     6      0.35   0.3500   0.0040   0.3935   0.7475
        5     4      0.50   0.5000   0.0027   0.2835   0.7861

  r_năm=5%  W0=24 epoch  (r/epoch=0.00067)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     8      0.20   0.2000   0.0053   0.2835   0.4888
        2     4      0.35   0.3500   0.0027   0.1535   0.5062
        3     6      0.35   0.3500   0.0040   0.2212   0.5752
        4    16      0.10   0.1000   0.0106   0.4866   0.5972
        5    12      0.20   0.2000   0.0080   0.3935   0.6015

  r_năm=15%  W0=6 epoch  (r/epoch=0.00192)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0076   0.4866   0.8442
        2     3      0.50   0.5000   0.0057   0.3935   0.8992
        3     8      0.20   0.2000   0.0152   0.7364   0.9516
        4     6      0.35   0.3500   0.0114   0.6321   0.9935
        5     4      0.50   0.5000   0.0076   0.4866   0.9942

  r_năm=15%  W0=12 epoch  (r/epoch=0.00192)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0076   0.2835   0.6411
        2     8      0.20   0.2000   0.0152   0.4866   0.7018
        3     3      0.50   0.5000   0.0057   0.2212   0.7269
        4     6      0.35   0.3500   0.0114   0.3935   0.7549
        5     4      0.50   0.5000   0.0076   0.2835   0.7911

  r_năm=15%  W0=24 epoch  (r/epoch=0.00192)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     8      0.20   0.2000   0.0152   0.2835   0.4987
        2     4      0.35   0.3500   0.0076   0.1535   0.5111
        3     6      0.35   0.3500   0.0114   0.2212   0.5826
        4    12      0.20   0.2000   0.0227   0.3935   0.6162
        5    16      0.10   0.1000   0.0302   0.4866   0.6168

  r_năm=30%  W0=6 epoch  (r/epoch=0.00360)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0143   0.4866   0.8509
        2     3      0.50   0.5000   0.0107   0.3935   0.9042
        3     8      0.20   0.2000   0.0283   0.7364   0.9647
        4     4      0.50   0.5000   0.0143   0.4866   1.0009
        5     6      0.35   0.3500   0.0213   0.6321   1.0035

  r_năm=30%  W0=12 epoch  (r/epoch=0.00360)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     4      0.35   0.3500   0.0143   0.2835   0.6477
        2     8      0.20   0.2000   0.0283   0.4866   0.7149
        3     3      0.50   0.5000   0.0107   0.2212   0.7319
        4     6      0.35   0.3500   0.0213   0.3935   0.7648
        5     4      0.50   0.5000   0.0143   0.2835   0.7977

  r_năm=30%  W0=24 epoch  (r/epoch=0.00360)  · số ô đạt răn đe: 39
     hạng     W  rho_spot   c_kiểm    c_vốn    c_rời     TỔNG
        1     8      0.20   0.2000   0.0283   0.2835   0.5118
        2     4      0.35   0.3500   0.0143   0.1535   0.5178
        3     6      0.35   0.3500   0.0213   0.2212   0.5925
        4     3      0.50   0.5000   0.0107   0.1175   0.6282
        5    12      0.20   0.2000   0.0422   0.3935   0.6357

----------------------------------------------------------------------------------------------
Đọc: nghiệm rẻ nhất luôn là ô có W NHỎ NHẤT còn thoả ngưỡng, vì chi phí kiểm tăng
TUYẾN TÍNH theo rho_spot còn chi phí rời bỏ tăng theo hàm mũ bão hoà theo W.
⇒ đổi 'treo tiền lâu' lấy 'kiểm dày' là đúng chiều, tới khi rho_spot đắt hơn.

==============================================================================================
B5. SỐ ĐỀ NGHỊ CHỐT — Mô hình B
==============================================================================================
    b  ngưỡng W*rs   W*  rho_spot*  ngày treo   chi phí    biên
----------------------------------------------------------------------------------------------
  0.2        0.446    3       0.20         15    0.4269    2.7x
  0.5        1.386    4       0.35         20    0.6411    2.0x
  0.8        3.219    8       0.50         40    1.0018    2.5x
----------------------------------------------------------------------------------------------
(r_năm=15 % · W0=12 epoch · lưới W in {1..104}, rho_spot in {0,01..0,50})

Dải còn đúng — cặp (W, rho_spot) tối thiểu cho b = 0,5 (ngưỡng W*rs >= 1.386):
  W =   4 epoch ( 20 ngày) ⇒ rho_spot cần >= 0.347
  W =   6 epoch ( 30 ngày) ⇒ rho_spot cần >= 0.231
  W =   8 epoch ( 40 ngày) ⇒ rho_spot cần >= 0.173
  W =  12 epoch ( 60 ngày) ⇒ rho_spot cần >= 0.116
  W =  16 epoch ( 80 ngày) ⇒ rho_spot cần >= 0.087
  W =  24 epoch (120 ngày) ⇒ rho_spot cần >= 0.058

Sàn hiện hành rho_spot = 0.01 (params.rs:43) đòi W >= 139 epoch = 1.9 năm
⇒ SÀN HIỆN HÀNH KHÔNG ĐỦ RĂN ĐE kể cả cho loại gian 'tiết kiệm chi phí'. Phải nâng
rho_spot cho tác vụ CÓ THƯỞNG, hoặc chấp nhận treo tiền hàng năm — không có đường thứ ba.

KHÔNG KẾT LUẬN ĐƯỢC: giá trị b thật của từng tài nguyên (storage/compute/bandwidth/
sensing) — nó là tỉ lệ chi phí biên tránh được trên doanh thu biên của node, chưa có
phép đo nào trong mã. Bảng trên quét b in {0,2 · 0,5 · 0,8}, không chốt được một b.

###### model_c_alpha.py ######
####################################################################################################
MÔ HÌNH C — hệ số alpha (RE-7) · hạt giống 20260813 · chạy ngày 2026-08-13
####################################################################################################

RÀNG BUỘC CỨNG ĐI TRƯỚC MỌI CON SỐ DƯỚI ĐÂY:
  Không có thách thức ngẫu nhiên ⟹ alpha = 0. Hôm nay STORAGE có PoR; COMPUTE,
  BANDWIDTH, SENSING chưa có ⟹ alpha = 0 cho ba loại đó, không phải ca biên.
  Bảng dưới trả lời câu 'alpha nên bằng bao nhiêu KHI đã có thách thức'.

====================================================================================================
C1. Cầu Poisson bùng nổ (90 % nền lam=100, 10 % đỉnh lam=400)
====================================================================================================
Mẫu cầu: n=20000  E[d]=138.4  trung vị=104.7  p95=397.7  p99=628.7
rho=0.55  p=1.0  C/(rho*p)=0.3  ⇒ C=0.1650/đơn vị năng lực/epoch

Năng lực tối ưu xã hội (P(d>k)=C/p=0.165): K_soc=169.1, thặng dư=82.72

 alpha       K*   omega   phục vụ  u=đã dùng  chi/phục vụ  trả cho rỗi  ăn không/thật  MT-đặc tả  thặng dư
----------------------------------------------------------------------------------------------------
  0.00    132.1  0.4264    0.7402     0.7753       0.2128       0.0000         0.000x    -0.2598     80.62
  0.05    136.9  0.4171    0.7501     0.7583       0.2176       0.0121         0.083x    -0.2723     81.20
  0.10    142.0  0.4073    0.7598     0.7405       0.2228       0.0260         0.168x    -0.2872     81.70
  0.15    148.0  0.3961    0.7701     0.7201       0.2291       0.0420         0.257x    -0.3065     82.14
  0.20    154.9  0.3835    0.7808     0.6974       0.2366       0.0605         0.351x    -0.3309     82.48
  0.25    163.9  0.3682    0.7931     0.6694       0.2465       0.0827         0.453x    -0.3650     82.69
  0.30    174.3  0.3516    0.8055     0.6393       0.2581       0.1082         0.565x    -0.4071     82.69
  0.35    187.2  0.3330    0.8190     0.6052       0.2726       0.1382         0.694x    -0.4620     82.42
  0.40    202.4  0.3131    0.8330     0.5693       0.2898       0.1723         0.846x    -0.5288     81.85
  0.45    219.5  0.2937    0.8470     0.5340       0.3090       0.2097         1.027x    -0.6048     80.99
  0.50    238.8  0.2749    0.8615     0.4993       0.3305       0.2506         1.254x    -0.6913     79.81
  0.55    258.6  0.2577    0.8754     0.4684       0.3522       0.2924         1.530x    -0.7796     78.46
  0.60    277.5  0.2431    0.8878     0.4426       0.3728       0.3340         1.860x    -0.8637     77.05
----------------------------------------------------------------------------------------------------
[MT-đặc tả]  (phục vụ - chi phí chuẩn hoá) tối đa tại alpha = 0.00  ⇒ K*=132.1, phục vụ 74.02 %
[thặng dư]   (giá trị phục vụ - chi phí năng lực) tối đa tại alpha = 0.25  ⇒ K*=163.9, phục vụ 79.31 %, thặng dư 82.69 / 82.72 tối ưu = 100.0 %
             alpha=0 cho thặng dư 80.62 = 97.5 % tối ưu.
Cột 'ăn không/thật' = tiền một node khai khống (năng lực 0, chi phí 0) hưởng mỗi epoch,
chia cho LỢI NHUẬN một node thật cùng quy mô. > 1 nghĩa là khai khống lãi hơn làm thật.

====================================================================================================
C1. Cầu log-chuẩn đuôi dày (sigma=0,80, E[d]=130)
====================================================================================================
Mẫu cầu: n=20000  E[d]=130.3  trung vị=94.2  p95=347.1  p99=630.0
rho=0.55  p=1.0  C/(rho*p)=0.3  ⇒ C=0.1650/đơn vị năng lực/epoch

Năng lực tối ưu xã hội (P(d>k)=C/p=0.165): K_soc=203.4, thặng dư=73.73

 alpha       K*   omega   phục vụ  u=đã dùng  chi/phục vụ  trả cho rỗi  ăn không/thật  MT-đặc tả  thặng dư
----------------------------------------------------------------------------------------------------
  0.00    143.8  0.3590    0.7205     0.6527       0.2528       0.0000         0.000x    -0.2795     70.15
  0.05    150.0  0.3509    0.7342     0.6379       0.2586       0.0181         0.094x    -0.2890     70.92
  0.10    156.3  0.3427    0.7476     0.6231       0.2648       0.0377         0.193x    -0.3001     71.61
  0.15    163.2  0.3342    0.7610     0.6076       0.2716       0.0589         0.296x    -0.3134     72.23
  0.20    170.8  0.3251    0.7748     0.5911       0.2792       0.0818         0.406x    -0.3296     72.77
  0.25    179.2  0.3155    0.7888     0.5737       0.2876       0.1066         0.524x    -0.3491     73.21
  0.30    188.5  0.3054    0.8030     0.5552       0.2972       0.1334         0.653x    -0.3726     73.54
  0.35    198.8  0.2947    0.8174     0.5358       0.3079       0.1625         0.795x    -0.4008     73.71
  0.40    209.4  0.2842    0.8307     0.5170       0.3192       0.1931         0.953x    -0.4318     73.70
  0.45    222.2  0.2726    0.8453     0.4957       0.3329       0.2269         1.140x    -0.4715     73.48
  0.50    235.3  0.2615    0.8586     0.4755       0.3470       0.2622         1.355x    -0.5142     73.05
  0.55    249.2  0.2504    0.8711     0.4554       0.3623       0.2994         1.611x    -0.5621     72.38
  0.60    264.1  0.2396    0.8829     0.4356       0.3788       0.3388         1.928x    -0.6156     71.46
----------------------------------------------------------------------------------------------------
[MT-đặc tả]  (phục vụ - chi phí chuẩn hoá) tối đa tại alpha = 0.00  ⇒ K*=143.8, phục vụ 72.05 %
[thặng dư]   (giá trị phục vụ - chi phí năng lực) tối đa tại alpha = 0.35  ⇒ K*=198.8, phục vụ 81.74 %, thặng dư 73.71 / 73.73 tối ưu = 100.0 %
             alpha=0 cho thặng dư 70.15 = 95.1 % tối ưu.
Cột 'ăn không/thật' = tiền một node khai khống (năng lực 0, chi phí 0) hưởng mỗi epoch,
chia cho LỢI NHUẬN một node thật cùng quy mô. > 1 nghĩa là khai khống lãi hơn làm thật.

====================================================================================================
C2. Kẻ ăn không khi thách thức chỉ bắt được với xác suất rho_spot
====================================================================================================
Kẻ khai khống hưởng alpha*omega*k mỗi epoch, chi phí 0, tới khi trượt thách thức.
Số epoch sống trung bình = 1/rho_spot. Tổng ăn được = alpha*omega*k/rho_spot.
So với LỢI NHUẬN một node thật cùng quy mô trong CÙNG số epoch đó.

 alpha |     rs=0.01     rs=0.05     rs=0.20     rs=0.50     rs=1.00
----------------------------------------------------------------------------------------------------
  0.05 |       0.08x       0.08x       0.08x       0.08x       0.08x
  0.10 |       0.17x       0.17x       0.17x       0.17x       0.17x
  0.20 |       0.35x       0.35x       0.35x       0.35x       0.35x
  0.30 |       0.57x       0.57x       0.57x       0.57x       0.57x
  0.40 |       0.85x       0.85x       0.85x       0.85x       0.85x
  0.60 |       1.86x       1.86x       1.86x       1.86x       1.86x
----------------------------------------------------------------------------------------------------
Đọc: tỉ số KHÔNG phụ thuộc rho_spot (cả hai vế cùng nhân 1/rho_spot) — nghĩa là
thách thức thưa KHÔNG làm kẻ ăn không lãi hơn TÍNH TRÊN MỘT ĐỜI NODE, nhưng nó kéo
dài đời node ⇒ tổng thiệt hại tuyệt đối tỉ lệ 1/rho_spot. Con số phải đọc cùng B5.
Điều chặn kẻ ăn không KHÔNG phải rho_spot, mà là: retainer chỉ trả cho năng lực ĐÃ
QUA thách thức (RE-7) ⇒ khai khống nhận 0 ngay từ epoch đầu, không phải chờ bị bắt.

====================================================================================================
C3. Độ nhạy theo chi phí C/(rho*p) và theo rho — alpha* tối đa hoá THẶNG DƯ
====================================================================================================
alpha sinh ra để bù đúng phần THIẾU HỤT NĂNG LỰC do rho < 1 gây ra:
  tối ưu xã hội đòi P(d>k) = C/p ; cân bằng alpha=0 chỉ cho P(d>k) = C/(rho*p).

  rho  C/(rho*p)  alpha*    K*(a*)    K_soc  phục vụ(a*)  phục vụ(a=0)  %thặng dư(a*)  %thặng dư(a=0)
----------------------------------------------------------------------------------------------------
 0.35       0.20    0.40     324.4    334.2       0.9150        0.7812         100.0%           93.6%
 0.35       0.30    0.45     219.5    227.2       0.8470        0.7402         100.0%           94.0%
 0.35       0.50    0.60     154.5    164.4       0.7802        0.6624          99.8%           90.5%
 0.55       0.20    0.20     212.2    217.7       0.8411        0.7812         100.0%           97.8%
 0.55       0.30    0.25     163.9    169.1       0.7931        0.7402         100.0%           97.5%
 0.55       0.50    0.45     135.1    137.0       0.7466        0.6624         100.0%           95.0%
 0.75       0.20    0.10     175.8    176.9       0.8071        0.7812         100.0%           99.4%
 0.75       0.30    0.15     147.9    148.2       0.7700        0.7402         100.0%           99.2%
 0.75       0.50    0.30     121.6    120.3       0.7150        0.6624         100.0%           98.2%
 0.95       0.20    0.00     155.2    159.2       0.7812        0.7812         100.0%          100.0%
 0.95       0.30    0.05     136.9    134.9       0.7501        0.7402         100.0%          100.0%
 0.95       0.50    0.05     107.0    107.7       0.6706        0.6624         100.0%           99.9%
----------------------------------------------------------------------------------------------------
Đọc: rho càng thấp (thuế chống farm càng nặng) thì thiếu hụt năng lực càng lớn và
alpha* càng cao — hai tham số này KHÔNG độc lập, phải chốt cùng nhau.

====================================================================================================
C4. SỐ ĐỀ NGHỊ CHỐT — Mô hình C
====================================================================================================
Poisson bùng nổ  : alpha*[thặng dư] = 0.25 (đạt 100.0 % thặng dư tối ưu; alpha=0 đạt 97.5 %)
                   alpha*[MT-đặc tả] = 0.00
Log-chuẩn đuôi dày: alpha*[thặng dư] = 0.35 (đạt 100.0 % thặng dư tối ưu; alpha=0 đạt 95.1 %)
                    alpha*[MT-đặc tả] = 0.00

HAI MỤC TIÊU CHO HAI KẾT QUẢ KHÁC NHAU — phải nói rõ, không được giấu:
  · Mục tiêu ĐÚNG NHƯ ĐẶC TẢ VIẾT (phục vụ - chi phí/đơn vị chuẩn hoá) luôn chọn
    alpha = 0, vì nó trừ chi phí trên MỘT đơn vị phục vụ: tăng năng lực luôn làm
    hiệu suất giảm ⇒ số bị trừ luôn tăng. Mục tiêu này thiên vị alpha=0 theo cấu tạo.
  · Mục tiêu THẶNG DƯ (giá trị phục vụ - chi phí năng lực) mới nói được alpha để
    làm gì: bù phần thiếu hụt năng lực do chính rho<1 gây ra.

KHÔNG KẾT LUẬN ĐƯỢC: giá một đơn vị phục vụ ở ĐỈNH so với ở nền. Mô hình định giá
mọi đơn vị BẰNG NHAU (p=1). Nếu trượt đỉnh làm mất khách vĩnh viễn hoặc kích hoạt
phạt SLA thì alpha* cao hơn số trên. Muốn chốt alpha thì phải đo cái đó trước.

RÀNG BUỘC PHỦ LÊN MỌI SỐ TRÊN: alpha chỉ được > 0 khi thách thức ngẫu nhiên chạy
thật. Cột 'ăn không/thật' cho thấy vì sao: ở alpha=0,45 trở lên, node khai khống
(năng lực 0, chi phí 0) đã ăn nhiều hơn LỢI NHUẬN của node thật cùng quy mô.

###### model_d_subsidy.py ######
################################################################################################
MÔ HÌNH D — trợ giá khởi động S_E (RE-2) · hạt giống 20260813 · chạy ngày 2026-08-13
################################################################################################

================================================================================================
D1. Ba kịch bản cầu và đường S_E = max(0, N*C - rho*D_E)
================================================================================================
rho=0.55  ·  N*C=1.0 (chuẩn hoá)  ·  D_target=7.27 (tức rho*D_target = 4.0*N*C)
Dạng hàm: D_E = D_target*(1 - exp(-E/tau)) * exp(N(0; 0,15)).
tau: chậm=60 epoch · trung bình=24 · nhanh=8. 200 đường mỗi kịch bản, 300 epoch, hạt giống 20260813.

    kịch bản   E tự nuôi nổi     S_1    S_10    S_24    S_52   TỔNG tích luỹ   p95 tổng
------------------------------------------------------------------------------------------------
        chậm        16 epoch   0.925   0.480   0.000   0.000            7.86       8.49
  trung bình         7 epoch   0.867   0.000   0.000   0.000            2.85       3.19
       nhanh         3 epoch   0.619   0.000   0.000   0.000            0.66       0.90
------------------------------------------------------------------------------------------------
Đọc: 'E tự nuôi nổi' = epoch đầu tiên rho*D_E >= N*C (trung vị). S_E in đơn vị N*C.
'TỔNG tích luỹ' = tổng S_E qua 300 epoch, đơn vị 'N*C mỗi epoch' — tức là bằng bao
nhiêu epoch chi phí toàn mạng. p95 = kịch bản xui (nhiễu bất lợi).

================================================================================================
D2. Lịch suy giảm CÔNG KHAI, TẤT ĐỊNH — trần cứng cho tổng trợ giá
================================================================================================
Lịch đề nghị: S_E^trần = S_0 * gamma^(E-1), tổng vô hạn = S_0/(1-gamma).
Tất định ⇒ ai cũng tính trước được; không phụ thuộc số liệu tự khai của bất kỳ ai.
Thực chi: S_E = min(S_E^trần, max(0, N*C - rho*D_E)) — trả ĐÚNG phần thiếu, có mũ chặn.

Nhu cầu tổng ở kịch bản XẤU NHẤT (chậm, p95) = 8.49 đơn vị N*C.

Quy tắc chọn: trần nhỏ NHẤT mà vẫn phủ kịch bản xấu nhất với biên >= 2x.
Biên này là biên MÔ HÌNH, không phải biên tài chính: dạng hàm tăng trưởng cầu là
giả định, sai dạng thì nhu cầu lệch. Trần lớn hơn KHÔNG tốn thêm (thực chi vẫn là
min(trần, thiếu hụt)), nhưng nó nới đúng phần kẻ khai khống rút được ở D3.

   S_0   gamma   tổng trần  nửa đời (epoch)    ngày   biên/xấu nhất    đạt?
------------------------------------------------------------------------------------------------
  1.00    0.90       10.00              6.6      33           1.18x   không
  1.00    0.95       20.00             13.5      68           2.36x      CÓ
  1.00    0.97       33.33             22.8     114           3.93x      CÓ
  1.00    0.98       50.00             34.3     172           5.89x      CÓ
  1.00    0.99      100.00             69.0     345          11.78x      CÓ
  1.50    0.90       15.00              6.6      33           1.77x   không
  1.50    0.95       30.00             13.5      68           3.53x      CÓ
  1.50    0.97       50.00             22.8     114           5.89x      CÓ
  1.50    0.98       75.00             34.3     172           8.84x      CÓ
  1.50    0.99      150.00             69.0     345          17.67x      CÓ
------------------------------------------------------------------------------------------------
Chọn: S_0=1.0, gamma=0.95, trần tổng = 20.00 đơn vị N*C (biên 2.36x trên nhu cầu xấu nhất).
Kiểm lại thực chi dưới lịch đó (trung bình trên các đường):

    kịch bản   thực chi tổng    % trần   epoch cuối còn chi
------------------------------------------------------------------------------------------------
        chậm            7.86     39.3%                   27
  trung bình            2.86     14.3%                   11
       nhanh            0.68      3.4%                    3
------------------------------------------------------------------------------------------------

================================================================================================
D3. RE-2b — trợ giá trả theo năng lực TỰ KHAI: kẻ tấn công rút được bao nhiêu
================================================================================================
Nếu S_E chia theo NĂNG LỰC TỰ KHAI (hôm nay: total_pool và tier đều tự khai —
lampnet-node.rs:6196-6230,6245,6461 và :6268 · lampnet-reward/src/types.rs:70-76), thì chi phí
khai khống ~ 0 và kẻ tấn công chỉ cần khai đủ lớn để chiếm tỉ phần f.

Trần tổng trợ giá = 20.00 đơn vị N*C (từ D2).

     f   không thách thức   rho_c=0,05   rho_c=0,20   rho_c=0,50   rho_c=1,00
------------------------------------------------------------------------------------------------
  0.10              2.00        1.28        0.45        0.19        0.10
  0.30              6.00        3.85        1.36        0.58        0.30
  0.50             10.00        6.42        2.26        0.97        0.50
  0.90             18.00       11.55        4.07        1.75        0.90
  0.99             19.80       12.70        4.48        1.93        0.99
------------------------------------------------------------------------------------------------
(lịch trần dùng ở đây: S_0=1.0, gamma=0.95; tổng 20.00 đơn vị N*C)
Đọc: cột 2 = KHÔNG có thách thức ⇒ kẻ tấn công rút ĐÚNG tỉ phần khai của TOÀN BỘ
trần, cho tới khi trần cạn. f=0,90 ⇒ nuốt 90 % quỹ khởi động. Đây chính là lý do
RE-2b tồn tại, và giờ có con số: THIỆT HẠI TỐI ĐA = f * trần tổng.
Cột có thách thức: thiệt hại bị chặn ở ~f * (1/rho_c) epoch trần đầu tiên, tức
giảm theo 1/rho_c: rho_c=0,20 ⇒ chỉ ăn được phần trần của ~5 epoch đầu.

================================================================================================
D4. Quy đổi ra LAMP — trần tổng theo từng mức N*C
================================================================================================
N*C = tổng chi phí vận hành TẤT CẢ nhà cung cấp trong MỘT epoch, tính bằng LAMP.
Đây là đại lượng CHƯA ĐO ĐƯỢC. Neo duy nhất có thật để so: trần thưởng compute
toàn mạng hôm nay = 0,1 LAMP/epoch (10.000 tác vụ x 10 uLAMP).

  N*C (LAMP/epoch)     trần tổng (LAMP)      % của 36 tỷ                      ghi chú
------------------------------------------------------------------------------------------------
               0.1                  2.0        0.000000%      = quy mô thưởng HÔM NAY
               1.0                 20.0        0.000000%                             
              10.0                200.0        0.000001%                             
             100.0              2,000.0        0.000006%                             
           1,000.0             20,000.0        0.000056%                             
          10,000.0            200,000.0        0.000556%                             
         100,000.0          2,000,000.0        0.005556%                             
       1,000,000.0         20,000,000.0        0.055556%                             
------------------------------------------------------------------------------------------------
Đọc ngược: muốn trần trợ giá KHÔNG vượt X % nguồn cung thì N*C phải dưới:
  X =  0.01 % ⇒ N*C <=         180,000 LAMP/epoch (=    1,800,000 lần quy mô thưởng hôm nay)
  X =  0.10 % ⇒ N*C <=       1,800,000 LAMP/epoch (=   18,000,000 lần quy mô thưởng hôm nay)
  X =  1.00 % ⇒ N*C <=      18,000,000 LAMP/epoch (=  180,000,000 lần quy mô thưởng hôm nay)

KHÔNG KẾT LUẬN ĐƯỢC: một con số LAMP tuyệt đối cho trần S_E. Nó là tích của một
hằng số ĐO ĐƯỢC ở D2 (trần = 20 đơn vị N*C) với một đại lượng CHƯA ĐO (N*C tính
bằng LAMP). Phần đo được thì đã đo; phần chưa đo thì không bịa.

================================================================================================
D5. SỐ ĐỀ NGHỊ CHỐT — Mô hình D
================================================================================================
Lịch trợ giá: S_E^trần = 1.0 * 0.95^(E-1) đơn vị N*C, công bố trước, tất định.
Trần tổng cứng: SUM_E S_E <= 20 * N*C  (= 20 epoch chi phí toàn mạng).
Nửa đời của lịch: 14 epoch = 68 ngày.
Thực chi: S_E = min(trần_E, max(0, N*C - rho*D_E)) — ĐÚNG phần thiếu, không hơn.

Dải còn đúng: trần 20*N*C phủ được nhu cầu 8.49*N*C của kịch bản cầu chậm
nhất đã thử (tau=60 epoch = 300 ngày để đạt 63 % cầu chín) ở phân vị 95 của
nhiễu — biên 2.36x. Cầu chậm hơn nữa ⇒ trần này KHÔNG đủ, và đó là chủ ý:
trần cứng phải CẮT, không được nới. Nới trần = quay về phát hành thuần (RE-2).

Giả định mà nếu sai thì số này sai:
  1. rho = 0,55. rho thấp hơn ⇒ nhu cầu trợ giá cao hơn ĐÚNG TỈ LỆ 1/rho.
  2. D_target = 4*N*C/rho. Cầu chín thấp hơn ⇒ trợ giá không bao giờ tắt được.
  3. Trợ giá chỉ trả cho năng lực ĐÃ QUA THÁCH THỨC (RE-2b). Nếu trả theo tự khai
     thì D3 cho thấy tối đa 99 % trần rơi vào tay kẻ khai khống.

###### model_e_tier.py ######
################################################################################################
MÔ HÌNH E — hệ số hạng thay cho 0,5 / 0,75 / 1,0 · hạt giống 20260813 · chạy ngày 2026-08-13
################################################################################################

================================================================================================
E1. Hệ số dẫn từ tổn thất kỳ vọng: w_i = [(1-q_i) - q_i*L] / [(1-q_T) - q_T*L]
================================================================================================
q_T (Trusted) = 0,005 cố định trong bảng này. Quét q_N (Newbie) và L.
q_C (Contributor) = trung bình HÌNH HỌC của q_N và q_T — giả định: leo hạng giảm
lỗi theo bậc nhân, không theo bậc cộng.

  L = 0 (một lần hỏng tốn 0 lần giá một đơn vị công việc)
        q_N      q_C   w_Newbie   w_Contrib   w_Trusted                      ghi chú
      0.010   0.0071      0.995       0.998       1.000                             
      0.020   0.0100      0.985       0.995       1.000                             
      0.050   0.0158      0.955       0.989       1.000                             
      0.100   0.0224      0.905       0.983       1.000                             
      0.200   0.0316      0.804       0.973       1.000                             
      0.350   0.0418      0.653       0.963       1.000                             
      0.500   0.0500      0.503       0.955       1.000                             

  L = 1 (một lần hỏng tốn 1 lần giá một đơn vị công việc)
        q_N      q_C   w_Newbie   w_Contrib   w_Trusted                      ghi chú
      0.010   0.0071      0.990       0.996       1.000                             
      0.020   0.0100      0.970       0.990       1.000                             
      0.050   0.0158      0.909       0.978       1.000                             
      0.100   0.0224      0.808       0.965       1.000                             
      0.200   0.0316      0.606       0.946       1.000                             
      0.350   0.0418      0.303       0.926       1.000                             
      0.500   0.0500      0.000       0.909       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số

  L = 2 (một lần hỏng tốn 2 lần giá một đơn vị công việc)
        q_N      q_C   w_Newbie   w_Contrib   w_Trusted                      ghi chú
      0.010   0.0071      0.985       0.994       1.000                             
      0.020   0.0100      0.954       0.985       1.000                             
      0.050   0.0158      0.863       0.967       1.000                             
      0.100   0.0224      0.711       0.947       1.000                             
      0.200   0.0316      0.406       0.919       1.000                             
      0.350   0.0418      0.000       0.888       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.500   0.0500      0.000       0.863       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số

  L = 5 (một lần hỏng tốn 5 lần giá một đơn vị công việc)
        q_N      q_C   w_Newbie   w_Contrib   w_Trusted                      ghi chú
      0.010   0.0071      0.969       0.987       1.000                             
      0.020   0.0100      0.907       0.969       1.000                             
      0.050   0.0158      0.722       0.933       1.000                             
      0.100   0.0224      0.412       0.893       1.000                             
      0.200   0.0316      0.000       0.835       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.350   0.0418      0.000       0.772       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.500   0.0500      0.000       0.722       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số

  L = 10 (một lần hỏng tốn 10 lần giá một đơn vị công việc)
        q_N      q_C   w_Newbie   w_Contrib   w_Trusted                      ghi chú
      0.010   0.0071      0.942       0.976       1.000                             
      0.020   0.0100      0.825       0.942       1.000                             
      0.050   0.0158      0.476       0.874       1.000                             
      0.100   0.0224      0.000       0.798       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.200   0.0316      0.000       0.690       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.350   0.0418      0.000       0.571       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số
      0.500   0.0500      0.000       0.476       1.000 hạng này ÂM ⇒ phải loại, không hạ hệ số

------------------------------------------------------------------------------------------------
Bộ hiện hành để so: Newbie 0.5 · Contributor 0.75 · Trusted 1.0.

================================================================================================
E2. Đảo ngược — phải hỏng nhiều tới mức nào thì hệ số 0,5 mới ĐÚNG?
================================================================================================
Giải q_N từ  [(1-q_N) - q_N*L] / [(1-q_T) - q_T*L] = w  với q_T = 0,005.

    L |        w=0.50        w=0.75        w=0.90
------------------------------------------------------------------------------------------------
  0.0 |        50.25%        25.38%        10.45%
  0.5 |        33.58%        17.04%         7.12%
  1.0 |        25.25%        12.88%         5.45%
  2.0 |        16.92%         8.71%         3.78%
  5.0 |         8.58%         4.54%         2.12%
 10.0 |         4.80%         2.65%         1.36%
------------------------------------------------------------------------------------------------
Đọc: cột w=0,50 là lời khai NGẦM mà hệ số 0,5 hiện hành đang phát biểu.
  L=0  ⇒ hệ số 0,5 nói: 'Newbie hỏng 50 % số việc.'
  L=1  ⇒ nói: 'Newbie hỏng 25 % số việc.'
  L=5  ⇒ nói: 'Newbie hỏng 8 % số việc.'
Chưa có phép đo nào trong mã cho q của bất kỳ hạng nào. Nghĩa là 0,5/0,75/1,0 đang
phát biểu một mệnh đề định lượng về chất lượng mà KHÔNG AI ĐO. Đó là tật thật, và
nó nặng hơn 'con số hơi lệch': nó khiến giá không mang thông tin chất lượng.

================================================================================================
E3. Ngưỡng mà 'giảm hệ số' không còn là công cụ đúng
================================================================================================
Giá trị ròng âm khi (1-q) - q*L < 0  ⟺  q > 1/(1+L). Trên ngưỡng đó, mỗi đơn vị
công việc của hạng ấy LÀM MẤT giá trị của người mua; hệ số dương bất kỳ đều là trợ giá.

     L     q ngưỡng                                             nghĩa là
------------------------------------------------------------------------------------------------
   0.0      100.00% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
   0.5       66.67% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
   1.0       50.00% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
   2.0       33.33% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
   5.0       16.67% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
  10.0        9.09% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
  20.0        4.76% hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số
------------------------------------------------------------------------------------------------
Hệ quả thiết kế: bảng hệ số cần một CỘT THỨ HAI — ngưỡng loại. Bộ 0,5/0,75/1,0 hiện
hành không có ngưỡng loại nào, nên một node hỏng 90 % số việc vẫn được nhận việc và
vẫn được trả 0,5 phần.

================================================================================================
E4. Ràng buộc leo hạng: làm thật phải RẺ HƠN dựng node mới (chống tẩy trắng)
================================================================================================
Kẻ gian bị bắt sẽ vứt danh tính, dựng node mới, quay lại hạng thấp nhất. Chi phí của
đường tẩy trắng = (mất số dư treo W*R) + (T epoch chạy ở hệ số thấp w_lo thay vì w_hi).
Lợi của một vòng gian, theo Mô hình B, = b*R mỗi epoch, sống trung bình 1/rho_spot epoch.

Điều kiện chống tẩy trắng, với biên an toàn 2x cho đồng bộ với Mô hình B:
    W  +  T*(w_hi - w_lo)   >=   2 * b/rho_spot
⟹  T_min = max(0, (2*b/rho_spot - W) / (w_hi - w_lo))     [đơn vị: epoch]

Ba bộ hệ số đem so (w_lo -> w_hi):
    hiện hành    0.500 -> 1.000   dw = 0.500
    E1 L=1       0.909 -> 1.000   dw = 0.091
    E1 L=0       0.955 -> 1.000   dw = 0.045

    b  rho_spot    W |                 hiện hành                    E1 L=1                    E1 L=0
------------------------------------------------------------------------------------------------
  0.2      0.05    4 |          8.0 ep /    40 n         44.0 ep /   220 n         88.9 ep /   444 n
  0.2      0.05   12 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.2      0.20    4 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.2      0.20   12 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.2      0.35    4 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.2      0.35   12 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.5      0.05    4 |         32.0 ep /   160 n        175.8 ep /   879 n        355.6 ep /  1778 n
  0.5      0.05   12 |         16.0 ep /    80 n         87.9 ep /   440 n        177.8 ep /   889 n
  0.5      0.20    4 |          2.0 ep /    10 n         11.0 ep /    55 n         22.2 ep /   111 n
  0.5      0.20   12 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.5      0.35    4 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
  0.5      0.35   12 |          0.0 ep /     0 n          0.0 ep /     0 n          0.0 ep /     0 n
------------------------------------------------------------------------------------------------
('ep' = epoch, 'n' = ngày)
Đọc: chênh hệ số CÀNG NHỎ thì T_min CÀNG LỚN — bộ dẫn được (dw = 0,045-0,091)
đòi thời gian leo hạng dài hơn bộ hiện hành (dw = 0,50) để chặn cùng mức tẩy trắng.
Đây là ĐÁNH ĐỔI THẬT, không phải chi tiết: số dẫn được thì đúng về mặt giá trị nhưng
yếu hơn về mặt răn đe. Cách đúng: giữ hệ số theo giá trị (E1) và chuyển việc răn đe
sang W & rho_spot (Mô hình B), KHÔNG nhét cả hai việc vào một con số.

Chiều ngược lại (leo bằng làm thật phải rẻ hơn dựng node mới): node mới CŨNG phải
chạy T epoch ở hạng thấp, nên đường 'làm thật' luôn rẻ hơn hoặc bằng — miễn là hạng
KHÔNG chuyển nhượng được và KHÔNG tự khai. Hôm nay tier tự khai ⇒ T_min hiệu lực = 0
⇒ ràng buộc này đang KHÔNG tồn tại trong mã.

================================================================================================
E5. Mô phỏng kiểm chứng — hệ số sai thì ai bị trả sai bao nhiêu
================================================================================================
Mạng gồm 100 node: 40 'tốt' (q=0,005), 40 'vừa' (q=0,016), 20 'kém' (q=0,05).
Mỗi epoch mỗi node làm 1 đơn vị công việc; kết quả hỏng theo q của nó.
So hai cách trả: (1) hệ số hiện hành theo hạng TỰ KHAI, (2) hệ số E1 theo q thật.
2000 lượt bốc, 200 epoch, hạt giống 20260813.

  nhóm   q thật  w đúng (E1)  w nếu khai thật  w nếu khai gian   sai lệch trả
------------------------------------------------------------------------------------------------
   tốt   0.0050        1.000             1.00             1.00           0.0%
   vừa   0.0158        0.978             0.75             1.00           2.2%
   kém   0.0500        0.909             0.50             1.00           9.1%
------------------------------------------------------------------------------------------------
Cột cuối = phần trăm TRẢ THỪA cho một node khi nó khai Trusted (1,0) trong khi giá
trị thật của nó thấp hơn. Vì trường tier TỰ KHAI, cột 'khai gian' là hành vi tối ưu
của mọi node ⇒ trong cân bằng, MỌI node đều khai Trusted và bộ hệ số 0,5/0,75/1,0
không phân biệt được ai với ai. Kiểm bằng mô phỏng:

  Trả thừa trung bình mỗi node-epoch khi tất cả khai Trusted: 2.72 % giá một đơn vị công việc.
  Đối chiếu dạng đóng: 2.69 %  (khớp trong sai số bốc mẫu)
  Quy ra mỗi epoch toàn mạng: 2.72 % của pool bị chuyển từ node
  tốt sang node kém. Đó là thuế mà bộ hệ số tự khai đang thu của người làm thật.

================================================================================================
E6. SỐ ĐỀ NGHỊ CHỐT — Mô hình E
================================================================================================
Bộ hệ số đề nghị (q_T=0,005 · q_C=0,016 · q_N=0,05 · L=1):
  Newbie       q=0.0500   w = 0.909   (hiện hành 0.50, chênh +0.409)
  Contributor  q=0.0158   w = 0.978   (hiện hành 0.75, chênh +0.228)
  Trusted      q=0.0050   w = 1.000   (hiện hành 1.00, chênh +0.000)

Bộ hiện hành sai lệch chỗ nào: nó GIÃN quá rộng.
  · Muốn 0,5 đúng ở L=1 thì Newbie phải hỏng 25,25 % số việc (E2) — tức đã đi được
    nửa đường tới ngưỡng LOẠI HẲN 50 % (E3). Hệ số 0,5 đang mô tả một node sắp bị
    đuổi, không phải một node mới vào.
  · Bộ dẫn được nằm trong [0.909; 1,000] — hẹp hơn bộ hiện hành khoảng 5.5 lần.
  · Bộ hiện hành GỘP hai việc vào một số: định giá chất lượng VÀ răn đe tẩy trắng.
    E4 cho thấy tách ra thì mỗi việc có công cụ riêng đo được.

KHÔNG KẾT LUẬN ĐƯỢC: q thật của từng hạng và L thật. Chưa có phép đo nào trong mã.
Bảng E1 quét q_N in [0,01; 0,50] và L in [0; 10] để chủ sở hữu chọn theo số ĐO ĐƯỢC
khi có. Trước khi đo được q thì mọi bộ hệ số — kể cả bộ đề nghị ở trên — vẫn là
giả định; chỗ khác nhau là bộ đề nghị nói RÕ nó giả định gì.

==============================================================================
 TẤT CẢ 5 MÔ HÌNH CHẠY XONG, không lỗi.
==============================================================================
```
