// Bài kiểm này gác một đường ĐỨT, không gác một tính năng.
//
// `tools/check-registration-core.d.mts` là bản khai kiểu VIẾT TAY cho một lõi JavaScript thuần, và
// chính nó tự ghi ở đầu tệp: "KHÔNG tự đồng bộ với lõi". Không có gì buộc hai bản khớp nhau — thêm
// một trường vào `.mjs` mà quên `.d.mts` thì không lệnh nào kêu.
//
// Đo thật 2026-08-30: thêm trường `chu_so_huu` vào lõi, quên bản khai kiểu. Bộ test 215/215 xanh
// (vitest biên dịch bằng esbuild, ném bỏ kiểu), bộ chấm hồ sơ xanh, `tools/test-check.sh` 18 đúng.
// Duy nhất `tsc` đỏ — và nó đỏ chỉ vì TÌNH CỜ có một bài kiểm TypeScript chạm đúng trường mới.
// Bài kiểm ấy viết bằng `.mjs` thì lệch đi thẳng qua CI.
//
// Nên phép kiểm ở đây không hỏi "trường này đúng kiểu chưa" — `tsc` làm việc đó rồi. Nó hỏi thứ
// `tsc` không hỏi được: lõi có đang trả về một khoá mà bản khai kiểu chưa biết tên hay không.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkOne } from "../tools/check-registration-core.mjs";

const GOC = join(fileURLToPath(new URL(".", import.meta.url)), "..");

let workDir: string;
beforeAll(() => { workDir = mkdtempSync(join(tmpdir(), "registry-khai-kieu-")); });
afterAll(() => { rmSync(workDir, { recursive: true, force: true }); });

function tepTam(name: string, than: string): string {
  const p = join(workDir, `${name}.md`);
  writeFileSync(p, than);
  return p;
}

/** Tên trường khai trong `interface KetQuaCham` — bóc bằng văn bản, vì kiểu không tồn tại lúc chạy. */
function truongDaKhai(): Set<string> {
  const src = readFileSync(join(GOC, "tools/check-registration-core.d.mts"), "utf8");
  const than = src.match(/export interface KetQuaCham \{([\s\S]*?)\n\}/);
  if (!than) throw new Error("không tìm thấy interface KetQuaCham — bản khai kiểu đã đổi hình dạng");
  const ten = new Set<string>();
  for (const dong of (than[1] ?? "").split("\n")) {
    const m = dong.match(/^\s{2}([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
    if (m?.[1]) ten.add(m[1]);
  }
  if (ten.size === 0) throw new Error("bóc ra 0 trường — phép bóc hỏng, không phải khai kiểu rỗng");
  return ten;
}

describe("bản khai kiểu phải phủ hết khoá lõi thật trả về", () => {
  const hoSoDayDu = {
    platform_id: "khai-kieu",
    spec_version: 2,
    declares: { identity: "ID-3", token: "TK-1", custody: "CU-1", infra: "IN-3" },
    pointers: {
      dau_moi_lien_he: "ai-do@vi-du.example",
      repo: "MagicLampEco/vi-du",
      con_tro: "src/danh-tinh/phoenixkey.ts:142 · nhánh main · SHA 5c0da0371f2b8ae4",
      instance_id: "khai-kieu-instance-01",
      custody_hash:   "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
      seed_policy:    "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
      governance_ref: "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
      governance_ref_tinh_chat:
        "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; " +
        "G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
      accepted_assets: ["LAMP"],
      cut_bps: 250,
      chu_so_huu: "Công ty Ví Dụ",
    },
    evidence: [{ claim: "doanh thu", tier: "EV-2", pointer: "tx " + "52fc9630da741eb8".repeat(4) }],
  };

  it("nhánh chấm ĐẦY ĐỦ không trả về khoá nào lạ với bản khai kiểu", () => {
    const p = tepTam("day-du", "# hồ sơ thử\n\n```json registration\n" + JSON.stringify(hoSoDayDu, null, 2) + "\n```\n");
    const la = Object.keys(checkOne(p)).filter((k) => !truongDaKhai().has(k));
    expect(la).toEqual([]);
  });

  it("nhánh DỪNG SỚM cũng vậy — đường thoát sớm là chỗ dễ quên nhất", () => {
    // Tệp không có khối khai ⇒ `checkOne` thoát ở nhánh riêng, trả một hình dạng khác hẳn.
    const p = tepTam("chua-nop", "# hồ sơ thử\n\nchưa có khối khai nào.\n");
    const la = Object.keys(checkOne(p)).filter((k) => !truongDaKhai().has(k));
    expect(la).toEqual([]);
  });

  it("phép bóc tự nó phải bắt được một trường bịa — nếu không, hai bài trên xanh vô nghĩa", () => {
    expect(truongDaKhai().has("chu_so_huu")).toBe(true);
    expect(truongDaKhai().has("mot_truong_khong_ton_tai")).toBe(false);
  });
});
