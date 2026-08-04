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

- **Một người = một DID.** Danh tính neo bằng sinh trắc, không cấp trùng cho cùng một người.
  Đây là nền chống Sybil của toàn hệ: mọi cơ chế quyền biểu quyết, uy tín, phần thưởng đều
  giả định điều này đúng.
- Dịch vụ **không tự phát hành danh tính thay thế** để lách điều kiện trên.
- Khoá riêng thuộc về người dùng. Dịch vụ giữ hộ khoá của người dùng là vi phạm.

> Hệ danh tính khác PhoenixKey vẫn được phép cạnh tranh trong hệ (`MAGIC/SPEC/Whitepaper-MagicLamp-HeSinhThai-Vi.md §9`)
> — nhưng nó phải tự đăng ký như một thành phần và tự chứng minh thoả tính duy nhất một-người-một-danh-tính.
> Một dịch vụ **thường** thì dùng PhoenixKey, không tự dựng hệ danh tính riêng.

### 2.2 Dùng chung hệ token LAMP · MAGIC · CARP

| Token | Vai trò | Ràng buộc với bên đăng ký |
|---|---|---|
| **LAMP** | Token gốc, tổng cung cố định **36 tỷ, không đốt**. Giảm lưu hành = chuyển vào Treasury, không huỷ. | Không thiết kế cơ chế đốt LAMP. Nguồn: `LAMP/Treasury/CONTRACT.md §5`. |
| **MAGIC** | Quyền dùng dịch vụ, được cấp (Gen) chứ không mua. | **Không tạo đường-ra**: không cho phép đổi MAGIC ngược ra tài sản ngoài hệ, dưới bất kỳ hình thức nào. |
| **CARP** | Đồng lưu thông và ổn định của hệ. | Dùng CARP làm phương tiện thanh toán trong hệ. Nguồn: `MAGIC/SPEC/Carpet-CARP-DacTa-Vi.md`. |

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
dưới đây, và từ chối phải nêu rõ rơi vào mục nào:

1. `platform_id` trùng hoặc gây nhầm lẫn với một entry đã niêm yết.
2. Không thoả một trong bốn điều kiện §2.
3. Tham số kỹ thuật sai hoặc không đối soát được với kho thật trên chain.
4. Không có ai chịu trách nhiệm liên hệ được.

**Cạnh tranh không phải là lý do từ chối.** Một dịch vụ cạnh tranh trực tiếp với thành phần
sẵn có trong hệ vẫn được niêm yết nếu thoả bốn điều kiện — đây là cam kết ở
`MAGIC/SPEC/Whitepaper-MagicLamp-HeSinhThai-Vi.md §9`.

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

Lộ trình đóng ba điểm này: `Specs/TECH.md` mục known-gap và `Specs/EXEC.md` §6.
