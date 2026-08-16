# Từ điển tài nguyên — mẫu số chung để so giá giữa các dịch vụ

> Trạng thái: **v0.1, bản chốt lần đầu**. Ngày: 2026-08-16.
> Phạm vi: Registry giữ **đơn vị đo**, KHÔNG giữ **đơn giá**.
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
| **RD-1** | Mỗi `op_type` gắn ĐÚNG MỘT bộ ba `(lớp, đơn vị, quy ước đo)`, bất biến sau khi công bố. Và một mã đề xuất **trùng lớp + đo cùng đại lượng vật lý** với mã đang lưu hành thì **bị từ chối**, dù nó tự thân hợp mọi bất biến khác | Đổi nghĩa một mã đang lưu hành = đổi giá im lặng ở mọi platform đang dùng mã đó. Cần nghĩa mới thì cấp **mã mới**, không sửa mã cũ. Vế sau chặn hướng ngược: xin `STORAGE_GIB_DAY` cạnh `STORAGE_GIBH` (mã 3) là hợp lệ từng điều nhưng chẻ thị trường làm hai nhóm phải quy đổi qua tay — phá đúng mục tiêu "mẫu số chung" mà RD-1 sinh ra để giữ |
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

Mã `1` và `2` **đã lưu hành** — chúng có mặt trong script triển khai thật
(`MAGIC/scripts/deploy/09_deploy_consume.ts:161-162`), nên nghĩa của chúng bị RD-1 khoá. Mã từ `3`
trở lên do tệp này cấp lần đầu.

| `op_type` | Tên | Lớp | Đơn vị (`op_count` đếm cái gì) | Quy ước đo — phải đo đúng thế này | Trạng thái |
|---|---|---|---|---|---|
| **1** | `MEDIA_IMAGE` | media | 1 ảnh đã nhận | Đếm ảnh nhận thành công tại biên dịch vụ, sau khi qua cổng kích thước. **Đây là mã tương thích ngược, vi phạm RD-4** (một ảnh 200 KB và một ảnh 20 MB cùng đếm 1) — §5.1 | Lưu hành |
| **2** | `ANCHOR_CID` | anchor | 1 CID được neo | Đếm CID **khác nhau** ghi vào một giao dịch đã lên chuỗi. Retry cùng CID không cộng thêm | Lưu hành |
| **3** | `STORAGE_GIBH` | storage | 1 **GiB·giờ** | `GiB = 2^30 byte` (**không** phải 10^9). Tích phân dung lượng theo thời gian, lấy mẫu ≥ 1 lần/giờ, làm tròn xuống. Đếm byte **đã lưu**, không đếm byte đã cấp phát | Mới |
| **4** | `BANDWIDTH_GIB` | bandwidth | 1 **GiB** đã truyền | Byte rời khỏi biên dịch vụ tới bên thứ ba, đo ở tầng ứng dụng (payload), **không** tính header/retransmit | Mới |
| **5** | `AI_TOKEN_IN` | ai | 1000 token **đầu vào mới** | `usage.input_tokens` của khung `result`. **Không** gộp cache — §3.2 | Mới |
| **6** | `AI_TOKEN_OUT` | ai | 1000 token **đầu ra** | `usage.output_tokens` | Mới |
| **7** | `AI_TOKEN_CACHE_W` | ai | 1000 token **ghi cache** | `usage.cache_creation_input_tokens` | Mới |
| **8** | `AI_TOKEN_CACHE_R` | ai | 1000 token **đọc cache** | `usage.cache_read_input_tokens` | Mới |
| **9** | `SENSING_READING` | sensing | 1 lần đọc cảm biến **đã được tiêu thụ** | Đếm ở phía **hạ nguồn** (bên đọc dữ liệu), không đếm ở phía cảm biến. Cảm biến tự đếm thì đếm bao nhiêu cũng được — vi phạm RD-2 | Mới |
| **10** | `IDENTITY_RESOLVE` | identity | 1 lần phân giải DID | Đếm lần trả về kết quả phân giải thành công. Cache hit vẫn đếm | Mới |
| **11** | `VERIFY_PROOF` | verify | 1 chứng minh đã kiểm | Đếm lần chạy trọn phép kiểm, **kể cả khi kết quả là "không hợp lệ"** — chi phí đã tiêu rồi. Nhưng **mỗi chứng minh chỉ đếm MỘT lần**: kiểm lại cùng một chứng minh không cộng thêm, và phép kiểm do chính bên bán khởi phát (không đến từ yêu cầu bên mua) **không đếm** — cùng luật chống đếm lặp với mã 2 | Mới |
| **12** | `MESSAGE_DELIVERED` | message | 1 tin đã giao tới người nhận | Đếm ở đầu **nhận**, không đếm ở đầu gửi. "Đầu nhận" phải là **bên tách biệt kiểm chứng được** — biên nhận giao ký bằng khoá của người nhận, không phải ACK do hạ tầng của bên bán tự sinh. Bên bán vận hành cả hai đầu rồi tự chứng thực là vi phạm RD-2, cùng dạng với cảm biến tự đếm ở mã 9 | Mới |

Lớp (`class`) không phải để trang trí: nó là khoá của hệ số cầu per-platform per-class
(PC-5, bản nháp cơ chế phí), nên hai `op_type` cùng lớp thì cùng chịu một hệ số cầu.

### 2.1 Vì sao **không** có mã cho COMPUTE

Đây là quyết định, không phải sót.

`LampNet` đang định giá compute theo `task-unit`: `BASE_PRICE_COMPUTE = 10` µLAMP mỗi task-unit
(`LampNetCloud/lampnet-hivemind/lampnet-reward/src/types.rs:354`), và task-unit lấy từ
`ComputeEvidence.task_units` do quorum Splash ký (`.../src/metering.rs:174-178`). Nhưng **không có
định nghĩa vật lý nào cho 1 task-unit** trong repo đó — nó là con số quorum đồng ý với nhau.

`OriLife` cũng có "compute", nhưng ở đó nó là **tỉ lệ chia bps** của tổng phí
(`OriLifeTrace/orilife-fee/src/params.ts:37`, `compute = 3500`), không phải kết quả đo.

`TigerAgent` AaaS liệt `per-compute-unit` như một `PricingSpec.unit`
(`TigerAgent/Spec/agent-as-a-service/AaaS-3-reward-as-service.md:132`), cũng không định nghĩa.

Ba hệ, ba nghĩa, **không so được với nhau**. Cấp một mã `COMPUTE` chung lúc này chỉ tạo ảo giác so
được: hai platform khai cùng mã, người mua tưởng cùng thứ, thực ra không. Vi phạm RD-4 và RD-5.

Việc phải làm trước khi cấp mã: chốt một đơn vị đơn thứ nguyên đo được — ứng viên là **vCPU·giây ở
tần số chuẩn hoá**, và GPU tách riêng thành mã khác (GPU không quy về CPU được). Ghi ở §5.

---

## 3. Đối chiếu bốn hệ — ba xung đột đo được

Bảng dưới không phải khảo sát cho vui: mỗi dòng "lệch" là một chỗ hai dịch vụ đang khai cùng một
chữ mà ra hai con số khác nghĩa.

### 3.1 Bảng hiện trạng

| Hệ | Tài nguyên đo **thật** trong mã | Neo | Khớp từ điển? |
|---|---|---|---|
| **LampNet** | storage theo byte + PoR bond | `lampnet-reward/src/metering.rs:120-159` | Khớp mã **3** sau khi chốt GiB (§3.3) |
| | compute theo `task_units` + quorum Splash | `.../metering.rs:163-178` | **Không có mã** — §2.1 |
| | bandwidth | — | **Chưa đo được**: chỉ có đặc tả `Beam-Math.md:100-151`, không có module. Chính tài liệu kinh tế tự nhận "dung lượng neo được; lưu lượng thì không" (`Dhost/Specs/05-Economics.md:121-125`) |
| | sensing (Probe) | — | **Chưa đo được**: có khai báo `Specs/ResourceBudget.md:46-48`, không có mã reward |
| **OriLife** | phí theo tác vụ (9 loại, base USD) | `orilife-fee/src/tasks.ts:29-75` | Là **service**, không phải resource — phải phân rã, §4 |
| | storage/compute/bandwidth | `orilife-fee/src/params.ts:35-40` | **Không phải metering**: là tỉ lệ chia bps cố định của tổng phí, không đo tiêu thụ từng người |
| | anchor theo tier | `orilife-fee/src/tasks.ts` (`defaultAnchorTier`) | Khớp mã **2** |
| **AladinWork** | token LLM, **tách 4 loại** + USD thật | `Core/budget.js:470-472` | Khớp mã **5–8** |
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
`BASE_PRICE_STORAGE` chú thích "µLAMP / GiB-epoch" (`types.rs:352`). Chú thích ngay trên nó cũng viết
đúng: *"`MAX_METERED_BYTES_NEWBIE` = 10 × 2^30 (10 GiB)"* (`types.rs:348`). Nhưng chính dòng khai hằng
số ghi `MAX_METERED_BYTES_NEWBIE: u64 = 10_737_418_240; // 10 GB` (`types.rs:362`) — con số **đúng**
(10 × 2^30) nhưng chú thích cuối dòng viết **"GB"**, ngược với chú thích cách đó 14 dòng.

Số đúng, chữ sai. Đây là loại lệch sống sót rất lâu vì không có test nào bắt được chữ trong chú
thích. Nó chỉ nổ khi một hệ khác đọc chữ "GB" rồi cài `10^9` — sai **7,4%** ở mọi hoá đơn.

**Chốt:** mã **3** và **4** dùng **GiB = 2^30**, viết đúng chữ "GiB". Đề nghị LampNet sửa chú thích
`types.rs:362` cho khớp `:348` (đề nghị, không phải yêu cầu — repo đó không thuộc quyền sửa của
Registry).

### 3.4 Xung đột 3 — "epoch" mang ba nghĩa, và đã trả giá hai lần

Ba nghĩa đang cùng sống:

| Nghĩa | Độ dài | Mốc gốc | Neo |
|---|---|---|---|
| Epoch **Cardano** | 5 ngày | mốc riêng của chuỗi | thứ người đọc **mặc định tưởng** khi thấy chữ này trong một repo Cardano |
| **Ô 5 ngày kể từ mốc UNIX** — nghĩa thật của `created_epoch` | 5 ngày | `posix_ms / 432_000_000` | `onchain/lib/magiclamp/registry/util.ak:116` (`ms_per_time_bucket = 432_000_000`) |
| Epoch **LampNet** | 1 giờ | — | `LampNetCloud/lampnet-hivemind/lampnet-reward/src/types.rs:13` (`EPOCH_DURATION_SECS = 3600`) |

Hai nghĩa đầu **cùng độ dài nhưng khác biên ô** — loại lệch tệ nhất, vì phép thử "5 ngày đúng
chưa?" trả lời đúng trong khi biên ô vẫn lệch. Registry đã đổi tên hằng nội bộ thành
`ms_per_time_bucket` đúng vì lý do đó, và giữ tên trường datum `created_epoch` vì đổi tên trường =
đổi lược đồ (`scripts/config.ts:58-62`).

**Hai lần trả giá thật, không phải rủi ro giả định:**

1. `scripts/config.ts:50-56` ghi lại: bản trước khai `MS_PER_EPOCH_BY_NETWORK` = Preview/Preprod
   `86_400_000`, Mainnet `432_000_000` — **lệch 5 lần**. Nặng hơn bình thường vì `created_epoch` là
   trường **bất biến** (PK4): khai sai một lần là sai vĩnh viễn trong sổ, `UpdateEntry` không sửa
   được.
2. Cùng họ lỗi vừa xảy ra ở LAMP: `Utils/src/index.ts` `MS_PER_EPOCH` Preprod sai 5 lần, **chưa vá**
   tại thời điểm viết (nguồn: thư `LAMP → Registry` 2026-08-16, mục 5).

**Chốt:** từ điển dùng **giờ**. Mã 3 là `GIBH` (GiB·giờ), không phải "GiB·epoch". Bên trong LampNet
giữ chữ gì là việc của LampNet; ranh giới đổi chữ nằm ở chỗ khai ra hệ.

**Việc còn nợ của chính Registry** (không đẩy sang ai): `util.ak:107-113` tự khai rằng mệnh đề
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

**Registry validate ba điều, và chỉ ba điều:**

1. Mọi `op_type` trong vector có trong từ điển §2 (RD-1).
2. Vector sắp **tăng ngặt** theo `op_type`, không trùng (RD-7), và độ dài ≤ 16 (RD-6).
3. `op_count ≥ 1`, nguyên.

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
vào **R3** — một trong ba căn cứ từ chối của tập đóng (`REGISTRATION-STANDARD.md` §5). Không dựng
căn cứ thứ tư, chỉ nối một hành vi vào căn cứ đã có.

Nối được thành phép kiểm thật thì phải qua biên nhận `T-RECEIPT` (`Specs/Math-Spec.md` §13) — mà
**L8 hiện còn mở, chưa thi công gì** (`Math-Spec.md:677-680`). Ghi ra để không ai đọc RD-9 rồi tưởng
đã có lưới đỡ.

---

## 5. Danh sách hở — thứ CHƯA cấp mã, và điều kiện để cấp

RD-5 cấm cấp mã cho thứ chưa đo được. Dưới đây là hàng chờ, kèm điều kiện mở khoá.

| Thứ | Vì sao chưa cấp | Điều kiện để cấp mã |
|---|---|---|
| **COMPUTE** | Ba hệ ba nghĩa, không cái nào đơn thứ nguyên — §2.1 | Chốt đơn vị vCPU·giây chuẩn hoá; GPU tách mã riêng. Cần một phép đo bên thứ ba xác nhận được |
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
4. **Chưa có bộ kiểm.** `tools/check-registration.mjs` hiện chưa validate vector §4. Việc còn nợ.
5. **Không biết ai bấm nút cấp mã.** RD-1 và RD-5 nói mã nào **được** cấp, không nói **ai** cấp và
   theo quy trình nào. `REGISTRATION-STANDARD.md` §5 chỉ gác việc duyệt **platform**, không gác việc
   cấp **`op_type`**. Chừng nào chỗ trống đó còn, vế "từ chối mã trùng nghĩa" của RD-1 là một luật
   không có người thi hành. Việc còn nợ, và nó thuộc chuẩn đăng ký chứ không thuộc tệp này.

---

_Registry agent_
