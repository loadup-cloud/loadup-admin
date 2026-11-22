import { Select, type SelectProps } from 'antd'
import { useEffect, useState } from 'react'
import { toUpmsPage, type UpmsUser } from '../../utils/upms'
import { useUpms } from '../../utils/useUpms'

type UserOption = { value: string; label: string }
type SingleSelect = Pick<SelectProps<string, UserOption>, 'value' | 'onChange'> & { mode?: never }
type MultipleSelect = Pick<SelectProps<string[], UserOption>, 'value' | 'onChange' | 'maxCount'> & { mode: 'multiple' }

export default function UpmsUserSelect(props: (SingleSelect | MultipleSelect) & {
  id?: string
  label: string
  placeholder: string
}) {
  const { id, value, label, placeholder } = props
  const request = useUpms()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ keyword: string; options: UserOption[]; error?: string }>()
  const [selected, setSelected] = useState<UserOption[]>([])
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
        if (current) setResults({ keyword, options: [], error: '搜索用户失败，请重试。' })
      }
    }, 250)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [keyword, request])

  const result = results?.keyword === keyword ? results : undefined
  const matches = result?.options ?? []
  const values = Array.isArray(value) ? value : value ? [value] : []
  const options = [
    ...matches,
    ...selected.filter((item) => values.includes(item.value) && !matches.some((match) => match.value === item.value)),
  ]
  if (!props.mode && keyword && !options.some((option) => option.value === keyword)) {
    options.push({ value: keyword, label: `按 ID 查询：${keyword}` })
  }

  function rememberSelection(ids: string[]) {
    setSelected(options.filter((option) => ids.includes(option.value)))
    setSearch('')
  }

  const selectProps = {
    id, 'aria-label': label, placeholder, allowClear: true, options,
    loading: Boolean(keyword) && !result,
    notFoundContent: result?.error ?? (keyword ? '没有匹配的用户' : '输入账号或昵称搜索'),
    showSearch: { searchValue: search, onSearch: setSearch, filterOption: false as const },
  }

  if (props.mode === 'multiple') {
    return (
      <Select<string[], UserOption> {...selectProps} mode="multiple" maxCount={props.maxCount} value={props.value}
        onChange={(ids, options) => {
          rememberSelection(ids)
          props.onChange?.(ids, options)
        }} />
    )
  }

  return (
    <Select<string, UserOption> {...selectProps} value={props.value}
      onChange={(userId, option) => {
        rememberSelection(userId ? [userId] : [])
        props.onChange?.(userId, option)
      }} />
  )
}
