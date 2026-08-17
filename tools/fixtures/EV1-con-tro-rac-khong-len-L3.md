# thử con trỏ rác ở hạng chứng thực EV-1

Bản sao của `day-du-L3.md`, đổi đúng MỘT thứ: lời khẳng định hạ từ `EV-2` xuống `EV-1` và con trỏ
thay bằng một chuỗi bịa. Mọi ô khác vẫn đúng hình dạng.

Vì sao có fixture này: bộ chấm từng chỉ áp luật ba-thứ (REGISTRATION-STANDARD.md §3) cho `EV-2`
trở lên. `EV-1` chỉ phải qua sàn tối thiểu — dài ≥ 8 ký tự và không nằm trong tập giữ chỗ. Đo được
(2026-08-17): hồ sơ này chấm ra **L3**, tức hạng cấp uy tín và quyền biểu quyết ở tầng hệ, mở bằng
một chuỗi 17 ký tự không trỏ tới đâu cả. `L3` đòi `evidence_min = 1`, và `EV-1` thoả đúng ngưỡng đó.

Đây là cùng một lỗ với R-04 — hạng mở bằng số ký tự người ta gõ — còn sót lại trên trục chứng thực
sau khi bốn trục khai báo đã được bịt. Chuẩn §3 viết "**MỌI** con trỏ chứng cứ phải mang ba thứ";
chỗ này là chỗ máy nói hẹp hơn chuẩn nó phục vụ.

Khẳng định bài kiểm khoá: hồ sơ này **không** được ra `L3`. Lời khẳng định phải bị hạ về `EV-0`
kèm lý do đọc được, và hồ sơ dừng ở `L2`.

```json registration
{
  "platform_id": "thu-ev1-rac", "spec_version": 2,
  "declares": { "identity": "ID-3", "token": "TK-1", "custody": "CU-1", "infra": "IN-3" },
  "pointers": {
    "dau_moi_lien_he": "ai-do@vi-du.example",
    "repo": "MagicLampEcosystem/vi-du",
    "con_tro": "src/danh-tinh/phoenixkey.ts:142 · nhánh main · SHA 5c0da0371f2b8ae4",
    "instance_id": "vi-du-instance-01",
    "custody_hash": "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
    "seed_policy": "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
    "governance_ref": "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
    "governance_ref_tinh_chat": "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
    "accepted_assets": ["LAMP"], "cut_bps": 250
  },
  "evidence": [
    { "claim": "doanh thu", "tier": "EV-1", "pointer": "khong-co-gi-o-day" }
  ]
}
```
