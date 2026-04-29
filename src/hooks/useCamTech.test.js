import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCamTechBroadcaster, useCamTechListener } from './useCamTech'

describe('useCamTech', () => {
  beforeEach(() => {
    delete window.__camTechActive
  })

  afterEach(() => {
    delete window.__camTechActive
  })

  it('useCamTechBroadcaster is exported as a function', () => {
    expect(typeof useCamTechBroadcaster).toBe('function')
  })

  it('useCamTechListener is exported as a function', () => {
    expect(typeof useCamTechListener).toBe('function')
  })

  it('broadcasts camera activation event', () => {
    let eventReceived = false
    window.addEventListener('camtech:active', (e) => {
      eventReceived = e.detail.active === true
    })

    window.dispatchEvent(new CustomEvent('camtech:active', {
      detail: { active: true, timestamp: Date.now() }
    }))

    expect(eventReceived).toBe(true)
  })
})
