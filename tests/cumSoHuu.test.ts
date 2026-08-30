// Registry · ô khai CHỦ SỞ HỮU và phép gom cụm.
//
// Vì sao ô này tồn tại: mọi trần dạng "mỗi bên tối đa X%" trong hệ đều áp trên `platform_id`, tức
// đếm HỒ SƠ chứ không đếm NGƯỜI. Sổ này là chỗ duy nhất biết có bao nhiêu định danh tồn tại, nên
// nếu nó im lặng thì không nơi nào khác trong hệ thấy được một chủ đang đứng sau mấy hồ sơ — và
// cái trần trông như đang bảo vệ, mà không.
//
// PHẠM VI — nói trước để không ai đọc rộng hơn:
//   · ô này là LỜI KHAI, không phải cổng. Không khai vẫn hợp lệ; khai sai sự thật thì đó là R3,
//     và R3 thì máy không kiểm được.
//   · gom cụm chỉ thấy hồ sơ NẰM TRONG kho này, và chỉ thấy hồ sơ CÓ KHAI. Hai bên cùng chủ mà
//     một bên không khai thì cụm không hiện — bộ chấm in thẳng câu đó ra, không để người đọc suy.
//   · "cùng chủ" KHÔNG phải căn cứ từ chối. Tập từ chối của §5 là tập ĐÓNG ba mã, và §5 nói rõ
//     cạnh tranh với thành phần sẵn có không phải lý do từ chối.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkOne } from "../tools/check-registration-core.mjs";

let workDir: string;
beforeAll(() => { workDir = mkdtempSync(join(tmpdir(), "registry-cum-")); });
afterAll(() => { rmSync(workDir, { recursive: true, force: true }); });

function nop(name: string, declaration: Record<string, unknown>): string {
  const p = join(workDir, `${name}.md`);
  writeFileSync(p, `# hồ sơ thử\n\n\`\`\`json registration\n${JSON.stringify(declaration, null, 2)}\n\`\`\`\n`);
  return p;
}

const hoSo = (pid: string, chu?: string) => ({
  platform_id: pid,
  spec_version: 2,
  declares: { identity: "ID-3", token: "TK-1", custody: "CU-1", infra: "IN-3" },
  pointers: {
    dau_moi_lien_he: "ai-do@vi-du.example",
    repo: "MagicLampEco/vi-du",
    con_tro: "src/danh-tinh/phoenixkey.ts:142 · nhánh main · SHA 5c0da0371f2b8ae4",
    instance_id: `${pid}-instance-01`,
    custody_hash:   "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
    seed_policy:    "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
    governance_ref: "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
    governance_ref_tinh_chat:
      "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; " +
      "G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
    accepted_assets: ["LAMP"],
    cut_bps: 250,
    ...(chu === undefined ? {} : { chu_so_huu: chu }),
  },
  evidence: [
    { claim: "doanh thu", tier: "EV-2", pointer: "tx " + "52fc9630da741eb8".repeat(4) },
  ],
});

describe("ô khai chủ sở hữu", () => {
  it("khai đúng thì đọc lại được, và không sinh lỗi nào", () => {
    const r = checkOne(nop("co-khai", hoSo("co-khai", "Công ty Ví Dụ")));
    expect(r.chu_so_huu).toBe("Công ty Ví Dụ");
    expect(r.sai_khuon).toBe(false);
    expect(r.loi).toEqual([]);
  });

  it("KHÔNG khai vẫn HỢP LỆ — ô này không phải cổng", () => {
    const r = checkOne(nop("khong-khai", hoSo("khong-khai")));
    expect(r.hop_le).toBe(true);
    expect(r.chu_so_huu).toBeNull();
  });

  it("không khai thì phải NÊU ra, chứ không im lặng coi như mỗi hồ sơ một chủ", () => {
    const r = checkOne(nop("khong-khai-2", hoSo("khong-khai-2")));
    expect((r.canh ?? []).some((c: string) => c.includes("chu_so_huu"))).toBe(true);
  });

  it("chỗ giữ chỗ KHÔNG phải một lời khai", () => {
    for (const rac of ["tbd", "n/a", "-", "?"]) {
      const r = checkOne(nop(`giu-cho-${rac.replace(/\W/g, "x")}`, hoSo("giu-cho", rac)));
      expect(r.sai_khuon).toBe(true);
      expect((r.loi ?? []).join(" ")).toContain("chu_so_huu");
    }
  });

  it("chuỗi quá ngắn bị từ chối — một tên phải gọi được", () => {
    const r = checkOne(nop("ngan", hoSo("ngan", "A")));
    expect(r.sai_khuon).toBe(true);
  });

  it("khoảng trắng thừa bị cắt, để hai hồ sơ cùng chủ không tách thành hai cụm", () => {
    const r = checkOne(nop("khoang-trang", hoSo("khoang-trang", "  Công ty Ví Dụ  ")));
    expect(r.chu_so_huu).toBe("Công ty Ví Dụ");
  });
});

describe("cụm sở hữu — tính chất của TẬP hồ sơ", () => {
  // Phép gom nằm ở CLI vì nó cần cả thư mục; ở đây kiểm chính cái phép gom đó trên dữ liệu do
  // `checkOne` trả ra, để nếu ai đổi kiểu trả về thì bài này đỏ chứ không phải người dùng phát hiện.
  // Ba trạng thái, không phải hai: có khai · chấm rồi mà không khai (`null`) · lượt chấm dừng
  // sớm nên chưa tới ô đó (`undefined`). Phép gom bỏ qua cả hai trạng thái sau, nhưng chữ ký
  // phải nói ra là có ba — gộp chúng làm một chính là cách một hồ sơ chưa nộp lọt vào cụm.
  const gom = (rs: Array<{ chu: string | null | undefined }>) => {
    const m = new Map<string, number>();
    for (const r of rs) {
      if (!r.chu) continue;
      const k = r.chu.toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };

  it("hai hồ sơ cùng chủ gom thành MỘT cụm, kể cả khi viết hoa khác nhau", () => {
    const a = checkOne(nop("cum-a", hoSo("cum-a", "Đội Ví Dụ")));
    const b = checkOne(nop("cum-b", hoSo("cum-b", "đội ví dụ")));
    const m = gom([{ chu: a.chu_so_huu }, { chu: b.chu_so_huu }]);
    expect(m.size).toBe(1);
    expect([...m.values()][0]).toBe(2);
  });

  it("hồ sơ không khai chủ KHÔNG bị gom bừa vào một cụm chung", () => {
    const a = checkOne(nop("le-a", hoSo("le-a")));
    const b = checkOne(nop("le-b", hoSo("le-b")));
    expect(gom([{ chu: a.chu_so_huu }, { chu: b.chu_so_huu }]).size).toBe(0);
  });

  it("hai con số in kèm cụm phải đúng số học, vì người đối chiếu đọc chúng để quyết", () => {
    // Trần thực của một chủ có k hồ sơ = min(100%, k · trần-mỗi-hồ-sơ).
    const tran = (k: number, moi: number) => Math.min(1, k * moi);
    expect(tran(1, 0.3)).toBeCloseTo(0.3);
    expect(tran(2, 0.3)).toBeCloseTo(0.6);
    expect(tran(4, 0.3)).toBeCloseTo(1.0);   // bốn hồ sơ là trần biến mất

    // Trọng số lõm V^r: cùng một lượng hoạt động V chẻ làm k phần cho k·(V/k)^r = V^r · k^(1−r).
    // Đây là lý do chẻ hồ sơ ĐƯỢC THƯỞNG dù không bơm thêm hoạt động nào.
    const boi = (k: number, r: number) => Math.pow(k, 1 - r);
    expect(boi(1, 0.7)).toBeCloseTo(1);
    expect(boi(2, 0.7)).toBeCloseTo(1.2311, 3);
    expect(boi(4, 0.7)).toBeCloseTo(1.5157, 3);
    expect(boi(10, 0.7)).toBeCloseTo(1.9953, 3);

    // Và bội số LUÔN tăng theo k khi r < 1 — không có điểm dừng nội tại, nên thứ chặn phải đến
    // từ bên ngoài cơ chế chia (ở đây: ngưỡng bụi, và người đối chiếu).
    for (let k = 1; k < 30; k++) expect(boi(k + 1, 0.7)).toBeGreaterThan(boi(k, 0.7));
  });
});
