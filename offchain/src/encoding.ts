// Registry encoding — helper mã hoá/asset dùng CHUNG cho mọi platform.
//
// Đây là lõi trung lập (không phụ thuộc platform cụ thể nào). Mọi hồ sơ platform
// (xem examples/) tái dùng các helper ở đây để encode platform_id/instance_id/asset name
// sang hex Plutus và dựng AssetKey LAMP/MAGIC từ policy thật.
//
// asciiToHex: encode chuỗi ASCII → hex trần (Plutus bytes). Dùng cho platform_id,
// instance_id, asset name. Production: governance_ref là script hash THẬT (28-byte hex)
// — KHÔNG dùng asciiToHex cho hash thật.

import type { AssetKey } from "./types.js";

/** Encode chuỗi ASCII → hex trần lowercase (mỗi ký tự 1 byte). */
export function asciiToHex(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0xff) throw new Error(`asciiToHex: ký tự ngoài ASCII '${s[i]}' (code ${code})`);
    out += code.toString(16).padStart(2, "0");
  }
  return out;
}

/** Đệm một chuỗi hex thành 28-byte (56 hex char) — script hash mẫu.
 *  CHỈ dùng làm chỗ điền lúc phát triển; production thay bằng hash thật. */
export function padHash28(seedHex: string): string {
  const h = seedHex.toLowerCase().replace(/[^0-9a-f]/g, "");
  return (h + "0".repeat(56)).slice(0, 56);
}

// ── Hằng đơn vị nhỏ nhất ─────────────────────────────────────────────────────
// Mọi amount tính bằng đơn vị nhỏ nhất, BigInt (KHÔNG Number — chống tràn/làm tròn).

/** 1 ADA = 10^6 lovelace. */
export const LOVELACE = 1_000_000n;
/** 1 MAGIC = 10^9 nanogic. */
export const NANOGIC = 1_000_000_000n;

// ── Asset key chuẩn hệ sinh thái ─────────────────────────────────────────────
// ADA = (policy "", name ""). LAMP/MAGIC policy THẬT điền sau khi phát hành.

/** ADA (lovelace) — policy & name rỗng. */
export const ADA: AssetKey = { policy: "", name: "" };

/** Asset name LAMP/MAGIC (hex của ASCII). Policy điền lúc chạy. */
export const LAMP_NAME = asciiToHex("LAMP");    // "4c414d50"
export const MAGIC_NAME = asciiToHex("MAGIC");  // "4d41474943"

/** Dựng AssetKey LAMP từ policy thật. */
export function lampAsset(policy: string): AssetKey {
  return { policy: policy.toLowerCase(), name: LAMP_NAME };
}

/** Dựng AssetKey MAGIC từ policy thật. */
export function magicAsset(policy: string): AssetKey {
  return { policy: policy.toLowerCase(), name: MAGIC_NAME };
}

/** Chuẩn hoá hex: bỏ tiền tố `0x`, hạ chữ thường (Plutus bytes là hex trần). */
export function normHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.toLowerCase();
}
