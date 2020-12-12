import {Channel} from '../lib'
import * as ethers from 'ethers'

declare const ethereum: any

const CHANNEL_ADDRESS = '0x0a651cF7A9b60082fecdb5f30DB7914Fd7d2cf93'
let button: HTMLElement
let provider: ethers.providers.Web3Provider
let channel: Channel

window.onload = main

/**
 * Start
 * @returns Promise
 */
async function main(): Promise<void> {
  if (globalThis.ethereum && ethereum.isConnected()) {
    setupChannel()
  }

  button = document.querySelector('button')
  button.onclick = async (): Promise<void> => {
    if (!provider) {
      if (!globalThis.ethereum)
        return alert('Please install metamask extension')
      await ethereum.enable()
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
  provider = new ethers.providers.Web3Provider(ethereum)

  channel = new Channel(CHANNEL_ADDRESS, provider.getSigner())
  channel.onSubscriptionStateChange(onSubscriptionStateChanged)

  const [subscribed, info] = await Promise.all([
    channel.getIsSubscribed(),
    channel.getInfo(),
  ])

  document.getElementById('channel-info').innerText = `Channel: ${info.name}`

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
