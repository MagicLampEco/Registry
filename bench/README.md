# bench/ — bộ mô phỏng tìm số cho kinh tế tài nguyên LampNet

Bộ này **đo để tìm số**, không chọn số cho đẹp. Nó tìm giá trị cho năm tham số mà bản thiết kế
`_Agents/deliverables/kinh-te-tai-nguyen-lampnet.md` đặt ra nhưng chưa có số: `ρ` (RE-1),
`ρ_spot` + `W` (răn đe), `α` (RE-7), `S_E` (RE-2/RE-2b), và bộ hệ số hạng thay cho 0,5 / 0,75 / 1,0.

## Chạy thế nào

```
cd bench
./run_all.sh                 # chạy hết 5 mô hình, in ra stdout
./run_all.sh > out.txt       # lưu lại
python3 model_a_rho.py       # chạy riêng một mô hình
```

Yêu cầu: **python3, chỉ thư viện chuẩn** (`math`, `random`, `statistics`, `datetime`).
Không numpy, không scipy, không mạng. Đo trên python 3.14.5, chạy hết dưới 10 giây.

**Hạt giống cố định `SEED = 20260813`** trong cả năm script. Hai lần chạy cho kết quả **giống
hệt** (đã kiểm bằng `diff` hai lần chạy đầy đủ). Nếu số đổi giữa hai lần chạy thì có lỗi — báo lại,
đừng dùng kết quả.

## Mỗi script làm gì

| Script | Mô hình | Tìm số cho | Ra cái gì |
|---|---|---|---|
| `model_a_rho.py` | A | `ρ` của RE-1 | miền khả thi `N·C/D ≤ ρ ≤ 1 − V/X`, điểm chọn, epoch miền mở, ba đường tấn công |
| `model_b_deter.py` | B | `ρ_spot`, `W` | hai cách đặt B (tuyệt đối / tỉ lệ), trò chơi lặp Monte-Carlo, bảng đánh đổi ba chi phí |
| `model_c_alpha.py` | C | `α` của RE-7 | cân bằng năng lực kiểu newsvendor, đường cong α, mức lợi kẻ ăn không |
| `model_d_subsidy.py` | D | `S_E` | ba kịch bản cầu, lịch suy giảm, trần cứng, thiệt hại nếu trả theo tự khai |
| `model_e_tier.py` | E | hệ số hạng | hệ số dẫn từ tổn thất kỳ vọng, ngưỡng loại, ràng buộc leo hạng |

## Đọc kết quả ra sao

Mỗi script kết thúc bằng một mục **"SỐ ĐỀ NGHỊ CHỐT"** (A5, B5, C4, D5, E6). Đọc mục đó trước.
Các mục trước nó là bằng chứng: bảng quét, đường cong, kiểm định đối kháng.

Ba quy ước đọc, áp cho cả năm mô hình:

1. **Đơn vị chuẩn hoá.** Mô hình D và C làm việc với `N·C = 1` và `p = 1`. Muốn ra LAMP thì nhân
   với `N·C` tính bằng LAMP/epoch — bảng quy đổi ở `D4`. Làm vậy vì giá LAMP và chi phí vận hành
   thật chưa đo được; ép ra số LAMP tuyệt đối lúc này là bịa.
2. **"KHÔNG KẾT LUẬN ĐƯỢC" là kết quả hợp lệ.** Chỗ nào mô hình không quyết được, script in thẳng
   dòng đó kèm lý do. Thà thiếu một số còn hơn một số không có gì đỡ.
3. **Mọi giả định đều in ra cùng số.** Con số nào cũng đi kèm dòng "giả định nào mà sai thì số này
   sai". Đừng chép số ra ngoài mà bỏ dòng đó lại.

## Dữ kiện neo — lấy từ mã thật, đã đối chiếu

| Dữ kiện | Giá trị | Neo (đã mở kiểm) |
|---|---|---|
| Giá cơ sở compute | 10 µLAMP/tác vụ | `lampnet-hivemind/lampnet-reward/src/types.rs:354` `BASE_PRICE_COMPUTE = 10` |
| Trần thưởng compute mỗi epoch | 10.000 tác vụ × 10 µLAMP = **0,1 LAMP** | như trên + thư LampNet 2026-08-07 mục 8 |
| Sàn `ρ_spot` | 0,01 | `lampnet-hivemind/lampnet-splash/src/params.rs:43` `RHO_SPOT_MIN = 0.01` |
| `SLASH_PENALTY` | 200 LAMP — **không có quyền tịch thu trên đường tiền thật** | `lampnet-splash/src/params.rs:78` |
| Hệ số hạng | Newbie 0,5 · Contributor 0,75 · Trusted 1,0, **bên gọi tự khai** | `lampnet-reward/src/types.rs:70-76`, trường `tier` nhận từ request tại `lampnet-node.rs:6268` |
| Chia phí OriLife | storage 4000 / compute 3500 / bandwidth 1500 / anchor 1000 bps, **không có xô cảm biến** | `OriLifeTrace/orilife-fee/src/params.ts:35-41` |
| 1 epoch Cardano | 5 ngày | giao thức |
| Nguồn cung LAMP | 36 tỷ, không đốt | `LAMP/Treasury/CONTRACT.md §5` |

Số nào **không** có trong bảng này thì là **giả định**, và script phải in nó ra như giả định.

## Giới hạn đã biết của bộ này

- Mô hình A, B, E là **giải tích + kiểm bằng mô phỏng**; C, D là **mô phỏng thật** trên mẫu bốc.
  Nghĩa là A/B/E chắc hơn về mặt số, còn C/D phụ thuộc dạng phân bố đã chọn — dạng đó in ra ngay
  trong kết quả.
- Bộ này **không** đọc mã on-chain, **không** ước tính ExUnit, **không** định giá LAMP.
- Bộ này **không** thay được phép đo thật. Bốn đại lượng còn thiếu, đã ghi rõ trong kết quả:
  `V/X` (giá trị gián tiếp mua được trên mỗi đồng MAGIC đốt), `b` (phần chi phí gian tránh được),
  `N·C` tính bằng LAMP, và `q` (tỉ lệ hỏng theo hạng). Đo được bốn cái đó thì bộ này cho ra số chốt;
  chưa đo được thì nó cho ra **dải** và điều kiện.

`RESULTS.md` — kết quả đã chạy thật, có output thô, ngày chạy và hạt giống.
