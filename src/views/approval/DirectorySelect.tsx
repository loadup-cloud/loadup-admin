import { Select } from 'antd'
import { useEffect, useState } from 'react'
import type { Option } from './model'
import { useApproval } from './model'

type Props = { app: string; path: string; label: string; disabled?: boolean } & (
  { multiple: true; value?: string[]; onChange?: (value: string[]) => void }
  | { multiple?: false; value?: string; onChange?: (value: string | undefined) => void }
)

export default function DirectorySelect(props: Props) {
  const request = useApproval(props.app)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ key: string; data: Option[]; failed?: boolean }>()
  const [selected, setSelected] = useState<Option[]>([])
  const query = search.trim()
  const key = `${props.path}|${query}`

  useEffect(() => {
    let live = true
    const separator = props.path.includes('?') ? '&' : '?'
    const timer = window.setTimeout(() => {
      void request<Option[]>(`${props.path}${separator}q=${encodeURIComponent(query)}&limit=30`).then((data) => {
        if (live) setResults({ key, data })
      }).catch(() => {
        if (live) setResults({ key, data: [], failed: true })
      })
    }, 200)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [request, props.path, query, key])

  const result = results?.key === key ? results : undefined
  const ids = Array.isArray(props.value) ? props.value : props.value ? [props.value] : []
  const options = new Map(ids.map((id) => [id, { id, label: id }]))
  for (const item of [...selected, ...(result?.data ?? [])]) options.set(item.id, item)
  const common = {
    'aria-label': props.label,
    placeholder: props.label,
    disabled: props.disabled,
    allowClear: true,
    showSearch: { searchValue: search, onSearch: setSearch, filterOption: false as const },
    options: [...options.values()].map(({ id, label }) => ({ value: id, label })),
    style: { width: '100%' },
    loading: !result,
    notFoundContent: result?.failed ? '查询失败，请重新搜索' : '没有匹配的人选或组织',
  }

  function remember(values: string[]) {
    setSelected(values.map((id) => options.get(id) ?? { id, label: id }))
    setSearch('')
  }

  if (props.multiple) {
    return <Select<string[]> {...common} mode="multiple" value={props.value} onChange={(values) => {
      remember(values)
      props.onChange?.(values)
    }} />
  }
  return <Select<string> {...common} value={props.value} onChange={(value) => {
    remember(value ? [value] : [])
    props.onChange?.(value)
  }} />
}
