import type {
  CartInput,
  CartLinesDiscountsGenerateRunResult} from '../generated/api';
import {
  DiscountClass,
  OrderDiscountSelectionStrategy
} from '../generated/api';

type Configuration = {
  percentage: number,
  collectionIds: string[],
  productTags: string[],
  excludeClearance: boolean
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const configuration: Configuration = JSON.parse(
    input?.discount?.metafield?.value ?? "{}"
  );

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  
  if (!input.cart.lines.length || !hasOrderDiscountClass) {
    return {operations: []};
  }

  const isExcluded = (variantMetafield: string | undefined) => {
    return configuration.excludeClearance && variantMetafield === 'true';
  }
  
  const excludedCartLineIds = input.cart.lines
  .filter((line) => {
    if (line.merchandise.__typename == 'ProductVariant') {
      const variant = (line.merchandise);

      return variant.product.inAnyCollection && !variant.product.hasAnyTag && !isExcluded(variant.metafield?.value);
    } else {
      return false;
    }
  })
  .map((line) =>  line.id);

  const operations = [];

  if (hasOrderDiscountClass) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: excludedCartLineIds ?? [],
                },
              },
            ],
            value: {
              percentage: {
                value: configuration.percentage,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.Maximum,
      },
    });
  }

  return {
    operations,
  };
}