import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Charged as ChargedEvent,
  Subscribed as SubscribedEvent,
  Cancelled as CancelledEvent,
} from "../generated/UsdSubscriptionProd/UsdSubscriptionProd";
import { PayerAdded as PayerAddedEvent } from "../generated/PayerRegistry/PayerRegistry";
import { Payer, SubscriptionPlan, Charge } from "../generated/schema";

export function handleSubscribed(e: SubscribedEvent): void {
  const id = e.params.payer.toHexString();
  let plan = SubscriptionPlan.load(id);
  if (plan == null) {
    plan = new SubscriptionPlan(id);
  }
  plan.payer = e.params.payer;
  plan.merchant = e.params.merchant;
  plan.usdCents = e.params.usdCentsPerPeriod;
  plan.period = e.params.period;
  plan.maxEthPerChargeWei = e.params.maxEthPerChargeWei;
  plan.active = true;
  plan.save();
}

export function handleCancelled(e: CancelledEvent): void {
  const id = e.params.payer.toHexString();
  const plan = SubscriptionPlan.load(id);
  if (plan) {
    plan.active = false;
    plan.save();
  }
}

export function handleCharged(e: ChargedEvent): void {
  const planId = e.params.payer.toHexString();
  const plan = SubscriptionPlan.load(planId);
  if (plan) {
    plan.lastCharged = e.params.nextChargeAt.minus(
      BigInt.fromI32(<i32>plan.period.toI32())
    );
    plan.save();
  }
  const id = e.transaction.hash.toHexString() + ":" + e.logIndex.toString();
  const c = new Charge(id);
  c.payer = e.params.payer;
  c.merchant = e.params.merchant;
  c.usdCents = e.params.usdCents;
  c.priceEthUsd_8 = e.params.priceEthUsd_8;
  c.paidEthWei = e.params.paidEthWei;
  c.nextChargeAt = e.params.nextChargeAt;
  c.timestamp = e.block.timestamp;
  c.txHash = e.transaction.hash;
  c.save();
}

export function handlePayerAdded(e: PayerAddedEvent): void {
  const id = e.params.payer.toHexString() + ":" + e.params.merchant.toHexString();
  const p = new Payer(id);
  p.merchant = e.params.merchant;
  p.address = e.params.payer;
  p.save();
}

