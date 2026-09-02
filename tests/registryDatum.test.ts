// Registry · codec PlatformEntry/PlatformStatus/RegistryRedeemer — lược đồ v2.
// Đảm bảo byte-perfect: mã hoá → CBOR → giải mã == gốc; Constr index + THỨ TỰ TRƯỜNG khớp
// platform.ak. Thứ tự trường là hợp đồng chung với validator — lệch một chỗ là hỏng.

import { describe, it, expect } from "vitest";
import { Constr, Data } from "@lucid-evolution/lucid";
import {
  platformEntryToCbor, platformEntryFromCbor,
  encodePlatformEntry, decodePlatformEntry,
  encodePlatformStatus, decodePlatformStatus,
  encodeRegisterPlatformRedeemer, encodeUpdateEntryRedeemer, encodeMigrateEntryRedeemer,
  registryRedeemerToCbor, registryRedeemerFromCbor, decodeRegistryRedeemer,
  PLATFORM_STATUS, REGISTRY_REDEEMER, PLATFORM_ENTRY_FIELDS,
} from "../offchain/src/registryDatum.js";
import type { PlatformEntry } from "../offchain/src/types.js";
import { SPEC_VERSION_V2 } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const sampleEntry = (): PlatformEntry => ({
  spec_version:   SPEC_VERSION_V2,
  platform_id:    asciiToHex("PhoenixKey"),
  instance_id:    asciiToHex("phoenixkey-custody-v1"),
  custody_hash:   "aa".repeat(28),
  seed_policy:    "bb".repeat(28),
  beacon_policy:  "12".repeat(28),
  governance_ref: "cc".repeat(28),
  accepted_assets: [
    { policy: "", name: "" },
    { policy: "dd".repeat(28), name: asciiToHex("LAMP") },
  ],
  cut_bps:       500n,
  created_epoch: 42n,
  status:        "Active",
  // KHÔNG dùng 15n (đủ bốn nền): mẫu phải là ca THƯỜNG, và ca thường là khai thiếu.
  // Lấy 15n làm mẫu thì mọi bài vòng-tròn chạy trên một giá trị mà bit nào cũng bật —
  // hoán vị bit sai vẫn cho cùng kết quả.
  substrate_flags: 5n,   // bit 0 (PhoenixKey) + bit 2 (LampNet)
});

describe("PlatformEntry v2 — mã hoá/giải mã", () => {
  it("mã hoá → giải mã bảo toàn mọi trường", () => {
    const e = sampleEntry();
    const back = platformEntryFromCbor(platformEntryToCbor(e));
    expect(back).toEqual(e);
  });

  // Vì sao ghim con số bằng CHỮ bên cạnh một hằng đã có: `toBe(PLATFORM_ENTRY_FIELDS)` một
  // mình luôn xanh — nó so hằng với chính nó. Số viết tay là nửa thứ hai của phép kiểm kép,
  // và nó buộc mỗi lần đổi arity phải là một lần SỬA CÓ Ý THỨC. Đã làm đúng việc của nó
  // 2026-09-02: đổi 11 → 12 (`substrate_flags`) và bài này đỏ ngay, một mình.
  it("là Constr(0) đúng 12 trường, ĐÚNG THỨ TỰ (spec_version đầu, beacon_policy sau seed_policy)", () => {
    const c = encodePlatformEntry(sampleEntry());
    expect(c.index).toBe(0);
    expect(c.fields.length).toBe(PLATFORM_ENTRY_FIELDS);
    expect(PLATFORM_ENTRY_FIELDS).toBe(12);
    expect(c.fields[0]).toBe(2n);                          // spec_version
    expect(c.fields[1]).toBe(asciiToHex("PhoenixKey"));    // platform_id
    expect(c.fields[2]).toBe(asciiToHex("phoenixkey-custody-v1"));
    expect(c.fields[3]).toBe("aa".repeat(28));             // custody_hash
    expect(c.fields[4]).toBe("bb".repeat(28));             // seed_policy
    expect(c.fields[5]).toBe("12".repeat(28));             // beacon_policy — NGAY SAU seed_policy
    expect(c.fields[6]).toBe("cc".repeat(28));             // governance_ref
    expect(Array.isArray(c.fields[7])).toBe(true);         // accepted_assets
    expect(c.fields[8]).toBe(500n);                        // cut_bps
    expect(c.fields[9]).toBe(42n);                         // created_epoch
    expect(c.fields[10]).toBeInstanceOf(Constr);           // status
    expect(c.fields[11]).toBe(5n);                         // substrate_flags — CUỐI đuôi
  });

  it("giải mã lấy đúng trường theo vị trí (không lẫn seed_policy với beacon_policy)", () => {
    const e = sampleEntry();
    const back = platformEntryFromCbor(platformEntryToCbor(e));
    expect(back.seed_policy).toBe("bb".repeat(28));
    expect(back.beacon_policy).toBe("12".repeat(28));
    expect(back.spec_version).toBe(2n);
  });

  it("mã hoá → giải mã cho cả 3 status", () => {
    for (const s of ["Active", "Paused", "Retired"] as const) {
      const e = { ...sampleEntry(), status: s };
      expect(platformEntryFromCbor(platformEntryToCbor(e)).status).toBe(s);
    }
  });

  it("datum v1 (9 trường) bị TỪ CHỐI — không đọc nhầm lược đồ cũ", () => {
    const v1 = new Constr(0, [
      asciiToHex("PhoenixKey"), asciiToHex("inst"), "aa".repeat(28), "bb".repeat(28),
      "cc".repeat(28), [], 500n, 42n, new Constr(0, []),
    ]);
    expect(() => decodePlatformEntry(v1)).toThrow(/RDATUM-021/);
  });

  it("Constr index khác 0 → ném RDATUM-020", () => {
    expect(() => decodePlatformEntry(new Constr(1, []))).toThrow(/RDATUM-020/);
  });
});

describe("PlatformStatus Constr index khớp platform.ak", () => {
  it("Active=0, Paused=1, Retired=2", () => {
    expect(encodePlatformStatus("Active").index).toBe(0);
    expect(encodePlatformStatus("Paused").index).toBe(1);
    expect(encodePlatformStatus("Retired").index).toBe(2);
    expect(PLATFORM_STATUS).toEqual({ Active: 0, Paused: 1, Retired: 2 });
  });
  it("giải mã lại đúng nhãn", () => {
    expect(decodePlatformStatus(new Constr(0, []))).toBe("Active");
    expect(decodePlatformStatus(new Constr(1, []))).toBe("Paused");
    expect(decodePlatformStatus(new Constr(2, []))).toBe("Retired");
  });
  it("Constr lạ → ném lỗi", () => {
    expect(() => decodePlatformStatus(new Constr(3, []))).toThrow(/unknown/);
    expect(() => decodePlatformStatus(new Constr(0, ["x"]))).toThrow(/0 fields/);
  });
});

describe("RegistryRedeemer v2 — hai nhánh", () => {
  it("RegisterPlatform = Constr(0,[]) (CBOR d87980)", () => {
    expect(encodeRegisterPlatformRedeemer().index).toBe(0);
    expect(encodeRegisterPlatformRedeemer().fields.length).toBe(0);
    expect(Data.to(encodeRegisterPlatformRedeemer())).toBe("d87980");
  });

  it("UpdateEntry = Constr(0,[]) ; MigrateEntry = Constr(1,[bytes,int])", () => {
    expect(REGISTRY_REDEEMER).toEqual({ UpdateEntry: 0, MigrateEntry: 1 });
    expect(encodeUpdateEntryRedeemer().index).toBe(0);
    const m = encodeMigrateEntryRedeemer("ff".repeat(28), 3n);
    expect(m.index).toBe(1);
    expect(m.fields).toEqual(["ff".repeat(28), 3n]);
  });

  it("MigrateEntry mã hoá → giải mã bảo toàn hash + version", () => {
    const cbor = registryRedeemerToCbor({
      kind: "MigrateEntry", new_registry_hash: "AB".repeat(28), new_spec_version: 3n,
    });
    expect(registryRedeemerFromCbor(cbor)).toEqual({
      kind: "MigrateEntry", new_registry_hash: "ab".repeat(28), new_spec_version: 3n,
    });
  });

  it("UpdateEntry mã hoá → giải mã", () => {
    expect(registryRedeemerFromCbor(registryRedeemerToCbor({ kind: "UpdateEntry" })))
      .toEqual({ kind: "UpdateEntry" });
  });

  it("new_spec_version ≤ 0 → ném; Constr lạ → ném", () => {
    expect(() => encodeMigrateEntryRedeemer("ff".repeat(28), 0n)).toThrow(/RDATUM-030/);
    expect(() => decodeRegistryRedeemer(new Constr(7, []))).toThrow(/RDATUM-033/);
    expect(() => decodeRegistryRedeemer(new Constr(1, ["ff"]))).toThrow(/RDATUM-032/);
  });
});
