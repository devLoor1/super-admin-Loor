import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { root } from './operators-test-harness.mjs'
import { participantBaseline, participantDigest, createParticipantBoundary, reviewedParticipantCreation, withoutParticipantCreation } from './reviewed-participant-creation-boundary.mjs'
const manifest=JSON.parse(readFileSync(resolve(root,'scripts/participant-creation-reviewed-files.json'),'utf8'))
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).replaceAll('\r\n','\n')
const actualPaths=[...new Set((git('diff','--name-only',participantBaseline,'--','src')+'\n'+git('ls-files','--others','--exclude-standard','--','src')).trim().split(/\r?\n/).filter(Boolean))].sort()
assert.equal(manifest.finalized,true)
assert.deepEqual(Object.keys(manifest.files).sort(),actualPaths)
for(const [path,pin]of Object.entries(manifest.files)){
 assert.equal(reviewedParticipantCreation(path),true)
 const actual=readFileSync(resolve(root,path),'utf8')
 if(pin.before!==null){const prior=git('show',`${participantBaseline}:${path}`);assert.equal(participantDigest(prior),pin.before);assert.equal(withoutParticipantCreation(path,actual),prior)}
 assert.equal(withoutParticipantCreation(path,actual+'// unreviewed'),actual+'// unreviewed')
}
const path='src/lib/api.ts',before='before',after='after',pin={before:participantDigest(before),after:participantDigest(after)}
let physical=after
const local={baseline:participantBaseline,finalized:true,files:{[path]:pin}}
const b=createParticipantBoundary(local,()=>physical,()=>before)
assert.equal(b.without(path,after),before);physical+=' changed';assert.throws(()=>b.reviewed(path))
assert.equal(createParticipantBoundary({...local,finalized:false},()=>after,()=>before).reviewed(path),false)
assert.throws(()=>createParticipantBoundary({...local,files:{'src/lib/authSession.ts':pin}},()=>after,()=>before))
assert.throws(()=>createParticipantBoundary(local,()=>after,()=>before+' changed').without(path,after))
for(const file of ['scripts/ast-settings-reviewed-files.json','scripts/consolidation-reviewed-files.json','scripts/account-ux-reviewed-files.json'])assert.equal(readFileSync(resolve(root,file),'utf8').replaceAll('\r\n','\n'),git('show',`${participantBaseline}:${file}`))
console.log(`Participant review boundary: ${actualPaths.length} exact runtime files and adversarial checks passed; predecessor manifests unchanged.`)
