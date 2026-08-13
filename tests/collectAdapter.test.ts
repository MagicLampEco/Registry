// Registry · collectAdapter sinh CollectItem đúng + lọc null + chặn amount âm + TIÊM hàm
// dựng tx thu phí (không nhập SDK Treasury).

import { describe, it, expect } from "vitest";
import {
  eventToCollectItem, eventsToCollectItems, buildCollectFromEvents,
  type FeeEvent, type PriceFn,
} from "../offchain/src/collectAdapter.js";
import type { CollectItem } from "../offchain/src/treasuryShapes.js";

const ADA = { policy: "", name: "" };

const fixedPrice: PriceFn = (ev: FeeEvent) => {
  if (ev.eventType === "skip") return null;
  if (ev.eventType === "neg") return { asset: ADA, amount: -1n, bucketCategory: 0n };
  return { asset: ADA, amount: 1_000_000n, bucketCategory: 2n };
};

describe("eventToCollectItem", () => {
  it("dịch sự kiện → CollectItem đúng trường (app_id, asset, amount, category)", () => {
    const item = eventToCollectItem({ eventType: "pay", payer: "ab".repeat(28) }, fixedPrice);
    expect(item).toEqual({
      app_id: "ab".repeat(28), policy: "", name: "", amount: 1_000_000n, category: 2n,
    });
  });

  it("priceFn trả null → item null (sự kiện không thu phí)", () => {
    expect(eventToCollectItem({ eventType: "skip", payer: "ab".repeat(28) }, fixedPrice)).toBeNull();
  });

  it("amount âm → ném lỗi (chống rút ngược)", () => {
    expect(() => eventToCollectItem({ eventType: "neg", payer: "ab".repeat(28) }, fixedPrice))
      .toThrow(/âm/);
  });

  it("payer được chuẩn hoá hex lowercase + bỏ 0x", () => {
    expect(eventToCollectItem({ eventType: "pay", payer: "0xABCDEF" }, fixedPrice)?.app_id)
      .toBe("abcdef");
  });
});

describe("eventsToCollectItems", () => {
  it("lọc bỏ sự kiện null, giữ thứ tự", () => {
    const events: FeeEvent[] = [
      { eventType: "pay", payer: "11".repeat(28) },
      { eventType: "skip", payer: "22".repeat(28) },
      { eventType: "pay", payer: "33".repeat(28) },
    ];
    const items = eventsToCollectItems(events, fixedPrice);
    expect(items.length).toBe(2);
    expect(items[0]!.app_id).toBe("11".repeat(28));
    expect(items[1]!.app_id).toBe("33".repeat(28));
  });
});

describe("buildCollectFromEvents — hàm dựng tx được TIÊM", () => {
  interface FakeTxParams {
    items: CollectItem[];
    custodyRef: string;
    validFromMs: bigint;
  }

  it("chuyển đúng items + giữ nguyên tham số tx của bên gọi", async () => {
    let seen: FakeTxParams | null = null;
    const res = await buildCollectFromEvents<FakeTxParams, { count: number }>({
      events: [
        { eventType: "pay", payer: "11".repeat(28) },
        { eventType: "skip", payer: "22".repeat(28) },
      ],
      priceFn: fixedPrice,
      txParams: { custodyRef: "aa#0", validFromMs: 1_700_000_000_000n },
      buildCollectTx: async (p) => { seen = p; return { count: p.items.length }; },
    });
    expect(res).toEqual({ count: 1 });
    const got = seen as FakeTxParams | null;
    expect(got!.custodyRef).toBe("aa#0");
    expect(got!.validFromMs).toBe(1_700_000_000_000n);
    expect(got!.items[0]!.amount).toBe(1_000_000n);
  });

  it("lô toàn sự kiện không thu phí → items rỗng, vẫn gọi hàm được tiêm", async () => {
    const res = await buildCollectFromEvents<FakeTxParams, number>({
      events: [{ eventType: "skip", payer: "11".repeat(28) }],
      priceFn: fixedPrice,
      txParams: { custodyRef: "bb#1", validFromMs: 0n },
      buildCollectTx: async (p) => p.items.length,
    });
    expect(res).toBe(0);
  });

  it("amount âm làm hỏng cả lô trước khi chạm hàm dựng tx", async () => {
    let called = false;
    await expect(buildCollectFromEvents<FakeTxParams, number>({
      events: [{ eventType: "neg", payer: "11".repeat(28) }],
      priceFn: fixedPrice,
      txParams: { custodyRef: "cc#2", validFromMs: 0n },
      buildCollectTx: async () => { called = true; return 1; },
    })).rejects.toThrow(/âm/);
    expect(called).toBe(false);
  });
});
