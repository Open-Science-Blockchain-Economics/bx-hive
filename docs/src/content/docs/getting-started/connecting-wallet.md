---
title: Connecting Your Wallet
description: How to set up and connect an Algorand wallet to bx-hive.
---

bx-hive requires an Algorand wallet to interact with the platform. Your wallet holds ALGO for funding experiments (as an Experimenter) or receiving payouts (as a Subject), and it serves as your identity on-chain.

## Supported Wallets

| Wallet | Platforms | Notes |
|--------|-----------|-------|
| **Pera Wallet** | Mobile (iOS/Android) + Web | Most widely used Algorand wallet |
| **Defly Wallet** | Mobile (iOS/Android) | Includes DeFi portfolio features |
| **KMD** | Local development only | Used for testing on AlgoKit LocalNet |

If you do not have a wallet yet, install **Pera Wallet** from your device's app store or use the Pera web wallet. Both Pera and Defly are free to use.

## Setup Steps

1. **Click "Connect Wallet"** in the top-right corner of the header.
2. **Select your wallet** from the dropdown menu (Pera or Defly).
3. **Authenticate** in your wallet app — approve the connection request when prompted.
4. **Confirm connection** — Your wallet address appears in the header, and the app automatically checks whether you are registered.

> **[Screenshot: Connect Wallet button and wallet selection dropdown]**

Once connected, you can proceed to [create an account](../creating-account/) if you have not registered yet.

### Funding your wallet

- **TestNet**: Get free test ALGO from the [Algorand TestNet Dispenser](https://bank.testnet.algorand.network/).
- **MainNet**: Purchase ALGO through an exchange and transfer to your wallet address.
- **LocalNet**: Test accounts are pre-funded automatically when running AlgoKit LocalNet.

## Troubleshooting

### Wallet not appearing in the dropdown

Make sure the wallet app is installed on your device. For Pera, you can also use the web version at [web.perawallet.app](https://web.perawallet.app). Refresh the page after installing.

### Connection fails or times out

Check that your wallet is set to the same network as the bx-hive instance you are using (LocalNet, TestNet, or MainNet). A network mismatch will prevent the connection from completing.

### Disconnecting

To disconnect your wallet, click your address or name in the header to open the account menu, then click **Disconnect**. You can reconnect at any time with the same or a different wallet.
