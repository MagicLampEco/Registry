import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLATFORM_ENTRY_FIELDS } from "../offchain/src/registryDatum.js";

/**
 * Cổng chống trôi số trường giữa MÃ và TÀI LIỆU.
 *
 * Vì sao cổng này tồn tại, bằng ca thật: `substrate_flags` vào lược đồ ngày 2026-09-02
 * (11 → 12 trường). Mã và bài kiểm arity đi theo ngay. Tài liệu thì không — và ba ngày
 * sau, 9 vị trí trong `Specs/**` + `DevStatus.md` + `REGISTRATION-STANDARD.md` vẫn khai
 * 11, trong đó `Tech-Spec.md` mang một bảng thứ tự trường đánh chỉ số 0..10 dừng ở
 * `status`. Bảng đó là **hợp đồng liên bên**: một đội ngoài dựng bộ giải mã từ nó sẽ
 * dựng ra 11 trường, và mọi tx họ ký bị validator từ chối bằng "validator crashed" —
 * không bằng một lỗi nói được.
 *
 * Không cổng nào cũ bắt được: cổng soát neo kiểm **neo** chứ không kiểm **khẳng định**,
 * nên nó xanh kể cả khi một dòng vừa được ai đó chạm vào đang nói một con số đã sai.
 *
 * ⚠ Cổng này KHÔNG được im khi nó không đo được gì. Quét ra 0 dòng thì đó là trạng thái
 * MÙ (tệp đổi tên, mẫu đổi cách viết), và trạng thái mù phải kêu TO HƠN trạng thái lệch
 * — nên nó đỏ, chứ không xanh vì "không tìm thấy vi phạm nào".
 */

const GOC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TEP_QUET = [
  "Specs/Tech-Spec.md",
  "Specs/Math-Spec.md",
  "Specs/CONTRACT.md",
  "DevStatus.md",
  "REGISTRATION-STANDARD.md",
] as const;

/**
 * Dấu LỊCH SỬ — một dòng mang dấu này được nói con số khác, vì nó đang kể một trạng thái
 * đã qua chứ không khai trạng thái hiện hành. Danh sách ĐÓNG, và cố ý hẹp: nới nó ra là
 * cách rẻ nhất để vô hiệu hoá chính cổng này.
 */
const DAU_LICH_SU = [
  "v1",
  "bản trước",
  "LỊCH SỬ",
  "hết đúng",
  "đã hết đúng",
];

const MAU_SO_TRUONG = /(\d+)\s+trường/g;

/**
 * Ngưỡng tách khẳng định-về-TỔNG khỏi khẳng định-về-NHÓM-CON.
 *
 * Tài liệu nói "N trường" cho cả hai thứ, và bắt nhầm nhóm con thì cổng kêu ở ca hợp lệ
 * rồi bị ai đó tắt — mất cả cổng. Lần đầu thử tách bằng ĐỊNH NGỮ đi sau chữ "trường"
 * (`6 trường định danh`), và cách đó SAI ĐẠI LƯỢNG: tiếng Việt đặt định ngữ cả trước
 * (`Khả biến (5 trường)`) lẫn sau, nên mẫu vị trí bỏ lọt đúng một nửa số ca.
 *
 * Tách bằng số học thì không có chỗ cho vị trí câu chữ xen vào: nhóm con lớn nhất của
 * lược đồ là 6 (định danh — PK4), nên **mọi con số ≥ 9 chỉ có thể là một khẳng định về
 * tổng arity** (9 và 11 là hai giá trị arity lịch sử, 12 là hiện hành).
 *
 * Rào ngược, nói trước để người sau khỏi phải đoán: nếu về sau có một nhóm con ≥ 9 thì
 * cổng này kêu ở một ca hợp lệ. Cách xử ĐÚNG lúc đó là thêm dấu vào `DAU_LICH_SU` hoặc
 * nâng ngưỡng kèm lý do — KHÔNG phải nới mẫu cho tới khi nó thôi kêu.
 */
const NGUONG_ARITY = 9;

describe("số trường PlatformEntry — mã và tài liệu không được trôi khỏi nhau", () => {
  it(`mọi khẳng định "N trường" trong tài liệu phải bằng ${PLATFORM_ENTRY_FIELDS}, trừ dòng mang dấu lịch sử`, () => {
    const viPham: string[] = [];
    let tongDongKhop = 0;

    for (const tep of TEP_QUET) {
      const duong = resolve(GOC, tep);
      // Tệp không đọc được là KHÔNG ĐO ĐƯỢC, không phải "không có vi phạm".
      let noiDung: string;
      try {
        noiDung = readFileSync(duong, "utf8");
      } catch {
        viPham.push(`${tep}: KHÔNG ĐỌC ĐƯỢC — cổng mù ở tệp này`);
        continue;
      }

      noiDung.split("\n").forEach((dong, i) => {
        for (const khop of dong.matchAll(MAU_SO_TRUONG)) {
          const so = Number(khop[1]);
          if (so < NGUONG_ARITY) continue; // nhóm con, không phải khẳng định về tổng
          tongDongKhop++;
          if (so === PLATFORM_ENTRY_FIELDS) continue;
          if (DAU_LICH_SU.some((d) => dong.includes(d))) continue;
          viPham.push(`${tep}:${i + 1} khai "${khop[0]}" — mã đang ở ${PLATFORM_ENTRY_FIELDS}`);
        }
      });
    }

    // Trạng thái thứ ba: quét chạy xong mà không khớp dòng nào ⇒ phép đo đã chết.
    expect(
      tongDongKhop,
      "cổng KHÔNG đo được gì: 0 dòng khớp mẫu `N trường`. Tệp đã đổi tên, hay tài liệu đổi cách viết? Sửa mẫu/danh sách tệp, đừng để cổng xanh khi nó mù.",
    ).toBeGreaterThan(0);

    expect(viPham, `\n${viPham.join("\n")}\n`).toEqual([]);
  });

  it("hằng gương khớp số trường mà bộ giải mã thật dùng", () => {
    const nguon = readFileSync(resolve(GOC, "offchain/src/registryDatum.ts"), "utf8");
    // Chỉ số cao nhất mà `decodePlatformEntry` đọc phải là PLATFORM_ENTRY_FIELDS - 1.
    const chiSo = [...nguon.matchAll(/c\.fields\[(\d+)\]/g)].map((m) => Number(m[1]));
    expect(
      chiSo.length,
      "cổng KHÔNG đo được gì: không tìm thấy chỗ nào đọc `c.fields[n]`",
    ).toBeGreaterThan(0);
    expect(Math.max(...chiSo)).toBe(PLATFORM_ENTRY_FIELDS - 1);
  });
});
