import { useCallback, useState } from 'react'
import { toUpmsPage } from '../../utils/upms'
import { upmsErrorText, useUpms } from '../../utils/useUpms'

type DictionaryEntry = {
  id: string
  description?: string | null
  enabled: boolean
}

export type DictionaryType = DictionaryEntry & { code: string; name: string }
export type DictionaryItem = DictionaryEntry & { value: string; label: string; sortOrder: number }
export type DictionaryFilters = { keyword?: string; status?: 'enabled' | 'disabled' }

export const statusFilterOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]

export const dictionaryPagination = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  locale: { items_per_page: '条/页' },
}

const filterPageSize = 100

export function useDictionaryTable<T extends DictionaryEntry>(
  resource: 'types' | 'items',
  matchesKeyword: (row: T, keyword: string) => boolean,
  typeCode?: string,
) {
  const request = useUpms()
  const [error, setError] = useState('')

  const loadPage = useCallback(async ({ current = 1, pageSize = 20, keyword, status }: DictionaryFilters & {
    current?: number
    pageSize?: number
  }) => {
    setError('')
    const read = async (page: number, size: number) => toUpmsPage(
      await request<T[]>(`/dictionaries/${resource}/list`, { typeCode, page, size }),
    )

    try {
      const term = keyword?.trim().toLowerCase()
      if (!term && !status) return await read(current, pageSize)

      const matches = (row: T) => (!status || row.enabled === (status === 'enabled'))
        && (!term || matchesKeyword(row, term))
      const first = await read(1, filterPageSize)
      const filtered = first.data.filter(matches)
      // The list endpoints accept pagination only. Filter the entire collection.
      for (let page = 2; (page - 1) * filterPageSize < first.total; page += 1) {
        const { data } = await read(page, filterPageSize)
        filtered.push(...data.filter(matches))
        if (data.length < filterPageSize) break
      }
      const offset = (current - 1) * pageSize
      return { data: filtered.slice(offset, offset + pageSize), total: filtered.length, success: true }
    } catch (failure) {
      setError(upmsErrorText(failure))
      return { data: [], total: 0, success: true }
    }
  }, [matchesKeyword, request, resource, typeCode])

  return { error, loadPage }
}
