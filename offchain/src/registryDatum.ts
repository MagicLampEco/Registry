// Registry datum/redeemer codec — Plutus Data (Lucid Evolution). LƯỢC ĐỒ v2.
//
// PHẢI khớp byte-perfect với onchain/lib/magiclamp/registry/platform.ak. Constr index =
// thứ tự khai báo (Aiken đánh số constructor từ 0 theo thứ tự xuất hiện). Thứ tự TRƯỜNG là
// hợp đồng — Plutus Data theo vị trí, lệch một chỗ là giải mã ra giá trị của trường khác.
//
//   PlatformStatus: Active=Constr(0,[]), Paused=Constr(1,[]), Retired=Constr(2,[])
//   PlatformEntry (v2, 12 trường) = Constr(0, [
//       spec_version:int, platform_id:bytes, instance_id:bytes, custody_hash:bytes,
//       seed_policy:bytes, beacon_policy:bytes, governance_ref:bytes,
//       accepted_assets:List<AssetKey>, cut_bps:int, created_epoch:int, status ])
//   RegisterPlatform = Constr(0, [])                                  (RegistryBeaconRedeemer)
//   UpdateEntry      = Constr(0, [])                                  (RegistryRedeemer)
//   MigrateEntry     = Constr(1, [new_registry_hash:bytes, new_spec_version:int])
//
// ĐỔI SO VỚI v1: thêm `spec_version` làm trường ĐẦU, thêm `beacon_policy` ngay SAU
// `seed_policy`, và redeemer spend có thêm nhánh MigrateEntry. Datum v1 (9 trường) giải mã
// bằng bộ này sẽ NÉM lỗi RDATUM-021 — cố ý: chưa có hồ sơ v1 nào trên chuỗi, và đọc nhầm
// lược đồ còn tệ hơn đọc hỏng.
//
// Dùng duck-type Constr (asConstr) để bền với hai bản @lucid-evolution/lucid khác class.

import { Constr, Data } from "@lucid-evolution/lucid";
import type {
  AssetKey, PlatformEntry, PlatformStatus, RegistryRedeemer,
} from "./types.js";
import { SPEC_VERSION_V2 } from "./types.js";
// SPEC_VERSION_V2 phát ra từ ./types.js (một nguồn duy nhất) — không xuất lại ở đây để
// tránh hai đường xuất cùng tên qua index.ts.

// ── AssetKey codec ─────────────────────────────────────────────────────────
// Constr(0, [policy:bytes, name:bytes]) — khớp AssetKey on-chain. Dựng Constr bằng CHÍNH
// bản lucid của gói này (Constr "lạ class" làm Data.to ném "Unsupported type").

function encodeAssetKey(a: AssetKey): Constr<Data> {
  return new Constr(0, [normHex(a.policy), normHex(a.name)]);
}

function decodeAssetKey(d: Data): AssetKey {
  const c = asConstr(d, "AssetKey");
  if (c.index !== 0) throw new Error(`RDATUM-005: AssetKey expects Constr 0, got ${c.index}`);
  if (c.fields.length !== 2) throw new Error(`RDATUM-006: AssetKey expects 2 fields, got ${c.fields.length}`);
  return {
    policy: asBytes(c.fields[0]!, "AssetKey.policy"),
    name:   asBytes(c.fields[1]!, "AssetKey.name"),
  };
}

// ── Redeemer constructor index map (gương platform.ak) ─────────────────────
export const REGISTRY_BEACON_REDEEMER = {
  RegisterPlatform: 0,
} as const;

export const REGISTRY_REDEEMER = {
  UpdateEntry:  0,
  MigrateEntry: 1,
} as const;

// ── PlatformStatus index map (theo thứ tự khai báo platform.ak) ────────────
export const PLATFORM_STATUS = {
  Active:  0,
  Paused:  1,
  Retired: 2,
} as const;

const STATUS_BY_INDEX: PlatformStatus[] = ["Active", "Paused", "Retired"];

/**
 * Số trường của PlatformEntry v2. Đổi số này = đổi hợp đồng với validator.
 *
 * ⚠ Soft-cast của Aiken kiểm KHỚP ĐÚNG ARITY, không kiểm "đủ trường cần dùng". Nên lệch
 * một trường giữa đây và `platform.ak` KHÔNG hiện ra dưới dạng lỗi kiểu hay lỗi giải mã —
 * nó hiện ra dưới dạng validator từ chối MỌI tx dựng từ off-chain, ở tất cả các đường,
 * cùng lúc. 11 → 12 ngày 2026-09-02 khi `substrate_flags` được nối vào đuôi.
 */
export const PLATFORM_ENTRY_FIELDS = 12;

// ── helpers (duck-type Constr) ─────────────────────────────────────────────

/** Bỏ tiền tố `0x` + hạ chữ thường (Plutus bytes là hex trần). */
function normHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.toLowerCase();
}

function asConstr(d: Data, ctx: string): Constr<Data> {
  if (d instanceof Constr) return d;
  // Bền với hai bản @lucid-evolution/lucid (khác class identity) — duck-type.
  if (
    d !== null && typeof d === "object" &&
    typeof (d as { index?: unknown }).index === "number" &&
    Array.isArray((d as { fields?: unknown }).fields)
  ) {
    return d as unknown as Constr<Data>;
  }
  throw new Error(`RDATUM-000: expected Constr for ${ctx}`);
}

function asBytes(d: Data, ctx: string): string {
  if (typeof d !== "string") throw new Error(`RDATUM-001: expected bytes for ${ctx}`);
  return d;
}

function asInt(d: Data, ctx: string): bigint {
  if (typeof d !== "bigint") throw new Error(`RDATUM-002: expected int for ${ctx}`);
  return d;
}

function asList(d: Data, ctx: string): Data[] {
  if (!Array.isArray(d)) throw new Error(`RDATUM-003: expected list for ${ctx}`);
  return d;
}

// ── PlatformStatus ─────────────────────────────────────────────────────────

export function encodePlatformStatus(s: PlatformStatus): Constr<Data> {
  return new Constr(PLATFORM_STATUS[s], []);
}

export function decodePlatformStatus(d: Data): PlatformStatus {
  const c = asConstr(d, "PlatformStatus");
  if (c.fields.length !== 0) {
    throw new Error(`RDATUM-010: PlatformStatus expects 0 fields, got ${c.fields.length}`);
  }
  const s = STATUS_BY_INDEX[c.index];
  if (s === undefined) throw new Error(`RDATUM-011: PlatformStatus unknown Constr ${c.index}`);
  return s;
}

// ── PlatformEntry (v2 — 12 trường, thứ tự là hợp đồng) ─────────────────────

export function encodePlatformEntry(e: PlatformEntry): Constr<Data> {
  return new Constr(0, [
    e.spec_version,
    normHex(e.platform_id),
    normHex(e.instance_id),
    normHex(e.custody_hash),
    normHex(e.seed_policy),
    normHex(e.beacon_policy),
    normHex(e.governance_ref),
    e.accepted_assets.map(encodeAssetKey),
    e.cut_bps,
    e.created_epoch,
    encodePlatformStatus(e.status),
    // Nối vào ĐUÔI, khớp `platform.ak` — Plutus Data đọc theo vị trí, chèn giữa phá mọi
    // datum đã ghi.
    e.substrate_flags,
  ]);
}

export function decodePlatformEntry(d: Data): PlatformEntry {
  const c = asConstr(d, "PlatformEntry");
  if (c.index !== 0) throw new Error(`RDATUM-020: PlatformEntry expects Constr 0, got ${c.index}`);
  if (c.fields.length !== PLATFORM_ENTRY_FIELDS) {
    throw new Error(
      `RDATUM-021: PlatformEntry expects ${PLATFORM_ENTRY_FIELDS} fields (lược đồ v2), `
      + `got ${c.fields.length}`,
    );
  }
  const accepted: AssetKey[] = asList(c.fields[7]!, "PlatformEntry.accepted_assets").map(decodeAssetKey);
  return {
    spec_version:    asInt(c.fields[0]!, "PlatformEntry.spec_version"),
    platform_id:     asBytes(c.fields[1]!, "PlatformEntry.platform_id"),
    instance_id:     asBytes(c.fields[2]!, "PlatformEntry.instance_id"),
    custody_hash:    asBytes(c.fields[3]!, "PlatformEntry.custody_hash"),
    seed_policy:     asBytes(c.fields[4]!, "PlatformEntry.seed_policy"),
    beacon_policy:   asBytes(c.fields[5]!, "PlatformEntry.beacon_policy"),
    governance_ref:  asBytes(c.fields[6]!, "PlatformEntry.governance_ref"),
    accepted_assets: accepted,
    cut_bps:         asInt(c.fields[8]!, "PlatformEntry.cut_bps"),
    created_epoch:   asInt(c.fields[9]!, "PlatformEntry.created_epoch"),
    status:          decodePlatformStatus(c.fields[10]!),
    substrate_flags: asInt(c.fields[11]!, "PlatformEntry.substrate_flags"),
  };
}

export function platformEntryToCbor(e: PlatformEntry): string {
  return Data.to(encodePlatformEntry(e));
}

export function platformEntryFromCbor(cbor: string): PlatformEntry {
  return decodePlatformEntry(Data.from(cbor));
}

// ── Redeemers ──────────────────────────────────────────────────────────────

export function encodeRegisterPlatformRedeemer(): Constr<Data> {
  return new Constr(REGISTRY_BEACON_REDEEMER.RegisterPlatform, []);
}

export function registerPlatformRedeemerToCbor(): string {
  return Data.to(encodeRegisterPlatformRedeemer());
}

export function encodeUpdateEntryRedeemer(): Constr<Data> {
  return new Constr(REGISTRY_REDEEMER.UpdateEntry, []);
}

export function updateEntryRedeemerToCbor(): string {
  return Data.to(encodeUpdateEntryRedeemer());
}

/** MigrateEntry = Constr(1, [new_registry_hash:bytes, new_spec_version:int]). */
export function encodeMigrateEntryRedeemer(
  newRegistryHash: string, newSpecVersion: bigint,
): Constr<Data> {
  if (newSpecVersion <= 0n) {
    throw new Error(`RDATUM-030: new_spec_version phải > 0, nhận ${newSpecVersion}`);
  }
  return new Constr(REGISTRY_REDEEMER.MigrateEntry, [normHex(newRegistryHash), newSpecVersion]);
}

export function migrateEntryRedeemerToCbor(
  newRegistryHash: string, newSpecVersion: bigint,
): string {
  return Data.to(encodeMigrateEntryRedeemer(newRegistryHash, newSpecVersion));
}

/** Mã hoá RegistryRedeemer (cả hai nhánh) — tiện cho bên gọi giữ một kiểu duy nhất. */
export function encodeRegistryRedeemer(r: RegistryRedeemer): Constr<Data> {
  return r.kind === "UpdateEntry"
    ? encodeUpdateEntryRedeemer()
    : encodeMigrateEntryRedeemer(r.new_registry_hash, r.new_spec_version);
}

export function registryRedeemerToCbor(r: RegistryRedeemer): string {
  return Data.to(encodeRegistryRedeemer(r));
}

/** Giải mã RegistryRedeemer — dùng khi đọc lại tx đã dựng (đối soát). */
export function decodeRegistryRedeemer(d: Data): RegistryRedeemer {
  const c = asConstr(d, "RegistryRedeemer");
  if (c.index === REGISTRY_REDEEMER.UpdateEntry) {
    if (c.fields.length !== 0) {
      throw new Error(`RDATUM-031: UpdateEntry expects 0 fields, got ${c.fields.length}`);
    }
    return { kind: "UpdateEntry" };
  }
  if (c.index === REGISTRY_REDEEMER.MigrateEntry) {
    if (c.fields.length !== 2) {
      throw new Error(`RDATUM-032: MigrateEntry expects 2 fields, got ${c.fields.length}`);
    }
    return {
      kind: "MigrateEntry",
      new_registry_hash: asBytes(c.fields[0]!, "MigrateEntry.new_registry_hash"),
      new_spec_version:  asInt(c.fields[1]!, "MigrateEntry.new_spec_version"),
    };
  }
  throw new Error(`RDATUM-033: RegistryRedeemer unknown Constr ${c.index}`);
}

export function registryRedeemerFromCbor(cbor: string): RegistryRedeemer {
  return decodeRegistryRedeemer(Data.from(cbor));
}
