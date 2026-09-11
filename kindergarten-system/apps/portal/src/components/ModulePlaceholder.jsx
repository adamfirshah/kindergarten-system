export default function ModulePlaceholder({ title }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] bg-white p-10 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F0DF] text-3xl">
        🚧
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-[#174B2B]">{title}</h2>
      <p className="mt-2 text-sm text-[#888]">This module is coming soon.</p>
    </div>
  )
}
