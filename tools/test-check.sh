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
echo "$pass đúng · $fail sai"
[ "$fail" -eq 0 ]
