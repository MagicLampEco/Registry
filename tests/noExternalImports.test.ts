// Registry · KIỂM NGHIỆM THU của việc đảo chiều phụ thuộc (hướng B).
//
// Repo Registry phải typecheck + chạy test xanh mà KHÔNG cần repo LAMP có mặt trên đĩa. Cách
// duy nhất bảo đảm điều đó không bị phá lại về sau là kiểm bằng máy: quét toàn bộ mã nguồn
// TypeScript trong repo, bắt mọi đường dẫn nhập tương đối leo ra ngoài gốc repo.
//
// Ca hỏng điển hình (bản cũ ở LAMP/PlatformKit): `import ... from "../../../Treasury/offchain/src/types.js"`.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const SCAN_DIRS = ["offchain/src", "tests", "examples", "scripts"];
const SKIP_DIRS = new Set(["node_modules", "build", "dist", ".git"]);

function tsFiles(dir: string): string[] {
  let out: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const n of names) {
    if (SKIP_DIRS.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out = out.concat(tsFiles(p));
    else if (n.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** Bỏ chú thích trước khi quét — nhắc tên đường dẫn cũ trong chú thích là hợp lệ, chỉ mã
 *  thật mới tính. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** Mọi chuỗi đường dẫn trong `import`/`export ... from` và `import(...)` của MÃ THẬT. */
function importPaths(src: string): string[] {
  const out: string[] = [];
  const re = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  const code = stripComments(src);
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) out.push(m[1]!);
  return out;
}

describe("không còn phụ thuộc nhập nào ra ngoài repo Registry", () => {
  const files = SCAN_DIRS.flatMap((d) => tsFiles(join(REPO_ROOT, d)));

  it("quét được mã nguồn (đề phòng bộ quét chạy rỗng rồi báo xanh giả)", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("không đường dẫn tương đối nào leo ra ngoài gốc repo", () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const spec of importPaths(readFileSync(f, "utf8"))) {
        if (!spec.startsWith(".")) continue;                 // gói npm — không xét ở đây.
        const abs = resolve(dirname(f), spec);
        if (!abs.startsWith(REPO_ROOT + "/")) {
          offenders.push(`${f.slice(REPO_ROOT.length + 1)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("không file nào nhập theo đường dẫn Treasury/PlatformKit của repo LAMP", () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const spec of importPaths(readFileSync(f, "utf8"))) {
        if (/Treasury\/offchain|PlatformKit\/offchain|@magiclamp\/utils/.test(spec)) {
          offenders.push(`${f.slice(REPO_ROOT.length + 1)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
