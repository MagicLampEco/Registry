// Kiểu cho `tools/check-registration-core.mjs` — viết tay, vì lõi là JavaScript thuần.
//
// Vì sao có tệp này: bài kiểm E2E (`tests/e2eRegistrationFlow.test.ts`) là TypeScript và phải
// nhập lõi để nối chặng 2 (chấm hồ sơ) với chặng 3 (dựng giao dịch). Không có khai báo kiểu thì
// lựa chọn còn lại là `@ts-expect-error`, mà cách đó tắt kiểm kiểu cho CẢ lời gọi — chặng nối
// quan trọng nhất của luồng lại là chặng duy nhất không được kiểm.
//
// ⚠ Tệp này KHÔNG tự đồng bộ với lõi. Sửa chữ ký hàm trong `.mjs` thì sửa cả ở đây.

/** Mã bốn trục khai báo, theo `Registrations/codes.json`. */
export declare const AXES: readonly ['identity', 'token', 'custody', 'infra']

/** Gốc repo, suy ra từ vị trí tệp lõi. */
export declare const ROOT: string

/** Nội dung `Registrations/codes.json` đã giải mã. */
export declare const CODES: {
  spec_version: string
  axes: Record<string, { codes: Record<string, unknown> }>
  listing_tiers: Record<string, { rank: number; label: string; require: Record<string, unknown> }>
}

/** `null` = đạt khuôn. Ngược lại là thông báo nêu khuôn mong đợi + ký tự vi phạm đầu tiên. */
export declare function loiKhuonPid(raw: unknown): string | null

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
}

/** Chấm MỘT hồ sơ. Không in gì, không gọi `process.exit`. R1 không thuộc hàm này. */
export declare function checkOne(path: string): KetQuaCham
