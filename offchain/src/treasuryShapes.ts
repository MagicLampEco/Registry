// Kiểu MƯỢN của Treasury — khai lại TẠI CHỖ dưới dạng cấu trúc tối thiểu.
//
// VÌ SAO: Registry là sổ chỉ đường; nó KHÔNG được phụ thuộc lịch phát hành SDK của LAMP.
// Bản cũ (LAMP/PlatformKit) nhập thẳng `../../../Treasury/offchain/src/types.js` — repo
// Registry đứng một mình là hỏng typecheck. Ở đây chỉ khai HÌNH DẠNG cần dùng; TypeScript
// so cấu trúc nên giá trị thật do Treasury SDK sinh ra vẫn gán vào được, không cần import.
//
// Ba kiểu dưới đây là hình dạng ĐỌC ĐƯỢC từ Treasury:
//   - LedgerEntry / CustodyDatum : datum kho, để dựng đầu vào cho hàm seed được tiêm.
//   - CollectItem                : một dòng thu phí, đầu ra của collectAdapter.
// Cột mốc đối chiếu: /Users/ductiger/Projects/LAMP/Treasury/offchain/src/types.ts
// (LedgerEntry dòng 8-13, CustodyDatum dòng 24-35, CollectItem dòng 39-45 — đọc 2026-08-13).
// Treasury đổi hình dạng mà không báo ⇒ đối soát lại file trên, KHÔNG đoán.

import type { AssetKey } from "./types.js";

/** Một dòng sổ kế toán trong kho: số dư của 1 asset trong 1 khoang. ADA: policy="" name="". */
export interface LedgerEntry {
  bucket_id : bigint;
  policy    : string;   // hex
  name      : string;   // hex
  amount    : bigint;
}

/** Datum kho (Treasury custody). Registry chỉ ĐỌC/dựng, không tự ép bất biến của kho. */
export interface CustodyDatum {
  instance_id        : string;
  accepted_assets    : AssetKey[];
  ledger             : LedgerEntry[];
  cut_bps            : bigint;
  governance_ref     : string;
  epoch              : bigint;
  consumed_proposals : string[];
}

/** Một micro-collect (đã định giá ở app — Treasury KHÔNG định giá). */
export interface CollectItem {
  app_id   : string;   // hex — ai trả
  policy   : string;   // hex — asset
  name     : string;   // hex
  amount   : bigint;   // số đã định giá ở app
  category : bigint;   // bucket_id đích cho phần cut
}

/** Value map "policy|name" → số lượng (lovelace dùng khoá "|"). Gương AssetMap của Treasury. */
export type AssetMap = Record<string, bigint>;

/** Kết quả hàm dựng seed của Treasury — phần Registry thật sự đọc. */
export interface SeedPlanLike {
  datum:        CustodyDatum;
  custodyValue: AssetMap;
  seedPolicy:   string;
  nftName:      string;
}

/**
 * Hàm dựng seed kho, do BÊN GỌI tiêm vào (thường là `planSeed` của Treasury SDK).
 * Đây là phụ thuộc DUY NHẤT lúc chạy thật giữa Registry và Treasury — và nó đi vào bằng
 * tham số, không bằng đường dẫn nhập. Registry không cần Treasury có mặt trên đĩa để
 * typecheck hay chạy test.
 */
export type PlanSeedFn = (
  datumIn: CustodyDatum, seedPolicy: string, reservedMinAda: bigint,
) => SeedPlanLike;

/** Hình dạng tối thiểu tham số của hàm dựng tx Collect được tiêm (chỉ phần Registry chạm). */
export interface CollectTxParamsLike {
  items: CollectItem[];
}
