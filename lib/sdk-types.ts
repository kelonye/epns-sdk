/**
 * Represents channel info
 */
export interface Channel {
  id: string
  name: string
  info: string
  url: string
  icon: string
  // type: number
  // deactivated: boolean
  // poolContribution: number
  // memberCount: number
  // historicalZ: number
  // fairShareCount: number
  // lastUpdate: number
  // startBlock: number
  // updateBlock: number
  // weight: number
}

/**
 * Represents notification info
 */
export interface Notification {
  id: string
  userAddress: string
  channelAddress: string
  title: string
  body: string
  type: string
  secret: string
  sub: string
  msg: string
  cta: string
  img: string
  time: string
  recipients: Array<string>
}
