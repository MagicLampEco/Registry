// Registry onchain types — phần schema dùng chung với Treasury.
//
// ⚠️ RÀNG BUỘC LIÊN REPO: `AssetKey` ở đây phải khớp BYTE-PERFECT với `AssetKey`
// của Treasury (`MagicLampEco/LAMP` — `Treasury/onchain/lib/magiclamp/treasury/
// types.ak`) vì `PlatformEntry.accepted_assets` được đối soát với `CustodyDatum.
// accepted_assets` của custody. Cấu trúc: Constr 0 với đúng 2 field ByteArray theo
// thứ tự (policy, name). Đổi thứ tự hay thêm field ở một bên mà không đổi bên kia
// = entry và custody hết đối soát được.
//
// Nguồn chân lý của schema custody là Treasury; bản ở đây là bản-gương tối thiểu
// để Registry biên dịch độc lập (Registry KHÔNG cần biết phần còn lại của
// CustodyDatum). Test đối chiếu CBOR: `validators/registry_test.ak`.

/// Asset được nhận (đa thuê bao). Chỉ dùng (policy, name).
/// ADA: policy = #"" , name = #"".
pub type AssetKey {
  policy : ByteArray,
  name   : ByteArray,
}
