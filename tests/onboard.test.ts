// Registry · onboard 2 bước + TIÊM PHỤ THUỘC (hướng B).
//
// Điểm cốt lõi của bộ test này: nó chạy xanh mà KHÔNG cần repo LAMP có mặt trên đĩa. Hàm dựng
// kho đi vào bằng tham số (`planSeed`), không bằng đường dẫn nhập.

import { describe, it, expect } from "vitest";
import { onboardPlatform } from "../offchain/src/onboard.js";
import { entryWellFormed } from "../offchain/src/registrationBuilder.js";
import { fakePlanSeed } from "./helpers/fakePlanSeed.js";
import { phoenixKeyConfig } from "../examples/phoenixkey.js";
import { oriLifeConfig } from "../examples/orilife.js";
import { exampleConfig, makeExamplePriceFn } from "../examples/_template.js";
import { eventToCollectItem } from "../offchain/src/collectAdapter.js";
import { asciiToHex } from "../offchain/src/encoding.js";
import { MS_PER_TIME_BUCKET } from "../offchain/src/types.js";

const seedPolicy = "56".repeat(28);

const cfg = phoenixKeyConfig({
  lampPolicy: "ab".repeat(28),
  magicPolicy: "cd".repeat(28),
  registryAuthority: "ef".repeat(28),
  msPerEpoch: MS_PER_TIME_BUCKET,
  reservedMinAda: 2_000_000n,
  genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
});

const onboardArgs = (config: typeof cfg) => ({
  config,
  planSeed: fakePlanSeed,
  beaconPolicy: "12".repeat(28),
  custodyHash:  "34".repeat(28),
  seedPolicy,
  createdEpoch: 7n,
  // R-GOVLIVE: bước 2 (đăng ký) chỉ hợp lệ khi cổng quản trị của platform chạy thật trong
  // chính tx đó. `config.governanceRef` là placeholder của examples/ nên proof bám theo nó.
  governanceProof: { spends: [{ scriptHash: config.governanceRef }] },
});

describe("onboardPlatform — 2 bước", () => {
  it("trả seed + register; hồ sơ well-formed v2; kho mang NFT authenticity", () => {
    const plan = onboardPlatform(onboardArgs(cfg));

    expect(plan.seed.datum.consumed_proposals).toEqual([]);
    expect(plan.seed.custodyValue[`${seedPolicy}|${cfg.instanceId}`]).toBe(1n);

    expect(entryWellFormed(plan.register.entry)).toBe(true);
    expect(plan.register.entry.spec_version).toBe(2n);
    expect(plan.register.entry.beacon_policy).toBe("12".repeat(28));
    expect(plan.register.entry.platform_id).toBe(asciiToHex("PhoenixKey"));
  });

  it("phụ thuộc: entry.seed_policy == seed_policy của kho; instance_id khớp", () => {
    const plan = onboardPlatform(onboardArgs(cfg));
    expect(plan.register.entry.seed_policy).toBe(seedPolicy);
    expect(plan.register.entry.instance_id).toBe(plan.seed.datum.instance_id.toLowerCase());
  });

  it("R-BIND: custodyRef suy từ bước seed (NFT authenticity @ Script(custodyHash))", () => {
    const plan = onboardPlatform({
      ...onboardArgs(cfg),
      custodyOutRef: { txHash: "ab".repeat(32), outputIndex: 2 },
    });
    const ref = plan.register.custodyRef!;
    expect(ref.value[`${seedPolicy}|${cfg.instanceId.toLowerCase()}`]).toBe(1n);
    expect(ref.scriptHash).toBe("34".repeat(28));
    expect(ref.txHash).toBe("ab".repeat(32));
    expect(ref.outputIndex).toBe(2);
  });

  it("tóm tắt nêu rõ thứ tự BƯỚC 1 trước BƯỚC 2 + R-BIND", () => {
    const plan = onboardPlatform(onboardArgs(cfg));
    expect(plan.summary).toMatch(/BƯỚC 1 PHẢI SUBMIT trước BƯỚC 2/);
    expect(plan.summary).toMatch(/R-BIND/);
  });

  it("R-EPOCH chảy qua onboard: cửa sổ lệch epoch → ném REG-EPOCH", () => {
    expect(() => onboardPlatform({ ...onboardArgs(cfg), timeBucketWindow: { from: 8n, to: 8n } }))
      .toThrow(/REG-EPOCH/);
    const ok = onboardPlatform({ ...onboardArgs(cfg), timeBucketWindow: { from: 7n, to: 7n } });
    expect(ok.register.entry.created_epoch).toBe(7n);
  });

  it("thiếu planSeed → ném ONBOARD-DEP (nêu rõ phải tiêm, không nhập)", () => {
    const { planSeed, ...rest } = onboardArgs(cfg);
    void planSeed;
    // @ts-expect-error — cố tình bỏ planSeed để kiểm thông điệp fail-fast.
    expect(() => onboardPlatform(rest)).toThrow(/ONBOARD-DEP/);
  });

  it("canh hàm tiêm: seed trả instance_id khác config → hỏng ngay (R-BIND bắt trước)", () => {
    // NFT authenticity của kho khi đó mang tên instance khác ⇒ gương R-BIND fail trước khi tới
    // bước kiểm chéo ONBOARD-INST. Cái nào bắt trước không quan trọng; quan trọng là KHÔNG lọt.
    expect(() => onboardPlatform({
      ...onboardArgs(cfg),
      planSeed: (d, sp, r) => fakePlanSeed({ ...d, instance_id: asciiToHex("instance-khac") }, sp, r),
    })).toThrow(/(ONBOARD-INST|REG-BIND)/);
  });

  it("canh hàm tiêm: seed tráo seed_policy khác yêu cầu → ném ONBOARD-SEED", () => {
    expect(() => onboardPlatform({
      ...onboardArgs(cfg),
      planSeed: (d, _sp, r) => fakePlanSeed(d, "99".repeat(28), r),
    })).toThrow(/ONBOARD-SEED/);
  });

  it("OriLife onboard cũng dựng plan hợp lệ", () => {
    const ori = oriLifeConfig({
      lampPolicy: "ab".repeat(28),
      registryAuthority: "ef".repeat(28),
      msPerEpoch: MS_PER_TIME_BUCKET,
      reservedMinAda: 2_000_000n,
      genesisRef: { transaction_id: "ee".repeat(32), output_index: 1n },
    });
    const plan = onboardPlatform({
      config: ori, planSeed: fakePlanSeed, beaconPolicy: "12".repeat(28),
      custodyHash: "34".repeat(28), seedPolicy, createdEpoch: 3n,
      governanceProof: { spends: [{ scriptHash: ori.governanceRef }] },
    });
    expect(entryWellFormed(plan.register.entry)).toBe(true);
    expect(plan.register.entry.cut_bps).toBe(700n);
  });

  // Khung mẫu (examples/_template.ts) — team copy & điền. Test này chứng minh khung typecheck
  // + dựng plan hợp lệ qua đúng SDK thật, để team có mốc chạy được.
  it("_template: exampleConfig dựng plan hợp lệ + PriceFn sinh CollectItem", () => {
    const tpl = exampleConfig({
      registryAuthority: "ef".repeat(28),
      msPerEpoch: MS_PER_TIME_BUCKET,
      reservedMinAda: 2_000_000n,
      genesisRef: { transaction_id: "dd".repeat(32), output_index: 0n },
    });
    const plan = onboardPlatform({
      config: tpl, planSeed: fakePlanSeed, beaconPolicy: "12".repeat(28),
      custodyHash: "34".repeat(28), seedPolicy, createdEpoch: 1n,
      governanceProof: { spends: [{ scriptHash: tpl.governanceRef }] },
    });
    expect(entryWellFormed(plan.register.entry)).toBe(true);
    expect(plan.register.entry.platform_id).toBe(asciiToHex("ExamplePlatform"));

    const priceFn = makeExamplePriceFn({});
    const item = eventToCollectItem({ eventType: "example.action", payer: "11".repeat(28) }, priceFn);
    expect(item!.amount).toBe(1_000_000n);
    expect(item!.category).toBe(0n);
    expect(eventToCollectItem({ eventType: "nope", payer: "11".repeat(28) }, priceFn)).toBeNull();
  });
});
