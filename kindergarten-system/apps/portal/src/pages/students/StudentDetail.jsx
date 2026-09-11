import { useState } from 'react'
import { useStudents } from '../../context/StudentContext'
import { useBranches } from '../../context/BranchContext'
import { useAuth } from '../../context/AuthContext'
import { ROLES } from '../../constants/roles'
import TransferBranchModal from '../../components/students/TransferBranchModal'

function InfoCard({ title, children }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <h3 className="text-base font-bold text-[#174B2B]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function AttendanceBadge({ status }) {
  const styles = {
    present: 'bg-[#E8F5E9] text-[#2E7D32]',
    absent: 'bg-[#FFEBEE] text-[#C62828]',
    late: 'bg-[#F2F0DF] text-[#174B2B]',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${styles[status] ?? 'bg-[#F0F0F0] text-[#666]'}`}>
      {status}
    </span>
  )
}

export default function StudentDetail({ studentId, onBack }) {
  const { userRole } = useAuth()
  const { branches } = useBranches()
  const { getStudent, getProfile, transferBranch } = useStudents()
  const [transferOpen, setTransferOpen] = useState(false)

  const student = getStudent(studentId)
  const profile = getProfile(studentId)
  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]))
  const canTransfer = userRole === ROLES.superAdmin

  if (!student) {
    return (
      <div className="pb-2">
        <button type="button" onClick={onBack} className="mb-4 text-sm font-semibold text-[#888] hover:text-[#174B2B]">
          ← Back to students
        </button>
        <p className="text-sm text-[#888]">Student not found.</p>
      </div>
    )
  }

  return (
    <div className="pb-2">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#888] transition hover:text-[#174B2B]"
      >
        ← Back to students
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#174B2B]">{student.name}</h2>
          <p className="mt-1 text-sm text-[#888]">
            {branchMap[student.branchId]} · {student.className} · Age {student.age}
          </p>
        </div>
        {canTransfer && (
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="rounded-full border border-[#EBEBEB] px-5 py-2.5 text-sm font-bold text-[#555] transition hover:bg-[#F2F0DF]"
          >
            Transfer Branch
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <InfoCard title="Student Profile">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Full Name</dt>
              <dd className="font-bold text-[#174B2B]">{student.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Branch</dt>
              <dd className="font-bold text-[#174B2B]">{branchMap[student.branchId]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Class</dt>
              <dd className="font-bold text-[#174B2B]">{student.className}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Parent / Guardian</dt>
              <dd className="font-bold text-[#174B2B]">{student.parentName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Status</dt>
              <dd className="font-bold capitalize text-[#174B2B]">{student.status}</dd>
            </div>
          </dl>
        </InfoCard>

        <InfoCard title="Emergency Contact">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Name</dt>
              <dd className="font-bold text-[#174B2B]">{profile.emergencyContact.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Relationship</dt>
              <dd className="font-bold text-[#174B2B]">{profile.emergencyContact.relationship}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Phone</dt>
              <dd className="font-bold text-[#174B2B]">{profile.emergencyContact.phone}</dd>
            </div>
          </dl>
        </InfoCard>

        <InfoCard title="Medical Information">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Blood Type</dt>
              <dd className="font-bold text-[#174B2B]">{profile.medical.bloodType}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Allergies</dt>
              <dd className="font-bold text-[#174B2B]">{profile.medical.allergies}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#888]">Conditions</dt>
              <dd className="font-bold text-[#174B2B]">{profile.medical.conditions}</dd>
            </div>
          </dl>
        </InfoCard>

        <InfoCard title="Attendance">
          {profile.attendance.length > 0 ? (
            <ul className="space-y-2">
              {profile.attendance.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between rounded-2xl border border-[#F0F0F0] px-4 py-3 text-sm"
                >
                  <span className="font-semibold text-[#174B2B]">{record.date}</span>
                  <AttendanceBadge status={record.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#888]">No attendance records yet.</p>
          )}
        </InfoCard>
      </div>

      <TransferBranchModal
        open={transferOpen}
        student={student}
        branches={branches}
        currentBranchName={branchMap[student.branchId]}
        onClose={() => setTransferOpen(false)}
        onTransfer={transferBranch}
      />
    </div>
  )
}
