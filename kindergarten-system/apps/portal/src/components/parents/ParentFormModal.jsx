import { useState } from 'react'

const EMPTY_PARENT = {
  name: '',
  icNo: '',
  phone: '',
  email: '',
  address: '',
  occupation: '',
  branchId: '1',
  status: 'active',
  communication: 'WhatsApp',
}

function ParentForm({ parent, branches, selfService, onClose, onSave }) {
  const [form, setForm] = useState(() => parent ? { ...parent } : { ...EMPTY_PARENT })

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const allowed = selfService
      ? { phone: form.phone, email: form.email, address: form.address, occupation: form.occupation, communication: form.communication }
      : form
    onSave(allowed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">{selfService ? 'Update My Contact Details' : parent ? 'Edit Parent' : 'Add Parent'}</h2>
        <p className="mt-1 text-sm text-[#888]">{selfService ? 'Identity and account status can only be changed by the school.' : 'Maintain guardian identity, contact and branch information.'}</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!selfService && <div className="grid gap-4 sm:grid-cols-2"><Field label="Full Name" name="name" value={form.name} onChange={handleChange} required /><Field label="IC / Passport" name="icNo" value={form.icNo} onChange={handleChange} /></div>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" name="phone" value={form.phone} onChange={handleChange} required /><Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required /></div>
          <Field label="Address" name="address" value={form.address} onChange={handleChange} />
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Occupation" name="occupation" value={form.occupation} onChange={handleChange} /><Select label="Preferred Communication" name="communication" value={form.communication} onChange={handleChange} options={['WhatsApp', 'Email', 'SMS']} /></div>
          {!selfService && <div className="grid gap-4 sm:grid-cols-2"><Select label="Primary Branch" name="branchId" value={form.branchId} onChange={handleChange} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} objectOptions /><Select label="Status" name="status" value={form.status} onChange={handleChange} options={['active', 'inactive']} /></div>}
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="flex-1 rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555]">Cancel</button><button type="submit" className="flex-1 rounded-full bg-[#174B2B] py-3 text-sm font-bold text-[#FAF4E7]">Save Changes</button></div>
        </form>
      </div>
    </div>
  )
}

export default function ParentFormModal({ open, ...props }) {
  if (!open) return null
  return <ParentForm key={props.parent?.id ?? 'new-parent'} {...props} />
}

function Field({ label, ...props }) {
  return <label className="block text-xs font-semibold text-[#555]"><span className="mb-1.5 block">{label}</span><input {...props} className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753]" /></label>
}

function Select({ label, options, objectOptions, ...props }) {
  return <label className="block text-xs font-semibold text-[#555]"><span className="mb-1.5 block">{label}</span><select {...props} className="w-full rounded-2xl border border-[#EBEBEB] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#638753]">{options.map((option) => { const value = objectOptions ? option.value : option; const text = objectOptions ? option.label : option; return <option key={value} value={value}>{text}</option> })}</select></label>
}
