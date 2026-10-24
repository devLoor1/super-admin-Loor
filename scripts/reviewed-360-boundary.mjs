import assert from 'node:assert/strict'
import { reviewedOpportunityWrite } from './reviewed-opportunity-write-boundary.mjs'
import { reviewedSettings } from './reviewed-settings-boundary.mjs'
import { reviewedOperators } from './reviewed-operators-boundary.mjs'
import { reviewedAccountAccess } from './reviewed-account-access-boundary.mjs'
import { withoutAuditRawQuery } from './reviewed-audit-filters-boundary.mjs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Exact source boundary for this authorized later unit, not a directory exemption.
// Historical freeze tests still reject any other byte/path. Current behavior is
// independently exercised by check-overview-360 and production-built browser QA.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const fingerprints={
  'src/app/App.tsx':'b6850d544226ed41e6f6209d8188e50c8ef1245677a5782666acbff663257ce1',
  'src/components/shell/Sidebar.tsx':'c3b4eb2bee92d4fd2f9557b68be75e4908a14843911ec83653ffc14b9c3a99cc',
  'src/components/shell/TopHeader.tsx':'94ae6eb7e085c45b45247827ab9d4f903918a2b6edc3385d2ef1a3d854ff5b7c',
  'src/features/dashboard/DashboardPage.module.css':'3e11b6adee041dd44423a4320a2487f1c010318121225fa4bbc960a09116694c',
  'src/features/dashboard/DashboardPage.tsx':'eec56641294fa6bf92107320b83c5daaa28c44c5218db848c92aa2e79da22b99',
  'src/features/dashboard/QuickActionsPanel.tsx':'9da88261b562f4a724be5eae272bfaba541a6e80862f214dbb299e0beb3397ae',
  'src/features/finance-core/investments/InvestmentDetailPage.tsx':'1f861c80cc0b6bdca9ad3724c71ea144d36c37a430a177bafbf1397c27d32647',
  'src/features/finance-core/payments/PaymentDetailPage.tsx':'84a33e6c6c51a4ed1b4b87d81e8c8abf8435e25fe39865260925752bf2da991b',
  'src/features/finance-core/shared/financeCoreActivity.ts':'780db07c28342a57f930b25f8d3719097baa42a18377514b83f0591c91ca0f81',
  'src/features/finance-core/wallets/WalletDetailPage.tsx':'fcb847e5ccbf100d8156c0d9165db3b1984de2c7379980615be6da272e60d0c6',
  'src/features/operation/entrepreneurs/EntrepreneurDetailPage.tsx':'82d5641aa9f2536f4c37c955d058f4f0b708bc7a55e2e8ebd77dd3566bbde308',
  'src/features/operation/investors/InvestorDetailPage.tsx':'1207f13c89809762b8af5db68fabd136815af8caa73707e204ba976cac760a3d',
  'src/features/operation/opportunities/OpportunityDetailPage.tsx':'f984b4f20534451243fbd6dab708afd20c3a27e7e1f7bf645b92b68ec30530e9',
  'src/features/operation/shared/OperationUi.tsx':'f8a34eb3562014860780e3aef4503ebbe05481e248a3855cd608c243b8a4c47f',
  'src/features/operation/shared/operationActivity.ts':'070e130256f58863acd232da659e05e7742e1b59447a69ab80b7b4e6c01e8dac',
  'src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx':'84d628c6e333ddc914d1c1367c2e0ef73054ed7ed2cc9b5794642f2ee6322c00',
  'src/features/whitelabels/WhitelabelDetailPanel.tsx':'2958656626a8ca662e996f41527fdfe7a5cde1ae04357eebf42ed977a686750a',
  'src/app/ReadinessUnavailablePage.tsx':'d4105e7cea6b759020a724f5611bf29498b66bf361b7640dee8265f9e5ee0efe',
  'src/app/presentationAvailability.ts':'642bb8ea32c26583eaf543f62e72906418b89bccc80b056ac7a2b1b6228d117c',
  'src/features/operation/entrepreneurs/entrepreneurOverviewApi.ts':'63696ed35f09c11c6392bf88f204a83df6b5e5934f81df0321363f8916ccac26',
  'src/features/operation/investors/investorOverviewApi.ts':'4a1aad17c6822eefafd55794160893a4c33f6476e5eb1c62ebfd8086281f52f2',
  'src/features/operation/shared/OverviewUi.tsx':'e727b787825f994d46dc360fba2e140d3107eb776d122ac96d5ec65ae4871b00',
  'src/features/operation/shared/overviewContract.ts':'ec7d1df9999c5aaa329c398732b27a3ba08916d6ae43528791cb45372d6e1321',
  'src/features/operation/shared/overviewPresent.ts':'e0926058972b73a9120e0bdbacadb8db8ad7357ec6fff1b2954880d0663ff403',
  'src/features/operation/shared/useOverview.ts':'0ff48c4c59938558a0070fd6badd1d1a2c9d86bbe3133fb8c2c3afcf9a05b290',
}
export function reviewed360(path) {
  if(reviewedOpportunityWrite(path))return true
  if(reviewedSettings(path))return true
  if(reviewedAccountAccess(path))return true
  if(path!=='src/app/App.tsx' && reviewedOperators(path))return true
  if(!Object.hasOwn(fingerprints,path))return false
  const raw=readFileSync(resolve(root,path),'utf8').replaceAll('\r\n','\n')
  let source=path==='src/app/App.tsx'?withoutAuditRawQuery(raw):raw
  if(path==='src/features/whitelabel-accounts/WhitelabelAccountsPage.tsx'){
    const current='          Consulte administradores, investidores e empreendedores do Whitelabel selecionado, com dados do Control Plane.\n          A gestão de acesso de investidores e empreendedores depende da permissão do operador.\n'
    const previous='          Consulte administradores, investidores e empreendedores do Whitelabel selecionado. Somente leitura, com dados do\n          Control Plane.\n'
    assert.equal(source.split(current).length,2,'Only the reviewed account-access description may change')
    source=source.replace(current,previous)
    const currentCrumb='    ? { label: whitelabel.name.length > 32 ? `${whitelabel.name.slice(0, 31).trimEnd()}…` : whitelabel.name, href: `#/whitelabels?id=${encodeURIComponent(whitelabel.id)}` }\n'
    assert.equal(source.split(currentCrumb).length,2,'Only reviewed responsive breadcrumb clipping may change')
    source=source.replace(currentCrumb,'    ? { label: whitelabel.name, href: `#/whitelabels?id=${encodeURIComponent(whitelabel.id)}` }\n')
  }
  assert.equal(createHash('sha256').update(source).digest('hex'),fingerprints[path],`Unreviewed change in 360/readiness boundary: ${path}`)
  return true
}
export const outsideReviewed360=output=>output.trim().split('\n').filter(Boolean).filter(path=>!reviewed360(path))
export function withoutReadinessGate(source){
  let code=withoutAuditRawQuery(source)
  for(const exact of ["import { viewAvailable } from './presentationAvailability'\n","import { ReadinessUnavailablePage } from './ReadinessUnavailablePage'\n",'  if (!viewAvailable(route.view)) return <ReadinessUnavailablePage />\n']){
    assert.equal(code.split(exact).length,2,'Readiness route adaptation must occur exactly once');code=code.replace(exact,'')
  }
  return code
}
