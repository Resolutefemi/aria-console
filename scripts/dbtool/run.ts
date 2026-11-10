/**
 * Run a SQL file against the Supabase Postgres instance.
 * Usage: bun run /home/z/my-project/scripts/dbtool/run.ts <sql-file> [--file]
 * Connection details come from scripts/dbtool/.env.secrets (git-ignored area).
 */
import { Client } from 'pg'
import { readFileSync } from 'fs'

const conn = JSON.parse(
  readFileSync('/home/z/my-project/scripts/dbtool/.conn.json', 'utf8')
)

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('usage: bun run run.ts "<sql>" | <file.sql>')
    process.exit(1)
  }
  let sql = arg
  if (!arg.includes(';') && !arg.trim().toUpperCase().startsWith('SELECT')) {
    // treat as file path if it looks like a path
  }
  if (arg.endsWith('.sql')) {
    sql = readFileSync(arg, 'utf8')
  }
  const client = new Client({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  const res = await client.query(sql)
  if (res.rows && res.rows.length) {
    console.log(JSON.stringify(res.rows, null, 2))
  }
  console.log(`OK — rowCount: ${res.rowCount ?? 'n/a'}`)
  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
