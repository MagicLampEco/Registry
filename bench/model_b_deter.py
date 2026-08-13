#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mô hình B — hệ số rho_spot và cửa sổ chi trả W.

Hệ KHÔNG có quyền tịch thu (SLASH_PENALTY đã gỡ khỏi đường tiền thật).
Răn đe hợp lệ duy nhất = MẤT PHẦN THƯỞNG CHƯA CHI.
Trần thiệt hại = số dư treo = W * R_epoch.

Điều kiện răn đe tĩnh:  W * R_epoch * rho_spot > B
Hai cách đặt B cho hai kết luận NGƯỢC NHAU — mô phỏng cả hai.

Chỉ dùng thư viện chuẩn. Hạt giống cố định.
"""

import math
import random
from datetime import date

SEED = 20260813
NAME = "MÔ HÌNH B — rho_spot và cửa sổ chi trả W"

# ---- Dữ kiện neo (mã thật) -------------------------------------------------
# lampnet-reward/src/types.rs:354  BASE_PRICE_COMPUTE = 10 uLAMP/tác vụ
# 10.000 tác vụ/epoch * 10 uLAMP = 100.000 uLAMP = 0,1 LAMP/epoch (TOÀN MẠNG)
R_EPOCH_NET_LAMP = 0.1
# lampnet-splash/src/params.rs:43  RHO_SPOT_MIN = 0.01 (sàn cho mọi task có thưởng)
RHO_SPOT_FLOOR = 0.01
EPOCH_DAYS = 5

W_GRID = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 36, 52, 104]
SPOT_GRID = [0.01, 0.02, 0.05, 0.10, 0.20, 0.35, 0.50]
MARGIN = 2.0            # biên an toàn bắt buộc
B_GRID = [0.2, 0.5, 0.8]


def thr_static(b):
    """Ngưỡng W*rho_spot của điều kiện TĨNH trong đặc tả."""
    return b


def thr_whitewash(b):
    """Ngưỡng W*rho_spot đúng khi danh tính RẺ (dẫn ở B3): (1-s)^W < 1-b."""
    return -math.log(1.0 - b)


def line(ch="-", n=94):
    print(ch * n)


def head(t):
    print()
    line("=")
    print(t)
    line("=")


# --------------------------------------------------------------------------
# B1 — B TUYỆT ĐỐI (lợi ích ngoài hệ)
# --------------------------------------------------------------------------
def b1_absolute():
    head("B1. B TUYỆT ĐỐI — gian vì lợi ích NGOÀI hệ (phá đối thủ, nhét dữ liệu giả)")
    print(f"R_epoch toàn mạng hôm nay = {R_EPOCH_NET_LAMP} LAMP/epoch (10.000 tác vụ x 10 uLAMP).")
    print("Ca thuận lợi nhất cho răn đe: TOÀN BỘ thưởng mạng dồn vào 1 node.")
    print(f"W cần = MARGIN({MARGIN:.0f}x) * B / (R_epoch * rho_spot). 1 epoch = 5 ngày.")
    print()
    print(f"{'B (LAMP)':>10} |" + "".join(f"{'rs=' + format(s, '.2f'):>16}" for s in SPOT_GRID))
    line()
    for B in [0.01, 0.1, 1.0, 10.0, 100.0, 1000.0]:
        cells = []
        for s in SPOT_GRID:
            w = MARGIN * B / (R_EPOCH_NET_LAMP * s)
            yrs = w * EPOCH_DAYS / 365.0
            cells.append(f"{w:>10.0f}ep/{yrs:>4.0f}n" if yrs >= 1 else f"{w:>10.1f}ep/{yrs*12:>4.1f}th")
        print(f"{B:>10.2f} |" + "".join(f"{c:>16}" for c in cells))
    line()
    print("Đọc: 'ep' = epoch, 'n' = năm, 'th' = tháng.")
    b = 1.0
    w_need = MARGIN * b / (R_EPOCH_NET_LAMP * RHO_SPOT_FLOOR)
    print(f"Tại sàn rho_spot={RHO_SPOT_FLOOR} và B=1 LAMP: W cần = {w_need:.0f} epoch "
          f"= {w_need*EPOCH_DAYS/365:.1f} năm.")
    print("KẾT LUẬN B1: với quy mô thưởng HÔM NAY, răn đe bằng tiền cho loại gian 'lợi ích")
    print("ngoài' KHÔNG ĐẠT ĐƯỢC với bất kỳ W hợp lý nào. Kết luận của LampNet ĐÚNG cho cách")
    print("đặt B này. Phải dùng công cụ khác: (a) sao chép M-of-N để một node gian không đủ")
    print("quyết định kết quả, (b) bằng chứng bên thứ ba ký (RE-5), (c) hạn chế thiệt hại")
    print("bằng thiết kế (không để một node đơn lẻ chốt dữ liệu có giá trị pháp lý).")


# --------------------------------------------------------------------------
# B2 — B TỈ LỆ (gian để tiết kiệm chi phí của chính mình)
# --------------------------------------------------------------------------
def b2_proportional():
    head("B2. B TỈ LỆ — gian để TIẾT KIỆM CHI PHÍ của chính mình (B = b * R_epoch)")
    print("Điều kiện rút gọn: W * rho_spot > b  ⇒  KHÔNG còn phụ thuộc quy mô tuyệt đối.")
    print(f"Yêu cầu biên {MARGIN:.0f}x: W * rho_spot >= {MARGIN:.0f}b.")
    print("b = phần chi phí một epoch tiết kiệm được khi gian, tính theo bội số thu nhập")
    print("một epoch. b=0,5: gian bớt được nửa chi phí. b=1,0: bỏ hẳn phần việc.")
    print()
    for b in [0.5, 1.0, 2.0]:
        print(f"  b = {b}")
        print(f"{'W':>6} |" + "".join(f"{'rs=' + format(s, '.2f'):>10}" for s in SPOT_GRID))
        line()
        for w in W_GRID:
            cells = []
            for s in SPOT_GRID:
                ratio = w * s / b
                mark = "*" if ratio >= MARGIN else " "
                cells.append(f"{ratio:>7.1f}x{mark}")
            print(f"{w:>6} |" + "".join(f"{c:>10}" for c in cells))
        line()
    print("Đọc: ô có dấu * = thoả răn đe với biên >= 2x. Ô không dấu = chưa đủ.")
    print("KẾT LUẬN B2: cách đặt B tỉ lệ CỨU ĐƯỢC — vì cả lợi lẫn thiệt đều co theo thu nhập,")
    print("quy mô 0,1 LAMP/epoch không còn cản. Ví dụ b=1: W=12 & rho_spot=0,20 cho biên 2,4x.")


# --------------------------------------------------------------------------
# B3 — trò chơi lặp có chiết khấu, mô phỏng Monte-Carlo
# --------------------------------------------------------------------------
def b3_montecarlo(paths=800, horizon=150):
    head("B3. Trò chơi lặp có chiết khấu — kiểm lại B2 bằng Monte-Carlo")
    print("Điểm mấu chốt: hình phạt phụ thuộc DANH TÍNH CÓ ĐẮT KHÔNG. Mô phỏng hai giả định:")
    print("  (a) danh tính ĐẮT  — bị bắt ⇒ loại vĩnh viễn, mất luôn thu nhập tương lai;")
    print("  (b) danh tính RẺ   — bị bắt ⇒ CHỈ mất số dư treo, dựng danh tính mới, chạy tiếp.")
    print("      (b) đúng với hôm nay: chưa có cổng personhood ⇒ tẩy trắng gần như miễn phí.")
    print("Thưởng epoch e được chi ở epoch e+W; bị bắt ở epoch c thì mọi thưởng có e <= c < e+W")
    print("bị mất. Gian tiết kiệm b mỗi epoch, nhận NGAY. Chiết khấu r_năm=15 %.")
    print(f"Chuẩn hoá R_epoch = 1. Số đường: {paths}, chân trời {horizon} epoch, hạt giống {SEED}.")
    r_year = 0.15
    delta = 1.0 / (1.0 + r_year) ** (EPOCH_DAYS / 365.0)
    print(f"delta/epoch = {delta:.6f}")
    print()
    print("PV_thật = thu thưởng (trả chậm W) TRỪ chi phí b mỗi epoch. PV_gian = thu thưởng")
    print("còn nhận được (phần chưa chi bị mất khi bị bắt), KHÔNG trừ b.")
    print()
    print(f"{'b':>4} {'W':>4} {'rho_spot':>9} {'PV_thật':>9} | {'PV_gian(a)':>11} {'tỉ lệ(a)':>9} | "
          f"{'PV_gian(b)':>11} {'tỉ lệ(b)':>9} {'răn đe(b)':>10} {'W*rs':>7}")
    line()
    for b in B_GRID:
        for w in [4, 12, 24, 52]:
            for s in [0.01, 0.05, 0.20, 0.50]:
                pv_honest = (sum(delta ** (t + w) for t in range(1, horizon + 1))
                             - b * sum(delta ** t for t in range(1, horizon + 1)))
                rng = random.Random(SEED + w * 1000 + int(s * 1000) + int(b * 10))
                tot_a = 0.0
                tot_b = 0.0
                for _ in range(paths):
                    # ---- (a) loại vĩnh viễn
                    T = horizon + 1
                    for t in range(1, horizon + 1):
                        if rng.random() < s:
                            T = t
                            break
                    end = min(T, horizon)
                    pv = sum(delta ** (e + w) for e in range(1, end + 1) if e + w <= T)
                    tot_a += pv
                    # ---- (b) tẩy trắng: chỉ mất số dư treo, chạy tiếp
                    pv = 0.0
                    last_catch = 0
                    for t in range(1, horizon + 1):
                        if rng.random() < s:
                            last_catch = t
                        e = t - w
                        if e >= 1 and last_catch < e:
                            pv += delta ** t              # thưởng epoch e được chi ở t
                    tot_b += pv
                pv_a, pv_b = tot_a / paths, tot_b / paths
                print(f"{b:>4.1f} {w:>4} {s:>9.2f} {pv_honest:>9.2f} | {pv_a:>11.2f} {pv_a/pv_honest:>8.3f}x | "
                      f"{pv_b:>11.2f} {pv_b/pv_honest:>8.3f}x {('CÓ' if pv_b < pv_honest else 'KHÔNG'):>10} "
                      f"{w*s:>7.2f}")
    line()
    print("Đọc: 'răn đe(b) CÓ' = PV(gian) < PV(thật) khi danh tính RẺ.")
    print("Cột (a) răn đe được ở hầu hết ô — nhưng chỉ vì giả định danh tính ĐẮT, thứ hệ hôm")
    print("nay KHÔNG có. Cột (b) mới là mức răn đe thật.")
    print()
    print("Dạng đóng của cột (b): thưởng epoch e chỉ tới tay nếu không bị bắt trong W epoch")
    print("kế tiếp ⇒ tỉ lệ nhận được = (1-rho_spot)^W. Răn đe ⟺ (1-rho_spot)^W < 1-b")
    print("⟺ W*rho_spot > -ln(1-b)  (xấp xỉ rho_spot nhỏ).")
    print("So với điều kiện TĨNH của đặc tả (W*rho_spot > b) thì ngưỡng đúng LỚN HƠN, và")
    print("chênh càng lớn khi b tiến tới 1. Kiểm số:")
    print()
    print(f"{'b':>6} {'ngưỡng tĩnh (=b)':>18} {'ngưỡng tẩy trắng':>18} {'chênh':>8} | {'MC đo được (W=12)':>20}")
    line()
    for b in B_GRID + [0.9, 0.95, 0.99]:
        t_st, t_ww = thr_static(b), thr_whitewash(b)
        # đo bằng MC: quét rho_spot ở W=12, tìm ô đầu tiên mà PV_gian < PV_thật
        w = 12
        found = None
        pv_honest = (sum(delta ** (t + w) for t in range(1, horizon + 1))
                     - b * sum(delta ** t for t in range(1, horizon + 1)))
        for si in range(1, 81):
            s = si * 0.01
            rng = random.Random(SEED + int(b * 100) * 7919 + si)
            tot = 0.0
            npaths = 200
            for _ in range(npaths):
                pv = 0.0
                last_catch = 0
                for t in range(1, horizon + 1):
                    if rng.random() < s:
                        last_catch = t
                    e = t - w
                    if e >= 1 and last_catch < e:
                        pv += delta ** t
                tot += pv
            if tot / npaths < pv_honest:
                found = s
                break
        if pv_honest <= 0:
            mc = "PV_thật <= 0"
        elif found:
            mc = f"{w*found:.2f} (rs={found:.2f})"
        else:
            mc = "ngoài lưới rs<=0,80"
        print(f"{b:>6.2f} {t_st:>18.3f} {t_ww:>18.3f} {t_ww/t_st:>7.2f}x | {mc:>20}")
    line()
    print("Kết luận B3: điều kiện đúng để chốt W và rho_spot là  W*rho_spot >= "
          f"{MARGIN:.0f} * (-ln(1-b)),")
    print("KHÔNG phải W*rho_spot >= 2b. Với b >= 1 (gian bỏ được toàn bộ chi phí) thì")
    print("-ln(1-b) phân kỳ ⇒ KHÔNG CÓ W nào răn đe nổi khi danh tính còn rẻ.")


# --------------------------------------------------------------------------
# B4 — cân ba chi phí, chọn ô rẻ nhất trong số ô đạt răn đe
# --------------------------------------------------------------------------
def b4_cost(b=0.5):
    head("B4. Đánh đổi ba chi phí — chọn (W, rho_spot) rẻ nhất trong số ô ĐẠT răn đe")
    print("Ba chi phí, đều chuẩn hoá theo doanh thu một epoch (GIẢ ĐỊNH: cộng ngang trọng số 1):")
    print("  1. chi phí kiểm  = k_a * rho_spot, k_a = 1,0")
    print("     (giả định của đặc tả: một lần kiểm tốn bằng ~1 lần thực thi lại tác vụ)")
    print("  2. chi phí vốn   = 1 - (1+r)^(-W), r = suất chiết khấu MỖI EPOCH")
    print("  3. chi phí rời bỏ = 1 - exp(-W/W0), W0 = hằng chịu đựng treo tiền (epoch)")
    print(f"Lọc: dùng ngưỡng ĐÚNG của B3 — giữ ô có W*rho_spot >= {MARGIN:.0f}*(-ln(1-b))"
          f" = {MARGIN*thr_whitewash(b):.3f}, với b = {b}.")
    for r_year in [0.05, 0.15, 0.30]:
        for w0 in [6, 12, 24]:
            r_ep = (1.0 + r_year) ** (EPOCH_DAYS / 365.0) - 1.0
            rows = []
            for w in W_GRID:
                for s in SPOT_GRID:
                    if w * s < MARGIN * thr_whitewash(b):
                        continue
                    c_audit = 1.0 * s
                    c_cap = 1.0 - (1.0 + r_ep) ** (-w)
                    c_churn = 1.0 - math.exp(-w / w0)
                    tot = c_audit + c_cap + c_churn
                    rows.append((tot, w, s, c_audit, c_cap, c_churn))
            rows.sort()
            print()
            print(f"  r_năm={r_year:.0%}  W0={w0} epoch  (r/epoch={r_ep:.5f})  · số ô đạt răn đe: {len(rows)}")
            print(f"    {'hạng':>5} {'W':>5} {'rho_spot':>9} {'c_kiểm':>8} {'c_vốn':>8} {'c_rời':>8} {'TỔNG':>8}")
            for i, (tot, w, s, ca, cc, cch) in enumerate(rows[:5], 1):
                print(f"    {i:>5} {w:>5} {s:>9.2f} {ca:>8.4f} {cc:>8.4f} {cch:>8.4f} {tot:>8.4f}")
    print()
    line()
    print("Đọc: nghiệm rẻ nhất luôn là ô có W NHỎ NHẤT còn thoả ngưỡng, vì chi phí kiểm tăng")
    print("TUYẾN TÍNH theo rho_spot còn chi phí rời bỏ tăng theo hàm mũ bão hoà theo W.")
    print("⇒ đổi 'treo tiền lâu' lấy 'kiểm dày' là đúng chiều, tới khi rho_spot đắt hơn.")


def b5_summary():
    head("B5. SỐ ĐỀ NGHỊ CHỐT — Mô hình B")
    r_year, w0 = 0.15, 12
    r_ep = (1.0 + r_year) ** (EPOCH_DAYS / 365.0) - 1.0
    print(f"{'b':>5} {'ngưỡng W*rs':>12} {'W*':>4} {'rho_spot*':>10} {'ngày treo':>10} {'chi phí':>9} {'biên':>7}")
    line()
    picks = {}
    for b in B_GRID:
        need = MARGIN * thr_whitewash(b)
        rows = []
        for w in W_GRID:
            for s in SPOT_GRID:
                if w * s < need:
                    continue
                tot = s + (1.0 - (1.0 + r_ep) ** (-w)) + (1.0 - math.exp(-w / w0))
                rows.append((tot, w, s))
        rows.sort()
        tot, w, s = rows[0]
        picks[b] = (w, s)
        print(f"{b:>5.1f} {need:>12.3f} {w:>4} {s:>10.2f} {w*EPOCH_DAYS:>10} {tot:>9.4f} "
              f"{w*s/thr_whitewash(b):>6.1f}x")
    line()
    print("(r_năm=15 % · W0=12 epoch · lưới W in {1..104}, rho_spot in {0,01..0,50})")
    print()
    print("Dải còn đúng — cặp (W, rho_spot) tối thiểu cho b = 0,5 (ngưỡng W*rs >= "
          f"{MARGIN*thr_whitewash(0.5):.3f}):")
    for w2 in [4, 6, 8, 12, 16, 24]:
        need = MARGIN * thr_whitewash(0.5) / w2
        flag = "" if need <= 0.5 else "   (vượt lưới kiểm khả thi)"
        print(f"  W = {w2:>3} epoch ({w2*EPOCH_DAYS:>3} ngày) ⇒ rho_spot cần >= {need:.3f}{flag}")
    print()
    need_w = MARGIN * thr_whitewash(0.5) / RHO_SPOT_FLOOR
    print(f"Sàn hiện hành rho_spot = {RHO_SPOT_FLOOR} (params.rs:43) đòi W >= {need_w:.0f} epoch "
          f"= {need_w*EPOCH_DAYS/365:.1f} năm")
    print("⇒ SÀN HIỆN HÀNH KHÔNG ĐỦ RĂN ĐE kể cả cho loại gian 'tiết kiệm chi phí'. Phải nâng")
    print("rho_spot cho tác vụ CÓ THƯỞNG, hoặc chấp nhận treo tiền hàng năm — không có đường thứ ba.")
    print()
    print("KHÔNG KẾT LUẬN ĐƯỢC: giá trị b thật của từng tài nguyên (storage/compute/bandwidth/")
    print("sensing) — nó là tỉ lệ chi phí biên tránh được trên doanh thu biên của node, chưa có")
    print("phép đo nào trong mã. Bảng trên quét b in {0,2 · 0,5 · 0,8}, không chốt được một b.")


def main():
    line("#")
    print(f"{NAME} · hạt giống {SEED} · chạy ngày {date.today().isoformat()}")
    line("#")
    b1_absolute()
    b2_proportional()
    b3_montecarlo()
    b4_cost()
    b5_summary()


if __name__ == "__main__":
    main()
