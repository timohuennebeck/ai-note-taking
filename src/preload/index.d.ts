import type { LitterApi } from '@shared/types'

declare global {
  interface Window {
    litter: LitterApi
  }
}

export {}
