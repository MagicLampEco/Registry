// Registry · GƯƠNG HÌNH DẠNG + HỢP ĐỒNG THỜI GIAN — khoá ba lệch off-chain/on-chain.
//
// Vì sao có file này: ba lệch dưới đây KHÔNG làm hỏng biên dịch, KHÔNG làm đỏ test cũ, chỉ lộ
// ra khi có hồ sơ thật. Nên chúng phải bị khoá bằng test, không bằng lời hứa.
//
//  1. Off-chain CHẶN đúng thứ on-chain vừa mở — hồ sơ KHÔNG KHO (custody rỗng hết, accepted
//     rỗng, cut_bps 0, governance_ref vẫn bắt buộc). Đó là ca LampNet+Join (`Registrations/
//     join.md` khai `custody: CU-N`) — chính ca mà đợt sửa on-chain sinh ra để mở.
//  2. Off-chain LỎNG hơn on-chain — `governance_ref` phải ĐÚNG 28 byte (không chỉ khác rỗng),
//     và khác hash của chính validator registry (R-GOVSELF / S-GOVSELF).
//  3. Hợp đồng ttl — R-EPOCH đọc `validity_range`, nên tx phải ĐẶT validFrom/validTo và cửa sổ
//     phải nằm gọn trong MỘT ô thời gian (5 ngày kể từ mốc Unix, KHÔNG phải epoch Cardano).
//
// Nguồn on-chain đối chiếu (đọc 2026-08-14, SAU bản vá U-GOV2/M-GOV2):
//   onchain/lib/magiclamp/registry/platform.ak:99-155   shape_* / entry_well_formed / mutable_fields_valid
//   onchain/lib/magiclamp/registry/util.ak:116, 138-165 ms_per_time_bucket / get_time_bucket_bounded
//   onchain/validators/registry_beacon.ak:114, 161-175  R-GOVSELF / R-BIND chỉ áp hạng CÓ KHO
//   onchain/validators/registry.ak:154, 187, 251, 270   S-GOVSELF / U-SHAPE / M-DEST / M-MUT
//   onchain/validators/registry.ak:185, 276-277         U-GOVSELF-OUT / M-GOVSELF-OUT (nay NÉM)

import { describe, it, expect } from "vitest";
import {
  planRegister, planUpdateEntry, planMigrateEntry,
  entryWellFormed, mutableFieldsValid, isScriptHash28,
  shapeCustodial, shapeNonCustodial, entryShapeValid, governanceRefNotSelf,
  timeBucketOf, txValidityForTimeBucket, validityFitsOneBucket, timeBucketInWindow,
} from "../offchain/src/registrationBuilder.js";
import { decodePlatformEntry } from "../offchain/src/registryDatum.js";
import { verifyEntryAgainstCustody, safeToRouteFees } from "../offchain/src/registryQuery.js";
import { Data } from "@lucid-evolution/lucid";
import type { PlatformConfig, PlatformEntry } from "../offchain/src/types.js";
import { MS_PER_TIME_BUCKET, SPEC_VERSION_V2 } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const BEACON_POLICY = "12".repeat(28);
const CUSTODY_HASH  = "34".repeat(28);
const SEED_POLICY   = "56".repeat(28);
const AUTHORITY     = "ab".repeat(28);
const GOV_REF       = "cc".repeat(28);
const REGISTRY_HASH = "77".repeat(28);

/** R-GOVLIVE: mọi tx đăng ký hợp lệ phải làm cổng quản trị chạy thật (util.ak:194-206). */
const GOV_PROOF = { spends: [{ scriptHash: GOV_REF }] };

// ── Hồ sơ CÓ KHO (đối chứng) ───────────────────────────────────────────────
const custodialConfig = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  platformId: asciiToHex("TestPlat"),
  instanceId: asciiToHex("test-instance-v1"),
  acceptedAssets: [{ policy: "", name: "" }],
  buckets: [{ id: 0n, label: "ops" }],
  cutBps: 300n,
  governanceRef: GOV_REF,
  msPerTimeBucket: MS_PER_TIME_BUCKET,
  reservedMinAda: 2_000_000n,
  registryAuthority: AUTHORITY,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  ...over,
});

const okCustody = (cfg: PlatformConfig) => ({
  value: { [`${SEED_POLICY}|${cfg.instanceId.toLowerCase()}`]: 1n, "|": 2_000_000n },
  scriptHash: CUSTODY_HASH,
  txHash: "dd".repeat(32),
  outputIndex: 0,
});

const custodialEntry = (): PlatformEntry => planRegister({
  config: custodialConfig(),
  beaconPolicy: BEACON_POLICY,
  custodyHash: CUSTODY_HASH,
  seedPolicy: SEED_POLICY,
  createdEpoch: 10n,
  custodyUtxo: okCustody(custodialConfig()),
  governanceProof: GOV_PROOF,
}).entry;

// ── Hồ sơ KHÔNG KHO — hình dạng của LampNet+Join (CU-N) ────────────────────
// RỖNG HẾT: instanceId, custodyHash, seedPolicy; acceptedAssets rỗng; cutBps 0.
// `governanceRef` VẪN bắt buộc (không để gác tiền — để hồ sơ luôn có MỘT bên đồng thuận được).
const nonCustodialConfig = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  platformId: asciiToHex("LampNetJoin"),
  instanceId: "",
  acceptedAssets: [],
  buckets: [],
  cutBps: 0n,
  governanceRef: GOV_REF,
  msPerTimeBucket: MS_PER_TIME_BUCKET,
  reservedMinAda: 2_000_000n,
  registryAuthority: AUTHORITY,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  ...over,
});

const nonCustodialParams = (over: Record<string, unknown> = {}) => ({
  config: nonCustodialConfig(),
  beaconPolicy: BEACON_POLICY,
  custodyHash: "",
  seedPolicy: "",
  createdEpoch: 10n,
  governanceProof: GOV_PROOF,
  ...over,
});

// ═══ LỆCH 1 — hồ sơ KHÔNG KHO phải dựng được giao dịch ═══════════════════════

describe("LỆCH 1 · hồ sơ KHÔNG KHO (CU-N) dựng được giao dịch đăng ký", () => {
  it("planRegister KHÔNG cần custodyUtxo, trả plan hợp lệ, datum giải mã lại đúng", () => {
    const plan = planRegister(nonCustodialParams());

    expect(plan.custodial).toBe(false);
    expect(plan.custodyRef).toBeUndefined();
    expect(plan.entry.instance_id).toBe("");
    expect(plan.entry.custody_hash).toBe("");
    expect(plan.entry.seed_policy).toBe("");
    expect(plan.entry.accepted_assets).toEqual([]);
    expect(plan.entry.cut_bps).toBe(0n);
    expect(plan.entry.governance_ref).toBe(GOV_REF);   // vẫn BẮT BUỘC.
    expect(plan.entry.spec_version).toBe(SPEC_VERSION_V2);
    expect(plan.entry.status).toBe("Active");
    expect(entryWellFormed(plan.entry)).toBe(true);

    // Beacon NFT vẫn đúng như hồ sơ có kho — hạng không kho không phải hạng hai.
    expect(plan.nftName).toBe(asciiToHex("LampNetJoin"));
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("LampNetJoin")}`]).toBe(1n);
    expect(plan.requiredSigner).toBe(AUTHORITY);

    const back: PlatformEntry = decodePlatformEntry(Data.from(plan.entryDatumCbor));
    expect(back).toEqual(plan.entry);
  });

  it("tóm tắt nói rõ hạng + R-BIND không áp (đừng để người đọc tưởng thiếu kho)", () => {
    const plan = planRegister(nonCustodialParams());
    expect(plan.summary).toMatch(/KHÔNG KHO/);
    expect(plan.summary).toMatch(/R-BIND không áp/);
  });

  it("hồ sơ KHÔNG KHO vẫn qua R-EPOCH và R-GOVSELF như hồ sơ có kho", () => {
    const plan = planRegister(nonCustodialParams({
      timeBucketWindow: { from: 10n, to: 10n }, registryHash: REGISTRY_HASH,
    }));
    expect(plan.entry.created_epoch).toBe(10n);
    expect(() => planRegister(nonCustodialParams({
      timeBucketWindow: { from: 11n, to: 11n },
    }))).toThrow(/REG-EPOCH/);
  });

  it("hồ sơ CÓ KHO vẫn phải có custodyUtxo — mở hạng mới không nới hạng cũ", () => {
    const cfg = custodialConfig();
    expect(() => planRegister({
      config: cfg, beaconPolicy: BEACON_POLICY, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, governanceProof: GOV_PROOF,
    })).toThrow(/REG-BIND/);
  });
});

describe("LỆCH 1 · NỬA VỜI bị từ chối — hình dạng chính là hạng", () => {
  // Mỗi ca dưới đây là "một số trường rỗng, một số không": không thuộc hạng nào.
  const halfway: Array<[string, Record<string, unknown>]> = [
    ["khai không kho nhưng vẫn trỏ custody_hash",
      { ...nonCustodialParams(), custodyHash: CUSTODY_HASH }],
    ["khai không kho nhưng vẫn trỏ seed_policy",
      { ...nonCustodialParams(), seedPolicy: SEED_POLICY }],
    ["khai không kho nhưng vẫn có instance_id",
      { ...nonCustodialParams(), config: nonCustodialConfig({ instanceId: asciiToHex("inst") }) }],
    ["khai không kho nhưng vẫn thu asset",
      { ...nonCustodialParams(), config: nonCustodialConfig({ acceptedAssets: [{ policy: "", name: "" }] }) }],
    ["khai không kho nhưng cut_bps > 0",
      { ...nonCustodialParams(), config: nonCustodialConfig({ cutBps: 700n }) }],
    ["khai có kho nhưng accepted_assets rỗng",
      {
        config: custodialConfig({ acceptedAssets: [] }), beaconPolicy: BEACON_POLICY,
        custodyHash: CUSTODY_HASH, seedPolicy: SEED_POLICY, createdEpoch: 10n,
        custodyUtxo: okCustody(custodialConfig()),
      }],
    ["khai có kho nhưng custody_hash rỗng",
      {
        config: custodialConfig(), beaconPolicy: BEACON_POLICY,
        custodyHash: "", seedPolicy: SEED_POLICY, createdEpoch: 10n,
        custodyUtxo: okCustody(custodialConfig()),
      }],
  ];

  for (const [name, params] of halfway) {
    it(`${name} → REG-WF`, () => {
      expect(() => planRegister(params as never)).toThrow(/REG-WF/);
    });
  }

  it("custody_hash / seed_policy phải ĐÚNG 28 byte, không chỉ khác rỗng", () => {
    const cfg = custodialConfig();
    // 27 byte: trỏ tới một script KHÔNG THỂ tồn tại — on-chain ép độ dài, off-chain nay cũng.
    expect(() => planRegister({
      config: cfg, beaconPolicy: BEACON_POLICY, custodyHash: "34".repeat(27),
      seedPolicy: SEED_POLICY, createdEpoch: 10n, custodyUtxo: okCustody(cfg),
      governanceProof: GOV_PROOF,
    })).toThrow(/REG-WF/);
    expect(() => planRegister({
      config: cfg, beaconPolicy: BEACON_POLICY, custodyHash: CUSTODY_HASH,
      seedPolicy: "56".repeat(29), createdEpoch: 10n, custodyUtxo: okCustody(cfg),
      governanceProof: GOV_PROOF,
    })).toThrow(/REG-WF/);
  });

  it("vị từ thuần: không giá trị nào thoả CẢ HAI hạng, nửa vời không thoả hạng nào", () => {
    const cust = custodialEntry();
    expect(shapeCustodial(cust)).toBe(true);
    expect(shapeNonCustodial(cust)).toBe(false);

    const non = planRegister(nonCustodialParams()).entry;
    expect(shapeCustodial(non)).toBe(false);
    expect(shapeNonCustodial(non)).toBe(true);

    const half: PlatformEntry = { ...non, custody_hash: CUSTODY_HASH };
    expect(shapeCustodial(half)).toBe(false);
    expect(shapeNonCustodial(half)).toBe(false);
    expect(entryShapeValid(half)).toBe(false);
    expect(entryWellFormed(half)).toBe(false);
    expect(mutableFieldsValid(half)).toBe(false);
  });
});

describe("LỆCH 1 · U-SHAPE / M-SHAPE — không đổi hạng bằng đường cập nhật", () => {
  it("hồ sơ KHÔNG KHO cập nhật status vẫn qua (cut_bps 0 + accepted rỗng KHÔNG còn bị chặn)", () => {
    const non = planRegister(nonCustodialParams()).entry;
    const plan = planUpdateEntry(non, { status: "Paused" }, BEACON_POLICY, AUTHORITY);
    expect(plan.entryOut.status).toBe("Paused");
    expect(plan.entryOut.accepted_assets).toEqual([]);
    expect(plan.entryOut.cut_bps).toBe(0n);
  });

  it("hồ sơ KHÔNG KHO mà nhét accepted_assets vào → UPD-MUT (nửa vời)", () => {
    const non = planRegister(nonCustodialParams()).entry;
    expect(() => planUpdateEntry(
      non, { accepted_assets: [{ policy: "", name: "" }] }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true },
    )).toThrow(/UPD-MUT/);
  });

  it("hồ sơ CÓ KHO mà rút hết accepted_assets → UPD-MUT (không lách thành không-kho)", () => {
    expect(() => planUpdateEntry(
      custodialEntry(), { accepted_assets: [] }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true },
    )).toThrow(/UPD-MUT/);
  });

  it("di trú giữ nguyên hạng, và datum đích phải qua M-MUT", () => {
    const non = planRegister(nonCustodialParams()).entry;
    const plan = planMigrateEntry({
      entryIn: non, ownRegistryHash: REGISTRY_HASH, newRegistryHash: "88".repeat(28),
      newSpecVersion: 3n, registryAuthority: AUTHORITY, governanceConsent: true,
    });
    expect(plan.summary).toMatch(/KHÔNG KHO/);
    expect(plan.entryOut.spec_version).toBe(3n);

    // M-MUT: hồ sơ vào đã nửa vời thì di trú KHÔNG được dùng làm đường rửa hình dạng.
    expect(() => planMigrateEntry({
      entryIn: { ...non, custody_hash: CUSTODY_HASH },
      ownRegistryHash: REGISTRY_HASH, newRegistryHash: "88".repeat(28),
      newSpecVersion: 3n, registryAuthority: AUTHORITY, governanceConsent: true,
    })).toThrow(/MIG-MUT/);
  });
});

// ═══ LỆCH 2 — off-chain từng LỎNG hơn on-chain ══════════════════════════════

describe("LỆCH 2 · governance_ref phải ĐÚNG 28 byte", () => {
  it("isScriptHash28: chỉ 56 ký tự hex mới qua", () => {
    expect(isScriptHash28(GOV_REF)).toBe(true);
    expect(isScriptHash28("")).toBe(false);
    expect(isScriptHash28("cc".repeat(27))).toBe(false);
    expect(isScriptHash28("cc".repeat(29))).toBe(false);
    expect(isScriptHash28("zz".repeat(28))).toBe(false);     // đúng độ dài nhưng không phải hex.
    expect(isScriptHash28(`0x${GOV_REF}`)).toBe(true);       // tiền tố 0x được chuẩn hoá.
    expect(isScriptHash28(GOV_REF.toUpperCase())).toBe(true);
  });

  it("đăng ký với governance_ref 27 byte → REG-WF (giá trị rác = hồ sơ tự khoá chết)", () => {
    const cfg = custodialConfig({ governanceRef: "cc".repeat(27) });
    expect(() => planRegister({
      config: cfg, beaconPolicy: BEACON_POLICY, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, custodyUtxo: okCustody(cfg),
      governanceProof: { spends: [{ scriptHash: "cc".repeat(27) }] },
    })).toThrow(/REG-WF/);
  });

  it("cập nhật sang governance_ref rác → UPD-MUT (không chỉ 'khác rỗng')", () => {
    for (const bad of ["", "cc".repeat(27), "cc".repeat(29), "00"]) {
      expect(() => planUpdateEntry(
        custodialEntry(), { governance_ref: bad }, BEACON_POLICY, AUTHORITY,
        { governanceConsent: true },
      )).toThrow(/UPD-MUT/);
    }
  });

  it("mutableFieldsValid: 28 byte + đúng một hạng", () => {
    const a = custodialEntry();
    expect(mutableFieldsValid(a)).toBe(true);
    expect(mutableFieldsValid({ ...a, governance_ref: "" })).toBe(false);
    expect(mutableFieldsValid({ ...a, governance_ref: "cc".repeat(27) })).toBe(false);
    expect(mutableFieldsValid({ ...a, cut_bps: 10001n })).toBe(false);
  });
});

describe("LỆCH 2 · governance_ref != hash của chính registry (R-GOVSELF / S-GOVSELF)", () => {
  it("vị từ thuần", () => {
    const a = custodialEntry();
    expect(governanceRefNotSelf(a, REGISTRY_HASH)).toBe(true);
    expect(governanceRefNotSelf({ ...a, governance_ref: REGISTRY_HASH }, REGISTRY_HASH)).toBe(false);
    // so sánh không phân biệt hoa/thường — datum hex nào cũng chuẩn hoá trước.
    expect(governanceRefNotSelf(
      { ...a, governance_ref: REGISTRY_HASH.toUpperCase() }, REGISTRY_HASH,
    )).toBe(false);
  });

  it("đăng ký khai governance_ref = registry_hash → REG-GOVSELF", () => {
    const cfg = custodialConfig({ governanceRef: REGISTRY_HASH });
    expect(() => planRegister({
      config: cfg, beaconPolicy: BEACON_POLICY, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, custodyUtxo: okCustody(cfg),
      registryHash: REGISTRY_HASH,
      governanceProof: { spends: [{ scriptHash: REGISTRY_HASH }] },
    })).toThrow(/REG-GOVSELF/);
  });

  it("cập nhật một hồ sơ đã khai governance_ref = own_hash → UPD-GOVSELF", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: REGISTRY_HASH };
    expect(() => planUpdateEntry(
      bad, { status: "Paused" }, BEACON_POLICY, AUTHORITY, { ownRegistryHash: REGISTRY_HASH },
    )).toThrow(/UPD-GOVSELF/);
  });

  it("di trú một hồ sơ như vậy cũng bị chặn — S-GOVSELF ép TRƯỚC khi rẽ nhánh", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: REGISTRY_HASH };
    expect(() => planMigrateEntry({
      entryIn: bad, ownRegistryHash: REGISTRY_HASH, newRegistryHash: "88".repeat(28),
      newSpecVersion: 3n, registryAuthority: AUTHORITY, governanceConsent: true,
    })).toThrow(/MIG-GOVSELF/);
  });

  it("cập nhật ghi governance_ref = own_hash → UPD-GOVSELF-OUT (nay NÉM, không còn cảnh báo)", () => {
    // ⚠ CA NÀY ĐÃ LẬT. Bản trước off-chain chỉ CẢNH BÁO, với lý do "on-chain chưa chặn ca này
    // (S-GOVSELF chỉ soi entry_in)". Lời khai đó nay SAI: validator có U-GOVSELF-OUT
    // (`expect entry_out.governance_ref != own_hash`, registry.ak:185). Trả plan kèm cảnh báo
    // là trả một tx chắc chắn bị từ chối cho người gọi nào bỏ qua chuỗi cảnh báo.
    expect(() => planUpdateEntry(
      custodialEntry(), { governance_ref: REGISTRY_HASH }, BEACON_POLICY, AUTHORITY,
      { governanceConsent: true, ownRegistryHash: REGISTRY_HASH },
    )).toThrow(/UPD-GOVSELF-OUT/);
  });

  it("M-DEST: hash đích không đủ 28 byte → MIG-DEST (mất beacon vĩnh viễn)", () => {
    for (const bad of ["", "00", "88".repeat(27), "88".repeat(29), "zz".repeat(28)]) {
      expect(() => planMigrateEntry({
        entryIn: custodialEntry(), ownRegistryHash: REGISTRY_HASH, newRegistryHash: bad,
        newSpecVersion: 3n, registryAuthority: AUTHORITY, governanceConsent: true,
      })).toThrow(/MIG-DEST/);
    }
  });

  it("di trú tới registry đích == governance_ref → MIG-GOVSELF-DEST (nay NÉM)", () => {
    // ⚠ CA NÀY ĐÃ LẬT, cùng lý do với ca trên: validator có M-GOVSELF-OUT
    // (`entry_out.governance_ref != new_registry_hash`, registry.ak:276).
    expect(() => planMigrateEntry({
      entryIn: custodialEntry(), ownRegistryHash: REGISTRY_HASH, newRegistryHash: GOV_REF,
      newSpecVersion: 3n, registryAuthority: AUTHORITY, governanceConsent: true,
    })).toThrow(/MIG-GOVSELF-DEST/);
  });
});

// ═══ LỆCH 3 — tên gọi thời gian + hợp đồng ttl ══════════════════════════════

describe("LỆCH 3 · ô thời gian là ô 5 NGÀY kể từ mốc Unix, KHÔNG phải epoch Cardano", () => {
  it("hằng số là 432_000_000 cho MỌI mạng (on-chain là const, không phải tham số)", () => {
    expect(MS_PER_TIME_BUCKET).toBe(432_000_000n);
  });

  it("mốc Shelley (epoch 208, 1596059091 s) rơi vào ô 3694 — không phải 208", () => {
    // Con số này chép từ chú thích util.ak:93-96. Nó ở đây để ai đổi hằng số làm test đỏ.
    expect(timeBucketOf(1_596_059_091_000n)).toBe(3694n);
  });

  it("timeBucketOf khớp phép chia của validator, kể cả ngay tại biên ô", () => {
    expect(timeBucketOf(0n)).toBe(0n);
    expect(timeBucketOf(MS_PER_TIME_BUCKET - 1n)).toBe(0n);
    expect(timeBucketOf(MS_PER_TIME_BUCKET)).toBe(1n);
    expect(timeBucketOf(MS_PER_TIME_BUCKET * 7n + 5n)).toBe(7n);
  });
});

describe("LỆCH 3 · hợp đồng ttl — validFrom/validTo phải nằm gọn trong MỘT ô", () => {
  const bucket = 4000n;
  const start  = bucket * MS_PER_TIME_BUCKET;
  const end    = (bucket + 1n) * MS_PER_TIME_BUCKET;

  it("ttl bình thường: cửa sổ nguyên vẹn, không cắt", () => {
    const now = start + 1_000n;
    const w = txValidityForTimeBucket(now, 3_600_000n);
    expect(w.bucket).toBe(bucket);
    expect(w.validFrom).toBe(now);
    expect(w.validTo).toBe(now + 3_600_000n);
    expect(w.truncated).toBe(false);
    expect(validityFitsOneBucket(w)).toBe(true);
    expect(timeBucketInWindow(w.bucket, { from: w.bucket, to: w.bucket })).toBe(true);
  });

  it("ttl trót vượt biên ô → CẮT về đúng mốc biên (biên trên LOẠI TRỪ nên bằng mốc vẫn qua)", () => {
    const now = end - 1_000n;
    const w = txValidityForTimeBucket(now, 3_600_000n);
    expect(w.truncated).toBe(true);
    expect(w.validTo).toBe(end);                  // == (bucket+1) * 432_000_000, KHÔNG trừ 1.
    expect(w.msLeftInBucket).toBe(1_000n);
    expect(validityFitsOneBucket(w)).toBe(true);  // vì validator đọc hi_ms = validTo - 1.
  });

  it("cửa sổ vượt biên MỘT ms là trượt — đây là chỗ hợp đồng đứt nếu ai nới tay", () => {
    expect(validityFitsOneBucket({ validFrom: start, validTo: end })).toBe(true);
    expect(validityFitsOneBucket({ validFrom: start, validTo: end + 1n })).toBe(false);
    expect(validityFitsOneBucket({ validFrom: start - 1n, validTo: end })).toBe(false);
    expect(validityFitsOneBucket({ validFrom: start, validTo: start })).toBe(false);  // rỗng.
  });

  it("cửa sổ dựng ra luôn khai đúng created_epoch — nối trọn từ ttl tới datum", () => {
    const now = end - 500n;                        // sát biên: ca dễ hỏng nhất.
    const w = txValidityForTimeBucket(now, 86_400_000n);
    const plan = planRegister(nonCustodialParams({
      createdEpoch: w.bucket,
      timeBucketWindow: { from: w.bucket, to: w.bucket },
    }));
    expect(plan.entry.created_epoch).toBe(w.bucket);
    expect(validityFitsOneBucket(w)).toBe(true);
    expect(timeBucketOf(w.validTo - 1n)).toBe(plan.entry.created_epoch);
  });

  it("tham số vô lý bị chặn tại chỗ", () => {
    expect(() => txValidityForTimeBucket(-1n, 1_000n)).toThrow(/TTL-NOW/);
    expect(() => txValidityForTimeBucket(start, 0n)).toThrow(/TTL-LEN/);
    expect(() => txValidityForTimeBucket(start, -5n)).toThrow(/TTL-LEN/);
  });
});

// ═══ Hệ quả ở tầng quét sổ ══════════════════════════════════════════════════

describe("quét sổ · hồ sơ KHÔNG KHO nói đúng lý do, không giả vờ 'kho sai NFT'", () => {
  it("verifyEntryAgainstCustody trả lý do đúng hạng", () => {
    const non = planRegister(nonCustodialParams()).entry;
    const r = verifyEntryAgainstCustody(non, { assets: { lovelace: 2_000_000n } });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/KHÔNG KHO/);
  });

  it("safeToRouteFees vẫn từ chối route phí tới hồ sơ không kho", () => {
    const non = planRegister(nonCustodialParams()).entry;
    const res = safeToRouteFees(
      {
        entry: non, nftUnit: BEACON_POLICY + non.platform_id,
        utxo: { assets: {} }, duplicate: false, policyMismatch: false,
      },
      { assets: { lovelace: 2_000_000n } },
    );
    expect(res.ok).toBe(false);
    expect(res.reasons.join(" ")).toMatch(/KHÔNG KHO/);
  });
});
