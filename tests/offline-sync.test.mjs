import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

class MockLocalStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(key) {
    return this.store.get(key) ?? null
  }
  setItem(key, val) {
    this.store.set(key, String(val))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

describe('Offline Storage & State Resilience', () => {
  it('manages outbox queue lifecycle with optimistic read/write', () => {
    const storage = new MockLocalStorage()
    const KEY = 'nc_outbox_v1'

    function readOutbox() {
      try {
        return JSON.parse(storage.getItem(KEY) ?? '[]')
      } catch {
        return []
      }
    }

    function writeOutbox(entries) {
      storage.setItem(KEY, JSON.stringify(entries))
    }

    assert.equal(readOutbox().length, 0)

    writeOutbox([{ id: '1', kind: 'incident', body: { description: 'Road block' } }])
    assert.equal(readOutbox().length, 1)

    // Flush simulation
    const remaining = []
    writeOutbox(remaining)
    assert.equal(readOutbox().length, 0)
  })

  it('migrates legacy outbox items gracefully without losing data', () => {
    const storage = new MockLocalStorage()
    const LEGACY_KEY = 'nc_outbox'
    const NEW_KEY = 'nc_outbox_v1'

    storage.setItem(LEGACY_KEY, JSON.stringify([{ id: 'legacy-1' }]))

    function migrate() {
      const legacy = JSON.parse(storage.getItem(LEGACY_KEY) ?? '[]')
      const current = JSON.parse(storage.getItem(NEW_KEY) ?? '[]')
      if (legacy.length > 0) {
        storage.removeItem(LEGACY_KEY)
        const merged = [...current, ...legacy]
        storage.setItem(NEW_KEY, JSON.stringify(merged))
        return merged
      }
      return current
    }

    const result = migrate()
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'legacy-1')
    assert.equal(storage.getItem(LEGACY_KEY), null)
    assert.ok(storage.getItem(NEW_KEY).includes('legacy-1'))
  })
})
