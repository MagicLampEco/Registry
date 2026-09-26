import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Bảng đối chiếu mã ràng buộc on-chain ↔ đặc tả ↔ SDK off-chain.
 *
 * Mỗi ràng buộc validator ép mang một mã (`R-WF`, `U-GOV2`, `M-DEST`…). Bài này đỏ khi một mã có ở
 * validator mà thiếu dòng tương ứng ở `Specs/Tech-Spec.md` hoặc ở `offchain/src/`. Thiếu ở đặc tả thì
 * bên tích hợp đọc đặc tả không biết có ràng buộc đó. Thiếu ở off-chain thì không ai nói được gương
 * của nó nằm đâu, hay vì sao không gương được.
 *
 * Ca thật sinh ra bài này: `R-GOVDIST` (chặn giả mạo đồng thuận qua `custody_hash`) và `R-CAP`
 * (trần 32 phần tử `accepted_assets`). `registry_beacon.ak` ép cả hai, `tests/shapeMirror.test.ts`
 * có bài gương cho cả hai, nhưng `Tech-Spec.md` tả khối `R-WF` mà không nhắc tới, và mã off-chain
 * hiện thực gương mà không gắn tên. Không bài kiểm nào đỏ.
 *
 * "Có dòng ở phía bên kia" nghĩa là mã XUẤT HIỆN ở đó, dù trong mã hay trong chú thích. Như vậy khối
 * chú thích "KHÔNG GƯƠNG ĐƯỢC Ở TẦNG NÀY" trong `registrationBuilder.ts` cũng tính là một dòng. Bài
 * này ghim việc mỗi mã có CHỖ ĐỨNG ở cả ba phía. Nó KHÔNG ghim việc gương làm đúng; việc đó là của
 * `shapeMirror.test.ts` và các bài gương khác.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Mã ràng buộc: một chữ cái cửa (R đăng ký · U cập nhật · M di trú · S chung), gạch ngang, tên hoa. */
const CODE_RE = /\b[RSUM]-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g;

/**
 * Mã xuất hiện ở on-chain nhưng KHÔNG phải một ràng buộc. Mỗi dòng phải nói vì sao.
 */
const ONCHAIN_NOT_CONSTRAINT: Record<string, string> = {
  "S-REG": "tiêu đề nhóm `S-REG-*` trong chú thích platform.ak, không phải một chốt",
};

/**
 * Mã chỉ có ở off-chain, cố ý không có ràng buộc on-chain cùng tên. Mỗi dòng phải nói vì sao.
 */
const OFFCHAIN_ONLY: Record<string, string> = {
  "U-BEACON":
    "đối chiếu bộ script truyền vào với beacon_policy hồ sơ đang mang — on-chain không cần, vì validator CHÍNH LÀ bộ script đó",
  "M-GOVSELF-OWN":
    "chặn ghi governance_ref = hash registry CŨ khi di trú; on-chain chặn cùng hiện tượng bằng M-GOVSELF-OUT ở đầu ra",
};

function codesIn(text: string): Set<string> {
  return new Set(text.match(CODE_RE) ?? []);
}

function readAll(dir: string, keep: (f: string) => boolean): string {
  return readdirSync(join(ROOT, dir))
    .filter(keep)
    .map((f) => readFileSync(join(ROOT, dir, f), "utf8"))
    .join("\n");
}

const onchainText = [
  readAll("onchain/validators", (f) => f.endsWith(".ak") && !f.endsWith("_test.ak")),
  readAll("onchain/lib/magiclamp/registry", (f) => f.endsWith(".ak")),
].join("\n");
const specText = readFileSync(join(ROOT, "Specs/Tech-Spec.md"), "utf8");
const offchainText = readAll("offchain/src", (f) => f.endsWith(".ts"));

const onchainCodes = [...codesIn(onchainText)].filter((c) => !(c in ONCHAIN_NOT_CONSTRAINT)).sort();
const specCodes = codesIn(specText);
const offchainCodes = codesIn(offchainText);

describe("đối chiếu mã ràng buộc on-chain ↔ đặc tả ↔ off-chain", () => {
  it("phép quét đo được: tập mã on-chain không rỗng và đủ cả ba cửa", () => {
    // Trạng thái MÙ phải đỏ: đổi tên thư mục hay đổi cách viết mã thì tập rỗng, và mọi bài dưới xanh
    // vì "không có mã nào thiếu".
    for (const gate of ["R-", "U-", "M-"]) {
      expect(onchainCodes.filter((c) => c.startsWith(gate)).length, `cửa ${gate}`).toBeGreaterThan(5);
    }
  });

  it("mọi mã on-chain có mặt trong Specs/Tech-Spec.md", () => {
    expect(onchainCodes.filter((c) => !specCodes.has(c))).toEqual([]);
  });

  it("mọi mã on-chain có chỗ đứng trong offchain/src (gương, hoặc lời giải thích vì sao không gương)", () => {
    expect(onchainCodes.filter((c) => !offchainCodes.has(c))).toEqual([]);
  });

  it("mọi mã off-chain hoặc có ở on-chain, hoặc được khai là chỉ-off-chain kèm lý do", () => {
    const onchain = new Set(onchainCodes);
    const orphans = [...offchainCodes].filter((c) => !onchain.has(c) && !(c in OFFCHAIN_ONLY)).sort();
    expect(orphans).toEqual([]);
  });

  it("danh sách ngoại lệ không mang mã đã chết", () => {
    // Một ngoại lệ ở lại sau khi mã của nó biến mất là một lời khai không còn đúng về điều gì.
    const onchainAll = codesIn(onchainText);
    expect(Object.keys(ONCHAIN_NOT_CONSTRAINT).filter((c) => !onchainAll.has(c))).toEqual([]);
    expect(Object.keys(OFFCHAIN_ONLY).filter((c) => !offchainCodes.has(c))).toEqual([]);
    expect(Object.keys(OFFCHAIN_ONLY).filter((c) => onchainAll.has(c))).toEqual([]);
  });
});
