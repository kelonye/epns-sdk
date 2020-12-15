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
  notificationTitle: string
  notificationBody: string
  dataType: string
  dataSecret: string
  dataASub: string
  dataAMsg: string
  dataACta: string
  dataAImg: string
  dataATime: string
  recipients: Array<string>
}
