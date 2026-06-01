export const exportContactsToCSV = (contacts) => {
  const rows = [
    ['Name', 'Phone'],
    ...contacts.map(c => [c.name || '', c.phone])
  ]
  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
