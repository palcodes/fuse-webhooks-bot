require("dotenv").config();

import { MessageBuilder, Webhook } from "discord-webhook-node";

import Fuse from "./fuse.node.commonjs2.js";
const fuse = new Fuse(
  "wss://eth-mainnet.ws.alchemyapi.io/v2/oAvEoLnipU2C4c8WrfOaXlNntcIMT3FV"
);

console.log("Connecting to Discord Webhook:", process.env.WEBHOOK_URL);

const hook = new Webhook(process.env.WEBHOOK_URL);
hook.setUsername("Fuse Alerts");
hook.setAvatar(
  "https://raw.githubusercontent.com/Rari-Capital/fuse-webhooks-bot/main/fuse.png"
);

const smallFormatter = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatAmount(amount: any, decimals: any) {
  return smallFormatter.format(amount / 10 ** decimals);
}

export interface FuseAsset {
  cToken: string;

  borrowBalance: number;
  supplyBalance: number;
  liquidity: number;

  membership: boolean;

  underlyingName: string;
  underlyingSymbol: string;
  underlyingToken: string;
  underlyingDecimals: number;
  underlyingPrice: number;

  collateralFactor: number;
  reserveFactor: number;

  adminFee: number;
  fuseFee: number;

  borrowRatePerBlock: number;
  supplyRatePerBlock: number;

  totalBorrow: number;
  totalSupply: number;
}

async function main() {
  const { 1: fusePools } = await fuse.contracts.FusePoolLens.methods
    .getPublicPoolsWithData()
    .call({ gas: 1e18 });

  for (let i = 0; i < fusePools.length; i++) {
    fuse.contracts.FusePoolLens.methods
      .getPoolAssetsWithData(fusePools[i].comptroller)
      .call({
        from: "0x0000000000000000000000000000000000000000",
        gas: 1e18
      })
      .then((assets: FuseAsset[]) => {
        assets.forEach(asset => {
          const cToken = new fuse.web3.eth.Contract(
            JSON.parse(
              fuse.compoundContracts[
                "contracts/CEtherDelegate.sol:CEtherDelegate"
              ].abi
            ),
            asset.cToken
          );

          cToken.events.allEvents({}, function (_, event) {
            console.log("New Event", event.transactionHash);

            const eventName = event.event;

            if (
              eventName != "Transfer" &&
              eventName != "Approval" &&
              eventName != "AccrueInterest" &&
              eventName != "Failure"
            ) {
              let embed = new MessageBuilder()
                .addField("Event Name", eventName, true)
                .addField("Pool ID", i.toString(), true)
                .addField("Underlying", asset.underlyingSymbol, true)
                .setColor(0x42c346)
                .setTimestamp();

              if (eventName === "Mint") {
                embed = embed
                  .addField(
                    "Amount",
                    formatAmount(
                      event.returnValues.mintAmount,
                      asset.underlyingDecimals
                    ),
                    true
                  )
                  .setColor(0x7ea8e8);
              }

              if (eventName === "Redeem") {
                embed = embed
                  .addField(
                    "Amount",
                    formatAmount(
                      event.returnValues.redeemAmount,
                      asset.underlyingDecimals
                    ),
                    true
                  )
                  .setColor(0xf5740d);
              }

              if (eventName === "Borrow") {
                embed = embed
                  .addField(
                    "Amount",
                    formatAmount(
                      event.returnValues.borrowAmount,
                      asset.underlyingDecimals
                    ),
                    true
                  )
                  .setColor(0x90ad6c);
              }

              if (eventName === "RepayBorrow") {
                embed = embed
                  .addField(
                    "Amount",
                    formatAmount(
                      event.returnValues.repayAmount,
                      asset.underlyingDecimals
                    ),
                    true
                  )
                  .setColor(0xdb4152);
              }

              if (event === "LiquidateBorrow") {
                embed = embed
                  .addField(
                    "Amount",
                    formatAmount(
                      event.returnValues.repayAmount,
                      asset.underlyingDecimals
                    ),
                    true
                  )
                  .setColor(0xf1c219);
              }

              hook.send(
                embed.addField(
                  "Link",
                  "https://etherscan.io/tx/" + event.transactionHash
                )
              );
            }
          });
        });
      });
  }
}
main();

// Prevent node from exiting early.
process.stdin.resume();