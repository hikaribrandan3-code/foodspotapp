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
      .from('customer_contacts')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('[useCustomerContacts] Fetch error:', error)
    }
    setContacts(data || [])
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

  const deleteContact = async (id) => {
    try {
      const { error } = await supabase
        .from('customer_contacts')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .eq('business_id', businessId)
      if (error) {
        console.error('[useCustomerContacts] Archive error:', error)
        return { error }
      }
      console.log('[useCustomerContacts] Archived contact', id)
      await fetchContacts()
      return { error: null }
    } catch (err) {
      console.error('[useCustomerContacts] Archive exception:', err)
      return { error: err }
    }
  }

  return { contacts, loading, refreshContacts: fetchContacts, addContact, deleteContact }
}
