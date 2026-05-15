# Deploy — Hugging Face Spaces (server) + Vercel (web)

Server (`@poker/server`, Colyseus WebSocket) chạy trên **Hugging Face Spaces** (Docker SDK).
Web (`@poker/web`, Next.js 15) chạy trên **Vercel**.

---

## 1. Server → Hugging Face Spaces

HF Spaces là git repo riêng (host trên huggingface.co), không kết nối trực tiếp với GitHub. Ta sẽ push code này lên Space's git remote.

### a. Tạo Space
1. Vào https://huggingface.co/new-space.
2. Điền:
   - **Owner**: username của bạn (hoặc org).
   - **Space name**: `poker-play-server` (đặt tên nào cũng được — URL sẽ là `https://<owner>-poker-play-server.hf.space`).
   - **License**: chọn tùy (MIT cũng được).
   - **Space SDK**: chọn **Docker** → **Blank**.
   - **Hardware**: **CPU basic** (free, 16GB RAM, 2 vCPU).
   - **Visibility**: Public (Private cần subscription).
3. Click **Create Space**. HF tạo repo rỗng kèm sample.

### b. Push code lên Space repo
Tại root project, add HF Space làm git remote thứ hai:

```bash
# Lần đầu — add remote (thay <owner>/<space-name>):
git remote add hf https://huggingface.co/spaces/<owner>/poker-play-server

# Cần HF access token (Write scope): https://huggingface.co/settings/tokens
# Push lần đầu (force vì Space repo có sẵn vài file mẫu):
git push hf main --force

# Sau này chỉ cần:
git push hf main
```

Khi push xong, HF tự detect `Dockerfile` + `README.md` frontmatter và bắt đầu build. Theo dõi tab **Logs** của Space.

### c. URL & verify
URL Space: `https://<owner>-poker-play-server.hf.space`

```bash
curl https://<owner>-poker-play-server.hf.space/health
# => {"ok":true}
```

WebSocket URL cho web client: `wss://<owner>-poker-play-server.hf.space`

### d. Lưu ý HF Spaces
- **Sleep**: Free Space ngủ sau ~48 giờ không có traffic, wake-up khi có request (~vài giây cold start). Không sleep nhanh như Render.
- **Public visibility**: code Space repo public — đừng commit secrets. Repo GitHub gốc có thể private; chỉ Space repo public.
- **README.md**: file `README.md` ở root project là **bắt buộc** cho HF Spaces (chứa YAML frontmatter `sdk: docker`, `app_port: 7860`). Không xóa.
- **Port**: Dockerfile expose 7860 + set `ENV PORT=7860` (server đọc `process.env.PORT`). Trùng với `app_port` trong README.

---

## 2. Web → Vercel

### a. Import project
1. Vào https://vercel.com/new → **Import Git Repository** → chọn repo này (GitHub).
2. **Root Directory**: nhấn **Edit** → đổi thành `apps/web`.
   (Quan trọng — Vercel phải build từ workspace package, không phải root.)
3. **Framework Preset**: Next.js (tự nhận).
4. **Build & Output Settings**: để mặc định.
   - Vercel tự detect `pnpm-lock.yaml` ở repo root và chạy `pnpm install` cho workspace.
   - `transpilePackages: ["@poker/shared"]` trong `next.config.ts` lo việc bundle shared package.

### b. Environment Variables
Thêm vào tab **Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_COLYSEUS_URL` | `wss://<owner>-poker-play-server.hf.space` | Production, Preview, Development |

(Lấy từ URL Space ở bước 1, đổi `https://` → `wss://`.)

### c. Deploy
Click **Deploy**. Vercel build & cấp URL dạng `https://<project>.vercel.app`.

---

## 3. Sau deploy

### CORS
Server hiện cho phép tất cả origin (`Access-Control-Allow-Origin: *` ở `apps/server/src/index.ts:10`).
Trước khi public production thật, nên giới hạn về domain Vercel của bạn.

### Update server
```bash
git push hf main   # HF tự rebuild
```

### Update web
Push lên GitHub branch `main` → Vercel tự rebuild.

### Free-tier limits cần biết
- **HF Spaces (CPU basic)**: 16GB RAM, 2 vCPU. Ngủ sau ~48h idle. Đủ rộng cho beta.
- **Vercel Hobby**: 100GB bandwidth/tháng, không giới hạn deploy.

---

## Troubleshooting

**Web không connect được tới Space**
- Check console browser: phải thấy `wss://...hf.space`. Nếu thấy `ws://localhost:2567` → env var `NEXT_PUBLIC_COLYSEUS_URL` chưa set trên Vercel hoặc chưa redeploy.
- `NEXT_PUBLIC_*` được inline lúc build → đổi env xong phải **redeploy** (không phải restart).

**HF Space build fail**
- Check tab **Logs** của Space.
- Thường lỗi do pnpm install — đảm bảo `pnpm-lock.yaml` đã commit và push.

**Space "Stopped" sau khi build xong**
- Container exit ngay sau start. Thường do crash. Check **Logs** → tìm stack trace.
- Đảm bảo server listen trên `0.0.0.0` (Node default) chứ không phải `127.0.0.1`.

**`git push hf main` báo "non-fast-forward"**
- Space repo có commit mẫu HF tạo lúc init. Dùng `git push hf main --force` lần đầu để overwrite.

**Wake-up sau idle chậm**
- Cold start ~10–30s khi Space wake up. Web client tự reconnect, nhưng UX lần đầu join sẽ delay.
- Workaround: ping `/health` định kỳ bằng cron-job.org (free) để giữ Space awake.
