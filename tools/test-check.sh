#!/usr/bin/env bash
# Kiểm chính bộ chấm hồ sơ.
#
# Vì sao cần: bộ chấm là thứ quyết định hạng niêm yết của người khác. Nếu nó tính sai mà không
# ai biết thì cổng đăng ký sai một cách im lặng — đúng kiểu hỏng tệ nhất. Ba ca dưới đây khoá
# ba tính chất mà chuẩn hứa, không khoá cách cài đặt.
#
#   bash tools/test-check.sh

set -uo pipefail
cd "$(dirname "$0")/.."

pass=0; fail=0

kiem() {   # kiem <tệp> <chuỗi phải có trong output> <mô tả>
  local out
  out=$(node tools/check-registration.mjs "$1" 2>&1)
  if grep -qF "$2" <<<"$out"; then
    echo "  ĐÚNG  $3"
    pass=$((pass+1))
  else
    echo "  SAI   $3"
    echo "        chờ có: $2"
    echo "        thực tế:"
    sed 's/^/          /' <<<"$out"
    fail=$((fail+1))
  fi
}

# R1 là tính chất của TẬP hồ sơ, không của một tệp — nên phải dựng hồ sơ tạm trong chính thư mục
# Registrations/ rồi dọn. `trap` ở dưới bảo đảm dọn cả khi kiểm gãy giữa chừng.
TMP_TRUNG="Registrations/_tmp-test-trung.md"
TMP_NHAM="Registrations/_tmp-test-nham.md"
don_tam() { rm -f "$TMP_TRUNG" "$TMP_NHAM"; }
trap don_tam EXIT

kiem_r1() {   # kiem_r1 <chuỗi phải có> <mã thoát mong đợi> <mô tả>
  local out ma
  out=$(node tools/check-registration.mjs 2>&1); ma=$?
  if grep -qF "$1" <<<"$out" && [ "$ma" -eq "$2" ]; then
    echo "  ĐÚNG  $3"
    pass=$((pass+1))
  else
    echo "  SAI   $3"
    echo "        chờ có: $1  · mã thoát chờ: $2 · thực tế: $ma"
    sed 's/^/          /' <<<"$out" | tail -12
    fail=$((fail+1))
  fi
}

echo "Kiểm bộ chấm hồ sơ đăng ký"

kiem tools/fixtures/day-du-L3.md \
     "L3 —" \
     "khai đủ mọi trục ở mã cao nhất + mọi lời khẳng định EV-2 ⇒ L3"

kiem tools/fixtures/mot-loi-khai-EV0-tut-xuong-L2.md \
     "L2 —" \
     "y hệt trên nhưng MỘT lời khẳng định còn EV-0 ⇒ tụt xuống L2 (bất biến RE-5)"

kiem tools/fixtures/token-chua-qua-cong-TKX.md \
     "đây là căn cứ TỪ CHỐI" \
     "TK-X là căn cứ từ chối duy nhất trong bốn trục"

kiem Registrations/lampnet.md \
     "L0 —" \
     "hồ sơ thật của LampNet+Join tính ra L0 — đã tiếp nhận"

echo
echo "Kiểm R1 — trùng platform_id (tính chất của TẬP hồ sơ)"

# Nền: thư mục thật, chưa thêm gì. Hồ sơ lampnet đang THIẾU DỮ KIỆN — phải KHÔNG đỏ.
# Đây khoá đúng câu của chuẩn §2: "khai đúng thì hồ sơ được tiếp nhận, dù khai 'chưa đạt'".
kiem_r1 "không trùng, không cặp nào gây nhầm lẫn" 0 \
        "thiếu dữ kiện KHÔNG phải căn cứ từ chối ⇒ bộ chấm xanh"

cp Registrations/lampnet.md "$TMP_TRUNG"
kiem_r1 "R1 — platform_id TRÙNG KHÍT" 1 \
        "hai hồ sơ cùng platform_id ⇒ R1, và bộ chấm ĐỎ"
rm -f "$TMP_TRUNG"

# l → 1 là cặp đồng hình kinh điển. Chuẩn hoá phải gộp chúng, nhưng KHÔNG được tự từ chối:
# "gây nhầm lẫn" là phán đoán của người (chuẩn §5, tập từ chối R1).
sed 's/"platform_id": "lampnet"/"platform_id": "1ampnet"/' Registrations/lampnet.md > "$TMP_NHAM"
kiem_r1 "GÂY NHẦM LẪN sau chuẩn hoá" 0 \
        "cặp đồng hình được NÊU RA nhưng KHÔNG tự từ chối ⇒ bộ chấm xanh"
rm -f "$TMP_NHAM"

# Sau khi dọn phải trở về đúng trạng thái nền — nếu không, một lần chạy kiểm làm bẩn kho.
kiem_r1 "không trùng, không cặp nào gây nhầm lẫn" 0 \
        "dọn sạch hồ sơ tạm, kho trở về trạng thái nền"

echo
echo "$pass đúng · $fail sai"
[ "$fail" -eq 0 ]
