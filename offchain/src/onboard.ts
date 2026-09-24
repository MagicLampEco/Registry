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

import type { PlatformConfig, RegistryScripts } from "./types.js";
import type { CustodyDatum, LedgerEntry, PlanSeedFn, SeedPlanLike } from "./treasuryShapes.js";
import {
  planRegister, type CustodyRef, type TimeBucketWindow, type RegisterPlan,
  type GovernanceProof,
} from "./registrationBuilder.js";

export interface OnboardParams {
  config: PlatformConfig;

  /**
   * Hàm dựng kho, TIÊM từ bên gọi (thường là `planSeed` của Treasury SDK). Đây là phụ thuộc
   * DUY NHẤT lúc chạy thật giữa Registry và Treasury — và nó đi vào bằng tham số.
   */
  planSeed: PlanSeedFn;

  /**
   * BỘ BA script của lần triển khai registry đang đăng ký vào (xem `RegistryScripts`).
   * Thay cho hai tham số rời `beaconPolicy` + `registryHash?` của bản trước — `registryHash`
   * từng tuỳ chọn, nên đường onboard BỎ QUA R-GOVSELF trong khi đường `planRegister` thẳng
   * thì kiểm: hai lối vào cùng một builder mà ép khác nhau.
   */
  scripts: RegistryScripts;
  /** script hash kho của platform. Vào entry.custody_hash + địa chỉ output bước seed. */
  custodyHash: string;
  /** seed_policy = policy id của custody_seed đã apply genesis_ref. */
  seedPolicy: string;
  /** ô thời gian đăng ký (vào trường `created_epoch`) ≥ 0. */
  createdEpoch: bigint;
  /**
   * Cửa sổ ô thời gian của tx đăng ký (R-EPOCH) — BẮT BUỘC, chuyển thẳng xuống `planRegister`.
   *
   * ⚠ Ràng buộc on-chain vô điều kiện. Trường này từng để trống được, và khi trống thì việc
   * chuyển tiếp cũng bị bỏ qua ⇒ đường onboard dựng ra hồ sơ có `created_epoch` chưa ai đối
   * chiếu với `validity_range` của chính tx, mà trường đó BẤT BIẾN.
   */
  timeBucketWindow: TimeBucketWindow;

  /**
   * R-GOVLIVE — bằng chứng cổng quản trị của platform CHẠY THẬT trong tx BƯỚC 2 (đăng ký).
   * BẮT BUỘC: ràng buộc on-chain vô điều kiện, thiếu là tx đăng ký bị từ chối 100%.
   */
  governanceProof: GovernanceProof;

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
  const { config, scripts, custodyHash, seedPolicy, createdEpoch } = params;

  if (typeof params.planSeed !== "function") {
    throw new Error(
      "ONBOARD-DEP: thiếu tham số `planSeed`. Registry KHÔNG nhập SDK Treasury — bên gọi phải "
      + "tiêm hàm dựng kho vào. Chỉ cần đăng ký (kho đã có) thì dùng thẳng planRegister.",
    );
  }

  // ONBOARD-AUTH: `registry_authority` khai ở HAI nguồn — hồ sơ platform (`config`) và bộ
  // script đã triển khai (`scripts`). Phải là cùng một sự thật; `planRegister` cũng ném ở
  // REG-AUTH, nhưng ở đây phải ném SỚM HƠN: bước SEED chạy TRƯỚC bước đăng ký, nên nếu để tới
  // đó mới hỏng thì hàm `planSeed` do bên ngoài tiêm đã chạy xong với một bộ tham số sai.
  if (config.registryAuthority.toLowerCase() !== scripts.registryAuthority.toLowerCase()) {
    throw new Error(
      `ONBOARD-AUTH: config.registryAuthority (${config.registryAuthority.toLowerCase()}) != `
      + `scripts.registryAuthority (${scripts.registryAuthority.toLowerCase()}). Hai chỗ này `
      + `khai CÙNG MỘT sự thật — key-hash mà validator đòi chữ ký; bộ script (registryHash, `
      + `beaconPolicy) được apply từ giá trị thứ hai còn plan khai người phải ký theo giá trị `
      + `thứ nhất. Ném TRƯỚC bước seed để hàm planSeed được tiêm không chạy oan`,
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
  // Chuyển tiếp VÔ ĐIỀU KIỆN. Bản trước bọc `timeBucketWindow` và `registryHash` trong hai
  // nhánh `!== undefined`, nên hai gương R-EPOCH + R-GOVSELF chỉ chạy khi bên gọi nhớ truyền —
  // một cổng vào cùng builder mà ép lỏng hơn cổng kia. Nay cả hai là trường bắt buộc của
  // `OnboardParams`, không còn nhánh nào để rẽ.
  const register = planRegister({
    config,
    scripts,
    custodyHash,
    seedPolicy: seed.seedPolicy,   // <-- phụ thuộc từ bước 1
    createdEpoch,
    custodyUtxo,                   // <-- R-BIND: kho từ bước SEED
    governanceProof: params.governanceProof,   // <-- R-GOVLIVE
    timeBucketWindow: params.timeBucketWindow, // <-- R-EPOCH
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
