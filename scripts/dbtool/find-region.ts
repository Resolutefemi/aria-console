/**
 * Find the Supabase project's AWS region by trying the Supavisor pooler.
 * Correct region => password auth succeeds (or only fails on wrong password).
 */
import { Client } from 'pg'
import { readFileSync } from 'fs'

const conn = JSON.parse(
  readFileSync('/home/z/my-project/scripts/dbtool/.conn.json', 'utf8')
)
const REF = 'gvcsbkwnpebpflazpucb'

const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1',
  'sa-east-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'eu-central-2', 'eu-north-1', 'ap-south-1', 'ap-south-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'me-central-1',
  'me-south-1', 'af-south-1',
]

async function tryRegion(region: string): Promise<'OK' | 'WRONG_REGION' | 'UNREACHABLE' | 'AUTH_FAIL'> {
  const client = new Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${REF}`,
    password: conn.password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  try {
    await client.connect()
    await client.query('select 1')
    await client.end()
    return 'OK'
  } catch (e: any) {
    const msg = String(e?.message || e)
    try { await client.end() } catch {}
    if (/password authentication failed/i.test(msg)) return 'AUTH_FAIL'
    if (/not found|tenant|invalid|does not exist/i.test(msg)) return 'WRONG_REGION'
    if (/timeout|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|connect/i.test(msg)) return 'UNREACHABLE'
    console.log(`  [${region}] other: ${msg}`)
    return 'UNREACHABLE'
  }
}

async function main() {
  for (const r of REGIONS) {
    const res = await tryRegion(r)
    console.log(`${r}: ${res}`)
    if (res === 'OK') {
      console.log(`\n>>> REGION FOUND: ${r}`)
      return
    }
    if (res === 'AUTH_FAIL') {
      console.log(`\n>>> REGION FOUND (auth failed — password wrong?): ${r}`)
      return
    }
  }
  console.log('No region matched.')
}

main()
