// Registry · planRegister (R-WF/R-NAME/R-POLICY/R-VER/R-EPOCH/R-BIND) + planUpdateEntry
// (U-ID sáu trường, U-MUT, U-VER, U-TERMINAL, U-VALUE, và TÁCH QUYỀN U-GOV).

import { describe, it, expect } from "vitest";
import {
  planRegister, planUpdateEntry, entryWellFormed,
  identityPreserved, mutableFieldsValid, verifyCustodyBinding,
  valuePreserved, epochInWindow, changesRequireGovernance,
} from "../offchain/src/registrationBuilder.js";
import { decodePlatformEntry } from "../offchain/src/registryDatum.js";
import { Data } from "@lucid-evolution/lucid";
import type { PlatformConfig, PlatformEntry } from "../offchain/src/types.js";
import { SPEC_VERSION_V2 } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const BEACON_POLICY = "12".repeat(28);
const CUSTODY_HASH  = "34".repeat(28);
const SEED_POLICY   = "56".repeat(28);
const AUTHORITY     = "ab".repeat(28);

const baseConfig = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  platformId: asciiToHex("TestPlat"),
  instanceId: asciiToHex("test-instance-v1"),
  acceptedAssets: [{ policy: "", name: "" }],
  buckets: [{ id: 0n, label: "ops" }],
  cutBps: 300n,
  governanceRef: "cc".repeat(28),
  msPerEpoch: 86_400_000n,
  reservedMinAda: 2_000_000n,
  registryAuthority: AUTHORITY,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  ...over,
});

/** UTxO kho HỢP LỆ cho R-BIND: đúng 1 NFT (seedPolicy, instanceId) @ Script(custodyHash). */
const okCustody = (cfg: PlatformConfig) => ({
  value: { [`${SEED_POLICY}|${cfg.instanceId.toLowerCase()}`]: 1n, "|": 2_000_000n },
  scriptHash: CUSTODY_HASH,
  txHash: "dd".repeat(32),
  outputIndex: 0,
});

const regParams = (cfg: PlatformConfig) => ({
  config: cfg,
  beaconPolicy: BEACON_POLICY,
  custodyHash: CUSTODY_HASH,
  seedPolicy: SEED_POLICY,
  createdEpoch: 10n,
  custodyUtxo: okCustody(cfg),
});

describe("planRegister — đường xuôi", () => {
  it("dựng hồ sơ well-formed v2 + NFT name == platform_id + datum giải mã lại đúng", () => {
    const cfg = baseConfig();
    const plan = planRegister(regParams(cfg));
    expect(entryWellFormed(plan.entry)).toBe(true);
    expect(plan.entry.spec_version).toBe(SPEC_VERSION_V2);
    expect(plan.entry.beacon_policy).toBe(BEACON_POLICY);
    expect(plan.nftName).toBe(asciiToHex("TestPlat"));
    expect(plan.entry.platform_id).toBe(plan.nftName);
    expect(plan.entry.status).toBe("Active");
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("TestPlat")}`]).toBe(1n);
    expect(plan.requiredSigner).toBe(AUTHORITY);
    const back: PlatformEntry = decodePlatformEntry(Data.from(plan.entryDatumCbor));
    expect(back).toEqual(plan.entry);
    expect(plan.custodyRef.scriptHash).toBe(CUSTODY_HASH);
    expect(plan.custodyRef.txHash).toBe("dd".repeat(32));
  });

  it("config.seedPolicy ưu tiên hơn tham số seedPolicy", () => {
    const cfg = baseConfig({ seedPolicy: "99".repeat(28) });
    const plan = planRegister({
      ...regParams(cfg),
      custodyUtxo: {
        value: { [`${"99".repeat(28)}|${cfg.instanceId.toLowerCase()}`]: 1n, "|": 2_000_000n },
        scriptHash: CUSTODY_HASH,
      },
    });
    expect(plan.entry.seed_policy).toBe("99".repeat(28));
  });
});

describe("planRegister — R-WF từ chối", () => {
  it("cut_bps > 10000 → REG-WF", () => {
    expect(() => planRegister(regParams(baseConfig({ cutBps: 10001n })))).toThrow(/REG-WF/);
  });
  it("accepted_assets rỗng → REG-WF", () => {
    expect(() => planRegister(regParams(baseConfig({ acceptedAssets: [] })))).toThrow(/REG-WF/);
  });
  it("governance_ref rỗng → REG-WF", () => {
    expect(() => planRegister(regParams(baseConfig({ governanceRef: "" })))).toThrow(/REG-WF/);
  });
  it("platform_id rỗng → REG-WF", () => {
    expect(() => planRegister(regParams(baseConfig({ platformId: "" })))).toThrow(/REG-WF/);
  });
  it("seed_policy rỗng → REG-WF", () => {
    expect(() => planRegister({ ...regParams(baseConfig()), seedPolicy: "" })).toThrow(/REG-WF/);
  });
  it("beacon_policy rỗng → REG-WF (trường mới v2 cũng phải khác rỗng)", () => {
    expect(() => planRegister({ ...regParams(baseConfig()), beaconPolicy: "" })).toThrow(/REG-WF/);
  });
  it("entryWellFormed từ chối spec_version != 2", () => {
    const cfg = baseConfig();
    const e = planRegister(regParams(cfg)).entry;
    expect(entryWellFormed({ ...e, spec_version: 1n })).toBe(false);
    expect(entryWellFormed({ ...e, spec_version: 3n })).toBe(false);
  });
});

describe("planRegister — R-EPOCH (created_epoch == epoch của CHÍNH tx đăng ký)", () => {
  it("cửa sổ gọn trong đúng epoch đó → qua", () => {
    const plan = planRegister({ ...regParams(baseConfig()), epochWindow: { from: 10n, to: 10n } });
    expect(plan.entry.created_epoch).toBe(10n);
  });
  it("khai epoch 0 để ra vẻ lâu đời nhất hệ → REG-EPOCH (lỗ cũ đã bịt)", () => {
    expect(() => planRegister({
      ...regParams(baseConfig()), createdEpoch: 0n, epochWindow: { from: 10n, to: 10n },
    })).toThrow(/REG-EPOCH/);
  });
  it("validity_range trải qua biên epoch → REG-EPOCH (không cho đóng băng epoch)", () => {
    expect(() => planRegister({
      ...regParams(baseConfig()), epochWindow: { from: 9n, to: 11n },
    })).toThrow(/REG-EPOCH/);
  });
  it("epochInWindow: chỉ đúng khi cửa sổ gọn 1 epoch VÀ epoch bằng đúng nó", () => {
    expect(epochInWindow(10n, { from: 10n, to: 10n })).toBe(true);
    expect(epochInWindow(10n, { from: 9n, to: 11n })).toBe(false);
    expect(epochInWindow(10n, { from: 11n, to: 9n })).toBe(false);
    expect(epochInWindow(9n, { from: 10n, to: 10n })).toBe(false);
  });
});

describe("planRegister — R-BIND từ chối (ràng buộc kho)", () => {
  it("thiếu custodyUtxo → REG-BIND", () => {
    const cfg = baseConfig();
    const { custodyUtxo, ...rest } = regParams(cfg);
    void custodyUtxo;
    // @ts-expect-error — cố tình bỏ custodyUtxo để kiểm fail-fast.
    expect(() => planRegister(rest)).toThrow(/REG-BIND/);
  });

  it("UTxO kho thiếu NFT authenticity → REG-BIND", () => {
    const cfg = baseConfig();
    expect(() => planRegister({
      ...regParams(cfg), custodyUtxo: { value: { "|": 2_000_000n }, scriptHash: CUSTODY_HASH },
    })).toThrow(/REG-BIND/);
  });

  it("NFT sai instance_id → REG-BIND", () => {
    const cfg = baseConfig();
    expect(() => planRegister({
      ...regParams(cfg),
      custodyUtxo: {
        value: { [`${SEED_POLICY}|${asciiToHex("other-instance")}`]: 1n }, scriptHash: CUSTODY_HASH,
      },
    })).toThrow(/REG-BIND/);
  });

  it("script hash địa chỉ kho != custody_hash → REG-BIND", () => {
    const cfg = baseConfig();
    expect(() => planRegister({
      ...regParams(cfg), custodyUtxo: { ...okCustody(cfg), scriptHash: "00".repeat(28) },
    })).toThrow(/REG-BIND/);
  });

  it("verifyCustodyBinding trả {ok:false, reason} khi sai hash (không ném)", () => {
    const cfg = baseConfig();
    const r = verifyCustodyBinding(
      { ...okCustody(cfg), scriptHash: "00".repeat(28) }, SEED_POLICY, cfg.instanceId, CUSTODY_HASH,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/custody_hash/);
  });
});

describe("planUpdateEntry — quyền một bên (đảo ngược được)", () => {
  const entryIn = (): PlatformEntry => planRegister(regParams(baseConfig())).entry;

  it("Active → Paused chỉ cần chữ ký authority", () => {
    const plan = planUpdateEntry(entryIn(), { status: "Paused" }, BEACON_POLICY, AUTHORITY);
    expect(plan.entryOut.status).toBe("Paused");
    expect(plan.needsGovernanceConsent).toBe(false);
    expect(identityPreserved(entryIn(), plan.entryOut)).toBe(true);
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("TestPlat")}`]).toBe(1n);
  });

  it("Paused → Active cũng chỉ cần authority (gỡ niêm yết đảo ngược được)", () => {
    const paused: PlatformEntry = { ...entryIn(), status: "Paused" };
    const plan = planUpdateEntry(paused, { status: "Active" }, BEACON_POLICY, AUTHORITY);
    expect(plan.entryOut.status).toBe("Active");
    expect(plan.needsGovernanceConsent).toBe(false);
  });

  it("spec_version giữ nguyên qua UpdateEntry (U-VER)", () => {
    const plan = planUpdateEntry(entryIn(), { status: "Paused" }, BEACON_POLICY, AUTHORITY);
    expect(plan.entryOut.spec_version).toBe(entryIn().spec_version);
  });
});

describe("planUpdateEntry — TÁCH QUYỀN: việc không đảo ngược được cần hai bên (U-GOV)", () => {
  const entryIn = (): PlatformEntry => planRegister(regParams(baseConfig())).entry;

  it("→ Retired chỉ có authority → UPD-GOV", () => {
    expect(() => planUpdateEntry(entryIn(), { status: "Retired" }, BEACON_POLICY, AUTHORITY))
      .toThrow(/UPD-GOV/);
  });

  it("→ Retired có cả đồng thuận quản trị → qua, NFT vẫn giữ (không đốt)", () => {
    const plan = planUpdateEntry(
      entryIn(), { status: "Retired" }, BEACON_POLICY, AUTHORITY, { governanceConsent: true },
    );
    expect(plan.entryOut.status).toBe("Retired");
    expect(plan.needsGovernanceConsent).toBe(true);
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("TestPlat")}`]).toBe(1n);
  });

  it("đổi cut_bps chỉ có authority → UPD-GOV; có đồng thuận → qua", () => {
    expect(() => planUpdateEntry(entryIn(), { cut_bps: 800n }, BEACON_POLICY, AUTHORITY))
      .toThrow(/UPD-GOV/);
    const plan = planUpdateEntry(
      entryIn(), { cut_bps: 800n }, BEACON_POLICY, AUTHORITY, { governanceConsent: true },
    );
    expect(plan.entryOut.cut_bps).toBe(800n);
  });

  it("đổi governance_ref hoặc accepted_assets cũng đòi đồng thuận", () => {
    expect(() => planUpdateEntry(
      entryIn(), { governance_ref: "dd".repeat(28) }, BEACON_POLICY, AUTHORITY,
    )).toThrow(/UPD-GOV/);
    expect(() => planUpdateEntry(
      entryIn(), { accepted_assets: [{ policy: "ee".repeat(28), name: asciiToHex("LAMP") }] },
      BEACON_POLICY, AUTHORITY,
    )).toThrow(/UPD-GOV/);
  });

  it("changesRequireGovernance: Paused không cần, Retired/cut/gov/assets thì cần", () => {
    const a = entryIn();
    expect(changesRequireGovernance(a, { ...a, status: "Paused" })).toBe(false);
    expect(changesRequireGovernance(a, { ...a, status: "Retired" })).toBe(true);
    expect(changesRequireGovernance(a, { ...a, cut_bps: 1n })).toBe(true);
    expect(changesRequireGovernance(a, { ...a, governance_ref: "ee".repeat(28) })).toBe(true);
    expect(changesRequireGovernance(a, { ...a, accepted_assets: [] })).toBe(true);
  });
});

describe("planUpdateEntry — các van còn lại", () => {
  const entryIn = (): PlatformEntry => planRegister(regParams(baseConfig())).entry;

  it("U-TERMINAL: hồ sơ đã Retired không cập nhật/hồi sinh được", () => {
    const retired: PlatformEntry = { ...entryIn(), status: "Retired" };
    expect(() => planUpdateEntry(retired, { status: "Active" }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true })).toThrow(/UPD-TERMINAL/);
    expect(() => planUpdateEntry(retired, { cut_bps: 500n }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true })).toThrow(/UPD-TERMINAL/);
  });

  it("U-MUT: cut_bps > 10000 → UPD-MUT", () => {
    expect(() => planUpdateEntry(entryIn(), { cut_bps: 10001n }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true })).toThrow(/UPD-MUT/);
  });
  it("U-MUT: accepted rỗng → UPD-MUT", () => {
    expect(() => planUpdateEntry(entryIn(), { accepted_assets: [] }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true })).toThrow(/UPD-MUT/);
  });

  it("U-VALUE: rút token khỏi ô hồ sơ → UPD-VALUE", () => {
    const nft = `${BEACON_POLICY}|${asciiToHex("TestPlat")}`;
    expect(() => planUpdateEntry(entryIn(), { status: "Paused" }, BEACON_POLICY, AUTHORITY, {
      valueIn:  { [nft]: 1n, "|": 5_000_000n },
      valueOut: { [nft]: 1n, "|": 3_000_000n },
    })).toThrow(/UPD-VALUE/);
  });

  it("U-VALUE: giữ nguyên token, thêm ADA → qua", () => {
    const nft = `${BEACON_POLICY}|${asciiToHex("TestPlat")}`;
    const plan = planUpdateEntry(entryIn(), { status: "Paused" }, BEACON_POLICY, AUTHORITY, {
      valueIn:  { [nft]: 1n, "|": 2_000_000n },
      valueOut: { [nft]: 1n, "|": 2_500_000n },
    });
    expect(plan.entryOut.status).toBe("Paused");
  });
});

describe("bất biến thuần (dùng lại được ở nơi khác)", () => {
  const entryIn = (): PlatformEntry => planRegister(regParams(baseConfig())).entry;

  it("identityPreserved bắt sửa lén custody_hash / created_epoch / beacon_policy", () => {
    const a = entryIn();
    expect(identityPreserved(a, { ...a, custody_hash: "00".repeat(28) })).toBe(false);
    expect(identityPreserved(a, { ...a, created_epoch: a.created_epoch + 1n })).toBe(false);
    expect(identityPreserved(a, { ...a, beacon_policy: "00".repeat(28) })).toBe(false);
    expect(identityPreserved(a, { ...a, seed_policy: "00".repeat(28) })).toBe(false);
    expect(identityPreserved(a, { ...a, instance_id: asciiToHex("khac") })).toBe(false);
    expect(identityPreserved(a, { ...a, platform_id: asciiToHex("khac") })).toBe(false);
  });

  it("identityPreserved KHÔNG tính spec_version (nó có luật riêng)", () => {
    const a = entryIn();
    expect(identityPreserved(a, { ...a, spec_version: 3n })).toBe(true);
  });

  it("mutableFieldsValid biên cut_bps 0 và 10000", () => {
    const a = entryIn();
    expect(mutableFieldsValid({ ...a, cut_bps: 0n })).toBe(true);
    expect(mutableFieldsValid({ ...a, cut_bps: 10000n })).toBe(true);
    expect(mutableFieldsValid({ ...a, cut_bps: 10001n })).toBe(false);
    expect(mutableFieldsValid({ ...a, cut_bps: -1n })).toBe(false);
  });

  it("valuePreserved: token phải bằng nhau, lovelace chỉ được tăng", () => {
    const nft = "aa|bb";
    expect(valuePreserved({ [nft]: 1n, "|": 2n }, { [nft]: 1n, "|": 2n })).toBe(true);
    expect(valuePreserved({ [nft]: 1n, "|": 2n }, { [nft]: 1n, "|": 3n })).toBe(true);
    expect(valuePreserved({ [nft]: 1n, "|": 2n }, { [nft]: 1n, "|": 1n })).toBe(false);
    expect(valuePreserved({ [nft]: 1n }, {})).toBe(false);
    expect(valuePreserved({}, { [nft]: 1n })).toBe(false);
  });
});
