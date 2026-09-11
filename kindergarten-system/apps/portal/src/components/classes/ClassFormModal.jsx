import { useState } from 'react'

const EMPTY_FORM = {
  name: '',
  branchId: '1',
  academicYearId: 'ay-2026',
  termId: 'term-2-2026',
  level: 'Age 5',
  teacherId: '',
  room: '',
  capacity: 20,
  schedule: 'Mon–Fri · 8:00 AM',
  status: 'active',
}

function ClassForm({ classRecord, branches, teachers, academicYears, terms, onClose, onSave }) {
  const [form, setForm] = useState(() => classRecord ? { ...classRecord } : { ...EMPTY_FORM })
  const isEdit = Boolean(classRecord)
  const branchTeachers = teachers.filter(
    (teacher) => teacher.position === 'teacher' && teacher.branchId === form.branchId,
  )
  const availableTerms = terms.filter((term) => term.academicYearId === form.academicYearId)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({
      ...previous,
      [name]: name === 'capacity' ? Number(value) : value,
      ...(name === 'branchId' ? { teacherId: '' } : {}),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">{isEdit ? 'Edit Class' : 'Add New Class'}</h2>
        <p className="mt-1 text-sm text-[#888]">Connect a class to its branch, academic period, teacher and capacity.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class Name" name="name" value={form.name} onChange={handleChange} required />
            <Select label="Branch" name="branchId" value={form.branchId} onChange={handleChange} options={branches.map((item) => ({ value: item.id, label: item.name }))} />
            <Select label="Academic Year" name="academicYearId" value={form.academicYearId} onChange={handleChange} options={academicYears.map((item) => ({ value: item.id, label: item.name }))} />
            <Select label="Term" name="termId" value={form.termId} onChange={handleChange} options={availableTerms.map((item) => ({ value: item.id, label: item.name }))} />
            <Field label="Level" name="level" value={form.level} onChange={handleChange} required />
            <Select label="Teacher" name="teacherId" value={form.teacherId} onChange={handleChange} placeholder="Unassigned" options={branchTeachers.map((item) => ({ value: item.id, label: item.name }))} />
            <Field label="Room" name="room" value={form.room} onChange={handleChange} required />
            <Field label="Capacity" name="capacity" type="number" min={1} value={form.capacity} onChange={handleChange} required />
          </div>
          <Field label="Schedule" name="schedule" value={form.schedule} onChange={handleChange} required />
          <Select label="Status" name="status" value={form.status} onChange={handleChange} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555] hover:bg-[#FAF4E7]">Cancel</button>
            <button type="submit" className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7] hover:bg-[#2a2a2a]">{isEdit ? 'Save Changes' : 'Add Class'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClassFormModal({ open, ...props }) {
  if (!open) return null
  return <ClassForm key={props.classRecord?.id ?? 'new-class'} {...props} />
}

function Field({ label, ...props }) {
  return (
    <label className="block text-xs font-semibold text-[#555]">
      <span className="mb-1.5 block">{label}</span>
      <input {...props} className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]" />
    </label>
  )
}

function Select({ label, options, placeholder, ...props }) {
  return (
    <label className="block text-xs font-semibold text-[#555]">
      <span className="mb-1.5 block">{label}</span>
      <select {...props} className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753]">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
