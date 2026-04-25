import { describe, it, expect } from 'vitest'
import { isOrderPaid } from './paymentStatus.js'

describe('isOrderPaid', () => {
    it('returns true when payment_status is paid', () => {
        expect(isOrderPaid({ payment_status: 'paid' })).toBe(true)
    })

    it('returns true when payment_confirmed is true', () => {
        expect(isOrderPaid({ payment_confirmed: true })).toBe(true)
    })

    it('returns true when both are true', () => {
        expect(isOrderPaid({ payment_status: 'paid', payment_confirmed: true })).toBe(true)
    })

    it('returns false when payment_status is pending and payment_confirmed is false', () => {
        expect(isOrderPaid({ payment_status: 'pending', payment_confirmed: false })).toBe(false)
    })

    it('returns false when payment_status is pending and payment_confirmed is undefined', () => {
        expect(isOrderPaid({ payment_status: 'pending' })).toBe(false)
    })

    it('returns false for null/undefined order', () => {
        expect(isOrderPaid(null)).toBe(false)
        expect(isOrderPaid(undefined)).toBe(false)
    })
})
