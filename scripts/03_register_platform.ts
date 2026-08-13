// Registry/scripts/03_register_platform.ts — đăng ký MỘT dịch vụ vào sổ.
//
// Chạy: npm run register -- phoenixkey        (hoặc orilife | aladinwork)
//       npx tsx 03_register_platform.ts orilife
//
// RANH GIỚI (vì sao script này KHÔNG dựng kho):
//   Sổ là chỉ đường, kho là của từng dịch vụ. Đội dịch vụ dựng kho bằng SDK của họ rồi cấp
//   ba thứ cho bước đăng ký: `CUSTODY_HASH`, `SEED_POLICY`, `CUSTODY_UTXO` (txhash#index của
//   ô kho mang NFT authenticity). Registry chỉ đối soát rồi ghi hồ sơ. Đó chính là đảo chiều
//   phụ thuộc: repo này không nhập SDK của repo khác.
//
//   Ai vẫn muốn chạy hai bước trong một lượt (dựng kho + đăng ký) thì trỏ biến môi trường
//   `TREASURY_SDK` tới thư mục `offchain/src` của Treasury; script nạp `planSeed` lúc chạy và
//   TIÊM vào `onboardPlatform`. Không có biến đó thì bỏ qua, không ai hỏng.
//
// Chế độ:
//   KHÔ  (thiếu credential / tham số còn mẫu): apply tham số + dựng plan + in datum/redeemer.
//   THẬT (đủ credential + tham số thật): thêm việc ĐỌC ô kho trên chuỗi để đối soát R-BIND
//        bằng dữ liệu thật, và dựng tx đăng ký (KHÔNG submit).

import {
  NETWORK, MS_PER_EPOCH, posixMsToEpoch,
  makeLucidOrNull, walletPkh,
  resolveCustodyHash, resolveSeedPolicy,
  loadRegistry, saveRegistered, explorerTx,
  evaluateLiveGuards, warnLiveBlocked,
  loadRegisteredList, checkGovernanceRefCollision, warnGovernanceRefCollision,
  appendRegisteredList,
} from "./config.js";
import { planRegister, type CustodyRef, type EpochWindow } from "../offchain/src/registrationBuilder.js";
import { onboardPlatform } from "../offchain/src/onboard.js";
import type { PlanSeedFn } from "../offchain/src/treasuryShapes.js";
import type { PlatformConfig } from "../offchain/src/types.js";
// Hồ sơ mẫu nằm ở examples/ — mỗi đội tự viết hồ sơ của mình theo khung _template.ts.
import { phoenixKeyConfig } from "../examples/phoenixkey.js";
import { oriLifeConfig } from "../examples/orilife.js";
import { aladinWorkConfig } from "../examples/aladinwork.js";

type PlatformName = "phoenixkey" | "orilife" | "aladinwork";

function parsePlatformArg(): PlatformName {
  const a = (process.argv[2] ?? process.env.PLATFORM ?? "phoenixkey").toLowerCase();
  if (a === "phoenixkey" || a === "orilife" || a === "aladinwork") return a;
  throw new Error(`platform '${a}' không hỗ trợ — dùng: phoenixkey | orilife | aladinwork`);
}

const DEV_LAMP_POLICY  = (process.env.LAMP_POLICY_ID  ?? "").trim().toLowerCase() || "11".repeat(28);
const DEV_MAGIC_POLICY = (process.env.MAGIC_POLICY_ID ?? "").trim().toLowerCase() || "22".repeat(28);
const GOVERNANCE_REF_ENV = (process.env.GOVERNANCE_REF ?? "").trim().toLowerCase();

function buildConfig(
  name: PlatformName,
  opts: {
    registryAuthority: string;
    genesisRef: { transaction_id: string; output_index: bigint };
    seedPolicy: string;
  },
): PlatformConfig {
  const common = {
    lampPolicy:        DEV_LAMP_POLICY,
    registryAuthority: opts.registryAuthority,
    msPerEpoch:        MS_PER_EPOCH,
    reservedMinAda:    2_000_000n,
    genesisRef:        opts.genesisRef,
    seedPolicy:        opts.seedPolicy,
    ...(GOVERNANCE_REF_ENV ? { governanceRef: GOVERNANCE_REF_ENV } : {}),
  };
  if (name === "phoenixkey") return phoenixKeyConfig({ ...common, magicPolicy: DEV_MAGIC_POLICY });
  if (name === "orilife")    return oriLifeConfig(common);
  return aladinWorkConfig(common);
}

/** "txhash#index" → tham chiếu. Trống → null. */
function parseOutRef(s: string): { txHash: string; outputIndex: number } | null {
  const t = s.trim();
  if (!t) return null;
  const [tx, ix] = t.split("#");
  if (!tx || ix === undefined) throw new Error('CUSTODY_UTXO sai định dạng — cần "txhash#index"');
  return { txHash: tx.toLowerCase(), outputIndex: Number(ix) };
}

/** Nạp `planSeed` của Treasury lúc chạy NẾU có TREASURY_SDK. Không có → null. */
async function loadInjectedPlanSeed(): Promise<PlanSeedFn | null> {
  const dir = (process.env.TREASURY_SDK ?? "").trim();
  if (!dir) return null;
  const mod = await import(`${dir.replace(/\/$/, "")}/seedBuilder.js`);
  const fn = (mod as { planSeed?: unknown }).planSeed;
  if (typeof fn !== "function") {
    throw new Error(`TREASURY_SDK=${dir} không phơi hàm planSeed`);
  }
  return fn as PlanSeedFn;
}

async function main(): Promise<void> {
  const name = parsePlatformArg();
  console.log(`=== Registry bước 3: đăng ký '${name}' vào sổ ===\n`);

  const registry = await loadRegistry();
  const custody  = resolveCustodyHash();
  const seed     = resolveSeedPolicy();
  const custodyOutRef = parseOutRef(process.env.CUSTODY_UTXO ?? "");

  // R-EPOCH: validity_range của tx đăng ký phải nằm GỌN trong MỘT epoch, và created_epoch
  // bằng đúng epoch đó. Nên cửa sổ tính từ lúc chạy bị CẮT về cuối epoch hiện tại nếu ttl
  // trót vượt biên — tx trải biên epoch sẽ hỏng on-chain, cắt sớm ở đây rẻ hơn.
  const nowMs = BigInt(Date.now());
  const ttlMs = BigInt(process.env.TX_TTL_MS ?? "3600000");   // mặc định 1 giờ.
  const epochNow = posixMsToEpoch(nowMs);
  const epochEnd = posixMsToEpoch(nowMs + ttlMs);
  if (epochEnd !== epochNow) {
    console.warn(
      `Cửa sổ hiệu lực ${ttlMs}ms trải qua biên epoch (${epochNow} → ${epochEnd}) — cắt về `
      + `epoch ${epochNow}. Đợi sang epoch mới rồi chạy lại nếu cần cửa sổ dài hơn.\n`,
    );
  }
  const epochWindow: EpochWindow = { from: epochNow, to: epochNow };
  const createdEpoch = process.env.CREATED_EPOCH
    ? BigInt(process.env.CREATED_EPOCH)
    : epochWindow.from;

  const guard = evaluateLiveGuards([
    { name: "registry_authority", value: registry.registryAuthority, placeholder: registry.authoritySource !== "env" },
    { name: "custody_hash",       value: custody.value, placeholder: custody.source !== "env" },
    { name: "seed_policy",        value: seed.value,    placeholder: seed.source !== "env" },
    { name: "custody_utxo",       value: process.env.CUSTODY_UTXO ?? "", placeholder: custodyOutRef === null },
  ]);
  let dry = !guard.allowLive;

  console.log(`Mạng:               ${NETWORK}`);
  console.log(`Chế độ:             ${dry ? "KHÔ" : "THẬT (đọc kho trên chuỗi + dựng tx, KHÔNG submit)"}`);
  console.log(`registry_authority: ${registry.registryAuthority}  (${registry.authoritySource})`);
  console.log(`registry address:   ${registry.registryAddress}`);
  console.log(`beacon_policy:      ${registry.beaconPolicy}`);
  console.log(`custody_hash:       ${custody.value}  (${custody.source})`);
  console.log(`seed_policy:        ${seed.value}  (${seed.source})`);
  console.log(`custody UTxO:       ${custodyOutRef ? `${custodyOutRef.txHash}#${custodyOutRef.outputIndex}` : "(chưa cấp)"}`);
  console.log(`created_epoch:      ${createdEpoch}  (cửa sổ [${epochWindow.from}, ${epochWindow.to}])\n`);
  warnLiveBlocked(guard);

  const config = buildConfig(name, {
    registryAuthority: registry.registryAuthority,
    genesisRef: { transaction_id: "00".repeat(32), output_index: 0n },
    seedPolicy: seed.value,
  });

  // Mỗi hồ sơ nên có cổng quản trị riêng — cảnh báo sớm nếu trùng.
  const registered = await loadRegisteredList();
  warnGovernanceRefCollision(
    checkGovernanceRefCollision(registered, config.instanceId, config.governanceRef),
    config.governanceRef,
  );

  // ── Ô kho để đối soát R-BIND ────────────────────────────────
  // THẬT: đọc UTxO kho trên chuỗi (dữ liệu thật). KHÔ: dựng value KỲ VỌNG và nói rõ đó là
  // giả định, không phải bằng chứng.
  const lucid = dry ? null : await makeLucidOrNull();
  let custodyRef: CustodyRef;
  if (lucid && custodyOutRef) {
    const [u] = await lucid.utxosByOutRef([
      { txHash: custodyOutRef.txHash, outputIndex: custodyOutRef.outputIndex },
    ]);
    if (!u) throw new Error(`không tìm thấy UTxO kho ${custodyOutRef.txHash}#${custodyOutRef.outputIndex}`);
    const value: Record<string, bigint> = {};
    for (const [unit, amt] of Object.entries(u.assets)) {
      value[unit === "lovelace" ? "|" : `${unit.slice(0, 56)}|${unit.slice(56)}`] = amt;
    }
    const { getAddressDetails } = await import("@lucid-evolution/lucid");
    const cred = getAddressDetails(u.address).paymentCredential;
    custodyRef = {
      value,
      scriptHash: cred?.hash ?? "",
      txHash: custodyOutRef.txHash,
      outputIndex: custodyOutRef.outputIndex,
    };
    console.log("Đã đọc ô kho trên chuỗi để đối soát R-BIND bằng dữ liệu thật.\n");
  } else {
    custodyRef = {
      value: { [`${seed.value}|${config.instanceId}`]: 1n, "|": config.reservedMinAda },
      scriptHash: custody.value,
      ...(custodyOutRef ?? {}),
    };
    console.log("KHÔ: value ô kho là GIẢ ĐỊNH (chưa đối soát với chuỗi) — không dùng làm bằng chứng.\n");
    dry = true;
  }

  // ── Dựng plan ────────────────────────────────────────────────
  const injectedPlanSeed = await loadInjectedPlanSeed();
  const register = injectedPlanSeed
    ? onboardPlatform({
        config, planSeed: injectedPlanSeed,
        beaconPolicy: registry.beaconPolicy,
        custodyHash: custody.value,
        seedPolicy: seed.value,
        createdEpoch, epochWindow,
        ...(custodyOutRef ? { custodyOutRef } : {}),
      }).register
    : planRegister({
        config,
        beaconPolicy: registry.beaconPolicy,
        custodyHash: custody.value,
        seedPolicy: seed.value,
        createdEpoch, epochWindow,
        custodyUtxo: custodyRef,
      });

  if (injectedPlanSeed) {
    console.log("Đã TIÊM planSeed từ TREASURY_SDK — chạy đủ hai bước (dựng kho + đăng ký).\n");
  }

  console.log(register.summary);
  console.log();
  console.log("── Datum + redeemer ──");
  console.log(`entry datum:     ${register.entryDatumCbor}`);
  console.log(`mint redeemer:   ${register.mintRedeemerCbor}`);
  console.log(`người phải ký:   ${register.requiredSigner} (registry_authority — R-SIG)`);
  console.log();

  // ── Dựng tx đăng ký (KHÔNG submit) ───────────────────────────
  if (lucid && !dry) {
    const pkh = await walletPkh(lucid);
    console.log(`Ví chạy script (PKH): ${pkh}`);
    const nftUnit = registry.beaconPolicy + register.nftName;
    const { applyValidator, rawValidator } = await import("./config.js");
    const beaconValidator = applyValidator(
      (await rawValidator("registry_beacon.registry_beacon.mint")).compiledCode,
      [registry.registryAuthority, registry.registryHash],
    );
    try {
      const tx = await lucid.newTx()
        .mintAssets({ [nftUnit]: 1n }, register.mintRedeemerCbor)
        .attach.MintingPolicy(beaconValidator)
        .pay.ToAddressWithData(
          registry.registryAddress,
          { kind: "inline", value: register.entryDatumCbor },
          { [nftUnit]: 1n },
        )
        .addSignerKey(register.requiredSigner)
        .complete();
      void tx;
      console.log("Dựng tx đăng ký OK (chưa ký/submit).");
    } catch (e) {
      console.log(`Dựng tx cần authority ký + min-ADA: ${e instanceof Error ? e.message : e}`);
    }
    console.log(`\nSau khi submit: ${explorerTx("<txHash>")}`);
  } else {
    console.log("── KHÔ: cần BLOCKFROST_KEY + ví + CUSTODY_UTXO để đối soát và dựng tx thật ──");
  }

  await saveRegistered({
    network:         NETWORK,
    platform:        name,
    specVersion:     register.entry.spec_version.toString(),
    platformId:      register.entry.platform_id,
    instanceId:      register.entry.instance_id,
    custodyHash:     register.entry.custody_hash,
    seedPolicy:      register.entry.seed_policy,
    beaconPolicy:    register.entry.beacon_policy,
    registryHash:    registry.registryHash,
    registryAddress: registry.registryAddress,
    entryDatumCbor:  register.entryDatumCbor,
    requiredSigner:  register.requiredSigner,
    governanceRef:   register.entry.governance_ref,
    createdEpoch:    createdEpoch.toString(),
    dryRun:          dry,
  });

  await appendRegisteredList({
    platform:      name,
    instanceId:    config.instanceId,
    governanceRef: config.governanceRef,
  });
  console.log(`\nĐã ghi registered.json + registered-instances.json cho '${name}'.`);
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
