#!/usr/bin/env tsx
// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — MySQL → PostgreSQL Data Migration Script
// Usage: npm run db:migrate-data
//
// Reads from MySQL (MYSQL_* env vars) → writes to PostgreSQL (DATABASE_URL).
// Idempotent: uses INSERT … ON CONFLICT DO NOTHING for most tables.
// Run after `npm run db:migrate` to ensure PG schema exists first.
// ─────────────────────────────────────────────────────────────────

import { Pool as PgPool } from 'pg';

// ── Lazy-load mysql2 (optional dep) ──────────────────────────────
let mysql: typeof import('mysql2/promise') | null = null;
async function getMysql() {
  if (!mysql) {
    try {
      mysql = await import('mysql2/promise');
    } catch {
      throw new Error(
        'mysql2 is not installed. Run: npm install --save-dev mysql2\n' +
        'Then re-run: npm run db:migrate-data'
      );
    }
  }
  return mysql;
}

// ── Config ────────────────────────────────────────────────────────
const PG_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
};

const MYSQL_CONFIG = {
  socketPath: process.env.MYSQL_SOCKET ?? '/tmp/mysql.sock',
  database:   process.env.MYSQL_DATABASE ?? 'steamhives_db',
  user:       process.env.MYSQL_USER ?? 'root',
  password:   process.env.MYSQL_PASSWORD ?? '',
  dateStrings: true,  // keep dates as strings for easier handling
};

// ── Helpers ───────────────────────────────────────────────────────

function parseJson(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

function toTs(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val);
  // MySQL datetime: "2024-01-15 10:30:00" → ISO
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    return s.replace(' ', 'T') + 'Z';
  }
  return s;
}

function toDate(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val);
  return s.split(' ')[0] ?? null;  // keep YYYY-MM-DD only
}

function boolVal(val: unknown): boolean {
  if (val == null) return false;
  return val === 1 || val === '1' || val === true;
}

function log(msg: string) {
  process.stdout.write(msg + '\n');
}

// ── Table migrators ───────────────────────────────────────────────

async function migrateSchools(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_schools');
  const [rows] = await mysql.execute('SELECT * FROM sh_schools') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_schools (
         id, name, abbreviation, email, phone, address, motto, school_type,
         name_primary, name_secondary, abbr_primary, abbr_secondary,
         principal_name, head_teacher_name, color1, color2,
         school_logo, school_stamp, sig_principal, head_signature,
         student_limit, plan_label, coupon_used, show_position, show_bf,
         default_attendance_weeks, password_hash, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
       ) ON CONFLICT (id) DO NOTHING`,
      [
        r.id, r.name, r.abbreviation, r.email, r.phone, r.address, r.motto,
        r.school_type ?? 'primary', r.name_primary, r.name_secondary,
        r.abbr_primary, r.abbr_secondary, r.principal_name, r.head_teacher_name,
        r.color1, r.color2, r.school_logo, r.school_stamp,
        r.sig_principal, r.head_signature,
        r.student_limit ?? null, r.plan_label ?? 'Free', r.coupon_used,
        boolVal(r.show_position), boolVal(r.show_bf),
        r.default_attendance_weeks ?? 14,
        r.password_hash,
        toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateSessions(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_sessions');
  const [rows] = await mysql.execute('SELECT * FROM sh_sessions') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_sessions (token, school_id, is_dev, teacher_id, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (token) DO NOTHING`,
      [
        r.token, r.school_id, boolVal(r.is_dev), r.teacher_id ?? null,
        toTs(r.expires_at), toTs(r.created_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateAuth(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_auth');
  const [rows] = await mysql.execute('SELECT * FROM sh_auth') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_auth (school_id, teacher_id, email, password_hash, guard, last_login, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (teacher_id) DO NOTHING`,
      [
        r.school_id, r.teacher_id ?? null, r.email, r.password_hash,
        r.guard ?? 'web', toTs(r.last_login), toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateTeachers(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_teachers');
  const [rows] = await mysql.execute('SELECT * FROM sh_teachers') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    // JSON fields: subjects, classes, admin_tasks
    const subjects   = JSON.stringify(parseJson(r.subjects)   ?? []);
    const classes    = JSON.stringify(parseJson(r.classes)    ?? []);
    const adminTasks = JSON.stringify(parseJson(r.admin_tasks) ?? []);

    await pg.query(
      `INSERT INTO sh_teachers (
         school_id, name, employee_id, email, phone, gender, dob,
         class, classes, subjects, admin_tasks, role, is_class_teacher,
         qualification, specialisation, hire_date, avatar, signature,
         address, department, staff_type, approval_status, self_registered,
         rejection_reason, password, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         $19,$20,$21,$22,$23,$24,$25,$26,$27
       ) ON CONFLICT (school_id, employee_id) DO NOTHING`,
      [
        r.school_id, r.name, r.employee_id ?? null,
        r.email ?? null, r.phone ?? null, r.gender ?? null,
        toDate(r.dob), r.class ?? null, classes, subjects, adminTasks,
        r.role ?? 'both', boolVal(r.is_class_teacher),
        r.qualification ?? null, r.specialisation ?? null,
        toDate(r.hire_date), r.avatar ?? null, r.signature ?? null,
        r.address ?? null, r.department ?? null, r.staff_type ?? null,
        r.approval_status ?? 'approved', boolVal(r.self_registered),
        r.rejection_reason ?? null, r.password ?? null,
        toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateStudents(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_students');
  const [rows] = await mysql.execute('SELECT * FROM sh_students') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    const clubs = JSON.stringify(parseJson(r.clubs) ?? []);
    await pg.query(
      `INSERT INTO sh_students (
         id, school_id, adm, name, gender, dob, level, class,
         department, arm, term, session, house, passport, clubs,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (school_id, adm) DO NOTHING`,
      [
        String(r.id), r.school_id, r.adm, r.name,
        r.gender ?? null, toDate(r.dob), r.level ?? null, r.class,
        r.department ?? null, r.arm ?? null, r.term, r.session,
        r.house ?? null, r.passport ?? null, clubs,
        toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateResults(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_results');
  const [rows] = await mysql.execute('SELECT * FROM sh_results') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    const subjects  = JSON.stringify(parseJson(r.subjects) ?? []);
    const affective = JSON.stringify(parseJson(r.affective) ?? {});
    await pg.query(
      `INSERT INTO sh_results (
         id, school_id, student_id, student_adm, student_name,
         class, term, session, result_type, subjects,
         overall_total, avg, grade, position, out_of,
         affective, teacher_name, teacher_comment, principal_comment,
         student_passport, department, teacher_signature,
         created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         $16,$17,$18,$19,$20,$21,$22,$23,$24
       ) ON CONFLICT (id) DO NOTHING`,
      [
        String(r.id), r.school_id, r.student_id ? String(r.student_id) : null,
        r.student_adm ?? null, r.student_name ?? null,
        r.class, r.term, r.session, r.result_type ?? 'full', subjects,
        Number(r.overall_total ?? 0), Number(r.avg ?? 0),
        r.grade ?? null, r.position ?? null, r.out_of ?? null,
        affective, r.teacher_name ?? null, r.teacher_comment ?? null,
        r.principal_comment ?? null, r.student_passport ?? null,
        r.department ?? null, r.teacher_signature ?? null,
        toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateCoupons(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_coupons');
  const [rows] = await mysql.execute('SELECT * FROM sh_coupons') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_coupons (code, type, student_limit, plan_label, used, used_by, used_by_name, used_date, generated_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO NOTHING`,
      [
        r.code, r.type, r.student_limit ?? null, r.plan_label,
        boolVal(r.used), r.used_by ?? null, r.used_by_name ?? null,
        toTs(r.used_date), toTs(r.generated_date) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateAcadSessions(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_acad_sessions');
  const [rows] = await mysql.execute('SELECT * FROM sh_acad_sessions') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_acad_sessions (
         school_id, label, start_year, end_year, is_current,
         days_opened, next_term_begins, current_term,
         attendance_weeks, current_week, default_weeks, school_days,
         next_term_start, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        r.school_id ?? null, r.label, r.start_year, r.end_year,
        boolVal(r.is_current), r.days_opened ?? null,
        toDate(r.next_term_begins), r.current_term ?? null,
        r.attendance_weeks ?? 14, r.current_week ?? 1,
        r.default_weeks ?? 14, r.school_days ?? 180,
        toDate(r.next_term_start),
        toTs(r.created_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateAttendance(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_attendance');
  const [rows] = await mysql.execute('SELECT * FROM sh_attendance') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    const days = JSON.stringify(parseJson(r.days) ?? {});
    await pg.query(
      `INSERT INTO sh_attendance (school_id, student_id, class, term, session, week_label, week_start, days, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (school_id, student_id, term, session, week_label) DO NOTHING`,
      [
        r.school_id, String(r.student_id), r.class, r.term, r.session,
        r.week_label, toDate(r.week_start), days,
        toTs(r.created_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateSubjects(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_subjects');
  const [rows] = await mysql.execute('SELECT * FROM sh_subjects') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_subjects (school_id, name, code, description, department, is_compulsory, class_level, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (school_id, name) DO NOTHING`,
      [
        r.school_id, r.name, r.code ?? null, r.description ?? null,
        r.department ?? null, boolVal(r.is_compulsory ?? true), r.class_level ?? null,
        toTs(r.created_at) ?? new Date().toISOString(),
        toTs(r.updated_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

async function migrateAuditLog(mysql: import('mysql2/promise').Connection, pg: PgPool) {
  log('\n▶ sh_audit_log');
  const [rows] = await mysql.execute('SELECT * FROM sh_audit_log') as [Record<string, unknown>[], unknown];
  let count = 0;
  for (const r of rows) {
    await pg.query(
      `INSERT INTO sh_audit_log (school_id, action, details, ip, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        r.school_id ?? null, r.action, r.details ?? null, r.ip ?? null,
        toTs(r.created_at) ?? new Date().toISOString(),
      ]
    );
    count++;
  }
  log(`  ✓ ${count} rows`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  log('╔══════════════════════════════════════════════════════╗');
  log('║  STEAMhives RMS — MySQL → PostgreSQL Migration       ║');
  log('╚══════════════════════════════════════════════════════╝');
  log('');
  log(`MySQL:    ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
  log(`PostgreSQL: ${process.env.DATABASE_URL ? '(from DATABASE_URL)' : `${process.env.DB_HOST}/${process.env.DB_NAME}`}`);

  const m = await getMysql();

  // Connect MySQL
  log('\n🔌 Connecting to MySQL...');
  const myConn = await m.createConnection(MYSQL_CONFIG);
  log('  ✓ MySQL connected');

  // Connect PostgreSQL
  log('🔌 Connecting to PostgreSQL...');
  const pgPool = new PgPool(PG_CONFIG);
  await pgPool.query('SELECT 1');
  log('  ✓ PostgreSQL connected');

  // Run migrations in dependency order
  try {
    await migrateSchools(myConn, pgPool);
    await migrateCoupons(myConn, pgPool);
    await migrateTeachers(myConn, pgPool);
    await migrateAuth(myConn, pgPool);
    await migrateSessions(myConn, pgPool);
    await migrateStudents(myConn, pgPool);
    await migrateResults(myConn, pgPool);
    await migrateAcadSessions(myConn, pgPool);
    await migrateAttendance(myConn, pgPool);
    await migrateSubjects(myConn, pgPool);
    await migrateAuditLog(myConn, pgPool);

    log('\n✅ Migration complete!\n');
  } catch (err) {
    log('\n❌ Migration failed:');
    console.error(err);
    process.exit(1);
  } finally {
    await myConn.end();
    await pgPool.end();
  }
}

main();
