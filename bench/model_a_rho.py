#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mô hình A — hệ số rho của bất biến RE-1.

    pool_E <= rho * SUM_P required_P(E),  phần dư (1-rho)*SUM về Treasury.

Hai cận:
  - trần (vế tấn công):     rho <= 1 - V/X
  - sàn (vế nhà cung cấp):  rho >= N*C/D

Chỉ dùng thư viện chuẩn. Hạt giống cố định.
"""

import math
import random
import statistics
from datetime import date

SEED = 20260813
NAME = "MÔ HÌNH A — hệ số rho (RE-1)"

# Lưới quét
RHO_GRID = [i / 100 for i in range(1, 100)]          # rho in (0,1), bước 0,01
VX_GRID = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]
MAT_GRID = [0.5, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0, 10.0]   # D/(N*C) = độ chín của cầu


def line(ch="-", n=94):
    print(ch * n)


def head(t):
    print()
    line("=")
    print(t)
    line("=")


# --------------------------------------------------------------------------
# A1 — quét lưới, đếm số điểm rho khả thi trên lưới bước 0,01
# --------------------------------------------------------------------------
def a1_grid():
    head("A1. Miền khả thi  N*C/D <= rho <= 1 - V/X   (quét rho bước 0,01)")
    print("Ô ghi: số điểm rho khả thi trên lưới 99 điểm / [rho_min .. rho_max].")
    print("'RONG' = không có rho nào vừa nuôi nổi nhà cung cấp vừa chặn được farm.")
    print()
    print("Cột = V/X (giá trị gián tiếp mua được trên mỗi đồng MAGIC đốt).")
    print("Hàng = D/(N*C) (độ chín của cầu).")
    print("D/(N*C)|" + "".join(f"{v:>13.2f}" for v in VX_GRID))
    line()
    empties = 0
    total = 0
    for mat in MAT_GRID:
        lo = 1.0 / mat                       # N*C/D
        cells = []
        for vx in VX_GRID:
            hi = 1.0 - vx
            ok = [r for r in RHO_GRID if lo <= r <= hi]
            total += 1
            if not ok:
                empties += 1
                cells.append("        RONG")
            else:
                cells.append(f"{len(ok):>3}/{ok[0]:.2f}-{ok[-1]:.2f}")
        print(f"{mat:>7.2f} |" + "".join(f"{c:>13}" for c in cells))
    line()
    print(f"Tổng ô: {total} · ô RỖNG: {empties} ({100.0*empties/total:.1f} %)")
    print("Đọc: cầu chưa chín (D/(N*C) <= 1) thì miền RỖNG với MỌI V/X — đây chính là")
    print("lý do RE-2 (trợ giá khởi động) phải tồn tại, không phải tuỳ chọn.")


# --------------------------------------------------------------------------
# A2 — chọn điểm trong miền: hai quy tắc biên an toàn
# --------------------------------------------------------------------------
def a2_pick():
    head("A2. Chọn rho trong miền — hai quy tắc 'tối đa biên nhỏ nhất của hai vế'")
    print("QT-số học : rho_a = (lo+hi)/2      biên = min(rho-lo, hi-rho)  [đơn vị tuyệt đối]")
    print("QT-hình học: rho_g = sqrt(lo*hi)   biên = min(rho/lo, hi/rho)  [đơn vị tỉ lệ]")
    print()
    print(f"{'D/(NC)':>7} {'V/X':>6} {'lo':>6} {'hi':>6} {'rho_a':>7} {'biên_a':>7} {'rho_g':>7} {'biên_g':>7}")
    line()
    for mat in [1.25, 1.5, 2.0, 3.0, 5.0, 10.0]:
        for vx in [0.0, 0.10, 0.20, 0.30, 0.40, 0.50]:
            lo, hi = 1.0 / mat, 1.0 - vx
            if lo > hi:
                print(f"{mat:>7.2f} {vx:>6.2f} {lo:>6.2f} {hi:>6.2f} {'RONG':>7} {'-':>7} {'RONG':>7} {'-':>7}")
                continue
            ra = (lo + hi) / 2
            ma = min(ra - lo, hi - ra)
            rg = math.sqrt(lo * hi)
            mg = min(rg / lo, hi / rg)
            print(f"{mat:>7.2f} {vx:>6.2f} {lo:>6.2f} {hi:>6.2f} {ra:>7.3f} {ma:>7.3f} {rg:>7.3f} {mg:>7.2f}x")
    line()
    print("CHỌN QT-hình học. Lý do: cả hai cận là đại lượng TỈ LỆ, không phải mức tuyệt đối.")
    print("  - cận dưới N*C/D dịch theo TỈ LỆ khi chi phí nhà cung cấp tăng x%;")
    print("  - cận trên 1-V/X dịch theo TỈ LỆ khi giá trị gián tiếp tăng x%.")
    print("Biên tuyệt đối 0,10 là rất rộng khi lo=0,10 và rất hẹp khi lo=0,80; biên tỉ lệ")
    print("không có tật đó. Nhược: QT-hình học kéo rho về phía cận dưới ⇒ an toàn hơn cho")
    print("vế chống farm, khắt khe hơn với nhà cung cấp. Đó là đánh đổi có chủ ý.")


# --------------------------------------------------------------------------
# A3 — mô phỏng nhiều epoch, cầu tăng dần: epoch nào miền mở ra
# --------------------------------------------------------------------------
def a3_growth(paths=400, epochs=160):
    head("A3. Cầu tăng dần — epoch nào miền khả thi MỞ RA")
    print("Giả định (khai rõ): D_0 = 0,25*N*C (miền rỗng), tăng nền 8 %/epoch,")
    print("nhiễu log-chuẩn sigma=0,12/epoch, N*C giữ nguyên. 1 epoch = 5 ngày.")
    print(f"Số đường mô phỏng: {paths}, hạt giống {SEED}.")
    print()
    print(f"{'V/X':>5} {'trần rho':>9} | {'E_mở p10':>9} {'trung vị':>9} {'p90':>9} | {'trung vị (ngày)':>16} {'không mở':>9}")
    line()
    for vx in [0.0, 0.10, 0.20, 0.30, 0.40, 0.50]:
        hi = 1.0 - vx
        rng = random.Random(SEED + int(vx * 100))
        opens = []
        never = 0
        for _ in range(paths):
            d = 0.25
            first = None
            streak = 0
            for e in range(1, epochs + 1):
                d = d * 1.08 * math.exp(rng.gauss(0.0, 0.12))
                lo = 1.0 / d
                if lo <= hi:
                    streak += 1
                    if streak >= 5 and first is None:
                        first = e - 4      # epoch bắt đầu chuỗi 5 epoch liên tiếp
                        break
                else:
                    streak = 0
            if first is None:
                never += 1
            else:
                opens.append(first)
        if opens:
            opens.sort()
            p10 = opens[int(0.10 * (len(opens) - 1))]
            med = statistics.median(opens)
            p90 = opens[int(0.90 * (len(opens) - 1))]
            print(f"{vx:>5.2f} {hi:>9.2f} | {p10:>9} {med:>9.1f} {p90:>9} | {med*5:>16.0f} {never:>9}")
        else:
            print(f"{vx:>5.2f} {hi:>9.2f} | {'-':>9} {'-':>9} {'-':>9} | {'-':>16} {never:>9}")
    line()
    print("Đọc: 'E_mở' = epoch đầu tiên mà miền mở và GIỮ mở 5 epoch liên tiếp.")
    print("Trước mốc đó, mọi rho hợp lệ đều làm nhà cung cấp lỗ ⇒ phải có S_E (Mô hình D).")


# --------------------------------------------------------------------------
# A4 — kiểm định đối kháng
# --------------------------------------------------------------------------
def a4_adversarial():
    head("A4. Kiểm định đối kháng — bơm SUM required mà KHÔNG thật sự mất MAGIC")
    print("Đặt phi = phần MAGIC đã tính vào SUM nhưng kẻ tấn công LẤY LẠI ĐƯỢC.")
    print("Có lãi khi rho*s*X + V >= (1-phi)*X. Xấu nhất s->1 ⇒ trần: rho <= 1 - phi - V/X.")
    print()
    print(f"{'phi':>6} |" + "".join(f"{'V/X=' + format(v, '.2f'):>12}" for v in [0.0, 0.10, 0.20, 0.30, 0.50]))
    line()
    for phi in [0.0, 0.05, 0.10, 0.25, 0.50, 1.00]:
        cells = []
        for vx in [0.0, 0.10, 0.20, 0.30, 0.50]:
            hi = 1.0 - phi - vx
            cells.append(f"{hi:>12.2f}" if hi > 0 else f"{'KHÔNG CÓ':>12}")
        print(f"{phi:>6.2f} |" + "".join(cells))
    line()
    print("Ba đường tấn công cụ thể, và phi tương ứng:")
    print("  (i)  Tự tiêu vòng tròn giữa hai tài khoản cùng chủ.")
    print("       MAGIC bị ĐỐT thật ⇒ phi = 0 ⇒ RE-1 ĐỨNG. Vòng tròn không tạo lại MAGIC;")
    print("       kẻ tấn công vẫn mất (1-rho)*X mỗi vòng. Điều kiện phụ: SUM chỉ đếm lượng")
    print("       ĐỐT bất khả nghịch, không đếm 'chuyển giữa hai ví'.")
    print("  (ii) Hoàn phí / huỷ giao dịch SAU khi đã tính vào SUM.")
    print("       phi = tỉ lệ hoàn. Bảng trên: phi=0,25 kéo trần rho từ 1,00 xuống 0,75;")
    print("       phi=0,50 xuống 0,50; phi=1,00 ⇒ KHÔNG CÓ rho nào cứu được ⇒ RE-1 SẬP.")
    print("       Điều kiện phụ BẮT BUỘC: SUM chốt SAU cửa sổ hoàn phí, hoặc hoàn phí phải")
    print("       trừ ngược vào SUM của epoch đang mở.")
    print("  (iii) Tính SUM theo giá KHAI thay vì giá THU.")
    print("       Giá khai tự do ⇒ phi -> 1 ⇒ RE-1 SẬP HOÀN TOÀN. Điều kiện phụ: SUM lấy từ")
    print("       lượng đốt on-chain (consume.ak), KHÔNG lấy từ trường giá do bên gọi khai.")
    print("       Đây trùng đúng lỗ đã đo: total_pool do BÊN GỌI tự khai, chỉ chặn bằng")
    print("       một trần hằng số (lampnet-mirage/src/bin/lampnet-node.rs:6196-6230,6245,6461")
    print("       @HEAD e5d144d).")
    print()
    print("Khuếch đại 's' do hạng TỰ KHAI (hệ số: lampnet-reward/src/types.rs:70-76;")
    print("trường tier nhận từ request: lampnet-node.rs:6268, struct #[derive(Deserialize)]):")
    print("kẻ tấn công khai Trusted (1,0) trong khi node thật mới vào là Newbie (0,5).")
    print("s = 1,0*c / (1,0*c + 0,5*(1-c)) với c = tỉ phần NĂNG LỰC THẬT.")
    print()
    print(f"{'c':>6} {'s (khai gian)':>14} {'s (khai thật)':>14} | " +
          "".join(f"{'V/X cần @rho=' + format(r, '.1f'):>20}" for r in [0.3, 0.5, 0.7]))
    line()
    for c in [0.05, 0.10, 0.20, 0.35, 0.50, 0.80, 1.00]:
        s_bad = 1.0 * c / (1.0 * c + 0.5 * (1 - c))
        s_ok = c
        cells = "".join(f"{max(0.0, 1 - r * s_bad):>20.3f}" for r in [0.3, 0.5, 0.7])
        print(f"{c:>6.2f} {s_bad:>14.3f} {s_ok:>14.3f} | " + cells)
    line()
    print("Đọc: hạng tự khai khuếch đại s tới 2x ở c nhỏ, nhưng s <= 1 theo cấu tạo ⇒ vế")
    print("TIỀN TRỰC TIẾP của RE-1 vẫn đứng (rho*s < 1 với mọi rho < 1). Chỗ hạng tự khai")
    print("thật sự phá là vế V: hạng tự khai được nhân thẳng vào weighted_score ⇒ mua được")
    print("uy tín/thứ hạng bằng 0 đồng ⇒ V/X > 0 mà không đo được. Đó là lý do phải báo HAI")
    print("giá trị rho: một cho mã hôm nay, một cho hệ đã vá.")


def main():
    line("#")
    print(f"{NAME} · hạt giống {SEED} · chạy ngày {date.today().isoformat()}")
    line("#")
    a1_grid()
    a2_pick()
    a3_growth()
    a4_adversarial()

    head("A5. SỐ ĐỀ NGHỊ CHỐT — Mô hình A")
    # hệ đã vá: V/X ~ 0 .. 0.10 ; cầu chín D/(N*C) >= 3
    for tag, vx, mat in [("hệ ĐÃ VÁ (V~0, cầu chín D/(N*C)=3)", 0.05, 3.0),
                         ("hệ ĐÃ VÁ, cầu vừa chín D/(N*C)=2", 0.05, 2.0),
                         ("mã HÔM NAY (hạng tự khai ⇒ V/X=0,30)", 0.30, 3.0),
                         ("mã HÔM NAY, thêm rủi ro hoàn phí phi=0,10", 0.40, 3.0)]:
        lo, hi = 1.0 / mat, 1.0 - vx
        if lo > hi:
            print(f"{tag:<42} -> RỖNG")
            continue
        rg = math.sqrt(lo * hi)
        print(f"{tag:<42} -> lo={lo:.2f} hi={hi:.2f}  rho* = {rg:.2f}  (biên tỉ lệ {min(rg/lo, hi/rg):.2f}x)")
    print()
    print("Làm tròn XUỐNG lưới 0,05 (xuống, không lên — sai về phía an toàn chống farm):")
    for tag, vx, mat in [("hệ ĐÃ VÁ ", 0.05, 3.0), ("mã HÔM NAY", 0.30, 3.0)]:
        lo, hi = 1.0 / mat, 1.0 - vx
        rg = math.sqrt(lo * hi)
        rr = math.floor(rg / 0.05) * 0.05
        print(f"  rho = {rr:.2f}  cho {tag}  (dải còn đúng: {math.ceil(lo/0.01)*0.01:.2f} <= rho <= {hi:.2f})")
    print("Cả hai đều giả định phi = 0 (SUM chỉ đếm lượng đốt bất khả nghịch). phi > 0")
    print("thì trừ thẳng vào trần: trần = 1 - phi - V/X.")


if __name__ == "__main__":
    main()
