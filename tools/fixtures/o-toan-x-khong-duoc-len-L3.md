# tám ô gõ chữ "x" — KHÔNG được chấm ra hạng nào

Ca đo được của vòng rà soát đối kháng (lỗ R-04): bản trước mọi `needs` chỉ kiểm KHÁC RỖNG, nên hồ
sơ này — chữ "x" ở cả tám ô, một lời khẳng định EV-1 với con trỏ RỖNG — vẫn chấm ra **L3**, hạng
cấp quyền biểu quyết ở tầng hệ. Hạng niêm yết được quảng cáo là "tính ra từ mã đã khai"; nếu đầu
vào không kiểm được bằng máy thì hạng chỉ phản ánh số ký tự người ta gõ.

```json registration
{
  "platform_id": "thu-toan-x", "spec_version": 2,
  "declares": { "identity": "ID-3", "token": "TK-1", "custody": "CU-1", "infra": "IN-3" },
  "pointers": {
    "dau_moi_lien_he": "x", "con_tro": "x", "instance_id": "x",
    "custody_hash": "x", "seed_policy": "x", "governance_ref": "x",
    "governance_ref_tinh_chat": "x", "accepted_assets": ["x"], "cut_bps": 250,
    "platform_id_he_danh_tinh": "x", "bang_chung_khong_phu_thuoc": "x"
  },
  "evidence": [ { "claim": "doanh thu", "tier": "EV-1", "pointer": "" } ]
}
```
