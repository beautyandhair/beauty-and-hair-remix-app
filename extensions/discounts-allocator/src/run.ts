import type {
  RunInput,
  FunctionRunResult,
  CartLine,
  CartLineTarget
} from "../generated/api";

import { Decimal } from "decimal.js";

const CLEARANCE_ITEM_IN_CART =
  "Some items in cart are not eligible for discount";

const EMPTY_RESULT: FunctionRunResult = {
  displayableErrors: [],
  lineDiscounts: [],
};

// Helper function to extract the line index from a target's cartLineId
function getTargetLineIndex(target: CartLineTarget) {
  return parseInt(target.cartLineId.slice(-1));
}

// Helper function to calculate the price for a specific target based on its quantity
function calculateCurrentTargetPrice(
  inputCartLines: {cost: { amountPerQuantity: {amount: any} }}[],
  target: CartLineTarget
) {
  const targetLineIndex = getTargetLineIndex(target);
  const targetLine = inputCartLines[targetLineIndex];
  return targetLine.cost.amountPerQuantity.amount * target.quantity;
}

export function run(input: RunInput): FunctionRunResult {
  // Initialize the output structure for line discounts
  let allLinesOutputDiscounts: {
    cartLineId: string,
    quantity: number,
    allocations: {
      discountProposalId: any;
      amount: Decimal;
    }[]
  }[] = input.cart.lines.map((line) => ({
    cartLineId: line.id,
    quantity: line.quantity,
    allocations: [],
  }));
  let displayableErrors = [];

  console.log('***--', input);
  // Iterate over each discount in the input
  for (const discount of (input.discounts ?? [])) {
    // Process each discount proposal within the current discount
    for (const proposal of discount.discountProposals) {
      // Calculate the total price of all targets affected by the current proposal
      const totalTargetsPrice = proposal.targets.reduce((total, target) => {
        return total + calculateCurrentTargetPrice(input.cart.lines, target);
      }, 0);

      // Apply the discount to each target
      for (const target of proposal.targets) {
        const targetLineIndex = getTargetLineIndex(target);
        const targetLine = input.cart.lines[targetLineIndex];
        const currentTargetPrice = targetLine.cost.amountPerQuantity.amount * target.quantity;

        const currentTargetRatio = currentTargetPrice / totalTargetsPrice;

        let lineDiscountAmount = 0.0;

        if (proposal.value.__typename == "FixedAmount") {
          if (proposal.value.appliesToEachItem) {
            lineDiscountAmount = proposal.value.amount * target.quantity;
          }
        } else if (proposal.value.__typename == "Percentage") {
          lineDiscountAmount =
            (proposal.value.value / 100.0) *
            totalTargetsPrice *
            currentTargetRatio;
        }

        if (targetLine.merchandise.__typename == "ProductVariant" && targetLine.merchandise.metafield?.value === "true") {
          lineDiscountAmount = 0.0;
          displayableErrors.push({
            discountId: discount.id.toString(),
            reason: CLEARANCE_ITEM_IN_CART
          });
        }

        if (lineDiscountAmount === 0.0) {
          continue;
        }

        const targetAllocation = {
          discountProposalId: proposal.handle,
          amount: new Decimal(lineDiscountAmount),
        };
        allLinesOutputDiscounts[targetLineIndex].allocations.push(
          targetAllocation,
        );
      }
    }
  }

  // Filter out lines that have no allocations
  const lineDiscounts = allLinesOutputDiscounts.filter(
    (outputDiscount) => outputDiscount.allocations.length > 0,
  );

  // Prepare the final output structure
  const output = {
    lineDiscounts,
    displayableErrors,
  };

  return output;
}
