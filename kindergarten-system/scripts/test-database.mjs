import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const runtime=process.argv[2] || process.env.PGLITE_MODULE
if(!runtime){console.error('Usage: npm run test:db -- /absolute/path/to/@electric-sql/pglite/dist/index.js');process.exit(2)}
const cwd=fileURLToPath(new URL('..',import.meta.url))
const tests=(await readdir(new URL('../supabase/tests/',import.meta.url))).filter(name=>name.endsWith('.mjs')).sort()
const failed=[]
for(const test of tests){
 console.log(`\nRunning ${test}`)
 const run=spawnSync(process.execPath,[`supabase/tests/${test}`,resolve(runtime)],{cwd,stdio:'inherit',timeout:120000})
 if(run.error) console.error(run.error.message)
 if(run.status!==0)failed.push(test)
}
console.log(`\n${tests.length-failed.length}/${tests.length} database suites passed.`)
if(failed.length)console.error(`Failed: ${failed.join(', ')}`)
process.exitCode=failed.length?1:0
