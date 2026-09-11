import './styles.css'

export function Button({ children, className = '', ...props }) {
  return <button className={`ks-button ${className}`.trim()} {...props}>{children}</button>
}
