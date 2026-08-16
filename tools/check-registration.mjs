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

// ── Cổng ký tự cho platform_id — GÁC TRƯỚC, không lọc rồi chạy tiếp ──────────────────────────
//
// Bản trước "làm sạch" chuỗi bằng `.replace(/[^a-z0-9]/g, '')` trước khi so trùng. Cách đó sai
// CẢ HAI CHIỀU, đo được:
//   · "chаt" (chữ "а" Kirin U+0430) → "cht": ký tự Kirin bị XOÁ nên nó không còn đụng "chat"
//     ⇒ ÂM TÍNH GIẢ — đúng ca tấn công mà R1 sinh ra để chặn thì lọt.
//   · "cht" — một tên thật, hợp lệ — cũng chuẩn hoá ra "cht" ⇒ DƯƠNG TÍNH GIẢ, hai tên khác
//     hẳn nhau bị gộp làm một.
// Chuỗi ngoài khuôn phải bị TỪ CHỐI chứ không được xoá cho vừa. Qua cổng này rồi thì chuỗi chỉ
// còn [a-z0-9-], nên phép gấp đồng hình phía dưới chạy trên một miền đóng và không đoán mò nữa.
const KHUON_PID = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/

const diemMa = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`

/** null = đạt. Ngược lại trả thông báo nêu khuôn mong đợi + ký tự vi phạm đầu tiên kèm code point. */
function loiKhuonPid(raw) {
  const s = String(raw)
  if (KHUON_PID.test(s)) return null
  const xau = [...s].find((ch) => !/[a-z0-9-]/.test(ch))
  const vi = xau
    ? `ký tự vi phạm đầu tiên: "${xau}" (${diemMa(xau)})`
    : 'mọi ký tự đều hợp lệ nhưng độ dài (3–32) hoặc ký tự đầu/cuối sai'
  return (
    `sai khuôn — mong đợi ${KHUON_PID.source}: chữ thường ASCII, chữ số và gạch nối; ` +
    `bắt đầu bằng chữ, kết thúc bằng chữ hoặc số; ${vi}`
  )
}

// ── Khuôn của từng dữ kiện ───────────────────────────────────────────────────────────────────
//
// Vì sao cần: bản trước mọi `needs` chỉ kiểm KHÁC RỖNG. Đo được — một hồ sơ gõ chữ "x" vào cả
// tám ô, `evidence` khai EV-1 với con trỏ rỗng, vẫn chấm ra L3, tức hạng cấp quyền biểu quyết.
// Hạng niêm yết được quảng cáo là "TÍNH RA từ mã đã khai", nên đầu vào phải kiểm được bằng máy;
// nếu không, hạng chỉ phản ánh số ký tự người ta gõ.
const HEX28 = /^[0-9a-f]{56}$/ // hash / policy id 28 byte
const CO_TX = /\b[0-9a-f]{64}\b/ // tx hash 32 byte nằm trong một câu con trỏ
const GIU_CHO = new Set(['x', 'xx', 'n/a', 'tbd', 'todo', '-', '?'])

// Con trỏ chứng cứ phải mang BA thứ: `file:line` + tên nhánh + SHA — hoặc chữ "CHƯA GỘP" kèm
// tên nhánh. Nguồn: REGISTRATION-STANDARD.md §3, mục "Con trỏ vào mã nguồn phải mang ba thứ".
// Chuẩn KHÔNG cho cú pháp máy đọc, nên quy ước tối thiểu đặt ở đây: tên nhánh viết sau chữ
// "nhánh" / "branch". Quy ước này cần được chép vào Registrations/template.md ở lần cập nhật
// chuẩn kế tiếp — bằng không bên nộp không đoán được máy chờ gì.
const CT_FILELINE = /[\w./-]+\.[A-Za-z0-9]+:\d+/
const CT_SHA = /\b[0-9a-f]{7,40}\b/
const CT_NHANH = /(?:nhánh|nhanh|branch)\s+\S+/i
const CT_CHUA_GOP = /CHƯA GỘP/

function conTroDuBaThu(v) {
  const t = String(v)
  if (CT_CHUA_GOP.test(t)) return CT_NHANH.test(t)
  return CT_FILELINE.test(t) && CT_SHA.test(t) && CT_NHANH.test(t)
}

/**
 * SÀN TỐI THIỂU cho các ô chưa có khuôn máy đọc được.
 * Đây là sàn TẠM, KHÔNG phải phép kiểm sự thật: nó chỉ chặn ô bị gõ cho có. Kiểm lời khai có
 * đúng không là R3, và R3 không kiểm bằng máy được (REGISTRATION-STANDARD.md §5).
 */
function sanToiThieu(v) {
  const s = String(v).trim()
  if (GIU_CHO.has(s.toLowerCase())) return `là giá trị giữ chỗ ("${s}")`
  if (s.length < 8) return `chỉ dài ${s.length} ký tự, sàn tối thiểu là 8`
  return null
}

/** Sàn tối thiểu áp cho cả mảng: mọi phần tử phải qua sàn. */
function sanFor(v) {
  if (Array.isArray(v)) {
    for (const it of v) {
      const s = sanToiThieu(it)
      if (s) return `phần tử "${it}" ${s}`
    }
    return null
  }
  return sanToiThieu(v)
}

const KHUON_NEED = {
  governance_ref: (v) =>
    HEX28.test(String(v)) ? null : 'phải là 56 ký tự hex thường (script hash 28 byte)',
  custody_hash: (v) =>
    HEX28.test(String(v)) ? null : 'phải là 56 ký tự hex thường (hash 28 byte)',
  seed_policy: (v) =>
    HEX28.test(String(v)) ? null : 'phải là 56 ký tự hex thường (policy id 28 byte)',
  beacon_policy: (v) =>
    HEX28.test(String(v)) ? null : 'phải là 56 ký tự hex thường (policy id 28 byte)',
  dau_moi_lien_he: (v) =>
    /@/.test(String(v)) || String(v).startsWith('https://')
      ? null
      : 'phải chứa "@" hoặc bắt đầu bằng "https://" — đầu mối phải chạm được người thật',
  cut_bps: (v) =>
    Number.isInteger(v) && v >= 0 && v <= 10000 ? null : 'phải là số nguyên trong [0, 10000]',
  accepted_assets: (v) => (Array.isArray(v) && v.length > 0 ? null : 'phải là mảng không rỗng'),
}

const CON_TRO_CHUNG_CU = new Set(['con_tro', 'con_tro_cong_phat_hanh'])

/** Trích gọn giá trị đã nhận để in vào thông báo lỗi — người sửa phải thấy máy đọc ra cái gì. */
function moTa(v) {
  const s = JSON.stringify(v) ?? String(v)
  return s.length > 70 ? `${s.slice(0, 67)}…` : s
}

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
  // Hai kiểu hỏng khác hẳn nhau, và nhãn phải khác nhau: ô TRỐNG (chưa điền — chuẩn §2 nói vẫn
  // tiếp nhận được) khác hẳn ô SAI KHUÔN (đã điền, nhưng điền thứ máy không đọc được).
  let saiKhuon = false

  const { data, err, chua_nop } = extractBlock(src)
  if (err) return { path, hop_le: false, chua_nop, sai_khuon: !chua_nop, loi: [err], tier: null }

  // 1. trường bắt buộc
  for (const f of ['platform_id', 'spec_version', 'declares']) {
    if (data[f] === undefined) loi.push(`thiếu trường bắt buộc: ${f}`)
  }
  if (data.spec_version !== CODES.spec_version) {
    canh.push(`spec_version hồ sơ = ${data.spec_version}, codes.json = ${CODES.spec_version}`)
  }

  // 1b. cổng ký tự của platform_id — chạy trên chuỗi THÔ, trước mọi phép chuẩn hoá
  let pidHopKhuon = false
  if (data.platform_id !== undefined) {
    const sai = loiKhuonPid(data.platform_id)
    if (sai) {
      loi.push(`platform_id ${sai}`)
      saiKhuon = true
    } else {
      pidHopKhuon = true
    }
  }

  // 2. mọi trục phải khai, và mã phải thuộc tập đóng
  const ranks = {}
  for (const axis of AXES) {
    const code = data.declares?.[axis]
    if (!code) { loi.push(`trục "${axis}" chưa khai mã`); continue }
    const spec = CODES.axes[axis].codes[code]
    if (!spec) {
      loi.push(`trục "${axis}": mã "${code}" không có trong tập đóng — xem Registrations/codes.json`)
      saiKhuon = true
      continue
    }
    ranks[axis] = rankOf(axis, code, data.declares)
    if (ranks[axis] === null) canh.push(`trục "${axis}" mã "${code}": hạng phải tra hồ sơ khác, chưa chấm tự động được`)

    // 3. mã nào đòi thêm dữ kiện thì phải có đủ VÀ ĐÚNG HÌNH DẠNG
    let khuyet = false
    for (const need of spec.needs ?? []) {
      const v = data.pointers?.[need]
      const rong = v === undefined || v === null || v === '' ||
                   (Array.isArray(v) && v.length === 0)
      if (rong) {
        loi.push(`trục "${axis}" mã "${code}" đòi pointers.${need} — đang trống`)
        khuyet = true
        continue
      }

      const khuon = KHUON_NEED[need]
      if (khuon) {
        const sai = khuon(v)
        if (sai) {
          loi.push(`trục "${axis}" mã "${code}": pointers.${need} ${sai} — nhận được: ${moTa(v)}`)
          saiKhuon = true
          khuyet = true
        }
        continue
      }

      const duoiSan = sanFor(v)
      if (duoiSan) {
        loi.push(`trục "${axis}" mã "${code}": pointers.${need} ${duoiSan} — nhận được: ${moTa(v)}`)
        saiKhuon = true
        khuyet = true
        continue
      }

      // Con trỏ chứng cứ: chuẩn §3 nói con trỏ thiếu SHA trên `main` "chấm ở HẠNG THẤP HƠN, dù
      // mã đúng đến đâu" — nên hậu quả ở đây là HẠ HẠNG, KHÔNG phải từ chối. Biến nó thành lỗi
      // đỏ là dựng một căn cứ từ chối thứ tư ngoài tập đóng R1/R2/R3 của §5.
      if (CON_TRO_CHUNG_CU.has(need) && !conTroDuBaThu(v)) {
        canh.push(
          `trục "${axis}" mã "${code}": pointers.${need} chưa mang đủ ba thứ (file:line + tên ` +
          `nhánh + SHA, hoặc "CHƯA GỘP" kèm tên nhánh) — REGISTRATION-STANDARD.md §3 ⇒ hạ hạng ` +
          `trục "${axis}", KHÔNG phải căn cứ từ chối. Nhận được: ${moTa(v)}`
        )
        khuyet = true
      }
    }
    // Dữ kiện bắt buộc chưa đủ hoặc chưa đọc được thì hạng của trục KHÔNG tính ra được. Đây là
    // đúng câu bộ chấm vẫn tự nói ở cuối tệp — "ô trống hạ HẠNG NIÊM YẾT" — mà trước đây không làm.
    if (khuyet) ranks[axis] = null

    if (spec.tu_choi) {
      loi.push(`trục "${axis}" mã "${code}": đây là căn cứ TỪ CHỐI (${CODES.tu_choi.R3 ? '' : ''}${spec.label})`)
    }
  }

  // 4. hạng chứng thực của từng lời khẳng định
  //
  // EV-1/EV-2 là lời xin uy tín, nên con trỏ của nó phải kiểm được. Không đạt thì HẠ về EV-0 và
  // nói rõ vì sao — không làm đỏ: chuẩn §3 viết "EV-0 vẫn bán được", nó chỉ không cấp uy tín.
  let evMin = null
  for (const e of data.evidence ?? []) {
    const t = CODES.evidence_tiers[e.tier]
    if (!t) { loi.push(`hạng chứng thực "${e.tier}" không có trong tập đóng`); saiKhuon = true; continue }
    let rank = t.rank
    if (rank >= 1) {
      const p = e.pointer
      const rong = p === undefined || p === null || String(p).trim() === ''
      const kem = rong ? 'đang trống' : sanFor(p)
      if (kem) {
        canh.push(`lời khẳng định "${e.claim}" khai ${e.tier} nhưng con trỏ ${kem} — HẠ về EV-0`)
        rank = 0
      } else if (rank >= 2 && !conTroDuBaThu(p) && !CO_TX.test(String(p))) {
        canh.push(
          `lời khẳng định "${e.claim}" khai ${e.tier} nhưng con trỏ không mang đủ ba thứ ` +
          `(file:line + tên nhánh + SHA) và cũng không có tx hash 64 hex — HẠ về EV-0. ` +
          `Nhận được: ${moTa(p)}`
        )
        rank = 0
      }
    }
    evMin = evMin === null ? rank : Math.min(evMin, rank)
  }

  // 5. hai căn cứ từ chối kiểm được bằng máy (R2 kiểm được, R1/R3 thì không)
  //
  // R2 là CĂN CỨ TỪ CHỐI, không phải cảnh báo — bản trước đẩy vào `canh` nên hồ sơ không khai
  // đầu mối vẫn `hop_le = true`, tức bộ chấm nói ngược chuẩn mà nó phục vụ.
  const lienHe = data.pointers?.dau_moi_lien_he
  if (lienHe === undefined || lienHe === null || String(lienHe).trim() === '') {
    loi.push(
      'R2 — ô đầu mối chịu trách nhiệm (pointers.dau_moi_lien_he) đang trống. Đây là CĂN CỨ TỪ ' +
      'CHỐI theo REGISTRATION-STANDARD.md §5 (tập từ chối, R2), không phải một cảnh báo.'
    )
  } else {
    const sai = KHUON_NEED.dau_moi_lien_he(lienHe)
    if (sai) {
      loi.push(`pointers.dau_moi_lien_he ${sai} — nhận được: ${moTa(lienHe)} (R2, REGISTRATION-STANDARD.md §5)`)
      saiKhuon = true
    }
  }

  // 6. tính hạng niêm yết
  const tier = tinhHang(ranks, evMin, data)

  return {
    path, hop_le: loi.length === 0, loi, canh, tier,
    platform_id: data.platform_id, pid_hop_khuon: pidHopKhuon, sai_khuon: saiKhuon, ranks, evMin,
  }
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
