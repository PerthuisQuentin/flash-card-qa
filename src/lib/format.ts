/** "aujourd’hui à 14:30", "demain à 09:00" or "le mardi 14 octobre". */
export function formatDueDate(date: Date, now: Date): string {
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === now.toDateString()) return `aujourd’hui à ${time}`
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return `demain à ${time}`
  return `le ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
}

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}
