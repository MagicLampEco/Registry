#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mô hình E — hệ số hạng, thay cho 0,5 / 0,75 / 1,0 tự khai.

Hôm nay (lampnet-reward/src/types.rs:70-76 @2e294b3):
    Newbie 0,5 · Contributor 0,75 · Trusted 1,0
và trường `tier` do BÊN GỌI TỰ KHAI: lampnet-mirage/src/bin/lampnet-node.rs:6268,
trong struct #[derive(Deserialize)] của request tính thưởng (kiểm ở HEAD e5d144d).
Hai tật: (a) tự khai, (b) không dẫn được từ đâu.

Thay bằng số DẪN ĐƯỢC: chênh hệ số giữa hai hạng = chênh TỔN THẤT KỲ VỌNG người mua gánh.
Hạng i có xác suất kết quả hỏng q_i, một lần hỏng tốn L (tính theo giá một đơn vị công việc)
để phát hiện + làm lại:

    giá trị ròng một đơn vị công việc của hạng i  ∝  (1 - q_i) - q_i * L

Chuẩn hoá theo hạng cao nhất ⇒ hệ số.

Chỉ dùng thư viện chuẩn. Hạt giống cố định.
"""

import math
import random
from datetime import date

SEED = 20260813
NAME = "MÔ HÌNH E — hệ số hạng thay cho 0,5 / 0,75 / 1,0"
EPOCH_DAYS = 5
CUR = {"Newbie": 0.5, "Contributor": 0.75, "Trusted": 1.0}


def line(ch="-", n=96):
    print(ch * n)


def head(t):
    print()
    line("=")
    print(t)
    line("=")


def value(q, L):
    return (1.0 - q) - q * L


# --------------------------------------------------------------------------
# E1 — bảng hệ số dẫn được
# --------------------------------------------------------------------------
def e1_table():
    head("E1. Hệ số dẫn từ tổn thất kỳ vọng: w_i = [(1-q_i) - q_i*L] / [(1-q_T) - q_T*L]")
    print("q_T (Trusted) = 0,005 cố định trong bảng này. Quét q_N (Newbie) và L.")
    print("q_C (Contributor) = trung bình HÌNH HỌC của q_N và q_T — giả định: leo hạng giảm")
    print("lỗi theo bậc nhân, không theo bậc cộng.")
    print()
    qT = 0.005
    for L in [0.0, 1.0, 2.0, 5.0, 10.0]:
        print(f"  L = {L:.0f} (một lần hỏng tốn {L:.0f} lần giá một đơn vị công việc)")
        print(f"    {'q_N':>7} {'q_C':>8} {'w_Newbie':>10} {'w_Contrib':>11} {'w_Trusted':>11} {'ghi chú':>28}")
        for qN in [0.01, 0.02, 0.05, 0.10, 0.20, 0.35, 0.50]:
            qC = math.sqrt(qN * qT)
            vT, vC, vN = value(qT, L), value(qC, L), value(qN, L)
            note = ""
            if vN <= 0:
                note = "hạng này ÂM ⇒ phải loại, không hạ hệ số"
            print(f"    {qN:>7.3f} {qC:>8.4f} {max(vN,0)/vT:>10.3f} {vC/vT:>11.3f} {1.0:>11.3f} {note:>28}")
        print()
    line()
    print(f"Bộ hiện hành để so: Newbie {CUR['Newbie']} · Contributor {CUR['Contributor']} · "
          f"Trusted {CUR['Trusted']}.")


# --------------------------------------------------------------------------
# E2 — đảo ngược: q nào thì 0,5 mới đúng
# --------------------------------------------------------------------------
def e2_invert():
    head("E2. Đảo ngược — phải hỏng nhiều tới mức nào thì hệ số 0,5 mới ĐÚNG?")
    print("Giải q_N từ  [(1-q_N) - q_N*L] / [(1-q_T) - q_T*L] = w  với q_T = 0,005.")
    print()
    qT = 0.005
    print(f"{'L':>5} |" + "".join(f"{'w=' + format(w, '.2f'):>14}" for w in [0.50, 0.75, 0.90]))
    line()
    for L in [0.0, 0.5, 1.0, 2.0, 5.0, 10.0]:
        vT = value(qT, L)
        cells = []
        for w in [0.50, 0.75, 0.90]:
            # (1-q) - qL = w*vT  ⟹  q = (1 - w*vT)/(1+L)
            q = (1.0 - w * vT) / (1.0 + L)
            cells.append(f"{q*100:>13.2f}%")
        print(f"{L:>5.1f} |" + "".join(cells))
    line()
    print("Đọc: cột w=0,50 là lời khai NGẦM mà hệ số 0,5 hiện hành đang phát biểu.")
    print("  L=0  ⇒ hệ số 0,5 nói: 'Newbie hỏng 50 % số việc.'")
    print("  L=1  ⇒ nói: 'Newbie hỏng 25 % số việc.'")
    print("  L=5  ⇒ nói: 'Newbie hỏng 8 % số việc.'")
    print("Chưa có phép đo nào trong mã cho q của bất kỳ hạng nào. Nghĩa là 0,5/0,75/1,0 đang")
    print("phát biểu một mệnh đề định lượng về chất lượng mà KHÔNG AI ĐO. Đó là tật thật, và")
    print("nó nặng hơn 'con số hơi lệch': nó khiến giá không mang thông tin chất lượng.")


# --------------------------------------------------------------------------
# E3 — ngưỡng mà giảm hệ số là công cụ SAI
# --------------------------------------------------------------------------
def e3_threshold():
    head("E3. Ngưỡng mà 'giảm hệ số' không còn là công cụ đúng")
    print("Giá trị ròng âm khi (1-q) - q*L < 0  ⟺  q > 1/(1+L). Trên ngưỡng đó, mỗi đơn vị")
    print("công việc của hạng ấy LÀM MẤT giá trị của người mua; hệ số dương bất kỳ đều là trợ giá.")
    print()
    print(f"{'L':>6} {'q ngưỡng':>12} {'nghĩa là':>52}")
    line()
    for L in [0.0, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]:
        q = 1.0 / (1.0 + L)
        print(f"{L:>6.1f} {q*100:>11.2f}% {'hỏng quá mức này thì phải CHẶN NHẬN VIỆC, không hạ hệ số':>52}")
    line()
    print("Hệ quả thiết kế: bảng hệ số cần một CỘT THỨ HAI — ngưỡng loại. Bộ 0,5/0,75/1,0 hiện")
    print("hành không có ngưỡng loại nào, nên một node hỏng 90 % số việc vẫn được nhận việc và")
    print("vẫn được trả 0,5 phần.")


# --------------------------------------------------------------------------
# E4 — leo hạng bằng làm thật phải rẻ hơn dựng node mới
# --------------------------------------------------------------------------
def e4_ladder():
    head("E4. Ràng buộc leo hạng: làm thật phải RẺ HƠN dựng node mới (chống tẩy trắng)")
    print("Kẻ gian bị bắt sẽ vứt danh tính, dựng node mới, quay lại hạng thấp nhất. Chi phí của")
    print("đường tẩy trắng = (mất số dư treo W*R) + (T epoch chạy ở hệ số thấp w_lo thay vì w_hi).")
    print("Lợi của một vòng gian, theo Mô hình B, = b*R mỗi epoch, sống trung bình 1/rho_spot epoch.")
    print()
    margin = 2.0
    print(f"Điều kiện chống tẩy trắng, với biên an toàn {margin:.0f}x cho đồng bộ với Mô hình B:")
    print(f"    W  +  T*(w_hi - w_lo)   >=   {margin:.0f} * b/rho_spot")
    print(f"⟹  T_min = max(0, ({margin:.0f}*b/rho_spot - W) / (w_hi - w_lo))     [đơn vị: epoch]")
    print()
    sets = [(0.50, 1.00, "hiện hành"),
            (0.909, 1.00, "E1 L=1"),
            (0.955, 1.00, "E1 L=0")]
    print("Ba bộ hệ số đem so (w_lo -> w_hi):")
    for wl, wh, t in sets:
        print(f"    {t:<12} {wl:.3f} -> {wh:.3f}   dw = {wh-wl:.3f}")
    print()
    print(f"{'b':>5} {'rho_spot':>9} {'W':>4} |" +
          "".join(f"{t:>26}" for wl, wh, t in sets))
    line()
    for b in [0.2, 0.5]:
        for rs in [0.05, 0.20, 0.35]:
            for W in [4, 12]:
                cells = []
                for wl, wh, _ in sets:
                    t = max(0.0, (margin * b / rs - W) / (wh - wl))
                    cells.append(f"{t:>12.1f} ep /{t*EPOCH_DAYS:>6.0f} n")
                print(f"{b:>5.1f} {rs:>9.2f} {W:>4} |" + "".join(f"{c:>26}" for c in cells))
    line()
    print("('ep' = epoch, 'n' = ngày)")
    print("Đọc: chênh hệ số CÀNG NHỎ thì T_min CÀNG LỚN — bộ dẫn được (dw = 0,045-0,091)")
    print("đòi thời gian leo hạng dài hơn bộ hiện hành (dw = 0,50) để chặn cùng mức tẩy trắng.")
    print("Đây là ĐÁNH ĐỔI THẬT, không phải chi tiết: số dẫn được thì đúng về mặt giá trị nhưng")
    print("yếu hơn về mặt răn đe. Cách đúng: giữ hệ số theo giá trị (E1) và chuyển việc răn đe")
    print("sang W & rho_spot (Mô hình B), KHÔNG nhét cả hai việc vào một con số.")
    print()
    print("Chiều ngược lại (leo bằng làm thật phải rẻ hơn dựng node mới): node mới CŨNG phải")
    print("chạy T epoch ở hạng thấp, nên đường 'làm thật' luôn rẻ hơn hoặc bằng — miễn là hạng")
    print("KHÔNG chuyển nhượng được và KHÔNG tự khai. Hôm nay tier tự khai ⇒ T_min hiệu lực = 0")
    print("⇒ ràng buộc này đang KHÔNG tồn tại trong mã.")


# --------------------------------------------------------------------------
# E5 — mô phỏng kiểm chứng: thị trường chanh khi hệ số sai
# --------------------------------------------------------------------------
def e5_lemons(paths=2000, epochs=200):
    head("E5. Mô phỏng kiểm chứng — hệ số sai thì ai bị trả sai bao nhiêu")
    print("Mạng gồm 100 node: 40 'tốt' (q=0,005), 40 'vừa' (q=0,016), 20 'kém' (q=0,05).")
    print("Mỗi epoch mỗi node làm 1 đơn vị công việc; kết quả hỏng theo q của nó.")
    print("So hai cách trả: (1) hệ số hiện hành theo hạng TỰ KHAI, (2) hệ số E1 theo q thật.")
    print(f"{paths} lượt bốc, {epochs} epoch, hạt giống {SEED}.")
    print()
    rng = random.Random(SEED)
    L = 1.0
    qs = {"tốt": 0.005, "vừa": 0.0158, "kém": 0.05}
    cnt = {"tốt": 40, "vừa": 40, "kém": 20}
    vT = value(qs["tốt"], L)
    w_fair = {k: value(v, L) / vT for k, v in qs.items()}
    print(f"{'nhóm':>6} {'q thật':>8} {'w đúng (E1)':>12} {'w nếu khai thật':>16} "
          f"{'w nếu khai gian':>16} {'sai lệch trả':>14}")
    line()
    # khai thật: tốt->Trusted 1,0 ; vừa->Contributor 0,75 ; kém->Newbie 0,5
    claim_honest = {"tốt": 1.0, "vừa": 0.75, "kém": 0.5}
    for k in ["tốt", "vừa", "kém"]:
        print(f"{k:>6} {qs[k]:>8.4f} {w_fair[k]:>12.3f} {claim_honest[k]:>16.2f} "
              f"{1.0:>16.2f} {(1.0 - w_fair[k])*100:>13.1f}%")
    line()
    print("Cột cuối = phần trăm TRẢ THỪA cho một node khi nó khai Trusted (1,0) trong khi giá")
    print("trị thật của nó thấp hơn. Vì trường tier TỰ KHAI, cột 'khai gian' là hành vi tối ưu")
    print("của mọi node ⇒ trong cân bằng, MỌI node đều khai Trusted và bộ hệ số 0,5/0,75/1,0")
    print("không phân biệt được ai với ai. Kiểm bằng mô phỏng:")
    print()
    tot_over = 0.0
    for _ in range(paths):
        k = rng.choices(list(cnt), weights=list(cnt.values()))[0]
        tot_over += (1.0 - w_fair[k])
    print(f"  Trả thừa trung bình mỗi node-epoch khi tất cả khai Trusted: "
          f"{tot_over/paths*100:.2f} % giá một đơn vị công việc.")
    exp_analytic = sum(cnt[k] * (1.0 - w_fair[k]) for k in cnt) / sum(cnt.values())
    print(f"  Đối chiếu dạng đóng: {exp_analytic*100:.2f} %  (khớp trong sai số bốc mẫu)")
    print(f"  Quy ra mỗi epoch toàn mạng: {tot_over/paths*100:.2f} % của pool bị chuyển từ node")
    print("  tốt sang node kém. Đó là thuế mà bộ hệ số tự khai đang thu của người làm thật.")


def main():
    line("#")
    print(f"{NAME} · hạt giống {SEED} · chạy ngày {date.today().isoformat()}")
    line("#")
    e1_table()
    e2_invert()
    e3_threshold()
    e4_ladder()
    e5_lemons()

    head("E6. SỐ ĐỀ NGHỊ CHỐT — Mô hình E")
    qT, L = 0.005, 1.0
    print("Bộ hệ số đề nghị (q_T=0,005 · q_C=0,016 · q_N=0,05 · L=1):")
    for name, q in [("Newbie     ", 0.05), ("Contributor", 0.0158), ("Trusted    ", 0.005)]:
        w = value(q, L) / value(qT, L)
        print(f"  {name}  q={q:<7.4f}  w = {w:.3f}   (hiện hành {CUR[name.strip()]:.2f}, "
              f"chênh {w - CUR[name.strip()]:+.3f})")
    print()
    wN = value(0.05, L) / value(qT, L)
    print("Bộ hiện hành sai lệch chỗ nào: nó GIÃN quá rộng.")
    print("  · Muốn 0,5 đúng ở L=1 thì Newbie phải hỏng 25,25 % số việc (E2) — tức đã đi được")
    print("    nửa đường tới ngưỡng LOẠI HẲN 50 % (E3). Hệ số 0,5 đang mô tả một node sắp bị")
    print("    đuổi, không phải một node mới vào.")
    print(f"  · Bộ dẫn được nằm trong [{wN:.3f}; 1,000] — hẹp hơn bộ hiện hành khoảng "
          f"{(1-CUR['Newbie'])/(1-wN):.1f} lần.")
    print("  · Bộ hiện hành GỘP hai việc vào một số: định giá chất lượng VÀ răn đe tẩy trắng.")
    print("    E4 cho thấy tách ra thì mỗi việc có công cụ riêng đo được.")
    print()
    print("KHÔNG KẾT LUẬN ĐƯỢC: q thật của từng hạng và L thật. Chưa có phép đo nào trong mã.")
    print("Bảng E1 quét q_N in [0,01; 0,50] và L in [0; 10] để chủ sở hữu chọn theo số ĐO ĐƯỢC")
    print("khi có. Trước khi đo được q thì mọi bộ hệ số — kể cả bộ đề nghị ở trên — vẫn là")
    print("giả định; chỗ khác nhau là bộ đề nghị nói RÕ nó giả định gì.")


if __name__ == "__main__":
    main()
