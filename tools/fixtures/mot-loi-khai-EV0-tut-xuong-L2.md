# y hệt trên nhưng một lời khẳng định còn EV-0
```json registration
{
  "platform_id": "thu-ev0", "spec_version": 2,
  "declares": { "identity": "ID-3", "token": "TK-1", "custody": "CU-1", "infra": "IN-3" },
  "pointers": {
    "dau_moi_lien_he": "ai-do@vi-du", "repo": "x", "con_tro": "x:1",
    "instance_id": "aa", "custody_hash": "bb", "seed_policy": "cc",
    "governance_ref": "dd", "accepted_assets": ["LAMP"], "cut_bps": 250
  },
  "evidence": [ { "claim": "doanh thu", "tier": "EV-2", "pointer": "tx abc" },
                { "claim": "lượt dùng", "tier": "EV-0", "pointer": "máy chủ tự đếm" } ]
}
```
