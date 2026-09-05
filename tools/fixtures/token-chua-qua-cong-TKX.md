# token riêng chưa qua cổng

Mọi ô khác đều đúng hình dạng, có chủ ý: fixture này khoá đúng MỘT tính chất — TK-X là căn cứ từ
chối — nên nó không được đỏ vì bất cứ lý do nào khác.

```json registration
{
  "platform_id": "thu-tkx", "spec_version": 2,
  "declares": { "identity": "ID-3", "token": "TK-X", "custody": "CU-1", "infra": "IN-3" },
  "pointers": {
    "dau_moi_lien_he": "ai-do@vi-du.example",
    "con_tro": "src/token/mint.ts:88 · nhánh main · SHA 5c0da0371f2b8ae4",
    "platform_id_he_danh_tinh": "phoenixkey",
    "bang_chung_khong_phu_thuoc": "command grep -rn 'firebase|onesignal' src/ -> 0 dong",
    "instance_id": "vi-du-instance-02",
    "custody_hash": "e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b",
    "seed_policy": "50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72",
    "governance_ref": "72d83e94fa50b61c72d83e94fa50b61c72d83e94fa50b61c72d83e94",
    "governance_ref_tinh_chat": "G1 script chạy được (withdrawal-0); G2 khác hash validator registry; G3 không nhánh permissionless; G4 nhánh đồng thuận không mint",
    "accepted_assets": ["X"], "cut_bps": 0
  },
  "evidence": []
}
```
