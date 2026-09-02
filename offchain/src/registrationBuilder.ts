// Registry registrationBuilder — dựng dữ liệu tx ĐĂNG KÝ / CẬP NHẬT / DI TRÚ một hồ sơ
// platform trong sổ. Gương onchain/validators/registry_beacon.ak + registry.ak (lược đồ v2).
//
// planRegister: mint 1 beacon NFT (name=platform_id) + 1 output hồ sơ ở địa chỉ registry mang
//   NFT + datum PlatformEntry well-formed. Tự kiểm trước khi dựng tx (fail-fast):
//   R-WF, R-NAME, R-POLICY (beacon_policy tự khai == policy thật), R-VER (spec_version == 2),
//   R-EPOCH (created_epoch nằm trong cửa sổ hiệu lực — kiểm khi bên gọi cấp cửa sổ),
//   R-GOVSELF, R-GOVLIVE (cổng quản trị CHẠY THẬT trong chính tx đăng ký — VÔ ĐIỀU KIỆN),
//   R-BIND (tx reference đúng 1 UTxO kho mang NFT authenticity @ Script(custody_hash)).
//
// planUpdateEntry: cập nhật trường khả biến. TÁCH QUYỀN làm hai (§4.2 của đặc tả v2):
//   việc đảo ngược được thì một bên quyết; việc không đảo ngược được thì hai bên cùng ký.
//     status Active ↔ Paused                       → chữ ký authority là ĐỦ
//     status → Retired                             → authority VÀ đồng thuận quản trị
//     governance_ref / accepted_assets / cut_bps    → authority VÀ đồng thuận quản trị
//     ĐỔI governance_ref                            → THÊM: cổng MỚI cũng phải chạy (U-GOV2)
//   Giữ nguyên U-ID (nay SÁU trường), U-MUT, U-NFT, U-TERMINAL; thêm U-VER, U-VALUE,
//   U-GOVSELF-OUT (không ghi ra governance_ref == own_hash).
//
// planMigrateEntry: đưa hồ sơ sang registry hash mới (M-*). KHÔNG áp U-TERMINAL — hồ sơ
//   `Retired` PHẢI di trú được, đó chính là lỗ đang vá. Di trú ĐỔI ĐƯỢC governance_ref
//   (M-ID không khoá trường này) — đổi thì M-GOV2 đòi cả ref cũ lẫn ref mới chạy; và
//   M-GOVSELF-OUT cấm ghi ra ref == hash registry đích hoặc registry cũ.
//
// Builder THUẦN (không cần lucid) — trả "plan" (datum + value map + redeemer cbor + nft unit).
// Bên gọi dựng tx thật từ plan. Tách thuần để kiểm trực tiếp.

import type {
  AssetKey, PlatformConfig, PlatformEntry, PlatformStatus,
} from "./types.js";
import { SPEC_VERSION_V2, SCRIPT_HASH_HEX_LEN, MS_PER_TIME_BUCKET } from "./types.js";
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

// ── HÌNH DẠNG LÀ HẠNG (gương shape_custodial / shape_non_custodial) ────────
// Nguồn: onchain/lib/magiclamp/registry/platform.ak:141-157 (đọc 2026-08-14).
//
// Có ĐÚNG HAI hình dạng hợp lệ, và "hình dạng chính là hạng":
//   CÓ KHO   — dịch vụ thu tiền qua một Treasury custody instance.
//   KHÔNG KHO— dịch vụ không thu asset ở tầng này: instance_id/custody_hash/seed_policy rỗng
//              HẾT, accepted_assets rỗng, cut_bps = 0. (`governance_ref` VẪN bắt buộc.)
// Nửa vời (một số trường rỗng, một số không) phải bị TỪ CHỐI ở CẢ HAI phía — đó chính là
// chỗ hỏng mà phép chọn theo hình dạng dựng ra để loại bỏ.

/** Gương `bytearray.length(x) == script_hash_len`: hex 56 ký tự = 28 byte. */
export function isScriptHash28(hex: string): boolean {
  return /^[0-9a-f]{56}$/.test(normHex(hex));
}

/**
 * Hồ sơ CÓ KHO. `instance_id` là ASSET NAME (độ dài tuỳ ý, chỉ ép khác rỗng);
 * `custody_hash` và `seed_policy` là script hash / policy id ⇒ ĐÚNG 28 byte.
 */
export function shapeCustodial(e: PlatformEntry): boolean {
  return normHex(e.instance_id) !== ""
    && isScriptHash28(e.custody_hash)
    && isScriptHash28(e.seed_policy)
    && e.accepted_assets.length > 0
    && e.cut_bps >= 0n && e.cut_bps <= 10000n;
}

/** Hồ sơ KHÔNG KHO — rỗng hết, không nửa vời. */
export function shapeNonCustodial(e: PlatformEntry): boolean {
  return normHex(e.instance_id) === ""
    && normHex(e.custody_hash) === ""
    && normHex(e.seed_policy) === ""
    && e.accepted_assets.length === 0
    && e.cut_bps === 0n;
}

/** Thuộc ĐÚNG MỘT trong hai hạng (gương `or { shape_custodial, shape_non_custodial }`). */
export function entryShapeValid(e: PlatformEntry): boolean {
  return shapeCustodial(e) || shapeNonCustodial(e);
}

// ── entry_well_formed (gương R-WF + R-VER + beacon_policy) ─────────────────
// Gương `platform.entry_well_formed` (platform.ak:209-213).

export function entryWellFormed(e: PlatformEntry): boolean {
  return e.spec_version === SPEC_VERSION_V2
    && normHex(e.platform_id) !== ""
    && isScriptHash28(e.beacon_policy)
    && e.created_epoch >= 0n
    && e.status === "Active"
    // Gọi `mutableFieldsValid` thay vì chép lại — giữ ĐÚNG quan hệ bao hàm mà on-chain vừa
    // dựng (`platform.ak:209-213`). Hai hàm gác cùng một datum ở hai thời điểm; ràng thành
    // bao hàm thì "vá nửa đường" không biểu diễn được: mọi điều kiện thêm vào hàm kia tự
    // áp cho cửa đăng ký. Giá phải trả, giống hệt bên on-chain: NỚI hàm kia là nới luôn
    // cửa này — chủ ý, vì nới một cửa mà quên cửa còn lại tệ hơn.
    && mutableFieldsValid(e);
}

// ── R-GOVSELF / S-GOVSELF ───────────────────────────────────────────────────
// `governance_ref` KHÔNG được là hash của chính validator registry: ô hồ sơ đang chi tiêu
// luôn nằm ở Script(own_hash), nên `governance_consented` (quét tx.inputs tìm input ở
// Script(governance_ref)) sẽ thành hằng True vĩnh viễn ⇒ authority một mình Retire / đổi
// cut_bps / di trú được. Nguồn: registry_beacon.ak:133 (R-GOVSELF), registry.ak:174 (S-GOVSELF).

export function governanceRefNotSelf(e: PlatformEntry, registryHash: string): boolean {
  return normHex(e.governance_ref) !== normHex(registryHash);
}

// ── ĐỒNG THUẬN QUẢN TRỊ — gương `util.governance_consented` ─────────────────
// Nguồn: onchain/lib/magiclamp/registry/util.ak:204-216 (đọc 2026-08-14).
//
// On-chain "cổng quản trị đã đồng thuận" có ĐÚNG HAI nghĩa, không có nghĩa thứ ba: trong
// CHÍNH tx đó,
//   (a) có một INPUT được chi tiêu ở `Script(governance_ref)`, HOẶC
//   (b) có một WITHDRAWAL từ `Script(governance_ref)` — SỐ TIỀN RÚT KHÔNG QUAN TRỌNG, rút 0
//       lovelace vẫn tính (withdraw-0 là đường chuẩn cho cổng quản trị staking-script).
//
// ⚠ VÌ SAO KHÔNG DÙNG BOOLEAN: từ bản vá U-GOV2 / M-GOV2, một tx BÀN GIAO phải chứng minh
// HAI script hash KHÁC NHAU cùng chạy (ref cũ VÀ ref mới). Một cờ `true` không nói được
// "ref nào đã chạy" ⇒ builder không thể phân biệt tx hợp lệ với tx chắc chắn bị từ chối.
// Bằng chứng vì thế phải khai THEO SCRIPT HASH.
//
// ⚠ GIỚI HẠN KẾ THỪA (chép nguyên từ registry_beacon.ak, đừng đọc mạnh hơn): điều này chứng
// minh "script ĐÃ CHẠY", KHÔNG chứng minh "script phê duyệt ĐÚNG việc này". Cổng quản trị có
// nhánh permissionless thì ai cũng dựng được vế đồng thuận. Ràng buộc đó thuộc chuẩn đăng ký.

/** Một INPUT của tx được chi tiêu ở `Script(scriptHash)`. */
export interface GovernanceSpend {
  /** payment credential của địa chỉ input = SCRIPT HASH (hex 28 byte). */
  scriptHash: string;
  /** ngữ cảnh để bên gọi `collectFrom` khi dựng tx thật. */
  txHash?: string;
  outputIndex?: number;
}

/** Một WITHDRAWAL của tx từ `Script(scriptHash)`. */
export interface GovernanceWithdrawal {
  /** stake credential rút = SCRIPT HASH (hex 28 byte). */
  scriptHash: string;
  /** lovelace rút. 0 HỢP LỆ — on-chain không đọc số tiền. Chỉ để bên gọi dựng tx. */
  amountLovelace?: bigint;
}

/** Bằng chứng "cổng quản trị nào ĐÃ CHẠY trong tx này". Gương phần tx mà validator đọc. */
export interface GovernanceProof {
  spends?: GovernanceSpend[];
  withdrawals?: GovernanceWithdrawal[];
}

export type GovernanceConsentKind = "spend" | "withdrawal";

/**
 * Cổng `ref` có chạy trong tx không, và chạy bằng ĐƯỜNG NÀO. `null` = không chạy.
 *
 * Ép `ref` ĐÚNG 28 byte trước khi so: không script nào có hash khác 28 byte, nên một `ref`
 * rác KHÔNG THỂ có input/withdrawal — trả `null`. Thiếu chốt này thì `ref = ""` khớp với một
 * mục khai `scriptHash: ""` và "đồng thuận" thành hằng True, đúng kiểu lỗ mà S-GOVSELF vá.
 */
export function governanceConsentKind(
  proof: GovernanceProof | undefined, ref: string,
): GovernanceConsentKind | null {
  if (proof === undefined) return null;
  const r = normHex(ref);
  if (!isScriptHash28(r)) return null;
  if ((proof.spends ?? []).some((s) => normHex(s.scriptHash) === r)) return "spend";
  if ((proof.withdrawals ?? []).some((w) => normHex(w.scriptHash) === r)) return "withdrawal";
  return null;
}

/** Gương `util.governance_consented(tx, ref)`. */
export function governanceConsented(proof: GovernanceProof | undefined, ref: string): boolean {
  return governanceConsentKind(proof, ref) !== null;
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

// ── mutable_fields_valid (gương U-MUT / M-MUT) ─────────────────────────────
// Gương `platform.mutable_fields_valid` (platform.ak:242-249).
//
// Ép ĐÚNG 28 byte cho `governance_ref` (không chỉ "khác rỗng"): giá trị rác trỏ tới một
// script KHÔNG TỒN TẠI làm `governance_consented` thành hằng False vĩnh viễn ⇒ hồ sơ không
// Retire được, không di trú tiếp được, không đổi được ba trường quản trị.
// Và dùng lại `shape_*` để hồ sơ sau cập nhật vẫn thuộc đúng MỘT hạng — cấm nửa vời.

/** Trần số phần tử `accepted_assets` — gương `platform.max_accepted_assets` (`platform.ak:90`). */
export const MAX_ACCEPTED_ASSETS = 32;

/**
 * Gương `platform.governance_ref_distinct` (`platform.ak:188`).
 *
 * `governance_ref` trùng `custody_hash` là GIẢ MẠO ĐỒNG THUẬN: `custody.ak` nhánh `Collect`
 * là permissionless (đo: `grep -c "extra_signatories" custody.ak` → 0), nên ai cũng dựng
 * được một input ở script đó, và `governance_consented` đọc input ấy thành "quản trị đã cho
 * phép". Hệ quả: authority MỘT MÌNH gỡ niêm yết vĩnh viễn / đổi `cut_bps` / di trú hồ sơ.
 *
 * Trùng `seed_policy` hoặc `beacon_policy` là TỰ KHOÁ, lý do khác: minting policy không có
 * handler `spend`, nên `governance_consented` thành hằng False ⇒ hồ sơ kẹt vĩnh viễn.
 */
export function governanceRefDistinct(e: PlatformEntry): boolean {
  const g = normHex(e.governance_ref);
  return g !== normHex(e.custody_hash)
    && g !== normHex(e.seed_policy)
    && g !== normHex(e.beacon_policy);
}

export function mutableFieldsValid(e: PlatformEntry): boolean {
  return isScriptHash28(e.governance_ref)
    && governanceRefDistinct(e)
    && e.accepted_assets.length <= MAX_ACCEPTED_ASSETS
    && entryShapeValid(e);
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
// viễn của sổ. Off-chain gương lại: bên gọi cấp cửa sổ Ô THỜI GIAN của tx, builder ép nằm trong.
//
// ⚠ TÊN GỌI: đơn vị là Ô 5 NGÀY KỂ TỪ MỐC UNIX (`posix_ms / 432_000_000`), KHÔNG phải số
// epoch Cardano — xem `MS_PER_TIME_BUCKET`. Trường datum vẫn tên `created_epoch` vì đó là
// HỢP ĐỒNG lược đồ với on-chain (đổi tên trường = đổi lược đồ); chỉ CÁCH GỌI đổi.

/** Ô thời gian của một mốc POSIX ms. Gương phần số học của `util.get_time_bucket_bounded`. */
export function timeBucketOf(posixMs: bigint): bigint {
  return posixMs / MS_PER_TIME_BUCKET;
}

export interface TimeBucketWindow {
  /** ô thời gian suy từ cận DƯỚI validity_range của tx. */
  from: bigint;
  /** ô thời gian suy từ cận TRÊN validity_range của tx. */
  to: bigint;
}

/**
 * Gương `util.current_time_bucket` (bọc `get_time_bucket_bounded`): validity_range của tx
 * đăng ký phải nằm GỌN trong MỘT ô — cả hai cận hữu hạn và cùng ô — rồi `created_epoch` phải
 * bằng đúng ô đó. Cửa sổ trải qua biên ô bị TỪ CHỐI: đặt cận dưới ở ô cũ rồi submit muộn là
 * cách "đóng băng" mốc, mà trường này bất biến nên sai một lần là sai mãi.
 * Nguồn: onchain/lib/magiclamp/registry/util.ak:161-202 (đọc 2026-08-14).
 */
export function timeBucketInWindow(bucket: bigint, w: TimeBucketWindow): boolean {
  return w.from === w.to && bucket === w.from;
}

// ── HỢP ĐỒNG ttl: đặt validFrom/validTo THẬT, không chỉ tính cửa sổ ────────
// Ràng buộc R-EPOCH on-chain ĐỌC `validity_range`. Tx không đặt ttl có cận vô hạn ⇒
// `get_finite` trả None ⇒ `expect Some(...)` hỏng ⇒ tx TRƯỢT. Trước bản này không script nào
// đặt hai giá trị đó — chỉ tính cửa sổ để kiểm datum. Đây là chỗ nối lại.

/** Cửa sổ hiệu lực (ttl) của một tx, đã cắt cho nằm gọn trong MỘT ô thời gian. */
export interface TxValidityWindow {
  /** ô thời gian của tx = giá trị PHẢI khai vào `created_epoch`. */
  bucket: bigint;
  /** `invalid_before` (POSIX ms) — biên dưới BAO GỒM. */
  validFrom: bigint;
  /** `invalid_hereafter` (POSIX ms) — biên trên LOẠI TRỪ. */
  validTo: bigint;
  /** ttl yêu cầu đã bị CẮT vì trót vượt biên ô. */
  truncated: boolean;
  /** số ms còn lại của ô kể từ `nowMs` — cửa sổ thật không dài hơn số này được. */
  msLeftInBucket: bigint;
}

/**
 * Dựng `validFrom`/`validTo` cho một tx phải thoả R-EPOCH.
 *
 * HỢP ĐỒNG VỚI ON-CHAIN (util.ak:166-169): ledger mã hoá `invalid_before` là biên dưới BAO
 * GỒM và `invalid_hereafter` là biên trên LOẠI TRỪ, nên validator đọc `hi_ms = validTo - 1`.
 * Điều kiện "gọn trong ô b" vì thế là:
 *     b * 432_000_000  ≤  validFrom      và      validTo  ≤  (b + 1) * 432_000_000
 * Biên trên LẤY BẰNG ĐÚNG MỐC VẪN QUA (vì `validTo - 1` vẫn thuộc ô b) — không cần trừ 1;
 * ai muốn dư biên thì truyền ttl ngắn hơn.
 */
export function txValidityForTimeBucket(nowMs: bigint, ttlMs: bigint): TxValidityWindow {
  if (nowMs < 0n) throw new Error(`TTL-NOW: nowMs (${nowMs}) âm — mốc POSIX phải ≥ 0`);
  if (ttlMs <= 0n) throw new Error(`TTL-LEN: ttlMs (${ttlMs}) phải > 0`);

  const bucket = timeBucketOf(nowMs);
  const bucketEnd = (bucket + 1n) * MS_PER_TIME_BUCKET;   // biên LOẠI TRỪ.
  const wanted = nowMs + ttlMs;
  const validTo = wanted > bucketEnd ? bucketEnd : wanted;

  return {
    bucket,
    validFrom: nowMs,
    validTo,
    truncated: wanted > bucketEnd,
    msLeftInBucket: bucketEnd - nowMs,
  };
}

/**
 * Cửa sổ ttl có thật sự thoả `get_time_bucket_bounded` không — để KHOÁ hợp đồng bằng test
 * thay vì bằng lời hứa. Mô phỏng đúng phép của validator: lower bound inclusive
 * (`lo_ms = validFrom`), upper bound exclusive (`hi_ms = validTo - 1`), rồi đòi cùng ô.
 */
export function validityFitsOneBucket(w: { validFrom: bigint; validTo: bigint }): boolean {
  if (w.validTo <= w.validFrom) return false;             // cửa sổ rỗng — ledger từ chối.
  return timeBucketOf(w.validFrom) === timeBucketOf(w.validTo - 1n);
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
  /**
   * UTxO kho tx PHẢI readFrom (R-BIND). `undefined` với hồ sơ KHÔNG KHO — hạng đó không có
   * kho để đối chiếu, và on-chain cũng bỏ R-BIND cho nó (registry_beacon.ak:183-197).
   */
  custodyRef?: CustodyRef;
  /** Hạng hình dạng của hồ sơ — `false` = KHÔNG KHO. */
  custodial: boolean;
  /** Bằng chứng R-GOVLIVE đã dùng — bên dựng tx PHẢI nối đúng thứ này vào tx. */
  governanceProof: GovernanceProof;
  /** Đường mà cổng quản trị chạy trong tx đăng ký: chi tiêu input, hay withdrawal. */
  governanceConsentKind: GovernanceConsentKind;
  summary: string;
}

export interface RegisterParams {
  config: PlatformConfig;
  /** beacon NFT policy = hash(registry_beacon(authority, registry_hash)). */
  beaconPolicy: string;
  /** script hash kho của platform — vào entry.custody_hash. RỖNG cho hồ sơ KHÔNG KHO. */
  custodyHash: string;
  /**
   * seed_policy của kho — vào entry.seed_policy. config.seedPolicy (nếu có) được ưu tiên.
   * RỖNG cho hồ sơ KHÔNG KHO.
   */
  seedPolicy: string;
  /** ô thời gian đăng ký (vào trường `created_epoch`) ≥ 0. */
  createdEpoch: bigint;
  /**
   * UTxO kho tx PHẢI reference (R-BIND) — BẮT BUỘC với hồ sơ CÓ KHO, thiếu/sai → REG-BIND.
   * Hồ sơ KHÔNG KHO bỏ trống (cấp vào cũng bị bỏ qua, đúng như on-chain).
   */
  custodyUtxo?: CustodyRef;
  /** Cửa sổ ô thời gian của tx đăng ký (R-EPOCH). Cấp vào → ép created_epoch nằm trong. */
  timeBucketWindow?: TimeBucketWindow;
  /**
   * script hash của validator registry đích. Cấp vào → ép R-GOVSELF
   * (`governance_ref != registry_hash`, registry_beacon.ak:133).
   */
  registryHash?: string;
  /**
   * R-GOVLIVE (registry_beacon.ak:138-165) — BẮT BUỘC, không phải tuỳ chọn.
   *
   * Cổng quản trị của chính platform phải CHẠY THẬT ngay trong tx đăng ký: tx chi tiêu một
   * input ở `Script(governance_ref)`, HOẶC mang một withdrawal từ `Script(governance_ref)`.
   * Đây là điểm DUY NHẤT trong vòng đời hồ sơ có đòn bẩy đó — sau khi lên sổ, mọi đường
   * sửa/gỡ/di trú đều đi qua chính `governance_ref`, nên một ref chết là hồ sơ chết.
   *
   * ⚠ VÌ SAO TRƯỜNG NÀY BẮT BUỘC (đừng đổi lại thành tuỳ chọn): ràng buộc on-chain là VÔ
   * ĐIỀU KIỆN. Builder trả plan mà không có bằng chứng này thì plan đó dựng ra tx bị từ chối
   * 100% — cổng đăng ký không đăng ký được ai. Bắt buộc ở tầng kiểu là chỗ rẻ nhất để bắt.
   */
  governanceProof: GovernanceProof;
}

/**
 * Dựng plan đăng ký platform = mint beacon NFT + output hồ sơ well-formed.
 * Tự kiểm R-WF / R-NAME / R-POLICY / R-VER / R-EPOCH / R-GOVSELF / R-BIND fail-fast.
 *
 * HAI HÌNH DẠNG HỢP LỆ (xem `shapeCustodial` / `shapeNonCustodial`):
 *   CÓ KHO    — config khai instanceId + acceptedAssets, tham số cấp custodyHash/seedPolicy
 *               28 byte, và custodyUtxo cho R-BIND.
 *   KHÔNG KHO — config.instanceId = "", acceptedAssets = [], cutBps = 0n; custodyHash và
 *               seedPolicy = ""; KHÔNG cần custodyUtxo. `governanceRef` VẪN bắt buộc.
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
    substrate_flags: config.substrateFlags ?? 0n,
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
  // R-EPOCH: created_epoch phải là Ô THỜI GIAN của chính tx đăng ký.
  if (params.timeBucketWindow !== undefined
      && !timeBucketInWindow(entry.created_epoch, params.timeBucketWindow)) {
    throw new Error(
      `REG-EPOCH: created_epoch (${entry.created_epoch}) không khớp cửa sổ hiệu lực `
      + `[${params.timeBucketWindow.from}, ${params.timeBucketWindow.to}] — validity_range phải `
      + `nằm GỌN trong MỘT ô thời gian (5 ngày kể từ mốc Unix, KHÔNG phải epoch Cardano) và `
      + `created_epoch phải bằng đúng ô đó. Khai ô khác là ghi lời khai sai thành sự thật vĩnh `
      + `viễn của sổ (trường này bất biến)`,
    );
  }
  // R-WF: well-formed trước khi dựng tx — gồm phép chọn ĐÚNG MỘT hạng hình dạng.
  if (!entryWellFormed(entry)) {
    throw new Error(
      "REG-WF: PlatformEntry không well-formed. Đòi: spec_version==2, platform_id khác rỗng, "
      + "governance_ref và beacon_policy ĐÚNG 28 byte, created_epoch≥0, status=Active, và hồ sơ "
      + "thuộc ĐÚNG MỘT hạng — CÓ KHO (instance_id khác rỗng, custody_hash + seed_policy đúng 28 "
      + "byte, accepted_assets khác rỗng, cut_bps∈[0,10000]) hoặc KHÔNG KHO (instance_id + "
      + "custody_hash + seed_policy rỗng HẾT, accepted_assets rỗng, cut_bps=0). "
      + "Nửa vời bị từ chối ở CẢ hai phía",
    );
  }
  // R-GOVSELF: cổng đồng thuận KHÔNG được là chính registry (nếu bên gọi cấp registryHash).
  if (params.registryHash !== undefined && !governanceRefNotSelf(entry, params.registryHash)) {
    throw new Error(
      `REG-GOVSELF: governance_ref (${entry.governance_ref}) == registry_hash — cổng đồng thuận `
      + `tự thoả vĩnh viễn (ô hồ sơ luôn nằm ở Script(registry_hash)) ⇒ authority một mình `
      + `Retire / đổi cut_bps / di trú được`,
    );
  }
  // R-GOVLIVE: cổng quản trị phải CHẠY THẬT trong chính tx đăng ký (registry_beacon.ak:165).
  const govKind = governanceConsentKind(params.governanceProof, entry.governance_ref);
  if (govKind === null) {
    throw new Error(
      `REG-GOVLIVE: tx đăng ký KHÔNG chứng minh cổng quản trị (${entry.governance_ref || "(rỗng)"}) `
      + `chạy thật. On-chain đòi VÔ ĐIỀU KIỆN một trong hai: (1) tx chi tiêu một input ở `
      + `Script(governance_ref), hoặc (2) tx mang một withdrawal từ Script(governance_ref) `
      + `(rút 0 lovelace vẫn tính). Khai vào params.governanceProof đúng thứ tx sẽ mang. `
      + `Ép 28 byte KHÔNG thay được kiểm này: 28 byte đúng độ dài vẫn có thể là hash của một `
      + `script không tồn tại, mà mọi đường sửa/gỡ/di trú về sau đều đi qua chính ref này`,
    );
  }

  // R-BIND: CHỈ ÁP CHO HỒ SƠ CÓ KHO — hạng KHÔNG KHO có ba trường đó rỗng, không có gì để
  // đối chiếu (gương registry_beacon.ak:183-197).
  const custodial = shapeCustodial(entry);
  if (custodial) {
    if (!custodyUtxo) {
      throw new Error(
        "REG-BIND: thiếu custodyUtxo — hồ sơ CÓ KHO PHẢI reference UTxO kho mang NFT "
        + "authenticity (seed kho TRƯỚC khi đăng ký)",
      );
    }
    const bind = verifyCustodyBinding(
      custodyUtxo, entry.seed_policy, entry.instance_id, entry.custody_hash,
    );
    if (!bind.ok) {
      throw new Error(`REG-BIND: ${bind.reason}`);
    }
  }

  const entryValue: AssetMap = { [nftKey(beaconPol, nftName)]: 1n };

  const summary = [
    `═══ Đăng ký platform ═══`,
    `Hạng hồ sơ:    ${custodial ? "CÓ KHO" : "KHÔNG KHO (custody rỗng hết, cut_bps 0 — R-BIND không áp)"}`,
    `spec_version:  ${entry.spec_version}`,
    `Platform id:   ${entry.platform_id}`,
    `Instance id:   ${entry.instance_id || "(rỗng)"}`,
    `Custody hash:  ${entry.custody_hash || "(rỗng)"}`,
    `Seed policy:   ${entry.seed_policy || "(rỗng)"}`,
    `Beacon policy: ${entry.beacon_policy}`,
    `Gov ref:       ${entry.governance_ref}`,
    `Cut bps:       ${entry.cut_bps}`,
    `Ô thời gian:   ${entry.created_epoch} (trường datum created_epoch — ô 5 ngày kể từ mốc Unix)`,
    `Accepted:      ${entry.accepted_assets.length} asset`,
    `Beacon NFT:    ${nftUnit} (qty 1)`,
    custodial && custodyUtxo
      ? `Custody ref:   ${custodyUtxo.txHash ?? "?"}#${custodyUtxo.outputIndex ?? "?"} `
        + `(readFrom — R-BIND: NFT ${normHex(seedPolicy)}|${entry.instance_id} @ Script(${entry.custody_hash}))`
      : `Custody ref:   (không có — hồ sơ KHÔNG KHO, tx đăng ký không cần reference input kho)`,
    `Authority:     ${normHex(config.registryAuthority)} (phải ký)`,
    govKind === "spend"
      ? `R-GOVLIVE:     tx PHẢI chi tiêu một input ở Script(${entry.governance_ref}) `
        + `(nhánh spend đó KHÔNG được mint/burn — xem cảnh báo R-MINT-2 bên dưới)`
      : `R-GOVLIVE:     tx PHẢI mang withdrawal từ Script(${entry.governance_ref}) `
        + `(rút 0 lovelace là đủ — withdrawal không đụng tx.mint)`,
    `R-MINT-2:      tx đăng ký chỉ được mang ĐÚNG MỘT policy mint (beacon). Cổng quản trị mà `
      + `nhánh đồng thuận CẦN mint/burn thì KHÔNG đăng ký được — đổi sang withdraw-0 hoặc một `
      + `nhánh spend không-mint (registry_beacon.ak:147-165)`,
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
    custodial,
    governanceProof:  params.governanceProof,
    governanceConsentKind: govKind,
    ...(custodial && custodyUtxo ? { custodyRef: custodyUtxo } : {}),
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
  /** Lời khai nền. Nằm trong `governed_fields_changed` ⇒ đổi nó đòi authority ký VÀ đồng
   *  thuận quản trị của chính platform, y như `cut_bps`/`governance_ref`. */
  substrate_flags?: bigint;
}

export interface UpdateOptions {
  /**
   * LỜI KHAI RÚT GỌN: "cổng quản trị ĐƯƠNG NHIỆM (`entryIn.governance_ref`) chạy trong tx".
   * Chỉ đủ cho U-GOV. KHÔNG đủ khi tx ĐỔI `governance_ref`: U-GOV2 đòi thêm ref MỚI cũng
   * chạy, mà một boolean không nói được ref nào — ca đó phải khai `governanceProof`.
   */
  governanceConsent?: boolean;
  /**
   * Bằng chứng ĐẦY ĐỦ theo script hash (gương `util.governance_consented`). Bắt buộc khi tx
   * đổi `governance_ref` — U-GOV2 (registry.ak:257-265) đòi CẢ ref cũ LẪN ref mới chạy thật
   * trong chính tx bàn giao. Cấp cùng `governanceConsent` cũng được: hai nguồn hợp lại cho
   * ref CŨ, còn ref MỚI chỉ nhận từ đây.
   */
  governanceProof?: GovernanceProof;
  /** value ô hồ sơ ở input — cấp cùng valueOut để ép U-VALUE. */
  valueIn?: AssetMap;
  /** value ô hồ sơ ở output. */
  valueOut?: AssetMap;
  /**
   * script hash của CHÍNH validator registry đang giữ hồ sơ. Cấp vào → ép S-GOVSELF
   * (`entry_in.governance_ref != own_hash`, registry.ak:174 — áp cho CẢ HAI nhánh).
   */
  ownRegistryHash?: string;
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
  /** TRUE nếu tx này ĐỔI `governance_ref` ⇒ BÀN GIAO HAI CHIỀU (U-GOV2). */
  governanceHandover: boolean;
  /**
   * Các script hash mà tx PHẢI làm chạy thật (chi tiêu input ở đó, hoặc withdrawal từ đó).
   * Rỗng = không đòi gì. Một phần tử = ref đương nhiệm. Hai = bàn giao (cũ rồi mới).
   */
  governanceConsentRefs: string[];
  /**
   * U-REVIVE (registry.ak:228-243): hồi sinh THUẦN TUÝ = Paused → Active và MỌI trường khác
   * y hệt. Ca duy nhất mà chữ ký `registry_authority` KHÔNG bắt buộc — đồng thuận quản trị
   * của chính platform cũng đủ, để authority không biến `Paused` thành gỡ vĩnh viễn bằng
   * cách đơn giản là không bao giờ ký lại. TRUE ⇒ `requiredSigner` là MỘT trong hai đường,
   * không phải điều kiện bắt buộc.
   */
  pureRevive: boolean;
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
  // S-GOVSELF: cổng đồng thuận không được là chính registry (áp cho CẢ HAI nhánh spend).
  if (opts.ownRegistryHash !== undefined && !governanceRefNotSelf(entryIn, opts.ownRegistryHash)) {
    throw new Error(
      `UPD-GOVSELF: entryIn.governance_ref (${normHex(entryIn.governance_ref)}) == own_hash — `
      + `governance_consented tự thoả vĩnh viễn ⇒ mọi rào "hai bên" biến mất. Hồ sơ này KẸT: `
      + `validator từ chối mọi lần chi tiêu`,
    );
  }

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
    substrate_flags: changes.substrate_flags ?? entryIn.substrate_flags,
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
      "UPD-MUT: trường khả biến không hợp lệ. Đòi: governance_ref ĐÚNG 28 byte, và hồ sơ sau "
      + "cập nhật vẫn thuộc ĐÚNG MỘT hạng hình dạng — CÓ KHO (accepted_assets khác rỗng, "
      + "cut_bps∈[0,10000]) hoặc KHÔNG KHO (accepted_assets rỗng, cut_bps=0). Nửa vời bị cấm",
    );
  }
  // U-GOVSELF-OUT (registry.ak:212): nửa còn lại của S-GOVSELF, nay đã CÓ trên chuỗi.
  // `mutableFieldsValid` chỉ ép ĐỘ DÀI 28 mà own_hash dài đúng 28 ⇒ thiếu dòng này thì một tx
  // hợp lệ (authority ký + platform đồng thuận một lần) ghi được `governance_ref = own_hash`
  // và ô hồ sơ KHOÁ VĨNH VIỄN. Builder NÉM, không cảnh báo: validator từ chối thẳng.
  if (opts.ownRegistryHash !== undefined
      && normHex(entryOut.governance_ref) === normHex(opts.ownRegistryHash)) {
    throw new Error(
      `UPD-GOVSELF-OUT: cập nhật này ghi entryOut.governance_ref == own_hash `
      + `(${normHex(opts.ownRegistryHash)}) — cổng đồng thuận tự thoả vĩnh viễn, và hồ sơ KẸT: `
      + `mọi lần chi tiêu SAU đều chết ở S-GOVSELF (cả Update lẫn Migrate). Validator đã chặn `
      + `tại registry.ak:212 — đổi giá trị này trước khi ký`,
    );
  }
  // U-SHAPE: KHÔNG đổi hạng có-kho ↔ không-kho (registry.ak:218). Đổi hạng = đổi bản chất
  // dịch vụ ⇒ phải đăng ký mới. (U-ID đã khoá ba trường custody nên chỉ còn đường đổi qua
  // accepted_assets/cut_bps — U-MUT bắt phần lớn, dòng này khoá phần còn lại và nói rõ lý do.)
  if (shapeCustodial(entryIn) !== shapeCustodial(entryOut)) {
    throw new Error(
      `UPD-SHAPE: hồ sơ đổi hạng (${shapeCustodial(entryIn) ? "CÓ KHO → KHÔNG KHO" : "KHÔNG KHO → CÓ KHO"}) `
      + `— đổi bản chất dịch vụ, phải đăng ký hồ sơ mới chứ không cập nhật`,
    );
  }
  // U-GOV: tách quyền — việc không đảo ngược được cần cả hai bên. Dùng ref CŨ (bên đương
  // nhiệm phải đồng ý cả khi bị thay).
  const needsGovernanceConsent = changesRequireGovernance(entryIn, entryOut);
  const oldRefConsented = opts.governanceConsent === true
    || governanceConsented(opts.governanceProof, entryIn.governance_ref);
  if (needsGovernanceConsent && !oldRefConsented) {
    throw new Error(
      "UPD-GOV: thay đổi này (→ Retired, hoặc đổi governance_ref/accepted_assets/cut_bps) đòi "
      + "ĐỒNG THUẬN QUẢN TRỊ của chính platform, không chỉ chữ ký authority. Một chữ ký "
      + "authority chỉ đủ cho Active ↔ Paused (gỡ niêm yết — đảo ngược được)",
    );
  }
  // U-GOV2 (registry.ak:257-265): ĐỔI governance_ref = BÀN GIAO HAI CHIỀU. Ref CŨ đã bị U-GOV
  // đòi ở trên; dòng này đòi thêm ref MỚI phải CHẠY ĐƯỢC ngay trong chính tx bàn giao. Không
  // có nó, "đồng thuận quản trị" của MỌI việc sau đó treo vào một hash chưa ai chứng minh là
  // script sống — ép 28 byte là guard cú pháp, không phải bằng chứng tồn tại.
  // Boolean `governanceConsent` KHÔNG dùng được ở đây: nó không nói ref nào đã chạy.
  const governanceHandover =
    normHex(entryOut.governance_ref) !== normHex(entryIn.governance_ref);
  if (governanceHandover && !governanceConsented(opts.governanceProof, entryOut.governance_ref)) {
    throw new Error(
      `UPD-GOV2: tx đổi governance_ref (${normHex(entryIn.governance_ref)} → `
      + `${normHex(entryOut.governance_ref)}) nhưng KHÔNG chứng minh cổng quản trị MỚI chạy `
      + `thật trong chính tx bàn giao. Khai vào opts.governanceProof một input ở `
      + `Script(ref_mới) hoặc một withdrawal từ Script(ref_mới). Thiếu bằng chứng đó, hồ sơ `
      + `có thể bị trỏ vào một hash chết ⇒ KHÔNG Retire được, KHÔNG di trú được, KHÔNG đổi gov `
      + `được, vì mọi đường đó đều đòi đồng thuận của chính cái ref chết ấy`,
    );
  }
  // U-VALUE: không rút token/ADA khỏi ô hồ sơ (kiểm khi bên gọi cấp cả hai value).
  if (opts.valueIn !== undefined && opts.valueOut !== undefined
      && !valuePreserved(opts.valueIn, opts.valueOut)) {
    throw new Error(
      "UPD-VALUE: ô hồ sơ bị rút token/ADA (token khác lovelace phải bằng nhau, lovelace ra ≥ vào)",
    );
  }

  // U-REVIVE: hồi sinh THUẦN TUÝ — Paused → Active và MỌI trường khả biến khác y hệt.
  const pureRevive = entryIn.status === "Paused" && entryOut.status === "Active"
    && entryOut.spec_version === entryIn.spec_version
    && normHex(entryOut.governance_ref) === normHex(entryIn.governance_ref)
    && sameAssetList(entryIn.accepted_assets, entryOut.accepted_assets)
    && entryOut.cut_bps === entryIn.cut_bps;

  const nftUnit = normHex(beaconPolicy) + entryOut.platform_id;   // U-NFT bảo toàn.
  const entryValue: AssetMap = { [nftKey(beaconPolicy, entryOut.platform_id)]: 1n };

  const summary = [
    `═══ Cập nhật hồ sơ ═══`,
    `Platform id: ${entryOut.platform_id} (định danh giữ nguyên, spec_version ${entryOut.spec_version})`,
    `Hạng hồ sơ:  ${shapeCustodial(entryOut) ? "CÓ KHO" : "KHÔNG KHO"} (U-SHAPE: không đổi hạng)`,
    `Status:      ${entryIn.status} → ${entryOut.status}`,
    `Cut bps:     ${entryIn.cut_bps} → ${entryOut.cut_bps}`,
    `Gov ref:     ${entryOut.governance_ref}`,
    `Accepted:    ${entryOut.accepted_assets.length} asset`,
    `Beacon NFT:  ${nftUnit} (giữ qty 1)`,
    pureRevive
      ? `Authority:   ${normHex(registryAuthority)} (U-REVIVE: hồi sinh thuần tuý — authority ký `
        + `HOẶC đồng thuận quản trị của platform, một trong hai là đủ)`
      : `Authority:   ${normHex(registryAuthority)} (phải ký)`,
    `Đồng thuận quản trị: ${needsGovernanceConsent ? "BẮT BUỘC (thay đổi không đảo ngược được)" : "không cần (đảo ngược được)"}`,
    ...(governanceHandover
      ? [`BÀN GIAO QUẢN TRỊ (U-GOV2): tx PHẢI làm chạy CẢ HAI cổng trong cùng một tx — `
         + `cũ ${normHex(entryIn.governance_ref)}, mới ${normHex(entryOut.governance_ref)}. `
         + `Mỗi bên: chi tiêu một input ở Script(ref) hoặc withdrawal từ Script(ref).`]
      : []),
  ].join("\n");

  return {
    entryOut,
    entryDatumCbor: platformEntryToCbor(entryOut),
    nftUnit,
    entryValue,
    redeemerCbor:   updateEntryRedeemerToCbor(),
    requiredSigner: normHex(registryAuthority),
    needsGovernanceConsent,
    governanceHandover,
    // Chỉ liệt ref BẮT BUỘC. `pureRevive` KHÔNG vào đây: ở ca đó đồng thuận quản trị là một
    // TRONG HAI đường (thay cho chữ ký authority), không phải nghĩa vụ thêm — xem `pureRevive`.
    governanceConsentRefs: [
      ...(needsGovernanceConsent ? [normHex(entryIn.governance_ref)] : []),
      ...(governanceHandover ? [normHex(entryOut.governance_ref)] : []),
    ],
    pureRevive,
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
   *  của validator này, platform phải đồng ý. LỜI KHAI RÚT GỌN cho ref ĐƯƠNG NHIỆM; ca bàn
   *  giao (đổi ref khi di trú) phải khai `governanceProof`. */
  governanceConsent: boolean;
  /**
   * ĐỔI `governance_ref` NGAY TRONG TX DI TRÚ. Bỏ trống = giữ nguyên ref cũ.
   *
   * Vì sao có trường này: `M-ID` KHÔNG gồm `governance_ref` (platform.ak:218-220) ⇒ on-chain CHO
   * PHÉP đổi ref khi di trú. Bản trước off-chain chép cứng ref cũ nên không dựng được tx bàn
   * giao hợp lệ — một đường đi thật mà SDK không nói được. Đổi ref thì M-GOV2 đòi thêm ref
   * MỚI chạy trong chính tx này.
   */
  newGovernanceRef?: string;
  /**
   * Bằng chứng theo script hash (gương `util.governance_consented`). Bắt buộc khi
   * `newGovernanceRef` khác ref cũ — M-GOV2 (registry.ak:316-323).
   */
  governanceProof?: GovernanceProof;
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
  /** TRUE nếu tx này ĐỔI `governance_ref` ⇒ BÀN GIAO HAI CHIỀU (M-GOV2). */
  governanceHandover: boolean;
  /** Các script hash mà tx PHẢI làm chạy thật (ref cũ luôn có — M-GOV là vô điều kiện). */
  governanceConsentRefs: string[];
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

  // S-GOVSELF: cổng đồng thuận không được là chính registry đang giữ hồ sơ (registry.ak:174 —
  // ép TRƯỚC khi rẽ nhánh, nên áp cả ở đường di trú).
  if (!governanceRefNotSelf(entryIn, ownHash)) {
    throw new Error(
      `MIG-GOVSELF: entryIn.governance_ref (${normHex(entryIn.governance_ref)}) == own_hash — `
      + `hồ sơ này validator từ chối chi tiêu ở MỌI nhánh, kể cả di trú`,
    );
  }
  // M-DEST: đích phải là SCRIPT HASH THẬT (ĐÚNG 28 byte) và KHÁC chính mình. Thiếu ràng buộc
  // 28 byte thì di trú tới #"00" là "hợp lệ" ⇒ beacon NFT + min-ADA bay tới một địa chỉ script
  // KHÔNG TỒN TẠI và KHÔNG THỂ tồn tại ⇒ mất beacon vĩnh viễn (registry.ak:270).
  if (!isScriptHash28(newHash)) {
    throw new Error(
      `MIG-DEST: new_registry_hash (${newHash || "(rỗng)"}) không phải script hash 28 byte — `
      + `di trú tới một địa chỉ script KHÔNG THỂ tồn tại là mất beacon vĩnh viễn`,
    );
  }
  if (newHash === ownHash) {
    throw new Error(
      `MIG-DEST: new_registry_hash == own_hash (${ownHash}) — di trú phải sang validator KHÁC`,
    );
  }
  // M-VER: phiên bản lược đồ phải TĂNG.
  if (newSpecVersion <= entryIn.spec_version) {
    throw new Error(
      `MIG-VER: new_spec_version (${newSpecVersion}) phải > spec_version hiện tại `
      + `(${entryIn.spec_version})`,
    );
  }
  // M-GOV: platform phải đồng ý (ref ĐƯƠNG NHIỆM).
  if (params.governanceConsent !== true
      && !governanceConsented(params.governanceProof, entryIn.governance_ref)) {
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
    // M-ID KHÔNG khoá governance_ref ⇒ di trú ĐỔI ref được, và đó là đường bàn giao hợp lệ.
    governance_ref:  normHex(params.newGovernanceRef ?? entryIn.governance_ref),
    accepted_assets: entryIn.accepted_assets.map(normAssetKey),
    status:          entryIn.status,     // M-STATUS: giữ nguyên.
  };

  // M-ID: sáu trường định danh bảo toàn.
  if (!identityPreserved(entryIn, entryOut)) {
    throw new Error("MIG-ID: sáu trường định danh bị đổi khi di trú — cấm");
  }
  // M-MUT: datum ĐÍCH vẫn hợp lệ (registry.ak:306). Thiếu dòng này, nhánh CỨU tự ghi ra hồ sơ
  // khoá chết ở registry mới (governance_ref rác / cut_bps ngoài dải / hình dạng nửa vời) —
  // tức nhánh cứu tạo lại đúng cái nó sinh ra để cứu.
  if (!mutableFieldsValid(entryOut)) {
    throw new Error(
      "MIG-MUT: datum đích không hợp lệ (governance_ref phải ĐÚNG 28 byte, và hồ sơ phải thuộc "
      + "ĐÚNG MỘT hạng hình dạng — CÓ KHO hoặc KHÔNG KHO, không nửa vời)",
    );
  }
  // M-GOVSELF-OUT (registry.ak:314-315) — hai biến thể, nay đã CÓ trên chuỗi, builder NÉM.
  //  · == new_registry_hash ⇒ hồ sơ BRICK NGAY khi tới registry mới (validator mới mang cùng
  //    ràng buộc S-GOVSELF trên datum VÀO).
  //  · == own_hash ⇒ không brick, nhưng "đồng thuận" về sau chỉ còn nghĩa "có ai đó tiêu một
  //    ô hồ sơ bất kỳ ở registry CŨ" — thủ tục rỗng.
  if (normHex(entryOut.governance_ref) === newHash) {
    throw new Error(
      `MIG-GOVSELF-DEST: entryOut.governance_ref == registry hash ĐÍCH (${newHash}) — ở registry `
      + `mới, S-GOVSELF từ chối MỌI lần chi tiêu ⇒ beacon kẹt vĩnh viễn. Validator đã chặn tại `
      + `registry.ak:314 — đổi governance_ref trước khi di trú`,
    );
  }
  if (normHex(entryOut.governance_ref) === ownHash) {
    throw new Error(
      `MIG-GOVSELF-OWN: entryOut.governance_ref == registry hash CŨ (${ownHash}) — không brick, `
      + `nhưng "đồng thuận quản trị" của hồ sơ về sau chỉ còn nghĩa "có ai đó tiêu một ô hồ sơ `
      + `bất kỳ ở registry cũ", tức thủ tục rỗng. Validator đã chặn tại registry.ak:315`,
    );
  }
  // M-GOV2 (registry.ak:316-323): đổi governance_ref khi di trú = BÀN GIAO HAI CHIỀU, cùng
  // luật với U-GOV2. M-GOV trên kia đã đòi ref CŨ; đây đòi thêm ref MỚI chạy được ngay trong
  // tx di trú. Thiếu nó, Migrate là cửa sau đi vòng qua đúng U-GOV2.
  const governanceHandover =
    normHex(entryOut.governance_ref) !== normHex(entryIn.governance_ref);
  if (governanceHandover
      && !governanceConsented(params.governanceProof, entryOut.governance_ref)) {
    throw new Error(
      `MIG-GOV2: tx di trú đổi governance_ref (${normHex(entryIn.governance_ref)} → `
      + `${normHex(entryOut.governance_ref)}) nhưng KHÔNG chứng minh cổng quản trị MỚI chạy thật `
      + `trong chính tx di trú. Khai vào params.governanceProof một input ở Script(ref_mới) `
      + `hoặc một withdrawal từ Script(ref_mới). Không đổi ref thì KHÔNG phát sinh nghĩa vụ nào `
      + `thêm — bỏ trống newGovernanceRef`,
    );
  }
  // M-SHAPE: không đổi hạng có-kho ↔ không-kho (registry.ak:324).
  if (shapeCustodial(entryIn) !== shapeCustodial(entryOut)) {
    throw new Error("MIG-SHAPE: di trú đổi hạng hình dạng — cấm");
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
    `Hạng hồ sơ:    ${shapeCustodial(entryOut) ? "CÓ KHO" : "KHÔNG KHO"} (M-SHAPE: không đổi hạng)`,
    `Status:        ${entryOut.status} (GIỮ NGUYÊN — M-STATUS)`,
    `Beacon NFT:    ${nftUnit} (có ở cả input lẫn output — M-NFT)`,
    `Authority:     ${normHex(registryAuthority)} (phải ký)`,
    `Đồng thuận quản trị: BẮT BUỘC (M-GOV)`,
    `Ghi chú: hồ sơ Retired VẪN di trú được — U-TERMINAL không áp ở nhánh này.`,
    governanceHandover
      ? `BÀN GIAO QUẢN TRỊ (M-GOV2): gov ref ${normHex(entryIn.governance_ref)} → `
        + `${normHex(entryOut.governance_ref)}. Tx PHẢI làm chạy CẢ HAI cổng: mỗi bên một input `
        + `ở Script(ref) hoặc withdrawal từ Script(ref).`
      : `Gov ref:       ${normHex(entryOut.governance_ref)} (GIỮ NGUYÊN — không phát sinh `
        + `nghĩa vụ đồng thuận nào thêm ngoài M-GOV)`,
  ].join("\n");

  return {
    entryOut,
    entryDatumCbor: platformEntryToCbor(entryOut),
    nftUnit,
    entryValue,
    redeemerCbor:   migrateEntryRedeemerToCbor(newHash, newSpecVersion),
    requiredSigner: normHex(registryAuthority),
    newRegistryHash: newHash,
    governanceHandover,
    governanceConsentRefs: [
      normHex(entryIn.governance_ref),      // M-GOV: vô điều kiện ở nhánh di trú.
      ...(governanceHandover ? [normHex(entryOut.governance_ref)] : []),
    ],
    summary,
  };
}

/** Chuẩn hoá AssetKey về hex trần (khớp encode datum). */
function normAssetKey(a: AssetKey): AssetKey {
  return { policy: normHex(a.policy), name: normHex(a.name) };
}
