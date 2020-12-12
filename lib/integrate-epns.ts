import * as ethers from 'ethers'
import {start} from 'repl'
import EPNS_CONTRACT_ABI from './abis/epns.json'
import {ChannelInfo} from './types'

const ROPSTEN_EPNS_CONTRACT_ADDRESS =
  '0xb02E99b9634bD21A8e3E36cc7adb673287A8FeaC'
const SUBSCRIBED_EVENT = 'Subscribe'
const UNSUBSCRIBED_EVENT = 'Unsubscribe'

export class Channel {
  contract: ethers.Contract
  signer: ethers.Signer
  channelAddress: string
  changeSubscriptionSubscribers: Array<Function>

  /**
   * Make new Channel
   * @param  {string} channelAddress
   * @param  {Signer} signer
   */
  constructor(channelAddress: string, signer: ethers.Signer) {
    this.signer = signer
    this.channelAddress = channelAddress
    this.changeSubscriptionSubscribers = []

    this.contract = new ethers.Contract(
      ROPSTEN_EPNS_CONTRACT_ADDRESS,
      EPNS_CONTRACT_ABI,
      signer
    )
    ;[SUBSCRIBED_EVENT, UNSUBSCRIBED_EVENT].map(this.handleEvents.bind(this))
  }

  /**
   * Listen to contract `event` and invoke `subscribers`
   * @param  {string} event
   * @returns Promise
   */
  async handleEvents(event: string): Promise<void> {
    const userAddress = await this.signer.getAddress()
    this.contract.on(event, (channelAddress, eventUserAddress) => {
      if (userAddress === eventUserAddress) {
        this.changeSubscriptionSubscribers.map((fn) => {
          fn(event === SUBSCRIBED_EVENT)
        })
      }
    })
  }

  /**
   * Get channel info
   * @returns Promise
   */
  async getInfo(): Promise<ChannelInfo> {
    const info = await this.contract.channels(this.channelAddress)
    const startBlock = info.channelStartBlock?.toNumber()
    const updateBlock = info.channelUpdateBlock?.toNumber()

    // todo: use subgraph

    console.log(startBlock, updateBlock)

    let filter
    let block
    if (updateBlock && startBlock !== updateBlock) {
      filter = this.contract.filters.UpdateChannel(this.channelAddress)
      block = updateBlock
    } else {
      filter = this.contract.filters.AddChannel(this.channelAddress)
      block = startBlock
    }

    console.log(block)

    let filteredResponse
    const events = await this.contract.queryFilter(filter, block, block)
    console.log(events)
    events.forEach((item) => {
      if (item.args.channel.toString() === this.channelAddress.toString()) {
        filteredResponse = ethers.utils.toUtf8String(item.args.identity)
      }
    })

    console.log(filteredResponse)

    return info
  }

  /**
   * Subscribe to channel
   * @returns Promise
   */
  async subscribe(): Promise<void> {
    await this.contract.subscribe(this.channelAddress)
  }

  /**
   * Cancel subscription
   * @returns Promise
   */
  async unsubscribe(): Promise<void> {
    await this.contract.unsubscribe(this.channelAddress)
  }

  /**
   * Toggle subscription state of the address
   * @returns Promise
   */
  async toggleSubscriptionState(): Promise<void> {
    const subscribed = await this.getIsSubscribed()
    await (subscribed ? this.unsubscribe : this.subscribe).call(this)
  }

  /**
   * Get whether address is subscribed to channel
   * @returns Promise
   */
  async getIsSubscribed(): Promise<boolean> {
    return this.contract.memberExists(
      await this.signer.getAddress(),
      this.channelAddress
    )
  }

  /**
   * Subscribe to changes in the subscription state of the address
   * @param  {Function} fn
   * @returns void
   */
  onChangeSubscriptionState(fn: Function): void {
    this.changeSubscriptionSubscribers.push(fn)
  }
}
