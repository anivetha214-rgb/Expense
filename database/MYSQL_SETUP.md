# 🐬 MySQL Setup Guide — FarmPrice AI

The app ships with **SQLite** for zero-setup development, but every model, type,
relation and index is MySQL-compatible. This guide moves the app to
**MySQL 8** in production. Two independent paths are provided — pick one.

Files involved:

| File | Purpose |
| --- | --- |
| `prisma/schema.mysql.prisma` | Prisma schema with `provider = "mysql"` (generates its own client into `generated/mysql-client/`) |
| `database/mysql-schema.sql` | Raw MySQL 8 DDL — database, 6 tables, utf8mb4, FKs, indexes |

---

## Path A — Prisma creates the schema (recommended)

1. **Create the user & database** (or let step 3 create the database):

   ```sql
   CREATE USER 'farmprice'@'%' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON farmprice.* TO 'farmprice'@'%';
   FLUSH PRIVILEGES;
   ```

2. **Add the URL to `.env`** in the project root:

   ```env
   MYSQL_URL="mysql://farmprice:YOUR_STRONG_PASSWORD@localhost:3306/farmprice"
   ```

3. **Generate the MySQL client and push the schema:**

   ```bash
   npx prisma generate --schema prisma/schema.mysql.prisma
   npx prisma db push   --schema prisma/schema.mysql.prisma
   ```

   `db push` creates all 6 tables, unique keys, indexes and foreign keys.

## Path B — Import the raw SQL DDL

```bash
mysql -u root -p < database/mysql-schema.sql
```

Then still run `npx prisma generate --schema prisma/schema.mysql.prisma` so the
app can talk to the database.

---

## Switching the app to MySQL

`src/lib/db.ts` instantiates the Prisma client from the default generator. For a
MySQL deployment:

1. Ensure `MYSQL_URL` is set and tables exist (Path A or B above).
2. Import the client from `generated/mysql-client` instead of `@prisma/client`
   in `src/lib/db.ts` (single-line change), or
   regenerate the **default** client from the MySQL schema by temporarily
   swapping `prisma/schema.prisma` for `prisma/schema.mysql.prisma`.

## First boot on an empty MySQL database

No data import is needed. On the first request the orchestrator
(`src/lib/ensure-services.ts` → `ensureSeeded()`) detects the empty database and
seeds it **idempotently and deterministically** (mulberry32 PRNG):

- 12 crops, 10 Tamil Nadu markets, 5 vehicle tiers
- 12 × 10 × 730 = **87,600 daily price records** (identical to the SQLite dataset)

Per-device runtime data (Alerts, Notifications, Profile) starts empty, which is
the desired behaviour for a fresh production deployment.

## Validating

```bash
mysql -u root -p -e "USE farmprice; SHOW TABLES; SELECT COUNT(*) FROM PriceRecord;"
# after first boot, PriceRecord should contain ≈ 87,600 rows
```

## Notes

- **utf8mb4 is mandatory** — crop and market names are stored in Tamil
  (e.g. `தக்காளி`, `சேலம்`); the DDL sets it on the database and every table.
- `Notification.read` is quoted (`\`read\``) because READ is a reserved word.
- The SQLite file (`db/custom.db`) stays untouched; you can always fall back by
  pointing `DATABASE_URL` at it.
