export function EmptyTable({ title, description }: { title: string; description: string }) {
  return <div className="la-empty-table" role="status">
    <svg className="la-empty-table-art" viewBox="0 0 160 132" fill="none" aria-hidden="true">
      <rect x="19" y="23" width="122" height="86" rx="11" fill="#FAFBFD" stroke="#D8DCE3" strokeWidth="2" />
      <path d="M19 43h122" stroke="#D8DCE3" strokeWidth="2" />
      <circle cx="30" cy="33" r="2" fill="#A5AAB4" /><circle cx="38" cy="33" r="2" fill="#A5AAB4" /><circle cx="46" cy="33" r="2" fill="#A5AAB4" />
      <rect x="32" y="55" width="45" height="6" rx="3" fill="#E5E8EE" /><rect x="86" y="55" width="35" height="6" rx="3" fill="#E5E8EE" />
      <rect x="32" y="70" width="57" height="6" rx="3" fill="#E5E8EE" /><rect x="99" y="70" width="22" height="6" rx="3" fill="#E5E8EE" />
      <rect x="32" y="85" width="37" height="6" rx="3" fill="#E5E8EE" /><rect x="78" y="85" width="43" height="6" rx="3" fill="#E5E8EE" />
      <circle cx="120" cy="96" r="18" fill="white" stroke="#5B12C9" strokeWidth="3" /><path d="m133 109 12 12" stroke="#5B12C9" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
}
