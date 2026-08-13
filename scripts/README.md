# Registry — script đăng ký (Cardano)

Apply tham số hai validator của sổ, rồi đăng ký MỘT dịch vụ vào sổ.

## Kiến trúc tham số (đảo chiều so với bản cũ)

```
registry(registry_authority)                       -> registry_hash   (chỉ phụ thuộc authority)
registry_beacon(registry_authority, registry_hash) -> beacon_policy
```

Apply `registry` TRƯỚC. Nhờ registry_hash tính được trước, cổng đúc ép được **địa chỉ đích**
của ô hồ sơ (R-OUT-1) — bản cũ chọn output bằng chính NFT vừa đúc nên hồ sơ đặt ở script lạ
vẫn lọt.

Blueprint đọc từ `../onchain/plutus.json` (của CHÍNH repo này). Thiếu validator → chạy
`aiken build` trong `Registry/onchain/`.

## Ranh giới: script này KHÔNG dựng kho

Sổ chỉ đường, kho là của từng dịch vụ. Đội dịch vụ dựng kho bằng SDK của họ rồi cấp:

| Biến | Là gì |
|---|---|
| `CUSTODY_HASH` | script hash kho |
| `SEED_POLICY`  | policy NFT authenticity của kho |
| `CUSTODY_UTXO` | `txhash#index` ô kho mang NFT đó — bước đăng ký readFrom nó (R-BIND) |

Muốn chạy cả hai bước trong một lượt thì trỏ `TREASURY_SDK` tới thư mục `offchain/src` của
Treasury; script nạp `planSeed` lúc chạy và **tiêm** vào `onboardPlatform`. Không đặt biến đó
thì không ai hỏng — đó là điểm của việc đảo chiều phụ thuộc.

## Chạy

```bash
cd Registry/scripts
npm install
npm run deploy-registry                 # -> registry.json (registry_hash, address, beacon_policy)
npm run register -- phoenixkey          # -> registered.json
npm run register -- orilife
npm run register -- aladinwork
```

### Hai chế độ (tự nhận theo .env)

- **KHÔ** (thiếu credential, hoặc tham số còn giá trị mẫu, hoặc chưa cấp `CUSTODY_UTXO`):
  apply tham số + dựng plan + in datum/redeemer/hash/address. Không cần mạng. Value ô kho
  lúc này là **giả định**, script nói rõ điều đó — không dùng làm bằng chứng.
- **THẬT** (đủ credential + mọi tham số thật): đọc ô kho **trên chuỗi** để đối soát R-BIND
  bằng dữ liệu thật, rồi dựng tx đăng ký. **KHÔNG submit.**

## R-EPOCH

`created_epoch` mặc định lấy epoch hiện tại, và bị ép nằm trong cửa sổ hiệu lực
`[epoch(now), epoch(now + TX_TTL_MS)]`. Khai `CREATED_EPOCH` ngoài cửa sổ → hỏng ngay tại
builder. Lý do: trường này **bất biến**, khai sai một lần là sai vĩnh viễn trong sổ.

## Env

Xem `.env.example` (đặt `.env` ở **gốc repo Registry**, không phải trong thư mục này).
