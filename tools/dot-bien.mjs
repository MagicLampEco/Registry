#!/usr/bin/env node
//
// Đo ĐỘ PHỦ THẬT của bộ kiểm on-chain, bằng đột biến: gỡ hẳn từng ràng buộc `expect` trong
// validator rồi chạy trọn bộ kiểm. Chốt nào gỡ ra mà KHÔNG bài nào đỏ là chốt không có bài
// kiểm nào canh riêng nó.
//
// ══ Vì sao cần phép đo này ══
//
// Một bài kiểm âm tính đỏ ĐÚNG chốt mang tên nó KHÔNG chứng minh bài đó canh chốt đó. Bài có
// thể chết ở một ràng buộc SỚM HƠN trong cùng luồng, vẫn đỏ, vẫn mang cái tên ấy, và không ai
// nhìn ra. Đo lần đầu trên kho này: 16 trong 52 chốt gỡ ra mà 0 bài đỏ — trong đó có `R-SIG`,
// cổng kiểm duyệt của cửa đúc. Nguyên nhân chung ở 11/16: bài âm tính lệch ca hợp lệ ở HAI chỗ,
// chỗ thứ hai thêm vào vì "đằng nào cũng đỏ trước đó rồi".
//
// Số bài xanh KHÔNG phải số đo độ phủ. Đây mới là.
//
// ══ Cách cắt phạm vi một chốt: CÂN BẰNG NGOẶC, không phải thụt lề ══
//
// Bản đầu cắt bằng thụt lề và mù đúng 6 chốt: với `expect or {` thụt 8 mà dòng đóng khối thụt
// 10, phép so `thụt ≤ thụt-của-expect` nhảy qua dòng đóng thật rồi bắt vào dấu `}` đóng CẢ HÀM
// ⇒ bản đột biến nuốt luôn phần đuôi ⇒ không biên dịch ⇒ phép đo im lặng. Cùng lỗi với biểu
// thức trải nhiều dòng (`expect a == f(\n x,\n y,\n)`): coi là một dòng, thay dòng đầu, để lại
// các dòng tham số làm rác cú pháp.
//
// Phạm vi một biểu thức là chỗ mọi ngoặc nó mở đã đóng. Cách người viết thụt lề không liên quan.
//
// ══ Ba trạng thái, đọc cho đúng ══
//
//   đỏ ≥ 1   chốt CÓ bài canh riêng.
//   đỏ = 0   chốt HỞ — không bài nào canh. Trừ khi nó tương đương logic với một chốt khác,
//            hoặc bị bao hàm bởi một phép gán liền sau; hai ca đó phải chứng minh bằng cách gỡ
//            CẢ CẶP (gỡ cặp mà ra đỏ thì hành vi vẫn được ghim, chỉ ghim theo cặp).
//   đỏ = -1  KHÔNG ĐO ĐƯỢC — trạng thái MÙ, phải kêu TO HƠN trạng thái hở. Một bản đột biến
//            không biên dịch được thì nó không nói gì về độ phủ cả.
//
// ══ Dùng ══
//
//   node tools/dot-bien.mjs               quét cả hai validator (~10 phút)
//   node tools/dot-bien.mjs --dong 261    chỉ đo các chốt ở số dòng đã nêu (lặp cờ được)
//
// Script khôi phục tệp gốc sau MỖI chốt, và đo lại nền ở cuối. Nền khác 0 nghĩa là việc khôi
// phục đã hỏng và toàn bộ kết quả phải bỏ đi.

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ONCHAIN = `${GOC}/onchain`
const TEP = ['validators/registry.ak', 'validators/registry_beacon.ak']

// `expect` dùng làm PHÉP GÁN (binding) không phải một chốt: gỡ nó thì mất tên dùng ở dưới, và
// bản đột biến không biên dịch được vì lý do chẳng nói gì về độ phủ.
const LA_GAN =
  /expect\s+(Some\s*\(|\[|InlineDatum|[A-Za-z_][A-Za-z0-9_]*\s*[:=]|[A-Z][A-Za-z0-9_]*\s*\{)/

const chiDong = process.argv
  .map((a, i) => (a === '--dong' ? Number(process.argv[i + 1]) : null))
  .filter((n) => Number.isInteger(n))

// Chú thích `//` không được tính vào phép đếm ngoặc.
function boChuThich(d) {
  const i = d.indexOf('//')
  return i === -1 ? d : d.slice(0, i)
}

function cuoiBieuThuc(dong, i) {
  let can = 0
  for (let j = i; j < dong.length; j++) {
    for (const c of boChuThich(dong[j])) {
      if (c === '(' || c === '[' || c === '{') can++
      else if (c === ')' || c === ']' || c === '}') can--
    }
    if (can <= 0) return j
  }
  return -1
}

function demBaiDo() {
  const doc = (out) => {
    const m = [...out.matchAll(/"failed":\s*(\d+)/g)].map((x) => Number(x[1]))
    return m.length === 0 ? null : m.reduce((a, b) => a + b, 0)
  }
  try {
    const n = doc(
      execSync('aiken check 2>&1', { cwd: ONCHAIN, encoding: 'utf8', maxBuffer: 1 << 28 }),
    )
    return n === null ? { do: -1, ghiChu: 'KHÔNG ĐỌC ĐƯỢC số bài đỏ' } : { do: n, ghiChu: '' }
  } catch (e) {
    const n = doc(String(e.stdout ?? '') + String(e.stderr ?? ''))
    return n === null ? { do: -1, ghiChu: 'KHÔNG BIÊN DỊCH ĐƯỢC' } : { do: n, ghiChu: '' }
  }
}

const ketQua = []

for (const f of TEP) {
  const duong = `${ONCHAIN}/${f}`
  const goc = readFileSync(duong, 'utf8')
  const dong = goc.split('\n')

  const chot = []
  for (let i = 0; i < dong.length; i++) {
    if (!/^\s*expect\s/.test(dong[i])) continue
    if (LA_GAN.test(dong[i])) continue
    if (chiDong.length > 0 && !chiDong.includes(i + 1)) continue
    const cuoi = cuoiBieuThuc(dong, i)
    if (cuoi === -1) {
      console.error(`  ${f}:${i + 1}  ⚠ KHÔNG cắt được phạm vi — chốt này chưa được đo`)
      continue
    }
    chot.push({ tu: i, den: cuoi, ten: dong[i].trim() })
  }

  console.error(`${f}: ${chot.length} chốt`)

  for (const c of chot) {
    const bien = dong.slice()
    const thut = dong[c.tu].match(/^\s*/)[0]
    bien.splice(c.tu, c.den - c.tu + 1, `${thut}expect True`)
    writeFileSync(duong, bien.join('\n'))
    const r = demBaiDo()
    writeFileSync(duong, goc)

    ketQua.push({
      tep: f,
      dong: c.tu + 1,
      soDong: c.den - c.tu + 1,
      chot: c.ten,
      baiDo: r.do,
      ghiChu: r.ghiChu,
    })
    console.error(
      `  :${c.tu + 1}  đỏ=${r.do}${r.ghiChu ? ' ' + r.ghiChu : ''}  ${c.ten.slice(0, 70)}`,
    )
  }
}

const nen = demBaiDo()
console.error(`\nNỀN sau khôi phục: đỏ=${nen.do} (phải bằng 0)${nen.ghiChu ? ' ' + nen.ghiChu : ''}`)
if (nen.do !== 0) {
  console.error('⛔ Nền KHÔNG xanh — việc khôi phục tệp đã hỏng, BỎ toàn bộ kết quả ở trên.')
}

const ho = ketQua.filter((k) => k.baiDo === 0)
const mu = ketQua.filter((k) => k.baiDo === -1)
console.error(`\n═══ ${ketQua.length} chốt ═══`)
console.error(`  ${ketQua.length - ho.length - mu.length} chốt CÓ bài canh riêng`)
console.error(`  ${ho.length} chốt gỡ ra mà 0 bài đỏ  ⇐ KHÔNG có bài canh`)
console.error(`  ${mu.length} chốt KHÔNG ĐO ĐƯỢC  ⇐ trạng thái MÙ, nặng hơn hở`)
for (const h of ho) console.error(`  HỞ  ${h.tep}:${h.dong}  ${h.chot}`)
for (const m of mu) console.error(`  MÙ  ${m.tep}:${m.dong}  ${m.ghiChu}  ${m.chot}`)

process.exitCode = nen.do === 0 ? 0 : 1
