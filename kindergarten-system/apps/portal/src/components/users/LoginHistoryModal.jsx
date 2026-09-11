export default function LoginHistoryModal({ open, user, history, onClose }) {
  if (!open || !user) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-[#174B2B]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 className="text-xl font-extrabold text-[#174B2B]">Login History</h2>
        <p className="mt-1 text-sm text-[#888]">
          {user.name} · {user.email}
        </p>

        <div className="mt-5 max-h-[360px] overflow-y-auto">
          {history.length > 0 ? (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-[#F0F0F0] px-4 py-3"
                >
                  <p className="text-sm font-bold text-[#174B2B]">{entry.timestamp}</p>
                  <p className="mt-0.5 text-xs text-[#888]">{entry.device}</p>
                  <p className="mt-0.5 text-xs text-[#AAA]">IP: {entry.ip}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[#888]">No login history recorded.</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full border border-[#EBEBEB] py-3 text-sm font-bold text-[#555] transition hover:bg-[#FAF4E7]"
        >
          Close
        </button>
      </div>
    </div>
  )
}
