EPNS JavaScript SDK.

### Getting started

Install

```
yarn add integrate-epns.js
```

Use

```javascript
import {Channel} from 'integrate-epns.js'
import * as ethers from 'ethers'

;(async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const channel = new Channel('0x..channel..address', provider.getSigner())
  console.log('subscribed to %s: %s', (await channel.getInfo()).name, await channel.getIsSubscribed())

  channel.onChangeSubscriptionState((subscribed) => console.log(subscribed))
  button.onclick = () => await channel.toggleSubscriptionState()
})()
```
