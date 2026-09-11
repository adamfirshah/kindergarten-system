import { Children, useState } from 'react'
export default function PaginatedBody({ children, ...props }) {
  const rows = Children.toArray(children)
  const signature = rows.map(row => row.key).join('|')
  const [selection,setSelection] = useState({ signature:'',page:0 })
  const page = selection.signature === signature ? Math.min(selection.page,Math.max(0,Math.ceil(rows.length/10)-1)) : 0
  return <tbody {...props}>{rows.slice(page*10,page*10+10)}{rows.length>10&&<tr><td colSpan={100} className="pt-4"><nav aria-label="Table pagination" className="flex items-center justify-between gap-3 text-xs"><span>{page*10+1}–{Math.min((page+1)*10,rows.length)} of {rows.length}</span><span className="flex items-center gap-3"><button type="button" disabled={page===0} onClick={()=>setSelection({signature,page:page-1})} className="rounded-full border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page+1} of {Math.ceil(rows.length/10)}</span><button type="button" disabled={(page+1)*10>=rows.length} onClick={()=>setSelection({signature,page:page+1})} className="rounded-full border px-3 py-2 disabled:opacity-40">Next</button></span></nav></td></tr>}</tbody>
}
