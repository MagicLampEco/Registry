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
  applyParamsToScript, credentialToAddress, credentialToRewardAddress,
  scriptHashToCredential, validatorToScriptHash, mintingPolicyToId,
  type LucidEvolution, type Validator,
} from "@lucid-evolution/lucid";
import type { GovernanceConsentKind } from "../offchain/src/registrationBuilder.js";
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
// Ba dòng dưới xuống dòng sau dấu `=` CÓ CHỦ Ý, đừng gộp lại một dòng: cổng chặn secret của hệ
// khớp mẫu `PRIVATE_KEY|BLOCKFROST…` + `=` + 12 ký tự không-trắng, nên `KEY = process.env.KEY ?? ""`
// bị chặn NHẦM dù đây là đọc biến môi trường chứ không phải giá trị. Xuống dòng thì sau dấu `=`
// chỉ còn khoảng trắng ⇒ hết khớp.
export const BLOCKFROST_KEY =
  process.env.BLOCKFROST_KEY ?? "";
export const PRIVATE_KEY =
  process.env.PRIVATE_KEY ?? "";
export const WALLET_SEED =
  (process.env.WALLET_SEED ?? "").trim().replace(/\s+/g, " ");

// ── Ô THỜI GIAN (time bucket) ──────────────────────────────────
// SỬA QUY ƯỚC. Bản trước khai bảng `MS_PER_EPOCH_BY_NETWORK` = Preview/Preprod 86_400_000,
// Mainnet 432_000_000. Sai hai lần:
//
//  1. Trên chuỗi đây là HẰNG cho MỌI mạng, không phải bảng theo mạng.
//     Nguồn: onchain/lib/magiclamp/registry/util.ak:152 (đọc 2026-08-14)
//       `pub const ms_per_time_bucket: Int = 432_000_000`
//     Chạy Preview với 86_400_000 thì ô off-chain tính ra lệch 5 lần so với ô validator tính
//     ⇒ R-EPOCH trượt. Mà `created_epoch` BẤT BIẾN, nên khai sai một lần là sai vĩnh viễn
//     trong sổ — không sửa được bằng UpdateEntry.
//
//  2. Đơn vị KHÔNG phải epoch Cardano. Nó là Ô 5 NGÀY KỂ TỪ MỐC UNIX (`posix_ms / 432_000_000`).
//     Cái tên `epoch` của bản cũ dụ người đọc đi tra `slots_per_epoch × 1000` — con số đó không
//     liên quan gì tới quy ước này. Trường datum vẫn giữ tên `created_epoch` vì đó là HỢP ĐỒNG
//     lược đồ với on-chain (đổi tên trường = đổi lược đồ); chỉ CÁCH GỌI đổi.
//
// KHÔNG chép lại hằng + phép tính vào đây. Lấy thẳng từ SDK off-chain của CHÍNH repo này: một
// nguồn duy nhất thì không có chỗ cho lệch. Chính việc giữ bản sao riêng đẻ ra lỗi ở trên.
export { MS_PER_TIME_BUCKET } from "../offchain/src/types.js";
export {
  timeBucketOf, txValidityForTimeBucket, validityFitsOneBucket,
} from "../offchain/src/registrationBuilder.js";
export type {
  TxValidityWindow, TimeBucketWindow,
} from "../offchain/src/registrationBuilder.js";
export type { GovernanceConsentKind };

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

/**
 * Địa chỉ reward (stake) của một script — nơi `withdraw(addr, 0n)` trỏ tới.
 *
 * R-GOVLIVE nhận hai đường: tx chi tiêu một input ở Script(governance_ref), HOẶC tx rút từ
 * Script(governance_ref). Đường rút-0 không đụng `tx.mint` nên không vướng R-MINT-2 (tx đăng
 * ký chỉ được mang đúng policy beacon) — đó là đường khuyên dùng, và nó cần đúng địa chỉ này.
 * Nguồn: onchain/lib/magiclamp/registry/util.ak:204-216 (đọc 2026-08-14).
 */
export function scriptRewardAddress(scriptHashHex: string): string {
  const h = scriptHashHex.trim().toLowerCase();
  if (!/^[0-9a-f]{56}$/.test(h)) {
    throw new Error(
      `scriptRewardAddress: script hash không hợp lệ (cần 28-byte hex): ${scriptHashHex}`,
    );
  }
  return credentialToRewardAddress(NETWORK, scriptHashToCredential(h));
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

// ── R-GOVLIVE: cấu hình để cổng quản trị CHẠY THẬT trong tx đăng ký ──────────
// Validator đòi VÔ ĐIỀU KIỆN một trong hai vế: chi tiêu một input ở Script(governance_ref),
// hoặc rút (0 lovelace vẫn tính) từ Script(governance_ref). Không có vế nào ⇒ tx bị từ chối
// 100%. Nguồn: onchain/validators/registry_beacon.ak:138-165 + util.ak:204-216 (đọc 2026-08-14).

export interface GovernanceConsent {
  kind: GovernanceConsentKind;
  /** mã script cổng quản trị ĐÃ apply tham số (CBOR hex). Hash của nó == governance_ref. */
  scriptCbor: string;
  /** redeemer (CBOR hex) cho nhánh đồng thuận của cổng đó. */
  redeemerCbor: string;
  /** chỉ với kind="spend": ô ở Script(governance_ref) sẽ bị chi tiêu. */
  utxo?: { txHash: string; outputIndex: number };
}

interface GovEnv { kind: string; scriptCbor: string; redeemerCbor: string; utxo: string }

function govEnv(): GovEnv {
  return {
    kind:         (process.env.GOVERNANCE_CONSENT_KIND ?? "").trim().toLowerCase(),
    scriptCbor:   (process.env.GOVERNANCE_SCRIPT_CBOR  ?? "").trim().toLowerCase(),
    redeemerCbor: (process.env.GOVERNANCE_REDEEMER     ?? "").trim().toLowerCase(),
    utxo:         (process.env.GOVERNANCE_UTXO         ?? "").trim(),
  };
}

const HEX_BYTES = /^([0-9a-f]{2})+$/;

/** Vị từ có kiểu — loại trừ bằng `!==` KHÔNG thu hẹp `string` về union chữ, nên cần hàm này. */
function isConsentKind(s: string): s is GovernanceConsentKind {
  return s === "spend" || s === "withdrawal";
}

/**
 * Đã đủ biến môi trường để nối cổng quản trị vào tx chưa.
 *
 * KHÔNG ném và KHÔNG đối chiếu hash: van gọi hàm này TRƯỚC khi biết `governance_ref` (hồ sơ
 * dựng sau van), nên ở đây chỉ đếm biến. Việc đối chiếu hash nằm ở `resolveGovernanceConsent`.
 */
export function governanceConsentConfigured(): boolean {
  const e = govEnv();
  if (e.kind !== "spend" && e.kind !== "withdrawal") return false;
  if (!e.scriptCbor || !e.redeemerCbor) return false;
  if (e.kind === "spend" && !e.utxo) return false;
  return true;
}

/**
 * Đọc cấu hình cổng quản trị, ĐỐI CHIẾU hash, rồi mới giao ra.
 *
 * Ba lối ra, cố ý khác nhau:
 *   - chưa đặt biến nào → `null`. Chế độ KHÔ: script in hướng dẫn thay vì dựng một tx chắc
 *     chắn bị chain từ chối.
 *   - đặt DỞ hoặc sai   → NÉM, kèm mã lỗi. Người vận hành đã có ý cấu hình mà điền thiếu;
 *     im lặng rơi về KHÔ ở đây chỉ giấu lỗi đi.
 *   - đủ và khớp hash   → giá trị dùng được.
 *
 * Vì sao PHẢI so `validatorToScriptHash(script) == governance_ref`: mã script nạp nhầm vẫn
 * attach được, vẫn `.complete()` được, in ra "OK", rồi chết lúc submit với thông báo của node
 * — không ai lần ra nguyên nhân. So ở đây thì hỏng ngay tại chỗ nhập sai.
 * (`validatorToScriptHash` tự chuẩn hoá double-CBOR y như `attach.*Validator`, nên phép so
 * này đúng với cả bản mã đơn lẫn đôi.)
 */
export function resolveGovernanceConsent(governanceRef: string): GovernanceConsent | null {
  const e = govEnv();
  if (!e.kind && !e.scriptCbor && !e.redeemerCbor && !e.utxo) return null;

  const kind = e.kind;
  if (!isConsentKind(kind)) {
    throw new Error(
      `REG-GOV-KIND: GOVERNANCE_CONSENT_KIND='${kind}' không hợp lệ — dùng 'spend' hoặc `
      + `'withdrawal'. Khuyên dùng 'withdrawal': không đụng tx.mint nên không vướng R-MINT-2.`,
    );
  }

  const missing: string[] = [];
  if (!e.scriptCbor)   missing.push("GOVERNANCE_SCRIPT_CBOR");
  if (!e.redeemerCbor) missing.push("GOVERNANCE_REDEEMER");
  if (kind === "spend" && !e.utxo) missing.push("GOVERNANCE_UTXO");
  if (missing.length > 0) {
    throw new Error(
      `REG-GOV-INCOMPLETE: cấu hình cổng quản trị điền dở — thiếu ${missing.join(", ")}. `
      + `Điền đủ, hoặc xoá hết bốn biến GOVERNANCE_* để chạy chế độ KHÔ.`,
    );
  }
  if (!HEX_BYTES.test(e.scriptCbor)) {
    throw new Error("REG-GOV-CBOR: GOVERNANCE_SCRIPT_CBOR không phải hex chẵn byte.");
  }
  if (!HEX_BYTES.test(e.redeemerCbor)) {
    throw new Error("REG-GOV-CBOR: GOVERNANCE_REDEEMER không phải hex chẵn byte.");
  }

  const ref = governanceRef.trim().toLowerCase();
  if (!/^[0-9a-f]{56}$/.test(ref)) {
    throw new Error(
      `REG-GOV-REF: governance_ref không hợp lệ (cần 28-byte hex): ${governanceRef}`,
    );
  }

  let got: string;
  try {
    got = validatorToScriptHash({ type: "PlutusV3", script: e.scriptCbor }).toLowerCase();
  } catch (err) {
    throw new Error(
      `REG-GOV-CBOR: GOVERNANCE_SCRIPT_CBOR không đọc được thành PlutusV3 script — `
      + `${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (got !== ref) {
    throw new Error(
      `REG-GOV-HASH: script nạp vào có hash ${got}, KHÁC governance_ref ${ref}. Nạp nhầm script `
      + `thì tx vẫn dựng được nhưng trượt lúc submit. Kiểm lại GOVERNANCE_SCRIPT_CBOR (phải là `
      + `bản ĐÃ apply tham số, không phải bản gốc trong plutus.json) hoặc GOVERNANCE_REF.`,
    );
  }

  const base = { kind, scriptCbor: e.scriptCbor, redeemerCbor: e.redeemerCbor };
  if (kind !== "spend") return base;

  const [tx, ix] = e.utxo.split("#");
  if (!tx || ix === undefined || ix === "") {
    throw new Error(
      `REG-GOV-UTXO: GOVERNANCE_UTXO sai định dạng — cần "txhash#index": ${e.utxo}`,
    );
  }
  if (!/^[0-9a-f]{64}$/.test(tx.toLowerCase())) {
    throw new Error(`REG-GOV-UTXO: txhash của GOVERNANCE_UTXO cần 32-byte hex: ${tx}`);
  }
  const outputIndex = Number(ix);
  if (!Number.isInteger(outputIndex) || outputIndex < 0) {
    throw new Error(`REG-GOV-UTXO: index của GOVERNANCE_UTXO không hợp lệ: ${ix}`);
  }
  return { ...base, utxo: { txHash: tx.toLowerCase(), outputIndex } };
}

// ── VAN chặn chạy THẬT khi tham số còn là giá trị mẫu ──────────
// Đủ credential NHƯNG tham số then chốt còn mẫu/rỗng → CHẶN, rơi về chế độ KHÔ + cảnh báo.
// Chống đăng ký nhầm hồ sơ trỏ vào kho/cổng quản trị KHÔNG tồn tại.
//
// `governance_consent` là một mục trong danh sách này (bên gọi khai
// `placeholder: !governanceConsentConfigured()`). Thiếu nó thì tx đăng ký KHÔNG có vế
// R-GOVLIVE nào ⇒ chain từ chối chắc chắn. Van chặn ở đây để script in hướng dẫn, thay vì
// dựng ra một tx chết rồi mới hỏng lúc submit.

/** Gợi ý sửa riêng cho từng van — cái nào tối nghĩa thì nói rõ phải đặt gì. */
const LIVE_PARAM_HINTS: Record<string, string> = {
  governance_consent:
    "đặt GOVERNANCE_CONSENT_KIND + GOVERNANCE_SCRIPT_CBOR + GOVERNANCE_REDEEMER "
    + "(+ GOVERNANCE_UTXO nếu kind=spend) — thiếu là R-GOVLIVE từ chối tx đăng ký",
  custody_utxo:
    'ô kho mang NFT authenticity, dạng "txhash#index" — bước đăng ký readFrom nó (R-BIND)',
};

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
    const hint = LIVE_PARAM_HINTS[p.name];
    if (hint) console.warn(`     ${hint}`);
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
