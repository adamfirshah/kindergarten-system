import { useState } from 'react'

const SUBSCRIPTIONS = ['Premium', 'Standard', 'Basic']
const emptyForm = {
  name: '',
  address: '',
  phone: '',
  students: 0,
  staff: 0,
  capacity: 0,
  status: 'active',
  subscription: 'Standard',
}

export default function BranchFormModal({ open, ...props }) {
  return open ? <BranchForm key={props.branch?.id ?? "new"} {...props} /> : null
}

function BranchForm({ branch, onClose, onSave }) {
  const [form, setForm] = useState(() => branch ? { ...branch } : emptyForm)
  const isEdit = Boolean(branch)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: ['students', 'staff', 'capacity'].includes(name) ? Number(value) : value,
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">
          {isEdit ? 'Edit Branch Details' : 'Add New Kindergarten'}
        </h2>
        <p className="mt-1 text-sm text-[#888]">
          {isEdit ? 'Update branch information and capacity.' : 'Register a new branch to the system.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Branch Name" name="name" value={form.name} onChange={handleChange} required />
          <Field label="Address" name="address" value={form.address} onChange={handleChange} required />
          <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} />

          <div className="grid grid-cols-3 gap-3">
            <Field label="Students" name="students" type="number" min={0} value={form.students} onChange={handleChange} />
            <Field label="Staff" name="staff" type="number" min={0} value={form.staff} onChange={handleChange} />
            <Field label="Capacity" name="capacity" type="number" min={0} value={form.capacity} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#555]">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#555]">Subscription</label>
              <select
                name="subscription"
                value={form.subscription}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
              >
                {SUBSCRIPTIONS.map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555] transition hover:bg-[#FAF4E7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7] transition hover:bg-[#2a2a2a]"
            >
              {isEdit ? 'Save Changes' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required, min }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#555]">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
      />
    </div>
  )
}
