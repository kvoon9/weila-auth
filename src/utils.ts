import md5 from 'md5'

export function getMd5Middle8Chars(input: string): string {
  const hash = md5(input)
  return hash.slice(12, 20)
}

export function pickWeilaData<T>(data: T): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const keys = Object.keys(data)
  if (keys.length === 1) {
    return (data as any)[keys[0]]
  }

  return data
}

export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
