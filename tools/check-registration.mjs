#!/usr/bin/env node
// Chấm hồ sơ đăng ký bằng máy — VỎ DÒNG LỆNH.
//
// Phép chấm một hồ sơ nằm ở `tools/check-registration-core.mjs` (thuần, nhập được, không in gì).
// Tệp này giữ đúng ba việc mà lõi cố ý không làm: chọn tệp để chấm, IN ra màn hình, và kiểm R1
// — tính chất của TẬP hồ sơ, không của một hồ sơ.
//
// Vì sao có tệp này: chừng nào hồ sơ còn là văn xuôi thì "duyệt" là một hành vi của con người,
// và một hành vi của con người thì không kiểm lại được. Hồ sơ khai bằng MÃ từ tập đóng
// (Registrations/codes.json) thì hạng niêm yết TÍNH RA được, và người giữ quyền đăng ký chuyển
// từ vai người phán xử sang vai người đối chiếu.
//
//   node tools/check-registration.mjs                      # chấm mọi hồ sơ
//   node tools/check-registration.mjs Registrations/lampnet.md # chấm một hồ sơ
//
// Mã thoát: 0 = mọi hồ sơ hợp lệ về hình thức; 1 = có hồ sơ sai hình thức.
// LƯU Ý ĐÚNG PHẠM VI: bộ chấm chỉ kiểm hồ sơ có khai ĐỦ và ĐÚNG HÌNH DẠNG không. Nó KHÔNG
// kiểm lời khai có đúng sự thật không — căn cứ từ chối R3 vẫn là việc của người đối chiếu.

import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { ROOT, checkOne, loiKhuonPid } from './check-registration-core.mjs'

// ── chạy ──
const args = process.argv.slice(2)
const BO_QUA = new Set(['README.md', 'template.md', 'codes.json'])
const files = args.length
  ? args
  : readdirSync(join(ROOT, 'Registrations'))
      .filter((f) => f.endsWith('.md') && !BO_QUA.has(f))
      .map((f) => join('Registrations', f))

let hong = 0
let thieu = 0
let chuaNop = 0
for (const f of files) {
  const r = checkOne(resolve(ROOT, f))
  // Phân biệt hai kiểu hỏng: khai THIẾU (ô trống) khác hẳn khai SAI (mã lạ, JSON vỡ, sai khuôn).
  // Nhãn lấy theo cờ `sai_khuon` do checkOne đặt, không dò chữ trong thông báo.
  const chiThieu = (r.loi ?? []).length > 0 && !r.sai_khuon
  const nhan = r.chua_nop ? 'CHƯA NỘP     '
    : r.hop_le ? 'HỢP LỆ       '
    : chiThieu ? 'THIẾU DỮ KIỆN'
    : 'SAI HÌNH DẠNG'
  console.log(`\n${nhan}  ${f}${r.platform_id ? `  (platform_id=${r.platform_id})` : ''}`)
  if (!r.chua_nop) {
    // Hồ sơ SAI HÌNH DẠNG vẫn tính ra được một hạng từ các trục, nhưng in trần con số đó là mời
    // người đọc lướt tin vào nó. Hạng của một hồ sơ khai sai chưa có hiệu lực — nói thẳng ra.
    const treo = r.sai_khuon ? '  (TẠM TÍNH — hồ sơ đang SAI HÌNH DẠNG nên hạng chưa có hiệu lực)' : ''
    if (r.tier) console.log(`  hạng niêm yết tính ra: ${r.tier.id} — ${r.tier.label}${treo}`)
    else console.log('  hạng niêm yết tính ra: KHÔNG ĐẠT hạng nào')
    if (r.ranks) console.log(`  hạng từng trục: ${JSON.stringify(r.ranks)}${r.evMin !== null && r.evMin !== undefined ? `  evidence_min=${r.evMin}` : ''}`)
  }
  for (const l of r.loi ?? []) console.log(`  ✗ ${l}`)
  for (const c of r.canh ?? []) console.log(`  ! ${c}`)
  if (r.chua_nop) chuaNop++
  else if (chiThieu) thieu++
  else if (!r.hop_le) hong++
}
console.log(
  `\n${files.length} tệp · ${files.length - hong - thieu - chuaNop} hợp lệ về hình dạng · ` +
  `${thieu} thiếu dữ kiện · ${hong} sai hình dạng · ${chuaNop} chưa nộp`
)

// ── R1: platform_id trùng hoặc gây nhầm lẫn ──
//
// Vì sao quét TOÀN thư mục kể cả khi chỉ chấm một tệp: R1 là một tính chất của TẬP hồ sơ, không
// phải của một hồ sơ. Chấm lẻ một tệp mà không so với các tệp khác thì không bao giờ thấy trùng —
// đúng cái lỗ mà `Specs/Math-Spec.md` §14 L1 nói validator không đóng được, nên nó phải đóng ở đây.
//
// PHẠM VI: chỉ thấy được các hồ sơ NẰM TRONG repo này. Một beacon đã đúc trên chuỗi mà chưa có hồ
// sơ ở đây thì phép kiểm này KHÔNG thấy — van đó là `discoverPlatforms` phía SDK, không phải tệp này.
//
// Bảng đồng hình chỉ gấp các cặp MỘT ký tự. KHÔNG thêm luật gấp nếp nhiều ký tự (`rn→m`, `vv→w`)
// một cách CỐ Ý: ProofChat nêu đúng — chúng đẻ dương tính giả trên tên thật ("govern" → "govem",
// "network" → "netwok"), mà dương tính giả ở đây bắt người đối chiếu phán xử một cặp vô hại, tức
// trả lại đúng cái quyền tuỳ ý mà §5 vừa gỡ đi.
const CHUAN_HOA = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt
    .replace(/[0o]/g, '0')            // 0 ↔ o
    .replace(/[1li]/g, '1')           // 1 ↔ l ↔ i
    .replace(/[2z]/g, '2')            // 2 ↔ z
    .replace(/[3e]/g, '3')            // 3 ↔ e
    .replace(/[4a]/g, '4')            // 4 ↔ a
    .replace(/[5s]/g, '5')            // 5 ↔ s
    .replace(/[6g]/g, '6')            // 6 ↔ g
    .replace(/[7t]/g, '7')            // 7 ↔ t
    .replace(/[8b]/g, '8')            // 8 ↔ b
    .replace(/-/g, '')                // bỏ gạch nối (chuỗi đã qua cổng ký tự nên chỉ còn [a-z0-9-])

// Hồ sơ CHƯA NỘP cũng phải nằm trong tập so trùng. Bản trước lọc `.filter((x) => x.pid)` nên ba
// hồ sơ chưa có khối json (chat/trace/work) vô hình với R1: ai mở PR khai `platform_id: "chat"`
// hôm nay thì máy không thấy gì. Tên DỰ KIẾN của hồ sơ chưa nộp = tên tệp bỏ đuôi .md, và nó
// được đánh dấu nguồn `nháp` — tên nháp CHƯA phải một lời khai, nên nó chỉ NÊU chứ không làm đỏ.
const toanBo = []
for (const f of readdirSync(join(ROOT, 'Registrations')).filter((f) => f.endsWith('.md') && !BO_QUA.has(f))) {
  const r = checkOne(resolve(ROOT, 'Registrations', f))
  const file = `Registrations/${f}`
  if (r.platform_id !== undefined && r.platform_id !== null && r.platform_id !== '') {
    if (!r.pid_hop_khuon) {
      console.log(`\n! R1 — bỏ ${file} khỏi tập so trùng: platform_id ${loiKhuonPid(r.platform_id)}`)
      continue
    }
    toanBo.push({ file, pid: String(r.platform_id), nguon: 'khai' })
    continue
  }
  const duKien = f.replace(/\.md$/, '')
  if (loiKhuonPid(duKien)) {
    console.log(`\n! R1 — bỏ ${file} khỏi tập so trùng: tên tệp không dùng làm tên dự kiến được (${loiKhuonPid(duKien)})`)
    continue
  }
  toanBo.push({ file, pid: duKien, nguon: 'nháp' })
}

const theoChuan = new Map()
for (const x of toanBo) {
  const k = CHUAN_HOA(x.pid)
  if (!theoChuan.has(k)) theoChuan.set(k, [])
  theoChuan.get(k).push(x)
}

const nguonCua = (x) => `${x.file}  (tên "${x.pid}" — nguồn: ${x.nguon})`

let trungY = 0   // trùng khít giữa hai lời KHAI — căn cứ từ chối R1, đỏ
let deNham = 0   // có bên là tên nháp, hoặc chuẩn hoá về một chuỗi mà viết khác — người quyết, vàng
for (const nhom of theoChuan.values()) {
  if (nhom.length < 2) continue
  const khit = new Set(nhom.map((x) => x.pid)).size === 1
  const deuKhai = nhom.every((x) => x.nguon === 'khai')
  if (khit && deuKhai) {
    trungY++
    console.log(`\n✗ R1 — platform_id TRÙNG KHÍT: "${nhom[0].pid}"`)
  } else if (khit) {
    deNham++
    console.log(
      `\n! R1? — tên TRÙNG KHÍT nhưng ít nhất một bên mới là tên NHÁP (lấy từ tên tệp, chưa khai ` +
      `trong khối json): "${nhom[0].pid}". Tên nháp chưa phải lời khai nên KHÔNG tự từ chối.`
    )
  } else {
    deNham++
    console.log(`\n! R1? — platform_id GÂY NHẦM LẪN sau chuẩn hoá: ${nhom.map((x) => `"${x.pid}"`).join(' ~ ')}`)
  }
  for (const x of nhom) console.log(`    ${nguonCua(x)}`)
}
if (trungY === 0 && deNham === 0) {
  console.log(`R1 — ${toanBo.length} platform_id, không trùng, không cặp nào gây nhầm lẫn`)
} else if (deNham > 0 && trungY === 0) {
  console.log(
    `\nR1 — ${deNham} cặp gây nhầm lẫn. KHÔNG tự động từ chối: "gây nhầm lẫn" là phán đoán của ` +
    `người, máy chỉ nêu cặp đáng nhìn. Người đối chiếu phải quyết và ghi lý do vào nhật ký hồ sơ.`
  )
}

// ── mã thoát: chỉ hai thứ mới đỏ ──
//
// Đỏ = SAI HÌNH DẠNG (JSON vỡ, mã ngoài tập đóng, dữ kiện sai khuôn) hoặc R1 TRÙNG KHÍT giữa hai
// lời khai. Cả hai đều là "khai sai".
//
// KHÔNG đỏ: CHƯA NỘP và THIẾU DỮ KIỆN. Đây không phải khoan dung, nó là chính chuẩn:
// `REGISTRATION-STANDARD.md` §2 — *"khai đúng thì hồ sơ được tiếp nhận, dù khai 'chưa đạt'…
// Chỉ khai sai sự thật mới là căn cứ từ chối."* Ô trống hạ HẠNG NIÊM YẾT (in ở trên), nó không
// phải căn cứ từ chối. Bản trước gộp THIẾU vào cùng rổ với SAI, nên bộ chấm nói ngược chuẩn mà
// nó phục vụ — và một cổng CI dựng trên nó sẽ đỏ vĩnh viễn vì một hồ sơ hợp lệ đang chờ đội điền.
process.exit(hong === 0 && trungY === 0 ? 0 : 1)
