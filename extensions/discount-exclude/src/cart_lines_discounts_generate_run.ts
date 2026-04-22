import type {
  CartInput,
  CartLinesDiscountsGenerateRunResult
} from "../generated/api";
import {
  DiscountClass,
  ProductDiscountSelectionStrategy
} from "../generated/api";

type Configuration = {
  percentage: number,
  collections: string[],
  productTags: string[],
  excludeClearance: boolean
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput
): CartLinesDiscountsGenerateRunResult {
  const configuration: Configuration = JSON.parse(
    input?.discount?.metafield?.value ?? "{}"
  );

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  
  if (!input.cart.lines.length || !hasProductDiscountClass || !configuration.percentage) {
    return {operations: []};
  }

  const isExcluded = (variantMetafield: string | undefined) => {
    return configuration.excludeClearance && variantMetafield === 'true';
  }
  
  const targets = input.cart.lines
  .filter((line) => {
    if (line.merchandise.__typename == 'ProductVariant') {
      const variant = (line.merchandise);

      return variant.product.inAnyCollection && !variant.product.hasAnyTag && !isExcluded(variant.metafield?.value);
    } else {
      return false;
    }
  })
  .map((line) => {
    return ({ cartLine: { id: line.id } });
  });

  const operations = [];

  if (hasProductDiscountClass && targets.length > 0) {
    operations.push({
      productDiscountsAdd: {
        candidates: [
          {
            targets: targets,
            value: {
              percentage: {
                value: configuration.percentage.toString(),
              },
            },
          },
        ],
        selectionStrategy: ProductDiscountSelectionStrategy.Maximum,
      },
    });
  }

  return {
    operations
  };
};
