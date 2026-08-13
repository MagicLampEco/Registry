// Registry collectAdapter — cầu nối CHUNG: sự kiện của platform → dòng thu phí (CollectItem).
//
// Mỗi platform phát sinh "sự kiện chịu phí" (FeeEvent). Adapter dịch sự kiện → CollectItem qua
// hàm định giá do platform cấp. Kho KHÔNG định giá — amount đã được app tính. Adapter chỉ:
// (1) gọi priceFn → amount + asset + khoang đích; (2) gói thành CollectItem; (3) chuyển cho hàm
// dựng tx thu phí do BÊN GỌI TIÊM (thường là buildCollectTx của Treasury SDK).
//
// ĐẢO CHIỀU PHỤ THUỘC (hướng B): bản cũ `import("../../../Treasury/offchain/src/collectBuilder.js")`
// — một đường dẫn tương đối trỏ ra ngoài repo. Nay hàm dựng tx đi vào bằng tham số, kiểu tham số
// do bên gọi quyết (generic). Registry không cần biết Treasury nằm ở đâu.

import type { AssetKey } from "./types.js";
import type { CollectItem, CollectTxParamsLike } from "./treasuryShapes.js";

function normHex(hex: string): string {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return h.toLowerCase();
}

/**
 * Một sự kiện chịu phí phía platform (trung lập với lĩnh vực).
 * eventType định danh loại sự kiện (vd "createDID", "animal.enroll"). payer là app_id (hex)
 * — ai trả. extra mang ngữ cảnh định giá (declaredValue, species, ...) để priceFn dùng.
 */
export interface FeeEvent {
  /** Loại sự kiện — khoá định giá. */
  eventType: string;
  /** app_id (hex) — ai trả phí (= CollectItem.app_id). */
  payer: string;
  /** Ngữ cảnh định giá tuỳ platform (declaredValueUsd, species, lifecycleEvents, ...). */
  extra?: Record<string, unknown>;
}

/** Kết quả định giá 1 sự kiện: asset + amount + khoang đích của phần cut. */
export interface PricedItem {
  /** Asset thu (policy/name hex; ADA = {policy:"",name:""}). */
  asset: AssetKey;
  /** Số đã định giá (đơn vị nhỏ nhất). BigInt — không Number. */
  amount: bigint;
  /** bucket_id đích cho phần cut (= CollectItem.category). */
  bucketCategory: bigint;
}

/** Hàm định giá do platform cấp. Trả null = sự kiện KHÔNG thu phí (bỏ qua). */
export type PriceFn = (event: FeeEvent) => PricedItem | null;

/**
 * Dịch 1 FeeEvent → CollectItem (hoặc null nếu priceFn bỏ qua).
 * CollectItem = { app_id, policy, name, amount, category }.
 */
export function eventToCollectItem(event: FeeEvent, priceFn: PriceFn): CollectItem | null {
  const priced = priceFn(event);
  if (priced === null) return null;
  if (priced.amount < 0n) {
    throw new Error(`COLLECT-ADAPTER: amount âm cho sự kiện '${event.eventType}' (${priced.amount})`);
  }
  return {
    app_id:   normHex(event.payer),
    policy:   normHex(priced.asset.policy),
    name:     normHex(priced.asset.name),
    amount:   priced.amount,
    category: priced.bucketCategory,
  };
}

/** Dịch một lô FeeEvent → CollectItem[] (bỏ sự kiện priceFn trả null). */
export function eventsToCollectItems(events: FeeEvent[], priceFn: PriceFn): CollectItem[] {
  const out: CollectItem[] = [];
  for (const ev of events) {
    const item = eventToCollectItem(ev, priceFn);
    if (item !== null) out.push(item);
  }
  return out;
}

// ── Cầu nối tới hàm dựng tx thu phí (TIÊM từ bên gọi) ────────────────────────

export interface CollectFromEventsParams<TTxParams extends CollectTxParamsLike, TResult> {
  events: FeeEvent[];
  priceFn: PriceFn;
  /** Hàm dựng tx thu phí do bên gọi tiêm (vd `buildCollectTx` của Treasury SDK). */
  buildCollectTx: (p: TTxParams) => Promise<TResult>;
  /** Mọi tham số tx còn lại của hàm đó, TRỪ `items` — adapter sinh items. */
  txParams: Omit<TTxParams, "items">;
}

/**
 * Dựng tx thu phí từ một lô sự kiện: priceFn định giá → CollectItem[] → hàm dựng tx được tiêm.
 * Trả nguyên kết quả của hàm đó (kiểu do bên gọi quyết).
 */
export async function buildCollectFromEvents<
  TTxParams extends CollectTxParamsLike, TResult,
>(params: CollectFromEventsParams<TTxParams, TResult>): Promise<TResult> {
  const items = eventsToCollectItems(params.events, params.priceFn);
  return params.buildCollectTx({ ...params.txParams, items } as TTxParams);
}
