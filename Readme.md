## EPNS JavaScript SDK.

### Getting started

Install

```
yarn add epns-sdk
```

Use

```javascript
import {Query, ChannelSubscription} from 'epns-sdk'
import * as ethers from 'ethers'

;(async () => {
  const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/vbstreetz/epns'
  const ROPSTEN_EPNS_CONTRACT_ADDRESS = '0xb02E99b9634bD21A8e3E36cc7adb673287A8FeaC'
  const CHANNEL_ADDRESS = '0x..channel..address'
  const query = new Query(SUBGRAPH_URL)
  console.log(await query.getChannels())
  const channel = await query.getChannel(CHANNEL_ADDRESS)

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const channelSubscription = new ChannelSubscription(provider.getSigner(), ROPSTEN_EPNS_CONTRACT_ADDRESS, CHANNEL_ADDRESS)
  console.log('subscribed to %s: %s', (channel.name, await channelSubscription.getIsSubscribed())
  channelSubscription.onChange(subscribed => console.log({subscribed}))
  button.onclick = () => await channel.toggle()
})()
```
