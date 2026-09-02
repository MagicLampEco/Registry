// Registry · GƯƠNG ĐỒNG THUẬN QUẢN TRỊ — R-GOVLIVE / U-GOV2 / M-GOV2 / *-GOVSELF-OUT.
//
// Vì sao có file này: ba lệch dưới đây làm CẢ HAI suite xanh mà sản phẩm chết — mỗi bên tự
// nhất quán với chính mình.
//
//  1. R-GOVLIVE (registry_beacon.ak:165) đòi VÔ ĐIỀU KIỆN cổng quản trị CHẠY THẬT trong chính
//     tx đăng ký. Off-chain trước bản này không có trường nào biểu diễn được điều đó ⇒ MỌI tx
//     đăng ký do SDK dựng đều bị từ chối: cổng đăng ký không đăng ký được ai.
//  2. U-GOV2 / M-GOV2 (registry.ak:257-265, 316-323) đòi ĐỔI `governance_ref` = BÀN GIAO HAI
//     CHIỀU (cả ref cũ lẫn ref mới cùng chạy). Một cờ boolean không nói được "ref nào chạy".
//  3. U-GOVSELF-OUT / M-GOVSELF-OUT (registry.ak:212, 314-315) nay CÓ trên chuỗi. Off-chain
//     từng chỉ CẢNH BÁO và khai "on-chain chưa chặn ca này" — lời khai đó nay sai.
//
// Nguồn on-chain đối chiếu (đọc 2026-08-14):
//   onchain/lib/magiclamp/registry/util.ak:204-216   governance_consented (spend HOẶC withdraw)
//   onchain/validators/registry_beacon.ak:138-165    R-GOVLIVE + xung đột R-MINT-2
//   onchain/validators/registry.ak:212, 257-265      U-GOVSELF-OUT, U-GOV2
//   onchain/validators/registry.ak:309-323           M-GOVSELF-OUT, M-GOV2

import { describe, it, expect } from "vitest";
import {
  planRegister, planUpdateEntry, planMigrateEntry,
  governanceConsented, governanceConsentKind,
  type GovernanceProof,
} from "../offchain/src/registrationBuilder.js";
import type { PlatformConfig, PlatformEntry } from "../offchain/src/types.js";
import { MS_PER_TIME_BUCKET } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const BEACON_POLICY = "12".repeat(28);
const CUSTODY_HASH  = "34".repeat(28);
const SEED_POLICY   = "56".repeat(28);
const AUTHORITY     = "ab".repeat(28);
const GOV_OLD       = "cc".repeat(28);
const GOV_NEW       = "dd".repeat(28);
const OWN_HASH      = "77".repeat(28);
const NEW_HASH      = "88".repeat(28);

const bySpend = (h: string): GovernanceProof => ({ spends: [{ scriptHash: h }] });
const byWithdrawal = (h: string): GovernanceProof =>
  ({ withdrawals: [{ scriptHash: h, amountLovelace: 0n }] });

const cfg = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  platformId: asciiToHex("TestPlat"),
  instanceId: asciiToHex("test-instance-v1"),
  acceptedAssets: [{ policy: "", name: "" }],
  buckets: [{ id: 0n, label: "ops" }],
  cutBps: 300n,
  governanceRef: GOV_OLD,
  msPerTimeBucket: MS_PER_TIME_BUCKET,
  reservedMinAda: 2_000_000n,
  registryAuthority: AUTHORITY,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  ...over,
});

const okCustody = (c: PlatformConfig) => ({
  value: { [`${SEED_POLICY}|${c.instanceId.toLowerCase()}`]: 1n, "|": 2_000_000n },
  scriptHash: CUSTODY_HASH,
});

const regParams = (c: PlatformConfig, proof: GovernanceProof) => ({
  config: c,
  beaconPolicy: BEACON_POLICY,
  custodyHash: CUSTODY_HASH,
  seedPolicy: SEED_POLICY,
  createdEpoch: 10n,
  custodyUtxo: okCustody(c),
  governanceProof: proof,
});

const entryIn = (): PlatformEntry => planRegister(regParams(cfg(), bySpend(GOV_OLD))).entry;

// ═══ Vị từ thuần — gương util.governance_consented ══════════════════════════

describe("governanceConsented · ĐÚNG HAI đường, không có đường thứ ba", () => {
  it("chi tiêu input ở Script(ref) → đồng thuận", () => {
    expect(governanceConsented(bySpend(GOV_OLD), GOV_OLD)).toBe(true);
    expect(governanceConsentKind(bySpend(GOV_OLD), GOV_OLD)).toBe("spend");
  });

  it("withdrawal từ Script(ref) → đồng thuận, KỂ CẢ khi rút 0 lovelace", () => {
    expect(governanceConsented(byWithdrawal(GOV_OLD), GOV_OLD)).toBe(true);
    expect(governanceConsentKind(byWithdrawal(GOV_OLD), GOV_OLD)).toBe("withdrawal");
    // withdraw-0 là ĐƯỜNG VÒNG chuẩn cho xung đột R-GOVLIVE ⟂ R-MINT-2: withdrawal không
    // đụng tx.mint nên không làm tx đăng ký gánh thêm policy mint.
  });

  it("bằng chứng của script KHÁC không tính — đồng thuận là theo TỪNG script hash", () => {
    expect(governanceConsented(bySpend(GOV_NEW), GOV_OLD)).toBe(false);
    expect(governanceConsented(byWithdrawal(GOV_NEW), GOV_OLD)).toBe(false);
  });

  it("không có bằng chứng nào → false (undefined, rỗng, mảng rỗng)", () => {
    expect(governanceConsented(undefined, GOV_OLD)).toBe(false);
    expect(governanceConsented({}, GOV_OLD)).toBe(false);
    expect(governanceConsented({ spends: [], withdrawals: [] }, GOV_OLD)).toBe(false);
  });

  it("ref KHÔNG đủ 28 byte thì KHÔNG THỂ đồng thuận — chặn lỗ 'rỗng khớp rỗng'", () => {
    // Không script nào có hash khác 28 byte. Thiếu chốt này, ref = "" khớp một mục khai
    // scriptHash "" và đồng thuận thành hằng True — đúng lỗ mà S-GOVSELF sinh ra để vá.
    expect(governanceConsented({ spends: [{ scriptHash: "" }] }, "")).toBe(false);
    expect(governanceConsented({ spends: [{ scriptHash: "cc".repeat(27) }] }, "cc".repeat(27)))
      .toBe(false);
  });

  it("chuẩn hoá hex: hoa/thường và tiền tố 0x không làm lệch kết quả", () => {
    expect(governanceConsented(bySpend(GOV_OLD.toUpperCase()), GOV_OLD)).toBe(true);
    expect(governanceConsented(bySpend(`0x${GOV_OLD}`), GOV_OLD)).toBe(true);
    expect(governanceConsented(bySpend(GOV_OLD), GOV_OLD.toUpperCase())).toBe(true);
  });
});

// ═══ R-GOVLIVE — chỗ 100% tx đăng ký của SDK từng chết ══════════════════════

describe("planRegister · R-GOVLIVE là VÔ ĐIỀU KIỆN", () => {
  it("không có bằng chứng nào → REG-GOVLIVE (plan hợp lệ mà tx chết là kiểu hỏng tệ nhất)", () => {
    expect(() => planRegister(regParams(cfg(), {}))).toThrow(/REG-GOVLIVE/);
  });

  it("bằng chứng trỏ script KHÁC governance_ref → REG-GOVLIVE", () => {
    expect(() => planRegister(regParams(cfg(), bySpend(GOV_NEW)))).toThrow(/REG-GOVLIVE/);
  });

  it("chi tiêu input ở Script(governance_ref) → qua, plan nói rõ đường đã dùng", () => {
    const plan = planRegister(regParams(cfg(), bySpend(GOV_OLD)));
    expect(plan.governanceConsentKind).toBe("spend");
    expect(plan.governanceProof).toEqual(bySpend(GOV_OLD));
    expect(plan.summary).toMatch(/R-GOVLIVE/);
    expect(plan.summary).toMatch(new RegExp(`Script\\(${GOV_OLD}\\)`));
  });

  it("withdrawal 0 lovelace → qua, và tóm tắt nêu xung đột R-MINT-2 để đội đăng ký chọn đúng", () => {
    const plan = planRegister(regParams(cfg(), byWithdrawal(GOV_OLD)));
    expect(plan.governanceConsentKind).toBe("withdrawal");
    expect(plan.summary).toMatch(/withdrawal/);
    // Xung đột cố ý không vá bằng mã: cổng quản trị mà nhánh đồng thuận CẦN mint/burn thì
    // vấp R-MINT-2. Plan phải nói ra, vì builder không nhìn thấy tx.mint của bên gọi.
    expect(plan.summary).toMatch(/R-MINT-2/);
  });

  it("hồ sơ KHÔNG KHO cũng phải có R-GOVLIVE — hạng không kho không được miễn", () => {
    const nonCust = cfg({ instanceId: "", acceptedAssets: [], cutBps: 0n });
    const params = {
      config: nonCust, beaconPolicy: BEACON_POLICY, custodyHash: "", seedPolicy: "",
      createdEpoch: 10n,
    };
    expect(() => planRegister({ ...params, governanceProof: {} })).toThrow(/REG-GOVLIVE/);
    expect(planRegister({ ...params, governanceProof: byWithdrawal(GOV_OLD) })
      .governanceConsentKind).toBe("withdrawal");
  });

  it("THỨ TỰ kiểm khớp validator: R-WF và R-GOVSELF bắt TRƯỚC R-GOVLIVE", () => {
    // governance_ref rác thì hỏng ở R-WF, không phải R-GOVLIVE — cùng thứ tự với on-chain,
    // để thông điệp lỗi chỉ đúng chỗ phải sửa.
    expect(() => planRegister(regParams(cfg({ governanceRef: "cc".repeat(27) }), {})))
      .toThrow(/REG-WF/);
    const selfCfg = cfg({ governanceRef: OWN_HASH });
    expect(() => planRegister({
      ...regParams(selfCfg, bySpend(OWN_HASH)), registryHash: OWN_HASH,
    })).toThrow(/REG-GOVSELF/);
  });
});

// ═══ U-GOV2 — đổi governance_ref là BÀN GIAO HAI CHIỀU ══════════════════════

describe("planUpdateEntry · U-GOV2 (bàn giao) và U-GOVSELF-OUT", () => {
  it("đổi governance_ref mà chỉ khai boolean → UPD-GOV2 (boolean không nói được ref nào)", () => {
    expect(() => planUpdateEntry(
      entryIn(), { governance_ref: GOV_NEW }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true },
    )).toThrow(/UPD-GOV2/);
  });

  it("đổi governance_ref mà chỉ chứng minh ref CŨ → UPD-GOV2", () => {
    expect(() => planUpdateEntry(
      entryIn(), { governance_ref: GOV_NEW }, BEACON_POLICY, AUTHORITY,
      { governanceProof: bySpend(GOV_OLD) },
    )).toThrow(/UPD-GOV2/);
  });

  it("đổi governance_ref mà chỉ chứng minh ref MỚI → UPD-GOV (thiếu bên đương nhiệm)", () => {
    expect(() => planUpdateEntry(
      entryIn(), { governance_ref: GOV_NEW }, BEACON_POLICY, AUTHORITY,
      { governanceProof: bySpend(GOV_NEW) },
    )).toThrow(/UPD-GOV(?!2)/);
  });

  it("đủ CẢ HAI ref → qua; plan liệt đúng hai ref tx phải làm chạy", () => {
    const plan = planUpdateEntry(
      entryIn(), { governance_ref: GOV_NEW }, BEACON_POLICY, AUTHORITY,
      { governanceProof: { spends: [{ scriptHash: GOV_OLD }], withdrawals: [{ scriptHash: GOV_NEW }] } },
    );
    expect(plan.entryOut.governance_ref).toBe(GOV_NEW);
    expect(plan.governanceHandover).toBe(true);
    expect(plan.governanceConsentRefs).toEqual([GOV_OLD, GOV_NEW]);
    expect(plan.summary).toMatch(/BÀN GIAO QUẢN TRỊ \(U-GOV2\)/);
  });

  it("KHÔNG đổi ref thì KHÔNG phát sinh nghĩa vụ nào thêm (chỉ ref đương nhiệm)", () => {
    const plan = planUpdateEntry(
      entryIn(), { cut_bps: 800n }, BEACON_POLICY, AUTHORITY,
      { governanceProof: byWithdrawal(GOV_OLD) },
    );
    expect(plan.governanceHandover).toBe(false);
    expect(plan.governanceConsentRefs).toEqual([GOV_OLD]);
  });

  it("thay đổi đảo ngược được (Active ↔ Paused) không đòi ref nào", () => {
    const plan = planUpdateEntry(entryIn(), { status: "Paused" }, BEACON_POLICY, AUTHORITY);
    expect(plan.needsGovernanceConsent).toBe(false);
    expect(plan.governanceConsentRefs).toEqual([]);
  });

  it("bằng chứng withdrawal thay được lời khai boolean cho ref đương nhiệm", () => {
    const plan = planUpdateEntry(
      entryIn(), { status: "Retired" }, BEACON_POLICY, AUTHORITY,
      { governanceProof: byWithdrawal(GOV_OLD) },
    );
    expect(plan.entryOut.status).toBe("Retired");
    expect(plan.needsGovernanceConsent).toBe(true);
  });

  it("U-GOVSELF-OUT: ghi ra governance_ref == own_hash → ném, kể cả khi đủ bằng chứng", () => {
    expect(() => planUpdateEntry(
      entryIn(), { governance_ref: OWN_HASH }, BEACON_POLICY, AUTHORITY,
      {
        ownRegistryHash: OWN_HASH,
        governanceProof: { spends: [{ scriptHash: GOV_OLD }, { scriptHash: OWN_HASH }] },
      },
    )).toThrow(/UPD-GOVSELF-OUT/);
  });
});

// ═══ M-GOV2 — bàn giao quản trị NGAY TRONG tx di trú ════════════════════════

describe("planMigrateEntry · M-GOV2 + M-GOVSELF-OUT", () => {
  const mig = (over: Record<string, unknown> = {}) => ({
    entryIn: entryIn(),
    ownRegistryHash: OWN_HASH,
    newRegistryHash: NEW_HASH,
    newSpecVersion: 3n,
    registryAuthority: AUTHORITY,
    governanceConsent: true,
    ...over,
  });

  it("KHÔNG đổi ref: nghĩa vụ đúng bằng M-GOV, không hơn", () => {
    const plan = planMigrateEntry(mig());
    expect(plan.governanceHandover).toBe(false);
    expect(plan.governanceConsentRefs).toEqual([GOV_OLD]);
    expect(plan.entryOut.governance_ref).toBe(GOV_OLD);
    expect(plan.summary).toMatch(/GIỮ NGUYÊN/);
  });

  it("di trú ĐỔI ĐƯỢC governance_ref — M-ID không khoá trường này", () => {
    const plan = planMigrateEntry(mig({
      newGovernanceRef: GOV_NEW,
      governanceProof: bySpend(GOV_NEW),
    }));
    expect(plan.entryOut.governance_ref).toBe(GOV_NEW);
    expect(plan.governanceHandover).toBe(true);
    expect(plan.governanceConsentRefs).toEqual([GOV_OLD, GOV_NEW]);
    expect(plan.summary).toMatch(/BÀN GIAO QUẢN TRỊ \(M-GOV2\)/);
  });

  it("đổi ref mà không chứng minh ref MỚI → MIG-GOV2 (cửa sau đi vòng qua U-GOV2)", () => {
    expect(() => planMigrateEntry(mig({ newGovernanceRef: GOV_NEW })))
      .toThrow(/MIG-GOV2/);
    expect(() => planMigrateEntry(mig({
      newGovernanceRef: GOV_NEW, governanceProof: bySpend(GOV_OLD),
    }))).toThrow(/MIG-GOV2/);
  });

  it("M-GOV nhận bằng chứng theo hash thay cho lời khai boolean", () => {
    const plan = planMigrateEntry(mig({
      governanceConsent: false, governanceProof: byWithdrawal(GOV_OLD),
    }));
    expect(plan.entryOut.spec_version).toBe(3n);
    expect(() => planMigrateEntry(mig({
      governanceConsent: false, governanceProof: byWithdrawal(GOV_NEW),
    }))).toThrow(/MIG-GOV(?!2|SELF)/);
  });

  it("M-GOVSELF-DEST: ghi ref = hash registry ĐÍCH → ném (brick ngay khi tới nơi)", () => {
    expect(() => planMigrateEntry(mig({
      newGovernanceRef: NEW_HASH, governanceProof: bySpend(NEW_HASH),
    }))).toThrow(/MIG-GOVSELF-DEST/);
  });

  it("M-GOVSELF-OWN: ghi ref = hash registry CŨ → ném (thủ tục đồng thuận rỗng)", () => {
    expect(() => planMigrateEntry(mig({
      newGovernanceRef: OWN_HASH, governanceProof: bySpend(OWN_HASH),
    }))).toThrow(/MIG-GOVSELF-OWN/);
  });

  it("ref mới rác 27 byte → MIG-MUT bắt trước (đúng thứ tự validator)", () => {
    expect(() => planMigrateEntry(mig({
      newGovernanceRef: "dd".repeat(27), governanceProof: bySpend("dd".repeat(27)),
    }))).toThrow(/MIG-MUT/);
  });
});
