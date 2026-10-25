import { beforeConsolidation } from './reviewed-consolidation-boundary.mjs'
import assert from 'node:assert/strict'
import { verifyAdminLifecycleSource } from './reviewed-admin-lifecycle-boundary.mjs'
import {createHash} from 'node:crypto'
import {readFileSync} from './reviewed-consolidation-boundary.mjs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const pins={
 'src/features/whitelabel-accounts/AccountDetailPanel.tsx':'efbf2e601a88cead67628b8fa6a76c3528f50839984fd6bc08ebab0a636c5e81',
 'src/features/whitelabel-accounts/useAccountsData.ts':'84a617f6fbae229dc7ebb4d7b7d9ba80e7d6696116da4eca8bc65f02ac09c480',
 'src/features/whitelabel-accounts/access/AccountAccessActions.tsx':'00bca42220c3af92516ba3949521b92b0289bdff073005976ad820362595b0a8',
 'src/features/whitelabel-accounts/access/AccountAccessActions.module.css':'754a8ee45ab683b2577677ed633fa5b5fcd536b0017cf7454f1663e9b7150ec5',
 'src/features/whitelabel-accounts/access/accountAccessClient.ts':'c9b3d49707be8d14a172723cf6088834ba12ee34e7571bfe5900ddf666341e07',
 'src/features/whitelabel-accounts/access/accountAccessContract.ts':'bae09ed27a808fa03db932ea8e99043db832773bf0e272e4c1647180815fb061',
 'src/features/whitelabel-accounts/access/accountAccessRefresh.ts':'ecc94ed7e3c6e93d3603915d300ee0834d1a796cb09459a5a1f6f96262e02f41',
}
// Seven exact reviewed files, not an Accounts/domain/directory exemption.
export function verifyAccountAccessSource(path,source){
  source=beforeConsolidation(path,source)
 if(path==='src/features/whitelabel-accounts/AccountDetailPanel.tsx'&&verifyAdminLifecycleSource(path,source))return true
 if(!Object.hasOwn(pins,path))return false
 assert.equal(createHash('sha256').update(source.replaceAll('\r\n','\n')).digest('hex'),pins[path],`Unreviewed account-access source: ${path}`)
 return true
}
export function reviewedAccountAccess(path){return Object.hasOwn(pins,path)&&verifyAccountAccessSource(path,readFileSync(resolve(root,path),'utf8'))}
