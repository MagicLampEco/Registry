// Kiểu cho `tools/check-registration-core.mjs` — viết tay, vì lõi là JavaScript thuần.
//
// Vì sao có tệp này: bài kiểm E2E (`tests/e2eRegistrationFlow.test.ts`) là TypeScript và phải
// nhập lõi để nối chặng 2 (chấm hồ sơ) với chặng 3 (dựng giao dịch). Không có khai báo kiểu thì
// lựa chọn còn lại là `@ts-expect-error`, mà cách đó tắt kiểm kiểu cho CẢ lời gọi — chặng nối
// quan trọng nhất của luồng lại là chặng duy nhất không được kiểm.
//
// ⚠ Tệp này KHÔNG tự đồng bộ với lõi. Sửa chữ ký hàm trong `.mjs` thì sửa cả ở đây.

/** Mã bốn trục khai báo BẮT BUỘC, theo `Registrations/codes.json`. */
export declare const AXES: readonly ['identity', 'token', 'custody', 'infra']

/**
 * Trục TUỲ CHỌN — không khai vẫn hợp lệ, chỉ ảnh hưởng hạng niêm yết.
 *
 * Tách khỏi `AXES` chứ không nối vào: whitepaper §10 đóng tập điều kiện vào ở BA, nên một trục
 * mà thiếu là hồ sơ đỏ sẽ là điều kiện thứ tư. Kiểu ở đây phải giữ đúng ranh đó — ai gộp hai
 * hằng này làm một danh sách thì kiểu không cản được, nên ranh nằm ở dòng chữ này.
 */
export declare const AXES_TUY_CHON: readonly ['ownership']

/** Gốc repo, suy ra từ vị trí tệp lõi. */
export declare const ROOT: string

/** Nội dung `Registrations/codes.json` đã giải mã. */
export declare const CODES: {
  spec_version: string
  axes: Record<string, {
    codes: Record<string, { rank?: number | null; needs?: string[] }>
    /** Chỉ trục tuỳ chọn mới có: mã dùng khi hồ sơ không khai và không dữ kiện nào đủ hạng cao hơn. */
    mac_dinh?: string
    tuy_chon?: boolean
  }>
  listing_tiers: Record<string, { rank: number; label: string; require: Record<string, unknown> }>
}

/** `null` = đạt khuôn. Ngược lại là thông báo nêu khuôn mong đợi + ký tự vi phạm đầu tiên. */
export declare function loiKhuonPid(raw: unknown): string | null

/**
 * Khoá gom cụm cho ô `chu_so_huu`: NFKC + gom khoảng trắng + `toLowerCase`, KHÔNG gấp đồng hình.
 * Xem lý do đầy đủ ở lõi — gấp đồng hình lên tên người sẽ gộp hai chủ khác nhau thật làm một.
 */
export declare function KHOA_CHU(s: unknown): string

export interface KetQuaCham {
  path: string
  /** Không lỗi nào. Chú ý: đây là hợp lệ về HÌNH DẠNG, không phải "đã duyệt". */
  hop_le: boolean
  /** Tệp chưa có khối ```json registration — chưa phải một lời khai. */
  chua_nop?: boolean
  /** Đã khai nhưng khai thứ máy không đọc được. Khác hẳn ô để TRỐNG. */
  sai_khuon?: boolean
  loi?: string[]
  canh?: string[]
  /** Hạng niêm yết tính ra từ mã đã khai; `null` = không đạt hạng nào. */
  tier: { id: string; label: string } | null
  platform_id?: unknown
  pid_hop_khuon?: boolean
  ranks?: Record<string, number | null>
  evMin?: number | null
  /** Vế 1/2 của R2 đã thoả (ô đầu mối trống). CHƯA phải kết luận R2 — vế 2 máy không đọc được. */
  r2_ve1?: boolean
  /** Khối khai THÔ. Chặng sau lấy lời khai từ CHÍNH lượt chấm, không tự bóc lại. */
  khai?: Record<string, any>
  /**
   * Lời khai chủ sở hữu, đã cắt khoảng trắng; `null` = hồ sơ không khai (vẫn hợp lệ — ô này là
   * lời khai, không phải cổng). VẮNG hẳn khi lượt chấm dừng sớm ở nhánh chưa nộp / sai hình dạng,
   * nên `undefined` và `null` KHÁC nghĩa: một bên là "chưa chấm tới", một bên là "chấm rồi, không khai".
   */
  chu_so_huu?: string | null
}

/** Chấm MỘT hồ sơ. Không in gì, không gọi `process.exit`. R1 không thuộc hàm này. */
export declare function checkOne(path: string): KetQuaCham
