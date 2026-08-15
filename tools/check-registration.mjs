#!/usr/bin/env node
// Chấm hồ sơ đăng ký bằng máy.
//
// Vì sao có tệp này: chừng nào hồ sơ còn là văn xuôi thì "duyệt" là một hành vi của con người,
// và một hành vi của con người thì không kiểm lại được. Hồ sơ khai bằng MÃ từ tập đóng
// (Registrations/codes.json) thì hạng niêm yết TÍNH RA được, và người giữ quyền đăng ký chuyển
// từ vai người phán xử sang vai người đối chiếu.
//
//   node tools/check-registration.mjs                      # chấm mọi hồ sơ
//   node tools/check-registration.mjs Registrations/join.md # chấm một hồ sơ
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
  else if (!r.hop_le) hong++
}
console.log(
  `\n${files.length} tệp · ${files.length - hong - chuaNop} hợp lệ về hình dạng · ` +
  `${hong} sai hình dạng · ${chuaNop} chưa nộp`
)
// Chưa nộp KHÔNG phải lỗi — đội chưa điền là chuyện bình thường. Chỉ SAI hình dạng mới đỏ.
process.exit(hong === 0 ? 0 : 1)
