import type { Storage } from 'unstorage'

export enum WeilaErrorCode {
  SUCCESS = 0,
  TOKEN_INVALID = 31,
}

export interface WeilaResponse<T = any> {
  errcode: WeilaErrorCode
  errmsg: string
  data: T
}

export interface RefreshTokenResult {
  token: string
  refreshToken: string
  expiresIn?: number
}

export interface CreateWeilaFetchOptions {
  appId: string
  appKey: string
  baseURL?: string
  storage?: Storage
  onRefreshToken?: () => Promise<RefreshTokenResult>
  onLogout?: () => void | Promise<void>
  refreshThreshold?: number
}

export interface V2QueryParams {
  appid: string
  et: string
  sign: string
  uuid: string
  token?: string | null
}
