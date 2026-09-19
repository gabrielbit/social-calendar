# Deploy Railway (API / Worker) — monorepo pnpm

## Causa del error `workspace:*` / `npm i`

Si el **Root Directory** es `apps/api`, Railway no ve `pnpm-lock.yaml` / `pnpm-workspace.yaml`
y Nixpacks ejecuta `npm i` → falla con `EUNSUPPORTEDPROTOCOL workspace:*`.

Además: los cambios tienen que estar en **GitHub**. Si no hiciste push, Railway sigue
buildando el commit viejo.

## Configuración correcta (API) — Dockerfile (recomendado)

Railway → servicio API → **Settings**:

1. **Root Directory**: vacío (borrá `apps/api`).
2. **Builder**: **Dockerfile**.
3. **Dockerfile path**: `Dockerfile.api`
4. Opcional — **Config-as-code path**: `railway.api.toml`
5. Build Command / Install Command: **vacíos**
6. Healthcheck path: `/health`
7. Redeploy (o push a `main`)

## Worker

1. Root Directory: vacío
2. Builder: Dockerfile
3. Dockerfile path: `Dockerfile.worker`
4. Config-as-code path (opcional): `railway.worker.toml`

## Variables mínimas (API)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (URL Vercel)
- `CORS_ORIGIN` (URL Vercel)
- `GOOGLE_TOKEN_ENCRYPTION_KEY` (`openssl rand -hex 32`)

## Checklist si sigue fallando

- [ ] `git push` hecho (en el build log, el commit SHA es el nuevo)
- [ ] Root Directory vacío
- [ ] Builder = Dockerfile (el log debe decir `Dockerfile` / `docker build`, no `RUN npm i`)
- [ ] Dockerfile path = `Dockerfile.api`
