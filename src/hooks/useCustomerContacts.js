import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient.js'

export function useCustomerContacts(businessId) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchContacts = useCallback(async () => {
    if (!businessId) return
    const { data } = await supabase
      .from('customer_contacts')
      .select('*')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
    setContacts(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => {
    fetchContacts()
    const sub = supabase
      .channel(`contacts-${businessId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customer_contacts',
        filter: `business_id=eq.${businessId}`
      }, () => fetchContacts())
      .subscribe()
    return () => supabase.removeChannel(sub)
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
    await supabase.from('customer_contacts').delete().eq('id', id)
    await fetchContacts()
  }

  return { contacts, loading, refreshContacts: fetchContacts, addContact, deleteContact }
}
