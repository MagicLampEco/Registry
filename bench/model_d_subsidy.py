#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mô hình D — trợ giá khởi động S_E (RE-2, RE-2b).

    pool_E = rho * SUM required_P(E) + S_E ,  S_E = max(0, N*C - rho*D_E)

Đơn vị: MỌI số dưới đây chuẩn hoá theo N*C = 1 (chi phí toàn bộ nhà cung cấp trong
MỘT epoch). Muốn ra LAMP thì nhân với N*C tính bằng LAMP/epoch — bảng quy đổi ở D4.
Làm vậy vì giá LAMP và chi phí vận hành thật CHƯA ĐO ĐƯỢC; ép ra một số LAMP tuyệt
đối lúc này là bịa.

Chỉ dùng thư viện chuẩn. Hạt giống cố định.
"""

import math
import random
from datetime import date

SEED = 20260813
NAME = "MÔ HÌNH D — trợ giá khởi động S_E (RE-2)"

RHO = 0.55                 # từ Mô hình A (hệ đã vá)
NC = 1.0                   # chi phí toàn bộ nhà cung cấp mỗi epoch — đơn vị chuẩn hoá
D_TARGET = 4.0 * NC / RHO  # cầu chín: rho*D = 4*N*C (nhà cung cấp lãi 4x chi phí)
EPOCHS = 300
MARGIN_D = 2.0            # biên mô hình bắt buộc trên trần trợ giá
EPOCH_DAYS = 5
LAMP_SUPPLY = 36_000_000_000
# lệch hạt giống cố định theo kịch bản — KHÔNG dùng hash() (hash chuỗi ngẫu nhiên mỗi tiến trình)
KIND_OFFSET = {"chậm": 0, "trung bình": 10_000, "nhanh": 20_000}


def line(ch="-", n=96):
    print(ch * n)


def head(t):
    print()
    line("=")
    print(t)
    line("=")


# --------------------------------------------------------------------------
# Ba kịch bản cầu
# --------------------------------------------------------------------------
def demand_path(kind, rng):
    """D_E theo epoch. Dạng hàm: D_E = D_target * (1 - exp(-E/tau)) * nhiễu log-chuẩn."""
    tau = {"chậm": 60.0, "trung bình": 24.0, "nhanh": 8.0}[kind]
    out = []
    for e in range(1, EPOCHS + 1):
        base = D_TARGET * (1.0 - math.exp(-e / tau))
        out.append(max(0.0, base * math.exp(rng.gauss(0.0, 0.15))))
    return out


def d1_paths(paths=200):
    head("D1. Ba kịch bản cầu và đường S_E = max(0, N*C - rho*D_E)")
    print(f"rho={RHO}  ·  N*C={NC} (chuẩn hoá)  ·  D_target={D_TARGET:.2f} (tức rho*D_target = "
          f"{RHO*D_TARGET:.1f}*N*C)")
    print("Dạng hàm: D_E = D_target*(1 - exp(-E/tau)) * exp(N(0; 0,15)).")
    print(f"tau: chậm=60 epoch · trung bình=24 · nhanh=8. {paths} đường mỗi kịch bản, "
          f"{EPOCHS} epoch, hạt giống {SEED}.")
    print()
    print(f"{'kịch bản':>12} {'E tự nuôi nổi':>15} {'S_1':>7} {'S_10':>7} {'S_24':>7} {'S_52':>7} "
          f"{'TỔNG tích luỹ':>15} {'p95 tổng':>10}")
    line()
    res = {}
    for kind in ["chậm", "trung bình", "nhanh"]:
        totals = []
        firsts = []
        sample_path = None
        for i in range(paths):
            rng = random.Random(SEED + KIND_OFFSET[kind] + i)
            d = demand_path(kind, rng)
            s = [max(0.0, NC - RHO * x) for x in d]
            totals.append(sum(s))
            first = next((e for e, v in enumerate(s, 1) if v <= 0.0), None)
            if first:
                firsts.append(first)
            if i == 0:
                sample_path = s
        totals.sort()
        med_first = sorted(firsts)[len(firsts) // 2] if firsts else None
        res[kind] = (totals, sample_path, med_first)
        print(f"{kind:>12} {(str(med_first) + ' epoch') if med_first else 'không đạt':>15} "
              f"{sample_path[0]:>7.3f} {sample_path[9]:>7.3f} {sample_path[23]:>7.3f} "
              f"{sample_path[51]:>7.3f} {sum(totals)/len(totals):>15.2f} "
              f"{totals[int(0.95*(len(totals)-1))]:>10.2f}")
    line()
    print("Đọc: 'E tự nuôi nổi' = epoch đầu tiên rho*D_E >= N*C (trung vị). S_E in đơn vị N*C.")
    print("'TỔNG tích luỹ' = tổng S_E qua 300 epoch, đơn vị 'N*C mỗi epoch' — tức là bằng bao")
    print("nhiêu epoch chi phí toàn mạng. p95 = kịch bản xui (nhiễu bất lợi).")
    return res


# --------------------------------------------------------------------------
# D2 — lịch suy giảm công khai, tất định
# --------------------------------------------------------------------------
def d2_decay(res):
    head("D2. Lịch suy giảm CÔNG KHAI, TẤT ĐỊNH — trần cứng cho tổng trợ giá")
    print("Lịch đề nghị: S_E^trần = S_0 * gamma^(E-1), tổng vô hạn = S_0/(1-gamma).")
    print("Tất định ⇒ ai cũng tính trước được; không phụ thuộc số liệu tự khai của bất kỳ ai.")
    print("Thực chi: S_E = min(S_E^trần, max(0, N*C - rho*D_E)) — trả ĐÚNG phần thiếu, có mũ chặn.")
    print()
    worst = max(res[k][0][int(0.95 * (len(res[k][0]) - 1))] for k in res)
    print(f"Nhu cầu tổng ở kịch bản XẤU NHẤT (chậm, p95) = {worst:.2f} đơn vị N*C.")
    print()
    print(f"Quy tắc chọn: trần nhỏ NHẤT mà vẫn phủ kịch bản xấu nhất với biên >= {MARGIN_D:.0f}x.")
    print("Biên này là biên MÔ HÌNH, không phải biên tài chính: dạng hàm tăng trưởng cầu là")
    print("giả định, sai dạng thì nhu cầu lệch. Trần lớn hơn KHÔNG tốn thêm (thực chi vẫn là")
    print("min(trần, thiếu hụt)), nhưng nó nới đúng phần kẻ khai khống rút được ở D3.")
    print()
    print(f"{'S_0':>6} {'gamma':>7} {'tổng trần':>11} {'nửa đời (epoch)':>16} {'ngày':>7} "
          f"{'biên/xấu nhất':>15} {'đạt?':>7}")
    line()
    picks = []
    for s0 in [1.0, 1.5]:
        for gamma in [0.90, 0.95, 0.97, 0.98, 0.99]:
            cap = s0 / (1 - gamma)
            half = math.log(0.5) / math.log(gamma)
            ok = cap >= MARGIN_D * worst
            picks.append((cap, s0, gamma, ok))
            print(f"{s0:>6.2f} {gamma:>7.2f} {cap:>11.2f} {half:>16.1f} {half*EPOCH_DAYS:>7.0f} "
                  f"{cap/worst:>14.2f}x {('CÓ' if ok else 'không'):>7}")
    line()
    good = [p for p in picks if p[3]]
    good.sort()
    cap, s0, gamma, _ = good[0]
    print(f"Chọn: S_0={s0}, gamma={gamma}, trần tổng = {cap:.2f} đơn vị N*C "
          f"(biên {cap/worst:.2f}x trên nhu cầu xấu nhất).")
    print("Kiểm lại thực chi dưới lịch đó (trung bình trên các đường):")
    print()
    print(f"{'kịch bản':>12} {'thực chi tổng':>15} {'% trần':>9} {'epoch cuối còn chi':>20}")
    line()
    for kind in ["chậm", "trung bình", "nhanh"]:
        tot = 0.0
        last = 0
        n = 100
        for i in range(n):
            rng = random.Random(SEED + KIND_OFFSET[kind] + i)
            d = demand_path(kind, rng)
            acc = 0.0
            for e, x in enumerate(d, 1):
                need = max(0.0, NC - RHO * x)
                capE = s0 * gamma ** (e - 1)
                pay = min(need, capE)
                acc += pay
                if pay > 1e-9:
                    last = max(last, e)
            tot += acc
        print(f"{kind:>12} {tot/n:>15.2f} {100*tot/n/cap:>8.1f}% {last:>20}")
    line()
    return s0, gamma, cap


# --------------------------------------------------------------------------
# D3 — RE-2b: trợ giá trả theo năng lực TỰ KHAI thì rút được bao nhiêu
# --------------------------------------------------------------------------
def d3_attack(cap, s0, gamma):
    head("D3. RE-2b — trợ giá trả theo năng lực TỰ KHAI: kẻ tấn công rút được bao nhiêu")
    print("Nếu S_E chia theo NĂNG LỰC TỰ KHAI (hôm nay: total_pool và tier đều tự khai —")
    print("lampnet-node.rs:6196-6230,6245,6461 và :6268 · lampnet-reward/src/types.rs:70-76), thì chi phí")
    print("khai khống ~ 0 và kẻ tấn công chỉ cần khai đủ lớn để chiếm tỉ phần f.")
    print()
    print(f"Trần tổng trợ giá = {cap:.2f} đơn vị N*C (từ D2).")
    print()
    def sched_sum(n):
        """Tổng trần trợ giá của n epoch đầu."""
        n = max(0, int(math.ceil(n)))
        return s0 * (1 - gamma ** n) / (1 - gamma)

    print(f"{'f':>6} {'không thách thức':>18} {'rho_c=0,05':>12} {'rho_c=0,20':>12} "
          f"{'rho_c=0,50':>12} {'rho_c=1,00':>12}")
    line()
    for f in [0.10, 0.30, 0.50, 0.90, 0.99]:
        cells = [f"{f*cap:>18.2f}"]
        for rc in [0.05, 0.20, 0.50, 1.00]:
            # RE-2b: trợ giá chỉ trả cho năng lực ĐÃ QUA thách thức. Khai khống trượt ngay
            # lần thách thức đầu ⇒ số epoch ăn được trung bình = 1/rho_c.
            cells.append(f"{f*min(cap, sched_sum(1.0/rc)):>12.2f}")
        print(f"{f:>6.2f}" + "".join(cells))
    line()
    print(f"(lịch trần dùng ở đây: S_0={s0}, gamma={gamma}; tổng {cap:.2f} đơn vị N*C)")
    print("Đọc: cột 2 = KHÔNG có thách thức ⇒ kẻ tấn công rút ĐÚNG tỉ phần khai của TOÀN BỘ")
    print("trần, cho tới khi trần cạn. f=0,90 ⇒ nuốt 90 % quỹ khởi động. Đây chính là lý do")
    print("RE-2b tồn tại, và giờ có con số: THIỆT HẠI TỐI ĐA = f * trần tổng.")
    print("Cột có thách thức: thiệt hại bị chặn ở ~f * (1/rho_c) epoch trần đầu tiên, tức")
    print("giảm theo 1/rho_c: rho_c=0,20 ⇒ chỉ ăn được phần trần của ~5 epoch đầu.")


# --------------------------------------------------------------------------
# D4 — quy đổi ra LAMP và % nguồn cung
# --------------------------------------------------------------------------
def d4_lamp(cap):
    head("D4. Quy đổi ra LAMP — trần tổng theo từng mức N*C")
    print("N*C = tổng chi phí vận hành TẤT CẢ nhà cung cấp trong MỘT epoch, tính bằng LAMP.")
    print("Đây là đại lượng CHƯA ĐO ĐƯỢC. Neo duy nhất có thật để so: trần thưởng compute")
    print("toàn mạng hôm nay = 0,1 LAMP/epoch (10.000 tác vụ x 10 uLAMP).")
    print()
    print(f"{'N*C (LAMP/epoch)':>18} {'trần tổng (LAMP)':>20} {'% của 36 tỷ':>16} {'ghi chú':>28}")
    line()
    for nc in [0.1, 1.0, 10.0, 100.0, 1_000.0, 10_000.0, 100_000.0, 1_000_000.0]:
        total = cap * nc
        pct = 100.0 * total / LAMP_SUPPLY
        note = "= quy mô thưởng HÔM NAY" if abs(nc - 0.1) < 1e-9 else ""
        print(f"{nc:>18,.1f} {total:>20,.1f} {pct:>15.6f}% {note:>28}")
    line()
    print("Đọc ngược: muốn trần trợ giá KHÔNG vượt X % nguồn cung thì N*C phải dưới:")
    for pct in [0.01, 0.10, 1.00]:
        nc_max = (pct / 100.0) * LAMP_SUPPLY / cap
        print(f"  X = {pct:>5.2f} % ⇒ N*C <= {nc_max:>15,.0f} LAMP/epoch "
              f"(= {nc_max/0.1:>12,.0f} lần quy mô thưởng hôm nay)")
    print()
    print("KHÔNG KẾT LUẬN ĐƯỢC: một con số LAMP tuyệt đối cho trần S_E. Nó là tích của một")
    print("hằng số ĐO ĐƯỢC ở D2 (trần = {:.0f} đơn vị N*C) với một đại lượng CHƯA ĐO (N*C tính".format(cap))
    print("bằng LAMP). Phần đo được thì đã đo; phần chưa đo thì không bịa.")


def main():
    line("#")
    print(f"{NAME} · hạt giống {SEED} · chạy ngày {date.today().isoformat()}")
    line("#")
    res = d1_paths()
    s0, gamma, cap = d2_decay(res)
    d3_attack(cap, s0, gamma)
    d4_lamp(cap)

    head("D5. SỐ ĐỀ NGHỊ CHỐT — Mô hình D")
    print(f"Lịch trợ giá: S_E^trần = {s0} * {gamma}^(E-1) đơn vị N*C, công bố trước, tất định.")
    print(f"Trần tổng cứng: SUM_E S_E <= {cap:.0f} * N*C  (= {cap:.0f} epoch chi phí toàn mạng).")
    print(f"Nửa đời của lịch: {math.log(0.5)/math.log(gamma):.0f} epoch "
          f"= {math.log(0.5)/math.log(gamma)*EPOCH_DAYS:.0f} ngày.")
    print("Thực chi: S_E = min(trần_E, max(0, N*C - rho*D_E)) — ĐÚNG phần thiếu, không hơn.")
    print()
    worst = max(res[k][0][int(0.95 * (len(res[k][0]) - 1))] for k in res)
    print(f"Dải còn đúng: trần {cap:.0f}*N*C phủ được nhu cầu {worst:.2f}*N*C của kịch bản cầu chậm")
    print(f"nhất đã thử (tau=60 epoch = {60*EPOCH_DAYS} ngày để đạt 63 % cầu chín) ở phân vị 95 của")
    print(f"nhiễu — biên {cap/worst:.2f}x. Cầu chậm hơn nữa ⇒ trần này KHÔNG đủ, và đó là chủ ý:")
    print("trần cứng phải CẮT, không được nới. Nới trần = quay về phát hành thuần (RE-2).")
    print()
    print("Giả định mà nếu sai thì số này sai:")
    print("  1. rho = 0,55. rho thấp hơn ⇒ nhu cầu trợ giá cao hơn ĐÚNG TỈ LỆ 1/rho.")
    print("  2. D_target = 4*N*C/rho. Cầu chín thấp hơn ⇒ trợ giá không bao giờ tắt được.")
    print("  3. Trợ giá chỉ trả cho năng lực ĐÃ QUA THÁCH THỨC (RE-2b). Nếu trả theo tự khai")
    print("     thì D3 cho thấy tối đa 99 % trần rơi vào tay kẻ khai khống.")


if __name__ == "__main__":
    main()
