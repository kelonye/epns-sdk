import {
  Query as EPNSQuery,
  ChannelSubscription as EPNSChannelSubscription,
} from '../lib'
import * as ethers from 'ethers'

declare const ethereum: any

const IS_STAGING = true
const ROPSTEN_EPNS_CONTRACT_ADDRESS = IS_STAGING
  ? '0xc882da9660d29c084345083922f8a9292e58787d'
  : '0xb02E99b9634bD21A8e3E36cc7adb673287A8FeaC'
const SUBGRAPH_URL = IS_STAGING
  ? 'https://api.thegraph.com/subgraphs/name/vbstreetz/epns-staging'
  : 'https://api.thegraph.com/subgraphs/name/vbstreetz/epns'
const CHANNEL_ADDRESS = IS_STAGING
  ? '0x0b5E9fa12C4C1946fA2f14b7271cC60541508f23'
  : '0xC07CF51BC3C356a8f0035936e81859F80bDcD5aC'

window.onload = () => new Program()

class Program {
  query: EPNSQuery
  channelSubscription: EPNSChannelSubscription

  provider: ethers.providers.Web3Provider
  signer: ethers.Signer
  userAddress: string

  button: HTMLElement
  channelNameLabelEl: HTMLElement

  constructor() {
    this.setup()
  }

  async setup() {
    this.button = document.querySelector('button')!
    this.channelNameLabelEl = document.getElementById('channel-name')!

    this.setupQuery()
    this.setChannelName()

    if (!globalThis.ethereum) return alert('Please install metamask extension')
    await ethereum.enable()
    await this.setupEthersSigner()

    this.setupChannelSubscription()
    this.handleChannelSubscriptionChange()
  }

  setupQuery() {
    this.query = new EPNSQuery(SUBGRAPH_URL)
  }

  async setChannelName() {
    const channel = await this.query.getChannel(CHANNEL_ADDRESS)
    this.channelNameLabelEl.innerText = `Channel: ${channel?.name ?? '-'}`
  }

  setupChannelSubscription() {
    this.channelSubscription = new EPNSChannelSubscription(
      ROPSTEN_EPNS_CONTRACT_ADDRESS,
      this.signer,
      CHANNEL_ADDRESS
    )
    this.channelSubscription.onChange(
      this.onChangeChannelSubscriptionState.bind(this)
    )
  }

  async setupEthersSigner(): Promise<void> {
    this.provider = new ethers.providers.Web3Provider(ethereum)
    this.signer = this.provider.getSigner()
    this.userAddress = await this.signer.getAddress()
  }

  async handleChannelSubscriptionChange() {
    this.button.onclick = async (): Promise<void> => {
      await this.channelSubscription.toggle.call(this.channelSubscription)
    }

    this.onChangeChannelSubscriptionState(
      await this.channelSubscription.getIsSubscribed()
    )
  }

  onChangeChannelSubscriptionState(subscribed: Boolean): void {
    this.button.innerText = subscribed ? 'Unsubscribe' : 'Subscribe'
  }
}
