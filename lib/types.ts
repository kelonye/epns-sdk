/**
 * Represents general channel info
 */
export interface ChannelInfo {
  channelType: number
  deactivated: boolean
  poolContribution: number
  memberCount: number
  channelHistoricalZ: number
  channelFairShareCount: number
  channelLastUpdate: number
  channelStartBlock: number
  channelUpdateBlock: number
  channelWeight: number
}
