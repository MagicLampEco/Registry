# thử hạng cao nhất

Mọi ô đều mang giá trị ĐÚNG HÌNH DẠNG, vì đó là điều kiện để hạng tính ra có nghĩa: hash 28 byte
là 56 hex, con trỏ mang đủ ba thứ (`file:line` + tên nhánh + SHA — REGISTRATION-STANDARD.md §3),
lời khẳng định EV-2 neo bằng tx hash 64 hex. Bản trước của fixture này gõ "aa"/"bb"/"cc" vào các ô
đó mà vẫn ra L3 — chính lỗ R-04.

```json registration
{
  "platform_id": "thu-l3", "spec_version": 2,
  "declares": { "identity": "ID-3", "token": "TK-1", "custody": "CU-1", "infra": "IN-3" },
  "pointers": {
    "dau_moi_lien_he": "ai-do@vi-du.example",
    "repo": "MagicLampEco/vi-du",
    "con_tro": "src/danh-tinh/phoenixkey.ts:142 · nhánh main · SHA 5c0da0371f2b8ae4",
    "instance_id": "vi-du-instance-01",
    "custody_hash": "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
    "seed_policy": "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
    "governance_ref": "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
    "governance_ref_tinh_chat": "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
    "accepted_assets": ["LAMP"], "cut_bps": 250,
    "chu_so_huu": "Công ty Ví Dụ"
  },
  "evidence": [
    { "claim": "doanh thu", "tier": "EV-2", "pointer": "tx 52fc9630da741eb852fc9630da741eb852fc9630da741eb852fc9630da741eb8" }
  ]
}
```
