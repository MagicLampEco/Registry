// Registry · GƯƠNG HÌNH DẠNG + HỢP ĐỒNG THỜI GIAN — khoá ba lệch off-chain/on-chain.
//
// Vì sao có file này: ba lệch dưới đây KHÔNG làm hỏng biên dịch, KHÔNG làm đỏ test cũ, chỉ lộ
// ra khi có hồ sơ thật. Nên chúng phải bị khoá bằng test, không bằng lời hứa.
//
//  1. Off-chain CHẶN đúng thứ on-chain vừa mở — hồ sơ KHÔNG KHO (custody rỗng hết, accepted
//     rỗng, cut_bps 0, governance_ref vẫn bắt buộc). Đó là ca LampNet+Join (`Registrations/
//     lampnet.md` khai `custody: CU-N`) — chính ca mà đợt sửa on-chain sinh ra để mở.
//  2. Off-chain LỎNG hơn on-chain — `governance_ref` phải ĐÚNG 28 byte (không chỉ khác rỗng),
//     và khác hash của chính validator registry (R-GOVSELF / S-GOVSELF).
//  3. Hợp đồng ttl — R-EPOCH đọc `validity_range`, nên tx phải ĐẶT validFrom/validTo và cửa sổ
//     phải nằm gọn trong MỘT ô thời gian (5 ngày kể từ mốc Unix, KHÔNG phải epoch Cardano).
//
// Nguồn on-chain đối chiếu (đọc 2026-08-14, SAU bản vá U-GOV2/M-GOV2):
//   onchain/lib/magiclamp/registry/platform.ak:139-249  shape_* / entry_well_formed / mutable_fields_valid
//   onchain/lib/magiclamp/registry/util.ak:152, 161-202 ms_per_time_bucket / get_time_bucket_bounded
//   onchain/validators/registry_beacon.ak:133, 183-197  R-GOVSELF / R-BIND chỉ áp hạng CÓ KHO
//   onchain/validators/registry.ak:174, 218, 280, 306   S-GOVSELF / U-SHAPE / M-DEST / M-MUT
//   onchain/validators/registry.ak:212, 314-315         U-GOVSELF-OUT / M-GOVSELF-OUT (nay NÉM)

import { describe, it, expect } from "vitest";
import {
  planRegister, planUpdateEntry, planMigrateEntry,
  entryWellFormed, mutableFieldsValid, isScriptHash28, changesRequireGovernance,
  shapeCustodial, shapeNonCustodial, entryShapeValid, governanceRefNotSelf,
  timeBucketOf, txValidityForTimeBucket, validityFitsOneBucket, timeBucketInWindow,
  type EntryChanges, type UpdateOptions, type MigrateParams,
} from "../offchain/src/registrationBuilder.js";
import { decodePlatformEntry } from "../offchain/src/registryDatum.js";
import { verifyEntryAgainstCustody, safeToRouteFees } from "../offchain/src/registryQuery.js";
import { Data } from "@lucid-evolution/lucid";
import type { PlatformConfig, PlatformEntry, RegistryScripts } from "../offchain/src/types.js";
import { MS_PER_TIME_BUCKET, SPEC_VERSION_V2 } from "../offchain/src/types.js";
import { asciiToHex } from "../offchain/src/encoding.js";

const BEACON_POLICY = "12".repeat(28);
const CUSTODY_HASH  = "34".repeat(28);
const SEED_POLICY   = "56".repeat(28);
const AUTHORITY     = "ab".repeat(28);
const GOV_REF       = "cc".repeat(28);
const REGISTRY_HASH = "77".repeat(28);

/**
 * BỘ BA của MỘT lần triển khai giả định, dùng chung cho cả tệp.
 *
 * ⚠ Ba giá trị này là hằng số bịa, KHÔNG có quan hệ mật mã thật với nhau (thật thì
 * `beaconPolicy` phải là policy id của `registry_beacon` đã apply đúng `registryHash` — muốn
 * dựng được phải chạy `applyRegistry`, tức phải có lucid + blueprint). SDK KHÔNG kiểm được
 * quan hệ đó và không giả vờ kiểm. Cái nó kiểm là ba giá trị ĐI CÙNG NHAU: một lời gọi lấy
 * `beaconPolicy` của bộ này và `registryHash` của bộ khác nay là lỗi kiểu, không còn là một
 * đối số bị quên.
 *
 * Bản trước của tệp này rải `BEACON_POLICY` và `REGISTRY_HASH` ra từng lời gọi như hai chuỗi
 * không liên quan, và bộ kiểm vẫn xanh — đó chính là hình dạng của lỗ đang vá.
 */
const SCRIPTS: RegistryScripts = {
  registryAuthority: AUTHORITY,
  registryHash:      REGISTRY_HASH,
  beaconPolicy:      BEACON_POLICY,
};

/** Cửa sổ ô thời gian khớp `createdEpoch: 10n` của mọi fixture dưới đây (R-EPOCH nay bắt buộc). */
const WINDOW_10 = { from: 10n, to: 10n };

/** Value ô hồ sơ VÀO/RA mặc định — U-VALUE / M-VALUE nay bắt buộc, giữ nguyên là qua. */
const entryVal = (platformIdHex: string) =>
  ({ [`${BEACON_POLICY}|${platformIdHex}`]: 1n, "|": 2_000_000n });

/** R-GOVLIVE: mọi tx đăng ký hợp lệ phải làm cổng quản trị chạy thật (util.ak:204-216). */
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
  substrateFlags: 0n,
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
  scripts: SCRIPTS,
  custodyHash: CUSTODY_HASH,
  seedPolicy: SEED_POLICY,
  createdEpoch: 10n,
  timeBucketWindow: WINDOW_10,
  custodyUtxo: okCustody(custodialConfig()),
  governanceProof: GOV_PROOF,
}).entry;

// ── Hồ sơ KHÔNG KHO — hình dạng của LampNet+Join (CU-N) ────────────────────
// RỖNG HẾT: instanceId, custodyHash, seedPolicy; acceptedAssets rỗng; cutBps 0.
// `governanceRef` VẪN bắt buộc (không để gác tiền — để hồ sơ luôn có MỘT bên đồng thuận được).
const nonCustodialConfig = (over: Partial<PlatformConfig> = {}): PlatformConfig => ({
  platformId: asciiToHex("lampnet"),
  instanceId: "",
  acceptedAssets: [],
  buckets: [],
  cutBps: 0n,
  governanceRef: GOV_REF,
  msPerTimeBucket: MS_PER_TIME_BUCKET,
  reservedMinAda: 2_000_000n,
  registryAuthority: AUTHORITY,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  substrateFlags: 0n,
  ...over,
});

const nonCustodialParams = (over: Record<string, unknown> = {}) => ({
  config: nonCustodialConfig(),
  scripts: SCRIPTS,
  custodyHash: "",
  seedPolicy: "",
  createdEpoch: 10n,
  timeBucketWindow: WINDOW_10,
  governanceProof: GOV_PROOF,
  substrateFlags: 0n,
  ...over,
});

// ── Hai lối tắt cho hai nhánh spend ────────────────────────────────────────
// `opts` của `planUpdateEntry` và hai `value` của `planMigrateEntry` nay BẮT BUỘC (gương
// U-VALUE / M-VALUE vô điều kiện). Hai hàm dưới đây điền value GIỮ NGUYÊN — tức ca đi qua
// U-VALUE — để mỗi bài chỉ phải nói ra thứ nó thật sự đang kiểm. Bài nào kiểm chính U-VALUE
// thì khai `valueIn`/`valueOut` tường minh, đè lên mặc định này.

const upd = (
  entryIn: PlatformEntry, changes: EntryChanges, opts: Partial<UpdateOptions> = {},
) => planUpdateEntry(entryIn, changes, SCRIPTS, {
  valueIn:  entryVal(entryIn.platform_id),
  valueOut: entryVal(entryIn.platform_id),
  ...opts,
});

const mig = (over: Partial<MigrateParams> = {}) => {
  const entryIn = over.entryIn ?? custodialEntry();
  return planMigrateEntry({
    entryIn,
    scripts: SCRIPTS,
    newRegistryHash: "88".repeat(28),
    newSpecVersion: 3n,
    governanceConsent: true,
    valueIn:  entryVal(entryIn.platform_id),
    valueOut: entryVal(entryIn.platform_id),
    ...over,
  });
};

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
    expect(plan.nftName).toBe(asciiToHex("lampnet"));
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("lampnet")}`]).toBe(1n);
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
    const plan = planRegister(nonCustodialParams());
    expect(plan.entry.created_epoch).toBe(10n);
    expect(() => planRegister(nonCustodialParams({
      timeBucketWindow: { from: 11n, to: 11n },
    }))).toThrow(/REG-EPOCH/);
  });

  it("hồ sơ CÓ KHO vẫn phải có custodyUtxo — mở hạng mới không nới hạng cũ", () => {
    const cfg = custodialConfig();
    expect(() => planRegister({
      config: cfg, scripts: SCRIPTS, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, timeBucketWindow: WINDOW_10,
      governanceProof: GOV_PROOF,
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
        config: custodialConfig({ acceptedAssets: [] }), scripts: SCRIPTS,
        custodyHash: CUSTODY_HASH, seedPolicy: SEED_POLICY, createdEpoch: 10n,
        timeBucketWindow: WINDOW_10, governanceProof: GOV_PROOF,
        custodyUtxo: okCustody(custodialConfig()),
      }],
    ["khai có kho nhưng custody_hash rỗng",
      {
        config: custodialConfig(), scripts: SCRIPTS,
        custodyHash: "", seedPolicy: SEED_POLICY, createdEpoch: 10n,
        timeBucketWindow: WINDOW_10, governanceProof: GOV_PROOF,
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
      config: cfg, scripts: SCRIPTS, custodyHash: "34".repeat(27),
      seedPolicy: SEED_POLICY, createdEpoch: 10n, timeBucketWindow: WINDOW_10,
      custodyUtxo: okCustody(cfg), governanceProof: GOV_PROOF,
    })).toThrow(/REG-WF/);
    expect(() => planRegister({
      config: cfg, scripts: SCRIPTS, custodyHash: CUSTODY_HASH,
      seedPolicy: "56".repeat(29), createdEpoch: 10n, timeBucketWindow: WINDOW_10,
      custodyUtxo: okCustody(cfg), governanceProof: GOV_PROOF,
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
    const plan = upd(non, { status: "Paused" });
    expect(plan.entryOut.status).toBe("Paused");
    expect(plan.entryOut.accepted_assets).toEqual([]);
    expect(plan.entryOut.cut_bps).toBe(0n);
  });

  it("hồ sơ KHÔNG KHO mà nhét accepted_assets vào → UPD-MUT (nửa vời)", () => {
    const non = planRegister(nonCustodialParams()).entry;
    expect(() => upd(
      non, { accepted_assets: [{ policy: "", name: "" }] }, { governanceConsent: true },
    )).toThrow(/UPD-MUT/);
  });

  it("hồ sơ CÓ KHO mà rút hết accepted_assets → UPD-MUT (không lách thành không-kho)", () => {
    expect(() => upd(
      custodialEntry(), { accepted_assets: [] }, { governanceConsent: true },
    )).toThrow(/UPD-MUT/);
  });

  it("di trú giữ nguyên hạng, và datum đích phải qua M-MUT", () => {
    const non = planRegister(nonCustodialParams()).entry;
    const plan = mig({ entryIn: non });
    expect(plan.summary).toMatch(/KHÔNG KHO/);
    expect(plan.entryOut.spec_version).toBe(3n);

    // M-MUT: hồ sơ vào đã nửa vời thì di trú KHÔNG được dùng làm đường rửa hình dạng.
    expect(() => mig({ entryIn: { ...non, custody_hash: CUSTODY_HASH } })).toThrow(/MIG-MUT/);
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
      config: cfg, scripts: SCRIPTS, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, timeBucketWindow: WINDOW_10,
      custodyUtxo: okCustody(cfg),
      governanceProof: { spends: [{ scriptHash: "cc".repeat(27) }] },
    })).toThrow(/REG-WF/);
  });

  it("cập nhật sang governance_ref rác → UPD-MUT (không chỉ 'khác rỗng')", () => {
    for (const bad of ["", "cc".repeat(27), "cc".repeat(29), "00"]) {
      expect(() => upd(
        custodialEntry(), { governance_ref: bad }, { governanceConsent: true },
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
      config: cfg, scripts: SCRIPTS, custodyHash: CUSTODY_HASH,
      seedPolicy: SEED_POLICY, createdEpoch: 10n, timeBucketWindow: WINDOW_10,
      custodyUtxo: okCustody(cfg),
      governanceProof: { spends: [{ scriptHash: REGISTRY_HASH }] },
    })).toThrow(/REG-GOVSELF/);
  });

  it("cập nhật một hồ sơ đã khai governance_ref = own_hash → UPD-GOVSELF", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: REGISTRY_HASH };
    // ⚠ Dấu HAI CHẤM không thừa: `/UPD-GOVSELF/` trần cũng khớp `UPD-GOVSELF-OUT`, nên bài này
    // từng xanh cả khi S-GOVSELF bị gỡ hẳn — nó trượt xuống chốt kế tiếp và chết ở đó, đúng
    // màu, đúng tên. Đo bằng đột biến: gỡ S-GOVSELF ⇒ 254/254 vẫn xanh.
    expect(() => upd(bad, { status: "Paused" })).toThrow(/UPD-GOVSELF:/);
  });

  it("S-GOVSELF soi entryIn, KHÔNG phải entryOut — hồ sơ kẹt không tự cứu bằng đổi ref", () => {
    // Ca này là thứ tách được S-GOVSELF khỏi U-GOVSELF-OUT: hồ sơ VÀO khai own_hash, còn hồ sơ
    // RA thì không. Chỉ chốt soi `entryIn` mới bắt được, nên gỡ nó ra là bài này đỏ.
    //
    // Ý nghĩa thật của ca: một hồ sơ đã lỡ khai `governance_ref = own_hash` thì KẸT — validator
    // từ chối mọi lần chi tiêu, kể cả chính lần chi tiêu định sửa giá trị đó. Builder phải nói
    // ra điều ấy chứ không dựng plan cho một tx chắc chắn trượt.
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: REGISTRY_HASH };
    expect(() => upd(bad, { governance_ref: GOV_REF }, {
      governanceProof: { spends: [{ scriptHash: REGISTRY_HASH }, { scriptHash: GOV_REF }] },
    })).toThrow(/UPD-GOVSELF:/);
  });

  it("di trú một hồ sơ như vậy cũng bị chặn — S-GOVSELF ép TRƯỚC khi rẽ nhánh", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: REGISTRY_HASH };
    expect(() => mig({ entryIn: bad })).toThrow(/MIG-GOVSELF/);
  });

  it("cập nhật ghi governance_ref = own_hash → UPD-GOVSELF-OUT (nay NÉM, không còn cảnh báo)", () => {
    // ⚠ CA NÀY ĐÃ LẬT. Bản trước off-chain chỉ CẢNH BÁO, với lý do "on-chain chưa chặn ca này
    // (S-GOVSELF chỉ soi entry_in)". Lời khai đó nay SAI: validator có U-GOVSELF-OUT
    // (`expect entry_out.governance_ref != own_hash`, registry.ak:217). Trả plan kèm cảnh báo
    // là trả một tx chắc chắn bị từ chối cho người gọi nào bỏ qua chuỗi cảnh báo.
    expect(() => upd(
      custodialEntry(), { governance_ref: REGISTRY_HASH }, { governanceConsent: true },
    )).toThrow(/UPD-GOVSELF-OUT/);
  });

  it("M-DEST: hash đích không đủ 28 byte → MIG-DEST (mất beacon vĩnh viễn)", () => {
    for (const bad of ["", "00", "88".repeat(27), "88".repeat(29), "zz".repeat(28)]) {
      expect(() => mig({ newRegistryHash: bad })).toThrow(/MIG-DEST/);
    }
  });

  it("di trú tới registry đích == governance_ref → MIG-GOVSELF-DEST (nay NÉM)", () => {
    // ⚠ CA NÀY ĐÃ LẬT, cùng lý do với ca trên: validator có M-GOVSELF-OUT
    // (`entry_out.governance_ref != new_registry_hash`, registry.ak:314).
    expect(() => mig({ newRegistryHash: GOV_REF })).toThrow(/MIG-GOVSELF-DEST/);
  });
});

// ═══ LỆCH 3 — tên gọi thời gian + hợp đồng ttl ══════════════════════════════

describe("LỆCH 3 · ô thời gian là ô 5 NGÀY kể từ mốc Unix, KHÔNG phải epoch Cardano", () => {
  it("hằng số là 432_000_000 cho MỌI mạng (on-chain là const, không phải tham số)", () => {
    expect(MS_PER_TIME_BUCKET).toBe(432_000_000n);
  });

  it("mốc Shelley (epoch 208, 1596059091 s) rơi vào ô 3694 — không phải 208", () => {
    // Con số này chép từ chú thích util.ak:129-132. Nó ở đây để ai đổi hằng số làm test đỏ.
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

// ── Gương R-GOVDIST + R-CAP (thêm 2026-09-01) ──────────────────────────────
//
// Hai ràng buộc on-chain VÔ ĐIỀU KIỆN, nên gương off-chain cũng phải vô điều kiện — nếu
// không, bên tích hợp dựng được tx mà `tsc` + `vitest` đều xanh và chain từ chối 100%.
//
//  · `governance_ref != custody_hash` — GIẢ MẠO ĐỒNG THUẬN. `custody.ak` nhánh `Collect`
//    permissionless (đo: `grep -c "extra_signatories" custody.ak` → 0) ⇒ ai cũng dựng được
//    input ở script đó, và `governance_consented` đọc nó thành "quản trị đã cho phép".
//    Hệ quả: authority MỘT MÌNH gỡ niêm yết vĩnh viễn. Có PoC chạy được.
//  · `governance_ref != seed_policy / beacon_policy` — TỰ KHOÁ, lý do khác hẳn: minting
//    policy không có handler `spend` ⇒ `governance_consented` là hằng False ⇒ hồ sơ kẹt.
//  · `accepted_assets.length <= 32` — quá trần thì MỌI đường cần đồng thuận chết (validator
//    quản trị chạy cùng tx, chia chung 14M ExUnit), kể cả đường CỨU là rút ngắn chính nó.
//
// Nguồn on-chain: `platform.ak:188` (governance_ref_distinct) · `:90` (max_accepted_assets)
//                 `:242-247` (mutable_fields_valid — đáy chung ba cửa)
//                 `:209-213` (entry_well_formed GỌI mutable_fields_valid — dây nối cửa đúc)
describe("gương R-GOVDIST + R-CAP — hai ràng buộc on-chain vô điều kiện", () => {
  it("governance_ref == custody_hash bị chặn ở CẢ entryWellFormed lẫn mutableFieldsValid", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: CUSTODY_HASH };
    expect(mutableFieldsValid(bad)).toBe(false);
    expect(entryWellFormed(bad)).toBe(false);
  });

  it("governance_ref == seed_policy bị chặn — tự khoá, không phải giả mạo", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: SEED_POLICY };
    expect(mutableFieldsValid(bad)).toBe(false);
    expect(entryWellFormed(bad)).toBe(false);
  });

  it("governance_ref == beacon_policy bị chặn", () => {
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: BEACON_POLICY };
    expect(mutableFieldsValid(bad)).toBe(false);
    expect(entryWellFormed(bad)).toBe(false);
  });

  it("phép so KHÔNG phân biệt hoa/thường — hex viết hoa vẫn là cùng một hash", () => {
    // Ca này khoá riêng phép chuẩn hoá. Bỏ `normHex` thì ba bài trên vẫn xanh, còn bài này đỏ:
    // một hồ sơ khai `governance_ref` viết HOA của đúng `custody_hash` lọt qua gương off-chain
    // rồi bị chain từ chối — đúng loại lệch mà tệp này sinh ra để chặn.
    const bad: PlatformEntry = { ...custodialEntry(), governance_ref: CUSTODY_HASH.toUpperCase() };
    expect(mutableFieldsValid(bad)).toBe(false);
  });

  it("đúng 32 asset vẫn QUA — trần là 32, không phải 31", () => {
    const e = custodialEntry();
    const at: PlatformEntry = {
      ...e,
      accepted_assets: Array.from({ length: 32 }, (_, i) => ({ policy: "", name: i.toString(16).padStart(2, "0") })),
    };
    expect(mutableFieldsValid(at)).toBe(true);
    expect(entryWellFormed(at)).toBe(true);
  });

  it("33 asset bị chặn — và chặn ở cả cửa đăng ký, không riêng cửa cập nhật", () => {
    const e = custodialEntry();
    const over: PlatformEntry = {
      ...e,
      accepted_assets: Array.from({ length: 33 }, (_, i) => ({ policy: "", name: i.toString(16).padStart(2, "0") })),
    };
    expect(mutableFieldsValid(over)).toBe(false);
    expect(entryWellFormed(over)).toBe(false);
  });

  it("hồ sơ hợp lệ vẫn qua — hai cổng mới không siết nhầm cái đang đúng", () => {
    const ok = custodialEntry();
    expect(mutableFieldsValid(ok)).toBe(true);
    expect(entryWellFormed(ok)).toBe(true);
  });
});

// ── `substrate_flags`: ba gương từng KHUYẾT, mỗi cái một bài ────────────────────────────
//
// Trường thứ 12 vào lược đồ ngày 2026-09-02. On-chain nhận nó ở BỐN chỗ; off-chain nhận ở
// một (bộ mã hoá datum) và khuyết ba. Cả ba khuyết đều LỎNG HƠN on-chain, và không cái nào
// làm `tsc` kêu hay bài test cũ đỏ — điều kiện chỉ nới ra. Ba bài dưới đây là bài GÁC: gỡ
// vế `substrate_flags` khỏi hàm tương ứng thì đúng một bài đỏ.
describe("substrate_flags — gương off-chain của trường thứ 12", () => {
  it("mutableFieldsValid ép dải [0, 65535] — phủ CẢ BA cửa, không riêng cửa đúc", () => {
    const e = custodialEntry();
    expect(mutableFieldsValid({ ...e, substrate_flags: 0n })).toBe(true);
    expect(mutableFieldsValid({ ...e, substrate_flags: 15n })).toBe(true);
    expect(mutableFieldsValid({ ...e, substrate_flags: 65535n })).toBe(true);   // trần, vẫn qua
    expect(mutableFieldsValid({ ...e, substrate_flags: 65536n })).toBe(false);  // bit 16
    expect(mutableFieldsValid({ ...e, substrate_flags: 999999n })).toBe(false);
    // Vế `>= 0` không thừa: `Int` của Aiken CÓ DẤU, nên -1 là mọi bit bật, và nó qua được
    // vế trên nếu ai đó chỉ chặn một chiều.
    expect(mutableFieldsValid({ ...e, substrate_flags: -1n })).toBe(false);
    // `entryWellFormed` GỌI `mutableFieldsValid` ⇒ cửa đúc thừa hưởng, không cần dòng riêng.
    expect(entryWellFormed({ ...e, substrate_flags: 65536n })).toBe(false);
  });

  it("đổi substrate_flags ĐÒI đồng thuận quản trị — nó là trường thứ tư của nhóm", () => {
    const a = custodialEntry();
    const b: PlatformEntry = { ...a, substrate_flags: a.substrate_flags + 1n };
    expect(changesRequireGovernance(a, b)).toBe(true);
    // Đối chứng: không đổi gì thì không đòi — cổng không được kêu oan.
    expect(changesRequireGovernance(a, { ...a })).toBe(false);
  });

  it("planUpdateEntry: đổi substrate_flags KHÔNG được đi lọt bằng chữ ký authority", () => {
    const a: PlatformEntry = { ...custodialEntry(), status: "Active" };
    const plan = upd(
      a, { substrate_flags: a.substrate_flags + 8n },
      { governanceProof: { spends: [{ scriptHash: GOV_REF }] } },
    );
    // Hở cũ: SDK trả `false` ở đây, nên bên tích hợp không đi xin đồng thuận, rồi tx trượt
    // ở U-GOV mà không có lời giải thích nào từ SDK.
    expect(plan.needsGovernanceConsent).toBe(true);
    expect(plan.governanceConsentRefs).toContain(GOV_REF);
  });

  it("hồi sinh KÈM đổi substrate_flags KHÔNG còn là hồi sinh THUẦN TUÝ", () => {
    const paused: PlatformEntry = { ...custodialEntry(), status: "Paused" };
    // Hồi sinh thuần tuý: chỉ đổi status.
    const sach = upd(paused, { status: "Active" });
    expect(sach.pureRevive).toBe(true);
    // Hồi sinh KÈM đổi lời khai nền — on-chain không coi là thuần tuý, off-chain phải theo.
    const kem = upd(
      paused, { status: "Active", substrate_flags: paused.substrate_flags + 1n },
      { governanceProof: { spends: [{ scriptHash: GOV_REF }] } },
    );
    expect(kem.pureRevive).toBe(false);
  });

  it("pureRevive so CẢ BẢN GHI — mọi trường khác status đều làm nó thành false", () => {
    // Bản trước liệt kê từng trường bằng tay; nay dựng bản ghi ĐÍCH rồi so mọi khoá. Bài này
    // quét TỪNG trường khả biến để một trường thứ 13 thêm sau vẫn nằm trong luật mà không ai
    // phải nhớ — thêm trường thì `changes` không compile được nếu quên, còn phép so thì tự phủ.
    const paused: PlatformEntry = { ...custodialEntry(), status: "Paused" };
    const gov = { governanceProof: { spends: [{ scriptHash: GOV_REF }] } };
    const kemThem: Array<[string, EntryChanges]> = [
      ["cut_bps",         { status: "Active", cut_bps: paused.cut_bps + 1n }],
      ["accepted_assets", { status: "Active", accepted_assets: [{ policy: "", name: "" },
                                                                { policy: "ee".repeat(28), name: "01" }] }],
      ["substrate_flags", { status: "Active", substrate_flags: paused.substrate_flags + 2n }],
      ["governance_ref",  { status: "Active", governance_ref: "dd".repeat(28) }],
    ];
    for (const [ten, changes] of kemThem) {
      const plan = upd(paused, changes, {
        ...gov,
        governanceProof: {
          spends: [{ scriptHash: GOV_REF }, { scriptHash: "dd".repeat(28) }],
        },
      });
      expect(plan.pureRevive, `${ten} kèm hồi sinh vẫn bị coi là thuần tuý`).toBe(false);
    }
  });

  it("pureRevive QUÉT KHOÁ chứ không đọc một danh sách — mô phỏng trường thứ 13", () => {
    // ⚠ ĐỌC KỸ BÀI NÀY LÀM GÌ, vì bốn ca ngay trên KHÔNG phân biệt được hai bản.
    //
    // Bản cũ liệt kê tay đúng sáu trường (status · spec_version · governance_ref ·
    // accepted_assets · cut_bps · substrate_flags). Với lược đồ 12 trường HÔM NAY, bản cũ và
    // bản mới cho kết quả GIỐNG HỆT nhau ở mọi đầu vào hợp lệ — sáu trường còn lại là định
    // danh, mà U-ID ném trước khi tới đây. Nên bốn ca trên xanh ở CẢ HAI bản: chúng không đo
    // được cái đang sửa.
    //
    // Cái đang sửa là CƠ CHẾ: phép so nay quét `Object.keys` của cả hai bản ghi thay vì đọc
    // một danh sách cứng. Ca này đo đúng cơ chế đó bằng cách gắn một trường KHÔNG có trong
    // danh sách cũ vào bản ghi vào — đứng thay cho trường thứ 13 mà ai đó sẽ thêm. Bản quét
    // khoá thấy nó và trả `false` (sai về phía ĐÓNG: đòi chữ ký authority). Bản danh sách
    // cứng không thấy gì và trả `true` — tức mở một đường hồi sinh không cần chữ ký, kèm một
    // thay đổi mà không ai kiểm.
    const paused = { ...custodialEntry(), status: "Paused" as const, truong_thu_13: 7n };
    const plan = upd(paused as PlatformEntry, { status: "Active" });
    expect(plan.pureRevive).toBe(false);

    // Đối chứng — KHÔNG có trường lạ thì vẫn là hồi sinh thuần tuý. Thiếu vế này thì bài trên
    // xanh cả khi ai đó làm `pureRevive` thành hằng `false`.
    const sach = upd({ ...custodialEntry(), status: "Paused" }, { status: "Active" });
    expect(sach.pureRevive).toBe(true);
  });
});

// ── BỘ BA SCRIPT ĐI CÙNG NHAU — hai phép đối chiếu mới ──────────────────────────────────────
//
// Vì sao có khối này: `registryAuthority` / `registryHash` / `beaconPolicy` sinh ra trong CÙNG
// một lượt `applyRegistry` (`scripts/config.ts`), nhưng SDK nhận chúng là những chuỗi rời và
// không đối chiếu gì. Hai chỗ dưới đây là hai chỗ mà một giá trị lạc bộ đi lọt HOÀN TOÀN im
// lặng — không lỗi kiểu, không gương nào đỏ, chỉ có một plan nói sai.
//
// Mỗi phép có MỘT ca âm tính (truyền lệch → phải ném) và MỘT ca dương tính (truyền khớp →
// không ném). Ca dương tính không phải để cho đẹp: nó là thứ chứng minh cổng không kêu oan,
// tức phân biệt được hai cực chứ không phải luôn đỏ.
describe("bộ ba script — REG-AUTH và UPD-BEACON", () => {
  it("REG-AUTH · config.registryAuthority lệch scripts.registryAuthority → ném", () => {
    const khac = "99".repeat(28);
    expect(() => planRegister({
      ...nonCustodialParams(),
      scripts: { ...SCRIPTS, registryAuthority: khac },
    })).toThrow(/REG-AUTH/);
    // Chiều ngược lại: giữ bộ script, đổi hồ sơ. Cùng một lệch, hai đường vào.
    expect(() => planRegister({
      ...nonCustodialParams({ config: nonCustodialConfig({ registryAuthority: khac }) }),
    })).toThrow(/REG-AUTH/);
  });

  it("REG-AUTH · khớp thì KHÔNG ném, và người phải ký đúng là giá trị đó (ca dương tính)", () => {
    const plan = planRegister(nonCustodialParams());
    expect(plan.requiredSigner).toBe(AUTHORITY);
    // Hoa/thường không phải một lệch — phép so chuẩn hoá hex trước.
    expect(planRegister({
      ...nonCustodialParams(),
      scripts: { ...SCRIPTS, registryAuthority: AUTHORITY.toUpperCase() },
    }).requiredSigner).toBe(AUTHORITY);
  });

  it("UPD-BEACON · scripts.beaconPolicy lệch entryIn.beacon_policy → ném", () => {
    // Đây là ca mà bản trước đi lọt: `nftUnit` và `entryValue` dựng TỪ tham số truyền vào, nên
    // truyền nhầm policy thì hàm chạy êm và `summary` in ra một unit token không tồn tại.
    const lech = "99".repeat(28);
    expect(() => planUpdateEntry(
      custodialEntry(), { status: "Paused" },
      { ...SCRIPTS, beaconPolicy: lech },
      { valueIn: entryVal(asciiToHex("TestPlat")), valueOut: entryVal(asciiToHex("TestPlat")) },
    )).toThrow(/UPD-BEACON/);
  });

  it("UPD-BEACON · khớp thì KHÔNG ném, nftUnit trỏ đúng beacon của hồ sơ (ca dương tính)", () => {
    const plan = upd(custodialEntry(), { status: "Paused" });
    expect(plan.nftUnit).toBe(BEACON_POLICY + asciiToHex("TestPlat"));
    expect(plan.entryValue[`${BEACON_POLICY}|${asciiToHex("TestPlat")}`]).toBe(1n);
  });

  it("hai cực phân biệt được: cùng một hồ sơ, chỉ đổi beaconPolicy là đảo kết quả", () => {
    // Bài này là phép đo "đầu vào có phân biệt được hai bên không". Cùng entryIn, cùng changes,
    // cùng opts — khác duy nhất một trường của bộ script, và kết quả phải ngược nhau.
    const e = custodialEntry();
    const opts = { valueIn: entryVal(e.platform_id), valueOut: entryVal(e.platform_id) };
    expect(() => planUpdateEntry(e, { status: "Paused" }, SCRIPTS, opts)).not.toThrow();
    expect(() => planUpdateEntry(
      e, { status: "Paused" }, { ...SCRIPTS, beaconPolicy: SEED_POLICY }, opts,
    )).toThrow(/UPD-BEACON/);
  });
});
