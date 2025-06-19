import type {
  RunInput,
  FunctionRunResult
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

type Configuration = {
  percentage: number,
  collections: string[],
  productTags: string[]
};

export function run(input: RunInput): FunctionRunResult {
  const configuration: Configuration = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}"
  );

  if (!configuration.percentage) {
    return EMPTY_DISCOUNT;
  }

  const isClearance = (variantMetafield: string | undefined) => {
    return variantMetafield === 'true';
  }
  
  const targets = input.cart.lines
  .filter((line) => {
    if (line.merchandise.__typename == 'ProductVariant') {
      const variant = (line.merchandise);

      return variant.product.inAnyCollection && !variant.product.hasAnyTag && !isClearance(variant.metafield?.value)
    } else {
      return false;
    }
  })
  .map((line) => {
    return ({ cartLine: { id: line.id } });
  });

  if (!targets.length) {
    return EMPTY_DISCOUNT;
  }
  
  return {
    discounts: [
      {
        targets,
        value: {
          percentage: {
            value: configuration.percentage.toString(),
          },
        },
      },
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First,
  };
};
