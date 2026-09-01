// Registry · quét sổ theo policy từ utxos[] thuần (không cần chain thật) + BỐN VAN trước khi
// route phí: đối soát kho thật, tìm định danh trùng, cảnh báo hồ sơ ở script lạ.

import { describe, it, expect } from "vitest";
import {
  discoverPlatforms, filterByStatus, findPlatform, platformNftPresent,
  findDuplicatePlatformIds, verifyEntryAgainstCustody, safeToRouteFees,
  type QueryUtxo,
} from "../offchain/src/registryQuery.js";
import { planRegister } from "../offchain/src/registrationBuilder.js";
import { platformEntryToCbor } from "../offchain/src/registryDatum.js";
import type { PlatformEntry } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";
import { MS_PER_TIME_BUCKET } from "../offchain/src/types.js";

const BEACON = "12".repeat(28);
const CUSTODY_HASH = "34".repeat(28);
const SEED_POLICY  = "56".repeat(28);
const REGISTRY_HASH = "77".repeat(28);

/** Dựng UTxO hồ sơ mang beacon NFT + inline datum từ một PlatformEntry. */
function entryUtxo(entry: PlatformEntry, extraAssets: Record<string, bigint> = {}): QueryUtxo {
  const unit = BEACON + entry.platform_id;
  return {
    assets: { lovelace: 2_000_000n, [unit]: 1n, ...extraAssets },
    datum: platformEntryToCbor(entry),
    txHash: "aa".repeat(32),
    outputIndex: 0,
  };
}

function mkEntry(name: string, status: PlatformEntry["status"] = "Active"): PlatformEntry {
  const plan = planRegister({
    config: {
      platformId: asciiToHex(name),
      instanceId: asciiToHex(`${name}-inst`),
      acceptedAssets: [{ policy: "", name: "" }],
      buckets: [{ id: 0n, label: "ops" }],
      cutBps: 300n,
      governanceRef: "cc".repeat(28),
      msPerTimeBucket: MS_PER_TIME_BUCKET,
      reservedMinAda: 2_000_000n,
      registryAuthority: "ab".repeat(28),
      genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
    },
    beaconPolicy: BEACON, custodyHash: CUSTODY_HASH, seedPolicy: SEED_POLICY,
    createdEpoch: 1n,
    // R-GOVLIVE: cổng quản trị chạy thật trong tx đăng ký (gương util.governance_consented).
    governanceProof: { spends: [{ scriptHash: "cc".repeat(28) }] },
    custodyUtxo: {
      value: { [`${SEED_POLICY}|${asciiToHex(`${name}-inst`)}`]: 1n, "|": 2_000_000n },
      scriptHash: CUSTODY_HASH,
    },
  });
  return { ...plan.entry, status };
}

describe("discoverPlatforms — quét sổ theo policy", () => {
  it("giải mã mọi ô hồ sơ mang beacon NFT", () => {
    const utxos: QueryUtxo[] = [
      entryUtxo(mkEntry("PhoenixKey")),
      entryUtxo(mkEntry("OriLife")),
      { assets: { lovelace: 5_000_000n }, datum: null },   // UTxO thường → bỏ qua.
    ];
    const found = discoverPlatforms(utxos, BEACON);
    expect(found.length).toBe(2);
    expect(found.map((p) => p.entry.platform_id).sort())
      .toEqual([asciiToHex("OriLife"), asciiToHex("PhoenixKey")].sort());
    expect(found[0]!.nftUnit.startsWith(BEACON)).toBe(true);
    expect(found[0]!.entry.spec_version).toBe(2n);
  });

  it("loại hồ sơ giả: datum.platform_id != NFT name", () => {
    const real = mkEntry("PhoenixKey");
    const fake: QueryUtxo = {
      assets: { lovelace: 2_000_000n, [BEACON + asciiToHex("PhoenixKey")]: 1n },
      datum: platformEntryToCbor({ ...real, platform_id: asciiToHex("OriLife") }),
    };
    expect(discoverPlatforms([fake], BEACON).length).toBe(0);
    expect(() => discoverPlatforms([fake], BEACON, { strict: true })).toThrow(/QUERY-004/);
  });

  it("strict: ô hồ sơ thiếu datum → ném QUERY-003", () => {
    const u: QueryUtxo = { assets: { lovelace: 2_000_000n, [BEACON + asciiToHex("X")]: 1n }, datum: null };
    expect(discoverPlatforms([u], BEACON).length).toBe(0);
    expect(() => discoverPlatforms([u], BEACON, { strict: true })).toThrow(/QUERY-003/);
  });

  it("bỏ qua policy khác (chỉ lọc đúng policy beacon)", () => {
    const u = entryUtxo(mkEntry("PhoenixKey"));
    expect(discoverPlatforms([u], "99".repeat(28)).length).toBe(0);
  });

  it("datum sai lược đồ (v1 9 trường) → bỏ qua; strict → ném", () => {
    // "d8799f..." tự dựng: Constr(0,[]) — không đủ trường v2.
    const u: QueryUtxo = {
      assets: { lovelace: 2_000_000n, [BEACON + asciiToHex("X")]: 1n },
      datum: "d87980",
    };
    expect(discoverPlatforms([u], BEACON).length).toBe(0);
    expect(() => discoverPlatforms([u], BEACON, { strict: true })).toThrow(/RDATUM-021/);
  });

  it("van bổ sung: datum tự khai beacon_policy khác policy quét → policyMismatch", () => {
    const e = mkEntry("PhoenixKey");
    const liar = { ...e, beacon_policy: "99".repeat(28) };
    const found = discoverPlatforms([entryUtxo(liar)], BEACON);
    expect(found.length).toBe(1);
    expect(found[0]!.policyMismatch).toBe(true);
    expect(discoverPlatforms([entryUtxo(e)], BEACON)[0]!.policyMismatch).toBe(false);
    expect(() => discoverPlatforms([entryUtxo(liar)], BEACON, { strict: true })).toThrow(/QUERY-005/);
  });
});

describe("lọc + tìm + hiện diện NFT", () => {
  const utxos = [
    entryUtxo(mkEntry("PhoenixKey", "Active")),
    entryUtxo(mkEntry("OriLife", "Paused")),
  ];
  const found = discoverPlatforms(utxos, BEACON);

  it("filterByStatus", () => {
    expect(filterByStatus(found, "Active").length).toBe(1);
    expect(filterByStatus(found, "Active")[0]!.entry.platform_id).toBe(asciiToHex("PhoenixKey"));
  });
  it("findPlatform theo id", () => {
    expect(findPlatform(found, asciiToHex("OriLife"))!.entry.status).toBe("Paused");
    expect(findPlatform(found, asciiToHex("Nope"))).toBeUndefined();
  });
  it("platformNftPresent", () => {
    expect(platformNftPresent(utxos[0]!, BEACON, asciiToHex("PhoenixKey"))).toBe(true);
    expect(platformNftPresent(utxos[0]!, BEACON, asciiToHex("OriLife"))).toBe(false);
  });
});

describe("VAN #2 — định danh trùng (không im lặng chọn cái đầu)", () => {
  it("2 hồ sơ trùng platform_id → đánh dấu duplicate + findDuplicatePlatformIds bắt được", () => {
    const dup1 = mkEntry("PhoenixKey", "Active");
    const dup2 = mkEntry("PhoenixKey", "Paused");
    const uniq = mkEntry("OriLife", "Active");
    const utxos: QueryUtxo[] = [
      entryUtxo(dup1),
      { ...entryUtxo(dup2), txHash: "bb".repeat(32), outputIndex: 1 },
      entryUtxo(uniq),
    ];
    const found = discoverPlatforms(utxos, BEACON);
    expect(found.length).toBe(3);

    const pk = found.filter((p) => p.entry.platform_id === asciiToHex("PhoenixKey"));
    expect(pk.length).toBe(2);
    expect(pk.every((p) => p.duplicate)).toBe(true);
    expect(found.find((p) => p.entry.platform_id === asciiToHex("OriLife"))!.duplicate).toBe(false);

    const dups = findDuplicatePlatformIds(found);
    expect(dups.size).toBe(1);
    expect(dups.get(asciiToHex("PhoenixKey"))!.length).toBe(2);
    expect(dups.has(asciiToHex("OriLife"))).toBe(false);
  });

  it("không trùng → findDuplicatePlatformIds rỗng", () => {
    const found = discoverPlatforms(
      [entryUtxo(mkEntry("PhoenixKey")), entryUtxo(mkEntry("OriLife"))], BEACON,
    );
    expect(findDuplicatePlatformIds(found).size).toBe(0);
    expect(found.every((p) => !p.duplicate)).toBe(true);
  });
});

describe("VAN #3 — hồ sơ ở script lạ", () => {
  it("cấp registryScriptHash → hồ sơ ngoài registry thật bị đánh foreignScript", () => {
    const good: QueryUtxo = { ...entryUtxo(mkEntry("PhoenixKey")), scriptHash: REGISTRY_HASH };
    const foreign: QueryUtxo = { ...entryUtxo(mkEntry("OriLife")), scriptHash: "99".repeat(28) };
    const found = discoverPlatforms([good, foreign], BEACON, { registryScriptHash: REGISTRY_HASH });
    expect(found.find((p) => p.entry.platform_id === asciiToHex("PhoenixKey"))!.foreignScript).toBe(false);
    expect(found.find((p) => p.entry.platform_id === asciiToHex("OriLife"))!.foreignScript).toBe(true);
  });

  it("UTxO không có scriptHash mà lại đòi đối soát → coi là script lạ", () => {
    const found = discoverPlatforms([entryUtxo(mkEntry("PhoenixKey"))], BEACON,
      { registryScriptHash: REGISTRY_HASH });
    expect(found[0]!.foreignScript).toBe(true);
  });
});

describe("VAN #1 — đối soát hồ sơ với kho THẬT", () => {
  const entry = mkEntry("PhoenixKey");
  const instHex = asciiToHex("PhoenixKey-inst");

  it("kho mang đúng 1 NFT @ đúng script hash → ok", () => {
    const custody: QueryUtxo = {
      assets: { lovelace: 2_000_000n, [SEED_POLICY + instHex]: 1n },
      scriptHash: CUSTODY_HASH,
    };
    expect(verifyEntryAgainstCustody(entry, custody)).toEqual({ ok: true });
  });

  it("sai script hash → {ok:false, nêu custody_hash}", () => {
    const custody: QueryUtxo = {
      assets: { lovelace: 2_000_000n, [SEED_POLICY + instHex]: 1n },
      scriptHash: "00".repeat(28),
    };
    const r = verifyEntryAgainstCustody(entry, custody);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/custody_hash/);
  });

  it("thiếu NFT authenticity → {ok:false, nêu NFT}", () => {
    const r = verifyEntryAgainstCustody(entry, { assets: { lovelace: 2_000_000n }, scriptHash: CUSTODY_HASH });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/NFT/);
  });

  it("thiếu scriptHash (không đối soát được) → {ok:false}", () => {
    const r = verifyEntryAgainstCustody(entry, {
      assets: { lovelace: 2_000_000n, [SEED_POLICY + instHex]: 1n },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/scriptHash/);
  });

  it("kho TỰ DỰNG (đúng NFT, sai địa chỉ) vẫn bị chặn — R-BIND on-chain không bắt được ca này", () => {
    const fake: QueryUtxo = {
      assets: { lovelace: 2_000_000n, [SEED_POLICY + instHex]: 1n },
      scriptHash: "de".repeat(28),
    };
    expect(verifyEntryAgainstCustody(entry, fake).ok).toBe(false);
  });
});

describe("safeToRouteFees — gộp bốn van thành một lượt kiểm", () => {
  const instHex = asciiToHex("PhoenixKey-inst");
  const okCustody: QueryUtxo = {
    assets: { lovelace: 2_000_000n, [SEED_POLICY + instHex]: 1n },
    scriptHash: CUSTODY_HASH,
  };

  it("sạch cả bốn van + Active + kho khớp → ok", () => {
    const found = discoverPlatforms(
      [{ ...entryUtxo(mkEntry("PhoenixKey")), scriptHash: REGISTRY_HASH }],
      BEACON, { registryScriptHash: REGISTRY_HASH },
    );
    expect(safeToRouteFees(found[0]!, okCustody)).toEqual({ ok: true, reasons: [] });
  });

  it("trùng id → chặn, nêu lý do", () => {
    const utxos = [
      { ...entryUtxo(mkEntry("PhoenixKey")), scriptHash: REGISTRY_HASH },
      { ...entryUtxo(mkEntry("PhoenixKey", "Active")), scriptHash: REGISTRY_HASH, outputIndex: 1 },
    ];
    const found = discoverPlatforms(utxos, BEACON, { registryScriptHash: REGISTRY_HASH });
    const r = safeToRouteFees(found[0]!, okCustody);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => /TRÙNG/.test(x))).toBe(true);
  });

  it("status Paused → chặn khi đòi Active; bỏ đòi hỏi thì qua", () => {
    const found = discoverPlatforms(
      [{ ...entryUtxo(mkEntry("PhoenixKey", "Paused")), scriptHash: REGISTRY_HASH }],
      BEACON, { registryScriptHash: REGISTRY_HASH },
    );
    expect(safeToRouteFees(found[0]!, okCustody).ok).toBe(false);
    expect(safeToRouteFees(found[0]!, okCustody, { requireActive: false }).ok).toBe(true);
  });

  it("kho sai → chặn, nêu van #1", () => {
    const found = discoverPlatforms(
      [{ ...entryUtxo(mkEntry("PhoenixKey")), scriptHash: REGISTRY_HASH }],
      BEACON, { registryScriptHash: REGISTRY_HASH },
    );
    const r = safeToRouteFees(found[0]!, { assets: { lovelace: 2_000_000n }, scriptHash: CUSTODY_HASH });
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => /van #1/.test(x))).toBe(true);
  });
});
