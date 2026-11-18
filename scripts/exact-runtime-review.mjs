import assert from 'node:assert/strict'

// Used only by historical source checks. Behavioral test loaders always read disk directly.
export function createExactRuntimeReview({ label, baseline, allowedPaths, digest }, manifest, readCurrent, readBaseline) {
  assert.equal(manifest.baseline, baseline)
  assert.equal(typeof manifest.finalized, 'boolean')
  assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files))
  for (const [path, pin] of Object.entries(manifest.files)) {
    assert.ok(allowedPaths.includes(path), `Unqualified ${label} review path: ${path}`)
    assert.deepEqual(Object.keys(pin).sort(), ['after', 'before'])
    assert.match(pin.after, /^[a-f0-9]{64}$/)
    assert.ok(pin.before === null || /^[a-f0-9]{64}$/.test(pin.before))
    assert.notEqual(pin.before, pin.after)
  }
  const pinFor = path => manifest.finalized && Object.hasOwn(manifest.files, path) ? manifest.files[path] : undefined
  function reviewed(path) {
    const pin = pinFor(path)
    if (!pin) return false
    assert.equal(digest(readCurrent(path), path), pin.after, `Unreviewed physical ${label} source: ${path}`)
    return true
  }
  function without(path, source) {
    const pin = pinFor(path)
    if (!pin) return source
    reviewed(path)
    if (pin.before === null || digest(source, path) !== pin.after) return source
    const previous = readBaseline(path)
    assert.equal(digest(previous, path), pin.before, `Changed ${label} predecessor: ${path}`)
    return typeof previous === 'string' ? previous.replaceAll('\r\n', '\n') : previous
  }
  return {
    reviewed, without,
    exclusions: () => {
      assert.equal(manifest.finalized, true, `${label} review not finalized`)
      return Object.keys(manifest.files).map(path => { assert.equal(reviewed(path), true); return `:(exclude)${path}` })
    },
  }
}
