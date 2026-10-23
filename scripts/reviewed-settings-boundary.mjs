import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { root } from './operators-test-harness.mjs'
// Exact reviewed Settings unit; never a directory exemption or authorization bypass.
const pins={
  "src/features/whitelabel-settings/settingsReadApi.ts": "beb38a8caa47bfcee4bece04e74a08b34cc28feef36fadd7f25eaf6830a71e65",
  "src/features/whitelabel-accounts/AccountsWhitelabelSelector.tsx": "b48ada2204ea2268a80e2a0688447ec5013f47c2cb9c9223a8b2cff51dac39f2",
  "src/features/whitelabel-settings/WhitelabelSettingsPage.tsx": "706007e0f84ddf2377ccda8789dbee78f2ba04da84be99d0503b203edb2ac7df",
  "src/features/whitelabel-settings/SettingsRead.module.css": "8674375ac7552f64933c98627302eb9b001dd7f7597edfac51a469ab15add2be",
  "src/app/presentationAvailability.ts": "75c3ec289506b65d9c30f813b1334f6e1abd8dd1d786c1a8ed0bf6f8a8e5b047",
  "src/features/whitelabel-settings/useSettingsRead.ts": "6cf49a629c1a99fc5f9dee9666744def415f851853ef656855eb8ada3cab32ab",
  "src/features/whitelabel-settings/OperationalSettingsPage.tsx": "cdc872960e24f7b491afc8c63ac76b6ebafceb52b2581e144e1cbba4dacb2bdd"
}
const hash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')
export function verifySettingsSource(path,source){
  if(!Object.hasOwn(pins,path))return false
  assert.equal(hash(source),pins[path],`Unreviewed Settings source: ${path}`)
  return true
}
export function reviewedSettings(path){return Object.hasOwn(pins,path)&&verifySettingsSource(path,readFileSync(resolve(root,path),'utf8'))}
export function withoutSettingsReadiness(source){
  verifySettingsSource('src/app/presentationAvailability.ts',source)
  return source.replaceAll('\r\n','\n')
    .replace("new Set(['emails',", "new Set(['settings', 'emails',")
    .replace("new Set(['sistema', 'ajuda', 'whitelabel-emails',", "new Set(['sistema', 'ajuda', 'whitelabel-settings', 'whitelabel-emails',")
    .split('\n').filter(line=>!line.includes("if (id === 'whitelabel-settings'")).join('\n')
}
