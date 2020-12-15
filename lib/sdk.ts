import * as ethers from 'ethers'
import EPNS_CONTRACT_ABI from './abis/epns.json'
import {Channel, Notification} from './sdk-types'

const SUBSCRIBED_EVENT = 'Subscribe'
const UNSUBSCRIBED_EVENT = 'Unsubscribe'

export class Query {
  subGraphUrl: string

  /**
   * Make a new `Query` client to use to run queries against an EPNS subgraph at `subGraphUrl`.
   * @param  {string} subGraphUrl
   */
  constructor(subGraphUrl: string) {
    this.subGraphUrl = subGraphUrl
  }

  /**
   * Get a list of all channels.
   * @returns Promise
   */
  async getChannels(): Promise<Array<Channel>> {
    const {channels} = await this.request(
      `
      query ($first: Int) {
        channels(first: $first) {
          id
          name
          info
          url
          icon
        }
      }
    `,
      {
        first: 30,
      }
    )
    return channels
  }

  /**
   * Get channel info for `channelAddress`.
   * @param  {string} channelAddress
   * @returns Promise
   */
  async getChannel(channelAddress: string): Promise<Channel> {
    const {channels} = await this.request(
      `
      query($id: String) {
        channels(where: {id: $id}) {
          id
          name
          info
          url
          icon
        }
      }
    `,
      {
        id: channelAddress.toLowerCase(),
      }
    )
    return channels[0]
  }

  /**
   * Get all `userAddress`'s notifications.
   * @param  {string} userAddress
   * @returns Promise
   */
  async getNotifications(userAddress: string): Promise<Array<Notification>> {
    const {notifications} = await this.request(
      `
        query ($userAddress: String) {
          notifications(where: {userAddress: $userAddress}) {
            id
            notificationTitle
            notificationBody
          }
        }
      `,
      {
        userAddress,
      }
    )
    return notifications
  }

  /**
   * Get whether `userAddress` is subscribed to `channelAddress`.
   * @returns Promise
   */
  async getIsSubscribed(
    channelAddress: string,
    userAddress: string
  ): Promise<boolean> {
    const {
      subscriptionStates: [subscriptionState],
    } = await this.request(
      `
      query ($channelAddress: String, $userAddress: String) {
        subscriptionStates(where: {channelAddress: $channelAddress, userAddress: $userAddress}) {
          subscribed
        }
      }
    `,
      {
        channelAddress,
        userAddress,
      }
    )
    return subscriptionState?.subscribed ?? false
  }

  /**
   * Execute a `query` (with `variables`) against `subgraphUrl`.
   * @param  {string} query
   * @param  {any} variables
   * @returns Promise
   */
  async request(query: string, variables: any): Promise<any> {
    const res = await fetch(this.subGraphUrl, {
      method: 'POST',
      body: JSON.stringify({query, variables}),
    })
    const {data} = await res.json()
    return data
  }
}

export class ChannelSubscription {
  signer: ethers.Signer
  contractAddress: string
  channelAddress: string
  contract: ethers.Contract

  /**
   * Make a new `ChannelSubscription` client for `signer` and `channelAddress` at `contractAddress`.
   * @param  {string} contractAddress
   * @param  {ethers.Signer} signer
   * @param  {string} channelAddress
   */
  constructor(
    contractAddress: string,
    signer: ethers.Signer,
    channelAddress: string
  ) {
    this.contractAddress = contractAddress
    this.signer = signer
    this.channelAddress = channelAddress
    this.contract = new ethers.Contract(
      contractAddress,
      EPNS_CONTRACT_ABI,
      signer
    )
  }

  /**
   * Subscribe to channel.
   * @returns Promise
   */
  async subscribe(): Promise<void> {
    await this.contract.subscribe(this.channelAddress)
  }

  /**
   * Cancel subscription.
   * @returns Promise
   */
  async unsubscribe(): Promise<void> {
    await this.contract.unsubscribe(this.channelAddress)
  }

  /**
   * Toggle subscription state of the user.
   * @returns Promise
   */
  async toggle(): Promise<void> {
    const subscribed = await this.getIsSubscribed()
    await (subscribed ? this.unsubscribe : this.subscribe).call(this)
  }

  /**
   * Get whether user address is subscribed to channel.
   * @returns Promise
   */
  async getIsSubscribed(): Promise<boolean> {
    return this.contract.memberExists(
      await this.signer.getAddress(),
      this.channelAddress
    )
  }

  /**
   * Subscribe to changes in the subscription state of user address and invoke `fn(subscribed: boolean)`.
   * Returns a function to stop listening to the changes.
   * @param  {Function} fn
   * @returns void
   */
  async onChange(fn: Function): Promise<Function> {
    const userAddress = await this.signer.getAddress()
    const offs = [SUBSCRIBED_EVENT, UNSUBSCRIBED_EVENT].map((event) => {
      const cb = (eventChannelAddress: string, eventUserAddress: string) => {
        if (
          this.channelAddress === eventChannelAddress &&
          userAddress === eventUserAddress
        ) {
          fn(event === SUBSCRIBED_EVENT)
        }
      }
      this.contract.on(event, cb)
      return this.contract.off.bind(this.contract, event, cb)
    })
    return () => {
      offs.map((off) => off())
    }
  }
}
