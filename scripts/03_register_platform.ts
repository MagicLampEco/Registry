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
  NETWORK, MS_PER_TIME_BUCKET, txValidityForTimeBucket, validityFitsOneBucket,
  makeLucidOrNull, walletPkh,
  resolveCustodyHash, resolveSeedPolicy,
  loadRegistry, saveRegistered, explorerTx, applyRegistry,
  evaluateLiveGuards, warnLiveBlocked,
  loadRegisteredList, checkGovernanceRefCollision, warnGovernanceRefCollision,
  appendRegisteredList,
  resolveGovernanceConsent, governanceConsentConfigured, scriptRewardAddress,
} from "./config.js";
import {
  planRegister,
  type CustodyRef, type TimeBucketWindow, type GovernanceProof,
} from "../offchain/src/registrationBuilder.js";
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
    // examples/ còn khai theo tên cũ `msPerEpoch` (thư mục đó ngoài phạm vi sửa đợt này).
    // GIÁ TRỊ thì đã đúng: hằng ô thời gian của on-chain, không còn lấy theo mạng.
    msPerEpoch:        MS_PER_TIME_BUCKET,
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

  // registry.json là ẢNH CHỤP của bước 2. Sửa validator on-chain rồi `aiken build` là hash
  // ĐỔI ⇒ ảnh chụp cũ trỏ vào một địa chỉ registry KHÔNG còn là bản đang dùng, và beacon_policy
  // (apply cả registry_hash) cũng lệch theo. Đối chiếu lại với blueprint HIỆN TẠI, không tin
  // ảnh chụp. Thứ tự apply nằm ở config.applyRegistry: registry TRƯỚC → hash → beacon SAU.
  const fresh = await applyRegistry(registry.registryAuthority);
  if (fresh.registryHash !== registry.registryHash
      || fresh.beaconPolicy !== registry.beaconPolicy) {
    throw new Error(
      `registry.json LỆCH với onchain/plutus.json hiện tại:\n`
      + `  registry hash:  ${registry.registryHash} (ảnh chụp) != ${fresh.registryHash} (build hiện tại)\n`
      + `  beacon policy:  ${registry.beaconPolicy} (ảnh chụp) != ${fresh.beaconPolicy} (build hiện tại)\n`
      + `Validator đã đổi sau lần chạy bước 2. Chạy lại 'npm run deploy-registry' để apply-param `
      + `lại (registry TRƯỚC, rồi registry_beacon với registry_hash MỚI) trước khi đăng ký.`,
    );
  }

  const custody  = resolveCustodyHash();
  const seed     = resolveSeedPolicy();
  const custodyOutRef = parseOutRef(process.env.CUSTODY_UTXO ?? "");

  // R-EPOCH: validity_range của tx đăng ký phải nằm GỌN trong MỘT Ô THỜI GIAN, và
  // created_epoch bằng đúng ô đó. Ràng buộc on-chain ĐỌC validity_range, nên tx KHÔNG đặt ttl
  // sẽ trượt (cận vô hạn → `get_finite` trả None). Ở đây tính cửa sổ THẬT rồi đặt xuống tx.
  const nowMs = BigInt(Date.now());
  const ttlMs = BigInt(process.env.TX_TTL_MS ?? "3600000");   // mặc định 1 giờ.
  const validity = txValidityForTimeBucket(nowMs, ttlMs);
  if (validity.truncated) {
    console.warn(
      `Cửa sổ hiệu lực ${ttlMs}ms trải qua biên ô thời gian — cắt còn `
      + `${validity.validTo - validity.validFrom}ms (hết ô ${validity.bucket}). Đợi sang ô mới `
      + `rồi chạy lại nếu cần cửa sổ dài hơn.\n`,
    );
  }
  if (!validityFitsOneBucket(validity)) {
    throw new Error(
      `TTL: cửa sổ [${validity.validFrom}, ${validity.validTo}) không nằm gọn trong ô `
      + `${validity.bucket} — R-EPOCH sẽ trượt. Còn ${validity.msLeftInBucket}ms của ô này.`,
    );
  }
  const timeBucketWindow: TimeBucketWindow = { from: validity.bucket, to: validity.bucket };
  const createdEpoch = process.env.CREATED_EPOCH
    ? BigInt(process.env.CREATED_EPOCH)
    : timeBucketWindow.from;

  const guard = evaluateLiveGuards([
    { name: "registry_authority", value: registry.registryAuthority, placeholder: registry.authoritySource !== "env" },
    { name: "custody_hash",       value: custody.value, placeholder: custody.source !== "env" },
    { name: "seed_policy",        value: seed.value,    placeholder: seed.source !== "env" },
    { name: "custody_utxo",       value: process.env.CUSTODY_UTXO ?? "", placeholder: custodyOutRef === null },
    // R-GOVLIVE: không có cách nối cổng quản trị vào tx thì tx đăng ký chắc chắn bị từ chối.
    // Van này chặn ngay, thay vì để dựng ra một tx chết.
    {
      name: "governance_consent",
      value: (process.env.GOVERNANCE_CONSENT_KIND ?? "").trim(),
      placeholder: !governanceConsentConfigured(),
    },
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
  console.log(`ms_per_time_bucket: ${MS_PER_TIME_BUCKET}  (ô 5 ngày kể từ mốc Unix — HẰNG mọi mạng)`);
  console.log(`created_epoch:      ${createdEpoch}  (ô ${timeBucketWindow.from})`);
  console.log(`validity_range:     invalid_before=${validity.validFrom}  invalid_hereafter=${validity.validTo}`);
  console.log(`                    (biên trên LOẠI TRỪ; tx PHẢI đặt cả hai, nếu không R-EPOCH trượt)\n`);
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

  // ── R-GOVLIVE: bằng chứng cổng quản trị chạy thật trong CHÍNH tx đăng ký ────
  // Cấu hình đủ (env) → bằng chứng THẬT, và phần dựng tx bên dưới nối đúng thứ này vào.
  // Chưa cấu hình → KHÔ: khai theo đường mặc định `withdrawal` và NÓI RÕ đây là LỜI KHAI,
  // không phải bằng chứng — van ở trên đã chặn chế độ THẬT rồi.
  const govConsent = resolveGovernanceConsent(config.governanceRef);
  const govKind = govConsent?.kind ?? "withdrawal";
  const governanceProof: GovernanceProof = govKind === "spend"
    ? {
        spends: [{
          scriptHash: config.governanceRef,
          ...(govConsent?.utxo ?? {}),
        }],
      }
    : { withdrawals: [{ scriptHash: config.governanceRef, amountLovelace: 0n }] };

  console.log("── R-GOVLIVE (cổng quản trị phải CHẠY trong tx đăng ký) ──");
  console.log(`Đường đồng thuận:   ${govKind}${govConsent ? "" : "  (KHAI — chưa cấu hình env)"}`);
  console.log(`governance_ref:     ${config.governanceRef}`);
  if (govConsent?.kind === "spend") {
    console.log(`Ô quản trị chi tiêu: ${govConsent.utxo!.txHash}#${govConsent.utxo!.outputIndex}`);
    console.log("⚠ Nhánh spend đó KHÔNG được mint/burn — R-MINT-2 cấm tx đăng ký mang policy");
    console.log("  mint nào khác beacon. Cần mint thì đổi sang withdraw-0.");
  } else if (govConsent) {
    console.log(`Reward address:     ${scriptRewardAddress(config.governanceRef)} (rút 0 lovelace)`);
  } else {
    console.log("Đặt GOVERNANCE_CONSENT_KIND + GOVERNANCE_SCRIPT_CBOR + GOVERNANCE_REDEEMER");
    console.log("(+ GOVERNANCE_UTXO nếu kind=spend) để dựng tx THẬT. Thiếu là tx bị từ chối 100%.");
  }
  console.log();

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
        createdEpoch, timeBucketWindow,
        governanceProof,
        // R-GOVSELF: đường onboard trước đây KHÔNG truyền registryHash nên bỏ qua kiểm này —
        // hai đường vào cùng một builder mà ép khác nhau. Nay truyền cả hai đường.
        registryHash: registry.registryHash,
        ...(custodyOutRef ? { custodyOutRef } : {}),
      }).register
    : planRegister({
        config,
        beaconPolicy: registry.beaconPolicy,
        custodyHash: custody.value,
        seedPolicy: seed.value,
        createdEpoch, timeBucketWindow,
        custodyUtxo: custodyRef,
        registryHash: registry.registryHash,
        governanceProof,
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
    // R-GOVLIVE: KHÔNG dựng tx nếu không nối được cổng quản trị — tx đó bị từ chối chắc chắn.
    if (!govConsent) {
      throw new Error(
        "REG-GOVLIVE: thiếu cấu hình cổng quản trị (GOVERNANCE_CONSENT_KIND / "
        + "GOVERNANCE_SCRIPT_CBOR / GOVERNANCE_REDEEMER [+ GOVERNANCE_UTXO]). Dựng tx mà không "
        + "có input/withdrawal ở Script(governance_ref) là dựng một tx chắc chắn trượt.",
      );
    }
    const govScript = { type: "PlutusV3" as const, script: govConsent.scriptCbor };
    // R-BIND: hồ sơ CÓ KHO phải mang ô kho làm REFERENCE INPUT. Trước đây `custodyRef` chỉ đi vào
    // `planRegister` để kiểm giấy tờ rồi dừng ở đó — plan xanh, `.complete()` xanh, in "OK", và
    // node từ chối lúc submit. Kiểm toán dựng lại được bằng PoC + đối chứng đột biến. Dựng một tx
    // chắc chắn trượt còn tệ hơn không dựng, nên chặn ở đây thay vì để nó đi tới `.complete()`.
    const canCustody = register.custodial ?? true;
    if (canCustody && !custodyOutRef) {
      throw new Error(
        "REG-BIND: hồ sơ CÓ KHO nhưng thiếu CUSTODY_UTXO — không nối được reference input của ô "
        + "kho. Validator ép `custody_bound`, nên tx dựng ra sẽ bị từ chối lúc submit. Hồ sơ KHÔNG "
        + "KHO (custody rỗng, không asset, cut_bps 0) thì không cần ô này.",
      );
    }
    try {
      let txb = lucid.newTx()
        .mintAssets({ [nftUnit]: 1n }, register.mintRedeemerCbor)
        .attach.MintingPolicy(beaconValidator)
        .pay.ToAddressWithData(
          registry.registryAddress,
          { kind: "inline", value: register.entryDatumCbor },
          { [nftUnit]: 1n },
        )
        .addSignerKey(register.requiredSigner)
        // R-EPOCH đọc validity_range: KHÔNG đặt hai mốc này thì cận là vô hạn ⇒ validator
        // hỏng ở `expect Some(...)`. Cửa sổ đã được cắt cho nằm gọn trong ô `created_epoch`.
        .validFrom(Number(validity.validFrom))
        .validTo(Number(validity.validTo));

      // R-BIND — chỉ hồ sơ CÓ KHO mới cần; hồ sơ KHÔNG KHO thì validator bỏ qua ràng buộc này.
      if (canCustody) {
        const [cu] = await lucid.utxosByOutRef([
          { txHash: custodyOutRef!.txHash, outputIndex: custodyOutRef!.outputIndex },
        ]);
        if (!cu) {
          throw new Error(
            `REG-BIND: không tìm thấy ô kho ${custodyOutRef!.txHash}#${custodyOutRef!.outputIndex}`,
          );
        }
        txb = txb.readFrom([cu]);
      }

      // R-GOVLIVE — nối phần cổng quản trị vào ĐÚNG một trong hai đường mà validator nhận.
      if (govConsent.kind === "spend") {
        const [gu] = await lucid.utxosByOutRef([govConsent.utxo!]);
        if (!gu) {
          throw new Error(
            `không tìm thấy ô quản trị ${govConsent.utxo!.txHash}#${govConsent.utxo!.outputIndex}`,
          );
        }
        const { getAddressDetails: addrDetails } = await import("@lucid-evolution/lucid");
        const guHash = addrDetails(gu.address).paymentCredential?.hash ?? "";
        if (guHash.toLowerCase() !== config.governanceRef.toLowerCase()) {
          throw new Error(
            `ô quản trị nằm ở Script(${guHash}), KHÁC governance_ref (${config.governanceRef}) — `
            + `R-GOVLIVE sẽ trượt`,
          );
        }
        txb = txb.collectFrom([gu], govConsent.redeemerCbor).attach.SpendingValidator(govScript);
      } else {
        txb = txb
          .withdraw(scriptRewardAddress(config.governanceRef), 0n, govConsent.redeemerCbor)
          .attach.WithdrawalValidator(govScript);
      }

      const tx = await txb.complete();
      void tx;
      console.log("Dựng tx đăng ký OK (chưa ký/submit) — đã nối R-GOVLIVE.");
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
