#!/usr/bin/env node
// Soát neo `tệp:dòng` — cổng máy cho một lớp lỗi mà mọi vòng rà bằng mắt đều bỏ sót.
//
// Vì sao có tệp này: tài liệu của kho trích mã bằng toạ độ (`platform.ak:134`). Toạ độ HẾT ĐÚNG
// mỗi lần ai đó chèn một dòng vào tệp đích — và nó hết đúng LẶNG LẼ, vì dòng ấy vẫn tồn tại, chỉ
// nói chuyện khác. Kiểm "dòng có tồn tại không" là mức YẾU: một neo trôi 33 dòng vẫn trỏ vào một
// dòng có thật. Số đo 2026-09-02 trên chính kho này: phép yếu cho ra 6 neo hỏng, CẢ 6 là báo động
// giả (dữ liệu giả của bộ kiểm), trong khi 16 neo trôi thật thì nó im.
//
// Nên bộ này kiểm mức MẠNH: neo phải trỏ vào chỗ có ĐỊNH DANH mà câu văn quanh nó nêu. Cách lấy
// định danh: mọi tên trong dấu nháy ngược ở 160 ký tự ngay trước neo, giữ lại tên nào THẬT SỰ là
// ký hiệu định nghĩa trong kho (bảng ký hiệu rút từ `pub fn` / `const` / `export …`).
//
//   node tools/check-anchors.mjs             # soát toàn kho
//   node tools/check-anchors.mjs --liet-ke   # in thêm mọi neo đã qua
//
// Mã thoát: 0 = mọi neo trong kho còn đúng; 1 = có neo chết hoặc neo trôi.
//
// ⚠ HAI GIỚI HẠN, đọc trước khi tin con số nó in ra:
//
// 1. ĐỘ PHỦ THẤP. Đo 2026-09-02: 224 neo trong kho, chỉ 21 neo có tên ký hiệu cạnh bên để soát
//    được — chưa tới 10%. "0 neo hỏng" của bộ này KHÔNG có nghĩa mọi neo đều đúng; nó có nghĩa
//    mọi neo SOÁT ĐƯỢC đều đúng. Đừng đọc rộng hơn thế.
// 2. KHÔNG GÁC ĐƯỢC NEO SANG KHO KHÁC (`LAMP/…`, `VeDataIO/Specs/Glint-Math.md:384`). Kho kia đổi
//    mà kho này không hay. Chúng được ĐẾM và IN ra để đừng ai tưởng đã được gác. Nếp bù lại
//    (chuẩn §"Trích theo nội dung"): neo ra ngoài kho thì trích bằng `grep -n "<câu>"` rồi mới
//    lấy số dòng — và ghi ĐƯỜNG ĐẦY ĐỦ, vì tên trần không phân giải được khi có hai bản cùng tên
//    (ca thật: hai bản `Glint-Math.md` lệch nhau 11 dòng).
//
// Điều kiện nghiệm thu, đặt TRƯỚC khi viết: chèn một dòng trống vào đầu
// `onchain/lib/magiclamp/registry/platform.ak` thì bộ này phải ĐỎ. Cổng nào không đỏ dưới đúng
// đột biến nó sinh ra để gác thì không phải cổng.

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, normalize, resolve } from 'node:path'

// Gốc kho lấy từ THƯ MỤC ĐANG ĐỨNG, không lấy từ đường của chính tệp này. Lý do đo được
// 2026-09-02: bản đầu suy gốc bằng `<đường tệp>/..`, và khi tệp nằm tạm ngoài kho thì
// `git ls-files` chạy ở kho KHÁC ⟹ ra 0 neo và in "không có neo hỏng". Một cổng báo xanh vì
// không tìm thấy gì để soát là kiểu hỏng tệ nhất — nó không sai, nó chỉ không nói gì.
// `--show-toplevel` cũng đúng khi tệp đã về `tools/`, vì CI chạy từ gốc kho.
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const LIET_KE = process.argv.includes('--liet-ke')

const tracked = execFileSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
// `tools/fixtures/**` là dữ liệu GIẢ của bộ chấm hồ sơ — neo trong đó cố ý trỏ vào hư không.
// Không loại thì mỗi lượt chạy đẻ 6 báo động giả, và một cổng kêu oan thì bị tắt.
const DOC = tracked.filter((f) => /\.(md|ak|ts|mjs)$/.test(f) && !f.startsWith('tools/fixtures/'))
const TRONG_KHO = new Set(tracked)

// ── bảng ký hiệu ────────────────────────────────────────────────────────────────
// Vì sao phải lọc qua bảng này: câu văn tiếng Việt có rất nhiều thứ nằm trong nháy ngược mà không
// phải ký hiệu (`fail`, `main`, tên trường trong một khối JSON). Bắt chúng thì cổng kêu oan. Chỉ
// tên NÀO có định nghĩa thật trong kho mới được dùng làm căn cứ — sai sót lệch về phía BỎ QUA,
// không lệch về phía tố oan. Đó cũng chính là lý do độ phủ thấp; đánh đổi có ý thức.
const DINH_NGHIA =
  /(?:^|\s)(?:pub\s+)?(?:fn|const|type|validator)\s+([a-z_][A-Za-z0-9_]*)|export\s+(?:async\s+)?(?:function|const|type|interface|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g
const KY_HIEU = new Set()
for (const f of tracked.filter((x) => /\.(ak|ts|mjs)$/.test(x))) {
  for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(DINH_NGHIA)) {
    const ten = m[1] ?? m[2]
    if (ten && ten.length >= 4) KY_HIEU.add(ten)
  }
}

const NEO = /([A-Za-z0-9_./-]+\.(?:ak|ts|mjs|sh|json|toml))[:](\d+)(?:-(\d+))?/g
const TEN_TRONG_NHAY = /`([A-Za-z_][A-Za-z0-9_]{3,})`/g

/** Phân giải đường trích về đường trong kho. `null` = không thuộc kho này. */
function phanGiai(dich, nguon) {
  const canh = normalize(join(dirname(nguon), dich))
  if (TRONG_KHO.has(canh)) return canh
  if (TRONG_KHO.has(dich)) return dich
  const duoi = tracked.filter((f) => f.endsWith('/' + dich))
  // Nhiều hơn một khớp = tên trần không phân giải được. Trả `null` (coi như ngoài tầm) thay vì
  // đoán bừa: đoán sai ở đây tố oan một neo đang đúng.
  return duoi.length === 1 ? duoi[0] : null
}

const noiDung = new Map()
const docDong = (f) => {
  if (!noiDung.has(f)) noiDung.set(f, readFileSync(join(ROOT, f), 'utf8').split('\n'))
  return noiDung.get(f)
}

let trongKho = 0
let ngoaiKho = 0
let daKiem = 0
const hong = []

for (const f of DOC) {
  for (const [i, ln] of readFileSync(join(ROOT, f), 'utf8').split('\n').entries()) {
    for (const m of ln.matchAll(NEO)) {
      const dich = phanGiai(m[1], f)
      if (!dich) {
        ngoaiKho++
        continue
      }
      trongKho++
      const a = Number(m[2])
      const b = Number(m[3] ?? m[2])
      const L = docDong(dich)
      const o = `${f}:${i + 1}`
      if (a < 1 || b > L.length) {
        hong.push(`${o}  NEO CHẾT  ${m[0]} — \`${dich}\` chỉ có ${L.length} dòng`)
        continue
      }
      const truoc = ln.slice(Math.max(0, m.index - 160), m.index)
      // Bỏ tên TRÙNG TÊN TỆP ĐÍCH (`registry_beacon` khi trích `registry_beacon.ak`). Gọi tên một
      // tệp KHÔNG phải một khẳng định về dòng, nên đòi nó xuất hiện tại dòng đó là tố oan.
      const tenTep = dich.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
      const ten = [...truoc.matchAll(TEN_TRONG_NHAY)]
        .map((x) => x[1])
        .filter((x) => KY_HIEU.has(x) && x !== tenTep)
      if (ten.length === 0) continue
      daKiem++
      // Cửa sổ soát = khoảng đã trích, NỚI tới hết KHỐI bao quanh dòng `a`.
      // Vì sao phải nới: câu văn thường nêu một TRƯỜNG (`governance_ref`) rồi trích tới HÀM ép
      // trường đó (`platform.ak:209` = `pub fn entry_well_formed`). Tên trường nằm trong THÂN hàm,
      // không nằm trên dòng chữ ký. Bản đầu chỉ soát đúng khoảng đã trích nên tố oan 6 neo ĐANG
      // ĐÚNG — đo 2026-09-02, ngay sau khi sửa xong đợt trôi. Một cổng kêu oan thì bị tắt.
      //
      // ⚠ Đánh đổi, nói thẳng vì nó làm YẾU điều kiện nghiệm thu: neo lệch 1-2 dòng vẫn rơi trong
      // cùng khối ⟹ bộ này KHÔNG đỏ. Nó bắt neo trôi XA — hàng chục dòng, rơi sang khối khác —
      // đúng loại đã xảy ra thật (platform.ak lệch +33, registry.ak +17). Đừng đọc "xanh" thành
      // "mọi neo chính xác tới từng dòng".
      // ĐỘ NHẠY ĐO ĐƯỢC (2026-09-02, chèn 1 dòng trống vào đầu `platform.ak`): bộ đỏ, nhưng chỉ
      // **1 / 18** neo soát được kêu lên. Nghiệm thu ĐẠT (đỏ dưới đúng đột biến nó sinh ra để
      // gác), nhưng biên an toàn mỏng: đúng một neo đang gánh phép thử ấy.
      let het = b
      while (het < L.length && het - a < 40 && !/^\}/.test(L[het])) het++
      const doan = L.slice(a - 1, Math.max(b, het + 1)).join('\n')
      // So SAU KHI CHUẨN HOÁ: gương off-chain viết `platformId` cho đúng cái mà on-chain gọi là
      // `platform_id`. Cùng một thứ, hai quy ước đặt tên — so thô thì tố oan mọi neo trỏ từ tài
      // liệu (viết theo tên on-chain) sang mã TypeScript.
      const chuan = (x) => x.toLowerCase().replace(/_/g, '')
      const doanC = chuan(doan)
      if (!ten.some((x) => doanC.includes(chuan(x)))) {
        hong.push(
          `${o}  NEO TRÔI  ${m[0]} — câu văn nêu ${ten.map((x) => '`' + x + '`').join(', ')}, ` +
            `nhưng dòng ${a}${b !== a ? '-' + b : ''} của \`${dich}\` không có tên nào trong số đó`,
        )
      } else if (LIET_KE) {
        console.log(`  qua   ${o} → ${m[0]}`)
      }
    }
  }
}

console.log(
  `Neo trong kho: ${trongKho} (soát được nội dung: ${daKiem}) · neo sang kho khác: ${ngoaiKho} — KHÔNG gác được`,
)
// Tỉ lệ MÙ phải đi cùng câu kết luận, không nằm ở một dòng riêng phía trên.
//
// Bản trước in "Không có neo chết hay neo trôi trong số soát được" rồi thoát 0. Câu ấy đúng
// từng chữ và vẫn bị đọc thành "kho sạch neo", vì mệnh đề giới hạn nằm ở cuối câu còn con số
// nói lên sức nặng của giới hạn thì ở một dòng khác. Đo lúc viết dòng này: 215 neo trong kho,
// soát được nội dung 15 — tức phép rà đang mù ở 93% số neo mà vẫn thoát 0.
//
// Không đổi sang thoát 1: cổng sẽ đỏ vĩnh viễn và bị tắt, mất cả phần 7% đang gác thật. Cái
// sửa được ở đây là làm trạng thái mù KÊU TO HƠN trạng thái sạch, theo đúng luật ba trạng
// thái — khớp · lệch · KHÔNG ĐO ĐƯỢC.
const muTuyetDoi = trongKho - daKiem
const tiLeMu = trongKho === 0 ? 0 : Math.round((muTuyetDoi / trongKho) * 100)
if (hong.length === 0) {
  if (muTuyetDoi > 0) {
    console.log(
      `⚠ KHÔNG ĐO ĐƯỢC ${muTuyetDoi}/${trongKho} neo (${tiLeMu}%) — phép rà chỉ soát nội dung được ${daKiem} neo.\n` +
      `  Câu dưới đây CHỈ nói về ${daKiem} neo đó. Nó KHÔNG nói kho sạch neo trôi.`
    )
  }
  console.log(`Không có neo chết hay neo trôi trong ${daKiem}/${trongKho} neo soát được.`)
  process.exit(0)
}
console.log(`\n${hong.length} neo hỏng:`)
for (const h of hong) console.log('  ✗ ' + h)
process.exit(1)
