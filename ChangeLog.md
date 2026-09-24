# ChangeLog — Registry

**Đây KHÔNG phải nhật ký phát hành theo phiên bản** (không theo Keep a Changelog, không theo SemVer).
Thứ ghi ở đây là **quyết định về đặc tả** — mà quyết định đặc tả không đi theo số phiên bản.

Quy tắc ghi: **mới nhất trên đầu; không bao giờ sửa dòng cũ**. Mỗi mục ba vế — **đổi gì · vì sao ·
cái gì gãy nếu ai đó đang bám bản cũ**. Vế ba là vế hay bị bỏ và là vế duy nhất người đọc cần.

**Cấm phát biểu hiện trạng ở đây** ("hiện đang…", "nay là…"). Hiện trạng nằm ở
[`DevStatus.md`](./DevStatus.md) — nơi duy nhất.

---

## 2026-09-24 — bảng đối chiếu mã ràng buộc on-chain ↔ đặc tả ↔ off-chain; `R-GOVDIST` và `R-CAP` vào `Tech-Spec.md`

- **Đổi gì.**
  - Thêm `tests/constraintCrosswalk.test.ts`. Bài lấy mọi mã ràng buộc (`R-*`, `U-*`, `M-*`, `S-*`) xuất hiện trong mã on-chain (bỏ tệp `_test.ak`), rồi đỏ khi có mã thiếu ở `Specs/Tech-Spec.md` hoặc thiếu ở `offchain/src/`. Chiều ngược lại cũng đỏ: mã chỉ có ở off-chain phải nằm trong danh sách `OFFCHAIN_ONLY`, mỗi mục kèm lý do.
  - Ngoại lệ hiện có:
    - `S-REG` là tiêu đề một nhóm trong chú thích, không phải một ràng buộc.
    - `U-BEACON` và `M-GOVSELF-OWN` là hai phép kiểm chỉ có ở off-chain.
  - `Tech-Spec.md` thêm hai mục `R-GOVDIST` và `R-CAP`, ngay sau `R-WF`. Hàm gương off-chain `governanceRefDistinct` và hằng `MAX_ACCEPTED_ASSETS` nay mang tên mã tương ứng.
- **Vì sao.** `registry_beacon.ak` ép cả hai ràng buộc này, và `shapeMirror.test.ts` có bài gương cho cả hai. Nhưng `Tech-Spec.md` tả khối `R-WF` mà không nhắc tới chúng, và mã gương off-chain cũng không gắn tên. `R-GOVDIST` chặn một đường mà authority một mình gỡ niêm yết vĩnh viễn được, vì nhánh `Collect` của kho custody không đòi chữ ký. Bên tích hợp đọc đặc tả không có cách nào biết ràng buộc đó tồn tại. Không bài kiểm nào đỏ, vì chưa có gì đối chiếu ba nơi với nhau. Chạy lần đầu, bài mới đỏ đúng hai mã này và không đỏ ở chỗ nào khác.
- **Cái gì gãy.** Không đổi validator nào, script hash giữ nguyên. Từ nay, thêm một mã ràng buộc vào validator mà không thêm dòng ở đặc tả và ở off-chain thì CI đỏ. Đó là chủ ý của bài.

## 2026-09-24 — sổ `op_type` khớp lại với bảng giá on-chain; `ID-3` trỏ về nguồn personhood thật

- **Đổi gì.** Sáu việc trong `Specs/Resource-Dictionary.md`:
  - (1) **RD-6** viết lại: trần 16 dòng giá là của **cả hệ**, không phải của từng platform.
  - (2) Mã 3/4 đổi tên thành `recognition_{storage,compute}_event`, đơn vị "1 lần" thay cho "1 MB".
  - (3) Mã 5/6 thành **bia mộ**: rút 2026-09-21, số không cấp lại.
  - (4) `geo_dispatch` vào §5 danh sách hở, chưa cấp số.
  - (5) Khối đếm số còn trống thay bằng phép đếm dòng giá.
  - (6) Cấp **mã 19 `CAVE_FUEL_K`** cho Dhost: `op_count = ⌈fuel_used/1000⌉` mỗi job, job lỗi vẫn đếm.
    Còn 1/16 dòng giá.

  Ngoài từ điển:
  - `REGISTRATION-STANDARD.md` §2.1 (đoạn `ID-3`), dòng "một-người-một-DID" ở §7, và `codes.json` ▸ `_id3_doc` thôi chép tập mệnh đề personhood, chuyển sang trỏ `PhoenixKey-Knowme-Math.md` §4.2 @ `ca13914`.
  - Con trỏ sang đặc tả tín dụng MAGIC (`REGISTRATION-STANDARD.md` §9, `codes.json` ▸ `_carp_doc`) sửa theo tên tệp và mục hiện hành.

- **Vì sao.**
  - Nguồn của bảng giá là `PriceParam` (`ConsumeMAGIC/.../types.ak`): **một** beacon, **một** danh sách `op_prices`, trần `max_op_prices = 16` (`pricing.ak`). Bản cũ của RD-6 đọc trần đó thành hạn mức riêng của từng platform, sai theo chiều đắt: người xét đơn tưởng còn dư dòng giá, thật ra 14 mã còn sống chỉ để lại 2 dòng.
  - Mã 19: đơn vị bị RD-1 khoá từ giao dịch đầu tiên, còn `base_price` thì DAO đổi lúc nào cũng được. Nên chọn đơn vị mịn
    nhất mà không khoá bước chỉnh giá: 1000 fuel. Đơn vị 10⁶ fuel thu job nhỏ như job 10⁶ fuel — gấp tới 1000 lần giá theo fuel.
    Cùng giá theo fuel với đơn vị 10⁶ ở mọi job ≥ 10⁶ fuel (lệch ≤ 0,1%, tính bằng `required_for`).
  - Mã 3/4: `required_for` nhân thẳng `op_count`, không quy đổi byte, nên "MB" chưa bao giờ đúng.
  - `geo_dispatch` xin số 9, nhưng số 9 đã có chủ ở §2. Nó cũng chưa có mã đếm (RD-5).
  - Tập personhood được chép từ một thư trao đổi 2026-08-14 đã bị §4.2 của PhoenixKey thay bằng bảng `kind`/`family`. Bản chép không có đường về nguồn nên chết im lặng. Câu "0 lần trong `PhoenixKey-Specs`" hết đúng từ 2026-09-12.

- **Cái gì gãy nếu đang bám bản cũ.**
  - Bên nào gọi `pricePerOp(5|6, …)` sẽ không còn dòng giá tương ứng.
  - Bên nào tính phí mã 3/4 theo MB đang tính sai từ đầu.
  - Bên nào dựng bộ kiểm personhood theo tập `{did-chain, hardware-rooted-key, person-in-jurisdiction}` đang kiểm một tập không còn tồn tại ở nguồn. Chuyển sang hỏi `can(d, c, τ)` cho đúng năng lực cần.
  - Bên nào xin mã mới với giả định mỗi platform có 16 dòng: con số thật là 2 dòng cho cả hệ trước mã 19, 1 dòng sau mã 19.
  - Bên nào đã dựng theo đơn vị ⌈fuel/10⁶⌉ đề xuất trước đó cho Dhost: đơn vị chính thức là 1000 fuel.

## 2026-09-24 — SDK off-chain nhận bộ ba script thành MỘT kiểu, và mọi gương của ràng buộc vô điều kiện thành bắt buộc

- **Đổi gì.** Thêm kiểu `RegistryScripts { registryAuthority, registryHash, beaconPolicy }`
  (`offchain/src/types.ts`). `planRegister`, `onboardPlatform`, `planUpdateEntry`, `planMigrateEntry`
  nhận nó thay cho các chuỗi rời. Bảy tham số trước đây tuỳ chọn nay bắt buộc: `timeBucketWindow`,
  `registryHash`, `ownRegistryHash` (bỏ hẳn, lấy từ `scripts`), `valueIn`/`valueOut` ở cả Update lẫn
  Migrate. Thêm ba phép ném: `REG-AUTH`, `ONBOARD-AUTH` (khoá authority của cấu hình platform khác
  khoá của bộ script) và `UPD-BEACON` (policy beacon truyền vào khác policy mà hồ sơ mang). Phép kiểm
  hồi sinh thuần tuý phía off-chain nay so cả bản ghi thay vì liệt kê trường. `summary` của Update và
  Migrate cảnh báo cấm mint/burn. Cổng số trường trong tài liệu (`tests/soTruongTaiLieu.test.ts`)
  quét mọi tệp `Specs/*.md` và khớp cả chữ `field`.

- **Vì sao.** Mỗi tham số tuỳ chọn ở đây là một gương của một ràng buộc on-chain **vô điều kiện**;
  bỏ trống thì gương im, và bên gọi dựng được một giao dịch mà chain chắc chắn từ chối — lỗi chỉ lộ
  ra lúc nộp, sau một vòng phối hợp giữa hai tổ chức. Nặng nhất là `ownRegistryHash`: bỏ trống thì
  SDK báo hợp lệ cho một giao dịch khoá beacon NFT vĩnh viễn. `registryHash` và `beaconPolicy` gắn
  với nhau bằng mật mã (policy được apply từ hash), nên nhận chúng rời nhau thì gương R-GOVSELF báo
  xanh cho một hash sai mà vẫn đủ 28 byte. Khi rà họ lỗ này, phép đo cũ đếm được **ba** ô vì nó đo
  bằng tên tham số; đo bằng hình dạng (`if (x !== undefined)` bọc một gương) thì ra **bảy**.
  Không đổi dòng validator nào; chú thích U-GOV trong `registry.ak` thôi liệt kê tên trường (nó đã
  liệt thiếu `substrate_flags`), script hash không đổi.

- **Cái gì gãy.** Mọi chỗ gọi bốn hàm trên theo chữ ký cũ không biên dịch được nữa — gãy ồn ào, có
  chủ ý. Gói `@magiclamp/registry-kit` chưa phát hành và chưa khai điểm vào, nên không bên ngoài kho
  nào đang nhập nó. Bên nào đang ghép tay `beaconPolicy` với `registryHash` từ hai nguồn khác nhau
  sẽ gặp `REG-AUTH`/`UPD-BEACON` thay vì một giao dịch bị từ chối lúc nộp. Ví dụ ở
  `Specs/onboarding.md` mục (d) viết theo chữ ký mới; bản cũ thiếu bốn tham số bắt buộc và trỏ tới
  một kịch bản không tồn tại.

## 2026-09-06 — phép đo độ phủ vào kho, và nó cắt phạm vi bằng ngoặc chứ không bằng thụt lề

- **Đổi gì.** Thêm `tools/dot-bien.mjs` — phép đo độ phủ thật của bộ kiểm on-chain: gỡ hẳn từng
  ràng buộc `expect` trong validator rồi chạy trọn bộ; chốt nào gỡ ra mà không bài nào đỏ là chốt
  không có bài kiểm nào canh riêng nó. Bản này cắt phạm vi biểu thức bằng **cân bằng ngoặc**, thay
  cho cách cắt bằng **thụt lề** của bản chạy tay trước đó.

- **Vì sao.** Hai lý do rời nhau, cùng dẫn về một chỗ.

  Thứ nhất, cách cắt cũ **mù đúng 6 chốt** và mù trong im lặng. Với `expect or {` thụt 8 mà dòng
  đóng khối thụt 10, phép so *"thụt ≤ thụt-của-expect"* nhảy qua dòng đóng thật rồi bắt vào dấu `}`
  đóng **cả hàm**; bản đột biến nuốt phần đuôi, không biên dịch được, và một bản đột biến không
  biên dịch được thì nó **không nói gì** về độ phủ. Cùng lỗi với biểu thức trải nhiều dòng. Thụt lề
  chưa bao giờ là đại lượng đúng để cắt một biểu thức — phạm vi của nó là chỗ mọi ngoặc đã đóng.
  Đo lại 6 chốt ấy bằng cách cắt mới: **cả 6 đều có bài canh riêng**.

  Thứ hai, phép đo này trước nay sống trong thư mục tạm của một phiên làm việc, và `DevStatus.md`
  trỏ cột *Lệnh kiểm* vào đúng đường dẫn đó. Một con trỏ tới thứ sẽ biến mất, và **không gì kêu**
  khi nó biến mất — người sau đọc dòng ấy, chạy lệnh, nhận "không tìm thấy tệp", rồi không có cách
  nào biết phép đo từng cho ra số gì.

- **Gãy gì nếu bám bản cũ.** Ai đọc mục *Việc còn treo* bản trước sẽ thấy dòng "6 chốt không đo
  được" kèm chẩn đoán *"làm mất binding bên trong"* và đề xuất *"đảo vế thay vì gỡ khối"*. **Cả hai
  đều sai**, và sai theo hướng dẫn người sau đi nhầm đường: không có binding nào bị mất, và đảo vế
  không sửa được cái gì. Dòng ấy đã được thay bằng nguyên nhân thật.

## 2026-09-06 — nhãn trạng thái tự khai bị gỡ khỏi mọi tệp đặc tả

- **Đổi gì.** Bảy tệp trong `Specs/` bỏ hai hàng siêu dữ liệu: `Trạng thái` (mang chữ `DRAFT`) và
  `Bộ trạng thái` (hàng chỉ tồn tại để giải nghĩa hàng trên). `Specs/README.md` bỏ luôn cột
  `Trạng thái` trong bảng mục lục. Hàng **`Người duyệt | chưa ai duyệt`** giữ nguyên ở mọi tệp, và
  khối ⚠ ở `Specs/README.md` được nói rõ nó đang thay cho cái vừa gỡ. Ba chỗ khác đổi câu chữ:
  `Specs/Resource-Dictionary.md` §2 thôi tên là *"Từ điển canonical"*, và hai chỗ trong
  `REGISTRATION-STANDARD.md` thôi dùng chữ `canonical` để chỉ bản của kho khác — nói **"bản phải
  trích"**, vì đó mới là điều đo được.

- **Vì sao.** Một nhãn trạng thái chỉ có nghĩa khi có cổng chuyển nó. Không cổng nào trong kho đọc
  hàng đó — rà toàn bộ tệp được git theo dõi, không tệp `.mjs`/`.ts`/`.sh`/`.yml` nào chạm tới nó.
  Nhãn không ai chuyển thì nó **không tự già**: nó ghi `DRAFT` mãi, kể cả sau khi đặc tả đã được
  dùng để dựng hai validator và một SDK. Thứ nó định nói — "chưa qua duyệt" — đã có sẵn ở hàng
  `Người duyệt`, và câu đó **sai đi ngay** khi có người duyệt thật. Giữ cả hai là giữ một bản khai
  kiểm được cạnh một bản khai không kiểm được, và bản không kiểm được thì đứng ở đầu tệp.
  Đối xứng bị bỏ sót lúc thêm nhãn (mục **2026-08-13** dưới): luật cấm tài liệu tự phong vai được
  đọc như luật cấm phong vai **CAO** (`canonical`, `final`), nên một vai **THẤP** đi lọt — dù nó
  cùng là một tài liệu tự khai một thứ về chính nó mà không ai cưỡng chế.

- **Gãy gì nếu bám bản cũ.** Ai từng lọc tệp theo hàng `Trạng thái` sẽ không thấy hàng đó nữa; câu
  hỏi *"tệp này qua duyệt chưa"* nay đọc ở hàng `Người duyệt`. Và đừng đọc việc **gỡ nhãn** thành
  **nâng cấp trạng thái** — không tệp nào trong `Specs/` được ai duyệt, hôm nay cũng như hôm qua.

## 2026-09-05 — đường hồi sinh so **cả bản ghi**, và ba câu trong mã nói lệch thực tế

- **Đổi gì.** `pure_revive` trong nhánh `UpdateEntry` của `registry.ak` thôi liệt kê từng trường,
  đổi sang `entry_out == PlatformEntry { ..entry_in, status: Active }`. Ba khối chú thích được viết
  lại vì chúng nói mạnh hơn hoặc im hơn thực tế: nhóm quản trị ở `platform.ak` nay trỏ tới giả định
  v1 (`registry_authority` và `governance_ref` cùng một committee ⇒ "hai bên" là một bên); nhánh
  Migrate nói rõ vì sao nó **không cần** mã riêng cho `substrate_flags`; và `M-VER` nói rõ
  `spec_version` là **nhãn**, thứ ép hình dạng datum là **arity** của validator đích.
  `Specs/Math-Spec.md` §D8-b viết lại theo.
- **Vì sao.** Danh sách viết tay là chỗ thứ tư phải quét mỗi lần lược đồ thêm trường, trong khi ba
  chỗ kia đều nhận trường mới qua một phép so trên cả bản ghi. Nó đã bỏ sót thật: `substrate_flags`
  vào lược đồ và vào `governed_fields_changed` cùng ngày 2026-09-02, danh sách này không theo kịp —
  cùng một trường, hai đường đi, hai luật. Trình biên dịch không kêu, vì thiếu một vế trong một hội
  chỉ làm vị từ **lỏng hơn**, không làm nó sai kiểu.

  Phép so mới **tương đương** bản cũ tại chỗ nó đứng, và đó là thứ đếm được chứ không phải tin: 12
  trường = `status` (chừa ra) + `spec_version` (U-VER ép ngay trên) + sáu trường định danh (U-ID) +
  bốn trường quản trị (danh sách cũ). Cái đổi không phải mức chặt, mà là **ai chịu trách nhiệm nhớ**.
- **Gãy gì nếu ai đó bám bản cũ.** Script hash `registry` đổi (`registry_beacon` không đổi). Miễn
  phí vì chưa deploy mạng nào — giá trị hiện hành đọc từ `onchain/plutus.json`, không chép vào đây.

  Và một điều kiện trong `Math-Spec` §D6 **hết hiệu lực một nửa**: yêu cầu "trường mới phải vào CẢ
  `governed_fields_changed` LẪN `pure_revive`" nay chỉ còn vế đầu. Ai đang dùng bản cũ của điều kiện
  đó sẽ đi tìm một chỗ không còn cần sửa.

## 2026-09-05 — ô khai nền hạ tầng, và hai ngưỡng hạng đặt sai chiều

- **Đổi gì.** Ba chỗ trong chuẩn đăng ký và bộ chấm:
  - Chuẩn có **§2.6** mới — ô `nen_su_dung`, khai bằng **tên nền** (tập đóng ở `codes.json` mục
    `substrate_bits` mới), ánh xạ sang trường on-chain `substrate_flags`. `PlatformConfig
    .substrateFlags` thành **bắt buộc**, bộ dựng giao dịch bỏ đệm `?? 0n`.
  - `IN-3` — hạng cao nhất của trục hạ tầng — đòi `bang_chung_khong_phu_thuoc` theo dạng
    `<lệnh tra lại được> → <kết quả nhận được>`.
  - `L1` đòi `evidence_min = 1`.
  - Bộ chấm thêm phép kiểm chéo: khai `TK-1`/`TK-2` mà `nen_su_dung` không có `magic` thì **nêu**
    chỗ lệch (nêu chứ không chặn — máy không biết bên nào đúng).
- **Vì sao.** Cả ba là cùng một hình dạng: một lời khai đi được qua cổng mà không người nào đứng sau
  nó. `substrate_flags` lên chuỗi từ một giá trị đệm ⇒ hồ sơ mang câu *"dịch vụ này không dùng nền
  nào của hệ"* mà không ai phát ra. `IN-3` có `needs: []` **giống hệt** `IN-0` là hạng thấp nhất
  cùng trục — một mệnh đề **phủ định** lên hạng cao nhất mà không phải nộp gì. Và `L1` là hạng gắn
  với việc **nhận thưởng**, `L3` gắn với uy tín — nên vé nhận tiền đang rẻ hơn vé nhận uy tín.
- **Gãy gì nếu ai đó bám bản cũ.** Mã gọi SDK **không biên dịch được** nếu không truyền
  `substrateFlags` — đó là chủ ý, vì đường im lặng cũ ghi một lời khai lên chuỗi. Hồ sơ đang khai
  `IN-3` mà không có ô bằng chứng thì **tụt hạng trục hạ tầng**; hồ sơ ở `L1` không có lời khẳng
  định nào từ `EV-1` trở lên thì **tụt xuống `L0`**. Cả hai đọc đúng là hồ sơ chưa đủ dữ kiện, không
  phải hồ sơ bị phạt.

## 2026-09-01 — ô hồ sơ bị ghim về địa chỉ **enterprise** (`R-ADDR` · `U-ADDR` · `M-ADDR`)

- **Đổi gì.** Ba dòng ràng buộc mới, cùng một bất biến ở ba cửa của vòng đời hồ sơ: ô hồ sơ ra phải
  có `stake_credential == None`. Cửa đúc (`registry_beacon.ak`), nhánh Update và nhánh Migrate
  (`registry.ak`). Helper `util.has_no_stake_part`. Kèm `Math-Spec.md` §8 dòng **T16** và ba mục
  trong `Tech-Spec.md`.
- **Vì sao.** `is_at_script` — thứ mọi phép đếm và phép tìm của hai validator dùng — cố ý chỉ so
  **payment credential**, và rà toàn kho thì **không dòng nào so `stake_credential`**. Nên một ô hồ
  sơ đặt ở biến thể stake của đúng `registry_hash` qua được **mọi** ràng buộc đang có: payment
  credential đúng, beacon NFT thật, `U-SINGLE` đếm đủ một ô. Hồ sơ hợp lệ, và **tàng hình** với
  `utxosAt(<địa chỉ enterprise>)` — đường mà bên tích hợp NGOÀI kho dùng.

  ⚠ **Đính chính (2026-09-01):** bản đầu của mục này viết đó là đường `scripts/02_*`/`03_*` "thật sự
  dùng". Sai — `utxosAt(` có **0** call site trong kho (3 dòng khớp đều là chú thích); `scripts/03_*`
  đọc bằng `utxosByOutRef`; `config.ts:126` chỉ **dựng** địa chỉ. Bản vá vẫn đúng, nhưng bên hưởng
  lợi là bên ngoài kho — và biết đúng bên hưởng lợi là điều kiện để cân cái giá (bỏ quyền uỷ thác
  của mọi ô hồ sơ, ép đích di trú phải enterprise).

  Thiệt hại không phải mất tiền — sổ không giữ giá trị (PK1). Thiệt hại là sổ chỉ đường mà đường đọc
  chuẩn không ra mục, tức đúng thứ sổ này tồn tại để làm. Và nó im: không phép đo nào đỏ.

  Phép đếm **không** được sửa để đóng chỗ này — gộp stake vào phép tìm là mở lại double-satisfaction
  C1/C2/M1. Nên đếm giữ theo payment hash, ô ra ghim thêm bằng một vị từ riêng.

  Ghi lại một chỗ bản ghi cũ **nói sai**: chỗ này từng được xếp là "không đóng được ở
  `registry_beacon` — validator chỉ biết `registry_hash`, giới hạn cấu trúc". Câu đó đúng với cách vá
  `reg_out.address == own_addr` (beacon không biết `own_addr`), và **sai** với cách vá này, vì
  `has_no_stake_part` chỉ đọc chính ô ra. Cửa sinh đóng được, và đóng ở đó mới là chỗ đáng đóng nhất:
  không hồ sơ nào ra đời ở chỗ đường đọc chuẩn không tới.
- **Gãy gì nếu ai đó bám bản cũ.** **Script hash đổi cả hai** — `registry`
  `d4202913…65f6` → `d10bb50d…0115`; `registry_beacon` `e596b61f…bd6f` → `73a25648…b97d`. Ai đã ghim
  hash cũ vào tham số, địa chỉ, hay tài liệu thì phải cập nhật. Miễn phí lúc này vì **chưa deploy
  mạng nào** (`find . -iname '*LIVE_DEPLOY*'` rỗng) — sau hồ sơ đầu tiên lên chuỗi thì không.

  Và: ô hồ sơ **thôi uỷ thác được** phần ADA khoá trong nó. Đánh đổi có chủ ý — mỗi ô chỉ min-ADA,
  đổi lại bỏ được một câu không có người trả lời: ai giữ stake credential của ô hồ sơ.

---

## 2026-08-15 — `T-RECEIPT` có **miền** (`D-RECEIPT`), và `tồn liên lạc` có điều kiện thứ tư

- **Đổi gì (hai chỗ, hai nhà nêu).**
  - `Specs/Math-Spec.md` §13.1.1 **mới**: `T-RECEIPT` chỉ áp cho lời khai **phát biểu sai được** về
    một sự việc **ngoài chính lời khai**. Lời khai tự chứng (khoá là `hash(dạng chuẩn tắc)`) nằm
    **ngoài** miền — nó là một cái **tên**, không phải biên nhận, nên không có nghĩa vụ nào phát
    sinh để mà phân hạng. Kèm phép thử của PhoenixKey (*"khai vống thì khai thế nào?"*) đã siết:
    phải hỏi về **mệnh đề mà khoản tiền phụ thuộc vào**, không hỏi về thứ được băm.
  - `REGISTRATION-STANDARD.md` §5 bước 2: `tồn liên lạc` từ **ba** điều kiện lên **bốn** — lần thử
    trên kênh công khai phải **gọi đích danh đầu mối người thật** trong hồ sơ; mở issue trống không
    tính.
- **Vì sao.**
  - PhoenixKey đề nghị thêm một **nhánh** *"hoặc (b) nội dung tự chứng"* vào phép tuyển. Không nhận
    cách phát biểu đó: nhánh (b) là một **đường cấp quyền**, và ai cũng đi được bằng cách băm lời
    khai của mình lại — `hash("tôi đã phục vụ 1000 yêu cầu")` tự chứng hoàn hảo trong khi con số
    1000 thì bịa. Đặt làm **miền** thì cái chặn nằm trong cấu trúc: ngoài miền = **không có quyền
    nào được cấp**, không phải quyền cấp theo lối khác.
  - ProofChat nêu: hồ sơ do **agent** giữ chỉ đọc kênh công khai khi có người mở phiên, nên mốc
    "≥7 ngày" đo bằng lịch có thể ứng với 0 lần đọc. `tồn liên lạc` treo niêm yết của người khác ⇒
    chi phí phải đặt lên bên **hành động**, không đặt lên bên **im lặng**.
- **Gãy gì nếu bám bản cũ:** ai đang định dùng "nội dung của tôi content-addressed" làm căn cứ đòi
  entitlement sẽ không còn cửa — tự chứng đưa ra khỏi miền, không đưa lên hạng. Và ai đã ghi nhật ký
  rà soát đủ ba điều kiện cũ mà lần thử công khai **không gọi đích danh** thì nhật ký đó chưa đủ:
  chưa đặt được `tồn liên lạc`, phải thử lại cho đúng hình.

## 2026-08-15 — `pending` không những không chặn Sybil, nó **nghiêng về phía kẻ giả**

- **Đổi gì:** `Specs/Math-Spec.md` §13.4 mục 1 nâng lên: điều kiện thăng *"qua `W` epoch không phát
  hiện lỗi"* thưởng đúng thứ Sybil dư mà người thật thiếu — **thời gian không tốn chi phí**. Node
  thật phải chạy máy `W` epoch; node giả chỉ cần **không làm gì** `W` epoch. (PhoenixKey nêu.) Cùng
  mục, chứng cứ về cổng `loa ≥ 1` siết chặt hơn: **mọi** chỗ dựng `EpochContributionV2` trong toàn
  kho `lampnet-hivemind` đều nằm trong `#[cfg(test)]` — cổng đó gác một con đường chưa ai đi.
- **Vì sao:** bản trước mới nói `pending` *"không chặn"*. Nói thế còn nhẹ và còn để ngỏ cho một người
  đọc lạc quan nghĩ rằng nới `W` sẽ chặt hơn.
- **Gãy gì nếu bám bản cũ:** ai đang coi `W` là tham số chờ hiệu chuẩn đang giải sai bài. Không phải
  hiệu chuẩn sai — **sai loại điều kiện**. *"Không bị bắt lỗi"* thì cả hai bên đều đạt bằng cách nằm
  im, nên không con số `W` nào tách được họ. Đổi số vô ích; phải đổi loại.

## 2026-08-15 — `R1` chuyển từ lời hứa của người sang phép kiểm của máy; và bộ chấm thôi đỏ khi hồ sơ chỉ THIẾU

- **Đổi gì:** chuẩn đã có căn cứ từ chối `R1` (trùng `platform_id`) từ đầu, nhưng **không có gì
  kiểm** — nó chỉ là một dòng chữ chờ người ký nhớ ra. Nay `tools/check-registration.mjs` quét
  **toàn** thư mục hồ sơ kể cả khi được gọi để chấm lẻ một tệp, vì `R1` là tính chất của **tập** hồ
  sơ chứ không của một tệp. Trùng khít ⇒ đỏ. Trùng **sau chuẩn hoá đồng hình** (bỏ dấu tiếng Việt,
  `0↔o`, `1↔l↔i`, `5↔s`, bỏ ký tự phân cách) ⇒ chỉ **nêu ra**, không tự từ chối — "gây nhầm lẫn" là
  phán đoán của người, không phải của máy. Cùng lúc, mã thoát tách `thiếu dữ kiện` khỏi `sai hình
  dạng`: thiếu **không** còn làm bộ chấm đỏ.
- **Vì sao:** hai chỗ nói ngược nhau. Chuẩn §2 viết *khai đúng thì hồ sơ được tiếp nhận, dù khai
  "chưa đạt"; chỉ khai sai sự thật mới là căn cứ từ chối* — nhưng bộ chấm gộp THIẾU vào rổ hỏng, nên
  một hồ sơ hợp lệ khai thật lòng "tôi chưa đạt" vẫn làm cổng đỏ. Cổng đỏ vĩnh viễn là cổng bị người
  ta học cách bỏ qua, và lúc đó nó không gác gì nữa.
- **Gãy gì nếu bám bản cũ:** kịch bản nào đang đọc mã thoát của `check-registration.mjs` như "0 =
  mọi hồ sơ đã đủ dữ kiện" sẽ hiểu sai — 0 nay chỉ nói *không có hồ sơ nào sai hình dạng và không có
  `platform_id` trùng khít*; hồ sơ thiếu dữ kiện vẫn cho 0. Muốn biết còn thiếu thì đọc dòng tổng
  kết, đừng đọc mã thoát.

## 2026-08-15 — Tiêu chí biên nhận `T-RECEIPT` vào đặc tả toán (`Specs/Math-Spec.md` §13)

- **Đổi gì:** câu hỏi *"biên nhận đã ký = quyền ngay, hay đơn chờ tới khi neo on-chain?"* được chốt
  là **hỏi sai kiểu** và thay bằng một tiêu chí cấu trúc: biên nhận thành quyền ngay lúc ký ⟺ **bên
  chịu thiệt nếu nó sai chính là bên đã kiểm nó**, bằng chứng cứ bên đòi tiền không bịa được
  (`T-RECEIPT`, dẫn từ `T-NO-THIRD-PARTY`). Hệ quả thi công: **một** kiểu biên nhận mang tham số
  `W`, không hai kiểu. Nội dung này trước nằm trong một bản nháp ở `_Agents/` — thư mục bị
  `.gitignore`, nên một quyết định load-bearing đang sống ngoài repo. Nay chuyển vào đặc tả.
- **Vì sao:** hội đồng bốn chuyên gia không hội tụ vì hai bên đang nói về hai đường thanh toán khác
  nhau của LampNet. Tiêu chí cấu trúc giải tán câu hỏi thay vì chọn một vế.
- **Gãy gì nếu bám bản cũ:** ai đang chờ một quyết định "entitlement hay pending" cho **mọi** biên
  nhận sẽ chờ mãi — câu trả lời phụ thuộc đường thanh toán. Và ai định siết thêm phép kiểm để đưa
  đường pool về `W = 0` đang làm việc vô ích: `T-RECEIPT` hỏi **ai chịu thiệt**, không hỏi kiểm
  chặt tới đâu.

## 2026-08-13 — Tách đặc tả toán ra tệp riêng (`Specs/Math-Spec.md`)

- **Đổi gì:** phát biểu hình thức của mười một bất biến `PK1…PK11`, mô hình tin cậy khi định tuyến
  phí, và bảng kẻ tấn công **chuyển** khỏi `Specs/CONTRACT.md` (§8 và §3.2 của bản trước) sang
  `Specs/Math-Spec.md`. `CONTRACT.md` giữ lại một **chỉ mục ý định** một dòng mỗi bất biến, trỏ sang.
- **Vì sao:** Registry ở tầng hạ tầng nền và là hai validator on-chain, nên chuẩn StandardSpec đòi đủ
  bốn đặc tả — đang thiếu hẳn đặc tả toán. Nội dung đã tồn tại, chỉ nằm sai chỗ.
- **Gãy gì nếu bám bản cũ:** ai trích `CONTRACT.md §8` để lấy phát biểu đầy đủ sẽ chỉ còn thấy một
  dòng tóm tắt. Đường dẫn mới: `Specs/Math-Spec.md` §7 (bất biến), §6.2 (tin cậy), §8 (kẻ tấn công),
  §14 (giới hạn).

## 2026-08-13 — Mệnh đề duy nhất `platform_id` bị khai thẳng là KHÔNG chứng minh được

- **Đổi gì:** mệnh đề "`platform_id` duy nhất" được phát biểu hình thức (`P-UNIQUE`) rồi **bác bằng
  phản ví dụ hai giao dịch** trong `Specs/Math-Spec.md` §14 L1, thay vì để nó nằm lẫn trong phần
  known-gap của `CONTRACT.md`.
- **Vì sao:** `registry_beacon` không one-shot, nên on-chain không biết một `platform_id` đã từng
  được đúc. Để nó trông như đã chứng minh là mời người ta tin sai.
- **Gãy gì nếu bám bản cũ:** ai đọc `PK3` rồi tưởng tính duy nhất được bảo đảm bằng mật mã đang
  định tuyến phí trên một giả định sai. Van thay thế: kiểm trùng ở SDK + kỷ luật ký của authority.

## 2026-08-13 — Bốn đặc tả được ghi trạng thái thật là CHƯA DUYỆT

- **Đổi gì:** thêm khối siêu dữ liệu (phiên bản, trạng thái, tầng phạm vi, người viết, người duyệt,
  ngày cập nhật) vào đầu mọi tệp trong `Specs/`, dùng bộ trạng thái đóng của StandardSpec. Mọi tệp
  ghi `DRAFT` và "chưa ai duyệt".
- **Vì sao:** chuẩn quy định phía sau chỉ được bắt đầu khi đặc tả phía trước đã duyệt. Không tệp nào
  từng qua cổng đó. Đánh dấu duyệt hộ ai là làm hỏng chính cái cổng.
- **Gãy gì nếu bám bản cũ:** ai từng đọc dòng "khung interface đã chốt" trong `Feat-Spec.md` và hiểu
  là đã duyệt thì hiểu sai — "chốt" ở đó nghĩa là tác giả không tự đổi nữa, không phải đã qua duyệt.

## 2026-08-13 — Hạ các con số kiểm thử không kiểm chứng được

- **Đổi gì:** trong `Specs/Exec-Spec.md`, hai mục "Tiêu chí xong" đang đánh dấu hoàn thành kèm
  "137 pass" và "86 test xanh" bị hạ xuống chưa hoàn thành, thay số bằng **lệnh kiểm**
  (`cd onchain && aiken check`, `cd offchain && npm test`). Mục tương tự ở `Specs/README.md` bỏ hẳn số.
- **Vì sao:** các số đó đo ngày 2026-07-29 ở cây Treasury, trước đợt sửa validator v2, nên không còn
  đối chiếu được từ nội dung repo. Số chép tay tạo ra một sự thật không ai kiểm lại được.
- **Gãy gì nếu bám bản cũ:** ai trích "86 test xanh" làm bằng chứng cho mốc M4 đang trích một con số
  không có nguồn sống. Chạy lệnh, đừng chép số.

## 2026-08-13 — Đổi tên `Specs/ONBOARDING.md` thành `Specs/onboarding.md`

- **Đổi gì:** đổi tên tệp cho khớp quy ước (viết hoa toàn bộ chỉ dành cho từ viết tắt).
- **Vì sao:** dọn nốt đợt đổi tên theo StandardSpec đã làm ở `e62cb5e` (TECH→Tech-Spec,
  FEAT→Feat-Spec, EXEC→Exec-Spec) nhưng bỏ sót tệp này.
- **Gãy gì nếu bám bản cũ:** mọi liên kết `Specs/ONBOARDING.md` chết. Đã vá ở `Specs/README.md`.
  **Còn hai chỗ ngoài thư mục `Specs/` chưa vá** — `README.md` gốc repo (hai chỗ) và
  `REGISTRATION-STANDARD.md`. Kiểm bằng
  `grep -rn 'ONBOARDING' --include='*.md' . | grep -v '/_Agents/'`.

## 2026-08-13 — Tiêu đề tệp đổi từ "PlatformKit" sang "Registry"

- **Đổi gì:** bốn tệp trong `Specs/` mở đầu bằng tiêu đề "PlatformKit" (tên module cũ) đổi sang
  "Registry"; các chỗ dùng "PlatformKit" như **tên module** trong thân tệp cũng đổi theo.
- **Vì sao:** PlatformKit là tên lớp này khi nó còn sống trong repo LAMP. Giữ tên cũ ở tiêu đề làm
  người đọc tưởng đây là hai thứ khác nhau.
- **Gãy gì nếu bám bản cũ:** chữ "PlatformKit" **còn lại có chủ ý** ở những chỗ chỉ **đường dẫn lịch
  sử trong repo LAMP** (`PlatformKit/offchain/...`). Đừng đổi nốt những chỗ đó — đổi là làm chết
  đường dẫn thật.

## 2026-08-13 — Cặp `ChangeLog.md` + `DevStatus.md` ở gốc repo

- **Đổi gì:** dựng hai tệp này theo rule vệ sinh nhà agent (`$SYSTEME_HOME/_rules/agent-hygiene.md`
  §3). Repo một module ⟹ một cặp ở gốc.
- **Vì sao:** đã đo được ba vụ mất công sức cùng một cơ chế ở các repo khác — không có nơi nào ghi
  "đã build cái gì, và nó đang ở đâu".
- **Gãy gì nếu bám bản cũ:** agent nào còn quét repo để đoán hiện trạng là đang làm sai quy trình.
  Đọc `DevStatus.md` trước.
