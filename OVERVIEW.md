# Registry là gì — bản giới thiệu

Tài liệu này dành cho người **chưa** ở trong hệ sinh thái MagicLamp và muốn biết cổng đăng ký này
là gì, đăng ký thì được gì, phải trả gì, và nó **không** làm gì.

Nó cố ý ngắn. Chi tiết đủ để thực hiện nằm ở [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md);
cơ chế đầy đủ nằm ở [`Specs/`](Specs/). Chỗ nào tài liệu này nói gọn hơn hai nơi đó thì hai nơi đó
đúng — ở đây không định nghĩa lại gì cả.

---

## 1. Vấn đề nó giải

Một hệ sinh thái nhiều dịch vụ độc lập gặp đúng ba chỗ hỏng, và cả ba đều hỏng **im lặng**:

- **Không ai biết ai tồn tại.** Ví, explorer, hay một ứng dụng khác muốn trả phí cho dịch vụ X thì
  phải hỏi ai để biết tiền đi đâu? Nếu câu trả lời là "hỏi đội X", thì mỗi lần ghép hai dịch vụ là
  một lần thoả thuận tay đôi, và số thoả thuận tăng theo bình phương số dịch vụ.
- **Tên bị chiếm.** Không có cổng kiểm thì ai cũng tạo được một định danh trùng tên một dịch vụ
  thật, rồi nhận phí thay nó. Nạn nhân không phát hiện được cho tới khi tiền đã đi.
- **Người dùng bị khoá trong từng ốc đảo.** Mỗi dịch vụ tự dựng hệ tài khoản riêng thì một người
  phải đăng ký lại ở từng nơi, và không tầng nào cộng được đóng góp của họ lại.

Registry giải cả ba bằng một việc: **một dịch vụ đã đăng ký thì tìm được, kiểm chứng được, và ghép
được với mọi dịch vụ khác** — không cần bên nào biết trước về bên nào.

## 2. Nó hoạt động thế nào — bằng lời thường

Mỗi dịch vụ đăng ký nhận **một token định danh duy nhất** (gọi là *beacon*) mang đúng tên nó, cộng
một **bản ghi** nói dịch vụ đó là ai và tiền của nó chảy về đâu. Cả hai nằm trên chuỗi khối Cardano.

Không có một quyển sổ trung tâm nào giữ danh sách. Muốn biết trong hệ có những ai, bạn quét tất cả
token sinh ra dưới **cùng một khuôn đúc** — trên Cardano gọi là một *minting policy*, và nó chỉ có
một, dùng chung cho mọi dịch vụ trong hệ. Mỗi token là một dịch vụ. Điều này nghe như chi tiết kỹ
thuật nhưng nó quyết định một tính chất người dùng cảm được: **đăng ký của bên này không chặn bên
kia.** Hai dịch vụ đăng ký cùng lúc không tranh nhau chỗ nào cả, vì không có chỗ chung để tranh.

Bản ghi cũng không giữ tiền. Nó chỉ **trỏ đường**: tiền của mỗi dịch vụ nằm trong kho của chính
dịch vụ đó, và cửa chi của kho ấy do một cổng quản trị **của riêng dịch vụ đó** gác. Registry không
mở được kho của ai — kể cả kho của một dịch vụ đã bị gỡ khỏi sổ.

## 3. Đăng ký được gì

- **Một cái tên không ai lấy được.** Định danh là duy nhất trong hệ, và sáu trường định danh của
  bản ghi **không sửa được** sau khi đăng ký — đổi một trong sáu trường đó là tạo ra một dịch vụ
  khác, không phải sửa dịch vụ cũ.
- **Ghép được với phần còn lại của hệ.** Dùng chung hệ danh tính, dùng chung hệ token, dùng chung
  cách kế toán giá trị — nên một ứng dụng thứ ba có thể định tuyến phí về đúng kho của bạn mà không
  cần liên hệ với bạn trước.
- **Một hạng niêm yết tính ra được, không phải một lời phán.** Bạn khai bằng **mã** trên bốn trục
  (danh tính · hệ token · kho giá trị · phụ thuộc hạ tầng đóng ngoài hệ), mỗi mã kèm dữ kiện kiểm
  được. Một chương trình chấm ra hạng, và bạn chạy được chương trình đó trước khi nộp.

  Ba chỗ máy **không** kết luận thay người, nên kết quả tự chấm là ước lượng chứ không phải phán
  quyết: máy không mở được kho riêng tư (con trỏ vào kho private bị **trần `L1`** dù đủ hình thức),
  không quyết được mức "tên gây nhầm lẫn", và không kết luận được vế thứ hai của căn cứ từ chối
  R2. Chi tiết ở [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md) §3 và §5.

## 4. Phải trả gì

**Một cổng cứng, ba lời khai có phân hạng, và một điều kiện xuyên suốt: khai đúng sự thật.**

Cổng cứng duy nhất là dùng chung hệ token — đó là điều kiện của hệ sinh thái, không phải điều kiện
riêng của sổ này. Ba trục còn lại là **lời khai có phân hạng**: khai đúng thì hồ sơ được tiếp nhận,
**kể cả khi khai "chưa đạt"**. Mã đã khai quyết định hạng, và bên đọc sổ tự quyết mức tin.

Chỉ có ba căn cứ từ chối, và đó là một **tập đóng** — không có mục "và các lý do khác":

1. Định danh **trùng khít** với một lời khai đã có.
2. Không có ai đứng tên chịu trách nhiệm.
3. Khai sai sự thật.

Chỉ mức **trùng khít** ở căn cứ 1 mới là căn cứ từ chối, và máy chặn được. Tên chỉ *gây nhầm lẫn*
thì máy **nêu** chứ không kết luận — người duyệt quyết, và phải ghi lý do vào nhật ký rà soát của
hồ sơ. "Gây nhầm lẫn" là phán đoán về nhận thức người đọc; giao nó cho máy là giao sai việc.

**Cạnh tranh với một thành phần sẵn có trong hệ không phải lý do từ chối.** Điều này viết ra vì nếu
không viết ra thì nó thành lý do — cổng nào cũng có xu hướng bảo vệ người đã ở trong.

Từ chối phải nêu **dòng khai nào sai kèm bằng chứng**. Người duyệt không có quyền từ chối vì không
thích, và không có quyền im lặng: hồ sơ phải được trả lời trong **14 ngày**, quá hạn mà không có
trả lời nào thì coi là **đã tiếp nhận**.

Điều khoản im lặng chỉ áp cho **bước nộp hồ sơ**. Nó không thay được chữ ký ở bước đăng ký lên
chuỗi — bước đó vẫn cần một chữ ký thật, nên im lặng không mở ra đường vòng nào.

Ngoài bốn trục khai báo còn **một ô bắt buộc**: lời khai *dịch vụ dùng những nền nào của hệ*. Ô này
không đổi hạng của bạn, nhưng nó đi thẳng lên chuỗi và bên thứ ba đọc nó, nên bộ dựng giao dịch
**báo lỗi** nếu bạn để trống. Khai "không dùng nền nào" là một câu trả lời hợp lệ; **không trả lời**
thì không.

## 5. Bốn bước

```
(0) Nộp hồ sơ  ──▶  (1) Dựng kho  ──▶  (2) Đăng ký  ──▶  (3) Nối luồng thu
    một tệp văn bản    trên chuỗi        nhận định danh     phí chảy về kho bạn
    không tốn phí                        thấy được trong hệ
```

Bước 0 hoàn toàn ngoài chuỗi và **không tốn phí**. Cụ thể là ba việc:

1. Sao [`Registrations/template.md`](Registrations/template.md) thành `Registrations/<tên-dịch-vụ>.md`
   rồi điền — phần quyết định hạng là một khối JSON trong tệp đó, chọn mã từ tập đóng ở
   [`Registrations/codes.json`](Registrations/codes.json).
2. Tự chấm trước, bao nhiêu lần cũng được:
   ```
   node tools/check-registration.mjs Registrations/<tên-dịch-vụ>.md
   ```
   Lệnh này in ra hạng của bạn, ô nào còn thiếu, và mã nào chưa đủ dữ kiện.
3. Mở một pull request thêm tệp đó vào kho này.

Sửa cho tới khi hài lòng với hạng của mình rồi hãy nộp. Được phép dừng sau bước 1 hoặc bước 2;
không ai bắt đi hết.

Dịch vụ không thu tài sản của người dùng thì **bỏ hẳn bước 1**. Chuẩn có một mã riêng cho đúng
trường hợp đó, và chọn nó không phải là khai xấu. Nhưng bỏ bước dựng kho **không** phải bỏ phần
khai: mã đó vẫn đòi bạn nói tiền — nếu có — chảy vào đâu và ai gác cửa chi ở đó.

Chi tiết từng bước: [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md) §4.

## 6. Nó **không** làm gì — đọc kỹ mục này

Bốn hiểu nhầm dưới đây mỗi cái dẫn tới một quyết định sai ở phía người đọc. Ba trong bốn đã xảy ra
thật, và chúng là lý do mấy dòng này được viết ra.

**Sổ này không giữ tiền, và không khoá được tiền của ai.** Đặt một dịch vụ sang *tạm dừng* hay
*ngừng hẳn* chỉ **ẩn nó khỏi sổ**. Kho của nó vẫn thu, vẫn chi, vì cửa chi do chính nó gác. Ai đọc
"ngừng hẳn" thành "quỹ đã đóng" là đọc sai, và nếu quyết định tài chính dựa trên cách đọc đó thì
quyết định ấy sai theo.

Đọc đúng chiều thì đây là **giới hạn quyền của sổ, không phải một khoảng trống**: tiền vẫn có người
gác, chỉ là người gác đó không phải sổ này mà là cổng quản trị của chính dịch vụ. Một cổng đăng ký
gỡ được tiền của người khác thì nó là thứ nguy hiểm hơn nhiều so với một cổng không gỡ được.

**Sổ này không xác minh dịch vụ nói thật.** Nó ép **hình dạng** của lời khai và ép **quyền** sửa
lời khai. Nó không biết một dịch vụ có thật sự dùng nền hạ tầng nó khai hay không — cái đó là việc
của người đọc và của thời gian. Một hạng cao nghĩa là *"đã khai đủ dữ kiện kiểm được"*, không nghĩa
là *"đã được xác minh"*.

**Sổ này không phải tầng chống Sybil.** Nó đếm **hồ sơ**, không đếm **người**. Một đội mở năm hồ sơ
hợp lệ thì cả năm đều hợp lệ — tập từ chối ở trên là tập đóng, và "cùng chủ đã có hồ sơ" không nằm
trong đó. Có một ô tuỳ chọn để khai chủ sở hữu: không khai thì không bao giờ lên được hạng cao nhất,
còn khai rồi vẫn phải đạt các điều kiện khác của hạng đó. Nhưng cả hai chiều đều là **làm cho thấy
được**, không phải **chặn lại**. Bất cứ cơ chế nào trong hệ dựa vào giả định "mỗi định danh là một
người" thì phải tự dựng tầng ấy, đừng trông vào sổ này.

**Sổ này không đăng ký người dùng.** Người đăng ký ở đây là **nhà phát triển và doanh nghiệp**, và
thứ được đăng ký là **một platform, một ứng dụng, hoặc một dịch vụ**. Sổ này không nhận hồ sơ của
cá nhân, và không có trường nào để khai một cá nhân — nếu bạn đang tìm chỗ đăng ký với tư cách
người dùng thì đây không phải chỗ đó.

## 7. Đọc tiếp

| Bạn là | Đọc |
|---|---|
| Đội muốn đưa dịch vụ vào hệ | [`REGISTRATION-STANDARD.md`](REGISTRATION-STANDARD.md) |
| Đội đã quyết đăng ký, cần làm từng bước | [`Specs/onboarding.md`](Specs/onboarding.md) |
| Người cần hiểu cơ chế đầy đủ | [`Specs/`](Specs/) |
| Người muốn xem ai đã đăng ký | [`Registrations/`](Registrations/) |
