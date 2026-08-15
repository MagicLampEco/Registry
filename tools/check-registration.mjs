#!/usr/bin/env node
// Chấm hồ sơ đăng ký bằng máy.
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
// LƯU Ý ĐÚNG PHẠM VI: tệp này chỉ kiểm hồ sơ có khai ĐỦ và ĐÚNG HÌNH DẠNG không. Nó KHÔNG
// kiểm lời khai có đúng sự thật không — căn cứ từ chối R3 vẫn là việc của người đối chiếu.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CODES = JSON.parse(readFileSync(join(ROOT, 'Registrations/codes.json'), 'utf8'))

const AXES = ['identity', 'token', 'custody', 'infra']

/** Rút khối ```json registration ... ``` khỏi một hồ sơ. */
function extractBlock(src) {
  const m = src.match(/```json\s+registration\s*\n([\s\S]*?)\n```/)
  if (!m) return { chua_nop: true, err: 'chưa có khối ```json registration — hồ sơ chưa được nộp' }
  try {
    return { data: JSON.parse(m[1]) }
  } catch (e) {
    return { err: `khối registration không phải JSON hợp lệ: ${e.message}` }
  }
}

/** rank của một mã trên một trục. ID-A mượn hạng của hệ danh tính được trỏ tới. */
function rankOf(axis, code, declared) {
  const spec = CODES.axes[axis].codes[code]
  if (!spec) return null
  if (spec.rank !== null) return spec.rank
  if (axis === 'identity' && code === 'ID-A') {
    // Không tự suy được — phải tra hồ sơ của hệ danh tính kia. Ở đây trả về null và
    // báo "chưa chấm được", thay vì đoán một hạng.
    return null
  }
  return null
}

function checkOne(path) {
  const src = readFileSync(path, 'utf8')
  const loi = []
  const canh = []

  const { data, err, chua_nop } = extractBlock(src)
  if (err) return { path, hop_le: false, chua_nop, loi: [err], tier: null }

  // 1. trường bắt buộc
  for (const f of ['platform_id', 'spec_version', 'declares']) {
    if (data[f] === undefined) loi.push(`thiếu trường bắt buộc: ${f}`)
  }
  if (data.spec_version !== CODES.spec_version) {
    canh.push(`spec_version hồ sơ = ${data.spec_version}, codes.json = ${CODES.spec_version}`)
  }

  // 2. mọi trục phải khai, và mã phải thuộc tập đóng
  const ranks = {}
  for (const axis of AXES) {
    const code = data.declares?.[axis]
    if (!code) { loi.push(`trục "${axis}" chưa khai mã`); continue }
    const spec = CODES.axes[axis].codes[code]
    if (!spec) {
      loi.push(`trục "${axis}": mã "${code}" không có trong tập đóng — xem Registrations/codes.json`)
      continue
    }
    ranks[axis] = rankOf(axis, code, data.declares)
    if (ranks[axis] === null) canh.push(`trục "${axis}" mã "${code}": hạng phải tra hồ sơ khác, chưa chấm tự động được`)

    // 3. mã nào đòi thêm dữ kiện thì phải có đủ
    for (const need of spec.needs ?? []) {
      const v = data.pointers?.[need]
      const rong = v === undefined || v === null || v === '' ||
                   (Array.isArray(v) && v.length === 0)
      if (rong) loi.push(`trục "${axis}" mã "${code}" đòi pointers.${need} — đang trống`)
    }

    if (spec.tu_choi) {
      loi.push(`trục "${axis}" mã "${code}": đây là căn cứ TỪ CHỐI (${CODES.tu_choi.R3 ? '' : ''}${spec.label})`)
    }
  }

  // 4. hạng chứng thực của từng lời khẳng định
  let evMin = null
  for (const e of data.evidence ?? []) {
    const t = CODES.evidence_tiers[e.tier]
    if (!t) { loi.push(`hạng chứng thực "${e.tier}" không có trong tập đóng`); continue }
    evMin = evMin === null ? t.rank : Math.min(evMin, t.rank)
  }

  // 5. hai căn cứ từ chối kiểm được bằng máy (R2 kiểm được, R1/R3 thì không)
  if (!data.pointers?.dau_moi_lien_he) {
    canh.push('chưa có đầu mối liên hệ (căn cứ từ chối R2) — hồ sơ vẫn tiếp nhận được, nhưng không niêm yết được')
  }

  // 6. tính hạng niêm yết
  const tier = tinhHang(ranks, evMin, data)

  return { path, hop_le: loi.length === 0, loi, canh, tier, platform_id: data.platform_id, ranks, evMin }
}

function tinhHang(ranks, evMin, data) {
  const dat = (req) => {
    for (const [k, v] of Object.entries(req)) {
      if (k === 'token_not') { if (v.includes(data.declares?.token)) return false; continue }
      if (k === 'evidence_min') { if (evMin === null || evMin < v) return false; continue }
      const axis = k.replace(/_min$/, '')
      if (ranks[axis] === null || ranks[axis] === undefined || ranks[axis] < v) return false
    }
    return true
  }
  let best = null
  for (const [id, spec] of Object.entries(CODES.listing_tiers)) {
    if (id.startsWith('_')) continue
    if (dat(spec.require)) best = { id, label: spec.label }
  }
  return best
}

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
  // Phân biệt hai kiểu hỏng: khai THIẾU (ô trống) khác hẳn khai SAI (mã lạ, JSON vỡ).
  const chiThieu = (r.loi ?? []).length > 0 && (r.loi ?? []).every((l) => l.includes('đang trống'))
  const nhan = r.chua_nop ? 'CHƯA NỘP     '
    : r.hop_le ? 'HỢP LỆ       '
    : chiThieu ? 'THIẾU DỮ KIỆN'
    : 'SAI HÌNH DẠNG'
  console.log(`\n${nhan}  ${f}${r.platform_id ? `  (platform_id=${r.platform_id})` : ''}`)
  if (!r.chua_nop) {
    if (r.tier) console.log(`  hạng niêm yết tính ra: ${r.tier.id} — ${r.tier.label}`)
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
const CHUAN_HOA = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')  // bỏ dấu tiếng Việt
    .replace(/[0o]/g, '0')            // 0 ↔ o
    .replace(/[1li]/g, '1')           // 1 ↔ l ↔ i
    .replace(/[5s]/g, '5')            // 5 ↔ s
    .replace(/[^a-z0-9]/g, '')        // bỏ gạch, chấm, khoảng trắng

const toanBo = readdirSync(join(ROOT, 'Registrations'))
  .filter((f) => f.endsWith('.md') && !BO_QUA.has(f))
  .map((f) => {
    const r = checkOne(resolve(ROOT, 'Registrations', f))
    return { file: `Registrations/${f}`, pid: r.platform_id }
  })
  .filter((x) => x.pid)

const theoChuan = new Map()
for (const x of toanBo) {
  const k = CHUAN_HOA(x.pid)
  if (!theoChuan.has(k)) theoChuan.set(k, [])
  theoChuan.get(k).push(x)
}

let trungY = 0   // trùng khít — căn cứ từ chối R1, đỏ
let deNham = 0   // chuẩn hoá về một chuỗi nhưng viết khác nhau — người phải quyết, vàng
for (const nhom of theoChuan.values()) {
  if (nhom.length < 2) continue
  const khit = new Set(nhom.map((x) => x.pid)).size === 1
  if (khit) {
    trungY++
    console.log(`\n✗ R1 — platform_id TRÙNG KHÍT: "${nhom[0].pid}"`)
  } else {
    deNham++
    console.log(`\n! R1? — platform_id GÂY NHẦM LẪN sau chuẩn hoá: ${nhom.map((x) => `"${x.pid}"`).join(' ~ ')}`)
  }
  for (const x of nhom) console.log(`    ${x.file}`)
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
// Đỏ = SAI HÌNH DẠNG (JSON vỡ, mã ngoài tập đóng) hoặc R1 TRÙNG KHÍT. Cả hai đều là "khai sai".
//
// KHÔNG đỏ: CHƯA NỘP và THIẾU DỮ KIỆN. Đây không phải khoan dung, nó là chính chuẩn:
// `REGISTRATION-STANDARD.md` §2 — *"khai đúng thì hồ sơ được tiếp nhận, dù khai 'chưa đạt'…
// Chỉ khai sai sự thật mới là căn cứ từ chối."* Ô trống hạ HẠNG NIÊM YẾT (in ở trên), nó không
// phải căn cứ từ chối. Bản trước gộp THIẾU vào cùng rổ với SAI, nên bộ chấm nói ngược chuẩn mà
// nó phục vụ — và một cổng CI dựng trên nó sẽ đỏ vĩnh viễn vì một hồ sơ hợp lệ đang chờ đội điền.
process.exit(hong === 0 && trungY === 0 ? 0 : 1)
