# Từ điển tài nguyên — mẫu số chung để so giá giữa các dịch vụ

> Trạng thái: **v0.3**. Ngày: 2026-09-02 (v0.2: 2026-08-17).
> Phạm vi: Registry giữ **đơn vị đo**, KHÔNG giữ **đơn giá**.
> v0.3 rà lại các module mà v0.2 chưa chạm. **Không mã nào được cấp thêm** — và ba mã bị rút lại:
> **10 `IDENTITY_RESOLVE` và 12 `MESSAGE_DELIVERED` thu hồi, 11 `VERIFY_PROOF` treo** (§2.2). Và
> **sáu mã đổi SỐ, không đổi nghĩa**: `STORAGE_GIBH` · `BANDWIDTH_GIB` · bốn mã `AI_TOKEN_*` dời từ
> 3–8 xuống **13–18**, nhường số cho các mã đã nối vào mã chạy — §2.
>
> Chi tiết: §2.1.1 (điều kiện mở khoá COMPUTE bị nêu **sai** ở v0.2 — đơn vị đã có sẵn, cái thiếu là
> RD-2) · §2.2 (ba mã không đứng được trước module thật, và bài học chung của cả ba) · §3.4 (`epoch`
> nay có **năm** nghĩa; nghĩa thứ tư nằm trong cùng một tệp với nghĩa thứ nhất, lệch 7.200 lần) ·
> §3.5 (xung đột thứ tư: `byte·ngày` với `GiB·giờ`, không quy đổi chẵn được) · §5 (bảy dòng mới
> trong danh sách hở, gồm cả **hosting** — thứ v0.2 không hề nhắc tới).
>
> 🔴 **Nặng nhất, đọc trước hết: khối cảnh báo đầu §2.** MAGIC đã có sổ `op_type` riêng chốt trước
> v0.2 và cấp sẵn số 3–8 với nghĩa khác; neo bằng chứng của v0.2 trỏ nhầm dòng; và **chưa mã nào
> lên mạng thật**, kể cả 1 và 2. Việc đánh số của tệp này đang chờ chủ nhân chốt ai giữ sổ.
> Đọc kèm: [CONTRACT §PK1](./CONTRACT.md) · [Feat-Spec §0.3](./Feat-Spec.md) · [Math-Spec §13](./Math-Spec.md)

---

## 0. Vì sao Registry giữ tệp này — và vì sao nó KHÔNG phải bảng giá

`Feat-Spec.md:64` đã chốt: **"Định giá phí (bò ≠ gà — `animal_fee`), quy đổi LAMP↔USD/ADA | App
(OriLife/PhoenixKey) + Oracle, NGOÀI Registry"**. Tệp này không bác dòng đó — nó đứng ở phía bên kia
của cùng một ranh giới.

Tách hai thứ hay bị gộp:

| | Định nghĩa | Ai giữ | Vì sao |
|---|---|---|---|
| **Đơn vị đo** | "1 GiB·giờ nghĩa là gì, đo bằng cách nào" | **Registry** | Phải giống nhau ở mọi dịch vụ, nếu không thì không so được |
| **Đơn giá** | "1 GiB·giờ giá bao nhiêu MAGIC" | **Từng platform**, ở beacon riêng | Phải khác nhau, nếu không thì không có cạnh tranh |

Registry giữ **cái mét**, không giữ **giá một mét**. Một cơ quan chốt giá là cơ quan định giá tập
trung — mâu thuẫn PK1 (Registry không giữ giá trị) và mâu thuẫn lời hứa "cổng mở" ở
`Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md:231-233` §10 (*"Bất kỳ ai cũng đăng ký vào hệ được,
không phải xin phép"*). Whitepaper còn đi xa hơn ở `:186-188` §7: cổng đăng ký là **độc quyền có
chủ đích** — một cổng duy nhất đặt chuẩn — nhưng *"nội dung bên trong registry (ai được liệt vào)
thì hoàn toàn mở"*. Giữ **cái mét** là đúng vế đầu; chốt **giá** là phạm vế sau. Nhưng nếu
**không ai** giữ cái mét thì hai
dịch vụ cùng bán "1 task" lại bán hai thứ khác nhau, và người mua không có cách nào biết bên nào
đắt. Cổng đăng ký là nơi duy nhất mọi dịch vụ đều đi qua, nên nó là nơi tự nhiên để giữ cái mét.

**Phép thử ranh giới**: một thay đổi thuộc tệp này ⟺ nó đổi *nghĩa của con số*, không đổi *độ lớn của
con số*. Đổi `GB → GiB` thuộc tệp này. Đổi `1 → 2 µLAMP` thì không.

---

## 1. Bất biến

| Mã | Bất biến | Vì sao — và cái gì hỏng nếu bỏ |
|---|---|---|
| **RD-1** | Mỗi `op_type` gắn ĐÚNG MỘT bộ ba `(lớp, đơn vị, quy ước đo)`, bất biến sau khi công bố. Và một mã đề xuất **trùng lớp + đo cùng đại lượng vật lý** với mã đang lưu hành thì **bị từ chối**, dù nó tự thân hợp mọi bất biến khác | Đổi nghĩa một mã đang lưu hành = đổi giá im lặng ở mọi platform đang dùng mã đó. Cần nghĩa mới thì cấp **mã mới**, không sửa mã cũ. Vế sau chặn hướng ngược: xin `STORAGE_GIB_DAY` cạnh `STORAGE_GIBH` (mã 13) là hợp lệ từng điều nhưng chẻ thị trường làm hai nhóm phải quy đổi qua tay — phá đúng mục tiêu "mẫu số chung" mà RD-1 sinh ra để giữ |
| **RD-2** | Đơn vị phải **đo được bởi bên thứ ba** — không phụ thuộc lời khai của bên bán | Đơn vị chỉ bên bán đo được thì giá không kiểm được, và "so giá" thành so hai lời khai |
| **RD-3** | Đơn vị phải **cộng được**: đo 2 lần rồi cộng = đo 1 lần gộp | `required = base_price × op_count` chỉ đúng khi `op_count` cộng được. Đơn vị không cộng được (vd "một phiên") làm phép nhân vô nghĩa |
| **RD-4** | Đơn vị phải **đơn thứ nguyên** — không gói nhiều tài nguyên vào một số | "1 task" gói CPU + RAM + thời gian + I/O. Hai task cùng đếm 1 có thể lệch chi phí 100×, nên giá per-task không nói gì về chi phí |
| **RD-5** | Registry **không** cấp `op_type` cho thứ chưa có cách đo. Chưa đo được thì ghi vào §5 (danh sách hở), không cấp mã | Cấp mã cho thứ chưa đo được = cấp giấy phép định giá một đơn vị không tồn tại |
| **RD-6** | Một platform khai **tối đa 16** dòng `op_type` trong bảng giá on-chain | Trần cứng, đo bằng ExUnit thật: `MAGIC/ConsumeMAGIC/onchain/lib/magiclamp/consume/pricing.ak:53` (`max_op_prices = 16`), số đo mem ở `:38-47`. Từ điển toàn hệ ĐƯỢC phép dài hơn 16 — trần áp cho **mỗi platform**, không cho từ điển |
| **RD-7** | Trong bảng giá, `op_type` phải **tăng ngặt** (sắp tăng, không trùng) | Ép bởi `pricing.ak:75` (`sorted_strict_op_types`). Trùng mã thì on-chain lấy dòng ĐẦU còn off-chain viết bằng map lấy dòng CUỐI ⇒ hai phía lệch giá im lặng (`pricing.ak:108-109`) |
| **RD-8** | Chữ **"epoch"** KHÔNG được dùng làm đơn vị thời gian trong từ điển. Dùng **giờ (h)** | Chữ này mang **ba** nghĩa khác nhau trong cùng hệ sinh thái, và đã có hai lần trả giá thật — §3.4 |
| **RD-9** | Vector phân rã của một service phải **TRỌN VẸN**: mọi tài nguyên mà bên bán đang thu tiền của bên mua đều phải có mặt trong vector, kể cả khi nó nằm trong một khoản gộp tên là "phí dịch vụ" | Không có điều này thì "so giá được" chỉ đúng cho phần bên bán **muốn** cho so. Bên bán khai đúng một mã rẻ nhất, thắng mọi bảng so sánh, rồi dồn chi phí thật vào khoản ngoài vector — khai đúng luật mà vẫn lừa. Xem §4.1 |

---

## 2. Từ điển canonical

🔴 **ĐỌC KHỐI NÀY TRƯỚC BẢNG. Tiền đề đánh số của v0.2 SAI, và sai theo cách tự nó không kêu.**
Tìm 2026-09-02. Ba việc rời nhau, cộng lại thì bảng dưới đây **đụng số với một sổ đã chốt trước
nó**:

**(1) MAGIC đã có sổ `op_type` riêng, chốt TRƯỚC ngày v0.2 ra đời, và tự xưng là sổ duy nhất.**
`MAGIC/ConsumeMAGIC/CONTRACT.md:38-49` — tiêu đề nguyên văn: *"Sổ op_type chuẩn (CHỐT — **MAGIC là
registrar duy nhất**; base_price là governance param, DAO chốt)"*, cấp sẵn tám số, còn *"8/16
dòng"*. Đối chiếu với bảng dưới:

| Số | v0.2 của tệp này cấp | MAGIC đã chốt cùng số | Mức độ |
|---|---|---|---|
| 3 | `STORAGE_GIBH` — GiB·**giờ**, tích phân theo thời gian | `recognition_storage_mb` — 1 **MB**, sự kiện rời rạc | cùng lớp `storage`, **khác đại lượng** |
| 4 | `BANDWIDTH_GIB` — lớp `bandwidth` | `recognition_compute_mb` — tính toán | **khác cả lớp** |
| 5–8 | `AI_TOKEN_IN/OUT/CACHE_W/CACHE_R` | `job_post` · `contract_settle` · `did.rotate` · `did.transfer` | khác hoàn toàn |

**(2) Neo bằng chứng của chính v0.2 trỏ nhầm dòng.** v0.2 viết *"mã 1 và 2 đã lưu hành — chúng có
mặt trong script triển khai thật (`09_deploy_consume.ts:168-169`)"*. Mở ra: dòng `:166-171` là
`priceNftPolicy` · `burnBatchConstr` · `msPerEpoch` — **không có `op_type` nào**. Bảng giá thật ở
`:196-199`, và nó có **BỐN** dòng, không phải hai: `op_type` 1, 2, **3 (lưu trữ /MB)**, **4 (tính
toán/MB)**, kèm chú thích ngay trên: *"Giá lấy từ sổ op_type chuẩn ở ConsumeMAGIC/CONTRACT.md §A"*.
⟹ đúng cái tệp được viện dẫn để chứng minh "3 trở lên còn trống" lại là tệp **đang dùng 3 và 4**.

**(3) Và không mã nào đang lưu hành thật — kể cả 1 và 2.** `MAGIC/ConsumeMAGIC/EXEC.md:218-220` ghi
thẳng: *"e2e Preview chưa chạy live … **chưa submit tx thật lên Preview**"*. Có trong script
triển khai ≠ đã lên mạng.

**Hệ quả, và nó cứu chứ không giết:** RD-1 khoá **mã đang lưu hành**, mà chưa mã nào lưu hành ⟹
**RD-1 chưa kích hoạt cho bất kỳ số nào**, nên bảng này còn sửa được với chi phí 0. Nếu phát hiện
muộn hơn một nhịp — sau lần submit đầu — thì hai sổ đụng số vĩnh viễn, và triệu chứng sẽ là các
platform tính đúng công thức trên sai đại lượng mà không cổng nào kêu.

🟢 **ĐÃ CHỐT — chủ nhân quyết 2026-09-02: REGISTRY giữ sổ `op_type`.** Câu *"MAGIC là registrar duy
nhất"* ở `ConsumeMAGIC/CONTRACT.md:38` do đó **hết đúng** kể từ ngày này. Đã gửi thư báo nhà MAGIC.
Ai đọc dòng đó trong repo MAGIC mà chưa thấy đính chính thì đối chiếu về đây.

**Và giữ sổ KHÔNG có nghĩa là số của Registry thắng.** Việc của người giữ sổ là **một quyển sổ không
đụng số**, không phải thắng một cuộc tranh. Nên luật đánh số chốt theo đúng chi phí thật:

> **Số đã nối vào mã chạy thì giữ nguyên nghĩa. Định nghĩa chưa nối vào đâu thì nhường số.**

Áp vào ca này: số **1–8** đã nằm trong `ConsumeMAGIC/CONTRACT.md §A`, số 3 và 4 còn có `base_price`
thật trong `09_deploy_consume.ts:196-199` và các fixture/test bám theo. Sáu định nghĩa của v0.2 ở
các số ấy thì **chưa một dòng mã nào dùng**. Đổi bên nào rẻ hơn là rõ ⟹ **v0.2 nhường, dời xuống
13–18** (bảng dưới). Không mã nào mất nghĩa, chỉ đổi số, và đổi trong lúc còn 0 đồng.

⚠ **Sổ KHÔNG sắp hết chỗ — `CONTRACT.md §A` ghi "Còn 8/16 dòng" là đọc nhầm trần.** Con số 16 là
`max_op_prices` (`ConsumeMAGIC/onchain/lib/magiclamp/consume/pricing.ak:53`), và chú thích ngay trên
nó nói rõ đó là trần **kích thước datum của MỘT bảng giá** — *"16 dòng ≈ 256 byte datum"*. Nó chặn
**số dòng một platform khai**, không chặn **giá trị** của `op_type`: `op_type` là `Int` thường, hàm
tra là `list.find` tuyến tính (`pricing.ak:100-101`), không đâu chặn trên. RD-6 của tệp này đã ghi
đúng điều đó từ v0.2. Ghi lại ở đây vì tin nhầm "chỉ còn 8 ô" dẫn thẳng tới hành vi nguy hiểm nhất
với một quyển sổ: tiết kiệm số, rồi tái dùng số.

Kiểm chéo mã 1 và 2 vẫn đứng: `MAGIC/ConsumeMAGIC/tests/codec.test.ts:27-28`.

> ⚠ **Chỉ CON SỐ được thống nhất, TÊN thì không.** Hai cái tên `MEDIA_IMAGE` và `ANCHOR_CID`
> **không tồn tại ở đâu trong repo MAGIC** — ở đó chúng chỉ có chú thích tiếng Việt `ảnh` và `CID`
> đứng cạnh con số. Ghi ra vì người đọc grep tên trong MAGIC sẽ không thấy gì và dễ kết luận từ
> điển bịa số. RD-1 khoá **nghĩa** của mã, không khoá tên gọi.
>
> ⚠ **Và đọc cột "Trạng thái" cho đúng.** *"Đã vào script triển khai"* nghĩa là có mặt trong
> `09_deploy_consume.ts` kèm giá — **không** nghĩa là đã lên mạng. Chưa mã nào lên mạng
> (`ConsumeMAGIC/EXEC.md:218-220`). Bản v0.2 của bảng này ghi "Lưu hành" cho mã 1 và 2; đó là chỗ
> sai đã sửa ở v0.3.

| `op_type` | Tên | Lớp | Đơn vị (`op_count` đếm cái gì) | Quy ước đo — phải đo đúng thế này | Trạng thái |
|---|---|---|---|---|---|
| **1** | `MEDIA_IMAGE` (MAGIC gọi: `ảnh`) | media | 1 ảnh đã nhận | Đếm ảnh nhận thành công tại biên dịch vụ, sau khi qua cổng kích thước. **Đây là mã tương thích ngược, vi phạm RD-4** (một ảnh 200 KB và một ảnh 20 MB cùng đếm 1) — §5.1 | Đã vào script triển khai |
| **2** | `ANCHOR_CID` (MAGIC gọi: `CID`) | anchor | 1 CID được neo | Đếm CID **khác nhau** ghi vào một giao dịch đã lên chuỗi. Retry cùng CID không cộng thêm. Mọi bên neo bằng chứng **dùng lại mã này, KHÔNG xin mã mới** (`ConsumeMAGIC/CONTRACT.md:42`) | Đã vào script triển khai |
| **3** | `recognition_storage_mb` | storage | 1 **MB** | ⚠ **KẾ THỪA** từ `ConsumeMAGIC/CONTRACT.md §A`, cấp cho OriLife. Có `base_price` thật ở `09_deploy_consume.ts:198`. **Chưa qua rà RD**, và có một chỗ phải biết: nó đếm MB **không kèm thời gian**, nên nó KHÔNG cùng đại lượng với mã 13 — lưu 1 MB một giờ và lưu 1 MB một năm cùng đếm 1 | Đã vào script triển khai |
| **4** | `recognition_compute_mb` | compute | 1 **MB** tính toán | ⚠ **KẾ THỪA**, cấp cho OriLife, `base_price` ở `09_deploy_consume.ts:199`. **Chưa qua rà RD.** §2.1 giải thích vì sao "compute" toàn hệ chưa đo được — dòng này không gỡ được điều đó, nó chỉ là một đơn vị nội bộ của một app | Đã vào script triển khai |
| **5** | `job_post` | marketplace | 1 tin việc đăng + phát tán | ⚠ **KẾ THỪA**, cấp cho AladinWork. **Chưa qua rà RD** | Chốt số, chưa nối giá |
| **6** | `contract_settle` | marketplace | 1 hợp đồng tất toán | ⚠ **KẾ THỪA**, cấp cho AladinWork. **Chưa qua rà RD** | Chốt số, chưa nối giá |
| **7** | `did.rotate` | identity | 1 lần xoay khoá DID | ⚠ **KẾ THỪA**, cấp cho PhoenixKey. Là **thao tác an ninh** — đặt giá cao ở đây khoá được người dùng khỏi tự bảo vệ mình, nên nó không cùng loại với các dòng thương mại | Chốt số, chưa nối |
| **8** | `did.transfer` | identity | 1 lần chuyển DID | ⚠ **KẾ THỪA**, cấp cho PhoenixKey. Thương mại — chịu hệ số cầu là đúng | Chốt số, chưa nối |
| **9** | `SENSING_READING` | sensing | 1 lần đọc cảm biến **đã được tiêu thụ** | Đếm ở phía **hạ nguồn** (bên đọc dữ liệu), không đếm ở phía cảm biến. Cảm biến tự đếm thì đếm bao nhiêu cũng được — vi phạm RD-2 | Mới |
| **10** | ~~`IDENTITY_RESOLVE`~~ | identity | ~~1 lần phân giải DID~~ | ⛔ **THU HỒI v0.3** — đo được là PhoenixKey **không** thu phí phân giải; tiền nằm ở thao tác vòng đời DID. §2.2 | Thu hồi |
| **11** | ⚠ `VERIFY_PROOF` | verify | 1 chứng minh đã kiểm — ⛔ **vi phạm RD-4, phát hiện v0.3**, phải tách theo hệ chứng minh trước khi dùng. §2.2 | Đếm lần chạy trọn phép kiểm, **kể cả khi kết quả là "không hợp lệ"** — chi phí đã tiêu rồi. Nhưng **mỗi chứng minh chỉ đếm MỘT lần**: kiểm lại cùng một chứng minh không cộng thêm, và phép kiểm do chính bên bán khởi phát (không đến từ yêu cầu bên mua) **không đếm** — cùng luật chống đếm lặp với mã 2 | Mới |
| **12** | ~~`MESSAGE_DELIVERED`~~ | message | ~~1 tin đã giao tới người nhận~~ | ⛔ **THU HỒI v0.3** — không phải "chưa đủ chuẩn xác thực", mà **chưa có đường sống nào để đo**: đường ghi `DELIVERED` bị chú thích chết nguyên khối. §2.2 | Thu hồi |
| **13** | `STORAGE_GIBH` | storage | 1 **GiB·giờ** | *(dời từ số 3 — §2)* `GiB = 2^30 byte` (**không** phải 10^9). Tích phân dung lượng theo thời gian, lấy mẫu ≥ 1 lần/giờ, làm tròn xuống. Đếm byte **đã lưu**, không đếm byte đã cấp phát | Mới |
| **14** | `BANDWIDTH_GIB` | bandwidth | 1 **GiB** đã truyền | *(dời từ số 4)* Byte rời khỏi biên dịch vụ tới bên thứ ba, đo ở tầng ứng dụng (payload), **không** tính header/retransmit | Mới |
| **15** | `AI_TOKEN_IN` | ai | 1000 token **đầu vào mới** | *(dời từ số 5)* `usage.input_tokens` của khung `result`. **Không** gộp cache — §3.2 | Mới |
| **16** | `AI_TOKEN_OUT` | ai | 1000 token **đầu ra** | *(dời từ số 6)* `usage.output_tokens` | Mới |
| **17** | `AI_TOKEN_CACHE_W` | ai | 1000 token **ghi cache** | *(dời từ số 7)* `usage.cache_creation_input_tokens` | Mới |
| **18** | `AI_TOKEN_CACHE_R` | ai | 1000 token **đọc cache** | *(dời từ số 8)* `usage.cache_read_input_tokens` | Mới |

Lớp (`class`) không phải để trang trí: nó là khoá của hệ số cầu per-platform per-class
(PC-5, bản nháp cơ chế phí), nên hai `op_type` cùng lớp thì cùng chịu một hệ số cầu.

### 2.1 Vì sao **không** có mã cho COMPUTE

Đây là quyết định, không phải sót.

`LampNet` đang định giá compute theo `task-unit`: `BASE_PRICE_COMPUTE = 10` µLAMP mỗi task-unit
(`LampNetCloud/lampnet-hivemind/lampnet-reward/src/types.rs:354`), và task-unit lấy từ
`ComputeEvidence.task_units` do quorum Splash ký (`.../src/metering.rs:168-178` — cổng quorum ở `:171-172`, ngưỡng `THETA_MIN_COMPUTE_TASKS` ở `:174`). Nhưng **không có
định nghĩa vật lý nào cho 1 task-unit** trong repo đó — nó là con số quorum đồng ý với nhau.

`OriLife` cũng có "compute", nhưng ở đó nó là **tỉ lệ chia bps** của tổng phí
(`OriLifeTrace/orilife-fee/src/params.ts:38`, `compute = 3500`), không phải kết quả đo.

`TigerAgent` AaaS liệt `per-compute-unit` như một `PricingSpec.unit`
(`TigerAgent/Spec/agent-as-a-service/AaaS-3-reward-as-service.md:132`), cũng không định nghĩa.

Ba hệ, ba nghĩa, **không so được với nhau**. Cấp một mã `COMPUTE` chung lúc này chỉ tạo ảo giác so
được: hai platform khai cùng mã, người mua tưởng cùng thứ, thực ra không. Vi phạm RD-4 và RD-5.

#### 2.1.1 Rà lại 2026-09-02 — kết luận giữ nguyên, **lý do thì sai**

Bản v0.2 viết: *"Việc phải làm trước khi cấp mã: chốt một đơn vị đơn thứ nguyên đo được — ứng viên
là vCPU·giây ở tần số chuẩn hoá, và GPU tách riêng thành mã khác."*

**Việc đó đã xong rồi, từ trước khi tệp này được viết.** `TaskReceipt.NodeMetrics` của Splash định
nghĩa sẵn chín trường, đơn thứ nguyên và cộng được (`Splash/Spec/Splash/Splash-Math.md:685-693`),
kèm bảng đơn vị ở `:1767-1775`:

| Trường | Đơn vị | Nghĩa |
|---|---|---|
| `gpu_seconds` | GPU·s | wall-clock GPU active |
| `cpu_seconds` | CPU·s | wall-clock CPU active |
| `vram_gb_seconds` · `ram_gb_seconds` | GB·s | tích phân dung lượng cấp phát theo thời gian |
| `flops_fp16` · `flops_fp8` | TFLOP · TOP | phép tính theo độ chính xác, **đã tách sẵn** |
| `energy_wh` | Wh | năng lượng tiêu thụ |

Đây đúng là thứ §2.1 đang chờ, và nó tách GPU khỏi CPU sẵn. Nên **cái thiếu không phải tên đơn
vị.**

**Cái thiếu là RD-2 trên chính con số đó** — và trong mã thật, hai đường đang mỗi đường giữ một
nửa, chưa đường nào giữ cả hai:

| Đường | Có gì | Thiếu gì |
|---|---|---|
| `task_units` (đường đang tính thưởng thật) | Chữ ký quorum Ed25519 **thật**, verify **fail-closed**: thiếu khoá thì compute reward về 0, không phải bỏ qua (`lampnet-hivemind/lampnet-reward/src/metering.rs:163-180`; `lampnet-hivemind/lampnet-splash/src/quorum.rs:38-48`) | Con số được ký **không có định nghĩa vật lý nào**. Đo: `command grep -rn "task_unit" Splash/ Splash-MathFormal/` → **0 dòng**. Tức nhánh đặc tả sinh ra `TaskReceipt` chưa bao giờ nhắc tới đơn vị mà nhánh tính thưởng đang dùng |
| `gpu_seconds` / `cpu_seconds` | Nghĩa vật lý rõ, đơn thứ nguyên, cộng được | **Chưa có mã nào thu thập**. Đo: `command grep -rn "gpu_seconds\|cpu_seconds" --include="*.rs" Splash/` → **0 dòng** |
| Cave `actual_gpu_cycles` | Đọc bộ đếm phần cứng thật (`MathSpecs/Cave-Math.md:483-491`) | Đọc **trên chính node thực thi** — bên bán tự đo mình. Cơ chế đối chứng `k_ref` kiểm **kết quả đúng/sai**, không đo lại chu kỳ GPU |

Chính mã của LampNet nói ra loại lỗi này gọn hơn tệp này nói được —
`lampnet-hivemind/lampnet-join/src/attestation.rs:28-33`, về bốn trường phần cứng đã được ký kín:

> *"ký kín 4 trường `hw_*` chỉ chặn NGƯỜI KHÁC sửa trên đường truyền. Nó **không** chặn chính thiết
> bị tự khai số giả — chữ ký chỉ chứng minh "ai nói", không chứng minh "nói thật"."*

⟹ **Điều kiện mở khoá được viết lại**: không phải "chốt đơn vị" (đã chốt), mà là **nối chữ ký quorum
đang chạy thật vào đúng các trường vật lý đã có sẵn trong `TaskReceipt`**, thay vì ký lên
`task_units` mù. Đó là việc nối dây giữa hai thứ đều đã tồn tại — không phải phát minh đơn vị mới.

⚠ Và nói trước một lập luận nghe rất hợp lý nhưng sai, vì nó sẽ được nêu ra: *"đơn vị đã định nghĩa
rồi, vậy cấp mã đi."* Không. RD-5 đòi **có cách đo**, không đòi **có tên gọi**. Một đơn vị định
nghĩa đẹp trong đặc tả mà không ai thu thập được thì cấp mã cho nó chính là "cấp giấy phép định giá
một đơn vị không tồn tại" — đúng câu RD-5 sinh ra để chặn.

### 2.2 Ba mã của v0.2 không đứng được trước module thật — thu hồi hai, treo một

v0.2 cấp mười mã mới, đánh số 3–12 (sáu trong đó nay mang số 13–18 — §2). Bảy mã dựng từ phép đo có
thật. **Ba mã còn lại — 10, 11, 12, và ba số này KHÔNG đổi — thì
không**: chúng được suy ra từ chỗ *"hệ này chắc phải bán thứ đó"*, và lượt rà 2026-09-02 mở đúng ba
module ấy ra thì cả ba đều không đỡ nổi định nghĩa.

Chỗ này được phép sửa, và phải nói rõ vì sao: **RD-1 khoá nghĩa của mã ĐANG LƯU HÀNH**, mà theo
khối 🔴 ở đầu §2 thì **chưa mã nào lưu hành** — `MAGIC/ConsumeMAGIC/EXEC.md:218-220` xác nhận chưa
có giao dịch Consume nào submit thật. Thu hồi bây giờ tốn 0 giao dịch; để tới sau lần submit đầu
thì vĩnh viễn không sửa được.

**Mở rộng RD-1 — số đã thu hồi KHÔNG tái dùng.** Mã 10 và 12 chết vĩnh viễn ở đúng số đó. Cấp lại
số 12 cho một tài nguyên khác thì mọi bên tích hợp còn giữ bảng cũ sẽ tính đúng công thức trên sai
đại lượng, và **không phép đo nào kêu** — đúng thứ RD-1 sinh ra để chặn.

#### Mã 10 `IDENTITY_RESOLVE` — thu hồi: đặt sai chỗ có tiền

PhoenixKey **không** thu phí phân giải DID. Bảng phí đầy đủ (`PhoenixKeyDID/PhoenixKey-Specs/PhoenixKey-Math.md:3512-3524`)
liệt mười ba thao tác chịu phí — `create_person_did` (=0, ưu đãi ra mắt) · `create_non_person_did` ·
`rotate` · `transfer_service` · `update_guardians` · bốn mức `init_recovery` · `cancel_recovery` ·
`finalize_recovery` · `mint_magic` · `issue_vc_anchor` — và **không dòng nào tên "resolve"**. Chú
thích ngay trên bảng (`:3505`) xếp resolve vào nhóm đọc thuần: *"All interactions are pull-based
(resolve) or push-based (sign)"*.

⟹ mã 10 đang đo một lời gọi đọc miễn phí. Thứ có tiền là **thao tác vòng đời DID**, và mỗi thao tác
là một giao dịch on-chain rời rạc — cùng hình dạng đo với mã 2, tức bên thứ ba xác nhận được bằng
chính chuỗi. Ghi vào §5 làm ứng viên, **không cấp mã ngay**: cần chốt trước là tách theo loại thao
tác hay gộp một mã, mà lệch giá giữa `update_guardians` (0,5 ADA) và `transfer_service` (5 ADA) là
**10×** — gộp một mã là vi phạm RD-4 ngay từ dòng đầu.

#### Mã 11 `VERIFY_PROOF` — treo: vi phạm RD-4, và VeData đã tự vá đúng lỗi này ở chỗ khác

`VeDataIO/Specs/VeData-Metering-Feat-Spec.md:210-215` (§3.7) gộp **ba** phép kiểm khác chi phí xa
nhau vào một giá `query_resolve` = 100.000 nanogic: *"verify Merkle proof (MMR/SMT/Lazy-MMR …) +
verify Mithril stake-quorum certificate + D9 privacy gate"*.

Và phạm vi gộp còn rộng hơn ba thứ đó — chính VeData nói ra ở dòng kế bên, khi giải thích vì sao
`zk_proof` được tách thành một mã riêng (`:219-222`):

> *"chi phí verify nằm trong `query_resolve`, chi phí **sinh** tách riêng ở đây."*

⟹ ranh giới VeData đang cắt là **sinh** proof so với **kiểm** proof, chứ không phải nặng so với nhẹ.
Mọi phép kiểm — từ một chữ ký Merkle tới một chứng minh zero-knowledge — cùng nằm trong đúng một
dòng giá. Đó chính xác là điều mã 11 sẽ chép lại nếu giữ nguyên "1 chứng minh đã kiểm".

Điều làm ca này **chắc chắn** chứ không phải suy đoán: **chính VeData đã vá đúng lớp lỗi này một
lần rồi.** Bảng `op_type` của họ tách `2 mosaic_anchor_cid` (batched, 1.000.000 nanogic) khỏi
`3 immediate_anchor_cid` (53.000.000 nanogic) — ghi lý do `[I1]` ngay trong bảng: *"phí L1
~480.733 lovelace/CID = ~53× batch-100 … KHÔNG dùng giá batch cho immediate"*
(`VeData-Metering-Feat-Spec.md:104-112`). Lệch **53 lần** thì họ tách; cùng đội, cùng bảng, phép
verify vẫn còn gộp.

⟹ mã 11 **giữ số nhưng không dùng được** cho tới khi tách theo hệ chứng minh. Registry không tự
chốt cách tách — đó là việc của VeData, và họ đã có sẵn tiền lệ của chính mình để noi theo.

#### Mã 12 `MESSAGE_DELIVERED` — thu hồi, và vì lý do nặng hơn dự đoán

Dự đoán khi rà là *"chắc ProofChat chỉ có ACK hạ tầng, chưa có biên nhận ký bằng khoá người nhận"*.
Thực tế nặng hơn: **cả đường ACK cũng chưa sống.** Hai phép đo, cùng chiều:

1. `command grep -rn "markDelivered" --include="*.ts" BE/src/ | grep -v "\.spec\."` trả về đúng
   **một** dòng — `BE/src/modules/messages/messages.service.ts:361`, tức **chính định nghĩa hàm**.
   Không nơi nào gọi nó.
2. Khối xử lý sự kiện `message.delivered` bị **chú thích chết nguyên khối**, kèm đúng một dòng
   `// TODO: Implement delivery confirmation logic`
   (`ProofChat/BE/src/modules/queue/message-processor.service.ts:190-219`).

⚠ Ghi lại vì nó suýt lọt: một lượt rà đọc thấy bảng `message_delivery_status` có thật trong lược đồ
và có mã ghi vào nó, rồi kết luận đường này **đang chạy**. Cả hai vế đều đúng — bảng có thật, hàm
ghi có thật — nhưng **không ai gọi hàm đó**. "Có mã làm việc X" và "X có xảy ra" là hai mệnh đề khác
nhau, và phép grep phân biệt được chúng chỉ khi đếm **nơi gọi**, không đếm nơi định nghĩa.

⟹ RD-5, không phải RD-2. Điều kiện mở khoá có **hai** bước, và làm mỗi bước một thì vẫn hỏng: (1)
nối lại đường gọi `markDelivered` cho nó sống; (2) thêm chữ ký bằng khoá riêng của **người nhận**.
Chỉ làm (1) thì được một ACK do hạ tầng bên bán tự sinh — vẫn vi phạm RD-2, cùng dạng với cảm biến
tự đếm ở mã 9.

⚠ **Bài học chung của ba ca, đắt hơn cả ba mã cộng lại.** Tám mã sống đều dựng từ *"đã thấy chỗ này
đo cái gì"*. Ba mã chết đều dựng từ *"hệ này hẳn phải bán cái gì"*. Hai lối làm ra hai thứ trông
giống hệt nhau trên trang giấy — cùng có tên, có lớp, có đơn vị, có quy ước đo viết rất kỹ — và
**không phép đo hình thức nào phân biệt được**. Chỉ mở module ra mới biết. Từ v0.3, một mã đề xuất
phải kèm neo `file:line` tới chỗ **module thật đang đếm đại lượng đó**, không phải tới chỗ nó được
mô tả.

---

## 3. Đối chiếu các hệ — bốn xung đột đo được

> v0.2 đối chiếu **bốn** hệ (LampNet · OriLife · AladinWork · TigerAgent) và tìm ra ba xung đột.
> v0.3 rà thêm **Dhost · Cave · Cnode · Splash · PhoenixKey · VeData/Glint · ProofChat · DecenPage ·
> Loom · CheckFarm · AffiSo**, thêm một xung đột (§3.5) và hai nghĩa `epoch` (§3.4). Bảng §3.1 dưới
> đây vẫn là bảng của v0.2 — các hệ mới nằm ở §2.2 và §5, vì phần lớn phát hiện của lượt sau là
> *"chưa đo được"*, không phải *"đo khác nhau"*.

Bảng dưới không phải khảo sát cho vui: mỗi dòng "lệch" là một chỗ hai dịch vụ đang khai cùng một
chữ mà ra hai con số khác nghĩa.

### 3.1 Bảng hiện trạng

| Hệ | Tài nguyên đo **thật** trong mã | Neo | Khớp từ điển? |
|---|---|---|---|
| **LampNet** | storage theo byte + PoR bond | `lampnet-reward/src/metering.rs:120-159` | Khớp mã **13** sau khi chốt GiB (§3.3) |
| | compute theo `task_units` + quorum Splash | `.../metering.rs:163-178` | **Không có mã** — §2.1 |
| | bandwidth | — | **Chưa đo được**: chỉ có đặc tả `LampNetCloud/Specs/Beam/Beam-Math.md:100-151`, không có module. Chính tài liệu kinh tế tự nhận "dung lượng neo được; lưu lượng thì không" (`Dhost/Specs/05-Economics.md:121-125`) |
| | sensing (Probe) | — | **Chưa đo được**: có khai báo `LampNetCloud/Specs/ResourceBudget.md:46-48`, không có mã reward |
| **OriLife** | phí theo tác vụ (9 loại, base USD) | `orilife-fee/src/tasks.ts:29-75` | Là **service**, không phải resource — phải phân rã, §4 |
| | storage/compute/bandwidth | `orilife-fee/src/params.ts:35-40` | **Không phải metering**: là tỉ lệ chia bps cố định của tổng phí, không đo tiêu thụ từng người |
| | anchor theo tier | `orilife-fee/src/tasks.ts` (`defaultAnchorTier`) | Khớp mã **2** |
| **AladinWork** | token LLM, **tách 4 loại** + USD thật | `Core/budget.js:470-472` | Khớp mã **15–18** |
| | phí job (nullifier chống thu 2 lần) | `Core/fee-snapshot.js` | Là **service**, §4 |
| **TigerAgent** | token LLM, **cộng gộp 4 loại thành 1** | `Runtime/crates/tiger-console/src/main.rs:1150-1153` | **Lệch** — §3.2 |
| | số phiên chạy đồng thời | `.../main.rs:775-798` | Không phải tài nguyên tính phí: là trần bảo vệ hạ tầng |

### 3.2 Xung đột 1 — token LLM: một hệ tách, một hệ gộp

Hai hệ đọc **cùng một khung `result`** của **cùng một CLI**, ra hai con số khác nghĩa:

- `AladinWork/Core/budget.js:470-472` giữ riêng bốn trường: `inputTokens`, `outputTokens`,
  `cacheCreationTokens`, `cacheReadTokens`, kèm `costUsd`.
- `TigerAgent/Runtime/crates/tiger-console/src/main.rs:1150-1153` cộng thẳng cả bốn:
  `g("input_tokens") + g("output_tokens") + g("cache_creation_input_tokens") + g("cache_read_input_tokens")`.

Bốn loại token này **không cùng giá** — token đọc-cache rẻ hơn token đầu vào mới nhiều lần
(bảng giá nhà cung cấp: `TigerAgent/Bench/research/04-benchmark-pricing.md:19` — Gemini *"cache read
= 10% giá input"*; `:52` — Anthropic Fable 5 *"cache read ~0.1x"*). Cộng gộp là
phép cộng táo với cam: con số gộp **không quy ra tiền được**.

Với mục đích riêng của TigerAgent thì không sai — nó dùng số gộp để so với **trần** tự đặt
(`accounts.rs:52-63`), mà trần thì đếm gộp cũng được. Cái sai chỉ xuất hiện khi con số đó bước ra
ngoài để so với hệ khác.

**Chốt:** từ điển cấp **bốn mã riêng** (5, 6, 7, 8), không cấp mã gộp. Hệ nào chỉ cần trần thì cứ
cộng nội bộ; nhưng khi khai ra hệ, phải khai bốn số.

### 3.3 Xung đột 2 — GiB hay GB: lệch 7,4%

`LampNet` đặt `BYTES_PER_GIB = 1_073_741_824` (= 2^30, đúng GiB) tại `types.rs:349`, và
`BASE_PRICE_STORAGE` chú thích "µLAMP / GiB-epoch" (`types.rs:351`). Chú thích ngay trên nó cũng viết
đúng: *"`MAX_METERED_BYTES_NEWBIE` = 10 × 2^30 (10 GiB)"* (`types.rs:348`). Nhưng chính dòng khai hằng
số ghi `MAX_METERED_BYTES_NEWBIE: u64 = 10_737_418_240; // 10 GB` (`types.rs:362`) — con số **đúng**
(10 × 2^30) nhưng chú thích cuối dòng viết **"GB"**, ngược với chú thích cách đó 14 dòng.

Số đúng, chữ sai. Đây là loại lệch sống sót rất lâu vì không có test nào bắt được chữ trong chú
thích. Nó chỉ nổ khi một hệ khác đọc chữ "GB" rồi cài `10^9` — sai **7,4%** ở mọi hoá đơn.

**Chốt:** mã **13** và **14** dùng **GiB = 2^30**, viết đúng chữ "GiB". Đề nghị LampNet sửa chú thích
`types.rs:362` cho khớp `:348` (đề nghị, không phải yêu cầu — repo đó không thuộc quyền sửa của
Registry).

### 3.4 Xung đột 3 — "epoch" mang **sáu** nghĩa, và đã trả giá hai lần

Ba nghĩa dưới đây là bản v0.2; **ba nghĩa nữa** tìm được 2026-09-02, ghi ở cuối mục. Nghĩa thứ tư
là ca nặng nhất, vì hai nghĩa nằm trong cùng một tệp.

| Nghĩa | Độ dài | Mốc gốc | Neo |
|---|---|---|---|
| Epoch **Cardano** | 5 ngày | mốc riêng của chuỗi | thứ người đọc **mặc định tưởng** khi thấy chữ này trong một repo Cardano |
| **Ô 5 ngày kể từ mốc UNIX** — nghĩa thật của `created_epoch` | 5 ngày | `posix_ms / 432_000_000` | `onchain/lib/magiclamp/registry/util.ak:152` (`ms_per_time_bucket = 432_000_000`) |
| Epoch **LampNet** | 1 giờ | — | `LampNetCloud/lampnet-hivemind/lampnet-reward/src/types.rs:13` (`EPOCH_DURATION_SECS = 3600`) |

Hai nghĩa đầu **cùng độ dài nhưng khác biên ô** — loại lệch tệ nhất, vì phép thử "5 ngày đúng
chưa?" trả lời đúng trong khi biên ô vẫn lệch. Registry đã đổi tên hằng nội bộ thành
`ms_per_time_bucket` đúng vì lý do đó, và giữ tên trường datum `created_epoch` vì đổi tên trường =
đổi lược đồ (`scripts/config.ts:58-63`).

**Hai lần trả giá thật, không phải rủi ro giả định:**

1. `scripts/config.ts:50-56` ghi lại: bản trước khai `MS_PER_EPOCH_BY_NETWORK` = Preview/Preprod
   `86_400_000`, Mainnet `432_000_000` — **lệch 5 lần**. Nặng hơn bình thường vì `created_epoch` là
   trường **bất biến** (PK4): khai sai một lần là sai vĩnh viễn trong sổ, `UpdateEntry` không sửa
   được.
2. Cùng họ lỗi vừa xảy ra ở LAMP: `Utils/src/index.ts` `MS_PER_EPOCH` Preprod sai 5 lần, **chưa vá**
   tại thời điểm viết (nguồn: thư `LAMP → Registry` 2026-08-16, mục 5).

**Nghĩa thứ TƯ, tìm được 2026-09-02 — và nó nằm trong CÙNG MỘT TỆP với nghĩa thứ nhất.**
`MathSpecs/Cave-Math.md` neo chữ này rất tử tế ở hai chỗ:

> `:46` — `epoch_slots = 432,000 (= 5 ngày)`
> `:677` — *"Recalculation: once per epoch (432,000 slots = 5 days)"*

Rồi ở dòng `:672` — **cách dòng `:677` đúng năm dòng, trong cùng một khối `Measurement`** — nó viết:

> *"flops_fp16: standardized benchmark task (FP16 matmul, **1 epoch, ~60 slots**)"*

432.000 slot và ~60 slot, **lệch 7.200 lần**, cùng một chữ, cùng một tệp, cùng một mục. Và con số
này không nằm ở chỗ vô hại: nó là độ dài phép đo chuẩn sinh ra `flops_fp16_measured`, thành phần
nặng nhất (0,40) của `hardware_score` (`:658-667`).

Vì sao ca này nguy hơn ba ca trên: ba ca kia là **hai tệp khác nhau, hai đội khác nhau** — còn có
ranh giới để nghi ngờ. Ca này ở trong tầm mắt một người đọc, nên người đọc **không nghi ngờ gì cả**;
họ thấy `:677` neo chặt rồi mặc định `:672` cũng thế. Không phép đo tự động nào kêu, vì cả hai dòng
đều hợp lệ về hình thức. Đây là bằng chứng rõ nhất cho RD-8: chữ này hỏng **kể cả khi tác giả đã cẩn
thận neo nó**, chỉ cần một dòng quên neo là đủ.

⚠ Registry **không** kết luận dòng nào đúng — đó là việc của đội Cave. Từ điển chỉ ghi nhận là ở đó
có mâu thuẫn, và một `hardware_score` tính từ hai độ dài lệch 7.200 lần thì không so được giữa các
node.

**Nghĩa thứ NĂM — và nó không phải thời gian gì cả.** ProofChat dùng chữ này theo nghĩa MLS
(RFC 9420): `E_i` là **thế hệ khoá nhóm**, đổi khi thành viên vào/ra, không có độ dài
(`ProofChat/Spec/ProofChat-Math.md:323-327`). Nghĩa này *đúng chuẩn* trong địa hạt của nó, nên
không có gì để sửa ở ProofChat — ghi ra vì nó là chỗ nguy hiểm nhất cho một phép rà tự động: bốn
nghĩa kia đều là **thời lượng** nên còn so được với nhau, nghĩa này là một **bộ đếm**. Một công
thức phí nhân với "số epoch" mà gặp phải nó thì cho ra một số vô nghĩa nhưng vẫn có kiểu đúng.

**Nghĩa thứ SÁU — và nó ở cùng kho với nghĩa thứ năm.** Cũng ProofChat: cửa sổ gộp lô của Strata là
**600 giây** — `ProofChat/Spec/ProofChat-Feat.md:195`, *"Batch profile Strata (`epoch 600s,
max_entries 4096`)"*. Tức trong **một kho**, chữ này vừa là bộ đếm thế hệ khoá không có độ dài, vừa
là một cửa sổ 10 phút. Cộng với ca Cave ở trên, đây là **kho thứ hai** mang hai nghĩa nội bộ. Mẫu
hình đủ rõ để phát biểu thành luật: chữ này hỏng **trong phạm vi một kho**, không chỉ giữa các kho —
nên phép rà "mỗi đội thống nhất một nghĩa" không đủ, phải rà tới từng chỗ dùng.

**Chốt:** từ điển dùng **giờ**. Mã 13 là `GIBH` (GiB·giờ), không phải "GiB·epoch". Bên trong LampNet
giữ chữ gì là việc của LampNet; ranh giới đổi chữ nằm ở chỗ khai ra hệ.

### 3.5 Xung đột 4 — `byte·ngày` và `GiB·giờ`: cùng chiều đo, và **không quy đổi chẵn được**

Tìm 2026-09-02. Đây **không** phải lệch nghĩa — cả hai đo đúng một đại lượng (dung lượng × thời
gian), nên RD-1 không bị đụng. Nó là lệch **thang**, và cái đắt nằm ở chỗ ít ai kiểm.

LampNet neo đơn vị lưu trữ là **byte·ngày**, và neo nó thẳng vào giá:
`Specs/_shared/Resource-Usage-Metering.md:38` — *"lưu trữ = **byte·ngày** — khớp đơn vị neo
1 nanogic = 1 byte·ngày"*. Mã 3 của từ điển là **GiB·giờ**.

Quy đổi:

```
1 GiB·giờ = 2^30 byte × (1/24) ngày = 1.073.741.824 / 24 = 44.739.242,666… byte·ngày
```

**Không chẵn.** Hệ số là một phân số vô hạn tuần hoàn, nên mọi phép quy đổi trong số học số nguyên
đều phải làm tròn, và **chiều làm tròn quyết định ai chịu sai số**. Quy đổi hai chiều liên tiếp
không trả về giá trị ban đầu.

Đây đúng họ với xung đột 2 (GiB hay GB, lệch 7,4% — §3.3), nhưng khó thấy hơn một bậc: ở đó hai bên
dùng **cùng tên** với hai độ lớn, nên phép thử "GiB hay GB?" hỏi được. Ở đây hai bên dùng **hai tên
khác nhau** cho cùng một đại lượng, nên không có phép thử nào tự nhiên đặt ra câu hỏi — người tích
hợp chỉ thấy hai đơn vị lạ và tự nhân một hệ số mình tự tính.

**Chốt:** từ điển **giữ `GiB·giờ`** (RD-8: dùng giờ; và GiB đã chốt ở §3.3). Bên nào khai ra hệ
bằng byte·ngày thì tự quy đổi ở biên, **làm tròn xuống**, và công bố hệ số mình dùng. Registry
không đổi mã 13 — đổi nghĩa một mã để chiều lòng một hệ chính là thứ RD-1 cấm.

**Việc còn nợ của chính Registry** (không đẩy sang ai): `util.ak:143-147` tự khai rằng mệnh đề
"Registry và Treasury dùng cùng thang thời gian" **chưa kiểm** — `ms_per_epoch` bên Treasury là
tham số validator (`LAMP/Treasury/onchain/validators/custody.ak:50`), giá trị `432_000_000` chỉ xuất
hiện trong test. Mệnh đề chỉ đúng nếu bên triển khai truyền đúng số đó. Chưa có bằng chứng deploy
nào chứng minh.

---

## 4. `resource` khác `service` — và chỗ Registry thật sự kiểm

Phân biệt này là gốc của mọi thứ ở trên:

- **`resource`** = thứ **đo được**. Là mẫu số. Từ điển §2 chỉ chứa resource.
- **`service`** = thứ **bán được**. Là tử số. Provider tự bó, tự đặt tên, tự định giá.

Một service phân rã thành **vector** các resource:

```json
{
  "service_id": "tree.register",
  "decomposition": [
    { "op_type": 1,  "op_count": 3 },
    { "op_type": 3,  "op_count": 720 },
    { "op_type": 2,  "op_count": 1 }
  ]
}
```

**Registry SẼ validate ba điều, và chỉ ba điều:**

1. Mọi `op_type` trong vector có trong từ điển §2 (RD-1).
2. Vector sắp **tăng ngặt** theo `op_type`, không trùng (RD-7), và độ dài ≤ 16 (RD-6).
3. `op_count ≥ 1`, nguyên.

> ⚠ **Thì tương lai, cố ý.** Ba phép trên là *đặc tả*, chưa phải *hành vi đang chạy*. Tính tới
> 2026-08-17, hồ sơ đăng ký **không có ô nào để khai vector này**: `grep -c 'op_type\|op_count' `
> `../Registrations/template.md ../Registrations/codes.json` trả về `0`. Không có ô thì không có
> gì để validate, và RD-9 — "khai đúng nhưng khai THIẾU vẫn là R3" — hiện là một luật chưa có bề
> mặt thi hành. Xem §6 mục 4. Đừng đọc đoạn này thành "cổng đăng ký đang chặn vector sai".

**Registry KHÔNG validate** — và phải nói to điều này để không ai hiểu nhầm cổng đăng ký thành cơ
quan bảo chứng:

- **Không** kiểm `op_count` khai có đúng với tiêu thụ thật không. Đó là lời khai của provider.
  Registry chỉ bảo đảm *con số ấy nói về cái gì*, không bảo đảm *con số ấy đúng*.
- **Không** kiểm `base_price` cao hay thấp. Giá là việc của platform (§0).
- **Không** giữ beacon, không giữ khoá giá, không ngồi trong committee định giá.

Hệ quả kiểm được: hai platform cùng khai `op_type: 3, op_count: 720` thì người mua **so giá được** —
cả hai đang nói về 720 GiB·giờ đo cùng một cách. Đó là toàn bộ giá trị tệp này tạo ra, không hơn.

### 4.1 RD-9 — vì sao "khai đủ ba điều hình thức" chưa đủ

Ba điều trên đều là điều kiện về **hình dạng** của vector. Không điều nào hỏi vector có **đủ** không.
Lỗ đó dựng lại được thành một nước đi cụ thể:

> Một dịch vụ trợ lý AI thật sự tiêu bốn loại token, cộng lưu trữ, cộng băng thông. Bên bán chỉ khai
> đúng `op_type: 8` (`AI_TOKEN_CACHE_R`) — loại rẻ nhất theo mọi nhà cung cấp thật (§3.2) — đặt
> `base_price` sát đáy, và dồn toàn bộ phần còn lại vào một khoản "phí dịch vụ" nằm ngoài vector.
> Hồ sơ qua cả ba điều kiểm. Bảng so giá công khai cho thấy bên này rẻ nhất hệ. Hoá đơn thật thì
> không.

Việc tách bốn mã token AI (§3.2) là **đúng** về đo lường, nhưng nó cũng trao cho bên bán **bốn núm
vặn độc lập** thay vì một — công thức phí tính riêng từng mã (`pricing.ak:148-157`). Có bốn núm mà
không buộc khai đủ thì tách mã là mở cửa cho **giá mồi**. RD-9 là chỗ đóng cửa đó; nó không đòi gộp
mã lại.

**RD-9 hôm nay là gì, và không là gì.** Registry vẫn **không** đo được tiêu thụ thật, nên RD-9
không phải một phép kiểm — nó là một **lời khai**. Giá trị của nó nằm ở chỗ đổi hạng của việc giấu:
trước RD-9, khai thiếu là im lặng hợp lệ; sau RD-9, khai thiếu là **khai sai sự thật**, tức rơi thẳng
vào **R3** — một trong ba căn cứ từ chối của tập đóng (`../REGISTRATION-STANDARD.md` §5). Không dựng
căn cứ thứ tư, chỉ nối một hành vi vào căn cứ đã có.

Nối được thành phép kiểm thật thì phải qua biên nhận `T-RECEIPT` (`Math-Spec.md` §13) — mà
**L8 hiện còn mở, chưa thi công gì** (`Math-Spec.md:677-680`). Ghi ra để không ai đọc RD-9 rồi tưởng
đã có lưới đỡ.

---

## 5. Danh sách hở — thứ CHƯA cấp mã, và điều kiện để cấp

RD-5 cấm cấp mã cho thứ chưa đo được. Dưới đây là hàng chờ, kèm điều kiện mở khoá.

| Thứ | Vì sao chưa cấp | Điều kiện để cấp mã |
|---|---|---|
| **COMPUTE** | Ba hệ ba nghĩa — §2.1. ⚠ **Cột này đã được sửa 2026-09-02**: bản trước ghi lý do là "không cái nào đơn thứ nguyên", sai — `TaskReceipt.NodeMetrics` có sẵn chín trường đơn thứ nguyên (`Splash/Spec/Splash/Splash-Math.md:685-693`). Lý do thật là **RD-2**: đường có chữ ký thì ký một số vô nghĩa vật lý, đường có nghĩa vật lý thì chưa ai thu thập — §2.1.1 | ~~Chốt đơn vị vCPU·giây chuẩn hoá~~ (đã có sẵn). Việc còn lại: **nối chữ ký quorum Splash vào đúng trường `gpu_seconds`/`cpu_seconds` của `TaskReceipt`** thay vì ký lên `task_units`. GPU vẫn tách mã riêng — và đặc tả đã tách sẵn |
| **`hardware_score` của Cave** | Không phải tài nguyên: là **hệ số/tier**. Công thức `flops×0,40 + memory_bw×0,30 + network_bw×0,20 + uptime×0,10`, chuẩn hoá theo median động (`MathSpecs/Cave-Math.md:658-677`) | Không cấp. Nó gộp bốn đại lượng khác thứ nguyên vào một số — đúng ví dụ mà RD-4 dựng ra để chặn — và ra điểm **tương đối theo percentile**, nên cộng dồn không có nghĩa tiêu thụ. Ghi ở đây vì một cái tên có chữ "score" rất dễ bị lôi vào công thức phí như hệ số nhân |
| **Đồng thuận / chạy node (Cnode)** | Chưa đo được, và spec tự nhận: `Cnode/specs/Cnode-Exec.md:50` xếp "Công thức reward, settlement (hệ token MagicLamp)" vào cột **"Cnode KHÔNG (spec khác)"** (đầu bảng ở `:45`); `:291` ghi "Nối metering đơn-vị-reward (chờ dependency ngoài)" | Chờ chính Cnode chốt đơn vị. Đây là dòng duy nhất trong danh sách hở mà bên sở hữu đã tự đánh dấu là việc treo của họ — đừng cấp mã hộ |
| **HOSTING — site tĩnh** | ⚠ **Không cần mã mới, và đây là kết luận chứ không phải sót.** Bóc Dhost ra thì "hosting một site" = dung lượng-thời gian (đã có mã 13) + **hai khoản phẳng không đo được**: phí tên site `r(G)=r₀+r₁G` (`Dhost/Specs/05-Economics.md:153-160`) và phí "khả-đạt" gateway (`:214-221`, spec tự nói nó **không đo một byte lưu lượng nào**) | Không cấp. Hai khoản phẳng kia là **lệ phí**, không phải tiêu thụ tài nguyên — nhưng theo **RD-9** chúng vẫn phải có mặt trong vector phân rã của service, nếu không bên bán khai đúng mã 13 rẻ nhất rồi dồn chi phí thật vào hai khoản ngoài vector |
| **HOSTING — thuê node (MCS)** | **Đây mới là trục thật sự mới**, không mã nào trong 12 mã chạm tới: chủ pool Cardano trả CARP để **thuê node** chạy Dolos data-node + relay (`Specs/_shared/LampNet-MCS-NodeService.md:24,27-30`). Đơn vị tự nhiên: node-instance·giờ, hoặc giây uptime | Điều kiện đã **thuận lợi bất thường** — spec tự đòi đúng RD-2: *"đo tài nguyên ĐO ĐƯỢC, có bằng chứng, per-node auth `M14-AUTH-02`; **KHÔNG theo tự-khai** (INV-MCS-12)"* (`:99-101`). Chỉ còn thiếu **mã chạy**: chưa mốc kích hoạt nào đạt. Cấp mã ngay là vi phạm RD-5 — chờ một phép đo sống |
| **Thao tác vòng đời DID — phần CÒN LẠI** | Thay chỗ cho mã 10 đã thu hồi (§2.2). ⚠ **Hai thao tác đã có số rồi**: `did.rotate` = mã 7, `did.transfer` = mã 8 (§2). Phần hở là những thao tác còn lại trong bảng phí PhoenixKey — `create_non_person_did` · bốn mức `init_recovery` · `cancel_recovery` · `finalize_recovery` · `issue_vc_anchor` (`PhoenixKeyDID/PhoenixKey-Specs/PhoenixKey-Math.md:3512-3524`) | PhoenixKey chốt: **cấp mã riêng cho từng thao tác, hay gộp một mã "thao tác ghi DID"**. Gộp là vi phạm RD-4 ngay từ dòng đầu — `update_guardians` 0,5 ADA so với `transfer_service` 5 ADA đã lệch **10×**. Đường an toàn là noi theo chính mã 7/8: mỗi thao tác một số. ⚠ Riêng nhóm `recovery` phải tách khỏi nhóm thương mại, cùng lý do mã 7 đã ghi: đặt giá cao lên một thao tác an ninh là khoá người dùng khỏi tự cứu mình |
| **Tách `VERIFY_PROOF` theo hệ chứng minh** | Mã 11 giữ số nhưng không dùng được cho tới khi tách (§2.2) | VeData chốt cách tách, theo đúng tiền lệ của chính họ ở `op_type` 2 vs 3 (lệch 53×, lý do `[I1]`, `VeData-Metering-Feat-Spec.md:104-112`). Tối thiểu phải tách chữ ký thường khỏi ZK; trong ZK còn phải cân Groth16 với PLONK/Halo2 |
| **Giao tin nhắn** | Thay chỗ cho mã 12 đã thu hồi (§2.2) | **Hai bước, làm một bước vẫn hỏng**: (1) nối lại đường gọi `markDelivered` cho nó sống; (2) ký biên nhận bằng khoá riêng **người nhận**. Chỉ (1) thì được một ACK do hạ tầng bên bán tự sinh — vẫn vi phạm RD-2 |
| **MEDIA theo dung lượng** | Mã **1** đếm ảnh, vi phạm RD-4 | Không sửa mã 1 (RD-1). Cấp mã mới đếm **MiB ảnh đã nhận**; mã 1 xuống trạng thái "kế thừa". ⚠ Trong lúc hai mã cùng sống, mã 1 hở về **phía bên mua**: tải toàn ảnh sát ngưỡng cổng kích thước thì rút tối đa dung lượng với giá "1 ảnh" cố định. Bên nào còn dùng mã 1 tự đặt `base_price` bù rủi ro cỡ-tối-đa — đây là việc của platform, không phải lỗ của từ điển |
| **COORDINATION** (điều phối nhiều agent) | Không phải resource — nó là **service vector**, đã có §4 phục vụ | Không cấp. Nếu ai đòi mã riêng, hỏi họ nó đo bằng gì |
| **Giữ chỗ / cọc** (AladinWork `holdDeposit`) | Chưa cài; spec tự đánh dấu `[PARAM]` chưa chốt (`AladinWork/Specs/Task/Task-Schedule-ExtraFee-JobTypeGov-v2.md:7,138-149`) | Cọc **không phải** tiêu thụ tài nguyên — nó là tài sản hoàn lại. Thuộc Treasury, không thuộc từ điển |
| **Phụ phí thời-giá** (`surchargeIndex`) | Chưa cài (cùng nguồn trên) | Là **hệ số nhân**, không phải tài nguyên. Thuộc PC-5 (hệ số cầu), không thuộc từ điển |
| **`personhood_level`** | Hiện chỉ là cờ nhị phân `personhood_ok`, và bị **gán cứng `true`** tại `AladinWork/Core/server.js:319` | Không phải tài nguyên. Ghi ở đây vì nó hay bị lôi vào công thức phí như một hệ số nhân — mà một cờ gán cứng thì nhân vào không có nghĩa |

---

## 6. Cái tệp này KHÔNG làm được

Viết ra để không ai trích dẫn nó quá tay:

1. **Không làm cho lời khai thành sự thật.** Từ điển chốt *nghĩa* của `op_count`, không chốt *tính
   đúng*. Provider khai vống thì từ điển không bắt được — đó là việc của biên nhận (Math-Spec §13),
   nơi bên chịu thiệt chính là bên đã kiểm.
2. **Không có số nào ở đây là giá.** Mọi con số trong tệp này là hằng đơn vị (2^30, 1000 token,
   3600 giây) hoặc trần kỹ thuật (16 dòng), không phải tiền.
3. **Không ràng buộc được repo khác.** Ba đề nghị ở §3.2–3.4 (LampNet sửa chú thích GB, TigerAgent
   tách bốn số khi khai ra hệ) là **đề nghị**. Registry chỉ ràng buộc được thứ đi qua cổng đăng ký.
4. **Chưa có bộ kiểm, và chưa cả có Ô ĐỂ KHAI.** `tools/check-registration.mjs` chưa validate
   vector §4 — nhưng thiếu sót đứng trước nó nặng hơn: `Registrations/template.md` và
   `Registrations/codes.json` không có trường nào cho `op_type` / `op_count`, nên một đội muốn khai
   đúng RD-9 cũng không biết viết vào đâu. Trình tự vá là **ô trước, phép kiểm sau**. Việc còn nợ,
   đã ghi ở `../DevStatus.md` mục "Việc còn treo".
5. **Không biết ai bấm nút cấp mã.** RD-1 và RD-5 nói mã nào **được** cấp, không nói **ai** cấp và
   theo quy trình nào. `../REGISTRATION-STANDARD.md` §5 chỉ gác việc duyệt **platform**, không gác việc
   cấp **`op_type`**. Chừng nào chỗ trống đó còn, vế "từ chối mã trùng nghĩa" của RD-1 là một luật
   không có người thi hành. Việc còn nợ, và nó thuộc chuẩn đăng ký chứ không thuộc tệp này.

---

_Registry agent_
