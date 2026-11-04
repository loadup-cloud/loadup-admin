import request from '@/request'
import type {
  CatalogKind,
  CatalogQuery,
  CatalogSave,
  CatalogVersion,
  ContractStatus,
  MerchantContract,
  PageQuery,
  SignContract
} from './types'
export * from './types'
export * from './draft-adapter'

const post = <T>(path: string, data: object) =>
  request.post<T>({ url: `/api/productmng/${path}`, data })
const postMerchantContract = <T>(path: string, data: object) =>
  request.post<T>({ url: `/api/merchantmng/product/merchant-contracts/${path}`, data })
export const saveCatalog = <K extends CatalogKind>(data: CatalogSave<K>) =>
  post<CatalogVersion<K>>('catalog/save', data)
export const queryCatalog = <K extends CatalogKind>(data: CatalogQuery<K>) =>
  post<CatalogVersion<K>[]>('catalog/page', data)
export const getCatalog = <K extends CatalogKind>(id: string) =>
  post<CatalogVersion<K>>('catalog/detail', { id })
export const publishCatalog = <K extends CatalogKind>(id: string, expectedRowVersion: number) =>
  post<CatalogVersion<K>>('catalog/publish', { id, expectedRowVersion })
export const retireCatalog = <K extends CatalogKind>(id: string, expectedRowVersion: number) =>
  post<CatalogVersion<K>>('catalog/retire', { id, expectedRowVersion })
export const previewContract = (data: SignContract) =>
  postMerchantContract<MerchantContract>('preview', data)
export const signContract = (data: SignContract) =>
  postMerchantContract<MerchantContract>('sign', data)
export const queryContracts = (data: PageQuery & { merchantId?: string }) =>
  postMerchantContract<MerchantContract[]>('page', data)
export const getContract = (id: string) =>
  postMerchantContract<MerchantContract>('detail', { id })
export const changeContractStatus = (
  id: string,
  expectedGeneration: number,
  status: ContractStatus
) => postMerchantContract<MerchantContract>('status', { id, expectedGeneration, status })

// Generate once when starting a signing action; reuse on transport retries.
export const newSigningRequestKey = () => crypto.randomUUID()
