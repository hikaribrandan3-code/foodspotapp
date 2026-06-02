import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useCustomerContacts(businessId) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchContacts = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('orders')
      .select('customer_phone, customer_name, created_at')
      .eq('business_id', businessId)
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useCustomerContacts] Fetch error:', error)
      setContacts([])
    } else {
      // Deduplicate by phone — keep most recent order per customer
      const seen = new Set()
      const unique = (data || []).filter(row => {
        const phone = row.customer_phone?.trim()
        if (!phone || seen.has(phone)) return false
        seen.add(phone)
        return true
      }).map(row => ({
        id: row.customer_phone,
        phone: row.customer_phone,
        name: row.customer_name || row.customer_phone,
        updated_at: row.created_at
      }))
      setContacts(unique)
    }
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    fetchContacts()
  }, [businessId, fetchContacts])

  const addContact = async (phone, name) => {
    const { error } = await supabase
      .from('customer_contacts')
      .upsert({ business_id: businessId, phone: phone.trim(), name: name.trim() },
        { onConflict: 'business_id,phone' })
    if (!error) await fetchContacts()
    return { error }
  }

  return { contacts, loading, refreshContacts: fetchContacts, addContact }
}
