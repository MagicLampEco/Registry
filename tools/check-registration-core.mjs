// LÕI chấm hồ sơ đăng ký — phần THUẦN, nhập được, KHÔNG in gì và KHÔNG gọi process.exit.
//
// Vì sao tách khỏi `check-registration.mjs`: chừng nào hồ sơ còn là văn xuôi thì "duyệt" là một
// hành vi của con người, và một hành vi của con người thì không kiểm lại được. Hồ sơ khai bằng
// MÃ từ tập đóng (Registrations/codes.json) thì hạng niêm yết TÍNH RA được. Nhưng chừng nào
// phép chấm đó còn nằm chung tệp với vòng lặp in ra màn hình + `process.exit`, thì KHÔNG bài
// kiểm nào gọi lại được nó — nhập tệp là chạy cả CLI. Chặng 2 của luồng đăng ký vì thế không
// nối được với chặng 3 (dựng giao dịch) trong cùng một bài kiểm. Tệp này gỡ đúng chỗ đó.
//
// Ranh giới: tệp này chỉ kiểm hồ sơ có khai ĐỦ và ĐÚNG HÌNH DẠNG không. Nó KHÔNG kiểm lời khai
// có đúng sự thật không — căn cứ từ chối R3 vẫn là việc của người đối chiếu. Và nó KHÔNG kiểm
// R1 (trùng platform_id): R1 là tính chất của TẬP hồ sơ, nằm ở CLI.
//
// Bên dùng: `tools/check-registration.mjs` (CLI) và `tests/e2eRegistrationFlow.test.ts`.
// Kiểu cho TypeScript: `tools/check-registration-core.d.mts` — sửa hàm nào thì sửa cả tệp đó.

import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CODES = JSON.parse(readFileSync(join(ROOT, 'Registrations/codes.json'), 'utf8'))

export const AXES = ['identity', 'token', 'custody', 'infra']

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
export function loiKhuonPid(raw) {
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
// "nhánh" / "branch". Quy ước đã được chép sang Registrations/template.md:84-93 — sửa một bên
// thì phải sửa bên kia, bằng không bên nộp không đoán được máy chờ gì.
//
// ⚠ Đây là phép kiểm ĐỊNH DẠNG, không phải phép kiểm sự thật. Nó KHÔNG chạy `git branch
// --contains` hay `git cat-file -e` như chuẩn §3 mô tả, nên một SHA bịa đúng hình dạng vẫn qua.
// Hai lệnh đó là việc của NGƯỜI duyệt. Đừng đọc bộ chấm xanh ra thành "con trỏ đã được kiểm".
const CT_FILELINE = /[\w./-]+\.[A-Za-z0-9]+:\d+/
const CT_SHA = /\b[0-9a-fA-F]{7,40}\b/
const CT_NHANH = /(?:nhánh|nhanh|branch)\s+\S+/i
const CT_CHUA_GOP = /CHƯA GỘP/

function conTroDuBaThu(v) {
  const t = String(v)
  // Chứng cứ on-chain thay được cả ba thứ: một tx hash tra được bằng explorer thì không cần
  // nhánh với SHA. Nhánh này là thứ Registrations/template.md:93 đã hứa với bên nộp; thiếu nó
  // thì mẫu và máy nói ngược nhau — và CT_SHA {7,40} cũng không đỡ được, vì 64 hex trượt khuôn.
  if (CO_TX.test(t)) return true
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
  // Ô KHAI, không phải cổng. Nó không quyết định hạng và không từ chối ai — nó chỉ làm hiện ra
  // một cụm hồ sơ cùng chủ, thứ mà mọi trần "mỗi bên tối đa X%" đang ngầm giả định là không có.
  chu_so_huu: (v) => {
    const t = String(v).trim()
    if (t.length < 3) return 'phải dài ít nhất 3 ký tự — một tên gọi được, không phải một dấu chấm'
    if (GIU_CHO.has(t.toLowerCase())) return 'đang là chỗ giữ chỗ, chưa phải một lời khai'
    return null
  },
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
function rankOf(axis, code) {
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

export function checkOne(path) {
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
    ranks[axis] = rankOf(axis, code)
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
      loi.push(`trục "${axis}" mã "${code}": đây là căn cứ TỪ CHỐI (${spec.label})`)
    }
  }

  // 4. hạng chứng thực của từng lời khẳng định
  //
  // EV-1/EV-2 là lời xin uy tín, nên con trỏ của nó phải kiểm được. Không đạt thì HẠ về EV-0 và
  // nói rõ vì sao — không làm đỏ: chuẩn §3 viết "EV-0 vẫn bán được", nó chỉ không cấp uy tín.
  //
  // Luật ba-thứ áp cho CẢ EV-1, không riêng EV-2. Bản trước chỉ áp từ hạng 2 trở lên, nên EV-1
  // chỉ phải qua sàn tối thiểu (≥8 ký tự, không phải giữ chỗ) — đo được: đổi một dòng khẳng định
  // của tools/fixtures/day-du-L3.md sang EV-1 với con trỏ "khong-co-gi-o-day" thì hồ sơ vẫn chấm
  // ra L3, tức hạng cấp uy tín và quyền biểu quyết, mở bằng một chuỗi bịa 17 ký tự. Chuẩn §3 viết
  // "MỌI con trỏ chứng cứ phải mang ba thứ" — chỗ này là chỗ máy nói hẹp hơn chuẩn nó phục vụ.
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
      } else if (!conTroDuBaThu(p)) {
        canh.push(
          `lời khẳng định "${e.claim}" khai ${e.tier} nhưng con trỏ không mang đủ ba thứ ` +
          `(file:line + tên nhánh + SHA, hoặc "CHƯA GỘP" kèm tên nhánh) và cũng không có tx hash ` +
          `64 hex — HẠ về EV-0. Nhận được: ${moTa(p)}`
        )
        rank = 0
      }
    }
    evMin = evMin === null ? rank : Math.min(evMin, rank)
  }

  // 5. vế MÁY ĐỌC ĐƯỢC của R2 (R1 ở tệp CLI vì nó cần cả tập hồ sơ; R3 không kiểm bằng máy)
  //
  // R2 có HAI vế và chuẩn nối chúng bằng "VÀ": ô đầu mối trống **và** mục (e) không nêu ai tiếp
  // nhận khi đội ngừng duy trì. Máy chỉ đọc được vế thứ nhất — vế thứ hai là văn xuôi trong mục
  // (e), không có ô json nào giữ nó (`pointers.nguoi_tiep_nhan_khi_ngung` có trong mẫu nhưng
  // không mã nào đòi và không dòng mã nào đọc). Nên chỗ này NÊU vế 1, KHÔNG kết luận R2: kết
  // luận là việc của người duyệt sau khi đọc mục (e). Bản trước phát biểu thẳng "đây là CĂN CỨ
  // TỪ CHỐI", tức máy kết một điều nó mới thấy một nửa.
  let r2Ve1 = false
  const lienHe = data.pointers?.dau_moi_lien_he
  if (lienHe === undefined || lienHe === null || String(lienHe).trim() === '') {
    r2Ve1 = true
    loi.push(
      'R2 vế 1/2 — ô đầu mối chịu trách nhiệm (pointers.dau_moi_lien_he) đang trống. CHƯA đủ để ' +
      'kết luận R2: vế 2 là "mục (e) không nêu ai tiếp nhận nếu đội ngừng duy trì", và máy không ' +
      'đọc được văn xuôi mục (e). Người duyệt đọc mục (e) rồi kết — REGISTRATION-STANDARD.md §5.'
    )
  } else {
    const sai = KHUON_NEED.dau_moi_lien_he(lienHe)
    if (sai) {
      loi.push(`pointers.dau_moi_lien_he ${sai} — nhận được: ${moTa(lienHe)} (R2, REGISTRATION-STANDARD.md §5)`)
      saiKhuon = true
    }
  }

  // 5b. ô chủ sở hữu — TUỲ CHỌN, và cố ý tuỳ chọn.
  //
  // Vì sao không bắt buộc: tập từ chối của §5 là tập ĐÓNG, ba mã. Biến một ô mới thành điều kiện
  // tiếp nhận là dựng căn cứ từ chối thứ tư bằng một dòng mã, đúng thứ chuẩn vừa gỡ đi. Nên ô này
  // khai thì máy gom cụm được, không khai thì hồ sơ vẫn hợp lệ — và bộ chấm NÊU ra rằng nó không
  // gom được, thay vì im lặng coi như mỗi hồ sơ một chủ.
  const chuSoHuu = data.pointers?.chu_so_huu
  const coChuSoHuu = !(chuSoHuu === undefined || chuSoHuu === null || String(chuSoHuu).trim() === '')
  if (coChuSoHuu) {
    const sai = KHUON_NEED.chu_so_huu(chuSoHuu)
    if (sai) {
      loi.push(`pointers.chu_so_huu ${sai} — nhận được: ${moTa(chuSoHuu)}`)
      saiKhuon = true
    }
  } else {
    canh.push(
      'pointers.chu_so_huu chưa khai — hồ sơ vẫn hợp lệ, nhưng mọi trần dạng "mỗi bên tối đa X%" ' +
      'đếm HỒ SƠ chứ không đếm NGƯỜI, nên không khai thì cụm hồ sơ cùng chủ không hiện ra ở đâu.'
    )
  }

  // 6. tính hạng niêm yết
  const tier = tinhHang(ranks, evMin, data)

  return {
    path, hop_le: loi.length === 0, loi, canh, tier,
    platform_id: data.platform_id, pid_hop_khuon: pidHopKhuon, sai_khuon: saiKhuon, ranks, evMin,
    // Cờ để CLI gắn đúng nhãn. Không dò chữ trong thông báo — thông báo là để người đọc, cờ là
    // để máy đọc; buộc hai thứ vào nhau thì sửa câu chữ là làm hỏng phân loại.
    r2_ve1: r2Ve1,
    // Chuỗi chủ sở hữu đã khai (hoặc null). CLI gom cụm bằng trường này — cụm là tính chất của
    // TẬP hồ sơ, không của một hồ sơ, nên nó không thể tính ở đây.
    chu_so_huu: coChuSoHuu ? String(chuSoHuu).trim() : null,
    // Khối khai THÔ đã rút ra được. CLI không đọc trường này; nó có ở đây để chặng sau của
    // luồng (dựng giao dịch) lấy được lời khai từ CHÍNH lượt chấm, thay vì tự bóc lại khối
    // json một lần nữa. Hai đường bóc là hai đường lệch nhau được — một đường thì không.
    khai: data,
  }
}

function tinhHang(ranks, evMin, data) {
  const dat = (req) => {
    for (const [k, v] of Object.entries(req)) {
      if (k === 'token_not') {
        // "không phải mã X" KHÔNG được thoả bằng cách không khai gì. Bản trước chỉ hỏi
        // `v.includes(data.declares?.token)`, nên một hồ sơ vắng hẳn trục token — kể cả bản sao
        // mẫu chưa điền — vẫn đạt L0 vì `undefined` không nằm trong danh sách cấm.
        const khai = data.declares?.token
        if (khai === undefined || khai === null || String(khai).trim() === '') return false
        if (v.includes(khai)) return false
        continue
      }
      if (k === 'evidence_min') { if (evMin === null || evMin < v) return false; continue }
      const axis = k.replace(/_min$/, '')
      if (ranks[axis] === null || ranks[axis] === undefined || ranks[axis] < v) return false
    }
    return true
  }
  // Lấy hạng CAO NHẤT thoả, theo trường `rank` khai trong codes.json. Bản trước lấy "cái cuối
  // cùng thoả" theo thứ tự khoá JSON — đúng kết quả hôm nay chỉ vì listing_tiers tình cờ viết
  // tăng dần; đảo thứ tự hai khoá là đổi hạng của mọi hồ sơ trong im lặng.
  let best = null
  for (const [id, spec] of Object.entries(CODES.listing_tiers)) {
    if (id.startsWith('_')) continue
    if (typeof spec.rank !== 'number') {
      throw new Error(`listing_tiers.${id} thiếu trường "rank" — không xếp được thứ tự hạng`)
    }
    if (!dat(spec.require)) continue
    if (best === null || spec.rank > best.rank) best = { id, label: spec.label, rank: spec.rank }
  }
  return best === null ? null : { id: best.id, label: best.label }
}

