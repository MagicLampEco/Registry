# Chuẩn đăng ký vào hệ sinh thái MagicLamp

Tài liệu này dành cho **bên muốn đưa một platform, ứng dụng hoặc dịch vụ vào hệ sinh thái
MagicLamp**. Nó trả lời ba câu: phải thoả điều kiện gì, nộp hồ sơ gồm những gì, và đi qua
quy trình nào.

Đặc tả đầy đủ của cơ chế nằm ở [`Specs/`](Specs/) — đọc tài liệu này trước, đọc `Specs/` khi
cần chi tiết kỹ thuật.

> **Quy ước trích dẫn.** Trích dẫn dạng `Repo/đường/dẫn.md` là đường dẫn **trong repo đó**, không
> phải trong repo này. `Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md` nằm ở repo `Launch`;
> `LAMP/Treasury/CONTRACT.md` nằm ở repo `LAMP`.

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

## 2. Điều kiện — một cổng cứng, ba lời khai có phân hạng

Đây là chỗ bản trước nói mạnh hơn nguồn của nó, và đã sửa. Whitepaper hệ sinh thái viết
(`Launch/Whitepaper-MagicLamp-Ecosystem-(Vi).md:201`, §8 bước 2):

> *"Ba điều kiện duy nhất: **tiêu MAGIC · dùng CARP · đăng ký**. Cổng **mở** — đủ điều kiện là
> vào, không phải xin phép."*

Bản trước của chuẩn này ghi **bốn điều kiện bắt buộc, không có ngoại lệ** — tức nó tự thêm hai
điều kiện vào một lời hứa công khai, và bỏ mất "tiêu MAGIC". Hệ quả thật: hồ sơ Join kẹt vĩnh
viễn ở cửa nộp vì không thu asset, và ProofChat không nộp được vì phải chọn giữa khai sai và
không nộp. Cả hai đều là lỗi của chuẩn.

Cách dung hoà, và nó là nguyên tắc của toàn bộ tài liệu này:

| | Trục | Vai |
|---|---|---|
| **2.2** | Hệ token dùng chung | **cổng cứng** — đây đúng là ba điều kiện của whitepaper |
| **2.1** | Danh tính người dùng | **lời khai có phân hạng** |
| **2.3** | Kho giá trị on-chain | **lời khai có phân hạng** |
| **2.4** | Phụ thuộc hạ tầng đóng ngoài hệ | **lời khai có phân hạng** |

**Lời khai có phân hạng** nghĩa là: khai đúng thì hồ sơ được **tiếp nhận**, dù khai "chưa đạt".
Mã đã khai quyết định **hạng niêm yết**, và bên định tuyến phí đọc hạng đó rồi tự quyết mức tin.
Chỉ **khai sai sự thật** mới là căn cứ từ chối. Tập đóng các mã: [`Registrations/codes.json`](Registrations/codes.json).

### 2.1 Danh tính người dùng bằng PhoenixKey DID · trục `identity`

Người dùng cuối được định danh bằng **PhoenixKey DID**, không phải tài khoản riêng của dịch vụ.
Nguồn: whitepaper §8 bước 2 (*"định danh qua PhoenixKey (hoặc danh tính tương đương)"*) và §5.

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
- Khoá riêng thuộc về người dùng. Dịch vụ giữ hộ khoá của người dùng là **mã `ID-1`**, không phải
  một cửa từ chối — nhưng nó chặn hạng niêm yết ở `L1`.

> Hệ danh tính khác PhoenixKey vẫn được phép cạnh tranh trong hệ (whitepaper §10) — nhưng nó phải
> tự đăng ký như một thành phần, và bên dùng nó khai mã `ID-A` kèm `platform_id` của hệ đó. Một
> dịch vụ **thường** thì dùng PhoenixKey, không tự dựng hệ danh tính riêng.

### 2.2 Dùng chung hệ token LAMP · MAGIC · CARP · trục `token` — **cổng cứng**

| Token | Vai trò | Ràng buộc với bên đăng ký |
|---|---|---|
| **LAMP** | Token gốc, tổng cung cố định **36 tỷ, không đốt**. Giảm lưu hành = chuyển vào Treasury, không huỷ. | Không thiết kế cơ chế đốt LAMP. Nguồn: `LAMP/Treasury/CONTRACT.md §5`. |
| **MAGIC** | Quyền dùng dịch vụ, được cấp (Gen) chứ không mua. | **Không tạo đường-ra**: không cho phép đổi MAGIC ngược ra tài sản ngoài hệ, dưới bất kỳ hình thức nào. |
| **CARP** | Đồng lưu thông và ổn định của hệ; **đơn vị trả thưởng đóng góp tài nguyên**. | Dùng CARP làm phương tiện thanh toán trong hệ. Nguồn: repo `CarpetMint` (đường dẫn cũ `MAGIC/SPEC/Carpet-CARP-DacTa-Vi.md` không còn; **file canonical đang chờ đội CARP xác nhận** — đừng trích số từ bản nào khác cho tới lúc đó). Đừng nhầm với `LampNetCloud/Specs/Carpet/` — đó là lớp mạng P2P Carpet, không phải token CARP. |

**Biến thể được phép.** Một dịch vụ có thể phát hành token riêng neo vào hệ — nhưng phải qua đúng
cổng của nó, không tự ý. Token neo policy LAMP thì đăng ký quyền phát hành ở **Mint-Authority
Registry** (`LAMP/Genesis/onchain/lib/magiclamp/genesis/registry.ak`) — sổ khác với sổ niêm yết
platform trong repo này, đừng nhầm hai cái. CARP instance riêng thì theo điều kiện của đặc tả CARP.

**Đây là trục duy nhất chặn niêm yết.** Mã `TK-X` — có token riêng chưa qua cổng phát hành — là căn
cứ từ chối. Không phải vì cạnh tranh: vì nó phá đúng hệ token dùng chung mà mọi bên khác đang dựa vào.

### 2.3 Kho giá trị on-chain · trục `custody`

Phí và giá trị dịch vụ thu được nên chảy vào một **Treasury custody instance** on-chain của chính
dịch vụ đó (mã `CU-1`), không nằm trong cơ sở dữ liệu riêng (mã `CU-0`). Lý do: kế toán nội bộ
không kiểm chứng được từ ngoài, nên không làm cơ sở cho quyền biểu quyết hay uy tín ở tầng hệ.

Kho là **của dịch vụ**, do cổng quản trị riêng của dịch vụ (`governance_ref`) gác chi. Registry
không giữ tiền và không chi được tiền của ai (`Specs/CONTRACT.md` §5, bất biến PK1).

**Dịch vụ không thu asset ở tầng này khai mã `CU-N`** — hạng ngang `CU-1`, vì không thu tiền không
phải là thiếu sót. `CU-N` vẫn **bắt buộc khai `governance_ref`**, và lý do không phải để gác tiền:
xem §6, chuyển sang `Retired` đòi đồng thuận của chính platform, nên hồ sơ không có `governance_ref`
là hồ sơ mà quyền đăng ký một mình xoá vĩnh viễn được. Ô đó bảo vệ bên đăng ký.

### 2.4 Không phụ thuộc hạ tầng đóng ngoài hệ · trục `infra`

Chức năng cốt lõi đặt trên một dịch vụ bên thứ ba mà hệ không kiểm soát và người dùng không thoát
ra được là một rủi ro thật — nhưng **whitepaper không có điều kiện này**, nên chuẩn này không được
biến nó thành cổng đóng. Nó là lời khai bốn bậc `IN-0`…`IN-3`.

Dùng kênh ngoài để **tiếp cận** người dùng thì bình thường. Đặt **danh tính, thanh toán hay dữ liệu
gốc** ở đó thì hạ hạng. Và một dạng phụ thuộc dễ bỏ sót: kho ứng dụng có thể nắm **quyền phủ quyết**
đúng chức năng cốt lõi — không phải chỉ chậm phát hành mà là gỡ hẳn.

---

## 3. Hồ sơ đăng ký — khai bằng **mã**, không viết văn xuôi

Đây là phần đổi lớn nhất so với bản trước, và lý do nó đổi:

Chừng nào hồ sơ còn là văn xuôi thì "duyệt" là một hành vi của con người, mà hành vi của con người
thì không kiểm lại được. Bên nộp không biết mình đang đứng ở đâu; bên duyệt không có gì để tự ràng
mình. Khai bằng mã từ **tập đóng** thì hạng niêm yết **tính ra được**, và người giữ quyền đăng ký
chuyển từ vai người phán xử sang vai người đối chiếu.

Mỗi bên nộp **một hồ sơ** theo mẫu [`Registrations/template.md`](Registrations/template.md), gồm:

**(a) Khối khai báo máy đọc** — một khối ` ```json registration ` chọn một mã cho mỗi trục §2, kèm
các con trỏ mà mã đó bắt buộc phải có. Chấm thử trước khi mở PR:

```bash
node tools/check-registration.mjs Registrations/<ten-dich-vu>.md
```

**(b) Giải thích bốn mã** — vì sao chọn mã đó, con trỏ kiểm được, và **thiếu gì để lên mã cao hơn**.
Cột cuối là cột quan trọng nhất: nó biến hồ sơ thành một đường đi, không phải một bản án.

**(c) Tham số kỹ thuật** — `instance_id`, `custody_hash`, `seed_policy`, `governance_ref`,
`accepted_assets`, `cut_bps`, bucket kế toán. Chỉ bắt buộc khi `CU-1`.

**(d) Lời khẳng định và hạng chứng thực** — liệt kê **mọi** con số dịch vụ khai ra rồi tính tiền
hoặc xin uy tín dựa trên nó, mỗi dòng một hạng `EV-0` / `EV-1` / `EV-2`. Một dịch vụ khai nhiều
hạng cho nhiều chặng là bình thường.

**(e) Cam kết vận hành** — ai giữ quyền quản trị kho, xử lý khi khoá lộ, cách thông báo khi dừng,
ai tiếp nhận nếu đội ngừng duy trì.

**Con trỏ bắt buộc là con trỏ *on-chain*, không phải URL.** Bốn trường ở (c) đều tra được bằng
explorer. Một endpoint web là **tuỳ chọn** và việc nó đang sập **không** ảnh hưởng hồ sơ — cổng đăng
ký kiểm kho on-chain có thật không, không kiểm dịch vụ có sống không.

### Hạng chứng thực — và một câu phải đọc kỹ

| Hạng | Nghĩa |
|---|---|
| `EV-0` | tự khai — chính bên hưởng lợi ký, hoặc không ai ký |
| `EV-1` | một bên **không hưởng lợi** từ con số đó ký |
| `EV-2` | neo on-chain, bên thứ ba tra lại được độc lập |

> **`EV-0` vẫn bán được.** Nó chỉ **không được dùng để cấp uy tín hoặc quyền biểu quyết ở tầng hệ**.
> Đây là **mô tả, không phải hình phạt** — hệ không có quyền phạt. Ai đọc hạng này như một mức kỷ
> luật là đọc sai: nó nói cho bên mua biết họ đang tin vào cái gì.

Một chỗ dễ tưởng là an toàn mà không: chữ ký **chỉ** đạt `EV-1` khi khoá ký thuộc một bên khác. Một
máy chủ tự ký bằng khoá nằm trên chính nó, hoặc một node ký bằng hạt giống là hằng số trong mã nguồn
nên mọi node đều có cùng khoá — cả hai đều vẫn là `EV-0`. Cái thứ hai không phải "tự ký", nó là
**không ký**.

## 4. Quy trình bốn bước

```
(0) Nộp hồ sơ  ──▶  (1) Seed custody  ──▶  (2) Register entry  ──▶  (3) Nối luồng thu
    Registrations/     kho on-chain          niêm yết, thấy được     phí chảy về kho
```

**(0) Nộp hồ sơ.** Mở một PR thêm file vào [`Registrations/`](Registrations/). Bước này hoàn toàn
off-chain, không tốn phí, và **kết quả là một hạng tính ra được** — không phải một lời phán.

**(1) Seed custody** — dựng kho on-chain, chạy một lần. Kết quả: `instance_id`, `custody_hash`,
`seed_policy`. Chi tiết: `Specs/onboarding.md` mục (c). **Bỏ qua bước này nếu khai `CU-N`.**

**(2) Register entry** — mint một beacon NFT mang tên `platform_id` và tạo entry trỏ về kho. Ràng
buộc **R-BIND** buộc entry tham chiếu một kho **có thật** đã lên chain, nên bước 1 phải xong trước
bước 2. Từ bản v2 của validator, entry còn bị ép nằm **đúng** ở địa chỉ validator registry
(**R-OUT-1**) và `created_epoch` bị ép theo cửa sổ hiệu lực của chính giao dịch (**R-EPOCH**) — không
tự khai được nữa.

**(3) Nối luồng thu** — ứng dụng gọi cửa thu của kho mình mỗi khi phát sinh phí. Việc **định giá
thuộc về dịch vụ**, hệ không quyết giá thay.

Một bên được phép dừng sau bước 1 hoặc sau bước 2.

## 5. Duyệt — "có kiểm duyệt" nghĩa là gì, và nghĩa là **không** gì

`Specs/CONTRACT.md` bất biến PK3 viết cổng đăng ký là **có kiểm duyệt**. Whitepaper §10 viết *"bất
kỳ ai cũng đăng ký vào hệ được, **không phải xin phép**"*. Hai câu đó **không** ngược nhau, và đây
là câu ràng buộc chính người giữ quyền:

> **"Có kiểm duyệt" = kiểm **lời khai** theo tiêu chí khách quan công khai. Nó **không** phải quyền
> từ chối tuỳ ý. Hồ sơ khai đúng và không rơi vào tập từ chối dưới đây thì quyền đăng ký **buộc phải
> ký** — đúng chữ của whitepaper: *"đủ điều kiện là vào"*.**

### Tập từ chối — **đóng**, chỉ có ba

Nguồn máy đọc: `Registrations/codes.json` mục `tu_choi`.

| Mã | Căn cứ |
|---|---|
| **R1** | `platform_id` trùng hoặc gây nhầm lẫn với một entry đã niêm yết |
| **R2** | không có ai chịu trách nhiệm liên hệ được |
| **R3** | **khai không đúng sự thật** — khác hẳn với khai chưa xong |

Không có căn cứ nào ngoài ba mục này. Cụ thể, **không** phải căn cứ từ chối:

- khai "chưa đạt" ở bất kỳ trục nào trong 2.1 / 2.3 / 2.4, kèm mốc dự kiến hoặc kèm câu "chặn bởi
  một quyết định chưa chốt" — hồ sơ vào trạng thái *đã tiếp nhận*, khác hẳn *bị từ chối*;
- **cạnh tranh trực tiếp** với một thành phần sẵn có trong hệ (whitepaper §10);
- dịch vụ đang sập, endpoint 502, hoặc chưa có URL công khai.

### Thời hạn, và im lặng là gì

Người giữ quyền chỉ cần **không bao giờ ký** là chặn được vô thời hạn mà không để lại một quyết định
nào để đem ra soi. Nên:

- Hồ sơ nộp ở bước (0) phải được trả lời trong **14 ngày**: hoặc *đã tiếp nhận* (kèm hạng tính ra),
  hoặc *bị từ chối* (kèm **mã** R1/R2/R3 và câu giải thích cụ thể).
- **Quá hạn mà không có trả lời nào thì coi là *đã tiếp nhận***, và bên nộp được ghi vào nhật ký rà
  soát của hồ sơ rằng nó tiếp nhận theo hạn, không theo chữ ký.
- Im lặng **không** thay được chữ ký ở bước (2) — mint beacon vẫn cần chữ ký thật. Điều khoản này
  chặn im lặng ở cổng tiếp nhận, không tạo ra một đường vòng lên chuỗi.
- Từ chối theo **R3** phải nêu **dòng khai nào** sai và **bằng chứng nào** cho thấy nó sai. Từ chối
  không nêu được hai thứ đó thì không phải một quyết định R3.

## 6. Sau khi được niêm yết

- **Sáu trường định danh là bất biến**: `platform_id`, `instance_id`, `custody_hash`, `seed_policy`,
  **`beacon_policy`**, `created_epoch`. Đổi bất kỳ trường nào = một platform khác, phải đăng ký mới.
- **Bốn trường còn lại đổi được**: `status`, `governance_ref`, `accepted_assets`, `cut_bps`.
- **Vòng đời một chiều**: `Active ⇄ Paused → Retired`. `Retired` là trạng thái cuối, không hồi sinh.
  Entry không bao giờ bị xoá — lịch sử luôn tra được.
- ⚠️ **Trạng thái là nhãn niêm yết, không phải van khoá tiền.** Đặt `Paused` hay `Retired` **không**
  dừng dòng thu/chi ở kho — kho vẫn vận hành qua cổng quản trị riêng của nó. Ai hiểu "Retired = quỹ
  đã đóng" là hiểu sai (`Specs/CONTRACT.md` bất biến PK10).
- **Bên định tuyến phí phải tự đối soát trước khi tin một entry**: kiểm trùng `platform_id` và đối
  chiếu entry với kho thật. Entry chỉ là con trỏ; kho mới là nguồn chân lý khi hai bên lệch.

### Ai được đổi gì — **gỡ khó hơn kết nạp**

Bản trước để **một chữ ký quyền đăng ký** làm được mọi thứ: ngừng hẳn một dịch vụ đang sống, đổi
cổng quản trị, đổi danh sách asset, đổi tỉ lệ cắt — không cần dịch vụ đó biết, và `Retired` thì không
hồi sinh. Whitepaper §8 bước 7 nói ngược lại điều đó, và nói bằng một nguyên tắc bất biến:

> *"chỉ chạm QUYỀN, không chạm TÀI SẢN… Kết nạp **dễ**, gỡ **khó** (ngưỡng cao hơn nhiều) — để không
> ai vũ-khí-hoá bước gỡ nhắm đối thủ."*

Nguyên tắc cắt của bản v2: **việc đảo ngược được thì một bên quyết; việc không đảo ngược được thì hai
bên cùng ký.**

| Đổi gì | Cần gì | Vì sao |
|---|---|---|
| `Active → Paused` (gỡ-mềm) | chữ ký quyền đăng ký — **đủ** | phải có van dừng nhanh cho một niêm yết đang gây hại; và nó **đảo ngược được** |
| `Paused → Active` | chữ ký quyền đăng ký **hoặc** đồng thuận quản trị của chính platform | để một lần tạm dừng đơn phương **không** biến thành gỡ vĩnh viễn trên thực tế |
| `→ Retired` (gỡ-cứng) | quyền đăng ký **và** đồng thuận quản trị của platform | không đảo ngược được — ngưỡng phải cao hơn kết nạp |
| `governance_ref`, `accepted_assets`, `cut_bps` | quyền đăng ký **và** đồng thuận quản trị | đây là mô tả về kho của chính platform; sổ không được nói khác chủ |
| di trú sang bản registry mới | quyền đăng ký **và** đồng thuận quản trị | di trú là đưa hồ sơ ra khỏi quyền tài phán của validator hiện tại |

**Đồng thuận quản trị** thể hiện on-chain bằng một trong hai cách, nhận cả hai để không ép platform
theo đúng một kiểu tích hợp: giao dịch **chi tiêu một input** ở `Script(governance_ref)`, hoặc mang
một **withdrawal** từ `Script(governance_ref)`.

**Đường di trú.** Bản v1 không có: datum không có trường phiên bản, redeemer không có nhánh di trú,
và validator ép output nằm ở chính script hash cũ — nên hồ sơ đã `Retired` sẽ **kẹt vĩnh viễn** khi
xoay quyền đăng ký, phá thẳng cam kết "beacon sống suốt đời, dấu vết kiểm toán không đứt". Bản v2 có
`spec_version` trong datum và nhánh `MigrateEntry`, và nhánh đó **cố ý không** áp ràng buộc trạng thái
cuối — hồ sơ `Retired` phải di trú được. Nhánh này không đổi được `status`; nếu đổi được thì nó thành
một đường `Retire` trá hình.

**Giới hạn còn lại, nói ra thay vì giấu:** quyền đăng ký vẫn có thể `Paused` lặp đi lặp lại ngay sau
mỗi lần platform tự `Active` trở lại. Việc đó **hiện trên chuỗi** nên nó là một thất bại quản trị
thấy được, không phải một cửa im lặng — nhưng nó chưa bị chặn bằng mã. Đường đóng là chuyển quyền
đăng ký sang nhiều chữ ký (§7).

## 7. Điểm chưa chốt

Ghi ra để bên đăng ký biết mình đang tin vào cái gì.

| Điểm | Hiện trạng | Ảnh hưởng tới bên đăng ký |
|---|---|---|
| Quyền đăng ký | Đang là **một khoá đơn**, chưa phải multisig hay DAO | Một khoá rò là chiếm được tên. Phải chuyển thành nhiều chữ ký trước khi lên mainnet. Đây cũng là đường đóng nốt giới hạn "Pause lặp" ở §6. |
| **Hai thẩm quyền khác nhau** | "Quyền đăng ký" thực ra là hai: quyền gộp thay đổi vào repo này (bước 0) và khoá ký `registry_authority` on-chain (bước 2). Lộ trình nhiều chữ ký hiện chỉ nói tới cái thứ hai. | Cả hai đều phải siết trước mainnet. Một hồ sơ được gộp vào repo là bằng chứng xã hội "đã đăng ký vào hệ", dùng thuyết phục người dùng ngoài, dù chưa từng có beacon nào trên chuỗi. |
| Tính duy nhất `platform_id` | Bảo đảm bằng **kỷ luật ký**, không bằng mật mã | Bên định tuyến phí phải tự kiểm trùng, không được tin sổ một cách mù quáng. |
| Neo biên nhận thu phí | Chưa neo on-chain | Không được dùng số liệu thu phí tự khai để cấp uy tín hay quyền biểu quyết — xem hạng `EV-0` ở §3. |
| Tính duy nhất một-người-một-DID | `did:phoenix` mới ép ở **mức chuỗi DID**. **Mức người và cả mức thiết bị đều chưa ép** — dẫn chứng ở §2.1. Chủ dự án đã chốt "một người = một DID" là **yêu cầu cứng** (2026-08-06). PhoenixKey xác nhận (2026-08-07) thang `personhood_level` **có phân hạng** bốn bậc, giao diện là `personhood(did) → level` (**không** nhận nullifier làm đầu vào — tra tự do theo nullifier là một máy vét cạn 20 bit). Bậc đầu `did-chain`: **mã đã xong trên `main`, chưa deploy**; phát hành được ngay sau đợt redeploy PA-1, mốc chưa có ngày. Bậc `person-in-jurisdiction` cần ba việc **chưa có người nhận**. | Đừng dựng cơ chế chống Sybil dựa trên "hai DID phân biệt" — một máy ký chéo cho chính nó bằng script được. Rào kinh tế đỡ được **một phần**, không phải tất cả — đọc kỹ ranh giới này. Ràng buộc: phần thưởng phát ra mỗi epoch phải bị chặn trên bởi một phần **nhỏ hơn 1** của lượng MAGIC thực bị tiêu cùng epoch, phần dư về Treasury. Nó làm kẻ **tự tạo cầu giả** để farm luôn lỗ, kể cả khi tạo được vô hạn DID. Nhưng nó **im lặng** trước đường thứ hai: **không đốt gì cả, chỉ khai CUNG để lấy phần của lượng người khác đã đốt** — đường đó có lợi nhuận dương với mọi tỉ phần và mọi hệ số, và chỉ chặn được bằng biên nhận do bên **không hưởng lợi** ký, thách thức có phát hiện thật, và cổng DID cho node. Chứng minh và phản ví dụ: [`bench/DOI-CHIEU.md`](bench/DOI-CHIEU.md) §1. |
| **Xếp hạng khám phá** | Whitepaper §8 bước 3 hứa *"thứ hạng tính theo **số người thật độc lập đã dùng**"*. Mệnh đề đó **chưa hiện thực được** vì nó cần đúng tầng personhood ở dòng trên. | Đây là chỗ **tiền không thay được danh tính**: rào kinh tế làm kẻ farm lỗ tiền, nhưng không làm thứ hạng đúng. Một bên chịu lỗ vẫn mua được thứ hạng. Mọi thứ hạng công bố trước khi có personhood đều theo một trục khác với trục đã hứa. |
| R-BIND kiểm được gì | R-BIND chỉ kiểm entry **tự nhất quán**: `seed_policy`, `instance_id`, `custody_hash` đều lấy từ chính hồ sơ khai. Kiểm bằng thực thi 2026-08-04: một kho tự dựng hoàn toàn vẫn qua được. | Cổng thật lúc đăng ký là chữ ký authority, không phải R-BIND. Bên định tuyến phí **bắt buộc** tự đối soát kho. |
| Van đối soát off-chain | Ba hàm mà `Specs/Feat-Spec.md` giao trọng lượng an toàn cho — đối soát hồ sơ với kho thật, quét sổ theo policy, tìm định danh trùng — xem `Specs/DevStatus.md` để biết trạng thái đo được tại thời điểm đọc. | Đừng coi ba lỗ ở trên là "đã có van chặn" cho tới khi `DevStatus.md` nói ngược lại kèm lệnh kiểm. |

Lộ trình đóng các điểm này: `Specs/Tech-Spec.md` mục known-gap và `Specs/Exec-Spec.md` §6.
