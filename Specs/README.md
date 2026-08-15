# Specs — đặc tả sống của Registry

| Trường | Giá trị |
|---|---|
| Phiên bản | v1.1.0 |
| Trạng thái | `DRAFT` (mục lục — theo trạng thái thấp nhất của các tệp nó dẫn) |
| Tầng phạm vi | `L1` (hạ tầng / nền tảng) |
| Người viết | Registry agent |
| Người duyệt | **chưa ai duyệt** |
| Cập nhật cuối | 2026-08-13 |
| Bộ trạng thái | StandardSpec — `DRAFT / IN-REVIEW / REVISE / APPROVED / CONDITIONALLY-APPROVED / LOCKED / SUPERSEDED / ARCHIVED / ABANDONED` (`TigerAgent/StandardSpec/_shared/overview/SPEC-OVERVIEW.md` Sơ đồ 4) |

Registry ở **tầng hạ tầng nền** và là hai validator on-chain, nên theo chuẩn StandardSpec tầng này
đòi **đủ bốn** đặc tả — Feat, Math, Tech, Exec — không được cắt bớt. Bốn đặc tả đó, cộng bản hợp
đồng interface và một tài liệu hướng dẫn:

| File | Trả lời câu hỏi | Trạng thái |
|---|---|---|
| [CONTRACT.md](CONTRACT.md) | Interface khoá + chỉ mục 11 bất biến `PK1…PK11`. Cái gì KHÔNG ai được đổi. | `DRAFT` |
| [Math-Spec.md](Math-Spec.md) | **Phát biểu hình thức** của 11 bất biến, mô hình tin cậy, bảng kẻ tấn công, mục giới hạn. | `DRAFT` |
| [Feat-Spec.md](Feat-Spec.md) | Hành vi: ba cửa onboarding, adapter thu phí, discover, vòng đời niêm yết. | `DRAFT` |
| [Tech-Spec.md](Tech-Spec.md) | Kiến trúc on-chain (2 validator) + off-chain SDK + mô hình đe doạ + phụ lục blockchain. | `DRAFT` |
| [Exec-Spec.md](Exec-Spec.md) | Lộ trình bootstrap M0…M6 (mười thành phần mỗi mốc), rủi ro vận hành. | `DRAFT` |
| [onboarding.md](onboarding.md) | Hướng dẫn từng bước cho team muốn onboard (a→f). | `DRAFT` |

> ⚠ **Chưa tệp nào được duyệt.** Chuẩn StandardSpec quy định phía sau chỉ được bắt đầu khi đặc tả
> phía trước **đã duyệt**. SDK off-chain đã dựng xong trên nền một đặc tả chưa qua cổng đó. Ghi ra để
> không ai tưởng đã qua.

Chuẩn dành cho bên đăng ký nằm ở [../REGISTRATION-STANDARD.md](../REGISTRATION-STANDARD.md) —
đó là tài liệu một platform đọc TRƯỚC khi nộp hồ sơ; các tệp trên là đặc tả đầy đủ của cơ chế.
Hiện trạng thi công (nhánh nào, đã commit chưa) đọc ở [../DevStatus.md](../DevStatus.md); chuyện đã
xảy ra đọc ở [../ChangeLog.md](../ChangeLog.md).

---

## Quy ước đường dẫn trong các file trên

Các file này viết khi Registry còn nằm trong repo LAMP, nên đường dẫn tương đối trong đó
đọc theo quy ước sau — **chỉ ghi ở đây một lần**, không sửa rải rác vào từng file:

| Dạng đường dẫn | Trỏ tới |
|---|---|
| `onchain/...` | Trong repo này. ⚠ Script hash **đã đổi** ở đợt sửa v2 (đổi có chủ ý) — đọc hash hiện hành bằng `cd onchain && aiken build` rồi xem `plutus.json`, đừng chép hash từ tài liệu cũ. |
| `Treasury/...`, `Governance/...`, `Genesis/...` | Repo [`MagicLampNetwork/LAMP`](https://github.com/MagicLampNetwork/LAMP), tính từ gốc repo đó. |
| `offchain/...`, `examples/...`, `scripts/...`, `tests/...` | Đang được chuyển về repo này. Trạng thái thật (đã track chưa, ở nhánh nào) đọc ở [../DevStatus.md](../DevStatus.md) — kiểm bằng `git log --oneline -3 -- offchain/`. Bản gốc vẫn ở `PlatformKit/` trong repo LAMP. |

## Con số kiểm thử — KHÔNG chép vào đây

Các con số cũ (`aiken check` toàn cây Treasury, `vitest` off-chain, `30/30` của riêng cây này) đo
**trước** đợt sửa validator v2, nên không còn đối chiếu được. Không chép số vào tài liệu — chạy lệnh:

```bash
cd onchain && aiken check && aiken build     # on-chain
cd offchain && npm test                      # off-chain
```

Hiện trạng có số liệu kèm lệnh kiểm nằm ở [../DevStatus.md](../DevStatus.md) — **nơi duy nhất** phát
biểu hiện trạng.
