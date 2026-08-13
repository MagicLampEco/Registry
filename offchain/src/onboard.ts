// Registry onboard — điều phối cấp cao: đưa một platform vào sổ.
//
// onboardPlatform(params) trả PLAN 2 BƯỚC (đúng thứ tự + phụ thuộc):
//   BƯỚC 1 (SEED): dựng kho (Treasury custody instance) → mint NFT authenticity
//     (seed_policy, instance_id) + output kho mang datum genesis. seed_policy suy từ bước này.
//   BƯỚC 2 (ĐĂNG KÝ): planRegister → mint beacon NFT (name=platform_id) + ô hồ sơ ở địa chỉ
//     registry mang datum PlatformEntry well-formed.
//
// ĐẢO CHIỀU PHỤ THUỘC (hướng B — chốt, đừng bàn lại):
//   Registry KHÔNG nhập SDK Treasury. Hàm dựng kho đi vào bằng THAM SỐ `planSeed` (tiêm phụ
//   thuộc). Bên gọi nào có Treasury SDK thì truyền `planSeed` của Treasury vào; bên gọi nào
//   chỉ cần đăng ký (kho đã dựng sẵn) thì dùng thẳng `planRegister`. Lý do: Registry là sổ chỉ
//   đường, nó không được phụ thuộc lịch phát hành SDK của LAMP. Nhờ vậy repo này typecheck +
//   chạy test xanh mà không cần repo LAMP có mặt trên đĩa.
//
// PHỤ THUỘC THỨ TỰ: bước 2 cần seed_policy (kết quả bước 1) + instance_id phải khớp giữa datum
//   kho và hồ sơ ⇒ BƯỚC 1 PHẢI SUBMIT trước BƯỚC 2 (R-BIND: bước 2 readFrom UTxO kho của bước
//   1). Bên gọi điền `custodyOutRef` (txHash#index) sau khi submit bước 1.

import type { PlatformConfig } from "./types.js";
import type { CustodyDatum, LedgerEntry, PlanSeedFn, SeedPlanLike } from "./treasuryShapes.js";
import {
  planRegister, type CustodyRef, type EpochWindow, type RegisterPlan,
} from "./registrationBuilder.js";

export interface OnboardParams {
  config: PlatformConfig;

  /**
   * Hàm dựng kho, TIÊM từ bên gọi (thường là `planSeed` của Treasury SDK). Đây là phụ thuộc
   * DUY NHẤT lúc chạy thật giữa Registry và Treasury — và nó đi vào bằng tham số.
   */
  planSeed: PlanSeedFn;

  /** beacon NFT policy = hash(registry_beacon(authority, registry_hash)). */
  beaconPolicy: string;
  /** script hash kho của platform. Vào entry.custody_hash + địa chỉ output bước seed. */
  custodyHash: string;
  /** seed_policy = policy id của custody_seed đã apply genesis_ref. */
  seedPolicy: string;
  /** epoch đăng ký (created_epoch) ≥ 0. */
  createdEpoch: bigint;
  /** Cửa sổ epoch của tx đăng ký (R-EPOCH) — cấp vào thì created_epoch bị ép nằm trong. */
  epochWindow?: EpochWindow;

  /** Sổ kế toán genesis (thường rỗng — kho bắt đầu trống, chỉ có ADA giữ min-UTxO). */
  genesisLedger?: LedgerEntry[];

  /** Tham chiếu UTxO kho của bước SEED (chỉ biết SAU khi submit bước 1). */
  custodyOutRef?: { txHash: string; outputIndex: number };
}

export interface OnboardPlan {
  /** BƯỚC 1 — dựng kho. PHẢI confirm trước bước 2. */
  seed: SeedPlanLike;
  /** BƯỚC 2 — đăng ký hồ sơ vào sổ. Phụ thuộc seed.seedPolicy. */
  register: RegisterPlan;
  /** Tóm tắt 2 bước + phụ thuộc, cho người đọc. */
  summary: string;
}

/**
 * Dựng plan onboard đầy đủ một platform. KHÔNG submit — trả plan + tự kiểm gương validator
 * (hàm seed được tiêm tự kiểm phần kho; planRegister kiểm phần hồ sơ). Ném lỗi fail-fast nếu
 * bất kỳ gương nào hỏng.
 */
export function onboardPlatform(params: OnboardParams): OnboardPlan {
  const { config, beaconPolicy, custodyHash, seedPolicy, createdEpoch } = params;

  if (typeof params.planSeed !== "function") {
    throw new Error(
      "ONBOARD-DEP: thiếu tham số `planSeed`. Registry KHÔNG nhập SDK Treasury — bên gọi phải "
      + "tiêm hàm dựng kho vào. Chỉ cần đăng ký (kho đã có) thì dùng thẳng planRegister.",
    );
  }

  // ── BƯỚC 1: dựng kho ──────────────────────────────────────────────────────
  const custodyDatumIn: CustodyDatum = {
    instance_id:     config.instanceId,
    accepted_assets: config.acceptedAssets,
    ledger:          params.genesisLedger ?? [],
    cut_bps:         config.cutBps,
    governance_ref:  config.governanceRef,
    epoch:           createdEpoch,
    consumed_proposals: [],
  };
  const seed = params.planSeed(custodyDatumIn, seedPolicy, config.reservedMinAda);

  // Canh hàm được tiêm: nó phải trả về ĐÚNG seed_policy đã yêu cầu. Hàm tiêm là mã của bên
  // ngoài — nó tráo policy thì hồ sơ trỏ vào một kho khác hẳn mà không ai thấy.
  if (seed.seedPolicy.toLowerCase() !== seedPolicy.toLowerCase()) {
    throw new Error(
      `ONBOARD-SEED: hàm planSeed trả seed_policy (${seed.seedPolicy}) khác seed_policy yêu cầu `
      + `(${seedPolicy})`,
    );
  }

  // R-BIND: UTxO kho mà bước ĐĂNG KÝ readFrom chính là output kho của bước SEED. value =
  // seed.custodyValue (mang NFT authenticity qty 1); địa chỉ = Script(custodyHash).
  const custodyUtxo: CustodyRef = {
    value:      seed.custodyValue,
    scriptHash: custodyHash,
    ...(params.custodyOutRef !== undefined
      ? { txHash: params.custodyOutRef.txHash, outputIndex: params.custodyOutRef.outputIndex }
      : {}),
  };

  // ── BƯỚC 2: đăng ký hồ sơ ─────────────────────────────────────────────────
  const register = planRegister({
    config,
    beaconPolicy,
    custodyHash,
    seedPolicy: seed.seedPolicy,   // <-- phụ thuộc từ bước 1
    createdEpoch,
    custodyUtxo,                   // <-- R-BIND: kho từ bước SEED
    ...(params.epochWindow !== undefined ? { epochWindow: params.epochWindow } : {}),
  });

  // Kiểm chéo: entry.instance_id phải khớp instance_id của kho (cùng một instance).
  if (register.entry.instance_id !== seed.datum.instance_id.toLowerCase()) {
    throw new Error(
      `ONBOARD-INST: entry.instance_id (${register.entry.instance_id}) != instance_id của kho `
      + `(${seed.datum.instance_id}) — hồ sơ phải trỏ đúng instance đã dựng`,
    );
  }
  // Kiểm chéo: entry.seed_policy phải khớp seed_policy của kho (NFT authenticity).
  if (register.entry.seed_policy !== seed.seedPolicy.toLowerCase()) {
    throw new Error(
      `ONBOARD-SEED: entry.seed_policy (${register.entry.seed_policy}) != seed_policy của kho `
      + `(${seed.seedPolicy})`,
    );
  }

  const seedSummary = [
    `Instance:    ${seed.datum.instance_id}`,
    `Seed policy: ${seed.seedPolicy}`,
    `NFT:         ${seed.seedPolicy}${seed.nftName} (qty 1)`,
    `Cut bps:     ${seed.datum.cut_bps}`,
    `Reserved:    ${config.reservedMinAda} lovelace`,
    `Sổ:          ${seed.datum.ledger.length} dòng`,
  ].join("\n");

  const summary = [
    `╔══════════════════════════════════════════════════════╗`,
    `║  ONBOARD PLATFORM: ${config.platformId}`,
    `╚══════════════════════════════════════════════════════╝`,
    ``,
    `BƯỚC 1 — dựng kho (hàm planSeed do bên gọi tiêm):`,
    seedSummary.split("\n").map((l) => "  " + l).join("\n"),
    ``,
    `        ↓ (chờ confirm — hồ sơ bước 2 trỏ vào instance này)`,
    ``,
    `BƯỚC 2 — đăng ký hồ sơ (registry_beacon):`,
    register.summary.split("\n").map((l) => "  " + l).join("\n"),
    ``,
    `THỨ TỰ: BƯỚC 1 PHẢI SUBMIT trước BƯỚC 2.`,
    `Lý do:  entry.seed_policy + entry.instance_id trỏ vào kho đã dựng.`,
    `        Đăng ký trước khi dựng kho = hồ sơ trỏ vào instance KHÔNG tồn tại.`,
    `R-BIND: BƯỚC 2 readFrom UTxO kho của BƯỚC 1 (NFT authenticity @ Script(custody_hash)).`,
    `        → điền custodyOutRef (txHash#idx) sau khi submit BƯỚC 1.`,
  ].join("\n");

  return { seed, register, summary };
}
