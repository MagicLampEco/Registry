// Registry off-chain types — gương onchain/lib/magiclamp/registry/platform.ak (lược đồ v2).
//
// PHẢI khớp byte-perfect với platform.ak. Constr index = thứ tự khai báo trong platform.ak
// (Aiken đánh số constructor từ 0 theo thứ tự xuất hiện).
//
// PlatformEntry (v2) = Constr(0, [
//     spec_version:int, platform_id:bytes, instance_id:bytes, custody_hash:bytes,
//     seed_policy:bytes, beacon_policy:bytes, governance_ref:bytes,
//     accepted_assets:List<AssetKey>, cut_bps:int, created_epoch:int, status:PlatformStatus ])
// PlatformStatus : Active=Constr(0,[]), Paused=Constr(1,[]), Retired=Constr(2,[])
// AssetKey       = Constr(0, [policy:bytes, name:bytes])
// RegistryBeaconRedeemer : RegisterPlatform = Constr(0,[])
// RegistryRedeemer       : UpdateEntry = Constr(0,[])
//                          MigrateEntry{new_registry_hash, new_spec_version} = Constr(1,[bytes,int])
//
// ĐẢO CHIỀU PHỤ THUỘC (hướng B): Registry KHÔNG nhập kiểu nào từ repo LAMP. AssetKey khai
// tại chỗ — cùng HÌNH DẠNG cấu trúc với Treasury AssetKey nên gán qua lại vẫn hợp lệ
// (TypeScript so cấu trúc, không so tên). Kiểu mượn khác nằm ở ./treasuryShapes.ts.

/** Cặp (policy, name) định danh một asset. ADA = {policy:"", name:""}. Hex trần lowercase. */
export interface AssetKey {
  policy : string;   // hex
  name   : string;   // hex
}

/** Phiên bản lược đồ hồ sơ hiện hành. Gương `SPEC_VERSION_V2` trong platform.ak. */
export const SPEC_VERSION_V2 = 2n;

/** Vòng đời một platform trong sổ — Constr theo thứ tự khai báo platform.ak. */
export type PlatformStatus = "Active" | "Paused" | "Retired";

/** Một hồ sơ trong sổ — trỏ platform_id → kho (Treasury custody instance) của platform.
 *  Mọi bytes là HEX trần (lowercase) để khớp Plutus bytes. */
export interface PlatformEntry {
  spec_version    : bigint;        // v2 = 2 — trường ĐẦU TIÊN, bất biến ở UpdateEntry
  platform_id     : string;        // hex — định danh platform (= beacon NFT name)
  instance_id     : string;        // hex — custody instance_id (= seed NFT name)
  custody_hash    : string;        // hex — script hash kho của platform
  seed_policy     : string;        // hex — policy NFT authenticity của kho
  beacon_policy   : string;        // hex — policy beacon NFT; tự khai, bị ép khớp lúc mint (R-POLICY)
  governance_ref  : string;        // hex — script hash cổng quản trị của platform
  accepted_assets : AssetKey[];    // assets platform thu (LAMP/ADA/token)
  cut_bps         : bigint;        // protocol_cut_bps ∈ [0,10000]
  created_epoch   : bigint;        // epoch đăng ký (bị ép nằm trong cửa sổ hiệu lực — R-EPOCH)
  status          : PlatformStatus;
}

/** Redeemer spend của validator `registry` (v2 — hai nhánh). */
export type RegistryRedeemer =
  | { kind: "UpdateEntry" }
  | { kind: "MigrateEntry"; new_registry_hash: string; new_spec_version: bigint };

/** Một khoang kế toán trong kho của platform (id + nhãn người đọc).
 *  bucket_id là Int dùng trong ledger của kho + category của CollectItem. */
export interface BucketSpec {
  id    : bigint;   // bucket_id (khớp ledger.category on-chain)
  label : string;   // nhãn người đọc (KHÔNG lên chain — chỉ tài liệu/SDK)
}

/** Tham chiếu UTxO genesis seed (one-shot). Gương OutputReference. */
export interface GenesisRef {
  transaction_id : string;   // hex tx hash
  output_index   : bigint;
}

/**
 * Toàn bộ tham số một platform — đầu vào của onboard/đăng ký.
 * platformId / instanceId là HEX trần (dùng asciiToHex để encode tên sang hex).
 * registryAuthority là payment key-hash (28-byte hex) ký mỗi đăng ký/cập nhật.
 */
export interface PlatformConfig {
  /** Định danh platform — = beacon NFT name (hex). Duy nhất (authority kiểm duyệt). */
  platformId: string;
  /** custody instance_id (hex) = seed NFT name. */
  instanceId: string;

  /** Assets platform chấp nhận thu (ADA = {policy:"",name:""}). */
  acceptedAssets: AssetKey[];
  /** Các khoang kế toán của kho (ops/community/... — id + nhãn). */
  buckets: BucketSpec[];

  /** protocol_cut_bps ∈ [0,10000] (vd 700 = 7%). */
  cutBps: bigint;
  /** script hash cổng quản trị của chính platform này (hex). */
  governanceRef: string;

  /** seed_policy nếu đã biết trước (hex). Trống → lấy từ tham số truyền vào lúc đăng ký. */
  seedPolicy?: string;

  /** POSIX ms ↔ epoch (gương ms_per_epoch on-chain). */
  msPerEpoch: bigint;
  /** lovelace giữ cho min-UTxO seed (≥ 0, KHÔNG ghi sổ). */
  reservedMinAda: bigint;

  /** registry_authority payment key-hash (28-byte hex) — ký RegisterPlatform/UpdateEntry. */
  registryAuthority: string;

  /** UTxO genesis tiêu khi seed kho (one-shot). */
  genesisRef: GenesisRef;
}
