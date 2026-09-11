import { useState } from 'react'
import { MANAGEABLE_ROLES, ROLE_LABELS, ROLES } from '../../constants/roles'

const emptyForm = {
  name: '',
  email: '',
  roleId: ROLES.teacher,
  branchId: '',
}

export default function UserFormModal({ open, ...props }) {
  return open ? <UserForm {...props} /> : null
}

function UserForm({ branches, onClose, onSave }) {
  const [form, setForm] = useState(() => emptyForm)
  const needsBranch = form.roleId !== ROLES.superAdmin

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'roleId' ? Number(value) : value,
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      branchId: form.roleId === ROLES.superAdmin ? null : form.branchId,
    })
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
        <h2 className="text-xl font-extrabold text-[#174B2B]">Add New User</h2>
        <p className="mt-1 text-sm text-[#888]">
          Create a new account and assign a role and branch.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#555]">Role</label>
            <select
              name="roleId"
              value={form.roleId}
              onChange={handleChange}
              className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
            >
              {MANAGEABLE_ROLES.map((roleId) => (
                <option key={roleId} value={roleId}>
                  {ROLE_LABELS[roleId]}
                </option>
              ))}
            </select>
          </div>

          {needsBranch && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#555]">Branch</label>
              <select
                name="branchId"
                value={form.branchId}
                onChange={handleChange}
                required
                className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
              >
                <option value="">Select branch...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#555]">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
      />
    </div>
  )
}
