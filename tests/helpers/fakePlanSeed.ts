// Hàm dựng kho GIẢ dùng trong test — chứng minh việc tiêm phụ thuộc (hướng B) chạy được mà
// KHÔNG cần SDK Treasury có mặt trên đĩa.
//
// Nó gương đúng phần hợp đồng mà Registry thật sự dựa vào (`PlanSeedFn`): sổ genesis rỗng
// consumed_proposals, NFT authenticity (seed_policy, instance_id) qty 1 trong value kho, ADA
// giữ min-UTxO. Nó KHÔNG thay Treasury: mọi bất biến của kho vẫn do validator kho ép, ở repo
// khác. Bên gọi thật truyền `planSeed` của Treasury SDK vào đúng chỗ này.

import type { AssetMap, PlanSeedFn } from "../../offchain/src/treasuryShapes.js";

const LOVELACE_KEY = "|";

function assetKey(policy: string, name: string): string {
  const p = policy.toLowerCase();
  if (p === "") return LOVELACE_KEY;
  return `${p}|${name.toLowerCase()}`;
}

export const fakePlanSeed: PlanSeedFn = (datumIn, seedPolicy, reservedMinAda) => {
  if (reservedMinAda < 0n) throw new Error("FAKE-SEED-002: reserved_min_ada < 0");

  // Sổ canonical tối giản: bỏ dòng 0, sắp theo khoá; genesis chưa chi proposal nào.
  const ledger = [...datumIn.ledger]
    .filter((l) => l.amount !== 0n)
    .sort((a, b) => {
      const ka = `${a.bucket_id}|${a.policy}|${a.name}`;
      const kb = `${b.bucket_id}|${b.policy}|${b.name}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  for (const l of ledger) {
    if (l.amount < 0n) throw new Error("FAKE-SEED-003: dòng sổ âm");
  }

  const datum = { ...datumIn, ledger, consumed_proposals: [] as string[] };
  const nftName = datum.instance_id.toLowerCase();

  const custodyValue: AssetMap = {};
  if (reservedMinAda > 0n) custodyValue[LOVELACE_KEY] = reservedMinAda;
  for (const l of ledger) {
    const k = assetKey(l.policy, l.name);
    custodyValue[k] = (custodyValue[k] ?? 0n) + l.amount;
  }
  custodyValue[assetKey(seedPolicy, nftName)] = 1n;

  return { datum, custodyValue, seedPolicy: seedPolicy.toLowerCase(), nftName };
};
