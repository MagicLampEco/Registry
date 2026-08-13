// Registry registrationBuilder — dựng dữ liệu tx ĐĂNG KÝ / CẬP NHẬT / DI TRÚ một hồ sơ
// platform trong sổ. Gương onchain/validators/registry_beacon.ak + registry.ak (lược đồ v2).
//
// planRegister: mint 1 beacon NFT (name=platform_id) + 1 output hồ sơ ở địa chỉ registry mang
//   NFT + datum PlatformEntry well-formed. Tự kiểm trước khi dựng tx (fail-fast):
//   R-WF, R-NAME, R-POLICY (beacon_policy tự khai == policy thật), R-VER (spec_version == 2),
//   R-EPOCH (created_epoch nằm trong cửa sổ hiệu lực — kiểm khi bên gọi cấp cửa sổ),
//   R-BIND (tx reference đúng 1 UTxO kho mang NFT authenticity @ Script(custody_hash)).
//
// planUpdateEntry: cập nhật trường khả biến. TÁCH QUYỀN làm hai (§4.2 của đặc tả v2):
//   việc đảo ngược được thì một bên quyết; việc không đảo ngược được thì hai bên cùng ký.
//     status Active ↔ Paused                       → chữ ký authority là ĐỦ
//     status → Retired                             → authority VÀ đồng thuận quản trị
//     governance_ref / accepted_assets / cut_bps    → authority VÀ đồng thuận quản trị
//   Giữ nguyên U-ID (nay SÁU trường), U-MUT, U-NFT, U-TERMINAL; thêm U-VER, U-VALUE.
//
// planMigrateEntry: đưa hồ sơ sang registry hash mới (M-*). KHÔNG áp U-TERMINAL — hồ sơ
//   `Retired` PHẢI di trú được, đó chính là lỗ đang vá.
//
// Builder THUẦN (không cần lucid) — trả "plan" (datum + value map + redeemer cbor + nft unit).
// Bên gọi dựng tx thật từ plan. Tách thuần để kiểm trực tiếp.

import type {
  AssetKey, PlatformConfig, PlatformEntry, PlatformStatus,
} from "./types.js";
import { SPEC_VERSION_V2 } from "./types.js";
import {
  platformEntryToCbor, registerPlatformRedeemerToCbor, updateEntryRedeemerToCbor,
  migrateEntryRedeemerToCbor,
} from "./registryDatum.js";

// ── Value map ("policy|name" → bigint; lovelace dùng khoá "|") ──────────────
// AssetMap khai một nơi duy nhất ở ./treasuryShapes.ts (cùng hình dạng với AssetMap của
// Treasury) — nhập lại ở đây, KHÔNG khai lần hai.
import type { AssetMap } from "./treasuryShapes.js";
export type { AssetMap };

const LOVELACE_KEY = "|";

function normHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.toLowerCase();
}

/** Khoá AssetMap cho một token (policy|name). policy="" → khoá lovelace "|". */
export function nftKey(policy: string, name: string): string {
  const p = normHex(policy);
  if (p === "") return LOVELACE_KEY;
  return `${p}|${normHex(name)}`;
}

/** Số lượng của (policy, name) trong một AssetMap. */
export function quantityOf(value: AssetMap, policy: string, name: string): bigint {
  return value[nftKey(policy, name)] ?? 0n;
}

// ── CustodyRef + gương R-BIND ───────────────────────────────────────────────
// UTxO kho mà tx đăng ký PHẢI reference. Off-chain chỉ cần đủ để gương R-BIND: value
// (kiểm NFT authenticity) + script hash của địa chỉ (kiểm == entry.custody_hash).

export interface CustodyRef {
  /** value UTxO kho (khoá AssetMap "policy|name", lovelace "|"). */
  value: AssetMap;
  /** payment credential của địa chỉ kho = SCRIPT HASH (hex 28-byte). Gương custody_hash. */
  scriptHash: string;
  /** ngữ cảnh tham chiếu (tuỳ chọn — bên gọi giữ để readFrom khi dựng tx thật). */
  txHash?: string;
  outputIndex?: number;
}

/**
 * Gương R-BIND (registry_beacon.ak): UTxO kho PHẢI mang đúng 1 NFT authenticity
 * (seed_policy, instance_id) Ở ĐÚNG Script(custody_hash). Trả {ok, reason} thay vì ném —
 * dùng được cả ở builder (fail-fast) lẫn lúc rà soát.
 *
 * ⛔ GIỚI HẠN (đọc kỹ): R-BIND chỉ kiểm hồ sơ TỰ NHẤT QUÁN. Cả `seed_policy`, `instance_id`
 * lẫn `custody_hash` đều lấy từ chính lời khai của người đăng ký, nên nó KHÔNG chứng minh
 * kho đó là kho thật. Muốn tin đủ để route phí thì phải đối soát với UTxO kho THẬT —
 * xem `verifyEntryAgainstCustody` trong registryQuery.ts.
 */
export function verifyCustodyBinding(
  custody: CustodyRef, seedPolicy: string, instanceId: string, custodyHash: string,
): { ok: boolean; reason?: string } {
  const qty = quantityOf(custody.value, seedPolicy, instanceId);
  if (qty !== 1n) {
    return {
      ok: false,
      reason: `UTxO kho mang ${qty} NFT (seed_policy=${normHex(seedPolicy)}, `
        + `instance_id=${normHex(instanceId)}) — kỳ vọng đúng 1 (R-BIND)`,
    };
  }
  if (normHex(custody.scriptHash) !== normHex(custodyHash)) {
    return {
      ok: false,
      reason: `script hash địa chỉ kho (${normHex(custody.scriptHash)}) != `
        + `entry.custody_hash (${normHex(custodyHash)}) — kho không khớp (R-BIND)`,
    };
  }
  return { ok: true };
}

// ── entry_well_formed (gương R-WF + R-VER + beacon_policy) ─────────────────

export function entryWellFormed(e: PlatformEntry): boolean {
  return e.spec_version === SPEC_VERSION_V2
    && e.platform_id !== "" && e.instance_id !== "" && e.custody_hash !== ""
    && e.governance_ref !== "" && e.seed_policy !== "" && e.beacon_policy !== ""
    && e.accepted_assets.length > 0
    && e.cut_bps >= 0n && e.cut_bps <= 10000n
    && e.created_epoch >= 0n && e.status === "Active";
}

// ── identity_preserved (gương U-ID / M-ID) — nay SÁU trường ────────────────
// platform_id, instance_id, custody_hash, seed_policy, beacon_policy, created_epoch.
// spec_version KHÔNG nằm ở đây: nó bất biến ở nhánh UpdateEntry (ép riêng, U-VER) và
// TĂNG ở nhánh MigrateEntry (M-VER).

export function identityPreserved(a: PlatformEntry, b: PlatformEntry): boolean {
  return normHex(a.platform_id) === normHex(b.platform_id)
    && normHex(a.instance_id) === normHex(b.instance_id)
    && normHex(a.custody_hash) === normHex(b.custody_hash)
    && normHex(a.seed_policy) === normHex(b.seed_policy)
    && normHex(a.beacon_policy) === normHex(b.beacon_policy)
    && a.created_epoch === b.created_epoch;
}

// ── mutable_fields_valid (gương U-MUT) ──────────────────────────────────────

export function mutableFieldsValid(e: PlatformEntry): boolean {
  return e.governance_ref !== "" && e.accepted_assets.length > 0
    && e.cut_bps >= 0n && e.cut_bps <= 10000n;
}

// ── U-VALUE / M-VALUE: không rút giá trị khỏi ô hồ sơ ───────────────────────
// Hôm nay sổ không giữ giá trị nên chỗ này vô hại; bản sau đặt tiền cọc đăng ký vào ô hồ sơ
// thì thiếu nó là lỗ nghiêm trọng ngay. Ép luôn cho khỏi quên.

export function valuePreserved(valueIn: AssetMap, valueOut: AssetMap): boolean {
  const keys = new Set([...Object.keys(valueIn), ...Object.keys(valueOut)]);
  for (const k of keys) {
    const a = valueIn[k] ?? 0n;
    const b = valueOut[k] ?? 0n;
    if (k === LOVELACE_KEY) {
      if (b < a) return false;          // lovelace ra ≥ lovelace vào
    } else if (a !== b) {
      return false;                     // token khác lovelace: bằng nhau tuyệt đối
    }
  }
  return true;
}

// ── R-EPOCH: created_epoch nằm trong cửa sổ hiệu lực của chính tx đăng ký ───
// Trước đây on-chain chỉ ép `created_epoch >= 0`, nên khai `0` để ra vẻ platform lâu đời
// nhất hệ là được chấp nhận — mà trường này lại bất biến ⇒ lời khai sai thành sự thật vĩnh
// viễn của sổ. Off-chain gương lại: bên gọi cấp cửa sổ epoch của tx, builder ép nằm trong.

export interface EpochWindow {
  /** epoch suy từ cận DƯỚI validity_range của tx. */
  from: bigint;
  /** epoch suy từ cận TRÊN validity_range của tx. */
  to: bigint;
}

/**
 * Gương `util.current_epoch` (bọc `get_epoch_bounded`): validity_range của tx đăng ký phải
 * nằm GỌN trong MỘT epoch — cả hai cận hữu hạn và cùng epoch — rồi `created_epoch` phải bằng
 * đúng epoch đó. Cửa sổ trải qua biên epoch bị TỪ CHỐI: đặt cận dưới ở epoch cũ rồi submit
 * muộn là cách "đóng băng" epoch, mà trường này bất biến nên sai một lần là sai mãi.
 * Nguồn: onchain/lib/magiclamp/registry/util.ak, `get_epoch_bounded` (đọc 2026-08-13).
 */
export function epochInWindow(epoch: bigint, w: EpochWindow): boolean {
  return w.from === w.to && epoch === w.from;
}

// ── planRegister ─────────────────────────────────────────────────────────────

export interface RegisterPlan {
  /** Datum PlatformEntry well-formed cho output hồ sơ. */
  entry: PlatformEntry;
  /** CBOR inline datum. */
  entryDatumCbor: string;
  /** beacon NFT policy (registry_beacon đã apply tham số). */
  beaconPolicy: string;
  /** asset name NFT = platform_id (hex). */
  nftName: string;
  /** unit NFT = policy ‖ name (hex). */
  nftUnit: string;
  /** value tối thiểu output hồ sơ — đúng 1 beacon NFT (bên gọi thêm min-ADA). */
  entryValue: AssetMap;
  /** redeemer mint (RegisterPlatform = Constr(0,[])). */
  mintRedeemerCbor: string;
  /** key-hash PHẢI ký tx (registry_authority — R-SIG). */
  requiredSigner: string;
  /** UTxO kho tx PHẢI readFrom (R-BIND). */
  custodyRef: CustodyRef;
  summary: string;
}

export interface RegisterParams {
  config: PlatformConfig;
  /** beacon NFT policy = hash(registry_beacon(authority, registry_hash)). */
  beaconPolicy: string;
  /** script hash kho của platform — vào entry.custody_hash. */
  custodyHash: string;
  /** seed_policy của kho — vào entry.seed_policy. config.seedPolicy (nếu có) được ưu tiên. */
  seedPolicy: string;
  /** epoch đăng ký (created_epoch) ≥ 0. */
  createdEpoch: bigint;
  /** UTxO kho tx PHẢI reference (R-BIND). THIẾU/SAI → ném REG-BIND fail-fast. */
  custodyUtxo: CustodyRef;
  /** Cửa sổ epoch của tx đăng ký (R-EPOCH). Cấp vào → ép created_epoch nằm trong. */
  epochWindow?: EpochWindow;
}

/**
 * Dựng plan đăng ký platform = mint beacon NFT + output hồ sơ well-formed.
 * Tự kiểm R-WF / R-NAME / R-POLICY / R-VER / R-EPOCH / R-BIND fail-fast.
 */
export function planRegister(params: RegisterParams): RegisterPlan {
  const { config, beaconPolicy, custodyHash, createdEpoch, custodyUtxo } = params;
  const seedPolicy = config.seedPolicy ?? params.seedPolicy;

  const platformId = normHex(config.platformId);
  const nftName = platformId;                       // R-NAME: NFT name == platform_id.
  const beaconPol = normHex(beaconPolicy);
  const nftUnit = beaconPol + nftName;

  // Đăng ký LUÔN khởi tạo status Active (R-WF ép status == Active) và spec_version = 2 (R-VER).
  const entry: PlatformEntry = {
    spec_version:    SPEC_VERSION_V2,
    platform_id:     platformId,
    instance_id:     normHex(config.instanceId),
    custody_hash:    normHex(custodyHash),
    seed_policy:     normHex(seedPolicy),
    beacon_policy:   beaconPol,
    governance_ref:  normHex(config.governanceRef),
    accepted_assets: config.acceptedAssets.map(normAssetKey),
    cut_bps:         config.cutBps,
    created_epoch:   createdEpoch,
    status:          "Active",
  };

  // R-NAME: entry.platform_id == NFT name.
  if (entry.platform_id !== nftName) {
    throw new Error(`REG-NAME: entry.platform_id (${entry.platform_id}) != NFT name (${nftName})`);
  }
  // R-POLICY: lời tự khai beacon_policy phải khớp policy thật đang mint.
  if (entry.beacon_policy !== beaconPol) {
    throw new Error(
      `REG-POLICY: entry.beacon_policy (${entry.beacon_policy}) != policy thật (${beaconPol})`,
    );
  }
  // R-VER: spec_version phải là phiên bản hiện hành.
  if (entry.spec_version !== SPEC_VERSION_V2) {
    throw new Error(
      `REG-VER: spec_version (${entry.spec_version}) != SPEC_VERSION_V2 (${SPEC_VERSION_V2})`,
    );
  }
  // R-EPOCH: created_epoch phải nằm trong cửa sổ hiệu lực của chính tx đăng ký.
  if (params.epochWindow !== undefined && !epochInWindow(entry.created_epoch, params.epochWindow)) {
    throw new Error(
      `REG-EPOCH: created_epoch (${entry.created_epoch}) không khớp cửa sổ hiệu lực `
      + `[${params.epochWindow.from}, ${params.epochWindow.to}] — validity_range phải nằm GỌN `
      + `trong MỘT epoch và created_epoch phải bằng đúng epoch đó. Khai epoch khác là ghi lời `
      + `khai sai thành sự thật vĩnh viễn của sổ (trường này bất biến)`,
    );
  }
  // R-WF: well-formed trước khi dựng tx.
  if (!entryWellFormed(entry)) {
    throw new Error(
      "REG-WF: PlatformEntry không well-formed (kiểm spec_version==2, id/instance/custody/gov/"
      + "seed/beacon khác rỗng, accepted không rỗng, cut_bps∈[0,10000], created_epoch≥0, status=Active)",
    );
  }
  // R-BIND: UTxO kho PHẢI mang đúng 1 NFT authenticity Ở Script(entry.custody_hash).
  if (!custodyUtxo) {
    throw new Error(
      "REG-BIND: thiếu custodyUtxo — RegisterPlatform PHẢI reference UTxO kho mang NFT "
      + "authenticity (seed kho TRƯỚC khi đăng ký)",
    );
  }
  const bind = verifyCustodyBinding(custodyUtxo, entry.seed_policy, entry.instance_id, entry.custody_hash);
  if (!bind.ok) {
    throw new Error(`REG-BIND: ${bind.reason}`);
  }

  const entryValue: AssetMap = { [nftKey(beaconPol, nftName)]: 1n };

  const summary = [
    `═══ Đăng ký platform ═══`,
    `spec_version:  ${entry.spec_version}`,
    `Platform id:   ${entry.platform_id}`,
    `Instance id:   ${entry.instance_id}`,
    `Custody hash:  ${entry.custody_hash}`,
    `Seed policy:   ${entry.seed_policy}`,
    `Beacon policy: ${entry.beacon_policy}`,
    `Gov ref:       ${entry.governance_ref}`,
    `Cut bps:       ${entry.cut_bps}`,
    `Created epoch: ${entry.created_epoch}`,
    `Accepted:      ${entry.accepted_assets.length} asset`,
    `Beacon NFT:    ${nftUnit} (qty 1)`,
    `Custody ref:   ${custodyUtxo.txHash ?? "?"}#${custodyUtxo.outputIndex ?? "?"} `
      + `(readFrom — R-BIND: NFT ${normHex(seedPolicy)}|${entry.instance_id} @ Script(${entry.custody_hash}))`,
    `Authority:     ${normHex(config.registryAuthority)} (phải ký)`,
  ].join("\n");

  return {
    entry,
    entryDatumCbor:   platformEntryToCbor(entry),
    beaconPolicy:     beaconPol,
    nftName,
    nftUnit,
    entryValue,
    mintRedeemerCbor: registerPlatformRedeemerToCbor(),
    requiredSigner:   normHex(config.registryAuthority),
    custodyRef:       custodyUtxo,
    summary,
  };
}

// ── planUpdateEntry ──────────────────────────────────────────────────────────

/** Trường khả biến cho phép cập nhật (U-MUT). Định danh (6 trường) KHÔNG đổi. */
export interface EntryChanges {
  status?:          PlatformStatus;
  governance_ref?:  string;       // hex
  accepted_assets?: AssetKey[];
  cut_bps?:         bigint;
}

export interface UpdateOptions {
  /**
   * Giao dịch MANG đồng thuận quản trị của chính platform đó — on-chain là: tx chi tiêu một
   * input ở Script(governance_ref), HOẶC mang một withdrawal từ Script(governance_ref)
   * (helper `governance_consented` trong util.ak). Off-chain không nhìn thấy tx nên bên gọi
   * tự khai; builder chỉ ép ĐÚNG luật phân quyền dựa trên lời khai đó.
   */
  governanceConsent?: boolean;
  /** value ô hồ sơ ở input — cấp cùng valueOut để ép U-VALUE. */
  valueIn?: AssetMap;
  /** value ô hồ sơ ở output. */
  valueOut?: AssetMap;
}

export interface UpdatePlan {
  entryOut: PlatformEntry;
  entryDatumCbor: string;
  /** beacon NFT unit phải BẢO TOÀN ở input & output (U-NFT). */
  nftUnit: string;
  /** value tối thiểu output hồ sơ — giữ đúng 1 beacon NFT. */
  entryValue: AssetMap;
  redeemerCbor: string;             // UpdateEntry = Constr(0,[]).
  requiredSigner: string;           // registry_authority (U-SIG).
  /** TRUE nếu thay đổi này đòi thêm đồng thuận quản trị của platform. */
  needsGovernanceConsent: boolean;
  summary: string;
}

/**
 * Thay đổi này có đòi đồng thuận quản trị không? (§4.2 — nguyên tắc cắt quyền)
 *   - `Active ↔ Paused` : KHÔNG (gỡ niêm yết đảo ngược được → authority tự quyết).
 *   - `→ Retired`       : CÓ (không đảo ngược được).
 *   - governance_ref / accepted_assets / cut_bps đổi : CÓ.
 */
export function changesRequireGovernance(entryIn: PlatformEntry, entryOut: PlatformEntry): boolean {
  if (entryOut.status === "Retired" && entryIn.status !== "Retired") return true;
  if (normHex(entryIn.governance_ref) !== normHex(entryOut.governance_ref)) return true;
  if (entryIn.cut_bps !== entryOut.cut_bps) return true;
  if (!sameAssetList(entryIn.accepted_assets, entryOut.accepted_assets)) return true;
  return false;
}

function sameAssetList(a: AssetKey[], b: AssetKey[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (normHex(a[i]!.policy) !== normHex(b[i]!.policy)) return false;
    if (normHex(a[i]!.name) !== normHex(b[i]!.name)) return false;
  }
  return true;
}

/**
 * Dựng plan cập nhật hồ sơ. Định danh (6 trường) BẤT BIẾN — chỉ áp thay đổi khả biến.
 * Tự kiểm U-TERMINAL / U-ID / U-MUT / U-VER / U-GOV / U-VALUE fail-fast.
 * @param beaconPolicy policy beacon NFT (dựng nftUnit giữ NFT — U-NFT).
 * @param registryAuthority key-hash phải ký (U-SIG).
 */
export function planUpdateEntry(
  entryIn: PlatformEntry, changes: EntryChanges,
  beaconPolicy: string, registryAuthority: string,
  opts: UpdateOptions = {},
): UpdatePlan {
  // U-TERMINAL: Retired là trạng thái CUỐI ở nhánh UpdateEntry — không cập nhật/hồi sinh.
  // (Đường ra duy nhất của một hồ sơ Retired là MigrateEntry — xem planMigrateEntry.)
  if (entryIn.status === "Retired") {
    throw new Error(
      "UPD-TERMINAL: entryIn.status == Retired — Retired là trạng thái CUỐI ở nhánh UpdateEntry, "
      + "không cập nhật/hồi sinh (di trú vẫn được: dùng planMigrateEntry)",
    );
  }

  const entryOut: PlatformEntry = {
    // U-VER: spec_version bất biến ở nhánh này.
    spec_version:  entryIn.spec_version,
    // định danh bất biến (U-ID — sáu trường)
    platform_id:   normHex(entryIn.platform_id),
    instance_id:   normHex(entryIn.instance_id),
    custody_hash:  normHex(entryIn.custody_hash),
    seed_policy:   normHex(entryIn.seed_policy),
    beacon_policy: normHex(entryIn.beacon_policy),
    created_epoch: entryIn.created_epoch,
    // trường khả biến (U-MUT)
    governance_ref:  changes.governance_ref !== undefined
      ? normHex(changes.governance_ref) : normHex(entryIn.governance_ref),
    accepted_assets: (changes.accepted_assets ?? entryIn.accepted_assets).map(normAssetKey),
    cut_bps:         changes.cut_bps ?? entryIn.cut_bps,
    status:          changes.status ?? entryIn.status,
  };

  // U-ID: định danh bất biến giữa vào & ra.
  if (!identityPreserved(entryIn, entryOut)) {
    throw new Error(
      "UPD-ID: định danh (platform_id/instance_id/custody_hash/seed_policy/beacon_policy/"
      + "created_epoch) bị đổi — cấm khi UpdateEntry",
    );
  }
  // U-VER: spec_version bất biến.
  if (entryOut.spec_version !== entryIn.spec_version) {
    throw new Error("UPD-VER: spec_version đổi ở nhánh UpdateEntry — chỉ MigrateEntry mới được tăng");
  }
  // U-MUT: trường khả biến hợp lệ sau cập nhật.
  if (!mutableFieldsValid(entryOut)) {
    throw new Error(
      "UPD-MUT: trường khả biến không hợp lệ (governance_ref khác rỗng, accepted không rỗng, "
      + "cut_bps∈[0,10000])",
    );
  }
  // U-GOV: tách quyền — việc không đảo ngược được cần cả hai bên.
  const needsGovernanceConsent = changesRequireGovernance(entryIn, entryOut);
  if (needsGovernanceConsent && opts.governanceConsent !== true) {
    throw new Error(
      "UPD-GOV: thay đổi này (→ Retired, hoặc đổi governance_ref/accepted_assets/cut_bps) đòi "
      + "ĐỒNG THUẬN QUẢN TRỊ của chính platform, không chỉ chữ ký authority. Một chữ ký "
      + "authority chỉ đủ cho Active ↔ Paused (gỡ niêm yết — đảo ngược được)",
    );
  }
  // U-VALUE: không rút token/ADA khỏi ô hồ sơ (kiểm khi bên gọi cấp cả hai value).
  if (opts.valueIn !== undefined && opts.valueOut !== undefined
      && !valuePreserved(opts.valueIn, opts.valueOut)) {
    throw new Error(
      "UPD-VALUE: ô hồ sơ bị rút token/ADA (token khác lovelace phải bằng nhau, lovelace ra ≥ vào)",
    );
  }

  const nftUnit = normHex(beaconPolicy) + entryOut.platform_id;   // U-NFT bảo toàn.
  const entryValue: AssetMap = { [nftKey(beaconPolicy, entryOut.platform_id)]: 1n };

  const summary = [
    `═══ Cập nhật hồ sơ ═══`,
    `Platform id: ${entryOut.platform_id} (định danh giữ nguyên, spec_version ${entryOut.spec_version})`,
    `Status:      ${entryIn.status} → ${entryOut.status}`,
    `Cut bps:     ${entryIn.cut_bps} → ${entryOut.cut_bps}`,
    `Gov ref:     ${entryOut.governance_ref}`,
    `Accepted:    ${entryOut.accepted_assets.length} asset`,
    `Beacon NFT:  ${nftUnit} (giữ qty 1)`,
    `Authority:   ${normHex(registryAuthority)} (phải ký)`,
    `Đồng thuận quản trị: ${needsGovernanceConsent ? "BẮT BUỘC (thay đổi không đảo ngược được)" : "không cần (đảo ngược được)"}`,
  ].join("\n");

  return {
    entryOut,
    entryDatumCbor: platformEntryToCbor(entryOut),
    nftUnit,
    entryValue,
    redeemerCbor:   updateEntryRedeemerToCbor(),
    requiredSigner: normHex(registryAuthority),
    needsGovernanceConsent,
    summary,
  };
}

// ── planMigrateEntry (M-*) ───────────────────────────────────────────────────

export interface MigrateParams {
  entryIn: PlatformEntry;
  /** script hash của registry validator ĐANG giữ hồ sơ (own_hash). */
  ownRegistryHash: string;
  /** script hash registry validator ĐÍCH. PHẢI khác ownRegistryHash (M-DEST). */
  newRegistryHash: string;
  /** phiên bản lược đồ mới — PHẢI > spec_version cũ (M-VER). */
  newSpecVersion: bigint;
  /** key-hash authority phải ký (M-SIG). */
  registryAuthority: string;
  /** Đồng thuận quản trị của platform (M-GOV) — di trú là đưa hồ sơ ra khỏi quyền tài phán
   *  của validator này, platform phải đồng ý. */
  governanceConsent: boolean;
  /** value ô hồ sơ vào/ra — cấp cả hai để ép M-VALUE. */
  valueIn?: AssetMap;
  valueOut?: AssetMap;
}

export interface MigratePlan {
  entryOut: PlatformEntry;
  entryDatumCbor: string;
  /** beacon NFT phải có ở CẢ input lẫn output (M-NFT). */
  nftUnit: string;
  entryValue: AssetMap;
  redeemerCbor: string;             // MigrateEntry = Constr(1,[bytes,int]).
  requiredSigner: string;
  /** script hash registry đích — output hồ sơ đặt ở Script(hash) này (M-DEST). */
  newRegistryHash: string;
  summary: string;
}

/**
 * Dựng plan DI TRÚ hồ sơ sang registry hash mới.
 *
 * KHÔNG áp U-TERMINAL: hồ sơ `Retired` PHẢI di trú được — trước đây nó kẹt vĩnh viễn khi
 * xoay quyền đăng ký, phá thẳng cam kết "beacon sống suốt đời, dấu vết kiểm toán không đứt".
 * Đó chính là lỗ mà nhánh này vá.
 *
 * M-STATUS: di trú KHÔNG được đổi trạng thái — nếu không nó thành một đường Retire trá hình.
 */
export function planMigrateEntry(params: MigrateParams): MigratePlan {
  const {
    entryIn, ownRegistryHash, newRegistryHash, newSpecVersion, registryAuthority,
  } = params;

  const ownHash = normHex(ownRegistryHash);
  const newHash = normHex(newRegistryHash);

  // M-DEST: đích phải KHÁC chính mình (di trú tại chỗ là vô nghĩa và mở đường lách U-*).
  if (newHash === ownHash) {
    throw new Error(
      `MIG-DEST: new_registry_hash == own_hash (${ownHash}) — di trú phải sang validator KHÁC`,
    );
  }
  if (newHash === "") throw new Error("MIG-DEST: new_registry_hash rỗng");
  // M-VER: phiên bản lược đồ phải TĂNG.
  if (newSpecVersion <= entryIn.spec_version) {
    throw new Error(
      `MIG-VER: new_spec_version (${newSpecVersion}) phải > spec_version hiện tại `
      + `(${entryIn.spec_version})`,
    );
  }
  // M-GOV: platform phải đồng ý.
  if (params.governanceConsent !== true) {
    throw new Error(
      "MIG-GOV: thiếu đồng thuận quản trị — di trú đưa hồ sơ ra khỏi quyền tài phán của "
      + "validator này, không thể chỉ authority quyết",
    );
  }

  const entryOut: PlatformEntry = {
    ...entryIn,
    spec_version:    newSpecVersion,
    platform_id:     normHex(entryIn.platform_id),
    instance_id:     normHex(entryIn.instance_id),
    custody_hash:    normHex(entryIn.custody_hash),
    seed_policy:     normHex(entryIn.seed_policy),
    beacon_policy:   normHex(entryIn.beacon_policy),
    governance_ref:  normHex(entryIn.governance_ref),
    accepted_assets: entryIn.accepted_assets.map(normAssetKey),
    status:          entryIn.status,     // M-STATUS: giữ nguyên.
  };

  // M-ID: sáu trường định danh bảo toàn.
  if (!identityPreserved(entryIn, entryOut)) {
    throw new Error("MIG-ID: sáu trường định danh bị đổi khi di trú — cấm");
  }
  // M-STATUS (kiểm lại tường minh).
  if (entryOut.status !== entryIn.status) {
    throw new Error("MIG-STATUS: di trú đổi status — đó là đường Retire trá hình, cấm");
  }
  // M-VALUE: như U-VALUE.
  if (params.valueIn !== undefined && params.valueOut !== undefined
      && !valuePreserved(params.valueIn, params.valueOut)) {
    throw new Error("MIG-VALUE: ô hồ sơ bị rút token/ADA khi di trú");
  }

  const nftUnit = normHex(entryIn.beacon_policy) + entryOut.platform_id;   // M-NFT.
  const entryValue: AssetMap = { [nftKey(entryIn.beacon_policy, entryOut.platform_id)]: 1n };

  const summary = [
    `═══ Di trú hồ sơ ═══`,
    `Platform id:   ${entryOut.platform_id}`,
    `spec_version:  ${entryIn.spec_version} → ${entryOut.spec_version}`,
    `Registry hash: ${ownHash} → ${newHash}`,
    `Status:        ${entryOut.status} (GIỮ NGUYÊN — M-STATUS)`,
    `Beacon NFT:    ${nftUnit} (có ở cả input lẫn output — M-NFT)`,
    `Authority:     ${normHex(registryAuthority)} (phải ký)`,
    `Đồng thuận quản trị: BẮT BUỘC (M-GOV)`,
    `Ghi chú: hồ sơ Retired VẪN di trú được — U-TERMINAL không áp ở nhánh này.`,
  ].join("\n");

  return {
    entryOut,
    entryDatumCbor: platformEntryToCbor(entryOut),
    nftUnit,
    entryValue,
    redeemerCbor:   migrateEntryRedeemerToCbor(newHash, newSpecVersion),
    requiredSigner: normHex(registryAuthority),
    newRegistryHash: newHash,
    summary,
  };
}

/** Chuẩn hoá AssetKey về hex trần (khớp encode datum). */
function normAssetKey(a: AssetKey): AssetKey {
  return { policy: normHex(a.policy), name: normHex(a.name) };
}
