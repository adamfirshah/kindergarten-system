import { useState } from 'react'
import { HOMEWORK_SUBJECTS } from '../../data/homeworkDetails'

const TODAY = '2026-09-02'

export function AssignmentModal({ open, classes, onClose, onSave }) {
  const [form, setForm] = useState({ classId: classes[0]?.id ?? '', title: '', subject: 'Language', instructions: '', assignedDate: TODAY, dueDate: '2026-09-07', attachmentUrl: '' })
  if (!open) return null
  const fieldClass = 'mt-1.5 w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753]'
  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }))
  function submit(event) {
    event.preventDefault()
    const classRecord = classes.find((item) => item.id === form.classId)
    onSave({ ...form, branchId: classRecord?.branchId, createdBy: classRecord?.teacherId })
    onClose()
  }
  return <ModalShell title="Create Homework" subtitle="New homework starts as a draft." onClose={onClose}><form onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-[#444]">Class<select required value={form.classId} onChange={(event) => setField('classId', event.target.value)} className={fieldClass}><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.displayName ?? item.name}</option>)}</select></label><label className="text-sm font-bold text-[#444]">Subject<select value={form.subject} onChange={(event) => setField('subject', event.target.value)} className={fieldClass}>{HOMEWORK_SUBJECTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-bold text-[#444] sm:col-span-2">Title<input required value={form.title} onChange={(event) => setField('title', event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold text-[#444] sm:col-span-2">Instructions<textarea required rows={4} value={form.instructions} onChange={(event) => setField('instructions', event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold text-[#444]">Assigned Date<input required type="date" value={form.assignedDate} onChange={(event) => setField('assignedDate', event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold text-[#444]">Due Date<input required min={form.assignedDate} type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold text-[#444] sm:col-span-2">Attachment URL (optional)<input type="url" value={form.attachmentUrl} onChange={(event) => setField('attachmentUrl', event.target.value)} className={fieldClass} /></label></div><ModalActions onClose={onClose} submitLabel="Create Draft" /></form></ModalShell>
}

export function SubmissionModal({ open, assignment, student, onClose, onSubmit }) {
  const [form, setForm] = useState({ parentNote: '', attachmentUrl: '' })
  if (!open || !assignment) return null
  function submit(event) { event.preventDefault(); onSubmit({ assignmentId: assignment.id, studentId: student.id, ...form }); onClose() }
  return <ModalShell title="Submit Homework" subtitle={`${student.name} · ${assignment.title}`} onClose={onClose}><form onSubmit={submit}><label className="block text-sm font-bold text-[#444]">Parent Note<textarea rows={5} required value={form.parentNote} onChange={(event) => setForm((previous) => ({ ...previous, parentNote: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#638753]" /></label><label className="mt-4 block text-sm font-bold text-[#444]">Photo / File URL (optional)<input type="url" value={form.attachmentUrl} onChange={(event) => setForm((previous) => ({ ...previous, attachmentUrl: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#E5E5E5] px-4 py-2.5 text-sm outline-none focus:border-[#638753]" /></label><p className="mt-3 rounded-2xl bg-[#F2F0DF] p-3 text-xs text-[#666]">Submitting work does not mark it as reviewed. The teacher will provide feedback separately.</p><ModalActions onClose={onClose} submitLabel="Submit Work" /></form></ModalShell>
}

export function ReviewModal({ open, submission, student, assignment, onClose, onSubmit }) {
  const [form, setForm] = useState({ teacherFeedback: submission?.teacherFeedback ?? '', score: submission?.score ?? '' })
  if (!open || !submission) return null
  function submit(event) { event.preventDefault(); onSubmit(submission.id, form); onClose() }
  return <ModalShell title="Review Submission" subtitle={`${student?.name} · ${assignment?.title}`} onClose={onClose}><form onSubmit={submit}><label className="block text-sm font-bold text-[#444]">Teacher Feedback<textarea rows={5} required value={form.teacherFeedback} onChange={(event) => setForm((previous) => ({ ...previous, teacherFeedback: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#638753]" /></label><label className="mt-4 block text-sm font-bold text-[#444]">Score / 10 (optional)<input type="number" min="0" max="10" step="1" value={form.score} onChange={(event) => setForm((previous) => ({ ...previous, score: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-[#E5E5E5] px-4 py-2.5 text-sm outline-none focus:border-[#638753]" /></label><ModalActions onClose={onClose} submitLabel="Save Review" /></form></ModalShell>
}

function ModalShell({ title, subtitle, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-4" role="dialog" aria-modal="true"><div className="my-auto w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="text-xl font-extrabold text-[#174B2B]">{title}</h3><p className="mt-1 text-sm text-[#888]">{subtitle}</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F0E5] text-lg text-[#666]">×</button></div>{children}</div></div>
}

function ModalActions({ onClose, submitLabel }) {
  return <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-bold text-[#555]">Cancel</button><button type="submit" className="rounded-full bg-[#C3D3A4] px-5 py-2.5 text-sm font-bold text-[#174B2B]">{submitLabel}</button></div>
}
