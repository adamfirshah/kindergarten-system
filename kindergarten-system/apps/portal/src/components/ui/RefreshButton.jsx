export default function RefreshButton({ loading = false, disabled, children = 'Refresh', className = '', ...props }) {
  return <button {...props} type="button" disabled={disabled || loading} aria-busy={loading} className={`refresh-button ${className}`}>
    <svg className={loading ? 'refresh-icon is-refreshing' : 'refresh-icon'} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7v5h-5M4 17v-5h5M6.2 7a7 7 0 0 1 11.5-1L20 9M4 15l2.3 3A7 7 0 0 0 17.8 17" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span>{children}</span>
  </button>
}
