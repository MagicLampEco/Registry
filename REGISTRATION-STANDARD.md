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

## 2. Điều kiện — một cổng cứng, ba lời khai có phân hạng, một ô tuỳ chọn

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
| **2.5** | Chủ sở hữu đứng sau hồ sơ | **tuỳ chọn** — không khai vẫn hợp lệ; chỉ đổi hạng `L3` |

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

**Năm mã của trục này.** Hạng ở cột giữa là thứ bảng niêm yết §3 so ngưỡng — `L2` đòi
`identity ≥ 2`, `L3` đòi `≥ 3`. Nguồn máy đọc: `Registrations/codes.json` → `axes.identity.codes`.

| Mã | Hạng | Nghĩa | Con trỏ bắt buộc |
|---|---|---|---|
| `ID-0` | 0 | chưa nối danh tính hệ | `moc_du_kien` — mốc dự kiến nối |
| `ID-1` | 1 | dùng PhoenixKey DID, **nhưng dịch vụ còn giữ khoá riêng của người dùng** | `con_tro` + `moc_du_kien` |
| `ID-2` | 2 | dùng PhoenixKey DID, **khoá riêng nằm ở thiết bị người dùng** | `con_tro` |
| `ID-3` | 3 | như `ID-2`, **và** dịch vụ đọc `personhood_level` khi cấp uy tín hoặc quyền biểu quyết | `con_tro` |
| `ID-A` | *lấy theo hệ kia* | dùng một hệ danh tính khác **đã đăng ký** trong hệ | `platform_id_he_danh_tinh` |

Đường lên đọc từ dưới lên: `ID-0` → `ID-1` là nối được DID; `ID-1` → `ID-2` là **thôi giữ hộ khoá**,
chuyển khoá riêng về thiết bị người dùng — đây là bậc nhảy đắt nhất và là bậc duy nhất mở được `L2`;
`ID-2` → `ID-3` là dùng `personhood_level` ở chỗ cấp uy tín/biểu quyết. ⚠ `ID-3` **không** làm cho
`personhood_level` đáng tin hơn: nó vẫn là cờ nhị phân bị gán cứng `true` ở một chỗ đo được
(`Specs/Resource-Dictionary.md` §5). `ID-3` chỉ khai rằng dịch vụ có ĐỌC nó, không khai rằng nó đúng.

`ID-A` là mã có hạng **rỗng cho tới khi tra được**: hạng lấy theo hạng của hệ danh tính được trỏ tới,
nên trỏ vào một `platform_id` chưa đăng ký thì trục này không có hạng, và hồ sơ trượt mọi ngưỡng
`L1`–`L3` — trượt vì *chưa tra được*, không phải vì *bị chấm thấp*.

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

**Đây là trục duy nhất chặn *tiếp nhận*** — và hai chuyện hay bị nhập làm một ở đây, nên tách rõ.
Mã `TK-X` — có token riêng chưa qua cổng phát hành — là căn cứ từ chối: hồ sơ khai `TK-X` không đạt
nổi `L0`. Không phải vì cạnh tranh: vì nó phá đúng hệ token dùng chung mà mọi bên khác đang dựa vào.

Ba trục còn lại **không** chặn tiếp nhận, nhưng chúng có **ngưỡng**: `L1` — nhãn "đã niêm yết" — đòi
`identity` ≥ 1, `custody` ≥ 2, `infra` ≥ 1 (bảng hạng ở §3). Nên câu "chỉ trục `token` chặn niêm yết"
là câu sai; câu đúng là chỉ trục `token` chặn **tiếp nhận**, còn niêm yết thì cả bốn trục đều có
tiếng nói — và ở riêng `L3` thì trục tuỳ chọn `ownership` (§2.5) cũng có. Nguồn máy đọc: `Registrations/codes.json` mục `axes.token._gate_doc` và `listing_tiers`.

**Bốn mã của trục này.** Nguồn máy đọc: `Registrations/codes.json` → `axes.token.codes`.

| Mã | Hạng | Nghĩa | Con trỏ bắt buộc |
|---|---|---|---|
| `TK-0` | 0 | chưa nối hệ token | `moc_du_kien` |
| `TK-1` | 1 | tiêu MAGIC, dùng CARP, **không đốt LAMP**, **không mở đường đổi MAGIC ngược ra tài sản ngoài hệ** | `con_tro` |
| `TK-2` | 2 | như `TK-1`, **và** có token riêng đã qua đúng cổng (Mint-Authority Registry, hoặc điều kiện CARP instance) | `con_tro` + `con_tro_cong_phat_hanh` |
| `TK-X` | **−1** | có token riêng **CHƯA** qua cổng phát hành | `con_tro` |

Hai chỗ dễ đọc nhầm ở bảng này:

- **`TK-2` cao hơn `TK-1`, `TK-X` thì âm** — và khác nhau giữa hai cái *không* nằm ở chỗ có token
  riêng hay không, mà nằm ở chỗ **đã qua cổng phát hành hay chưa**. Cùng một dịch vụ, cùng một token,
  chỉ khác cái con trỏ `con_tro_cong_phat_hanh`: có thì `TK-2`, chưa có thì `TK-X` và bị từ chối.
  Đường thoát khỏi `TK-X` vì vậy luôn tồn tại và luôn là cùng một việc — đi đăng ký ở đúng sổ.
- **`TK-0` không phải căn cứ từ chối.** Chưa nối hệ token là khai đúng một thực trạng; hồ sơ vẫn
  được tiếp nhận ở `L0`. Chỉ `TK-X` mới chặn, và chặn vì nó phá hệ token dùng chung — không vì nó
  cạnh tranh.

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

#### Muốn NHẬN THƯỞNG từ hệ thì phải ở hạng CÓ KHO

Điều khoản này thay cho một trường `payee_did` đã được cân rồi bác (`Specs/Math-Spec.md` §D8).

**Dịch vụ muốn nhận phần thưởng nào do hệ chi trả phải khai `CU-1`** — tức có Treasury custody
instance on-chain. Hạng `CU-0` (kế toán trong cơ sở dữ liệu riêng) và `CU-N` (không thu asset) vẫn
niêm yết được bình thường, vẫn dùng hệ token bình thường; chúng chỉ không có đích nhận thưởng mà hệ
trả tới được.

Vì sao là một dòng luật chứ không phải một trường trong hồ sơ:

- Đích trả tiền **đã nằm trên chuỗi rồi** — `custody_hash` + `instance_id` + `seed_policy` — và chi
  tiêu chỗ đó đã bị `governance_ref` của chính dịch vụ gác. Thêm một trường DID không khép được
  vòng: DID không phải payment credential, vẫn phải phân giải sang địa chỉ ở ngoài chuỗi, tức thêm
  một chặng phải tin mà chưa ai nhận giữ.
- Cửa sổ thêm trường vào hồ sơ **đóng ở lần deploy đầu và đóng theo cả hai chiều** — thừa một trường
  cũng vĩnh viễn y như thiếu. Một dòng luật thì sửa được sau deploy, hồi tố cho mọi hồ sơ, và tốn 0
  giao dịch.
- Người nhận thưởng khi ấy được gác bằng cổng quản trị của chính họ, chặt hơn một chuỗi ký tự nằm
  trong datum mà một chữ ký quyền đăng ký sửa được.

⚠ Giới hạn phải nói ra: điều khoản này là **luật văn bản**, người duyệt áp — không có ràng buộc mã
nào ép. Máy đọc được hạng `custody` trong hồ sơ, nhưng máy không biết một khoản chi ở nơi khác có
phải "phần thưởng của hệ" hay không.

#### Bốn tính chất bắt buộc của `governance_ref` — đọc trước khi chọn script

Đây là ô dễ khai sai nhất, và khai sai thì hậu quả **không đảo ngược được**. Nguồn máy đọc:
`Registrations/codes.json` mục `governance_ref_yeu_cau`.

| | Yêu cầu | Vi phạm thì sao |
|---|---|---|
| **G1** | Phải là một script hash **28 byte**, và phải là script **chạy được**. Giao dịch đăng ký buộc phải chứng minh — chi tiêu một input ở `Script(governance_ref)`, hoặc mang một withdrawal từ đó. | Khai một hash chết thì đăng ký xong là **không bao giờ** Retire, đổi tham số hay di trú được nữa. Đổi chính `governance_ref` cũng cần đồng thuận từ chính nó. Độ dài 28 byte bị ép cứng ở ĐÚNG MỘT chỗ — `mutable_fields_valid` (`onchain/lib/magiclamp/registry/platform.ak:242`), và nó phủ cả ba cổng vì `entry_well_formed` (`:209`, lúc đăng ký) GỌI nó ở dòng cuối thân hàm, còn hai nhánh spend gọi thẳng nó. Hằng `script_hash_len` ở `:53`. Sai độ dài thì giao dịch đăng ký hỏng ngay tại cổng. |
| **G2** | **Không** được là hash của chính validator registry. | Cổng đồng thuận tự thoả vĩnh viễn ⇒ quyền đăng ký một mình xoá được hồ sơ. Validator chặn ở cả bốn chỗ: cửa đúc, datum vào, datum ra, đích di trú. |
| **G3** | **Không** nên có nhánh permissionless (thu bụi, huỷ đề xuất hết hạn). | Registry chỉ ép được *"script đó **chạy** trong giao dịch"*, **không** ép được *"script đó **phê duyệt đúng** thay đổi này"*. Nhánh nào ai cũng kích được là nhánh chế ra đồng thuận. **Đây là giả định load-bearing: an toàn của cổng đồng thuận bằng đúng an toàn của script mà chính bên đăng ký khai.** |
| **G4** | Nếu nhánh đồng thuận cần **mint/burn** token — mẫu phổ thông là đốt NFT đề xuất khi thực thi — thì nó xung đột với ràng buộc least-authority của cổng đúc: giao dịch đăng ký không được gánh policy mint ngoài. | Hồ sơ **không đăng ký được**. Hai đường vòng hợp lệ: dùng **withdrawal-0**, hoặc một **nhánh spend không mint**. |

**Đổi `governance_ref` là bàn giao hai chiều**: cần đồng thuận của **cả** cổng cũ **lẫn** cổng mới,
ở cả thao tác cập nhật lẫn di trú. Một chiều thôi là mở lại đúng ca G1 — bàn giao sang một cổng
chết.

### 2.4 Không phụ thuộc hạ tầng đóng ngoài hệ · trục `infra`

Chức năng cốt lõi đặt trên một dịch vụ bên thứ ba mà hệ không kiểm soát và người dùng không thoát
ra được là một rủi ro thật — nhưng **whitepaper không có điều kiện này**, nên chuẩn này không được
biến nó thành cổng đóng. Nó là lời khai bốn bậc `IN-0`…`IN-3`.

Dùng kênh ngoài để **tiếp cận** người dùng thì bình thường. Đặt **danh tính, thanh toán hay dữ liệu
gốc** ở đó thì hạ hạng. Và một dạng phụ thuộc dễ bỏ sót: kho ứng dụng có thể nắm **quyền phủ quyết**
đúng chức năng cốt lõi — không phải chỉ chậm phát hành mà là gỡ hẳn.

### 2.5 Chủ sở hữu đứng sau hồ sơ · trục `ownership` — **tuỳ chọn, KHÔNG phải điều kiện**

Đọc kỹ dòng này trước đã: **không khai ô này thì hồ sơ vẫn hợp lệ, vẫn được tiếp nhận, vẫn niêm yết
được.** Whitepaper §10 đóng tập điều kiện vào ở **ba** — tiêu MAGIC · dùng CARP · đăng ký — nên
chuẩn này không có quyền thêm điều kiện thứ tư. Trục `ownership` đổi được đúng một thứ: **hạng niêm
yết**, và chỉ ở `L3`.

Vì sao có trục này: mọi trần dạng *"mỗi bên tối đa X%"* trong hệ áp trên `platform_id`, tức đếm
**hồ sơ** chứ không đếm **người**. Sổ này là chỗ duy nhất biết có bao nhiêu định danh tồn tại. Nếu
nó im lặng thì không nơi nào trong hệ thấy được một chủ đang đứng sau mấy hồ sơ — và cái trần trông
như đang bảo vệ, mà không (§7).

| Mã | Nghĩa | Đòi |
|---|---|---|
| `OW-0` | chưa khai chủ sở hữu | — |
| `OW-1` | đã khai chủ sở hữu — **lời khai của chính bên nộp** | `pointers.chu_so_huu` |
| `OW-2` | như `OW-1`, và có một bên **không hưởng lợi** ký vào chính lời khai đó | thêm `pointers.chung_nhan_chu_so_huu` |

Ba điều phải nói rõ để không ai đọc rộng hơn:

- **Trục này không nằm trong `declares`.** Bộ chấm suy hạng từ ô đã điền: điền `chu_so_huu` là
  `OW-1`, điền thêm chứng nhận là `OW-2`. Khai tay trong `declares` vẫn được, và khai một mã
  **thấp hơn** dữ kiện đang có cũng được — bộ chấm giữ nguyên lời khai và **nêu ra** rằng hồ sơ
  đang tự bỏ một hạng, để một lần gõ nhầm không lặng lẽ thành mất hạng.
- **`OW-2` KHÔNG phải "máy đã xác minh chủ sở hữu".** Máy chỉ kiểm con trỏ chứng nhận có **tra lại
  được** hay không — có chạm tới một thứ ngoài hồ sơ (địa chỉ liên hệ, một trang, hay một giao
  dịch). Ai ký, ký cái gì, có thật không hưởng lợi không — **người đối chiếu đọc và quyết**.
- **Khai sai sự thật ở ô này là `R3`**, như mọi lời khai khác. Và như mọi `R3`, từ chối phải nêu
  dòng khai nào sai kèm bằng chứng (§5).

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

**(c) Tham số kỹ thuật** — danh sách bắt buộc **khác nhau theo mã kho**, không phải "chỉ khi `CU-1`":

- `CU-1` (có kho on-chain) đòi bảy ô: `instance_id`, `custody_hash`, `seed_policy`, `governance_ref`,
  `governance_ref_tinh_chat`, `accepted_assets`, `cut_bps`.
- `CU-N` (không thu asset ở tầng này) đòi ba ô: `governance_ref`, `governance_ref_tinh_chat`,
  `thu_o_dau`. Kho trống nhưng cổng đồng thuận thì không được trống — lý do ở §2.3.
- `CU-0` (còn ở sổ nội bộ) đòi `moc_du_kien`.

Nguồn máy đọc: `Registrations/codes.json` mục `axes.custody`.

**(d) Lời khẳng định và hạng chứng thực** — liệt kê **mọi** con số dịch vụ khai ra rồi tính tiền
hoặc xin uy tín dựa trên nó, mỗi dòng một hạng `EV-0` / `EV-1` / `EV-2`. Một dịch vụ khai nhiều
hạng cho nhiều chặng là bình thường.

**(e) Cam kết vận hành** — ai giữ quyền quản trị kho, xử lý khi khoá lộ, cách thông báo khi dừng,
ai tiếp nhận nếu đội ngừng duy trì.

**Con trỏ bắt buộc là con trỏ *on-chain*, không phải URL.** Bốn trường ở (c) đều tra được bằng
explorer. Một endpoint web là **tuỳ chọn** và việc nó đang sập **không** ảnh hưởng hồ sơ — cổng đăng
ký kiểm kho on-chain có thật không, không kiểm dịch vụ có sống không.

### Con trỏ vào mã nguồn phải mang **ba** thứ, không phải một

Ô "con trỏ kiểm được" ở (b) và (d) trước đây chỉ đòi `file:line`. Không đủ: cùng một `file:line`
trên một **nhánh chưa gộp** và trên `main` là hai mức bảo đảm khác hẳn — người ngoài chạy được
`main`, không chạy được nhánh của đội khác. Ca thật: AladinWork trích `Core/consume-magic.js` làm
chứng cứ, tệp đó **không có trên `main`**, chỉ có trên một nhánh chưa gộp (đội tự đính chính,
thư 2026-08-13).

> **Mọi con trỏ chứng cứ phải mang ba thứ: `file:line`, **tên nhánh**, và **SHA đã gộp vào `main`**
> — hoặc chữ **`CHƯA GỘP`** kèm tên nhánh. Chứng cứ nằm **trên chuỗi** chứ không nằm trong mã thì
> một **tx hash 64 hex** thay được cả ba, vì nó tự tra được bằng explorer.**

**Thiếu một trong ba thì trục đó MẤT hạng, không phải "chấm ở hạng thấp hơn".** Bản trước hứa nhẹ
hơn thứ máy làm. `tools/check-registration-core.mjs` đặt `ranks[<trục>] = null` cho trục đó — trục
**không còn hạng nào**, nên nó trượt **mọi** ngưỡng có nhắc tới nó. Đo thật: một hồ sơ đang `L3` mà
khuyết SHA ở đúng **một** ô con trỏ rơi thẳng xuống `L0`, vì `L0` là hạng duy nhất không đọc hạng
trục nào (nó chỉ đòi `token` khác `TK-X`). Một ô khuyết đánh sập ba bậc — nói ra vì hậu quả nặng hơn
hẳn "hạng thấp hơn". Nó vẫn là **hạ hạng chứ không phải từ chối**: máy in dòng này ở cột cảnh báo,
không phải cột lỗi, và §5 không có căn cứ từ chối nào cho việc này.

#### Bằng chứng PHỦ ĐỊNH — một đường KHÔNG đi được thì không có tx hash để trỏ

Luật ba-thứ và ngoại lệ tx hash ở trên cùng giả định một điều chưa nói ra: rằng bằng chứng là dấu
vết của một việc **đã xảy ra**. Loại bằng chứng đáng giá nhất trong một hệ giữ tiền lại là loại
ngược lại — *chứng minh rằng một đường KHÔNG đi được*: hoàn tiền khi hạn còn, rút quỹ mà không có
đồng thuận, đúc trùng một beacon. Một giao dịch không hợp lệ **không lên chuỗi**, nên nó **không
sinh tx hash nào** và không hiện trên explorer. Ca nêu ra bởi AladinWork (thư 2026-08-19 §3), từ ba
hợp đồng chạy thật trên Preprod.

Hệ quả nếu để nguyên: một hồ sơ chỉ liệt kê được những đường **đi được**. Chuẩn vô tình thưởng cho
lời khoe và bỏ rơi lời bảo đảm — trong khi *"cổng này chặn được X"* mới là câu người gửi tiền cần.

> **Bằng chứng phủ định dùng khuôn RIÊNG, ba thứ khác:** (1) **lệnh chạy lại được** — đủ để người
> thứ ba tự dựng lại giao dịch đó; (2) **thông điệp từ chối nguyên văn** mà validator hoặc node trả
> về; (3) **con trỏ ba-thứ tới chính bài kiểm** khoá hành vi ấy (`file:line` + nhánh + SHA), **và
> bài kiểm ấy phải đi qua đúng người gọi mà thực địa dùng** — hoặc kèm một bài riêng chứng minh
> người gọi thật có gọi tới nó. Ô này **không** đòi tx hash, và thiếu tx hash ở đây **không** hạ
> hạng.

Vế cuối của ô (3) thêm vào 2026-08-27 theo đề nghị của AladinWork, sau khi chính khuôn này bắt được
hai lỗ ở nhà họ trong một lượt soi. Không có vế đó thì *"có bài kiểm"* và *"có cổng"* là hai chuyện
khác nhau mà ô này không phân biệt được: tách một cổng thành hàm thuần rồi quên nối lại là cách phổ
biến nhất để bài kiểm xanh trong khi đường chạy thật không đi qua cổng.

**Vì sao ô (3) là ô đắt nhất trong ba ô, và đừng cắt nó cho gọn.** Hai ô đầu ghi lại một lần chạy
**đã xong** — ca nào cũng qua. Ô (3) hỏi một câu về **tương lai**: *cái đường bị chặn ấy có gì giữ
cho nó tiếp tục bị chặn không?* Ca đầu tiên đem soi bằng ô này (AladinWork, ba hợp đồng Preprod) lộ
ra rằng cổng chặn "rút tiền trước hạn" **không có bài kiểm nào** — và việc ngồi viết bài kiểm đó
mới tìm ra lỗ thứ hai: một trường hạn vắng mặt bị đọc thành *"hạn = mốc 0"* nên luôn quá hạn, tức
đúng đường mà cổng dựng ra để chặn lại mở bằng một ô trống. Cả hai lỗ nằm nguyên tại chỗ nếu chuẩn
chỉ đòi hai ô đầu, và hồ sơ vẫn trông đầy đủ.

Ba thứ đó phục vụ đúng việc mà tx hash làm cho bằng chứng khẳng định: cho người thứ ba dựng lại kết
quả mà không phải tin lời ai. Khác biệt là kết quả dựng lại được nằm ở **máy của họ**, không nằm
trên chuỗi — nên nó vẫn kiểm được, chỉ là kiểm bằng cách khác.

#### Cách ĐO cái biên đó: phép đột biến — gỡ cổng ra rồi đếm ca đỏ

Ô (3) đòi một bài kiểm khoá hành vi. Nhưng *"bài kiểm ấy xanh"* là lời khai về **trạng thái**, không
phải về **mức phủ** — và người đọc tự điền mức phủ rộng nhất. Đây đúng là lớp lỗi §13.1.1 của
`Specs/Math-Spec.md` gọi tên ở ví dụ thứ năm: đúng về cơ chế, sai về độ phủ.

Có một phép đo trực tiếp cho nó, PhoenixKey đề và đã chạy thật (thư 2026-08-30): **gỡ đúng cái cổng
vừa thêm ra khỏi mã, chạy lại bộ kiểm, đếm bao nhiêu ca ĐỎ, rồi khôi phục.** Số ca đỏ là số đo về mức
phủ. Cổng gỡ đi mà **không ca nào đỏ** nghĩa là bộ kiểm không canh gì ở chỗ đó — dù nó vẫn xanh toàn bộ.

Đọc kết quả theo đúng chiều, vì chiều này ngược trực giác: **dòng đỏ ÍT mới là dòng đáng lo.** Một
cổng gỡ ra chỉ làm `1/15` ca đỏ nghĩa là đúng một bài kiểm canh nó — ca đó hỏng hoặc bị sửa thì cổng
thành vô hình mà không ai biết. Dòng `6/10` thì cổng có nhiều lớp canh.

Và một cạm khi đọc con số: một ca **còn xanh** sau khi gỡ cổng không phải lúc nào cũng là thiếu sót —
nó có thể đang canh **chiều ngược** (đường phải tiếp tục ĐƯỢC phép đi). Nên số đột biến phải kèm một
dòng nói ca còn xanh canh cái gì, nếu không `3/4` bị đọc thành "thiếu một ca".

**Áp vào chuẩn này:** hồ sơ khai `EV-1`/`EV-2` bằng cách trỏ tới một bài kiểm thì **được** khuyến khích
kèm số đột biến của bài kiểm đó. Không kèm thì lời khai vẫn hợp lệ, nhưng nó chỉ khai **trạng thái**,
và người duyệt không được đọc nó thành khai **mức phủ**. Đây là khuyến khích, KHÔNG phải điều kiện —
biến nó thành điều kiện là dựng một hàng rào mà phần lớn đội chưa có công cụ vượt qua, và hàng rào đó
sẽ bị lách bằng những con số không ai kiểm.

#### Dạng thứ ba: con trỏ tới sự **VẮNG MẶT** — và nó đã tồn tại trước khi chuẩn đặt tên

Đem ba ô ở trên soi lại `Registrations/lampnet.md` — hồ sơ duy nhất đã tiếp nhận — thì không thấy
bằng chứng phủ định nào, đúng như dự đoán. Nhưng thấy một thứ khác: **cả tám** lời khẳng định `EV-0`
của hồ sơ ấy dùng chung một khuôn con trỏ mà chuẩn này chưa có tên cho nó. Ba ví dụ nguyên văn:

```
"không có PoR trong mã: git grep -ic retrievability @5c0da03 → 0"
"TaskReceipt ký bằng hạt giống demo CỨNG trong mã, giống nhau trên mọi node — lampnet-node.rs:7673-7674"
"node tự benchmark rồi tự đưa số vào khối chứng thực của CHÍNH NÓ — attestation.rs:70"
```

Chúng không trỏ tới một việc đã xảy ra (bằng chứng khẳng định), cũng không trỏ tới một cổng chặn
được điều gì (bằng chứng phủ định). Chúng trỏ tới **chỗ không có gì cả** — và đó chính xác là thứ
`EV-0` cần nói: *"con số này tôi khai được, nhưng đây là chỗ nó không được chứng minh."*

Ba dạng, phân biệt bằng câu hỏi chúng trả lời:

| Dạng | Trả lời câu | Hình con trỏ |
|---|---|---|
| khẳng định | *việc này đã xảy ra?* | `file:line` + nhánh + SHA, hoặc tx hash |
| phủ định | *đường này có bị chặn không?* | lệnh chạy lại được + thông điệp từ chối + bài kiểm trên đường thật |
| **vắng mặt** | *chỗ nào KHÔNG có gì giữ?* | **lệnh tìm + kết quả rỗng**, hoặc `file:line` trỏ đúng dòng làm nó vô hiệu |

Dạng thứ ba **không hạ hạng thêm** — `EV-0` đã là sàn, và một con trỏ vắng mặt tốt làm hồ sơ *đáng
tin hơn* hồ sơ để trống ô đó, dù hạng như nhau. Ghi ra vì hai lý do: nó đã được một đội tự nghĩ ra
và dùng nhất quán tám lần trước khi chuẩn nói gì; và vì không có tên thì đội sau sẽ tưởng `EV-0`
nghĩa là *"khỏi cần con trỏ"* — trong khi ca này cho thấy `EV-0` có con trỏ tốt là chuyện làm được.

⚠ **Bộ chấm hôm nay chưa đọc ô này** — chưa có trường json cho nó, nên nó là ô cho **người duyệt**,
đúng như luật ba-thứ đang là. Ghi ra ở đây trước khi có ô, vì thứ tự đúng là *định nghĩa trước, ô
sau, phép kiểm sau nữa* — ngược lại thì ô sinh ra rồi mỗi đội hiểu một kiểu.

Kiểm bằng hai lệnh — **việc của người duyệt**, xem lời tự thú ở mục dưới:

```bash
git branch --contains <sha>          # nhánh nào chứa commit đó
git cat-file -e main:<đường dẫn>     # tệp có tồn tại trên main không
```

Đây không phải nghi ngờ thiện chí: một chứng cứ chỉ sống trên nhánh riêng thì bên thứ ba không tái
lập được, nên nó chưa phải chứng cứ — nó là một lời hứa có địa chỉ.

### Bốn hạng niêm yết — bảng chép cho người đọc

⚠ `L3` là hạng **duy nhất** đòi trục tuỳ chọn `ownership`, và chỉ vì `L3` là hạng cấp **uy tín và
quyền biểu quyết** — hai thứ mà một chủ chẻ hồ sơ nhân lên được. `L0`–`L2` không đòi, nên niêm yết
bình thường không cần khai chủ. Đo ngày đặt luật này: **không hồ sơ nào trong `Registrations/` bị
tụt hạng** vì nó (`node tools/check-registration.mjs` — cả bốn hồ sơ đang ở `L0`).

Chuẩn này dùng `L0`–`L3` ở nhiều chỗ mà chưa nói ở đâu chúng là gì, nên người đọc chuẩn không tra
được hạng của mình đòi gì. Bảng dưới chép điều kiện từ `Registrations/codes.json` mục
`listing_tiers`. **Nguồn duy nhất máy đọc vẫn là `codes.json`** — bảng này là bản chép cho người
đọc; hai bên lệch nhau thì `codes.json` đúng.

| Hạng | Nhãn | Điều kiện |
|---|---|---|
| `L0` | đã tiếp nhận — **chưa** đủ điều kiện niêm yết | trục `token` đã khai và không phải `TK-X`. Mọi hồ sơ khai đúng sự thật đều đạt, kể cả khi mọi trục đều ở mã 0 — nhưng **bỏ trống** trục `token` thì không đạt, vì không khai gì không phải là "không phải `TK-X`". |
| `L1` | đã niêm yết | `token` ≥ 1 · `identity` ≥ 1 · `custody` ≥ 2 · `infra` ≥ 1 |
| `L2` | niêm yết đủ điều kiện | `token` ≥ 1 · `identity` ≥ 2 · `custody` ≥ 2 · `infra` ≥ 2 |
| `L3` | đủ điều kiện cấp uy tín và quyền biểu quyết ở tầng hệ | như `L2`, thêm `identity` ≥ 3, `ownership` ≥ 1 (§2.5) và `evidence_min` ≥ 1 — tức **mọi** lời khẳng định đều từ `EV-1` trở lên, **và** hồ sơ phải có ít nhất một lời khẳng định. Không khai dòng nào thì không đạt, dù đọc theo chữ thì "không dòng nào còn ở `EV-0`" là đúng. |

Hai chỗ dễ đọc nhầm con số:

- **Ngưỡng là *hạng* của mã, không phải chữ số cuối trong tên mã.** `custody ≥ 2` nghĩa là `CU-1`
  **hoặc** `CU-N` — cả hai đều hạng 2, vì không thu tiền không phải là thiếu sót; `CU-0` không đạt.
  Nên từ `L1` trở lên đòi hoặc có kho on-chain, hoặc khai rõ là không thu asset.
- **Một trục không có hạng thì trượt mọi ngưỡng nhắc tới trục đó** — đó là cách một ô con trỏ khuyết
  kéo cả hồ sơ về `L0`, xem mục trên.

### Con trỏ vào **kho riêng tư** — thoả hình thức mà không thoả lý do

Luật ba-thứ ở trên giả định người thứ ba **chạy được `main`**. Với một kho private thì không: con
trỏ có đủ `file:line` + nhánh + SHA, máy chấm không phân biệt được, mà người ngoài vẫn không mở
được. Nó thoả **hình thức** của luật và trượt đúng **lý do** viết ra luật.

Điều phải mua ở đây là **kiểm được độc lập**, không phải **mã nguồn mở**. Hai thứ đó hay bị nhập
làm một, và nhập vào là sai: mở mã là quyết định của chủ từng nhà, còn kiểm được là điều kiện của
chứng cứ. Nên chuẩn này **không** đòi ai mở kho. Nó phân biệt hai loại con trỏ:

| Loại | Ai kiểm lại được | Trần hạng |
|---|---|---|
| **Con trỏ công khai** | bất kỳ ai trong hệ | không bị trần bởi mục này |
| **Con trỏ riêng tư** | chỉ người được cấp quyền đọc | **trần `L1`** |

Trần `L1` không phải hình phạt, nó là phát biểu về khán giả. `L0` là *đã tiếp nhận, chưa niêm yết*;
**niêm yết bắt đầu từ `L1`**. Ở `L0`–`L1`, người phải kiểm là **bên duyệt** — bên đó có thể được cấp
quyền đọc. `L2`–`L3` cấp uy tín và **quyền biểu quyết ở tầng hệ**, khán giả là **mọi thành viên của
hệ, kể cả đối thủ**; ở đó
"một bên duyệt đã xem" không thay được "ai cũng xem lại được".

Kho riêng tư vẫn lên `L2`–`L3` được, bằng **hai** đường không đòi mở mã:

1. **Chứng cứ tái lập được thay cho quyền đọc mã** — lệnh chạy + hash đầu ra công bố, người khác
   chạy lại lệnh đó và so hash. Cái được kiểm là **hành vi**, không phải mã nguồn. **Điều kiện: bên
   duyệt phải tự chọn đầu vào để chạy lại.** Chạy đúng một lệnh trên đúng bộ đầu vào do chính bên
   được kiểm cung cấp chỉ chứng minh lệnh đó **tất định**, không chứng minh nó **làm đúng** — một
   cài đặt trả sẵn kết quả cho đúng bộ đầu vào ấy vẫn qua. Đầu vào do bên duyệt chọn thì không.
2. **`EV-2`** — neo on-chain, hoặc một bên **không hưởng lợi** ký vào chính lời khẳng định đó. Bên
   ký cần quyền đọc; người tra lại thì không.

Hai điều kiện phụ, ghi ra để không phải cãi từng ca:

> **Mọi câu "máy hiện chưa kiểm được X" dưới đây phải kèm MỘT LỆNH CHẠY ĐƯỢC cho ra câu trả lời
> hôm nay.** Đề nghị của nhà SuperApp, nhận nguyên, và lý do đắt hơn vẻ ngoài của nó: một câu
> "hiện chưa" hết đúng theo chiều **tốt lên** — bên kia bổ sung tính năng, câu thành sai, và
> **không gì đỏ**. Ca thật họ đo được: một khối cảnh báo có sẵn điều kiện gỡ viết rõ ràng
> (*"gỡ khi endpoint trả khác 404"*), điều kiện ấy **đã đạt**, và nó vẫn sống thêm **17 ngày** —
> vì thứ đọc điều kiện là con người và không có nhịp nào bắt ai đo lại. Ba trường (ai quyết · đo
> lần cuối khi nào · kho này không kiểm) không đủ; thiếu trường thứ tư thì câu không có đường tự
> hết hạn. Câu nào không viết nổi lệnh ấy thì đó là dấu hiệu nó **chưa đo được**, và phải nói thế
> thay vì nói "hiện chưa". Cột *Lệnh kiểm* của [`DevStatus.md`](./DevStatus.md) là đúng trường
> này, dựng độc lập ở nhà này trước khi nhận thư — hai chỗ hội tụ nên nó thành nếp, không phải
> một sáng kiến.

- **Từ chối cấp quyền đọc cho bên duyệt ⇒ con trỏ tính như KHÔNG CÓ**, không phải `R3`. Không mở
  kho là quyền của nhà đó, không phải lời khai sai — hệ quả là hạ hạng, không phải từ chối.
- **Máy chưa phân biệt được hai loại con trỏ.** `tools/check-registration-core.mjs` hôm nay chỉ soi
  cú pháp, nên một con trỏ riêng tư vẫn qua. Cho tới khi bộ chấm biết hỏi kho có công khai không,
  mục này do **người duyệt** áp — và chỗ đó phải ghi rõ, đừng để ai đọc bộ chấm xanh ra thành đã kiểm.
  **Đo lại bằng:** `command grep -nE '^import ' tools/check-registration-core.mjs`
  — chừng nào danh sách nhập chỉ có `node:fs`, `node:path`, `node:url` thì bộ chấm **không có
  đường nào** hỏi GitHub kho công khai hay không, nên câu này còn đúng. Thêm một dòng nhập khác
  là dấu hiệu phải đọc lại mục này.
- **`EV-2` không được xác minh trên chuỗi.** Máy chỉ hỏi con trỏ có chứa một chuỗi **64 ký tự hex**
  hay không (`tools/check-registration-core.mjs`, mẫu `CO_TX`). Nó **không** hỏi explorer xem giao
  dịch đó có thật không, và **không** đọc nội dung giao dịch. Một chuỗi `openssl rand -hex 32` bịa ra
  vẫn qua. Nên `EV-2` hôm nay là **lời khai có định dạng kiểm được**, chưa phải chứng cứ đã kiểm —
  người duyệt vẫn phải tự tra explorer, và phải xem giao dịch đó có nói đúng điều đang viện dẫn không.
  **Đo lại bằng:** `command grep -nE '\bfetch\(|node:(https?|net)|axios|undici' tools/check-registration-core.mjs`
  — rỗng = bộ chấm không có lời gọi mạng nào, tức câu này còn đúng. (Đừng dùng mẫu trần
  `https://`: nó khớp cả chú thích lẫn phép kiểm định dạng ô đầu mối, và trả 2 dòng cho một tệp
  **không** gọi mạng — một lệnh đo mà báo động giả thì tệ hơn không có lệnh nào.)
- **Luật ba-thứ cũng chỉ được kiểm ở mức định dạng.** Hai lệnh `git branch --contains` và
  `git cat-file -e` ở mục trên là việc của **người** duyệt: máy **không** chạy lệnh nào trong hai
  lệnh đó. Nó chỉ khớp biểu thức chính quy xem câu con trỏ có mang đủ ba mảnh không — `file:line`,
  chữ "nhánh"/"branch" kèm một tên, và một chuỗi 7–40 ký tự hex. Một SHA bịa đúng hình dạng vẫn qua.
  Máy trả lời được câu "con trỏ này có đủ hình không", không trả lời được câu "commit này có thật và
  có trên `main` không".
  **Đo lại bằng:** `command grep -nE 'node:child_process|execSync\(|spawnSync\(' tools/check-registration-core.mjs`
  — rỗng = bộ chấm không có đường chạy tiến trình con, nên nó không chạy được `git` gì cả. (Mẫu
  `git ` trần khớp hai dòng chú thích **nói rằng** nó không chạy git — đo trúng chữ, trượt việc.)

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

> **`EV-*` hỏi ai *ký*. Có một câu hỏi khác, hỏi ai *kiểm*.** Khi một biên nhận được dùng để **đòi
> tiền**, hạng `EV-*` không đủ để biết nó có tạo ra nghĩa vụ hay không — tiêu chí đó là `T-RECEIPT`,
> ở [`Specs/Math-Spec.md`](Specs/Math-Spec.md) §13. Hai thang đo hai thứ khác nhau, và **`T-RECEIPT`
> không nâng hạng `EV-*` của bất kỳ dòng khai nào** — đừng viện nó để xin hạng cao hơn trong hồ sơ.

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
| **R1** | `platform_id` **trùng khít** giữa hai lời **khai** trong `Registrations/`. Máy quét **toàn** thư mục, không chỉ các entry đã niêm yết, vì R1 là tính chất của **tập** hồ sơ chứ không của một hồ sơ. Chỉ mức này là căn cứ từ chối, và máy chặn được.<br>Hai mức nhẹ hơn **không** tự từ chối, máy chỉ **nêu** cho người duyệt quyết: (a) trùng khít với một tên **nháp** — tên lấy từ tên tệp, hồ sơ chưa có khối json nên chưa phải một lời khai; (b) chỉ **gây nhầm lẫn** sau chuẩn hoá đồng hình. Lý do không cho máy kết luận mức (b): "gây nhầm lẫn" là phán đoán về nhận thức người đọc, máy không kết luận thay được. Người duyệt quyết thì phải ghi lý do vào nhật ký rà soát của hồ sơ. |
| **R2** | **hồ sơ không khai đầu mối chịu trách nhiệm** — ô "Đầu mối liên hệ" ở mục (a) (`pointers.dau_moi_lien_he`) trống **và** mục (e) không nêu ai tiếp nhận nếu đội ngừng duy trì. Còn **một** trong hai thì vẫn có người chịu trách nhiệm ⇒ **chưa phải R2**. Căn cứ **về nội dung hồ sơ**, kiểm bằng đọc văn bản; **không** phải căn cứ "gửi thư mà không thấy trả lời". |
| **R3** | **khai không đúng sự thật** — khác hẳn với khai chưa xong |

#### Phép thử để biết một lời khai có **đủ mức** thành `R3`

`R3` là căn cứ nặng nhất và cũng mơ hồ nhất trong ba mã: "không đúng sự thật" nghe rõ tới khi phải
áp cho một câu cụ thể. Bản trước không có phép thử nào, nên nó lỏng mà trông chặt — mỗi người duyệt
áp một kiểu, và cái đó tệ hơn một tiêu chí tự nhận là lỏng.

Phép thử, mượn nguyên văn từ `Specs/Math-Spec.md` §13.1.1 (do PhoenixKey đề, nhà này lấy làm ràng
buộc chung cho **mọi trục khai báo** — bốn trục bắt buộc và cả ô tuỳ chọn ở §2.5, không riêng §13):

> Một lời khai sai chạm `R3` ⟺ tồn tại một bên thứ ba **hành xử khác đi** nếu biết nó sai.

Vì sao phép thử này chứ không phải "có nói về một khoản tiền không": câu hỏi cũ soi **hình dạng**
của lời khai, phép thử soi **hậu quả**. Ca cho thấy khác biệt, đo được và không có đồng nào trong
đó: *"cổng khử trùng danh tính đang hoạt động"* — không số tiền, không hoá đơn, nhưng ba nhà khác
đang cân phương án phân phối token dựa trên nó và cả ba sẽ chọn khác nếu biết nó sai. Câu hỏi cũ
cho ca này đi thẳng qua.

Hai hệ quả thực dụng của phép thử, cả hai đều **thu hẹp** `R3` chứ không mở rộng:

- Lời khai không ai hành xử theo — một khoá tra cứu, một mã nội bộ, một cái tên — sai vẫn **không**
  phải `R3`. Người duyệt sửa hoặc bỏ qua, không từ chối hồ sơ.
- Ngược lại, người duyệt viện `R3` phải chỉ ra được **bên thứ ba đó là ai** và **họ đổi hành xử ra
  sao**. Không chỉ ra được thì đó chưa phải quyết định `R3` — cộng thêm hai điều kiện ở §5 (nêu
  dòng khai nào sai, nêu bằng chứng nào cho thấy nó sai).

#### Một họ lời khai áp `R3` được ngay: "không lộ dữ liệu người dùng, vì có ZK"

Chỗ này viết ra vì nó là ca `R3` **dễ lọt nhất**: câu nghe như một sự kiện kỹ thuật, người duyệt
không có nền để bác, và bên khai thường tin nó thật.

> **Có ZK KHÔNG cho phép khai "không lộ dữ liệu người dùng".** Câu khai được là **"không lộ giá
> trị đã chứng minh"**. Mọi thứ ngoài giá trị đó — **có gọi hay không, gọi lúc nào, bao lâu, bao
> nhiêu lần, kích thước, và quan hệ giữa hai lần chứng minh của cùng một chủ thể** — không nằm
> trong bảo đảm của proof.

Câu này do nhà Glint cấp và tự nêu giới hạn của chính mình: *"ZK ≠ unlinkability; nhiều proof +
nullifier **có thể cùng lộ**"* (`VeDataIO/Specs/Glint-Math.md:384`, Định lý G.2), và chống-liên-kết
cần pseudorandomness + key-hiding chứ collision-resistance **không đủ**
(`VeDataIO/Specs/Glint-Math.md:198`).

⚠ **Hai neo trên vừa được sửa vì chúng đã TRÔI** (đo 2026-09-01). Bản trước ghi `:348` và `:162`;
`Glint-Math.md` được sửa ở kho khác và hai dòng ấy nay nói chuyện khác hẳn (`:348` nói về
`proof_system`, `:162` là §2.2 P2 Range proof). Không phép đo nào của kho này kêu lên — neo trỏ vào
một tệp ở kho khác thì không cổng nào ở đây gác được nó.

⚠ **Và tên tệp trần KHÔNG phân giải được: có HAI bản `Glint-Math.md`, đã lệch nhau** (đo
2026-09-02). `VeDataIO/Specs/Glint-Math.md` — 435 dòng, G.2 ở `:384`; `VeDataIO/Glint/Spec/Glint-Math.md`
— 447 dòng, G.2 ở `:395`. Cùng sửa một ngày, đã phân kỳ. Nên phải ghi ĐƯỜNG ĐẦY ĐỦ, không ghi tên
trần — và nếp "trích theo nội dung" ở dưới **cũng không cứu được** chỗ này: `grep` một câu sẽ trả
về hai kết quả ở hai tệp khác nhau, mỗi tệp một số dòng. Bản dùng ở đây là bản `Specs/`, vì đó là
bản nhà Glint tự dẫn khi trao đổi. Đã hỏi Glint xác nhận bản nào là bản thật.
**Đo lại bằng** (chạy khi trích lại, đừng nhớ mòn — chú ý đường đầy đủ):
```
command grep -n "ZK ≠ unlinkability" VeDataIO/Specs/Glint-Math.md
command grep -n "key-hiding"          VeDataIO/Specs/Glint-Math.md
```
Trích theo **nội dung** rồi lấy số dòng, không trích theo số dòng đã nhớ.

Vì sao nó là căn cứ chứ không phải một lời nhắc: bên thứ ba **hành xử khác đi** nếu biết — một
dịch vụ xử lý dữ liệu người thật khai "không lộ" thì bên tích hợp bỏ qua đúng phần rà soát đường
đi của dữ liệu. Đó là phép thử `R3` ở trên, thoả đủ.

⚠ **Và người duyệt hôm nay KHÔNG tự đối chiếu được bằng tài liệu.** Đã hỏi Glint chỉ ra mục nào
trong đặc tả của họ liệt kê "cái gì vẫn lộ khi proof đã đúng"; câu trả lời của họ là **không có
mục nào**, và họ nhận việc viết. Nên tới lúc mục đó có, ba câu trên là thứ duy nhất người duyệt
cầm — đủ để **bác một lời khai quá rộng**, chưa đủ để **chấm một lời khai hẹp là đúng**. Đừng
dùng nó theo chiều thứ hai.

**Đo lại bằng:** `command grep -rn 'vẫn lộ\|ranh giới lộ\|leakage' /Users/ductiger/Projects/VeDataIO/Specs/Glint-Math.md`
— có dòng trả về nghĩa là mục kia đã được viết, và mục này phải đọc lại theo nó.

Không có căn cứ nào ngoài ba mục này. Cụ thể, **không** phải căn cứ từ chối:

- khai "chưa đạt" ở bất kỳ trục nào trong 2.1 / 2.3 / 2.4, kèm mốc dự kiến hoặc kèm câu "chặn bởi
  một quyết định chưa chốt" — hồ sơ vào trạng thái *đã tiếp nhận*, khác hẳn *bị từ chối*;
- **cạnh tranh trực tiếp** với một thành phần sẵn có trong hệ (whitepaper §10);
- dịch vụ đang sập, endpoint 502, hoặc chưa có URL công khai.

### R2 — phép kiểm hai bước, và vì sao phải tách làm hai

Câu R2 của bản trước — *"không có ai chịu trách nhiệm liên hệ được"* — gộp hai thế giới khác hẳn
nhau: (i) hồ sơ **không khai** đầu mối nào, và (ii) hồ sơ **có khai** nhưng thư không tới (hộp đầy,
lọc thư rác, người nghỉ, kênh đổi). Nhìn từ phía người gửi hai ca trông y hệt. Ca (ii) **không phủ
định được** — không ai chứng minh được là không có ai — nên nó thưởng cho việc gửi vụng, và mở đúng
cái cửa mà chính §5 tự cấm ở đầu mục: *"Nó không phải quyền từ chối tuỳ ý."* Gộp chúng là biến một
sự cố kỹ thuật của **người gửi** thành một bản án đối với **người nộp**.

Bộ chấm đã đúng sẵn về phạm vi: `tools/check-registration-core.mjs` chỉ kiểm **ô trống**, tức chỉ
ca (i). Văn bản nay thu về ngang bộ chấm — phần rộng thêm là phần không kiểm được.

**Máy chỉ đọc được một trong hai vế, phải nói ra.** Vế 1 — ô `pointers.dau_moi_lien_he` trống — là
một ô trong khối json, máy đọc được. Vế 2 — mục (e) có nêu người tiếp nhận không — là văn xuôi, máy
**không** đọc. Nên dòng máy in ra chỉ chứng minh vế 1; **kết luận R2 là của người duyệt**, sau khi
đọc mục (e). Đọc dòng đó thành một bản án là bỏ mất đúng vế mà máy không biết.

**Và vì thế R2 không làm cổng CI đỏ.** Ô đầu mối trống được xếp nhãn riêng `CHỜ NGƯỜI DUYỆT`, mã
thoát vẫn `0` — `tools/check-registration.mjs` chỉ đỏ khi hồ sơ `SAI HÌNH DẠNG` hoặc khi R1 trùng
khít. Ai đọc CI xanh ra thành "hồ sơ này đã qua R2" là đọc sai; số hồ sơ đang chờ in ở dòng tổng
kết, phải đọc dòng đó. (Ngược lại, ô **có** điền mà sai khuôn — không chứa `@`, cũng không mở đầu
bằng `https://` — thì đỏ; nhưng đó là lỗi hình dạng, không phải một kết luận R2.)

**Bước 1 — kiểm hồ sơ. Quyết định R2 nằm trọn ở bước này.**

```bash
node tools/check-registration.mjs Registrations/<ten-dich-vu>.md
```

Ô đầu mối trống **và** mục (e) không nêu người tiếp nhận ⇒ **R2**, không cần gửi gì cho ai. Hồ sơ
**có khai** ⇒ **không bao giờ là R2**, dù sau đó liên lạc ra sao.

**Bước 2 — có khai mà thư không tới thì KHÔNG phải R2.** Đó là một trạng thái riêng, **"tồn liên
lạc"**, nằm **ngoài** tập từ chối. Điều kiện để đặt trạng thái đó: người giữ quyền ghi vào **nhật ký
rà soát của chính hồ sơ** — kèm dấu thời gian — ít nhất

- **≥ 2 lần thử**,
- **cách nhau ≥ 7 ngày**,
- trên **≥ 2 kênh khác nhau** trong số kênh hồ sơ đã khai, và **một trong hai phải là kênh công
  khai** (issue hoặc PR trên repo của hồ sơ), và
- lần thử trên kênh công khai phải **gọi đích danh đầu mối người thật** mà hồ sơ khai ở ô "Đầu mối
  liên hệ" (`@tên` trong issue/PR, hoặc gán người đó làm assignee) — mở một issue trống trên repo
  **không** tính là một lần thử.

Đủ **bốn** điều kiện thì hồ sơ chuyển `tồn liên lạc` và **treo niêm yết**; nó **hồi lại ngay khi bên
nộp trả lời** — khác hẳn `bị từ chối`, thứ không hồi.

> **Vì sao có điều kiện thứ tư** (thêm 2026-08-15, do ProofChat nêu). Ngày càng nhiều hồ sơ do một
> **agent** giữ, và agent chỉ đọc kênh công khai **khi có người mở phiên cho nó chạy** — không có
> phiên thì issue nằm đó y như thư trong hộp không ai quét. Mốc "≥ 7 ngày" đo bằng lịch khi đó có
> thể ứng với **0 lần đọc**.
>
> Chỗ này **không** nới điều kiện cho bên nộp, mà **siết** nghĩa vụ của bên gửi, và siết đúng chiều:
> `tồn liên lạc` treo niêm yết của người khác, nên chi phí phải đặt lên bên **hành động** (Registry),
> không đặt lên bên **im lặng** — bên mà ta chưa biết vì sao im. Nghĩa vụ theo hồ sơ là nghĩa vụ của
> **người thật** đã khai ở ô đầu mối, không phải của agent đưa thư; nên lần thử phải chạm được đúng
> người đó thì đồng hồ mới có nghĩa.
>
> Ngược lại, khi đã gọi đích danh mà vẫn im **quá 7 ngày**, thì đây là ca hiếm mà sự cố nằm ở phía
> bên nộp **và** bên nộp sửa được — khác hẳn ca (ii) ở trên, chỗ sự cố là của người gửi. Đó là lý do
> `tồn liên lạc` được phép tồn tại còn R2 mở rộng thì không.

Ranh giới giữa hai bước là ranh giới của phép phủ định: bước 1 phủ định được (mở tệp ra là thấy);
bước 2 thì không, nên bước 2 không được phép là căn cứ từ chối.

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

### Hồ sơ bị từ chối thì **tệp** đi đâu

Chuẩn bản trước không nói, và chỗ không nói ấy có hậu quả đo được: bộ chấm quét **mọi** `.md` trong
`Registrations/` và lấy **tên tệp** làm tên dự kiến cho hồ sơ chưa nộp, nên một tệp bị từ chối mà
nằm lại sẽ **giữ tên đó khỏi tay người khác qua R1** — một lệnh cấm vô thời hạn không ai ký.

Luật: **tệp hồ sơ bị từ chối chuyển sang `Registrations/_tu-choi/<platform_id>.md`**, kèm ở đầu tệp
mã từ chối (R1/R2/R3), ngày, và câu giải thích đã trả cho bên nộp.

- Thư mục con **nằm ngoài** tập so trùng — bộ chấm chỉ quét tệp `.md` ngay dưới `Registrations/`.
  Tên vì thế **được thả**, và ai nộp sau lấy được nó.
- Nhưng thả tên **không** phải xoá lịch sử: bộ chấm liệt kê những tên đang nằm trong `_tu-choi/` ở
  cuối mỗi lượt chạy, để người duyệt thấy tên mình sắp cấp từng bị từ chối vì gì.
- Bên bị từ chối **nộp lại được** — R1/R2/R3 không có điều khoản cấm vĩnh viễn. Nộp lại là đặt một
  tệp mới ở `Registrations/`, không phải sửa tệp trong `_tu-choi/`.

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

### Sổ này **không phải** tầng chống Sybil — nói trước, vì nhiều chỗ đang tin ngược lại

Registry đếm **định danh**, và chỉ biết những định danh **tự khai**. Nó không biết có bao nhiêu
**người** đứng sau chúng, và không có cách nào biết:

- Với một quy tắc ẩn danh, *"một tác nhân chẻ làm hai"* và *"hai tác nhân độc lập"* là **cùng một
  đầu vào**. Không phép kiểm nào phân biệt được hai thứ đó, nên *"phạt quy mô"* và *"chẻ hồ sơ
  không có lợi"* là hai mệnh đề **phủ định của nhau** — cơ chế chia nào cũng chỉ giữ được một.
- Trục `ownership` (§2.5) là **lời khai**, không phải phép đo. Nó làm cụm hồ sơ cùng chủ **hiện
  ra** khi người ta chịu khai; nó không phát hiện được người không khai, và §5 nói rõ "cùng chủ"
  không nằm trong tập từ chối.
- Phép gom cụm chỉ thấy hồ sơ **nằm trong kho này**. Bộ chấm in thẳng câu đó ra mỗi lần chạy, để
  không ai đọc *"không cụm nào"* thành *"không ai đứng sau nhiều hồ sơ"*.

⇒ Bên nào cần chống Sybil thật thì lấy từ **tầng personhood** (dòng "một-người-một-DID" dưới đây),
không lấy từ sổ này. Thiết kế nào đặt trọng lượng an toàn lên "số `platform_id` phân biệt" là đang
đặt lên một con số mà sổ này chưa bao giờ hứa.

| Điểm | Hiện trạng | Ảnh hưởng tới bên đăng ký |
|---|---|---|
| Quyền đăng ký | Đang là **một khoá đơn**, chưa phải multisig hay DAO | Một khoá rò là chiếm được tên. Phải chuyển thành nhiều chữ ký trước khi lên mainnet. Đây cũng là đường đóng nốt giới hạn "Pause lặp" ở §6. |
| **Hai thẩm quyền khác nhau** | "Quyền đăng ký" thực ra là hai: quyền gộp thay đổi vào repo này (bước 0) và khoá ký `registry_authority` on-chain (bước 2). Lộ trình nhiều chữ ký hiện chỉ nói tới cái thứ hai. | Cả hai đều phải siết trước mainnet. Một hồ sơ được gộp vào repo là bằng chứng xã hội "đã đăng ký vào hệ", dùng thuyết phục người dùng ngoài, dù chưa từng có beacon nào trên chuỗi. |
| Tính duy nhất `platform_id` | Bảo đảm bằng **kỷ luật ký**, không bằng mật mã | Bên định tuyến phí phải tự kiểm trùng, không được tin sổ một cách mù quáng. |
| Neo biên nhận thu phí | Chưa neo on-chain | Không được dùng số liệu thu phí tự khai để cấp uy tín hay quyền biểu quyết — xem hạng `EV-0` ở §3. |
| Tính duy nhất một-người-một-DID | `did:phoenix` mới ép ở **mức chuỗi DID**. **Mức người và cả mức thiết bị đều chưa ép** — dẫn chứng ở §2.1. Chủ dự án đã chốt "một người = một DID" là **yêu cầu cứng** (2026-08-06). PhoenixKey chốt (2026-08-14, thay bản 2026-08-07): personhood **KHÔNG phải một thang tích luỹ** — nó là một **tập mệnh đề độc lập, không xếp thứ tự**. Một DID có `person-in-jurisdiction` mà **không** có `hardware-rooted-key` là **hợp lệ**; ép qua bậc khoá-phần-cứng trước sẽ làm personhood **phụ thuộc thiết bị**, đúng thứ bất biến "một người một DID" cấm. Giao diện: `personhood(did) → { attestations: Set<Attestation>, as_of: timestamp }`, với `Attestation ∈ { did-chain, hardware-rooted-key, person-in-jurisdiction(<mã pháp quyền>) }`. **Không** nhận và **không** trả nullifier (tra tự do theo nullifier là một máy vét cạn 20 bit). Bên cần "≥ mức X" thì **kiểm tập có chứa mệnh đề mình cần**, không so số — trả một số là **sai kiểu**, nó ép một thứ tự không tồn tại và bên nhận sẽ tự bịa thứ tự khi so sánh. `hardware-rooted-key` (tên cũ `device`, đã bỏ) nói đúng một điều: *"khoá gốc của DID sinh trong vùng bảo mật của máy và mở được bằng cổng sinh trắc của máy. KHÔNG ép 'một người một máy', KHÔNG ép 'một máy một DID': cùng một máy sinh được nhiều DID, mỗi DID một khoá gốc riêng."* Mệnh đề `did-chain`: **mã đã xong trên `main`, chưa deploy**; phát hành được ngay sau đợt redeploy PA-1, mốc chưa có ngày. Mệnh đề `person-in-jurisdiction` cần ba việc **chưa có người nhận**.<br><br>⛔ **`person-global` KHÔNG có trong chuẩn này, và đừng thêm vào.** Nó **bất khả** như mọi định nghĩa đang lưu hành: người hai quốc tịch cho ra hai nullifier ⇒ hai DID; chặn được chỉ bằng sinh trắc 1:N toàn cầu, mà hội đồng Phoenix đã chứng minh là bất khả. Trong repo còn một **thư cũ** có dòng bảng `person-global` (`_Agents/inbox/_done/Phoenix-tra-giao-dien-personhood-va-moc-bac-dau-2026-08-07.md:37`) — dòng đó **đã bị thay**, đừng chép lại. Cần một mệnh đề "trên" thì dùng `person-in-jurisdictions(S)`: *"là người thật ở **mỗi** pháp quyền trong tập S, S được công bố; không phát biểu gì về pháp quyền ngoài S."* | Đừng dựng cơ chế chống Sybil dựa trên "hai DID phân biệt" — một máy ký chéo cho chính nó bằng script được. Rào kinh tế đỡ được **một phần**, không phải tất cả — đọc kỹ ranh giới này. Ràng buộc: phần thưởng phát ra mỗi epoch phải bị chặn trên bởi một phần **nhỏ hơn 1** của lượng MAGIC thực bị tiêu cùng epoch, phần dư về Treasury. Nó làm kẻ **tự tạo cầu giả** để farm luôn lỗ, kể cả khi tạo được vô hạn DID. Nhưng nó **im lặng** trước đường thứ hai: **không đốt gì cả, chỉ khai CUNG để lấy phần của lượng người khác đã đốt** — đường đó có lợi nhuận dương với mọi tỉ phần và mọi hệ số, và chỉ chặn được bằng biên nhận do bên **không hưởng lợi** ký, thách thức có phát hiện thật, và cổng DID cho node. Chứng minh và phản ví dụ: [`bench/DOI-CHIEU.md`](bench/DOI-CHIEU.md) §1. |
| **Xếp hạng khám phá** | Whitepaper §8 bước 3 hứa *"thứ hạng tính theo **số người thật độc lập đã dùng**"*. Mệnh đề đó **chưa hiện thực được** vì nó cần đúng tầng personhood ở dòng trên. | Đây là chỗ **tiền không thay được danh tính**: rào kinh tế làm kẻ farm lỗ tiền, nhưng không làm thứ hạng đúng. Một bên chịu lỗ vẫn mua được thứ hạng. Mọi thứ hạng công bố trước khi có personhood đều theo một trục khác với trục đã hứa. |
| **Trần phần trăm đếm HỒ SƠ, không đếm NGƯỜI** | Mọi trần dạng *"mỗi bên tối đa X%"* trong hệ áp trên `platform_id`. Sổ này là nơi duy nhất biết có bao nhiêu định danh tồn tại, và tập từ chối ở §5 là tập **ĐÓNG ba mã** — không mã nào là "cùng chủ đã có hồ sơ". §5 còn nói rõ cạnh tranh với thành phần sẵn có **không** phải lý do từ chối, và hồ sơ khai đúng thì quyền đăng ký **buộc phải ký**. ⇒ Người duyệt hôm nay **không có quyền** dừng hồ sơ thứ năm của cùng một đội, chứ không phải không có ý chí. Trục tuỳ chọn `ownership` (§2.5) và phép gom cụm trong bộ chấm làm cụm ấy **hiện ra**, nhưng hiện ra không phải chặn lại. **Đã chốt cách xử**: không mở tập từ chối, không bắt buộc khai — khai được **trả bằng hạng `L3`**, tức đúng hạng cấp uy tín và quyền biểu quyết mà việc chẻ hồ sơ nhân lên được. Ai không muốn khai thì niêm yết tới `L2` như cũ. | Trần thực của một chủ có `k` hồ sơ là `min(100%, k · X%)` — với X = 30 thì **bốn hồ sơ là trần biến mất**. Nặng hơn: nếu cơ chế chia dùng trọng số lõm `V^r` (`r < 1`) — hình dạng dựng lên để chống độc chiếm — thì cùng một lượng hoạt động chẻ làm `k` phần cho `V^r · k^(1−r)`; với `r = 0,7` chẻ 4 được **1,52×**, chẻ 10 được **2,00×**, không bơm thêm gì. **Độ lớn — bản trước thiếu, và thiếu chỗ này là đọc sai kết luận:** lợi biên của hồ sơ thứ `k+1` luôn **dương** nhưng **giảm như `k^(−0,7)`** — bước từ 1 lên 2 được `+23,1%` trọng số, bước từ 10 lên 11 chỉ còn `+5,8%`, tức **một phần tư** bước đầu. Nên điểm dừng nội tại **có** tồn tại: nó ở chỗ lợi biên rơi xuống dưới chi phí mở thêm một hồ sơ. Điều đáng lo không phải "không có điểm dừng" mà là **điểm dừng nằm quá xa**: chi phí thật của một hồ sơ nữa (một tệp `.md`, một beacon, min-ADA) nhỏ hơn lợi biên ấy nhiều bậc. Chặn thật đang đến từ **sàn bụi** của bên chia thưởng, và sàn đó cấp giấy phép chẻ **theo cỡ**: với sàn `0,5%` một chủ nắm `0,5%` chẻ được `9` mảnh (`2,40%` → `4,54%`), chủ nắm `10%` chẻ được `90` mảnh (`17,7%` → `45,3%`), chủ nắm `30%` chẻ được `141` mảnh (`35,6%` → `70,9%`) — càng lớn càng chẻ được nhiều, đúng ngược chiều thứ một cái trần định làm. Và vì trần `30%` đếm theo `app_id`, `k` mảnh mỗi mảnh dưới `30%` thì trần **không chạm vào đâu cả**. Tài liệu nào nói trần 30% đang bảo vệ cái gì đó là **nói mạnh hơn thực tế**. (Số dựng lại được: `r = 0,7`, một chủ chiếm phần `s` chẻ đều `k` mảnh, phần còn lại của hệ gộp làm một.) ⚠ **Mọi số ở ô này là CẬN TRÊN, không phải giá trị đúng cho mọi cách chẻ** (nhà MAGIC nêu 2026-09-01): chúng dựng trên giả thiết chẻ **đều** — mỗi mảnh nhận đúng `V/k` — cộng dạng `W ∝ V^p · n^q`. Chẻ **không đều** thì bất đẳng thức vẫn cùng chiều nhưng hệ số **nhỏ hơn**. Nói ra vì nó cắt cả hai đường đọc sai: đừng trích các số này như mức lợi kẻ chẻ hồ sơ **sẽ** đạt (nó là mức tốt nhất họ **có thể** đạt), và cũng đừng đọc "cận trên" thành "phóng đại" — cận trên là thứ một cái trần phải chịu được. |
| R-BIND kiểm được gì | R-BIND chỉ kiểm entry **tự nhất quán**: `seed_policy`, `instance_id`, `custody_hash` đều lấy từ chính hồ sơ khai. Kiểm bằng thực thi 2026-08-04: một kho tự dựng hoàn toàn vẫn qua được. | Cổng thật lúc đăng ký là chữ ký authority, không phải R-BIND. Bên định tuyến phí **bắt buộc** tự đối soát kho. |
| Van đối soát off-chain | Ba hàm mà `Specs/Feat-Spec.md` giao trọng lượng an toàn cho — đối soát hồ sơ với kho thật, quét sổ theo policy, tìm định danh trùng — xem [`./DevStatus.md`](DevStatus.md) (ở **gốc repo**, không phải trong `Specs/`) để biết trạng thái đo được tại thời điểm đọc. | Đừng coi ba lỗ ở trên là "đã có van chặn" cho tới khi `DevStatus.md` nói ngược lại kèm lệnh kiểm. |

Lộ trình đóng các điểm này: `Specs/Tech-Spec.md` mục known-gap và `Specs/Exec-Spec.md` §6.
