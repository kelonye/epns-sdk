## EPNS JavaScript SDK.

### Getting started

Install

```bash
yarn add epns-sdk
```

Use

```typescript
import {Query, ChannelSubscription} from 'epns-sdk'
import * as ethers from 'ethers'

;(async () => {
  const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/vbstreetz/epns'
  const ROPSTEN_CONTRACT_ADDRESS = '0xb02E99b9634bD21A8e3E36cc7adb673287A8FeaC'
  const CHANNEL_ADDRESS = '0x..channel..address'
  const query = new Query(SUBGRAPH_URL)
  console.log(await query.getChannels())
  const channel = await query.getChannel(CHANNEL_ADDRESS)

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const channelSubscription = new ChannelSubscription(
    ROPSTEN_CONTRACT_ADDRESS,
    provider.getSigner(), CHANNEL_ADDRESS
  )
  console.log('subscribed to %s: %s', (channel.name, await channelSubscription.getIsSubscribed())
  channelSubscription.onChange(subscribed => console.log({subscribed}))
  button.onclick = () => await channel.toggle()
})()
```

## API

The SDK provides the following clients:

- Query: ran queries against an EPNS subgraph.
- ChannelSubscription: subscribe and/ manage the subscription to a channel.
- ChannelOwner: send out channel notifications, get stats etc.
- Channels: subscribe to channel creations + updates.
- Notifications: subscribe to notifications.

### Query

#### new Query(subGraphUrl: string)

Make a new `Query` client to use to run queries against an EPNS subgraph at `subGraphUrl`.

#### query.getChannels(page?: number, count?: number): Promise<Array<Channel>>

Get a list of channels.
To get all channels, invoke: `query.getChannels()`.
To retrieve a paginated list of channels, pass in the `page` and `count` query parameters, e.g. `query.getChannels(1, 3)`.

#### query.getChannel(channelAddress: string): Promise<Channel>

Get channel info for `channelAddress`.

#### query.getNotifications(userAddress: string): Promise<Array<Notification>>

Get a list of a `userAddress`'s notifications.
Pass in the optional `page` and `count` to get a paginated list of the notifications.

#### query.getNotification(id: string): Promise<Notification>

Fetch notification info matching `id`.

#### query.getIsSubscribed(channelAddress: string, userAddress: string): Promise<boolean>

Get whether `userAddress` is subscribed to `channelAddress`.

#### query.request(query: string, variables: any): Promise<any>

Execute a `query` (with `variables`) against `subgraphUrl`.

### ChannelSubscription

### new ChannelSubscription(contractAddress: string, signer: ethers.Signer, channelAddress: string)

Make a new `ChannelSubscription` client for `signer` and `channelAddress` at `contractAddress`.

### channelSubscription.subscribe(): Promise<ethers.Transaction>

Subscribe to channel.

### channelSubscription.unsubscribe(): Promise<ethers.Transaction>

Cancel subscription.

### channelSubscription.toggle(): Promise<void>

Toggle subscription state of the user.

### channelSubscription.getIsSubscribed(): Promise<boolean>

Get whether user address is subscribed to channel.

### channelSubscription.onChange(fn: Function): Function

Subscribe to changes in the subscription state of user address and invoke `fn(subscribed: boolean)`.
Returns a function to stop listening to the changes.

### ChannelOwner

### new ChannelOwner(contractAddress: string, signer: ethers.Signer, channelAddress: string)

Make a new `ChannelOwner` client to manage the channel owned by `signer`.

### channelOwner.getStats(): Promise<any>

Get detailed channel stats as an owner.

### channelOwner.notify(type: string, msg: string, recipientAddress?: string, sub?: string, cta?: string, img?: string): Promise<ethers.Transaction>

Send out a notification.

### Channels

### new Channels(contractAddress: string, signer: ethers.Signer)

Make a new `Channels` client to subscribe to channel events.

### channels.onAdd(fn: Function): Function

Invoke `fn` whenever a new channel is added.
Returns a function to cancel listening to new channel additions.

### Notifications

### new Notifications(contractAddress: string, signer: ethers.Signer)

Make a new `Notifications` client to subscribe to notifications sent to `signer`.

### notifications.onReceive(fn: Function): Function

Invoke `fn` for every notification sent to `signer`.
Returns a function to cancel listening to new notifications.

## License

MIT
