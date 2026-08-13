#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mô hình C — hệ số alpha của thuế hai phần (RE-7).

    earn = alpha * retainer(năng lực đã cam kết, ĐÃ QUA THÁCH THỨC)
         + (1-alpha) * đã giao

Ràng buộc cứng: KHÔNG có thách thức ngẫu nhiên ⟹ alpha = 0.
Hôm nay cả bốn tài nguyên đều không có thách thức đủ mạnh ⟹ alpha = 0 là TRẠNG THÁI
HIỆN TẠI của toàn hệ. Mô phỏng để biết alpha nên bằng bao nhiêu KHI đã có thách thức.

Cơ chế: mỗi nhà cung cấp là một bài toán "người bán báo" (newsvendor). Đơn vị năng lực
CUỐI CÙNG chỉ sinh tiền khi cầu vượt năng lực hiện có ⇒ doanh thu BIÊN = rho*p*P(d>k),
thấp hơn doanh thu TRUNG BÌNH rho*p*E[u]. Đó là lý do năng lực tự co về mức không có
dự phòng. Retainer trả theo năng lực cam kết nên nó cộng thẳng vào doanh thu BIÊN.

Chỉ dùng thư viện chuẩn. Hạt giống cố định.
"""

import math
import random
from datetime import date

SEED = 20260813
NAME = "MÔ HÌNH C — hệ số alpha (RE-7)"

RHO = 0.55          # từ Mô hình A (hệ đã vá)
PRICE = 1.0         # chuẩn hoá giá một đơn vị phục vụ
COST_RATIO = 0.30   # C / (rho*p) — chi phí giữ một đơn vị năng lực, tính theo doanh thu tối đa
NSAMP = 20000
ALPHAS = [i * 0.05 for i in range(0, 13)]   # 0 .. 0.60


def line(ch="-", n=100):
    print(ch * n)


def head(t):
    print()
    line("=")
    print(t)
    line("=")


# --------------------------------------------------------------------------
# Hai dạng cầu
# --------------------------------------------------------------------------
def demand_poisson_burst(rng, n):
    """90 % epoch nền lam=100; 10 % epoch bùng nổ lam=400.

    Cường độ lam có thêm nhiễu nhân log-chuẩn sigma=0,35 để phân bố LIÊN TỤC.
    Không có nhiễu này thì mật độ có LỖ HỔNG giữa 130 và 370, và điểm cân bằng nhảy
    bậc — đó là tật của mẫu thử, không phải của cơ chế.
    """
    out = []
    for _ in range(n):
        base = 400.0 if rng.random() < 0.10 else 100.0
        lam = base * math.exp(rng.gauss(0.0, 0.35))
        out.append(max(0.0, rng.gauss(lam, math.sqrt(lam))))
    return sorted(out)


def demand_lognormal(rng, n):
    """Log-chuẩn đuôi dày, cùng kỳ vọng ~130 để so được với dạng trên."""
    sigma = 0.80
    mu = math.log(130.0) - sigma * sigma / 2
    return sorted(max(0.0, math.exp(rng.gauss(mu, sigma))) for _ in range(n))


def stats(sample):
    n = len(sample)
    mean = sum(sample) / n
    return mean, sample[n // 2], sample[int(0.95 * n)], sample[int(0.99 * n)]


def e_min(sample, k):
    """E[min(d,k)] trên mẫu ĐÃ SẮP XẾP."""
    n = len(sample)
    # tìm chỉ số đầu tiên có d > k
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if sample[mid] <= k:
            lo = mid + 1
        else:
            hi = mid
    s = 0.0
    for i in range(lo):
        s += sample[i]
    s += (n - lo) * k
    return s / n


def p_gt(sample, k):
    """P(d > k) trên mẫu ĐÃ SẮP XẾP."""
    n = len(sample)
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if sample[mid] <= k:
            lo = mid + 1
        else:
            hi = mid
    return (n - lo) / n


# --------------------------------------------------------------------------
# Cân bằng: điểm bất động của (k, omega)
# --------------------------------------------------------------------------
def quantile(sample, q):
    """Phân vị q của mẫu ĐÃ SẮP XẾP."""
    n = len(sample)
    i = min(n - 1, max(0, int(q * n)))
    return sample[i]


def k_of_omega(sample, alpha, omega, C):
    """Năng lực nhà cung cấp chọn khi thấy suất retainer omega (nhận omega là GIÁ NGOẠI SINH).

    FOC: alpha*omega + (1-alpha)*rho*p*P(d>k) = C  ⟹  P(d>k) = (C - alpha*omega)/((1-alpha)*rho*p)
    """
    if alpha >= 1.0:
        return quantile(sample, 0.999)
    q = (C - alpha * omega) / ((1 - alpha) * RHO * PRICE)
    if q <= 0.0:
        return quantile(sample, 0.999)      # muốn năng lực vô hạn ⇒ chặn ở p99.9
    if q >= 1.0:
        return max(1e-6, quantile(sample, 0.0))
    return max(1e-6, quantile(sample, 1.0 - q))


def equilibrium(sample, alpha, cost_ratio=COST_RATIO, iters=60):
    """Điểm bất động (k*, omega*), giải bằng CHIA ĐÔI trên omega (G giảm đơn điệu).

    Ràng buộc ngân sách RE-1: phần retainer lấy từ chính pool ⇒ omega = rho*p*E[min(d,k)]/k.
    """
    C = cost_ratio * RHO * PRICE
    lo, hi = 0.0, RHO * PRICE
    for _ in range(iters):
        mid = (lo + hi) / 2
        k = k_of_omega(sample, alpha, mid, C)
        g = RHO * PRICE * e_min(sample, k) / k - mid
        if g > 0:
            lo = mid
        else:
            hi = mid
    omega = (lo + hi) / 2
    k = k_of_omega(sample, alpha, omega, C)
    return k, omega


def run_dist(name, sample):
    head(f"C1. {name}")
    mean, med, p95, p99 = stats(sample)
    print(f"Mẫu cầu: n={len(sample)}  E[d]={mean:.1f}  trung vị={med:.1f}  p95={p95:.1f}  p99={p99:.1f}")
    print(f"rho={RHO}  p={PRICE}  C/(rho*p)={COST_RATIO}  ⇒ C={COST_RATIO*RHO*PRICE:.4f}/đơn vị năng lực/epoch")
    print()
    C = COST_RATIO * RHO * PRICE
    # mức năng lực TỐI ƯU XÃ HỘI: giá trị biên một đơn vị phục vụ = p (không bị cắt bởi rho)
    k_soc = quantile(sample, 1.0 - C / PRICE)
    sw_soc = e_min(sample, k_soc) * PRICE - C * k_soc
    print(f"Năng lực tối ưu xã hội (P(d>k)=C/p={C/PRICE:.3f}): K_soc={k_soc:.1f}, "
          f"thặng dư={sw_soc:.2f}")
    print()
    print(f"{'alpha':>6} {'K*':>8} {'omega':>7} {'phục vụ':>9} {'u=đã dùng':>10} {'chi/phục vụ':>12} "
          f"{'trả cho rỗi':>12} {'ăn không/thật':>14} {'MT-đặc tả':>10} {'thặng dư':>9}")
    line()
    base_cost = None
    rows = []
    for a in ALPHAS:
        k, omega = equilibrium(sample, a)
        served = e_min(sample, k)
        served_frac = served / mean
        util = served / k
        cost_per_served = C * k / served
        pay_total = RHO * PRICE * served                      # pool epoch (RE-1)
        pay_idle = a * omega * (k - served)                   # phần retainer rơi vào năng lực rỗi
        idle_frac = pay_idle / pay_total
        profit_honest = pay_total - C * k
        free_per_epoch = a * omega * k                        # kẻ khai khống, chi phí 0
        sw = served * PRICE - C * k                           # thặng dư xã hội
        rows.append((a, k, omega, served_frac, util, cost_per_served, idle_frac,
                     free_per_epoch, profit_honest, sw))
        if base_cost is None:
            base_cost = cost_per_served
    for (a, k, omega, sf, util, cps, idle, freeg, prof, sw) in rows:
        obj = sf - cps / base_cost
        ratio = freeg / prof if prof > 0 else float("inf")
        print(f"{a:>6.2f} {k:>8.1f} {omega:>7.4f} {sf:>9.4f} {util:>10.4f} {cps:>12.4f} "
              f"{idle:>12.4f} {ratio:>13.3f}x {obj:>10.4f} {sw:>9.2f}")
    line()
    b_spec = max(rows, key=lambda r: r[3] - r[5] / base_cost)
    b_sw = max(rows, key=lambda r: r[9])
    print(f"[MT-đặc tả]  (phục vụ - chi phí chuẩn hoá) tối đa tại alpha = {b_spec[0]:.2f}  "
          f"⇒ K*={b_spec[1]:.1f}, phục vụ {b_spec[3]*100:.2f} %")
    print(f"[thặng dư]   (giá trị phục vụ - chi phí năng lực) tối đa tại alpha = {b_sw[0]:.2f}  "
          f"⇒ K*={b_sw[1]:.1f}, phục vụ {b_sw[3]*100:.2f} %, thặng dư {b_sw[9]:.2f} "
          f"/ {sw_soc:.2f} tối ưu = {100*b_sw[9]/sw_soc:.1f} %")
    print(f"             alpha=0 cho thặng dư {rows[0][9]:.2f} = {100*rows[0][9]/sw_soc:.1f} % tối ưu.")
    print("Cột 'ăn không/thật' = tiền một node khai khống (năng lực 0, chi phí 0) hưởng mỗi epoch,")
    print("chia cho LỢI NHUẬN một node thật cùng quy mô. > 1 nghĩa là khai khống lãi hơn làm thật.")
    return rows, mean, base_cost, sw_soc


def c2_freerider(sample, mean):
    head("C2. Kẻ ăn không khi thách thức chỉ bắt được với xác suất rho_spot")
    print("Kẻ khai khống hưởng alpha*omega*k mỗi epoch, chi phí 0, tới khi trượt thách thức.")
    print("Số epoch sống trung bình = 1/rho_spot. Tổng ăn được = alpha*omega*k/rho_spot.")
    print("So với LỢI NHUẬN một node thật cùng quy mô trong CÙNG số epoch đó.")
    print()
    print(f"{'alpha':>6} |" + "".join(f"{'rs=' + format(s, '.2f'):>12}" for s in [0.01, 0.05, 0.20, 0.50, 1.00]))
    line()
    for a in [0.05, 0.10, 0.20, 0.30, 0.40, 0.60]:
        k, omega = equilibrium(sample, a)
        served = e_min(sample, k)
        profit_honest = RHO * PRICE * served - COST_RATIO * RHO * PRICE * k
        cells = []
        for rs in [0.01, 0.05, 0.20, 0.50, 1.00]:
            life = 1.0 / rs
            take = a * omega * k * life
            hon = profit_honest * life
            cells.append(f"{take/hon:>11.2f}x" if hon > 0 else f"{'thật lỗ':>12}")
        print(f"{a:>6.2f} |" + "".join(cells))
    line()
    print("Đọc: tỉ số KHÔNG phụ thuộc rho_spot (cả hai vế cùng nhân 1/rho_spot) — nghĩa là")
    print("thách thức thưa KHÔNG làm kẻ ăn không lãi hơn TÍNH TRÊN MỘT ĐỜI NODE, nhưng nó kéo")
    print("dài đời node ⇒ tổng thiệt hại tuyệt đối tỉ lệ 1/rho_spot. Con số phải đọc cùng B5.")
    print("Điều chặn kẻ ăn không KHÔNG phải rho_spot, mà là: retainer chỉ trả cho năng lực ĐÃ")
    print("QUA thách thức (RE-7) ⇒ khai khống nhận 0 ngay từ epoch đầu, không phải chờ bị bắt.")


def c3_sensitivity(sample):
    head("C3. Độ nhạy theo chi phí C/(rho*p) và theo rho — alpha* tối đa hoá THẶNG DƯ")
    print("alpha sinh ra để bù đúng phần THIẾU HỤT NĂNG LỰC do rho < 1 gây ra:")
    print("  tối ưu xã hội đòi P(d>k) = C/p ; cân bằng alpha=0 chỉ cho P(d>k) = C/(rho*p).")
    print()
    print(f"{'rho':>5} {'C/(rho*p)':>10} {'alpha*':>7} {'K*(a*)':>9} {'K_soc':>8} {'phục vụ(a*)':>12} "
          f"{'phục vụ(a=0)':>13} {'%thặng dư(a*)':>14} {'%thặng dư(a=0)':>15}")
    line()
    mean = sum(sample) / len(sample)
    global RHO
    rho_save = RHO
    for rho in [0.35, 0.55, 0.75, 0.95]:
        RHO = rho
        for cr in [0.20, 0.30, 0.50]:
            C = cr * RHO * PRICE
            k_soc = quantile(sample, 1.0 - C / PRICE)
            sw_soc = e_min(sample, k_soc) - C * k_soc
            best = None
            base = None
            for a in ALPHAS:
                k, _ = equilibrium(sample, a, cost_ratio=cr)
                served = e_min(sample, k)
                sw = served - C * k
                if base is None:
                    base = (served / mean, sw)
                if best is None or sw > best[0]:
                    best = (sw, a, k, served / mean)
            print(f"{rho:>5.2f} {cr:>10.2f} {best[1]:>7.2f} {best[2]:>9.1f} {k_soc:>8.1f} "
                  f"{best[3]:>12.4f} {base[0]:>13.4f} {100*best[0]/sw_soc:>13.1f}% "
                  f"{100*base[1]/sw_soc:>14.1f}%")
    RHO = rho_save
    line()
    print("Đọc: rho càng thấp (thuế chống farm càng nặng) thì thiếu hụt năng lực càng lớn và")
    print("alpha* càng cao — hai tham số này KHÔNG độc lập, phải chốt cùng nhau.")


def main():
    line("#")
    print(f"{NAME} · hạt giống {SEED} · chạy ngày {date.today().isoformat()}")
    line("#")
    print()
    print("RÀNG BUỘC CỨNG ĐI TRƯỚC MỌI CON SỐ DƯỚI ĐÂY:")
    print("  Không có thách thức ngẫu nhiên ⟹ alpha = 0. Hôm nay STORAGE có PoR; COMPUTE,")
    print("  BANDWIDTH, SENSING chưa có ⟹ alpha = 0 cho ba loại đó, không phải ca biên.")
    print("  Bảng dưới trả lời câu 'alpha nên bằng bao nhiêu KHI đã có thách thức'.")

    rng1 = random.Random(SEED)
    s1 = demand_poisson_burst(rng1, NSAMP)
    rows1, mean1, base1, sws1 = run_dist("Cầu Poisson bùng nổ (90 % nền lam=100, 10 % đỉnh lam=400)", s1)

    rng2 = random.Random(SEED + 1)
    s2 = demand_lognormal(rng2, NSAMP)
    rows2, mean2, base2, sws2 = run_dist("Cầu log-chuẩn đuôi dày (sigma=0,80, E[d]=130)", s2)

    c2_freerider(s1, mean1)
    c3_sensitivity(s1)

    head("C4. SỐ ĐỀ NGHỊ CHỐT — Mô hình C")
    for tag, rows, sws in [("Poisson bùng nổ  ", rows1, sws1), ("Log-chuẩn đuôi dày", rows2, sws2)]:
        b_sw = max(rows, key=lambda r: r[9])
        b_spec = max(rows, key=lambda r: r[3] - r[5] / rows[0][5])
        print(f"{tag}: alpha*[thặng dư] = {b_sw[0]:.2f} (đạt {100*b_sw[9]/sws:.1f} % thặng dư tối ưu; "
              f"alpha=0 đạt {100*rows[0][9]/sws:.1f} %)")
        print(f"{' '*len(tag)}  alpha*[MT-đặc tả] = {b_spec[0]:.2f}")
    print()
    print("HAI MỤC TIÊU CHO HAI KẾT QUẢ KHÁC NHAU — phải nói rõ, không được giấu:")
    print("  · Mục tiêu ĐÚNG NHƯ ĐẶC TẢ VIẾT (phục vụ - chi phí/đơn vị chuẩn hoá) luôn chọn")
    print("    alpha = 0, vì nó trừ chi phí trên MỘT đơn vị phục vụ: tăng năng lực luôn làm")
    print("    hiệu suất giảm ⇒ số bị trừ luôn tăng. Mục tiêu này thiên vị alpha=0 theo cấu tạo.")
    print("  · Mục tiêu THẶNG DƯ (giá trị phục vụ - chi phí năng lực) mới nói được alpha để")
    print("    làm gì: bù phần thiếu hụt năng lực do chính rho<1 gây ra.")
    print()
    print("KHÔNG KẾT LUẬN ĐƯỢC: giá một đơn vị phục vụ ở ĐỈNH so với ở nền. Mô hình định giá")
    print("mọi đơn vị BẰNG NHAU (p=1). Nếu trượt đỉnh làm mất khách vĩnh viễn hoặc kích hoạt")
    print("phạt SLA thì alpha* cao hơn số trên. Muốn chốt alpha thì phải đo cái đó trước.")
    print()
    print("RÀNG BUỘC PHỦ LÊN MỌI SỐ TRÊN: alpha chỉ được > 0 khi thách thức ngẫu nhiên chạy")
    print("thật. Cột 'ăn không/thật' cho thấy vì sao: ở alpha=0,45 trở lên, node khai khống")
    print("(năng lực 0, chi phí 0) đã ăn nhiều hơn LỢI NHUẬN của node thật cùng quy mô.")


if __name__ == "__main__":
    main()
