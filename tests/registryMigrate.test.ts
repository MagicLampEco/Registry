// Registry · planMigrateEntry (M-SIG/M-GOV/M-DEST/M-ID/M-STATUS/M-VER/M-NFT/M-VALUE).
//
// Ca quan trọng nhất: hồ sơ đã `Retired` PHẢI di trú được. Trước đây nó kẹt vĩnh viễn khi
// xoay quyền đăng ký — chính là lỗ mà nhánh này vá.

import { describe, it, expect } from "vitest";
import {
  planMigrateEntry, planRegister, type MigrateParams,
} from "../offchain/src/registrationBuilder.js";
import { registryRedeemerFromCbor } from "../offchain/src/registryDatum.js";
import type { PlatformConfig, PlatformEntry } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const BEACON_POLICY = "12".repeat(28);
const CUSTODY_HASH  = "34".repeat(28);
const SEED_POLICY   = "56".repeat(28);
const AUTHORITY     = "ab".repeat(28);
const OWN_HASH      = "77".repeat(28);
const NEW_HASH      = "88".repeat(28);

const cfg = (): PlatformConfig => ({
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
});

const entry = (over: Partial<PlatformEntry> = {}): PlatformEntry => ({
  ...planRegister({
    config: cfg(),
    beaconPolicy: BEACON_POLICY,
    custodyHash: CUSTODY_HASH,
    seedPolicy: SEED_POLICY,
    createdEpoch: 10n,
    custodyUtxo: {
      value: { [`${SEED_POLICY}|${asciiToHex("test-instance-v1")}`]: 1n, "|": 2_000_000n },
      scriptHash: CUSTODY_HASH,
    },
  }).entry,
  ...over,
});

const migParams = (over: Partial<MigrateParams> = {}): MigrateParams => ({
  entryIn: entry(),
  ownRegistryHash: OWN_HASH,
  newRegistryHash: NEW_HASH,
  newSpecVersion: 3n,
  registryAuthority: AUTHORITY,
  governanceConsent: true,
  ...over,
});

describe("planMigrateEntry — đường xuôi", () => {
  it("tăng spec_version, giữ định danh + status, redeemer = MigrateEntry(hash, ver)", () => {
    const plan = planMigrateEntry(migParams());
    expect(plan.entryOut.spec_version).toBe(3n);
    expect(plan.entryOut.status).toBe("Active");
    expect(plan.entryOut.platform_id).toBe(asciiToHex("TestPlat"));
    expect(plan.newRegistryHash).toBe(NEW_HASH);
    expect(plan.nftUnit).toBe(BEACON_POLICY + asciiToHex("TestPlat"));
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("TestPlat")}`]).toBe(1n);
    expect(plan.requiredSigner).toBe(AUTHORITY);
    expect(registryRedeemerFromCbor(plan.redeemerCbor)).toEqual({
      kind: "MigrateEntry", new_registry_hash: NEW_HASH, new_spec_version: 3n,
    });
  });

  it("HỒ SƠ RETIRED VẪN DI TRÚ ĐƯỢC — lỗ đang vá (U-TERMINAL không áp ở nhánh này)", () => {
    const plan = planMigrateEntry(migParams({ entryIn: entry({ status: "Retired" }) }));
    expect(plan.entryOut.status).toBe("Retired");
    expect(plan.entryOut.spec_version).toBe(3n);
  });

  it("hồ sơ Paused di trú giữ nguyên Paused", () => {
    const plan = planMigrateEntry(migParams({ entryIn: entry({ status: "Paused" }) }));
    expect(plan.entryOut.status).toBe("Paused");
  });
});

describe("planMigrateEntry — từ chối", () => {
  it("M-DEST: new_registry_hash == own_hash → MIG-DEST", () => {
    expect(() => planMigrateEntry(migParams({ newRegistryHash: OWN_HASH }))).toThrow(/MIG-DEST/);
  });

  it("M-DEST: hash đích rỗng → MIG-DEST", () => {
    expect(() => planMigrateEntry(migParams({ newRegistryHash: "" }))).toThrow(/MIG-DEST/);
  });

  it("M-VER: new_spec_version <= cũ → MIG-VER", () => {
    expect(() => planMigrateEntry(migParams({ newSpecVersion: 2n }))).toThrow(/MIG-VER/);
    expect(() => planMigrateEntry(migParams({ newSpecVersion: 1n }))).toThrow(/MIG-VER/);
  });

  it("M-GOV: thiếu đồng thuận quản trị → MIG-GOV", () => {
    expect(() => planMigrateEntry(migParams({ governanceConsent: false }))).toThrow(/MIG-GOV/);
  });

  it("M-VALUE: rút giá trị khỏi ô hồ sơ → MIG-VALUE", () => {
    const nft = `${BEACON_POLICY}|${asciiToHex("TestPlat")}`;
    expect(() => planMigrateEntry(migParams({
      valueIn:  { [nft]: 1n, "|": 5_000_000n },
      valueOut: { [nft]: 1n, "|": 4_000_000n },
    }))).toThrow(/MIG-VALUE/);
  });

  it("M-VALUE: giữ nguyên → qua", () => {
    const nft = `${BEACON_POLICY}|${asciiToHex("TestPlat")}`;
    const plan = planMigrateEntry(migParams({
      valueIn:  { [nft]: 1n, "|": 5_000_000n },
      valueOut: { [nft]: 1n, "|": 5_000_000n },
    }));
    expect(plan.entryOut.spec_version).toBe(3n);
  });

  it("M-STATUS: di trú KHÔNG phải đường Retire trá hình — status luôn giữ nguyên", () => {
    // Không có tham số nào cho phép đổi status; hồ sơ ra luôn cùng status với hồ sơ vào.
    for (const s of ["Active", "Paused", "Retired"] as const) {
      expect(planMigrateEntry(migParams({ entryIn: entry({ status: s }) })).entryOut.status).toBe(s);
    }
  });
});
