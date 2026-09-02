// Registry · E2E — nối CHẶNG 1 → 2 → 3 → 6 của luồng đăng ký trong MỘT bài kiểm.
//
// Vì sao cần: repo đã có bài kiểm đầy đủ cho TỪNG chặng (nộp, chấm, dựng tx, đúc beacon, tiêu ô,
// quét sổ) nhưng KHÔNG có bài nào nối chặng nọ sang chặng kia. Lỗi nguy hiểm nhất của một luồng
// nhiều chặng không nằm trong chặng — nó nằm ở khớp nối: chặng 2 chấm một hồ sơ là "đủ điều kiện"
// rồi chặng 3 dựng giao dịch từ MỘT đường bóc dữ liệu KHÁC, hai đường lệch nhau mà cả hai bài
// kiểm riêng vẫn xanh.
//
// PHẠM VI — nói trước để không ai đọc tên tệp rồi tưởng nhiều hơn:
//   · CÓ nối: 1 nộp hồ sơ · 2 chấm ra hạng · 3 dựng giao dịch đăng ký · 6 quét sổ tìm lại.
//   · CÓ thêm (khối cuối tệp): chặng 6 có HAI đường đọc — theo beacon NFT (SDK) và theo ĐỊA CHỈ
//     (`utxosAt`, đường của `scripts/02_*`/`03_*`). Chúng chỉ bằng nhau khi mọi ô hồ sơ ở địa
//     chỉ enterprise, và điều kiện ấy trước đây không bài kiểm nào phát biểu — đó là chỗ
//     Math-Spec §8 T16 nấp.
//   · KHÔNG chạm: 4 đúc beacon và 5 tiêu ô hồ sơ — hai chặng đó là validator on-chain, kiểm ở
//     `onchain/.../registry_beacon_test.ak` và `registry_test.ak`.
//   · KHÔNG có mạng, KHÔNG có Emulator. `tests/noExternalImports.test.ts` cấm mọi phụ thuộc leo
//     ra ngoài repo, và một bài kiểm cần mạng thì không phải bài kiểm mà là bài đo.
// Chặng cần mạng thật (`scripts/02_*`, `scripts/03_*`) hiện CHƯA bộ kiểm nào chạm tới. Ghi ra để
// con số "E2E xanh" không được đọc rộng hơn nó đáng.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkOne } from "../tools/check-registration-core.mjs";
import { planRegister } from "../offchain/src/registrationBuilder.js";
import {
  discoverPlatforms, findPlatform, findDuplicatePlatformIds,
  type QueryUtxo,
} from "../offchain/src/registryQuery.js";
import { platformEntryToCbor } from "../offchain/src/registryDatum.js";
import { asciiToHex } from "../offchain/src/encoding.js";
import { MS_PER_TIME_BUCKET } from "../offchain/src/types.js";
import type { PlatformConfig } from "../offchain/src/types.js";

const BEACON_POLICY = "12".repeat(28);
const AUTHORITY     = "ab".repeat(28);
const REGISTRY_HASH = "4e".repeat(28);
const STAKE_HASH    = "57".repeat(28);

let workDir: string;
beforeAll(() => { workDir = mkdtempSync(join(tmpdir(), "registry-e2e-")); });
afterAll(() => { rmSync(workDir, { recursive: true, force: true }); });

/** CHẶNG 1 — nộp: đội đăng ký đặt một tệp hồ sơ vào repo. */
function submit(name: string, declaration: Record<string, unknown>): string {
  const p = join(workDir, `${name}.md`);
  writeFileSync(p, `# hồ sơ thử\n\n\`\`\`json registration\n${JSON.stringify(declaration, null, 2)}\n\`\`\`\n`);
  return p;
}

/** Hồ sơ khai đủ mọi trục ở mã cao nhất, mọi ô ĐÚNG HÌNH DẠNG. */
const fullDeclaration = (pid: string) => ({
  platform_id: pid,
  spec_version: 2,
  declares: { identity: "ID-3", token: "TK-1", custody: "CU-1", infra: "IN-3" },
  pointers: {
    dau_moi_lien_he: "ai-do@vi-du.example",
    repo: "MagicLampEco/vi-du",
    con_tro: "src/danh-tinh/phoenixkey.ts:142 · nhánh main · SHA 5c0da0371f2b8ae4",
    instance_id: "vi-du-instance-01",
    custody_hash:   "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
    seed_policy:    "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
    governance_ref: "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
    governance_ref_tinh_chat:
      "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; " +
      "G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
    accepted_assets: ["LAMP"],
    cut_bps: 250,
    // L3 đòi `ownership_min: 1`, nên hồ sơ "khai đủ mọi trục ở mã cao nhất" phải có ô này. Trục
    // `ownership` không nằm trong `declares`: nó là trục TUỲ CHỌN, bộ chấm suy hạng từ ô đã điền.
    chu_so_huu: "Công ty Ví Dụ",
  },
  evidence: [
    { claim: "doanh thu", tier: "EV-2", pointer: "tx " + "52fc9630da741eb8".repeat(4) },
  ],
});

/**
 * CHẶNG 3 — dựng giao dịch, và đây là KHỚP NỐI đang được kiểm.
 *
 * Mọi giá trị đều lấy từ `result.khai` — tức từ CHÍNH lượt chấm ở chặng 2, không bóc lại khối
 * json lần hai. Bóc hai lần là hai đường lệch nhau được; một đường thì không.
 */
function planFromDeclaration(declaration: Record<string, any>) {
  const p = declaration.pointers;
  const cfg: PlatformConfig = {
    platformId: asciiToHex(String(declaration.platform_id)),
    instanceId: asciiToHex(String(p.instance_id)),
    acceptedAssets: [{ policy: "", name: "" }],
    buckets: [{ id: 0n, label: "ops" }],
    cutBps: BigInt(p.cut_bps),
    governanceRef: String(p.governance_ref),
    msPerTimeBucket: MS_PER_TIME_BUCKET,
    reservedMinAda: 2_000_000n,
    registryAuthority: AUTHORITY,
    genesisRef: { transaction_id: "ff".repeat(32), output_index: 0n },
  };
  return planRegister({
    config: cfg,
    beaconPolicy: BEACON_POLICY,
    custodyHash: String(p.custody_hash),
    seedPolicy: String(p.seed_policy),
    createdEpoch: 10n,
    // R-GOVLIVE: cổng quản trị phải chạy thật trong tx đăng ký.
    governanceProof: { spends: [{ scriptHash: String(p.governance_ref) }] },
    custodyUtxo: {
      value: {
        [`${String(p.seed_policy)}|${asciiToHex(String(p.instance_id)).toLowerCase()}`]: 1n,
        "|": 2_000_000n,
      },
      scriptHash: String(p.custody_hash),
    },
  });
}

/** CHẶNG 6 — sổ trên chuỗi: một ô UTxO mang beacon NFT + inline datum. */
function ledgerUtxo(
  entry: Parameters<typeof platformEntryToCbor>[0],
  txHash = "aa".repeat(32),
  addr: { scriptHash?: string; stakeCredential?: string | null } = {},
): QueryUtxo {
  return {
    assets: { lovelace: 2_000_000n, [BEACON_POLICY + entry.platform_id]: 1n },
    datum: platformEntryToCbor(entry),
    txHash,
    outputIndex: 0,
    ...addr,
  };
}

describe("E2E · trục tuỳ chọn `ownership` KHÔNG phải điều kiện vào", () => {
  // Bài này đo đúng cái giá của quyết định: khai chủ sở hữu đổi được HẠNG NIÊM YẾT, và không đổi
  // gì khác. Nếu ai đó lỡ tay biến nó thành điều kiện vào — cho `ownership` vào `AXES`, hay cho
  // `ownership_min` xuống L0/L1/L2 — thì ca thứ nhất dưới đây đỏ.
  it("không khai chủ vẫn HỢP LỆ, không lỗi nào, chỉ dừng ở L2", () => {
    const kh = fullDeclaration("khong-chu") as any;
    delete kh.pointers.chu_so_huu;
    const r = checkOne(submit("khong-chu", kh));
    expect(r.loi ?? []).toEqual([]);
    expect(r.hop_le).toBe(true);
    expect(r.tier?.id).toBe("L2");
    expect(r.ranks?.ownership).toBe(0);
  });

  it("khai chủ ⇒ hạng 1 ⇒ mở L3; thêm chứng nhận của bên không hưởng lợi ⇒ hạng 2", () => {
    const r1 = checkOne(submit("co-chu", fullDeclaration("co-chu")));
    expect(r1.ranks?.ownership).toBe(1);
    expect(r1.tier?.id).toBe("L3");

    const kh2 = fullDeclaration("co-chung-nhan") as any;
    kh2.pointers.chung_nhan_chu_so_huu =
      "Kiểm toán Ví Dụ ký xác nhận lời khai chủ sở hữu này — tra lại ở kiem-toan@vi-du.example";
    const r2 = checkOne(submit("co-chung-nhan", kh2));
    expect(r2.ranks?.ownership).toBe(2);
    expect(r2.loi ?? []).toEqual([]);
  });

  it("khai mã OW-1 mà bỏ trống ô thì ĐỎ — lời khai rỗng không được tính là một lời khai", () => {
    const kh = fullDeclaration("khai-rong") as any;
    delete kh.pointers.chu_so_huu;
    kh.declares.ownership = "OW-1";
    const r = checkOne(submit("khai-rong", kh));
    expect((r.loi ?? []).join(" ")).toContain("chu_so_huu");
    expect(r.tier?.id).toBe("L2");
  });

  it("chứng nhận có đầu mối nhưng quá ngắn vẫn ĐỎ — hai phép kiểm, không phải một", () => {
    // Ca này khoá riêng SÀN ĐỘ DÀI. Ca dưới khoá riêng phép "tra lại được". Gộp làm một bài thì
    // hạ sàn độ dài xuống 1 vẫn xanh — đã đo bằng đột biến, và đó là lý do có hai bài.
    const kh = fullDeclaration("chung-nhan-ngan") as any;
    kh.pointers.chung_nhan_chu_so_huu = "a@b.example";
    const r = checkOne(submit("chung-nhan-ngan", kh));
    expect(r.sai_khuon).toBe(true);
    expect((r.loi ?? []).join(" ")).toContain("40 ký tự");
  });

  it("chứng nhận phải TRA LẠI ĐƯỢC — một chữ \"có\" không phải chứng nhận", () => {
    const kh = fullDeclaration("chung-nhan-rong") as any;
    kh.pointers.chung_nhan_chu_so_huu = "có, chủ sở hữu đúng như hồ sơ đã khai ở trên, xin xác nhận";
    const r = checkOne(submit("chung-nhan-rong", kh));
    expect(r.sai_khuon).toBe(true);
    expect((r.loi ?? []).join(" ")).toContain("chung_nhan_chu_so_huu");
  });
});

/**
 * CHẶNG 6b — đường đọc THỨ HAI: `utxosAt(<địa chỉ>)`.
 *
 * Đây là đường mà `scripts/02_*` và `scripts/03_*` thật sự dùng — địa chỉ dựng ở
 * `scripts/config.ts:126` bằng `credentialToAddress`, tức ENTERPRISE, không phần stake. Mô hình
 * hoá nó ở đây vì hai đường đọc sổ này KHÔNG tương đương, và chỗ chúng lệch nhau là chỗ một hồ
 * sơ hợp lệ biến mất mà không phép đo nào đỏ.
 */
function utxosAtEnterprise(utxos: QueryUtxo[], scriptHash: string): QueryUtxo[] {
  return utxos.filter(
    (u) => u.scriptHash === scriptHash && (u.stakeCredential === null || u.stakeCredential === undefined),
  );
}

describe("E2E · đường xuôi — hồ sơ nộp vào đầu này, tìm lại được ở đầu kia", () => {
  it("1 nộp → 2 chấm ra L3 → 3 dựng tx → 6 quét sổ tìm lại đúng platform đó", () => {
    // ── 1 ──
    const path = submit("thu-l3", fullDeclaration("thu-l3"));

    // ── 2 ──
    const scored = checkOne(path);
    expect(scored.loi ?? []).toEqual([]);
    expect(scored.hop_le).toBe(true);
    expect(scored.tier?.id).toBe("L3");
    expect(scored.khai).toBeDefined();

    // ── 3 ── (dùng scored.khai, không bóc lại tệp)
    const plan = planFromDeclaration(scored.khai!);

    // Khớp nối phải khít: tên NFT beacon = platform_id đã khai ở chặng 1, qua đúng một phép mã hoá.
    expect(plan.nftName).toBe(asciiToHex("thu-l3"));
    expect(plan.entry.platform_id).toBe(plan.nftName);
    expect(plan.entry.status).toBe("Active");
    expect(plan.requiredSigner).toBe(AUTHORITY);

    // ── 6 ──
    const ledger = discoverPlatforms([ledgerUtxo(plan.entry)], BEACON_POLICY);
    expect(ledger).toHaveLength(1);
    const found = findPlatform(ledger, asciiToHex("thu-l3"));
    expect(found).toBeDefined();

    // Vòng khép: thứ đọc ra từ sổ phải bằng đúng thứ đã khai ở chặng 1.
    const origin = fullDeclaration("thu-l3");
    expect(found!.entry.platform_id).toBe(asciiToHex(origin.platform_id));
    expect(found!.entry.custody_hash).toBe(origin.pointers.custody_hash);
    expect(found!.entry.seed_policy).toBe(origin.pointers.seed_policy);
    expect(found!.entry.governance_ref).toBe(origin.pointers.governance_ref);
  });
});

describe("E2E · ba ca âm — luồng phải DỪNG đúng chặng, không trôi sang chặng sau", () => {
  it("platform_id chứa chữ Kirin: chặng 2 chặn, và chuỗi đó KHÔNG bao giờ tới chặng 3", () => {
    // "chаt" — chữ "а" là U+0430 (Kirin), trông y hệt "a" ASCII.
    const scored = checkOne(submit("kirin", fullDeclaration("chаt")));

    expect(scored.hop_le).toBe(false);
    expect(scored.sai_khuon).toBe(true);
    expect(scored.pid_hop_khuon).toBe(false);
    // Thông báo phải nêu code point — người đọc không phân biệt được hai chữ này bằng mắt.
    expect(scored.loi!.join(" ")).toContain("U+0430");

    // Và có cổng THỨ HAI, độc lập với cổng trên: `asciiToHex` từ chối mã hoá ký tự ngoài ASCII,
    // nên chuỗi Kirin không có đường nào thành tên NFT beacon kể cả khi ai đó gỡ cổng chặng 2.
    // Hai cổng đứng ở hai tầng khác nhau (bộ chấm văn bản · bộ mã hoá tx) là điều đáng giữ —
    // ghi ra đây để lần sau có người "dọn cho gọn" thì thấy nó không thừa.
    expect(() => asciiToHex("chаt")).toThrow(/ngoài ASCII/);
    expect(() => asciiToHex("chat")).not.toThrow();
  });

  it("hồ sơ chấm L0 vì thiếu governance_ref: chặng 3 KHÔNG có đầu vào để dựng", () => {
    const declaration = fullDeclaration("thieu-gov") as any;
    declaration.pointers.governance_ref = "";
    declaration.pointers.governance_ref_tinh_chat = "";

    const scored = checkOne(submit("thieu-gov", declaration));

    // Thiếu dữ kiện KHÔNG phải căn cứ từ chối — hồ sơ vẫn được tiếp nhận, chỉ tụt hạng.
    expect(scored.sai_khuon).toBeFalsy();
    expect(scored.tier?.id ?? "L0").toBe("L0");
    expect(scored.loi!.join(" ")).toContain("governance_ref");

    // Nhưng hạng thấp không phải chuyện thẩm mỹ: đúng ô đang trống là ô chặng 3 bắt buộc phải có.
    expect(() => planFromDeclaration(scored.khai!)).toThrow();
  });

  it("hai hồ sơ khác nhau cùng platform_id: sổ ở chặng 6 bắt được trùng", () => {
    const base = fullDeclaration("trung-ten");
    const a = checkOne(submit("trung-a", base));
    const b = checkOne(submit("trung-b", {
      ...base,
      // instance khác, TÊN GIỐNG
      pointers: { ...base.pointers, instance_id: "vi-du-instance-02" },
    }));
    expect(a.hop_le).toBe(true);
    expect(b.hop_le).toBe(true);

    const planA = planFromDeclaration(a.khai!);
    const planB = planFromDeclaration(b.khai!);
    // Hai hồ sơ hợp lệ riêng lẻ, khác instance — nhưng cùng một tên.
    expect(planA.entry.instance_id).not.toBe(planB.entry.instance_id);
    expect(planA.entry.platform_id).toBe(planB.entry.platform_id);

    const dupes = findDuplicatePlatformIds(
      discoverPlatforms(
        [ledgerUtxo(planA.entry, "aa".repeat(32)), ledgerUtxo(planB.entry, "bb".repeat(32))],
        BEACON_POLICY,
      ),
    );
    expect(dupes.size).toBe(1);
    const [dupId, group] = [...dupes.entries()][0]!;
    expect(dupId).toBe(asciiToHex("trung-ten").toLowerCase());
    expect(group).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HAI ĐƯỜNG ĐỌC SỔ — và chỗ chúng KHÔNG bằng nhau.
//
// Sổ có hai đường đọc, và repo cho tới nay chỉ có bài kiểm cho MỘT:
//   · theo BEACON NFT  — `discoverPlatforms`, đường của SDK. Mù với địa chỉ, nên tìm ra hồ sơ
//     ở mọi địa chỉ.
//   · theo ĐỊA CHỈ     — `utxosAt(<địa chỉ enterprise>)`, đường của `scripts/02_*`/`03_*`.
//
// Chúng bằng nhau CHỈ KHI mọi ô hồ sơ nằm ở địa chỉ enterprise. Không bài kiểm nào từng phát
// biểu điều kiện ấy, nên nó chưa bao giờ được ép — và đó chính là chỗ Math-Spec §8 T16 nấp:
// một ô ở biến thể stake của ĐÚNG registry hash thì đường thứ nhất thấy, đường thứ hai không.
//
// Nay điều kiện ấy được ép on-chain ở cả ba cửa (R-ADDR/U-ADDR/M-ADDR), nên trạng thái dưới
// đây KHÔNG dựng được trên chuỗi nữa. Bài kiểm vẫn dựng nó bằng tay, có chủ ý: nó đo cái
// KHOẢNG CÁCH giữa hai đường đọc, tức thứ giải thích vì sao ràng buộc kia phải tồn tại. Bỏ
// bài này đi thì ai đó gỡ ba dòng gác on-chain sẽ không thấy gì hỏng ở tầng off-chain.
// ════════════════════════════════════════════════════════════════════════════
describe("E2E · hai đường đọc sổ phải trả cùng một tập hồ sơ", () => {
  function entryAt(name: string) {
    const scored = checkOne(submit(name, fullDeclaration(name)));
    expect(scored.hop_le).toBe(true);
    return planFromDeclaration(scored.khai!).entry;
  }

  it("ô ở địa chỉ ENTERPRISE: cả hai đường đọc đều tìm ra, và van #4 kết là sạch", () => {
    const entry = entryAt("dia-chi-thuong");
    const utxo = ledgerUtxo(entry, "aa".repeat(32), {
      scriptHash: REGISTRY_HASH, stakeCredential: null,
    });

    // đường 1 — theo beacon NFT
    const byNft = discoverPlatforms([utxo], BEACON_POLICY, { registryScriptHash: REGISTRY_HASH });
    expect(byNft).toHaveLength(1);
    expect(byNft[0]!.foreignScript).toBe(false);
    // `=== false` chứ không phải `!...`: undefined nghĩa là CHƯA ĐO, không phải sạch.
    expect(byNft[0]!.stakedVariant).toBe(false);

    // đường 2 — theo địa chỉ
    expect(utxosAtEnterprise([utxo], REGISTRY_HASH)).toHaveLength(1);
  });

  it("ô ở BIẾN THỂ STAKE của đúng registry: đường NFT thấy, đường ĐỊA CHỈ không — van #4 bắt", () => {
    const entry = entryAt("bien-the-stake");
    const utxo = ledgerUtxo(entry, "cc".repeat(32), {
      scriptHash: REGISTRY_HASH, stakeCredential: STAKE_HASH,
    });

    const byNft = discoverPlatforms([utxo], BEACON_POLICY, { registryScriptHash: REGISTRY_HASH });

    // Đây là chỗ đắt: van #3 XANH. Payment credential đúng là registry thật, nên mọi phép kiểm
    // "hồ sơ có ở đúng script không" đều nói CÓ. Không có van #4 thì SDK báo hồ sơ này lành.
    expect(byNft).toHaveLength(1);
    expect(byNft[0]!.foreignScript).toBe(false);
    expect(byNft[0]!.stakedVariant).toBe(true);

    // Và hai đường đọc BẤT ĐỒNG: đường địa chỉ trả sổ TRỐNG cho cùng một ô hồ sơ hợp lệ.
    expect(utxosAtEnterprise([utxo], REGISTRY_HASH)).toHaveLength(0);

    // Cái này mới là thiệt hại thật: không phải mất tiền, mà là hồ sơ có thật, hợp lệ, mang
    // beacon NFT thật — và người tra sổ bằng đường chuẩn kết luận "platform này chưa đăng ký".
    expect(findPlatform(byNft, entry.platform_id)).toBeDefined();
  });

  it("van #4 KHÔNG kết khi bên gọi chưa cấp stakeCredential — chưa đo, không phải sạch", () => {
    const entry = entryAt("chua-do");
    const utxo = ledgerUtxo(entry, "dd".repeat(32), { scriptHash: REGISTRY_HASH });

    const byNft = discoverPlatforms([utxo], BEACON_POLICY, { registryScriptHash: REGISTRY_HASH });
    expect(byNft[0]!.foreignScript).toBe(false);
    // undefined, KHÔNG phải false. Ai đọc `!stakedVariant` thành "an toàn" sẽ đọc ca này sai.
    expect(byNft[0]!.stakedVariant).toBeUndefined();
  });

  it("van #4 im khi hồ sơ ở SCRIPT LẠ — câu 'biến thể stake của registry' không phát biểu được", () => {
    const entry = entryAt("script-la");
    const utxo = ledgerUtxo(entry, "ee".repeat(32), {
      scriptHash: "be".repeat(28), stakeCredential: STAKE_HASH,
    });

    const byNft = discoverPlatforms([utxo], BEACON_POLICY, { registryScriptHash: REGISTRY_HASH });
    // Van #3 đã kết rồi; van #4 không chồng lên nó một lời kết thứ hai về cùng một ô.
    expect(byNft[0]!.foreignScript).toBe(true);
    expect(byNft[0]!.stakedVariant).toBeUndefined();
  });
});
