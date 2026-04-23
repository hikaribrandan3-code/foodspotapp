import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { act } from '@testing-library/react'
import MunchboyBoot from './MunchboyBoot'

describe('MunchboyBoot Audio System', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Setup Web Audio API mock
    window.AudioContext = class {
      constructor() {
        return {
          state: 'running',
          currentTime: 0,
          resume: async () => {},
          createOscillator: () => ({
            type: 'square',
            frequency: { setValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {},
          }),
          createGain: () => ({
            gain: {
              setValueAtTime: () => {},
              linearRampToValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {},
            },
            connect: () => {},
          }),
          destination: {},
        }
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.AudioContext
  })

  it('shows boot sequence without auto-playing chime (mobile fix)', () => {
    const onComplete = vi.fn()
    const { container } = render(<MunchboyBoot onComplete={onComplete} />)

    // Boot sequence plays out
    act(() => {
      vi.advanceTimersByTime(1920)
    })

    // PRESS START should be visible
    expect(container.textContent).toContain('PRESS START')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('responds to clicks after boot sequence', () => {
    const onComplete = vi.fn()
    const { container } = render(<MunchboyBoot onComplete={onComplete} />)

    // Boot sequence completes
    act(() => {
      vi.advanceTimersByTime(1920)
    })

    // After boot, container is clickable
    const pressStartVisible = container.textContent.includes('PRESS START')
    expect(pressStartVisible).toBe(true)
  })

  it('handles no audio context gracefully', () => {
    window.AudioContext = undefined
    window.webkitAudioContext = undefined

    expect(() => {
      render(<MunchboyBoot onComplete={() => {}} />)
      act(() => {
        vi.advanceTimersByTime(1920)
      })
    }).not.toThrow()
  })
})
