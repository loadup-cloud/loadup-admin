import { Select, type SelectProps } from 'antd'
import { useEffect, useState } from 'react'
import { toUpmsPage, type UpmsUser } from '../../utils/upms'
import { useUpms } from '../../utils/useUpms'

type ActorOption = { value: string; label: string }

export default function ActorFilter({ value, onChange }: Pick<SelectProps<string>, 'value' | 'onChange'>) {
  const request = useUpms()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ keyword: string; options: ActorOption[] }>()
  const [selected, setSelected] = useState<ActorOption>()
  const keyword = search.trim()

  useEffect(() => {
    if (!keyword) return
    let current = true
    const timer = window.setTimeout(async () => {
      try {
        const response = await request<UpmsUser[]>('/upms/user/list', { username: keyword, page: 1, size: 10 })
        const options = toUpmsPage(response).data.map(({ id, username, nickname }) => ({
          value: id,
          label: nickname && nickname !== username ? `${username}（${nickname}）` : username,
        }))
        if (current) setResults({ keyword, options })
      } catch {
        if (current) setResults({ keyword, options: [] })
      }
    }, 250)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [keyword, request])

  const options = results?.keyword === keyword ? [...results.options] : []
  if (selected && selected.value === value && !options.some((option) => option.value === value)) {
    options.unshift(selected)
  }
  if (keyword && !options.some((option) => option.value === keyword)) {
    options.push({ value: keyword, label: `按 ID 查询：${keyword}` })
  }

  return (
    <Select<string>
      aria-label="操作人"
      placeholder="搜索账号、昵称或输入操作人 ID"
      value={value}
      onChange={(actorId, option) => {
        setSelected(options.find((item) => item.value === actorId))
        setSearch('')
        onChange?.(actorId, option)
      }}
      allowClear
      loading={Boolean(keyword) && results?.keyword !== keyword}
      showSearch={{ searchValue: search, onSearch: setSearch, filterOption: false }}
      options={options}
    />
  )
}
