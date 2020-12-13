import * as ethers from 'ethers'
import {start} from 'repl'
import EPNS_CONTRACT_ABI from './abis/epns.json'
import {ChannelInfo} from './types'

const ROPSTEN_EPNS_CONTRACT_ADDRESS =
  '0xc882da9660d29c084345083922f8a9292e58787d'
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
    const startBlock = info.channelStartBlock.toNumber()
    const updateBlock =
      info.channelLastUpdate?.toNumber() ?? info.channelUpdateBlock?.toNumber()

    // todo: use subgraph

    const [storagePlusIdentity] = (updateBlock !== startBlock
      ? await this.contract.queryFilter(
          this.contract.filters.UpdateChannel(this.channelAddress),
          updateBlock,
          updateBlock
        )
      : await this.contract.queryFilter(
          this.contract.filters.AddChannel(this.channelAddress),
          startBlock,
          startBlock
        )
    )
      .filter(
        (item) =>
          item.args.channel.toString() === this.channelAddress.toString()
      )
      .map((item) => ethers.utils.toUtf8String(item.args.identity))

    // first segment is storage type, second is the pointer to it
    const [storageType, identity] = storagePlusIdentity.split('+')

    return await (await fetch(`https://ipfs.io/ipfs/${identity}`)).json()
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
