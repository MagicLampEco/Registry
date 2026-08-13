// Registry/scripts/config.ts — cấu hình apply-params cho hai validator của sổ đăng ký.
//
// PHÁ VÒNG (đảo chiều so với bản cũ — đặc tả v2 §2):
//   registry(registry_authority)                       → registry_hash CHỈ phụ thuộc authority
//   registry_beacon(registry_authority, registry_hash) → beacon_policy
// ⇒ apply `registry` TRƯỚC, lấy hash, rồi mới apply `registry_beacon`. Nhờ vậy cổng đúc ép
//   được ĐỊA CHỈ ĐÍCH của ô hồ sơ (R-OUT-1), thứ mà bản cũ không làm được.
//
// CLASS-IDENTITY: cả hai tham số đều PHẲNG (hex) — không có Constr → apply an toàn bằng
// applyParamsToScript của lucid trong scripts/node_modules.
//
// KHÔNG nhập gì từ repo LAMP. Kho (Treasury custody) là việc của từng đội dịch vụ: họ cấp
// custody_hash + seed_policy + UTxO kho cho bước đăng ký. Xem README.md trong thư mục này.

import dotenv from "dotenv";
import {
  Lucid, Blockfrost,
  getAddressDetails,
  applyParamsToScript, credentialToAddress,
  scriptHashToCredential, validatorToScriptHash, mintingPolicyToId,
  type LucidEvolution, type Validator,
} from "@lucid-evolution/lucid";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env từ gốc repo Registry (../.env so với Registry/scripts/).
dotenv.config({ path: resolve(__dirname, "../.env") });

// ── Network + provider ─────────────────────────────────────────
export type Network = "Preview" | "Preprod" | "Mainnet";

export const NETWORK: Network = (process.env.NETWORK ?? "Preview") as Network;
export const BLOCKFROST_URL = `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0`;
export const BLOCKFROST_KEY = process.env.BLOCKFROST_KEY ?? "";
export const PRIVATE_KEY    = process.env.PRIVATE_KEY ?? "";
export const WALLET_SEED    = (process.env.WALLET_SEED ?? "").trim().replace(/\s+/g, " ");

// ms_per_epoch: validity_range của PlutusV3 mang POSIX mili-giây, nên quy ước epoch của
// validator tính theo ms. Mọi mạng Cardano hiện dùng slot_length = 1000ms ⇒ ms_per_epoch =
// slots_per_epoch × 1000. Chép nguyên số từ /Users/ductiger/Projects/LAMP/Utils/src/index.ts
// dòng 27-36 (đọc 2026-08-13) — HAI SỔ PHẢI CÙNG QUY ƯỚC, lệch là hỏng đối soát.
export const MS_PER_EPOCH_BY_NETWORK: Record<Network, bigint> = {
  Preview: 86_400_000n,
  Preprod: 86_400_000n,
  Mainnet: 432_000_000n,
};

export function msPerEpoch(network: Network): bigint {
  return MS_PER_EPOCH_BY_NETWORK[network];
}

export const MS_PER_EPOCH = msPerEpoch(NETWORK);

/** POSIX ms → số epoch (gương helper epoch của validator). */
export function posixMsToEpoch(posixMs: bigint, network: Network = NETWORK): bigint {
  return posixMs / msPerEpoch(network);
}

export function hasCredentials(): boolean {
  return Boolean(BLOCKFROST_KEY && (PRIVATE_KEY || WALLET_SEED));
}

/** Khởi tạo Lucid nếu đủ credential; thiếu → null (chế độ KHÔ — apply-params không cần mạng). */
export async function makeLucidOrNull(): Promise<LucidEvolution | null> {
  if (!hasCredentials()) return null;
  const lucid = await Lucid(new Blockfrost(BLOCKFROST_URL, BLOCKFROST_KEY), NETWORK);
  if (PRIVATE_KEY)      lucid.selectWallet.fromPrivateKey(PRIVATE_KEY);
  else if (WALLET_SEED) lucid.selectWallet.fromSeed(WALLET_SEED);
  return lucid;
}

export async function walletPkh(lucid: LucidEvolution): Promise<string> {
  const addr = await lucid.wallet().address();
  const { paymentCredential } = getAddressDetails(addr);
  if (!paymentCredential) throw new Error("không lấy được payment credential từ ví");
  return paymentCredential.hash;
}

// ── Blueprint của CHÍNH repo này ───────────────────────────────

const REGISTRY_PLUTUS_JSON = resolve(__dirname, "../onchain/plutus.json");

interface RawValidator { title: string; compiledCode: string; hash: string; }

async function loadBlueprint(): Promise<RawValidator[]> {
  const json = JSON.parse(await readFile(REGISTRY_PLUTUS_JSON, "utf8"));
  return json.validators as RawValidator[];
}

export async function rawValidator(title: string): Promise<RawValidator> {
  const vs = await loadBlueprint();
  const v = vs.find((x) => x.title === title);
  if (!v) {
    throw new Error(
      `validator '${title}' không có trong ${REGISTRY_PLUTUS_JSON} — chạy 'aiken build' trong `
      + `Registry/onchain/ trước.`,
    );
  }
  return v;
}

export function applyValidator(compiledCode: string, params: unknown[]): Validator {
  return {
    type: "PlutusV3",
    script: applyParamsToScript(compiledCode, params as never),
  };
}

export function scriptAddress(script: Validator): string {
  return credentialToAddress(NETWORK, scriptHashToCredential(validatorToScriptHash(script)));
}

export function scriptHash(script: Validator): string {
  return validatorToScriptHash(script);
}

// ── Apply hai validator (registry TRƯỚC, beacon SAU) ───────────

export interface AppliedRegistry {
  registryScript: Validator;   // spend validator (apply registry_authority)
  registryHash:   string;
  registryAddr:   string;
  registryBeacon: Validator;   // minting policy (apply registry_authority, registry_hash)
  beaconPolicy:   string;
}

/**
 * @param registryAuthority payment key-hash (28-byte hex) ký mỗi đăng ký/cập nhật.
 */
export async function applyRegistry(registryAuthority: string): Promise<AppliedRegistry> {
  const auth = registryAuthority.toLowerCase();
  if (!/^[0-9a-f]{56}$/.test(auth)) {
    throw new Error(`registry_authority không hợp lệ (cần 28-byte hex): ${auth}`);
  }

  // 1. registry(authority) → registry_hash (CHỈ phụ thuộc authority).
  const rawRegistry = await rawValidator("registry.registry.spend");
  const registryScript = applyValidator(rawRegistry.compiledCode, [auth]);
  const registryHash = scriptHash(registryScript);
  const registryAddr = scriptAddress(registryScript);

  // 2. registry_beacon(authority, registry_hash) → beacon_policy.
  const rawBeacon = await rawValidator("registry_beacon.registry_beacon.mint");
  const registryBeacon = applyValidator(rawBeacon.compiledCode, [auth, registryHash]);
  const beaconPolicy = mintingPolicyToId(registryBeacon);

  return { registryScript, registryHash, registryAddr, registryBeacon, beaconPolicy };
}

// ── env helpers ────────────────────────────────────────────────

export function asciiToHex(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0xff) throw new Error(`asciiToHex: ký tự ngoài ASCII '${s[i]}'`);
    out += code.toString(16).padStart(2, "0");
  }
  return out;
}

export function padHash28(seedHex: string): string {
  const h = seedHex.toLowerCase().replace(/[^0-9a-f]/g, "");
  return (h + "0".repeat(56)).slice(0, 56);
}

function resolveHex28(
  envName: string, fallbackSeed: string,
): { value: string; source: "env" | "placeholder" } {
  const env = (process.env[envName] ?? "").trim().toLowerCase();
  if (env) {
    if (!/^[0-9a-f]{56}$/.test(env)) {
      throw new Error(`${envName} không hợp lệ (cần 28-byte hex): ${env}`);
    }
    return { value: env, source: "env" };
  }
  return { value: padHash28(asciiToHex(fallbackSeed)), source: "placeholder" };
}

/** registry_authority. Trống → giá trị mẫu (KHÔNG ký được — chỉ apply-params/in hash). */
export function resolveRegistryAuthority(): { authority: string; source: "env" | "placeholder" } {
  const r = resolveHex28("REGISTRY_AUTHORITY", "registry-authority");
  return { authority: r.value, source: r.source };
}

/** custody_hash của kho dịch vụ — do CHÍNH đội dịch vụ cấp (Registry không dựng kho). */
export function resolveCustodyHash(): { value: string; source: "env" | "placeholder" } {
  return resolveHex28("CUSTODY_HASH", "custody-hash");
}

/** seed_policy của kho dịch vụ — do CHÍNH đội dịch vụ cấp. */
export function resolveSeedPolicy(): { value: string; source: "env" | "placeholder" } {
  return resolveHex28("SEED_POLICY", "seed-policy");
}

// ── VAN chặn chạy THẬT khi tham số còn là giá trị mẫu ──────────
// Đủ credential NHƯNG tham số then chốt còn mẫu/rỗng → CHẶN, rơi về chế độ KHÔ + cảnh báo.
// Chống đăng ký nhầm hồ sơ trỏ vào kho/cổng quản trị KHÔNG tồn tại.

export interface LiveParam { name: string; value: string; placeholder: boolean }
export interface LiveGuardResult { allowLive: boolean; offending: LiveParam[]; reason: string }

export function evaluateLiveGuards(params: LiveParam[]): LiveGuardResult {
  const offending = params.filter((p) => p.placeholder || p.value.trim() === "");
  if (!hasCredentials()) {
    return {
      allowLive: false, offending,
      reason: "thiếu credential (BLOCKFROST_KEY + PRIVATE_KEY/WALLET_SEED)",
    };
  }
  if (offending.length > 0) {
    return {
      allowLive: false, offending,
      reason: `tham số còn giá trị mẫu/rỗng: ${offending.map((p) => p.name).join(", ")}`,
    };
  }
  return { allowLive: true, offending: [], reason: "đủ credential + mọi tham số thật" };
}

export function warnLiveBlocked(res: LiveGuardResult): void {
  if (res.allowLive || res.offending.length === 0) return;
  console.warn("\nVAN: chạy THẬT bị CHẶN — rơi về chế độ KHÔ.");
  console.warn(`   Lý do: ${res.reason}`);
  for (const p of res.offending) {
    console.warn(`   - ${p.name} = ${p.value || "(rỗng)"}  <- ${p.placeholder ? "giá trị mẫu" : "RỖNG"}`);
  }
  console.warn("   Đặt giá trị THẬT vào .env rồi chạy lại.\n");
}

// ── Cảnh báo hai dịch vụ chung governance_ref ──────────────────
// Mỗi hồ sơ NÊN có cổng quản trị riêng (PK6). Chung một governance_ref nghĩa là một quyết
// định của cổng đó áp cho cả hai — cô lập hỏng.

export const REGISTERED_LIST_PATH = resolve(__dirname, "registered-instances.json");

export interface RegisteredInstanceRef {
  platform:      string;
  instanceId:    string;
  governanceRef: string;
}

export async function loadRegisteredList(): Promise<RegisteredInstanceRef[]> {
  try {
    const raw = JSON.parse(await readFile(REGISTERED_LIST_PATH, "utf8"));
    return Array.isArray(raw) ? (raw as RegisteredInstanceRef[]) : [];
  } catch {
    return [];
  }
}

export function checkGovernanceRefCollision(
  existing: RegisteredInstanceRef[], newInstanceId: string, newGovernanceRef: string,
): RegisteredInstanceRef[] {
  const g = newGovernanceRef.toLowerCase();
  return existing.filter(
    (e) => e.governanceRef.toLowerCase() === g
      && e.instanceId.toLowerCase() !== newInstanceId.toLowerCase(),
  );
}

export function warnGovernanceRefCollision(
  collisions: RegisteredInstanceRef[], gov: string,
): void {
  if (collisions.length === 0) return;
  console.warn("\nVAN: governance_ref TRÙNG một hồ sơ khác đã đăng ký.");
  console.warn(`   governance_ref = ${gov}`);
  for (const c of collisions) {
    console.warn(`   - đã dùng bởi '${c.platform}' (instance ${c.instanceId})`);
  }
  console.warn("   Mỗi hồ sơ NÊN có governance_ref riêng.\n");
}

export async function appendRegisteredList(
  entry: RegisteredInstanceRef,
): Promise<RegisteredInstanceRef[]> {
  const list = await loadRegisteredList();
  const next = list.filter((e) => e.instanceId.toLowerCase() !== entry.instanceId.toLowerCase());
  next.push(entry);
  await writeFile(REGISTERED_LIST_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

// ── File trạng thái đầu ra ─────────────────────────────────────

export const REGISTRY_PATH   = resolve(__dirname, "registry.json");
export const REGISTERED_PATH = resolve(__dirname, "registered.json");

export interface RegistryState {
  network:           Network;
  registryAuthority: string;
  authoritySource:   string;
  registryHash:      string;
  registryAddress:   string;
  beaconPolicy:      string;
}

export async function saveRegistry(state: RegistryState): Promise<void> {
  await writeFile(REGISTRY_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function loadRegistry(): Promise<RegistryState> {
  try {
    return JSON.parse(await readFile(REGISTRY_PATH, "utf8")) as RegistryState;
  } catch {
    throw new Error(`chưa có registry.json (${REGISTRY_PATH}) — chạy 'npm run deploy-registry' trước.`);
  }
}

export async function saveRegistered(state: unknown): Promise<void> {
  await writeFile(REGISTERED_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function explorerTx(hash: string): string {
  return `https://${NETWORK.toLowerCase()}.cardanoscan.io/transaction/${hash}`;
}
