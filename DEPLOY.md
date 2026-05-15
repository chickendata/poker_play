# Deploy — Koyeb (server) + Vercel (web)

Server (`@poker/server`, Colyseus WebSocket) chạy trên **Koyeb**.
Web (`@poker/web`, Next.js 15) chạy trên **Vercel**.

---

## 1. Server → Koyeb

### a. Push repo lên GitHub
Koyeb deploy trực tiếp từ GitHub repo.

### b. Tạo service trên Koyeb
1. Vào https://app.koyeb.com → **Create Service** → **GitHub**.
2. Chọn repo này, branch `main`.
3. **Builder**: chọn **Dockerfile**.
   - Dockerfile path: `Dockerfile` (ở repo root)
   - Build context: `.` (repo root)
4. **Instance**: chọn **Free** (Nano, 256MB RAM, 0.1 vCPU).
5. **Region**: chọn gần user nhất — `sin` (Singapore) hoặc `fra` (Frankfurt). Koyeb free chỉ có vài region.
6. **Ports**:
   - Port: `2567`
   - Protocol: `HTTP` (Koyeb tự nâng cấp lên WebSocket khi client connect)
   - Path: `/` (public)
7. **Health checks**: bật HTTP healthcheck → path `/health`, port `2567`.
8. **Environment variables**: không cần — `PORT` Koyeb tự inject, code đã đọc `process.env.PORT`.
9. Click **Deploy**.

Sau khi deploy, Koyeb cấp URL dạng `https://<app-name>-<org>.koyeb.app`.
WebSocket URL sẽ là `wss://<app-name>-<org>.koyeb.app` (cùng host, dùng `wss://`).

### c. Verify
```bash
curl https://<app-name>-<org>.koyeb.app/health
# => {"ok":true}
```

---

## 2. Web → Vercel

### a. Import project
1. Vào https://vercel.com/new → **Import Git Repository** → chọn repo này.
2. **Root Directory**: nhấn **Edit** → đổi thành `apps/web`.
   (Quan trọng — Vercel phải build từ workspace package, không phải root.)
3. **Framework Preset**: Next.js (tự nhận).
4. **Build & Output Settings**: để mặc định.
   - Vercel tự detect `pnpm-lock.yaml` ở repo root và chạy `pnpm install` cho cả workspace.
   - `transpilePackages: ["@poker/shared"]` trong `next.config.ts` lo việc bundle shared package.

### b. Environment Variables
Thêm vào tab **Environment Variables**:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_COLYSEUS_URL` | `wss://<app-name>-<org>.koyeb.app` | Production, Preview, Development |

(Lấy từ URL Koyeb ở bước 1, đổi `https://` → `wss://`.)

### c. Deploy
Click **Deploy**. Vercel build & cấp URL dạng `https://<project>.vercel.app`.

---

## 3. Sau deploy

### CORS
Server hiện cho phép tất cả origin (`Access-Control-Allow-Origin: *`).
Trước khi public production thật, nên giới hạn về domain Vercel — sửa `apps/server/src/index.ts:10`.

### Free-tier limits cần biết
- **Koyeb Free**: 1 service, 256MB RAM, không sleep. Đủ cho ~vài chục CCU poker.
- **Vercel Hobby**: 100GB bandwidth/tháng, không giới hạn deploy.
- Nếu Koyeb instance bị OOM khi nhiều room → upgrade lên paid tier hoặc tối ưu Colyseus state size.

### Update server
Push lên `main` → Koyeb tự rebuild (nếu bật auto-deploy).

### Update web
Push lên `main` → Vercel tự rebuild.

---

## Troubleshooting

**Web không connect được tới Koyeb**
- Check console browser: phải thấy `wss://...koyeb.app`. Nếu thấy `ws://localhost:2567` → env var `NEXT_PUBLIC_COLYSEUS_URL` chưa set trên Vercel hoặc chưa redeploy sau khi set.
- `NEXT_PUBLIC_*` được inline lúc build → đổi env xong phải **redeploy** (không phải restart).

**Koyeb build fail ở pnpm install**
- Check pnpm-lock.yaml có commit không. Dockerfile dùng `--frozen-lockfile`.

**Koyeb container crash loop**
- Check logs trong Koyeb dashboard. Thường do port mismatch — đảm bảo Koyeb port = `2567` và code đọc `process.env.PORT`.
