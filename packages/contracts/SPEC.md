# Machina Finance Contracts Specifications

Some remarks:
- Please read this document as a high-level technical explanation, not as rigid and exhaustive specifications. That being said. Everything on this can be a matter of discussions and changes. So feel free to propose changes and rise discussions.
- Contract's requirements lists are not exhaustive, additional checks must be done when necessary.

## Development Phases
To allow a quick MVP bootstrapping and to have a clear view of priorities, the development will be done in phases as follows:

1. **Tooling**: During this phase, necessary tooling will be built/adapted for MachinaFi requirements, namelly:
   - JS contract compiler. [[@fleet-sdk/compiler](https://github.com/fleet-sdk/fleet), done] 
   - JS contract unit testing tool. [[@fleet-sdk/mock-chain](https://github.com/fleet-sdk/fleet), done].
   - Configurable explorer. [[ergo-uexplorer](https://github.com/pragmaxim/ergo-uexplorer/), in progress] 
   - Generic off-chain execution bots framework. [[ergomatic](https://github.com/nautls/ergomatic), in progress]
2. **Contracts**: With `compiler` and `mock-chain` in place we can start working on contracts.
3. **MVP**: In this phase, a simple yet functional user interface will be built for community testing and feedback.
4. **User Interface**: A "hand-tailored", professional-looking interface will be done during this phase.
5. **Decentralization and Governance**: Once past phases are done, we can start working on the path to make the protocol as much decentralized and self-governed as possible.

---

## Token Types

A brief description of token types used in contracts, to avoid repetitions and for better understanding.

### `OAT` - Origin Attestation Token

The idea behind the **Origin Attestation Tokens** is to provide a secure yet flexible way to ensure that a given box is issued by the MachinaFi protocol. Otherwise, contracts would need to check proposition bytes which is also a secure approach, but inflexible to further changes.

* As the intent of the AOT is to be a unique origin attestation identifier across an unknown number of boxes, it must be a fungible token with a future proof minting amount.
* AOT will prevent bad actors from stealing protocol fees by creating custom Execution Boxes.
* In phase 5 of development, AOTs must be protected by a contract allowing third parties to unlock tokens to create MachinaFi boxes.

### `PIT` - Pair Identifier Token

The **Pair Identifier Token** is a 1:2 token used to create a bond between the `Settings` and the `Execution` boxes for a given pair. Each trading pair should have their own PIT minted with 2 units, one for the `Settings` box and another for the `Execution` box. So that we have a common `TokenId` for both.

With a PIT we can:
- Efficiently verify on-chain and off-chain for `Settings` and `Execution` boxes correspondence.
- Fetch both boxes with a single API request, lowering bot's transaction building latency.

## Execution Box

The Execution Box will be responsible for accumulating protocol fees for a given pair and for checking trade transactions execution and correctness.

### Tokens

| Index | Token | Amount |
| ----- | ----- | ------ |
| `0`   | `PIT` | `1`    |
| `1`   | `OAT` | `1`    |

### Context Variables

| Index | Type   | Value                 |
| ----- | ------ | --------------------- |
| `0`   | `SInt` | Spending output index |

### Registers

| Register | Type           | Value                                                                                  |
| -------- | -------------- | -------------------------------------------------------------------------------------- |
| `R4`     | `SColl[Byte]`  | ID of the input being spent by the present contract. Must be supplied at filling time. |

### Data Inputs

| Index | Box           |
| ----- | ------------- |
| `0`   | `SettingsBox` |

### Contract Requirements
- Ensure that the `PIT` is the same as SettingBox's and that `OAT` and `PIT` are valid by comparing its 'TokenID' with the respective `TokenIDs` stored as constants in the contract.
- Check the correctness of the protocol fee payment from all buy and sell orders using percentages stored in `SettingsBox.R6`.
  - Limit and Grid orders should use Taker fee (`SettingsBox.R6._0`).
  - Market orders should use Maker fee (`SettingsBox.R6._0`).
- Pay off-chain executor's fees using `settingsBox.R7._0 * inputOrdersCount` formula.
- Prevent front-running by limiting miner's fee to `settingsBox.R7._1 * inputOrdersCount` formula.


## Settings Box

The Settings Box is responsible for holding settings for a given pair and will be used as `dataInput` on Execution contracts.

### Tokens

| Index | Token | Amount |
| ----- | ----- | ------ |
| `0`   | `PIT` | `1`    |
| `1`   | `OAT` | `1`    |

### Registers

| Register | Type                 | Value                                                           |
| -------- | -------------------- | --------------------------------------------------------------- |
| `R4`     | `SColl[SByte]`       | Base asset `TokenID`                                            |
| `R5`     | `SColl[SByte]`       | Quote asset `TokenID`                                           |
| `R6`     | `STuple(SInt, SInt)` | (Maker, Taker) fee percentages                                  |
| `R7`     | `STuple(SInt, SInt)` | (off_chain_executor_fee, miner_fee) amounts per executed order. |

In case of `R4` or `R5` being ERG, then consider `SColl[0]` as ERG `TokenID`.

### Contract

- As order boxes will expect an Execution Box at index 0 and will only check for the `OAT`, the Settings contract must ensure that it must be placed at a position greater than 0 when spending to preven bad agents from putting a Settings Box in the place of the Execution Box and take some advantage of it.

---

## Order Contracts

All order contracts must follow a minimum structure and pattern so that it will be easier to audit/read by third parties.

### Tokens

| Index | Token                | Amount                               |
| ----- | -------------------- | ------------------------------------ |
| `0`   | Buying/Selling token | Proportional to traded amount + fees |

### Global Registers

| Register | Type           | Value                                                                                 |
| -------- | -------------- | ------------------------------------------------------------------------------------- |
| `R4`     | `SigmaProp`    | Order creator's public key                                                            |
| `R5`     | `SColl[SLong]` | Original abosolute [base, quote, fee] amounts at order creation time                  |
| `R6`     | `SLong`        | The absolute amount of assets that `R4` is expecting to receive in exchange for the remaining assets in the present box. This will prevent traders from paying bigger fees than expected if the percentages in `SettingsBox.R6` are changed for some reason. |
| `Last`   | `SColl[Byte]`  | ID of the input being spent by the present contract. Must be supplied at filling time. |

### Context Variables

| Index | Type   | Value                 |
| ----- | ------ | --------------------- |
| `0`   | `SInt` | Spending output index |

### General Contract Requirements

All order contracts must met the following requirements:

- Composable, decentralized bots need to be able to safely spend multiple orders in the same transaction. To archive this, contracts need to read context variable `0` to find the corresponding output and then compare the `Last` register with `SELF.id`. See [Babel Fee contract](https://github.com/ergoplatform/eips/blob/master/eip-0031.md?plain=1#L54) for better understanding.
- Refundable, the order creator (`R4`) must be able to cancel an order by spending the box and withdrawing funds at any time.
- Support partial filing (with the exception of Market Order Contracts).
- Ensure the presence of a valid `Execution` box in the first `INPUT` box by checking for the `OAT`.
- Ensure the exchange correctness.

---

## Grid Order Contract

Grid contracts will play an important role in the MachinaFi ecosystem by providing liquidity for the DEX. We can take kushiti's [Decentralized Grid Trading contracts](https://www.ergoforum.org/t/decentralized-grid-trading-on-ergo/3750/4) as basis and add some new features to achieve our goals.

- Liquidity providers will be able to create configurable grids for a given pair and take advantage of market fluctuations like a regular grid trading systems.
- Traders will be able to combine multiple grid and limit orders to trade assets.

### Registers

| Register | Type       | Value                                           |
| -------- | ---------- | ----------------------------------------------- |
| `R7`     | `SBoolean` | Order side, `true == buy`, `false == sell`      |
| `R8`     | `SInt`     | Profit percentage for recreated opposite order. |

### Contract

- Once fully filled, enforce the creation of an opposite order (`R7 = !R7`) preserving input's data and setting a lower/higher trading price (`R5`) added to the protocol fee (`R5 = ((R5 % R8) + R5) + (R5 % R6)`).

---

## Limit Buy/Sell Contracts

These are regular limit orders where a trader must specify the price, amount and supply the tradeable assets for a trade.

### Contract

- Once partially or fully filled, the assets should be sent to the public key stored in `R4`.
- For better execution and audibility, buy and sell contracts must be two distinct contracts.

---

## Market Buy/Sell Contracts

By creating marked orders, a trader must inform the slippage tolerance and supply tradeable the assets. Decentralized bots will do the batching if slippage is lower or equal to tolerance percentage stored in `R7`.

### Registers

| Register | Type   | Value                         |
| -------- | ------ | ----------------------------- |
| `R7`     | `SInt` | Slippage tolerance percentage |

### Contract

- Once filled, the assets should be sent to the public key stored in `R4`.
- For better execution and audibility, buy and sell contracts must be two distinct contracts.
