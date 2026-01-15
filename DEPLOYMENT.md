# Deployment Guide

## Environments

| Environment | Purpose | Supabase |
|-------------|---------|----------|
| Local | Development | Docker via Supabase CLI |
| Staging | Testing | Separate Supabase project |
| Production | Live | Separate Supabase project |

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop
- Supabase CLI

### Setup

1. **Start Supabase locally:**
   ```bash
   cd infra/supabase
   npx supabase start
   ```

2. **Configure mobile app:**
   ```bash
   cd apps/mobile
   cp .env.example .env
   # Edit .env with local Supabase credentials shown after `supabase start`
   ```

3. **Start mobile app:**
   ```bash
   npm start
   ```

### Local Supabase URLs
- Studio: http://localhost:54323
- API: http://localhost:54321
- DB: postgresql://postgres:postgres@localhost:54322/postgres

---

## Staging Deployment

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project for staging
3. Note the URL and anon key

### 2. Apply Migrations
```bash
cd infra/supabase
npx supabase link --project-ref YOUR_STAGING_PROJECT_REF
npx supabase db push
```

### 3. Configure Mobile App
Update `apps/mobile/.env` or use EAS secrets:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-staging.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
```

### 4. Build for Testing
```bash
cd apps/mobile
npx eas build --profile preview --platform all
```

---

## Production Deployment

### 1. Create Production Supabase Project
- Use a separate project from staging
- Enable Point-in-Time Recovery (PITR)
- Configure connection pooling

### 2. Apply Migrations
```bash
cd infra/supabase
npx supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF
npx supabase db push
```

### 3. Security Checklist
- [ ] RLS policies verified
- [ ] No service_role key in mobile app
- [ ] Auth email templates configured
- [ ] Rate limiting enabled
- [ ] Database backups configured

### 4. Build Production App
```bash
cd apps/mobile
npx eas build --profile production --platform all
```

### 5. Submit to App Stores
```bash
npx eas submit --platform ios
npx eas submit --platform android
```

---

## Database Backup & Restore

### Backup (Local)
```bash
cd infra/supabase
npx supabase db dump -f backup.sql
```

### Backup (Cloud)
Use Supabase Dashboard > Database > Backups

### Restore
```bash
psql -h localhost -p 54322 -U postgres -d postgres -f backup.sql
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |

**Never expose:**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only
- Database password

---

## Monitoring

### Supabase Dashboard
- API requests
- Database queries
- Auth events
- Storage usage

### Recommended Alerts
1. High API error rate
2. Database connection pool exhaustion
3. Storage quota warnings
4. Auth suspicious activity

---

## Rollback Procedures

### Database Rollback
1. Restore from backup
2. Or revert migration:
   ```bash
   npx supabase migration repair --status reverted VERSION
   ```

### Mobile App Rollback
1. Use OTA updates (Expo Updates) for JS changes
2. For native changes, submit previous build version

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)
- Runs on PR and push to main/develop
- Lint, typecheck, test
- Security audit
- Build verification

### EAS Build Triggers
Configure in `eas.json` for automatic builds on:
- Push to main → Production build
- Push to develop → Preview build

---

## Troubleshooting

### Common Issues

**"Invalid API key"**
- Check `.env` file exists
- Verify key matches Supabase project

**"Network request failed"**
- For mobile devices, use LAN IP not localhost
- Check firewall allows port 54321/8081

**"RLS policy violation"**
- User doesn't have permission for this action
- Check profile role and location assignment

**Migration failed**
- Check SQL syntax
- Verify no conflicting constraints
- Review migration order
