import "dotenv/config";
import * as Sentry from "@sentry/node";
import { MessageBuilder, Webhook } from "discord-webhook-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

import { fusePoolLens, web3 } from "./fuse";
import CErc20Delegate from "./abis/CErc20Delegate.json";

console.log("Connecting to Discord Webhook:", process.env.WEBHOOK_URL);

const hook = new Webhook(process.env.WEBHOOK_URL);
hook.setUsername("Fuse Alerts");
hook.setAvatar(
  "https://raw.githubusercontent.com/marketxyz/fuse-webhooks-bot/main/fuse.png"
);

const smallFormatter = Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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
  const { 1: fusePools } = await fusePoolLens.methods
    .getPublicPoolsWithData()
    .call({ gas: 1e18 });

  for (let i = 0; i < fusePools.length; i++) {
    fusePoolLens.methods
      .getPoolAssetsWithData(fusePools[i].comptroller)
      .call({
        from: "0x0000000000000000000000000000000000000000",
        gas: 1e18,
      })
      .then((assets: FuseAsset[]) => {
        assets.forEach((asset) => {
          const cToken = new web3.eth.Contract(
            CErc20Delegate.abi as any,
            asset.cToken
          );

          cToken.events.allEvents({}, function (e, event) {
            if (e) {
              console.log("err: ", e);
              Sentry.captureException(e);
              return;
            }
            console.log("New Event", event.transactionHash);

            const eventName = event.event;

            if (
              eventName != "Transfer" &&
              eventName != "Approval" &&
              eventName != "AccrueInterest" &&
              eventName != "Failure"
            ) {
              let embed = new MessageBuilder()
                .setTitle(eventName)
                .setDescription(`from \`${event.returnValues["0"]}\` \n\u200B`) // Return value '0' is always the from address.
                .addField("Pool ID", i.toString(), true)
                .addField("Asset", asset.underlyingSymbol, true)
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

              if (eventName === "LiquidateBorrow") {
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
                  "\u200B",
                  "https://polygonscan.com/tx/" + event.transactionHash
                )
              );
            }
          });
        });
      })
      .catch((e) => Sentry.captureException(e));
  }
}

main();

// Prevent node from exiting early.
process.stdin.resume();
