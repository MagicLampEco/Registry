// Registry registryQuery — quét sổ: "tất cả platform" = tập UTxO mang beacon NFT dưới
// policy của registry_beacon. Mỗi platform = 1 beacon NFT (name = platform_id).
//
// THUẦN (không cần chain thật): nhận utxos[] (bên gọi đã lấy từ provider) → lọc UTxO mang
// token của policy beacon → giải mã inline datum PlatformEntry → trả danh sách platform.
//
// ─── BỐN VAN TRƯỚC KHI ROUTE PHÍ (đọc kỹ; Feat-Spec §3.4 đặt trọng lượng an toàn ở đây) ───
// Quét sổ CHỈ đọc datum. Datum có thể khai `seed_policy/instance_id/custody_hash/beacon_policy`
// BẤT KỲ. Vì vậy quét là CHỈ-MỤC ĐỂ TÌM, KHÔNG phải bằng chứng đủ để GỬI TIỀN. Ai định gửi
// giá trị tới kho của một platform PHẢI qua bốn van:
//   1. `verifyEntryAgainstCustody(entry, custodyUtxo)` — đối soát với UTxO kho THẬT. Đừng hiểu
//      nhầm R-BIND on-chain: nó chỉ kiểm hồ sơ TỰ NHẤT QUÁN (mọi trường đều do người đăng ký
//      khai), nên KHÔNG chứng minh kho đó là kho thật. Chưa đối soát → KHÔNG route phí.
//   2. `findDuplicatePlatformIds(...)` / cờ `duplicate` — on-chain KHÔNG ép platform_id duy
//      nhất (beacon không one-shot). Có trùng → KHÔNG im lặng chọn cái đầu.
//   3. Cờ `foreignScript` (cấp `registryScriptHash`) — beacon NFT nằm ngoài registry validator
//      thật thì bỏ qua hoặc soi kỹ. Kèm cờ `policyMismatch`: datum tự khai beacon_policy khác
//      policy đang quét (hồ sơ tự dựng — trơ nhưng vẫn tồn tại được).
//   4. Cờ `stakedVariant` (cấp `registryScriptHash` VÀ `stakeCredential` mỗi UTxO) — hồ sơ ở
//      ĐÚNG registry hash nhưng ở BIẾN THỂ STAKE của nó. Van #3 xanh với ca này: payment
//      credential đúng. Cái khác là ĐỊA CHỈ — và bên đọc bằng `utxosAt(<địa chỉ enterprise>)`
//      không thấy hồ sơ đó. Bộ quét này thấy, vì nó tìm theo beacon NFT chứ không theo địa chỉ,
//      nên nó là chỗ DUY NHẤT trong SDK phát hiện được sự bất đồng giữa hai đường đọc.
//      Gương của R-ADDR/U-ADDR/M-ADDR on-chain (Math-Spec §8 T16).
//      ⚠ `undefined` = CHƯA ĐO, không phải "sạch". Kiểm bằng `=== false`, đừng dùng `!`.
//
// ⛔ Đây là VAN SDK. SDK KHÔNG ép được — người tích hợp PHẢI tự gọi trước khi route phí.

import { Data } from "@lucid-evolution/lucid";
import type { PlatformEntry, PlatformStatus } from "./types.js";
import { decodePlatformEntry } from "./registryDatum.js";
import { shapeNonCustodial } from "./registrationBuilder.js";

/** Hình dạng UTxO tối thiểu (tập con của lucid UTxO) — đủ để quét thuần. */
export interface QueryUtxo {
  /** value: unit (policyId‖assetNameHex, "lovelace" cho ADA) → số lượng. */
  assets: Record<string, bigint>;
  /** inline datum CBOR hex (undefined/null nếu không có). */
  datum?: string | null;
  /** script hash của payment credential địa chỉ UTxO (hex 28-byte). Tuỳ chọn — cấp để đối
   *  soát van #3 và để `verifyEntryAgainstCustody` so với entry.custody_hash. */
  scriptHash?: string;
  /** phần STAKE của địa chỉ UTxO. `null`/`undefined` = địa chỉ enterprise (không phần stake);
   *  chuỗi = có phần stake. Tuỳ chọn — cấp để đối soát van #4.
   *
   *  ⚠ `undefined` ở đây nghĩa là "bên gọi KHÔNG cấp", không phải "đã đo và không có". Van #4
   *  vì thế chỉ chạy khi bên gọi cấp `registryScriptHash`, và nó đọc `undefined` là chưa đo —
   *  xem chú thích ở `stakedVariant`. */
  stakeCredential?: string | null;
  /** ngữ cảnh tham chiếu (tuỳ chọn — bên gọi giữ để chi tiêu sau). */
  txHash?: string;
  outputIndex?: number;
}

/** Một platform đã quét ra: hồ sơ đã giải mã + UTxO gốc (để chi tiêu khi cập nhật). */
export interface DiscoveredPlatform {
  entry: PlatformEntry;
  /** unit beacon NFT mang hồ sơ này (policy‖platform_id). */
  nftUnit: string;
  utxo: QueryUtxo;
  /** TRUE nếu platform_id này xuất hiện ≥2 lần trong lô quét (van #2 — không tin mù). */
  duplicate: boolean;
  /** TRUE nếu datum tự khai beacon_policy KHÁC policy đang quét (hồ sơ tự dựng). */
  policyMismatch: boolean;
  /** TRUE nếu có cấp registryScriptHash VÀ utxo.scriptHash != registryScriptHash (van #3). */
  foreignScript?: boolean;
  /** VAN #4 — hồ sơ ở ĐÚNG registry hash nhưng ở BIẾN THỂ STAKE của nó (van #3 xanh, địa chỉ
   *  khác). Gương của R-ADDR/U-ADDR/M-ADDR on-chain.
   *
   *  Vì sao chỉ bộ quét này thấy được: nó tìm theo BEACON NFT, nên nó tìm ra hồ sơ ở mọi địa
   *  chỉ. Bên đọc bằng `utxosAt(<địa chỉ enterprise>)` thì KHÔNG — với họ hồ sơ đó không tồn
   *  tại. Cờ này là chỗ duy nhất trong SDK phát hiện được sự bất đồng ấy.
   *
   *  `undefined` = CHƯA ĐO (bên gọi không cấp `stakeCredential`), KHÔNG phải "sạch". Đọc
   *  `!p.stakedVariant` thành "an toàn" là sai — phải kiểm `p.stakedVariant === false`. */
  stakedVariant?: boolean;
}

function normHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.toLowerCase();
}

/** Số lượng của (policy, name) trong value UTxO. unit = policy‖name (hex). */
function quantityOf(assets: Record<string, bigint>, policy: string, name: string): bigint {
  const unit = normHex(policy) + normHex(name);
  return assets[unit] ?? 0n;
}

/** Mọi token (name → qty) dưới một policy trong value UTxO. */
function tokensOfPolicy(assets: Record<string, bigint>, policy: string): Map<string, bigint> {
  const pol = normHex(policy);
  const out = new Map<string, bigint>();
  for (const [unit, amt] of Object.entries(assets)) {
    if (unit === "lovelace") continue;
    if (unit.slice(0, 56).toLowerCase() === pol) {
      out.set(unit.slice(56).toLowerCase(), amt);
    }
  }
  return out;
}

/**
 * Quét toàn bộ platform từ một lô UTxO theo policy beacon.
 * Lọc UTxO mang đúng 1 token của policy này (name = platform_id) + có inline datum → giải mã
 * PlatformEntry. Bỏ qua UTxO không mang token / không datum / datum sai lược đồ (theo `strict`:
 * false = bỏ qua im lặng; true = ném lỗi khi giải mã hỏng).
 *
 * KIỂM toàn vẹn: entry.platform_id PHẢI khớp NFT name (như R-NAME on-chain). Lệch → loại.
 *
 * Van #2 (duplicate): sau khi gom, đánh dấu MỌI hồ sơ trùng platform_id `duplicate=true`.
 * Van #3 (script lạ): cấp `opts.registryScriptHash` → hồ sơ mà utxo.scriptHash khác registry
 * thật bị đánh `foreignScript=true`.
 * Van #4 (biến thể stake): cấp THÊM `stakeCredential` mỗi UTxO → hồ sơ ở đúng registry hash mà
 * địa chỉ có phần stake bị đánh `stakedVariant=true`. Không cấp ⇒ khoá VẮNG MẶT (chưa đo).
 * Ngoài ra luôn đánh `policyMismatch` khi datum tự khai beacon_policy khác policy đang quét.
 */
export function discoverPlatforms(
  utxos: QueryUtxo[], beaconPolicy: string,
  opts: { strict?: boolean; registryScriptHash?: string } = {},
): DiscoveredPlatform[] {
  const strict = opts.strict ?? false;
  const regHash = opts.registryScriptHash !== undefined ? normHex(opts.registryScriptHash) : undefined;
  const pol = normHex(beaconPolicy);
  const out: DiscoveredPlatform[] = [];

  for (const u of utxos) {
    const tokens = tokensOfPolicy(u.assets, pol);
    if (tokens.size === 0) continue;                  // không mang beacon NFT → không phải hồ sơ.

    // Mỗi ô hồ sơ mang đúng 1 beacon NFT (R-MINT-1/R-OUT-1). Nếu >1 → cấu trúc lạ, bỏ/ném.
    if (tokens.size !== 1) {
      if (strict) throw new Error(`QUERY-001: UTxO mang ${tokens.size} token beacon (kỳ vọng 1)`);
      continue;
    }
    const [nftName, qty] = [...tokens.entries()][0]!;
    if (qty !== 1n) {
      if (strict) throw new Error(`QUERY-002: beacon NFT '${nftName}' qty ${qty} (kỳ vọng 1)`);
      continue;
    }
    if (!u.datum) {
      if (strict) throw new Error(`QUERY-003: ô hồ sơ '${nftName}' thiếu inline datum`);
      continue;
    }

    let entry: PlatformEntry;
    try {
      entry = decodePlatformEntry(Data.from(u.datum));
    } catch (e) {
      if (strict) throw e;
      continue;
    }

    // Gương R-NAME: entry.platform_id == NFT name. Lệch = hồ sơ giả → loại.
    if (normHex(entry.platform_id) !== nftName) {
      if (strict) {
        throw new Error(
          `QUERY-004: entry.platform_id (${entry.platform_id}) != NFT name (${nftName})`,
        );
      }
      continue;
    }

    // Gương R-POLICY: lời tự khai beacon_policy phải khớp policy thật đang quét.
    const policyMismatch = normHex(entry.beacon_policy) !== pol;
    if (policyMismatch && strict) {
      throw new Error(
        `QUERY-005: entry.beacon_policy (${normHex(entry.beacon_policy)}) != policy quét (${pol})`,
      );
    }

    const base = { entry, nftUnit: pol + nftName, utxo: u, duplicate: false, policyMismatch };
    if (regHash !== undefined) {
      const foreignScript = u.scriptHash === undefined || normHex(u.scriptHash) !== regHash;
      // Van #4: chỉ có nghĩa khi hồ sơ Ở ĐÚNG registry (van #3 xanh) — script lạ thì câu
      // "biến thể stake của registry" không phát biểu được. Và chỉ kết khi bên gọi ĐÃ CẤP
      // `stakeCredential`; không cấp = chưa đo, để `undefined` chứ không để `false`.
      //
      // `exactOptionalPropertyTypes` bật ⇒ "chưa đo" phải là KHÔNG CÓ KHOÁ, không phải khoá
      // mang `undefined`. Hợp với ngữ nghĩa: cờ vắng mặt = van này chưa chạy.
      if (foreignScript || u.stakeCredential === undefined) {
        out.push({ ...base, foreignScript });
      } else {
        const stakedVariant = u.stakeCredential !== null && u.stakeCredential !== "";
        out.push({ ...base, foreignScript, stakedVariant });
      }
    } else {
      out.push(base);
    }
  }

  // Van #2: đánh dấu MỌI hồ sơ có platform_id trùng (≥2 lần) trong lô — không tin mù.
  const counts = new Map<string, number>();
  for (const p of out) {
    const id = normHex(p.entry.platform_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const p of out) {
    if ((counts.get(normHex(p.entry.platform_id)) ?? 0) > 1) p.duplicate = true;
  }

  return out;
}

/**
 * VAN #2 — trả map platform_id (hex) → các hồ sơ TRÙNG (≥2). Rỗng = sạch.
 * Ai route phí PHẢI kiểm map này rỗng trước khi tin `findPlatform` (findPlatform trả cái ĐẦU
 * — không an toàn khi có trùng). Nguồn trùng: authority ký nhầm/bị lậm.
 */
export function findDuplicatePlatformIds(
  platforms: DiscoveredPlatform[],
): Map<string, DiscoveredPlatform[]> {
  const groups = new Map<string, DiscoveredPlatform[]>();
  for (const p of platforms) {
    const id = normHex(p.entry.platform_id);
    const g = groups.get(id) ?? [];
    g.push(p);
    groups.set(id, g);
  }
  const dups = new Map<string, DiscoveredPlatform[]>();
  for (const [id, g] of groups) {
    if (g.length > 1) dups.set(id, g);
  }
  return dups;
}

/**
 * VAN #1 — ĐỐI SOÁT hồ sơ với UTxO kho THẬT. Quét sổ chỉ đọc datum → KHÔNG đủ tin: hồ sơ có
 * thể khai custody_hash/seed_policy/instance_id BẤT KỲ. Hàm này kiểm hồ sơ trỏ đúng kho thật:
 *   1. quantity_of(custodyUtxo.value, entry.seed_policy, entry.instance_id) == 1  (NFT authenticity)
 *   2. script hash địa chỉ kho == entry.custody_hash                              (đúng địa chỉ)
 * Trả {ok, reason}. CHƯA đối soát → KHÔNG route phí tới kho đó.
 */
export function verifyEntryAgainstCustody(
  entry: PlatformEntry, custodyUtxo: QueryUtxo,
): { ok: boolean; reason?: string } {
  // Hạng KHÔNG KHO: ba trường custody rỗng HẾT ⇒ không có kho để đối soát, và cũng không có
  // chỗ nào để route phí tới. Nói thẳng lý do, đừng để người đọc tưởng "kho sai NFT".
  if (shapeNonCustodial(entry)) {
    return {
      ok: false,
      reason: "hồ sơ KHÔNG KHO (instance_id/custody_hash/seed_policy rỗng, accepted_assets rỗng, "
        + "cut_bps=0) — dịch vụ này KHÔNG thu asset qua hệ, không có kho để route phí tới",
    };
  }
  const qty = quantityOf(custodyUtxo.assets, entry.seed_policy, entry.instance_id);
  if (qty !== 1n) {
    return {
      ok: false,
      reason: `UTxO kho mang ${qty} NFT authenticity (seed_policy=${normHex(entry.seed_policy)}, `
        + `instance_id=${normHex(entry.instance_id)}) — kỳ vọng đúng 1 (R-BIND #1)`,
    };
  }
  if (custodyUtxo.scriptHash === undefined) {
    return {
      ok: false,
      reason: "custodyUtxo.scriptHash trống — không đối soát được với entry.custody_hash (R-BIND #2)",
    };
  }
  if (normHex(custodyUtxo.scriptHash) !== normHex(entry.custody_hash)) {
    return {
      ok: false,
      reason: `script hash địa chỉ kho (${normHex(custodyUtxo.scriptHash)}) != `
        + `entry.custody_hash (${normHex(entry.custody_hash)}) — hồ sơ trỏ kho SAI (R-BIND #2)`,
    };
  }
  return { ok: true };
}

/**
 * Gộp bốn van thành một lượt kiểm cho MỘT platform trước khi route phí.
 * Trả {ok:false, reasons:[...]} nếu bất kỳ van nào chưa qua. Đây là tiện ích — nó KHÔNG thay
 * bên tích hợp quyết định; nó chỉ khiến việc bỏ qua van thành cố ý chứ không phải vì quên.
 */
export function safeToRouteFees(
  p: DiscoveredPlatform, custodyUtxo: QueryUtxo,
  opts: { requireActive?: boolean } = {},
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (p.duplicate) reasons.push("platform_id TRÙNG trong lô quét (van #2) — phải chọn bằng đối soát kho hoặc từ chối");
  if (p.foreignScript === true) reasons.push("beacon NFT nằm ngoài registry validator thật (van #3)");
  if (p.stakedVariant === true) {
    reasons.push(
      "hồ sơ ở BIẾN THỂ STAKE của registry (van #4) — đúng payment credential, khác địa chỉ; " +
      "bên đọc bằng utxosAt(<địa chỉ enterprise>) KHÔNG thấy hồ sơ này",
    );
  }
  if (p.policyMismatch) reasons.push("datum tự khai beacon_policy khác policy đang quét");
  if ((opts.requireActive ?? true) && p.entry.status !== "Active") {
    reasons.push(`status = ${p.entry.status} (không phải Active)`);
  }
  const bind = verifyEntryAgainstCustody(p.entry, custodyUtxo);
  if (!bind.ok) reasons.push(`đối soát kho thất bại (van #1): ${bind.reason}`);
  return { ok: reasons.length === 0, reasons };
}

/** Lọc platform theo status (vd chỉ Active để route phí). */
export function filterByStatus(
  platforms: DiscoveredPlatform[], status: PlatformStatus,
): DiscoveredPlatform[] {
  return platforms.filter((p) => p.entry.status === status);
}

/** Tìm 1 platform theo platform_id (hex). undefined nếu không có. */
export function findPlatform(
  platforms: DiscoveredPlatform[], platformId: string,
): DiscoveredPlatform | undefined {
  const id = normHex(platformId);
  return platforms.find((p) => normHex(p.entry.platform_id) === id);
}

/** Tiện ích: beacon NFT của 1 platform có mặt trong UTxO không. */
export function platformNftPresent(
  u: QueryUtxo, beaconPolicy: string, platformId: string,
): boolean {
  return quantityOf(u.assets, beaconPolicy, platformId) === 1n;
}
