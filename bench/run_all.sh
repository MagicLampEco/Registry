#!/usr/bin/env bash
# Chạy toàn bộ bộ mô phỏng kinh tế tài nguyên LampNet (Mô hình A..E).
# Không tham số. Kết quả in ra stdout; muốn lưu thì:  ./run_all.sh > out.txt
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${PY:-python3}"

echo "=============================================================================="
echo " BỘ MÔ PHỎNG KINH TẾ TÀI NGUYÊN LAMPNET"
echo " ngày chạy : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo " python    : $($PY --version 2>&1)"
echo " hạt giống : 20260813 (cố định trong từng script)"
echo " thư mục   : $DIR"
echo "=============================================================================="

rc=0
for f in model_a_rho.py model_b_deter.py model_c_alpha.py model_d_subsidy.py model_e_tier.py; do
    echo
    echo "###### $f ######"
    if ! "$PY" "$DIR/$f"; then
        echo "!!! $f LỖI"
        rc=1
    fi
done

echo
echo "=============================================================================="
if [ "$rc" -eq 0 ]; then
    echo " TẤT CẢ 5 MÔ HÌNH CHẠY XONG, không lỗi."
else
    echo " CÓ MÔ HÌNH LỖI — xem dòng '!!!' ở trên."
fi
echo "=============================================================================="
exit "$rc"
