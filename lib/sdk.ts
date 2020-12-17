import * as ethers from 'ethers'
import hex2ascii from 'hex2ascii'
import EPNS_CONTRACT_ABI from './abis/epns.json'
import {Channel, Notification} from './sdk-types'
import * as crypto from './utils/crypto'
import ipfs from './utils/ipfs'
import Debug from './utils/debug'

const debug = Debug('sdk', '#fc0')

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
   * Get a list of channels.
   * To get all channels, invoke: `query.getChannels()`.
   * To retrieve a paginated list of channels, pass in the `page` and `count` query parameters, e.g. `query.getChannels(1, 3)`.
   * @param  {number} page
   * @param  {number} count
   * @returns Promise<Array<Channel>>
   */
  async getChannels(page?: number, count?: number): Promise<Array<Channel>> {
    const isPaging = page !== undefined && count !== undefined
    const query = isPaging
      ? `
          query ($first: Int, $skip: Int) {
            channels(first: $first, skip: $skip, orderBy: indexBlock, orderDirection: desc) {
              id
              name
              info
              url
              icon
            }
          }
        `
      : `
          query {
            channels(orderBy: indexBlock, orderDirection: desc) {
              id
              name
              info
              url
              icon
            }
          }
        `
    const variables = isPaging
      ? {
          first: count,
          skip: page! * count!,
        }
      : {}
    const {channels} = await this.request(query, variables)
    return channels
  }

  /**
   * Get channel info for `channelAddress`.
   * @param  {string} channelAddress
   * @returns Promise<Channel>
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
        id: channelAddress.toLowerCase(), // queries by id need to be cast to lowercase for some reason
      }
    )
    return channels[0]
  }

  /**
   * Get a list of a `userAddress`'s notifications.
   * Pass in the optional `page` and `count` to get a paginated list of the notifications.
   * @param  {string} userAddress
   * @param  {number} page
   * @param  {number} count
   * @returns Promise<Array<Notification>>
   */
  async getNotifications(
    userAddress: string,
    page?: number,
    count?: number
  ): Promise<Array<Notification>> {
    const isPaging = page !== undefined && count !== undefined
    const query = isPaging
      ? `
          query ($userAddress: String, $first: Int, $skip: Int) {
            notifications(first: $first, skip: $skip, where: {userAddress: $userAddress}, orderBy: indexBlock, orderDirection: desc) {
              id
              indexTimestamp
              title
              body
              type
              secret
              sub
              msg
              cta
              img
              time              
            }
          }
        `
      : `
          query ($userAddress: String) {
            notifications(where: {userAddress: $userAddress}, orderBy: indexBlock, orderDirection: desc) {
              id
              indexTimestamp
              title
              body
              type
              secret
              sub
              msg
              cta
              img
              time     
            }
          }
        `
    const variables = isPaging
      ? {
          userAddress,
          first: count,
          skip: page! * count!,
        }
      : {
          userAddress,
        }

    const {notifications} = await this.request(query, variables)
    return notifications
  }

  /**
   * Fetch notification info matching `id`.
   * @param  {string} id
   * @returns Promise<Notification>
   */
  async getNotification(id: string): Promise<Notification> {
    const {notifications} = await this.request(
      `
      query($id: String) {
        notifications(where: {id: $id}) {
          id
          indexTimestamp
          title
          body
          type
          secret
          sub
          msg
          cta
          img
          time  
        }
      }
    `,
      {
        id,
      }
    )
    return notifications[0]
  }

  /**
   * Get whether `userAddress` is subscribed to `channelAddress`.
   * @param  {string} channelAddress
   * @param  {string} userAddress
   * @returns Promise<boolean>
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
   * @returns Promise<any>
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
    this.contract = makeContract(contractAddress, signer)
  }

  /**
   * Subscribe to channel.
   * @returns Promise<ethers.Transaction>
   */
  async subscribe(): Promise<ethers.Transaction> {
    return await this.contract.subscribe(this.channelAddress)
  }

  /**
   * Cancel subscription.
   * @returns Promise<ethers.Transaction>
   */
  async unsubscribe(): Promise<ethers.Transaction> {
    return await this.contract.unsubscribe(this.channelAddress)
  }

  /**
   * Toggle subscription state of the user.
   * @returns Promise<ethers.Transaction>
   */
  async toggle(): Promise<ethers.Transaction> {
    const subscribed = await this.getIsSubscribed()
    return await (subscribed ? this.unsubscribe : this.subscribe).call(this)
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
   * @returns Function
   */
  onChange(fn: Function): Function {
    const offs = [SUBSCRIBED_EVENT, UNSUBSCRIBED_EVENT].map((event) => {
      const cb = async (
        eventChannelAddress: string,
        eventUserAddress: string
      ) => {
        const userAddress = await this.signer.getAddress()
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

export class ChannelOwner {
  signer: ethers.Signer
  contractAddress: string
  contract: ethers.Contract

  /**
   * Make a new `ChannelOwner` client to manage the channel owned by `signer`.
   * @param  {string} contractAddress
   * @param  {ethers.Signer} signer
   * @param  {string} channelAddress
   */
  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contractAddress = contractAddress
    this.signer = signer
    this.contract = makeContract(contractAddress, signer)
  }

  async getIsCreated(): Promise<boolean> {
    const channel = await this.contract.channels(await this.signer.getAddress())
    return !channel.channelStartBlock.isZero()
  }

  async getStats(): Promise<any> {}

  /**
   * Send out a notification.
   * @param  {string} type
   * @param  {string} msg
   * @param  {string} recipientAddress?
   * @param  {string} sub?
   * @param  {string} cta?
   * @param  {string} img?
   * @returns Promise<ethers.Transaction>
   */
  async notify(
    type: string,
    msg: string,
    recipientAddress?: string,
    sub?: string,
    cta?: string,
    img?: string
  ): Promise<ethers.Transaction> {
    let encryptedSecret: string = '',
      asub: string = '',
      amsg: string = '',
      acta: string = '',
      aimg: string = ''

    if (type === '1' || type === '2') {
      recipientAddress = await this.signer.getAddress()
    }

    // Decide type and storage
    switch (type) {
      // Broadcast Notification
      case '1':
        break

      // Targetted Notification
      case '3':
        if (recipientAddress === null) {
          throw new Error('recipientAddress is required for type 3')
        }
        break

      // Secret Notification
      case '2':
        // Create secret
        let secret = crypto.makeid(14)

        // Encrypt payload and change sub and msg in notification
        sub = 'You have a secret message!'
        msg = 'Open the app to see your secret message!'

        // get public key from EPNSCoreHelper
        const k = await this.getRegisteredPublicKey(recipientAddress!)
        if (k === null) {
          // No public key, can't encrypt
          throw new Error(
            'Unable to encrypt for this user, no public key registered'
          )
        }

        const publickey = k.toString().substring(2)
        debug('This is public Key: ' + publickey)

        encryptedSecret = await crypto.encryptWithECIES(secret, publickey)
        amsg = crypto.encryptWithAES(msg, secret)
        asub = crypto.encryptWithAES(sub, secret)
        acta = crypto.encryptWithAES(cta, secret)
        aimg = crypto.encryptWithAES(img, secret)
        break

      default:
        throw new Error(`unknown notification type (${type})`)
    }

    // Handle Storage
    let storagePointer = ''

    // IPFS PAYLOAD --> 1, 2, 3
    if (['1', '2', '3'].includes(type)) {
      const input = JSON.stringify({
        notification: {
          title: sub,
          body: msg,
        },
        data: {
          type,
          secret: encryptedSecret,
          asub,
          amsg,
          acta,
          aimg,
        },
      })

      debug('uploding to IPFS...')

      try {
        storagePointer = await ipfs.add(input)
      } catch (e) {
        debug('IPFS upload error', e.message)
      }

      debug('IPFS cid: %o', storagePointer)
    }

    // Prepare Identity and send notification
    const identity = type + '+' + storagePointer
    const identityBytes = ethers.utils.toUtf8Bytes(identity)
    return this.contract.sendNotification(recipientAddress!, identityBytes)
  }

  private async getRegisteredPublicKey(
    address: string
  ): Promise<string | null> {
    const results = await this.contract.queryFilter(
      this.contract.filters.PublicKeyRegistered()
    )

    for (const item of results) {
      if (item.args && item.args[0] === address) {
        return item.args[1]
      }
    }

    return null
  }
}

export class Channels {
  signer: ethers.Signer
  contractAddress: string
  contract: ethers.Contract

  /**
   * Make a new `Channels` client to subscribe to channel events.
   * @param  {string} contractAddress
   * @param  {ethers.Signer} signer
   */
  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contractAddress = contractAddress
    this.signer = signer
    this.contract = makeContract(contractAddress, signer)
  }

  /**
   * Invoke `fn` whenever a new channel is added.
   * Returns a function to cancel listening to new channel additions.
   * @param  {Function} fn
   * @returns Function
   */
  onAdd(fn: Function): Function {
    const event = 'AddChannel'
    const cb = async (eventChannelAddress: string, identityHex: string) => {
      const identity = hex2ascii(identityHex)
      const channelId = identity.toLocaleLowerCase()
      const ipfsChannel = JSON.parse(await ipfs.cat(identity))
      const channel = {
        id: channelId,
        ...ipfsChannel,
      }
      fn(channel)
    }
    this.contract.on(event, cb)
    return this.contract.off.bind(this.contract, event, cb)
  }
}

export class Notifications {
  signer: ethers.Signer
  contractAddress: string
  contract: ethers.Contract

  /**
   * Make a new `Notifications` client to subscribe to send notification events for `signer`.
   * @param  {string} contractAddress
   * @param  {ethers.Signer} signer
   */
  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contractAddress = contractAddress
    this.signer = signer
    this.contract = makeContract(contractAddress, signer)
  }

  /**
   * Invoke `fn` for every notification sent to `signer`.
   * Returns a function to cancel listening to new notifications.
   * @param  {Function} fn
   * @returns Function
   */
  onSend(fn: Function): Function {
    const event = 'SendNotification'

    const cb = async (
      eventChannelAddress: string,
      eventUserAddress: string,
      identityHex: string
    ) => {
      const userAddress = await this.signer.getAddress()
      const identity = hex2ascii(identityHex)
      const notificationId = identity
        .concat('+')
        .concat(eventChannelAddress)
        .concat('+')
        .concat(eventUserAddress)
        .toLocaleLowerCase()
      const ipfsId = identity.split('+')[1]
      const ipfsNotification = JSON.parse(await ipfs.cat(ipfsId))
      const notification = {
        id: notificationId,
        userAddress: eventUserAddress,
        channelAddress: eventChannelAddress,
        ...ipfsNotification.notification,
        ...ipfsNotification.data,
      }

      if (ipfsNotification.data.type === '1') {
        // broadcast
        // if (userAddress === eventUserAddress) return; // do not notify sender?
        const isSubscribed = await this.contract.memberExists(
          userAddress,
          eventChannelAddress
        )
        if (isSubscribed) {
          fn(notification)
        }
      } else if (userAddress === eventUserAddress) {
        fn(notification)
      }
    }
    this.contract.on(event, cb)
    return this.contract.off.bind(this.contract, event, cb)
  }
}

/**
 * Make ethers contract for `contractAddress` and `signer`
 * @param  {string} contractAddress
 * @param  {ethers.Signer} signer
 */
function makeContract(contractAddress: string, signer: ethers.Signer) {
  return new ethers.Contract(contractAddress, EPNS_CONTRACT_ABI, signer)
}
