# Chuẩn đăng ký vào hệ sinh thái MagicLamp

Tài liệu này dành cho **bên muốn đưa một platform, ứng dụng hoặc dịch vụ vào hệ sinh thái
MagicLamp**. Nó trả lời ba câu: phải thoả điều kiện gì, nộp hồ sơ gồm những gì, và đi qua
quy trình nào.

Đặc tả đầy đủ của cơ chế nằm ở [`Specs/`](Specs/) — đọc tài liệu này trước, đọc `Specs/` khi
cần chi tiết kỹ thuật.

---

## 1. Vì sao phải đăng ký

Hệ sinh thái chỉ vận hành trơn tru khi mọi thành phần dùng chung một hệ danh tính, một hệ
token, và một cách kế toán giá trị. Không có sổ đăng ký thì ba thứ hỏng ngay:

- **Không ai biết ai tồn tại.** Ví, explorer, ứng dụng khác không tìm được kho của một dịch
  vụ để định tuyến phí về đúng chỗ.
- **Tên bị chiếm.** Không có cổng kiểm, một bên bất kỳ mint được định danh trùng rồi nhận phí
  thay dịch vụ thật.
- **Người dùng bị khoá trong từng ốc đảo.** Mỗi dịch vụ tự dựng danh tính riêng thì một người
  phải tạo lại tài khoản ở mỗi nơi, và không tầng nào cộng dồn được đóng góp của họ.

Đăng ký giải quyết cả ba: một dịch vụ đã đăng ký thì **tìm được, kiểm chứng được, và ghép
được** với mọi dịch vụ khác trong hệ.

## 2. Bốn điều kiện bắt buộc

Bốn điều kiện dưới đây là bất biến — không có ngoại lệ theo từng bên.

### 2.1 Danh tính người dùng bằng PhoenixKey DID

Người dùng cuối của dịch vụ được định danh bằng **PhoenixKey DID**, không phải tài khoản riêng
của dịch vụ. Hệ quả bắt buộc:

- **Một người = một DID** là *đích* của hệ danh tính, và là nền chống Sybil mà quyền biểu quyết,
  uy tín, phần thưởng hướng tới. **Mức bảo đảm thật hôm nay thấp hơn đích đó rất nhiều** — đọc §7
  trước khi thiết kế bất cứ cơ chế nào dựa vào nó. Đo trên mã đang sống (Phoenix agent 2026-08-04,
  Join chuyển tiếp 2026-08-05): `did:phoenix` mới ép được ở **mức chuỗi DID** — không đúc trùng
  anchor cho cùng một chuỗi DID. **Mức thiết bị CŨNG chưa ép**: DID là băm của entropy sinh tại
  thời điểm gọi chứ không dẫn từ khoá phần cứng hay seed (`PhoenixKeyDID/Database` →
  `DidPhoenixGenerator.java:116-135`, dùng `SecureRandom`); backend chỉ kiểm trùng pubkey nên phép
  kiểm luôn qua (`IdentityServiceImpl.java:98`); không có xác thực phần cứng nào
  (grep `attestation|appattest|play.?integrity|devicecheck` toàn repo backend = 0); phí đăng ký
  1.2 ADA do nền tảng trả (`CardanoServiceImpl.java:77-81`). ⟹ **một máy tạo được không giới hạn
  DID bằng script thuần, không cần điện thoại.** Đừng dựng cơ chế nào coi một DID là một người,
  và cũng đừng coi nó là một thiết bị.
- Dịch vụ **không tự phát hành danh tính thay thế** để lách điều kiện trên.
- Khoá riêng thuộc về người dùng. Dịch vụ giữ hộ khoá của người dùng là vi phạm.

> Hệ danh tính khác PhoenixKey vẫn được phép cạnh tranh trong hệ (`Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md §10`)
> — nhưng nó phải tự đăng ký như một thành phần và tự chứng minh thoả tính duy nhất một-người-một-danh-tính.
> Một dịch vụ **thường** thì dùng PhoenixKey, không tự dựng hệ danh tính riêng.

### 2.2 Dùng chung hệ token LAMP · MAGIC · CARP

| Token | Vai trò | Ràng buộc với bên đăng ký |
|---|---|---|
| **LAMP** | Token gốc, tổng cung cố định **36 tỷ, không đốt**. Giảm lưu hành = chuyển vào Treasury, không huỷ. | Không thiết kế cơ chế đốt LAMP. Nguồn: `LAMP/Treasury/CONTRACT.md §5`. |
| **MAGIC** | Quyền dùng dịch vụ, được cấp (Gen) chứ không mua. | **Không tạo đường-ra**: không cho phép đổi MAGIC ngược ra tài sản ngoài hệ, dưới bất kỳ hình thức nào. |
| **CARP** | Đồng lưu thông và ổn định của hệ. | Dùng CARP làm phương tiện thanh toán trong hệ. Nguồn: repo `CarpetMint` (đường dẫn cũ `MAGIC/SPEC/Carpet-CARP-DacTa-Vi.md` không còn; **file canonical đang chờ đội CARP xác nhận** — đừng trích số từ bản nào khác cho tới lúc đó). Lưu ý đừng nhầm với `LampNetCloud/Specs/Carpet/` — đó là lớp mạng P2P Carpet, không phải token CARP. |

**Biến thể được phép.** Một dịch vụ có thể phát hành token riêng neo vào hệ (token của platform,
CARP instance riêng) — nhưng phải qua đúng cổng của nó, không tự ý:

- Token neo policy LAMP: đăng ký quyền phát hành ở **Mint-Authority Registry**
  (`LAMP/Genesis/onchain/lib/magiclamp/genesis/registry.ak`) — đây là sổ khác với sổ niêm yết
  platform trong repo này, đừng nhầm hai cái.
- CARP instance riêng: theo điều kiện của đặc tả CARP, gồm tỉ lệ đỡ giá không dưới 1.0 và
  tài nguyên quy đổi phải đo được on-chain.

### 2.3 Kho giá trị on-chain, không phải sổ nội bộ

Phí và giá trị dịch vụ thu được phải chảy vào một **Treasury custody instance** on-chain của
chính dịch vụ đó, không nằm trong cơ sở dữ liệu riêng. Lý do: kế toán nội bộ không kiểm chứng
được từ ngoài, nên không thể làm cơ sở cho quyền biểu quyết hay uy tín ở tầng hệ.

Kho là **của dịch vụ**, do cổng quản trị riêng của dịch vụ (`governance_ref`) gác chi. Registry
không giữ tiền và không chi được tiền của ai (`Specs/CONTRACT.md` §5, bất biến PK1).

### 2.4 Không phụ thuộc hạ tầng đóng ngoài hệ cho chức năng cốt lõi

Chức năng cốt lõi không được đặt trên một dịch vụ bên thứ ba mà hệ không kiểm soát và người
dùng không thoát ra được. Dùng kênh ngoài để tiếp cận người dùng thì được; đặt danh tính,
thanh toán hay dữ liệu gốc ở đó thì không.

---

## 3. Hồ sơ đăng ký — nộp những gì

Mỗi bên nộp **một hồ sơ** theo mẫu [`Registrations/_TEMPLATE.md`](Registrations/_TEMPLATE.md).
Hồ sơ gồm bốn phần:

**(a) Nhận dạng dịch vụ** — tên gọi, `platform_id` đề nghị, repo, người hoặc đội chịu trách
nhiệm, mô tả một câu dịch vụ làm gì.

**(b) Khai báo tuân thủ bốn điều kiện §2** — mỗi điều kiện trả lời bằng **con trỏ kiểm được**
(đường dẫn `file:line`, hoặc địa chỉ on-chain, hoặc endpoint), không phải bằng lời hứa. Chưa
làm được điểm nào thì ghi thẳng là chưa, kèm mốc dự kiến — khai thiếu trung thực nặng hơn
khai chưa xong.

**(c) Tham số kỹ thuật** — `instance_id`, `custody_hash`, `seed_policy`, `governance_ref`,
danh sách asset chấp nhận, `cut_bps`, các bucket kế toán. Ý nghĩa từng trường: `Specs/CONTRACT.md` §2.

**(d) Cam kết vận hành** — ai giữ quyền quản trị kho, cách xử lý khi khoá bị lộ, cách thông báo
khi dừng dịch vụ.

## 4. Quy trình bốn bước

```
(0) Nộp hồ sơ  ──▶  (1) Seed custody  ──▶  (2) Register entry  ──▶  (3) Nối luồng thu
    Registrations/     kho on-chain          niêm yết, thấy được     phí chảy về kho
```

**(0) Nộp hồ sơ.** Mở một PR thêm file vào [`Registrations/`](Registrations/). Hồ sơ được rà
theo tiêu chí §5. Bước này hoàn toàn off-chain và không tốn phí.

**(1) Seed custody** — dựng kho on-chain của dịch vụ, chạy một lần. Kết quả: `instance_id`,
`custody_hash`, `seed_policy`. Chi tiết: `Specs/ONBOARDING.md` mục (c).

**(2) Register entry** — niêm yết vào sổ: mint một beacon NFT mang tên `platform_id` và tạo
entry trỏ về kho vừa dựng. Ràng buộc **R-BIND** buộc entry phải tham chiếu một kho **có thật**
đã lên chain, nên bước 1 phải xong trước bước 2 — entry không thể khai khống kho.

**(3) Nối luồng thu** — ứng dụng gọi cửa thu của kho mình mỗi khi phát sinh phí. Việc **định
giá thuộc về dịch vụ**, hệ không quyết giá thay.

Một bên được phép dừng sau bước 1 (có kho riêng, không niêm yết) hoặc sau bước 2 (niêm yết,
chưa nối luồng thu).

## 5. Tiêu chí duyệt

Đăng ký **có kiểm duyệt** (`Specs/CONTRACT.md` bất biến PK3): một quyền đăng ký ký duyệt từng
hồ sơ, để `platform_id` không trùng và sổ không bị rác. Quyền này chỉ gác **việc niêm yết** —
nó không đụng được tiền trong kho của bất kỳ ai.

Để việc kiểm duyệt không biến thành cổng đóng, hồ sơ chỉ bị từ chối theo **tiêu chí khách quan**
dưới đây, và từ chối phải nêu rõ rơi vào mục nào.

**Hai cổng, đừng gộp làm một.** Kho on-chain chỉ ra đời ở bước (1), sau khi hồ sơ đã nộp ở bước (0) —
nên tiêu chí nào đòi kho thật thì thuộc cổng niêm yết, không thuộc cổng tiếp nhận. Gộp hai cổng là tự
khoá mình: mọi hồ sơ lần đầu đều trượt một cách máy móc.

**Cổng tiếp nhận hồ sơ — áp ở bước (0):**

1. `platform_id` trùng hoặc gây nhầm lẫn với một entry đã niêm yết.
2. Không có ai chịu trách nhiệm liên hệ được.
3. Khai không đúng sự thật (khác hẳn với khai chưa xong).

**Khai "chưa đạt" kèm mốc dự kiến KHÔNG phải căn cứ từ chối ở bước (0).** Hồ sơ như vậy được tiếp nhận
và mang trạng thái *đã tiếp nhận — chưa đủ điều kiện niêm yết*; nó khác hẳn *bị từ chối*. Khai thiếu
trung thực thì nặng hơn khai chưa xong.

**Cổng niêm yết — áp ở bước (2), khi kho đã có thật:**

4. Không thoả một trong bốn điều kiện §2 **tại thời điểm niêm yết**.
5. Tham số kỹ thuật sai hoặc không đối soát được với kho thật trên chain.

Ràng buộc **R-BIND** on-chain đã ép sẵn thứ tự này: entry phải trỏ một kho đã lên chain, nên cổng niêm
yết không thể bị vượt bằng cách khai khống. Nhưng lưu ý giới hạn thật của nó ở §7.

**Cạnh tranh không phải là lý do từ chối.** Một dịch vụ cạnh tranh trực tiếp với thành phần
sẵn có trong hệ vẫn được niêm yết nếu thoả bốn điều kiện — đây là cam kết ở
`Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md §10` ("Cổng đăng ký mở — ai cũng vào, cạnh tranh bình đẳng").

## 6. Sau khi được niêm yết

- **Năm trường định danh là bất biến**: `platform_id`, `instance_id`, `custody_hash`,
  `seed_policy`, `created_epoch`. Đổi bất kỳ trường nào = một platform khác, phải đăng ký mới.
- **Bốn trường còn lại đổi được** qua thao tác cập nhật entry: trạng thái, cổng quản trị,
  danh sách asset, tỉ lệ cắt.
- **Vòng đời một chiều**: `Active ⇄ Paused → Retired`. `Retired` là trạng thái cuối, không hồi
  sinh. Entry không bao giờ bị xoá — lịch sử luôn tra được.
- ⚠️ **Trạng thái là nhãn niêm yết, không phải van khoá tiền.** Đặt `Paused` hay `Retired`
  **không** dừng dòng thu/chi ở kho — kho vẫn vận hành qua cổng quản trị riêng của nó. Ai hiểu
  "Retired = quỹ đã đóng" là hiểu sai (`Specs/CONTRACT.md` bất biến PK10).
- **Bên định tuyến phí phải tự đối soát trước khi tin một entry**: kiểm trùng `platform_id` và
  đối chiếu entry với kho thật. Entry chỉ là con trỏ; kho mới là nguồn chân lý khi hai bên lệch.

## 7. Điểm chưa chốt

Ba điểm dưới đây đang mở, ghi ra để bên đăng ký biết mình đang tin vào cái gì:

| Điểm | Hiện trạng | Ảnh hưởng tới bên đăng ký |
|---|---|---|
| Quyền đăng ký | Đang là **một khoá đơn**, chưa phải multisig hay DAO | Một khoá rò là chiếm được tên. Phải chuyển thành nhiều chữ ký trước khi lên mainnet. |
| Tính duy nhất `platform_id` | Bảo đảm bằng **kỷ luật ký**, không bằng mật mã | Bên định tuyến phí phải tự kiểm trùng, không được tin sổ một cách mù quáng. |
| Neo biên nhận thu phí | Chưa neo on-chain | Không được dùng số liệu thu phí tự khai để cấp uy tín hay quyền biểu quyết. |
| Tính duy nhất một-người-một-DID | `did:phoenix` mới ép ở **mức chuỗi DID**. **Mức người và cả mức thiết bị đều chưa ép** — dẫn chứng ở §2.1. Chủ dự án đã chốt "một người = một DID" là **yêu cầu cứng** (2026-08-06); PhoenixKey đang thiết kế tầng personhood (neo định danh nhà nước + nullifier chống trùng tính bằng DPRF ngưỡng), **chưa phát hành**. | Đừng dựng cơ chế chống Sybil dựa trên "hai DID phân biệt" — một máy ký chéo cho chính nó bằng script được, không cần cả điện thoại thứ hai. Tới khi tầng personhood lên, **rào kinh tế là phòng thủ duy nhất** — nghĩa là rào đó phải tự đứng được mà **không** giả định danh tính đắt. Cụ thể: phần thưởng phát ra mỗi epoch phải bị chặn trên bởi một phần **nhỏ hơn 1** của lượng MAGIC thực bị tiêu cùng epoch, phần dư về Treasury. Có ràng buộc đó thì kẻ dựng cầu giả để farm luôn lỗ, kể cả khi tạo được vô hạn DID. |
| R-BIND kiểm được gì | R-BIND chỉ kiểm entry **tự nhất quán**: `seed_policy`, `instance_id`, `custody_hash` đều lấy từ chính hồ sơ khai. Kiểm bằng thực thi 2026-08-04: một kho tự dựng hoàn toàn vẫn qua được. | Cổng thật lúc đăng ký là chữ ký authority, không phải R-BIND. Bên định tuyến phí **bắt buộc** tự đối soát kho, không được coi "đã qua R-BIND" là đã kiểm. |
| Hai thẩm quyền khác nhau | "Quyền đăng ký" thực ra là hai: quyền gộp thay đổi vào repo này (bước 0) và khoá ký `registry_authority` on-chain (bước 2). Lộ trình nhiều chữ ký hiện chỉ nói tới cái thứ hai. | Cả hai đều phải siết trước mainnet. Siết một cái mà bỏ cái kia thì cổng vẫn hở. |
| Dịch vụ không thu asset | Chưa có đường. Ràng buộc on-chain đòi `accepted_assets` khác rỗng và `governance_ref` khác rỗng, nên một dịch vụ không thu tiền vẫn buộc dựng kho và khai ít nhất một asset mới lên sổ được. | Nếu dịch vụ của bạn không thu asset, nêu rõ trong hồ sơ — đây là khoảng trống của chuẩn, không phải lỗi của bạn. |

Lộ trình đóng ba điểm này: `Specs/Tech-Spec.md` mục known-gap và `Specs/Exec-Spec.md` §6.
