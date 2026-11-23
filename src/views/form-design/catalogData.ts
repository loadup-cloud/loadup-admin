import { useCallback, useEffect, useState } from 'react'
import { useUpms, useUpmsData } from '../../utils/useUpms'
import { designError, type FieldVersion, type Group, type Version } from './catalog'

export const pageSize = 20

export function useCatalogPage<T>(path: string, page: number, query = '') {
  return useUpmsData<T[]>(`${path}?limit=${pageSize + 1}&offset=${(page - 1) * pageSize}${query}`, undefined, 'GET')
}

export function useReferences(path: string, withGroups: boolean) {
  const request = useUpms()
  const [state, setState] = useState<{
    fields: FieldVersion[]
    groups: Version<Group>[]
    loading: boolean
    error: string
  }>({ fields: [], groups: [], loading: true, error: '' })

  const loadList = useCallback(async <T,>(resource: string) => {
    const limit = 100
    const result: T[] = []
    for (let offset = 0; ; offset += limit) {
      const { data } = await request<T[]>(`${path}/${resource}?limit=${limit}&offset=${offset}`, undefined, 'GET')
      if (!Array.isArray(data)) throw new Error('表单服务未返回配置列表。')
      result.push(...data)
      if (data.length < limit) return result
    }
  }, [path, request])

  useEffect(() => {
    let active = true
    void Promise.all([
      loadList<FieldVersion>('fields'),
      withGroups ? loadList<Version<Group>>('groups') : Promise.resolve([]),
    ]).then(([fields, groups]) => {
      if (active) setState({ fields, groups, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (active) setState({ fields: [], groups: [], loading: false, error: designError(error) })
    })
    return () => { active = false }
  }, [loadList, withGroups])

  return state
}
