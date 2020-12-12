import {Channel} from '../lib'
import * as ethers from 'ethers'

const CHANNEL_ADDRESS = '0x0a651cF7A9b60082fecdb5f30DB7914Fd7d2cf93'
let button: HTMLElement
let provider: ethers.providers.Web3Provider
let channel: Channel

main()

/**
 * Start
 * @returns Promise
 */
async function main(): Promise<void> {
  if (
    window.ethereum &&
    (
      await window.ethereum.request({
        method: 'eth_requestAccounts',
      })
    ).length
  ) {
    setupChannel()
  }

  button = document.querySelector('button')
  button.onclick = async (): Promise<void> => {
    if (!provider) {
      if (!window.ethereum) return alert('Please install metamask extension')
      await window.ethereum.enable()
      await setupChannel()
    }
    await channel.toggleSubscriptionState.call(channel)
  }
}

/**
 * Setup and subscribe to `CHANNEL_ADDRESS`
 * @returns Promise
 */
async function setupChannel(): Promise<void> {
  provider = new ethers.providers.Web3Provider(window.ethereum)

  channel = new Channel(CHANNEL_ADDRESS, provider.getSigner())
  channel.onSubscriptionStateChange(onSubscriptionStateChanged)

  const [subscribed, info] = await Promise.all([
    channel.getIsSubscribed(),
    channel.getInfo(),
  ])

  onSubscriptionStateChanged(subscribed)
}

/**
 * Update button text due to channel's `subscribed` state
 * @param  {Boolean} subscribed
 * @returns void
 */
function onSubscriptionStateChanged(subscribed: Boolean): void {
  button.innerText = subscribed ? 'Unsubscribe' : 'Subscribe'
}
