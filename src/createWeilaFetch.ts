import { ofetch } from 'ofetch'
import { createStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { nanoid } from 'nanoid'
import type { CreateWeilaFetchOptions, V2QueryParams, WeilaResponse } from './types'
import { WeilaErrorCode } from './types'
import { WeilaError } from './errors'
import { getMd5Middle8Chars, pickWeilaData } from './utils'

export function createWeilaFetch(options: CreateWeilaFetchOptions) {
  const {
    appId,
    appKey,
    baseURL,
    storage = createStorage({ driver: memoryDriver() }),
    onRefreshToken,
    onLogout,
    refreshThreshold = 300,
  } = options

  const STORAGE_KEY_TOKEN = 'token'
  const STORAGE_KEY_REFRESH_TOKEN = 'refresh_token'
  const STORAGE_KEY_EXPIRES_IN = 'expires_in'
  const STORAGE_KEY_LOGIN_TIME = 'login_time'
  const STORAGE_KEY_UUID = 'uuid'

  let refreshPromise: Promise<void> | null = null

  async function isTokenExpiringSoon(): Promise<boolean> {
    const token = await storage.getItem<string>(STORAGE_KEY_TOKEN)
    if (!token) {
      return false
    }

    const expiresIn = await storage.getItem<number>(STORAGE_KEY_EXPIRES_IN)
    const loginTime = await storage.getItem<number>(STORAGE_KEY_LOGIN_TIME)

    if (!expiresIn || !loginTime) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const expirationTime = loginTime + (expiresIn / 2)
    const timeUntilExpiry = expirationTime - now

    return timeUntilExpiry <= refreshThreshold
  }

  async function generateV2Query(): Promise<V2QueryParams> {
    const timestamp = Date.now()
    const et = Math.floor(timestamp / 1000).toString()
    const sign = getMd5Middle8Chars(`${et}${appKey}`)

    let uuid = await storage.getItem<string>(STORAGE_KEY_UUID)
    if (!uuid) {
      uuid = nanoid()
      await storage.setItem(STORAGE_KEY_UUID, uuid)
    }

    const token = await storage.getItem<string >(STORAGE_KEY_TOKEN)

    const query: V2QueryParams = {
      token,
      appid: appId,
      et,
      sign,
      uuid,
    }

    if (token) {
      query.token = token
    }

    return query
  }

  async function clearAuthData(): Promise<void> {
    await storage.removeItem(STORAGE_KEY_TOKEN)
    await storage.removeItem(STORAGE_KEY_REFRESH_TOKEN)
    await storage.removeItem(STORAGE_KEY_EXPIRES_IN)
    await storage.removeItem(STORAGE_KEY_LOGIN_TIME)
    await storage.removeItem(STORAGE_KEY_UUID)
  }

  async function handleTokenRefresh(): Promise<void> {
    if (refreshPromise) {
      await refreshPromise
      return
    }

    refreshPromise = (async () => {
      try {
        if (!onRefreshToken) {
          throw new WeilaError({
            errcode: WeilaErrorCode.TOKEN_INVALID,
            errmsg: 'Token refresh needed but no onRefreshToken callback provided',
            data: null,
          })
        }

        const result = await onRefreshToken()
        const loginTime = Math.floor(Date.now() / 1000)

        await storage.setItem(STORAGE_KEY_TOKEN, result.token)
        await storage.setItem(STORAGE_KEY_REFRESH_TOKEN, result.refreshToken)
        await storage.setItem(STORAGE_KEY_LOGIN_TIME, loginTime)
        
        if (result.expiresIn) {
          await storage.setItem(STORAGE_KEY_EXPIRES_IN, result.expiresIn)
        }
      } catch (error) {
        await clearAuthData()
        
        if (onLogout) {
          await onLogout()
        }
        
        throw error
      } finally {
        refreshPromise = null
      }
    })()

    await refreshPromise
  }

  const instance = ofetch.create({
    baseURL,
    async onRequest({ options }) {
      if (await isTokenExpiringSoon()) {
        await handleTokenRefresh()
      }

      const v2Query = await generateV2Query()
      options.query = {
        ...options.query,
        ...v2Query,
      }
    },
    async onResponse({ response, request }) {
      const data: WeilaResponse = response._data

      if (!data || typeof data.errcode === 'undefined') {
        return
      }

      if (data.errcode === WeilaErrorCode.SUCCESS) {
        response._data = pickWeilaData(data.data)
        return
      }

      if (data.errcode === WeilaErrorCode.TOKEN_INVALID) {
        await handleTokenRefresh()
        
        const v2Query = await generateV2Query()
        const retryResponse = await ofetch(request, {
          baseURL,
          query: v2Query,
        })
        
        if (retryResponse.errcode === WeilaErrorCode.SUCCESS) {
          response._data = pickWeilaData(retryResponse.data)
          return
        }
        
        await clearAuthData()
        
        if (onLogout) {
          await onLogout()
        }
        
        throw new WeilaError(retryResponse)
      }

      throw new WeilaError(data)
    },
  })

  return instance
}
