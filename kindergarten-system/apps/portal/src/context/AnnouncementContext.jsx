import { useState } from 'react'
import { INITIAL_ANNOUNCEMENTS, INITIAL_ANNOUNCEMENT_RECEIPTS, INITIAL_ANNOUNCEMENT_REPLIES } from '../data/announcementDetails'

import { AnnouncementContext } from './AnnouncementContextStore.js'

export function AnnouncementProvider({ children }) {
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS)
  const [receipts, setReceipts] = useState(INITIAL_ANNOUNCEMENT_RECEIPTS)
  const [replies, setReplies] = useState(INITIAL_ANNOUNCEMENT_REPLIES)

  function addAnnouncement(data) {
    const recipientCount = data.status === 'published' ? (data.branchId ? 20 : 40) : 0
    setAnnouncements((previous) => [{ ...data, id: crypto.randomUUID(), recipientCount, readCount: 0, acknowledgementCount: 0 }, ...previous])
  }

  function updateAnnouncementStatus(id, status) {
    setAnnouncements((previous) => previous.map((item) => item.id === id
      ? { ...item, status, recipientCount: status === 'published' && item.recipientCount === 0 ? (item.branchId ? 20 : 40) : item.recipientCount }
      : item))
  }

  function markRead(announcementId, userId) {
    if (receipts.some((item) => item.announcementId === announcementId && item.userId === userId && item.readAt)) return
    setReceipts((previous) => [...previous, { id: crypto.randomUUID(), announcementId, userId, readAt: '2026-09-03 00:10', acknowledgedAt: '' }])
    setAnnouncements((previous) => previous.map((item) => item.id === announcementId ? { ...item, readCount: item.readCount + 1 } : item))
  }

  function acknowledge(announcementId, userId) {
    const existing = receipts.find((item) => item.announcementId === announcementId && item.userId === userId)
    if (existing?.acknowledgedAt) return
    setReceipts((previous) => existing
      ? previous.map((item) => item.id === existing.id ? { ...item, readAt: item.readAt || '2026-09-03 00:10', acknowledgedAt: '2026-09-03 00:10' } : item)
      : [...previous, { id: crypto.randomUUID(), announcementId, userId, readAt: '2026-09-03 00:10', acknowledgedAt: '2026-09-03 00:10' }])
    setAnnouncements((previous) => previous.map((item) => item.id === announcementId ? { ...item, readCount: existing?.readAt ? item.readCount : item.readCount + 1, acknowledgementCount: item.acknowledgementCount + 1 } : item))
  }

  function addReply(announcementId, userId, author, message) {
    setReplies((previous) => [...previous, { id: crypto.randomUUID(), announcementId, userId, author, message, createdAt: '2026-09-03 00:10' }])
  }

  return <AnnouncementContext.Provider value={{ announcements, receipts, replies, addAnnouncement, updateAnnouncementStatus, markRead, acknowledge, addReply }}>{children}</AnnouncementContext.Provider>
}
