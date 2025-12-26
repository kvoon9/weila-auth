import type { WeilaResponse } from './types'

export class WeilaError extends Error {
  errcode: number
  errmsg: string
  data?: any

  constructor(response: WeilaResponse) {
    super(`[${response.errcode}] ${response.errmsg}`)
    this.name = 'WeilaError'
    this.errcode = response.errcode
    this.errmsg = response.errmsg
    this.data = response.data

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, WeilaError)
    }
  }
}
