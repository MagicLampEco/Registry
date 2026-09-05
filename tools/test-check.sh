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
TMP_TUCHOI="Registrations/_tu-choi/tmp-test-daturchoi.md"
don_tam() { rm -f "$TMP_TRUNG" "$TMP_NHAM" "$TMP_CH4T" "$TMP_KIRIN" "$TMP_TUCHOI"; }
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

# Cùng lỗ R-04 nhưng trên trục CHỨNG THỰC, sót lại sau khi bốn trục khai báo đã bịt: luật ba-thứ
# trước đây chỉ áp từ EV-2 trở lên, nên EV-1 mở được L3 bằng một chuỗi bịa 17 ký tự (đo 2026-08-17).
kiem_khong tools/fixtures/EV1-con-tro-rac-khong-len-L3.md \
     "L3 —" \
     "EV-1 với con trỏ rác KHÔNG còn mở được L3"

kiem tools/fixtures/EV1-con-tro-rac-khong-len-L3.md \
     "HẠ về EV-0" \
     "con trỏ EV-1 không đủ ba thứ bị hạ về EV-0, kèm lý do đọc được"

# Ô `nen_su_dung` (chuẩn §2.6) khác mọi ô khác ở chỗ nó LÊN CHUỖI. Hai tính chất, hai ca — và
# chúng cố ý khác NHÃN: tên nền sai là hồ sơ tự mâu thuẫn với tập đóng nên phải ĐỎ; còn lệch với
# trục token thì bộ chấm không biết bên nào đúng, chỉ biết hai bên không thể cùng đúng ⇒ NÊU.
kiem tools/fixtures/nen-ten-ngoai-tap-dong.md \
     "không có trong tập đóng" \
     "tên nền ngoài tập đóng bị bắt, kèm danh sách tên nhận được"

kiem tools/fixtures/nen-ten-ngoai-tap-dong.md \
     "SAI HÌNH DẠNG" \
     "tên nền lạ làm hồ sơ SAI HÌNH DẠNG, không phải một dòng cảnh báo"

kiem tools/fixtures/nen-lech-truc-token.md \
     "không có \"magic\"" \
     "khai TK-1 mà không khai nền magic thì bộ chấm nêu chỗ lệch"

kiem_khong tools/fixtures/nen-lech-truc-token.md \
     "SAI HÌNH DẠNG" \
     "lệch giữa hai ô KHÔNG bị đọc thành sai hình dạng — máy không biết bên nào đúng"

# Lỗ R-05: R2 là căn cứ TỪ CHỐI theo chuẩn §5, không phải một dòng cảnh báo. Nhưng máy chỉ đọc
# được VẾ 1 của R2 (ô json trống); vế 2 nằm trong văn xuôi mục (e). Nên hai khẳng định, không một:
# máy phải NÊU vế 1 như một lỗi, và phải nói rõ nó CHƯA kết luận R2.
kiem Registrations/lampnet.md \
     "R2 vế 1/2 — ô đầu mối chịu trách nhiệm" \
     "ô đầu mối trống rơi vào lỗi R2 vế 1, không còn là cảnh báo"

kiem Registrations/lampnet.md \
     "CHƯA đủ để kết luận R2" \
     "máy tự thú nó mới thấy một nửa R2, không tuyên bản án thay người duyệt"

# Nhãn riêng: một hồ sơ chờ người duyệt xử R2 không được mang chung nhãn với hồ sơ đội chưa
# điền xong — hai thứ đó dẫn tới hai hành động khác nhau.
kiem Registrations/lampnet.md \
     "CHỜ NGƯỜI DUYỆT" \
     "R2 vế 1 có nhãn riêng, không rơi chung rổ THIẾU DỮ KIỆN"

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

# Tệp trong `Registrations/_tu-choi/` phải RA khỏi tập so trùng R1 mà vẫn được NÊU. Hai vế, và
# vế nào hỏng cũng hỏng theo một kiểu riêng: còn trong tập so trùng thì tên bị giữ vô thời hạn
# bởi một lệnh cấm không ai ký; không nêu ra thì người duyệt cấp lại một tên từng bị từ chối mà
# không biết. Luật: REGISTRATION-STANDARD.md §5 "Hồ sơ bị từ chối thì tệp đi đâu".
printf 'Từ chối R3 — 2026-01-01. Hồ sơ khai sai chủ sở hữu.\n' > "$TMP_TUCHOI"
kiem_r1 "tmp-test-daturchoi  (R3)" 0 \
        "tên trong _tu-choi/ được NÊU kèm mã từ chối bóc từ nội dung tệp"
kiem_r1 "không trùng, không cặp nào gây nhầm lẫn" 0 \
        "tên trong _tu-choi/ KHÔNG vào tập so trùng R1 — tên đã được thả"

# Và khi có người nộp lại đúng cái tên ấy thì phải hiện cảnh báo, chứ không thả im lặng.
sed 's/"platform_id": "thu-l3"/"platform_id": "tmp-test-daturchoi"/' tools/fixtures/day-du-L3.md > "$TMP_TRUNG"
# Mã thoát 0, không phải 1: dùng lại một tên đã thả KHÔNG phải lỗi. §5 không có điều khoản cấm
# vĩnh viễn, nên làm đỏ ở đây là dựng lại đúng cái lệnh cấm mà việc thả tên vừa gỡ đi. Máy NÊU,
# người duyệt KẾT — cùng đúng một luật với R2 vế 1.
kiem_r1 "một hồ sơ đang dùng lại tên này" 0 \
        "nộp lại một tên từng bị từ chối ⇒ bộ chấm NÊU, không làm đỏ"
rm -f "$TMP_TRUNG" "$TMP_TUCHOI"

# Khoá chú giải của codes.json KHÔNG được dùng làm hạng chứng thực.
#
# Lỗ đã có thật, và nó không đòi tấn công gì tinh vi — chỉ cần gõ tên một khoá có sẵn trong
# chính codes.json. PoC trước bản vá: một hồ sơ khai "tier": "_doc" và KHÔNG con trỏ chứng cứ
# nào chấm ra L3 — hạng cấp uy tín và quyền biểu quyết ở tầng hệ — với 0 lỗi, 0 cảnh báo.
#
# Ba tầng cùng hỏng một lượt mới ra được kết quả đó: (1) `_doc` tra ra một CHUỖI, chuỗi thì
# truthy nên nó qua cửa "có trong tập đóng"; (2) `t.rank` là undefined nên phép kiểm con trỏ bị
# bỏ qua sạch; (3) ngưỡng viết theo chiều PHẢI RỚT (`evMin < v`), mà `undefined < 1` là false,
# nên ngưỡng bị vô hiệu hoá thay vì siết lại. Bài này gác tầng (1); tầng (2) ném; tầng (3) đã
# viết lại theo chiều PHẢI ĐẠT.
TMP_DOC="Registrations/tmp-test-khoa-chu-giai.md"
sed 's/"tier": "EV-2", "pointer": "tx 52fc9630da741eb852fc9630da741eb852fc9630da741eb852fc9630da741eb8"/"tier": "_doc"/; s/"platform_id": "thu-l3"/"platform_id": "tmp-test-khoachugiai"/' \
    tools/fixtures/day-du-L3.md > "$TMP_DOC"
kiem "$TMP_DOC" 'hạng chứng thực "_doc" không có trong tập đóng' \
     "khoá chú giải \`_doc\` bị từ chối làm hạng chứng thực"
kiem_khong "$TMP_DOC" "hạng niêm yết tính ra: L3" \
     "hồ sơ khai \`_doc\` KHÔNG còn chấm ra L3"
rm -f "$TMP_DOC"

# Sau khi dọn phải trở về đúng trạng thái nền — nếu không, một lần chạy kiểm làm bẩn kho.
kiem_r1 "không trùng, không cặp nào gây nhầm lẫn" 0 \
        "dọn sạch hồ sơ tạm, kho trở về trạng thái nền"

echo
echo "$pass đúng · $fail sai"
[ "$fail" -eq 0 ]
