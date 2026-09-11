import { useState } from 'react'
import { INITIAL_HOMEWORK, INITIAL_HOMEWORK_SUBMISSIONS } from '../data/homeworkDetails'

import { HomeworkContext } from './HomeworkContextStore.js'

export function HomeworkProvider({ children }) {
  const [assignments, setAssignments] = useState(INITIAL_HOMEWORK)
  const [submissions, setSubmissions] = useState(INITIAL_HOMEWORK_SUBMISSIONS)

  function addAssignment(data, roster) {
    const assignment = { ...data, id: crypto.randomUUID(), status: 'draft' }
    setAssignments((previous) => [...previous, assignment])
    setSubmissions((previous) => [...previous, ...roster.map((student) => ({
      id: crypto.randomUUID(), assignmentId: assignment.id, studentId: student.id,
      status: 'assigned', submittedAt: '', parentNote: '', attachmentUrl: '', teacherFeedback: '', score: null,
    }))])
  }

  function updateAssignmentStatus(id, status) {
    setAssignments((previous) => previous.map((assignment) => assignment.id === id ? { ...assignment, status } : assignment))
  }

  function submitHomework({ assignmentId, studentId, parentNote, attachmentUrl }) {
    setSubmissions((previous) => {
      const existing = previous.find((item) => item.assignmentId === assignmentId && item.studentId === studentId)
      if (existing) return previous.map((item) => item.id === existing.id ? { ...item, status: 'submitted', submittedAt: '2026-09-02 21:30', parentNote, attachmentUrl } : item)
      return [...previous, { id: crypto.randomUUID(), assignmentId, studentId, status: 'submitted', submittedAt: '2026-09-02 21:30', parentNote, attachmentUrl, teacherFeedback: '', score: null }]
    })
  }

  function reviewSubmission(id, { teacherFeedback, score }) {
    setSubmissions((previous) => previous.map((item) => item.id === id ? { ...item, status: 'reviewed', teacherFeedback, score: score === '' ? null : Number(score) } : item))
  }

  return <HomeworkContext.Provider value={{ assignments, submissions, addAssignment, updateAssignmentStatus, submitHomework, reviewSubmission }}>{children}</HomeworkContext.Provider>
}
