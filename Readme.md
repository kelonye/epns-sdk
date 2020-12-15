## EPNS JavaScript SDK.

### Getting started

Install

```bash
yarn add epns-sdk
```

Use

```javascript
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
  const channelSubscription = new ChannelSubscription(ROPSTEN_CONTRACT_ADDRESS, provider.getSigner(), CHANNEL_ADDRESS)
  console.log('subscribed to %s: %s', (channel.name, await channelSubscription.getIsSubscribed())
  channelSubscription.onChange(subscribed => console.log({subscribed}))
  button.onclick = () => await channel.toggle()
})()
```

## API

The SDK provides `Query` and `ChannelSubscription` clients that can be used to ran queries against an EPNS subgraph and interact with an EPNS contract address respectively.

### Query

#### new Query(subGraphUrl: string)

Make a new `Query` client to use to run queries against an EPNS subgraph at `subGraphUrl`.

#### query.getChannels(): Promise<Array<Channel>>

Get a list of all channels.

#### query.getChannel(channelAddress: string): Promise<Channel>

Get channel info for `channelAddress`.

#### query.getNotifications(userAddress: string): Promise<Array<Notification>>

Get all `userAddress`'s notifications.

#### query.getIsSubscribed(channelAddress: string, userAddress: string): Promise<boolean>

Get whether `userAddress` is subscribed to `channelAddress`.

#### query.request(query: string, variables: any): Promise<any>

Execute a `query` (with `variables`) against `subgraphUrl`.

### ChannelSubscription

### new ChannelSubscription(contractAddress: string, signer: ethers.Signer, channelAddress: string)

Make a new `ChannelSubscription` client for `signer` and `channelAddress` at `contractAddress`.

### channelSubscription.subscribe(): Promise<void>

Subscribe to channel.

### channelSubscription.unsubscribe(): Promise<void>

Cancel subscription.

### channelSubscription.toggle(): Promise<void>

Toggle subscription state of the user.

### channelSubscription.getIsSubscribed(): Promise<boolean>

Get whether user address is subscribed to channel.

### channelSubscription.onChange(fn: Function): Promise<Function>

Subscribe to changes in the subscription state of user address and invoke `fn(subscribed: boolean)`.
Returns a function to stop listening to the changes.

## License

MIT
