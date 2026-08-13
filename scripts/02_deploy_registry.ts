// Registry/scripts/02_deploy_registry.ts — apply tham số hai validator của sổ + in
// registry_address / beacon_policy. Không cần mạng.
//
// Chạy: npm run deploy-registry     (hoặc: npx tsx 02_deploy_registry.ts)
//
// Sổ là SINGLETON cho cả hệ (một authority). Mỗi platform là một ô hồ sơ RIÊNG ở địa chỉ
// registry — đăng ký của bên này không chặn bên kia. Bước này chỉ APPLY tham số + tính địa
// chỉ; tạo hồ sơ là việc của 03_register_platform (đúc beacon NFT + ô hồ sơ).
//
// PHÁ VÒNG (đặc tả v2 §2): registry(authority) → registry_hash → registry_beacon(authority,
// registry_hash) → beacon_policy. Ngược chiều bản cũ, để cổng đúc ép được địa chỉ đích.

import {
  NETWORK, MS_PER_EPOCH,
  resolveRegistryAuthority, applyRegistry,
  evaluateLiveGuards, warnLiveBlocked,
  saveRegistry, type RegistryState,
} from "./config.js";

async function main(): Promise<void> {
  console.log("=== Registry bước 2: apply tham số sổ đăng ký ===\n");

  const { authority, source } = resolveRegistryAuthority();

  const guard = evaluateLiveGuards([
    { name: "registry_authority", value: authority, placeholder: source !== "env" },
  ]);
  const dry = !guard.allowLive;

  console.log(`Mạng:               ${NETWORK}`);
  console.log(`ms_per_epoch:       ${MS_PER_EPOCH}`);
  console.log(`Chế độ:             ${dry ? "KHÔ (apply tham số, không dựng tx)" : "THẬT (sổ chỉ có tham số — không có tx triển khai riêng)"}`);
  console.log(`registry_authority: ${authority}  (${source})\n`);
  warnLiveBlocked(guard);

  const r = await applyRegistry(authority);

  console.log("── Đã apply ──");
  console.log(`registry hash:      ${r.registryHash}`);
  console.log(`   (= hash(registry(authority)); CHỈ phụ thuộc authority ⇒ tính được TRƯỚC)`);
  console.log(`registry address:   ${r.registryAddr}`);
  console.log(`beacon_policy:      ${r.beaconPolicy}`);
  console.log(`   (= policy id của registry_beacon(authority, registry_hash))`);
  console.log();

  if (dry) {
    console.log("── KHÔ: sổ chỉ là tham số (không có UTxO triển khai riêng) ──");
    console.log("Beacon NFT + ô hồ sơ đầu tiên được tạo ở 03_register_platform.ts.");
  }

  const state: RegistryState = {
    network:           NETWORK,
    registryAuthority: authority,
    authoritySource:   source,
    registryHash:      r.registryHash,
    registryAddress:   r.registryAddr,
    beaconPolicy:      r.beaconPolicy,
  };
  await saveRegistry(state);
  console.log("\nĐã ghi registry.json (registry_hash, registry_address, beacon_policy).");
  console.log("Tiếp theo: npm run register -- <phoenixkey|orilife|aladinwork>");
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
