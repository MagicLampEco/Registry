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

kiem_khong() {   # kiem_khong <tệp> <chuỗi KHÔNG được có trong output> <mô tả>
  local out
  out=$(node tools/check-registration.mjs "$1" 2>&1)
  if grep -qF "$2" <<<"$out"; then
    echo "  SAI   $3"
    echo "        KHÔNG được có: $2"
    echo "        thực tế:"
    sed 's/^/          /' <<<"$out"
    fail=$((fail+1))
  else
    echo "  ĐÚNG  $3"
    pass=$((pass+1))
  fi
}

# R1 là tính chất của TẬP hồ sơ, không của một tệp — nên phải dựng hồ sơ tạm trong chính thư mục
# Registrations/ rồi dọn. `trap` ở dưới bảo đảm dọn cả khi kiểm gãy giữa chừng.
TMP_TRUNG="Registrations/_tmp-test-trung.md"
TMP_NHAM="Registrations/_tmp-test-nham.md"
TMP_CH4T="Registrations/_tmp-test-ch4t.md"
TMP_KIRIN="Registrations/_tmp-test-kirin.md"
don_tam() { rm -f "$TMP_TRUNG" "$TMP_NHAM" "$TMP_CH4T" "$TMP_KIRIN"; }
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

# Lỗ R-04: bản trước mọi `needs` chỉ kiểm KHÁC RỖNG, nên tám ô gõ chữ "x" vẫn ra L3 — hạng cấp
# quyền biểu quyết. Hai phép kiểm, vì "không ra L3" và "bị bắt là sai hình dạng" là hai việc.
kiem_khong tools/fixtures/o-toan-x-khong-duoc-len-L3.md \
     "L3 —" \
     "tám ô gõ chữ \"x\" KHÔNG còn chấm ra L3"

kiem tools/fixtures/o-toan-x-khong-duoc-len-L3.md \
     "SAI HÌNH DẠNG" \
     "tám ô gõ chữ \"x\" bị bắt là SAI HÌNH DẠNG, khác nhãn với ô đang trống"

# Lỗ R-05: R2 là căn cứ TỪ CHỐI theo chuẩn §5, không phải một dòng cảnh báo.
kiem Registrations/lampnet.md \
     "R2 — ô đầu mối chịu trách nhiệm" \
     "ô đầu mối trống rơi vào lỗi R2, không còn là cảnh báo"

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

# e → 3 là cặp đồng hình. Chuẩn hoá phải gộp chúng, nhưng KHÔNG được tự từ chối:
# "gây nhầm lẫn" là phán đoán của người (chuẩn §5, tập từ chối R1).
#
# Mẫu cũ là "1ampnet". Nay nó KHÔNG dùng được nữa cho phép kiểm này, và đó là hành vi đúng: cổng
# ký tự đòi platform_id bắt đầu bằng CHỮ, nên "1ampnet" bị bắt sớm hơn, ở tầng sai khuôn. Tính
# chất cần khoá ở đây vẫn là tính chất cũ — cặp đồng hình chỉ được NÊU — nên mẫu đổi sang
# "lampn3t", thứ qua được cổng ký tự và vẫn gấp về cùng khoá "14mpn37" với "lampnet".
sed 's/"platform_id": "lampnet"/"platform_id": "lampn3t"/' Registrations/lampnet.md > "$TMP_NHAM"
kiem_r1 "GÂY NHẦM LẪN sau chuẩn hoá" 0 \
        "cặp đồng hình được NÊU RA nhưng KHÔNG tự từ chối ⇒ bộ chấm xanh"
rm -f "$TMP_NHAM"

# Lỗ R-03: bảng đồng hình hở ngay trong ASCII — thiếu cặp 4 ↔ a.
# Lỗ R-01 cùng lúc: "chat" ở đây là tên NHÁP lấy từ tên tệp Registrations/chat.md (hồ sơ chưa
# nộp). Bản trước lọc hồ sơ chưa nộp ra khỏi tập so trùng nên cặp này vô hình hoàn toàn.
sed 's/"platform_id": "thu-l3"/"platform_id": "ch4t"/' tools/fixtures/day-du-L3.md > "$TMP_CH4T"
kiem_r1 "GÂY NHẦM LẪN sau chuẩn hoá" 0 \
        "\"ch4t\" đụng tên NHÁP \"chat\" của hồ sơ chưa nộp ⇒ được NÊU, không tự từ chối"
rm -f "$TMP_CH4T"

# Lỗ R-02: bản trước XOÁ ký tự ngoài ASCII thay vì từ chối, nên "chаt" (chữ "а" Kirin U+0430)
# gấp thành "cht" và KHÔNG còn đụng "chat" — âm tính giả, đúng ca tấn công mà R1 sinh ra để chặn.
sed 's/"platform_id": "thu-l3"/"platform_id": "chаt"/' tools/fixtures/day-du-L3.md > "$TMP_KIRIN"
kiem "$TMP_KIRIN" "U+0430" \
     "platform_id chứa chữ Kirin bị cổng ký tự bắt, và thông báo nêu code point"
kiem_r1 "bỏ Registrations/_tmp-test-kirin.md khỏi tập so trùng" 1 \
        "hồ sơ sai khuôn bị loại khỏi tập so trùng và làm bộ chấm ĐỎ"
rm -f "$TMP_KIRIN"

# Sau khi dọn phải trở về đúng trạng thái nền — nếu không, một lần chạy kiểm làm bẩn kho.
kiem_r1 "không trùng, không cặp nào gây nhầm lẫn" 0 \
        "dọn sạch hồ sơ tạm, kho trở về trạng thái nền"

echo
echo "$pass đúng · $fail sai"
[ "$fail" -eq 0 ]
