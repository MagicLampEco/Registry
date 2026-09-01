// @magiclamp/registry-kit — SDK off-chain của cổng đăng ký MagicLamp.
//
// Cổng đăng ký = nơi mọi platform/dịch vụ trong hệ khai một hồ sơ (PlatformEntry) trỏ tới kho
// riêng của mình, và người khác quét sổ để tìm. Sổ KHÔNG giữ giá trị; kho là của từng dịch vụ.
//
// Gồm: lược đồ (types) + codec datum/redeemer v2 + builder (đăng ký/cập nhật/di trú) + adapter
// thu phí (trung lập chính sách giá) + quét sổ kèm bốn van đối soát trước khi route phí.
//
// KHÔNG có phụ thuộc nhập nào ra ngoài repo Registry. Kiểu mượn của Treasury được khai lại tại
// chỗ ở ./treasuryShapes.js; hàm dựng kho / dựng tx thu phí đi vào bằng THAM SỐ (tiêm phụ thuộc).

export * from "./types.js";
export * from "./treasuryShapes.js";
export * from "./encoding.js";
export * from "./registryDatum.js";
export * from "./registrationBuilder.js";
export * from "./onboard.js";
export * from "./collectAdapter.js";
export * from "./registryQuery.js";
