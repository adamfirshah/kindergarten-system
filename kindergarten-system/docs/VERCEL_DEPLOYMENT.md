# Vercel deployment

Use three Vercel projects connected to the same GitHub repository. The repository currently contains a `kindergarten-system/` directory, so include that prefix in each Root Directory.

- Landing: `kindergarten-system/apps/landing`, main domain (or its own vercel.app URL).
- Portal: `kindergarten-system/apps/portal`, `portal.<your-domain>`.
- Superadmin: `kindergarten-system/apps/admin`, `superadmin.<your-domain>`.

For each project select Vite, enable **Include source files outside of the Root Directory in the Build Step**, set Install Command to `cd ../.. && npm ci`, Build Command to `npm run build`, and Output Directory to `dist`. The admin entry imports portal source and the landing uses shared packages, so outside-root sources are required. Set the Production Branch to `staging` if deploying the branch pushed in this session; otherwise merge into your chosen production branch first.

Deploy landing first if only the marketing site should be public initially. Set `VITE_PORTAL_URL` on the landing project to the actual portal HTTPS URL before enabling its login link; without this variable the current code falls back to localhost. Configure it for each relevant deployment environment and redeploy after changes.

Portal and superadmin require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (publishable/anon key only). Never expose a service-role key through a VITE variable. Configure the intended production authentication URLs in Supabase and apply the documented migrations before live user acceptance testing.

The admin app currently imports the same role-aware App as the portal. Separate deployments do not yet restrict login to different roles or redirect superadmins between origins. Keep existing database authorization/RLS; implement and verify an explicit app-entry role gate if exclusive superadmin access is required. Browser sessions are also separate across origins; automatic cross-domain login is not implemented.

`/landing`, `/portal`, and `/superadmin` are paths on one domain, not three domains. The current builds use root asset paths; deploying them under path prefixes would need additional base-path and routing configuration.

Verification on 2026-09-10: `npm run lint` passed with zero errors/warnings, then `npm run build` passed for all three apps. Portal/admin emit the existing >500 kB chunk-size warning. Hosted Vercel deployment and authenticated browser UAT are not covered by these checks.

Reference: https://vercel.com/docs/monorepos
