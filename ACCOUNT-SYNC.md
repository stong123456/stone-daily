# Stone Daily wallet sign-in and sync

Wallet sign-in is optional. Guests continue to use localStorage and JSON export/import without connecting a wallet.

## Railway setup

1. Add a PostgreSQL service to the same Railway project.
2. Set `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the Stone Daily web service.
3. Set `STONE_SESSION_SECRET` to at least 32 cryptographically random characters.
4. Set `STONE_PUBLIC_ORIGIN=https://stonedaily.xyz` so every SIWE message is bound to the production domain.
5. Set `STONE_ADMIN_WALLETS` to the comma-separated EVM wallet addresses allowed to use `/admin`.
6. Redeploy. `stone_accounts` and `stone_wallet_nonces` are created or migrated lazily on the first account request.
7. Set `PGSSLMODE=require` only when the PostgreSQL endpoint requires TLS. Railway private networking normally does not need it.

## Wallet authentication

- The browser requests an EVM account and chain ID from an injected wallet such as MetaMask or OKX Wallet.
- The server creates an EIP-4361 Sign-In with Ethereum message containing the production domain, address, chain ID, issued time, expiry and a cryptographically random nonce.
- The nonce is stored server-side, can be consumed only once and expires after ten minutes.
- The wallet signs the message with `personal_sign`; Stone Daily verifies the signature with `viem` and then discards it.
- Successful verification creates or resumes an internal account and issues a signed, `HttpOnly`, `SameSite=Lax` session cookie.

The login signature does not approve tokens, submit transactions, read balances or grant asset access.

## Data and admin boundary

- The account schema stores the wallet address as the login identifier plus the allow-listed sync payload: UI mode, language, canonical watchlist IDs, alerts and local pause records.
- It does not store signatures, private keys, seed phrases, balances, positions, exchange credentials or API keys.
- Sync writes use optimistic revisions. A stale client receives HTTP 409 plus the current cloud copy and can choose local, cloud or merged resolution.
- Every `/api/admin/*` request loads the signed-in account and checks its address against `STONE_ADMIN_WALLETS` on the server.
- The current admin release is read-only: aggregate account/sync usage and data-provider health only. It does not expose user wallet lists or destructive controls.

## Operational check

Open `/watchlist`, connect an injected EVM wallet and inspect the message before signing. Confirm that it names `stonedaily.xyz`, expires in ten minutes and states that no transaction or approval is authorized. Sign in on another browser with the same wallet and confirm that unique watchlist items merge once. An allow-listed wallet should see the “管理后台” button and be able to open `/admin`; a non-allow-listed wallet must receive HTTP 403 from `/api/admin/overview`.
