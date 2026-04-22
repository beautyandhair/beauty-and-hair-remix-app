import '@shopify/ui-extensions/preact';
import {render} from 'preact';

import { useState, useEffect, useMemo } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const {
    merchandise: {
      title,
      product: {
        id: productId
      }
    },
    attributes
  } = shopify.target.value;
  const { query } = shopify;

  const linePreorderEta = useMemo(() => {
    let attributeEta = attributes.find((attribute) => attribute.key === "_preorder-eta");

    let date =  new Date(attributeEta.value);

    return date;
  }, [attributes]);

  const [shippingMessage, setShippingMessage] = useState('');

  /* FUNCTIONS */

  const getShippingMessage = (variantPreorderMetafield: string | undefined) => {
    if (!variantPreorderMetafield) {
      return;
    }

    let variantPreorderEta = new Date(variantPreorderMetafield);

    if (linePreorderEta == variantPreorderEta) {
      setShippingMessage("On Time");
    }
    else if (linePreorderEta < variantPreorderEta) {
      setShippingMessage(`Delayed: Current Shipping Date ${variantPreorderEta}`);
    }
    else {
      setShippingMessage(`Early: Current Shipping Date ${variantPreorderEta}`);
    }
  }

  const fetchProductVariant = async () => {
    try {
      const { data } = await query<{products: {nodes: {variantBySelectedOptions:{metafield: {value: string}}}}[]}>(
        `query {
          products(first: 1, query: "id:'${productId}'") {
            nodes {
              variantBySelectedOptions(
                selectedOptions: {
                  name: "Color",
                  value: "${title}"
                }
              ){
                metafield(namespace: "global", key: "ETA") {
                  value
                }
                id
              }
            }
          }
        }`
      );

      getShippingMessage(data.products?.[0]?.nodes?.variantBySelectedOptions?.metafield?.value);
    } catch (error) {
      console.error(error, 'Error fetching product variant');
    }
  }

  useEffect(() => {
    if (linePreorderEta) {
      fetchProductVariant();
    }
  }, [linePreorderEta]);

  if (true) {
    return null;
  }

  return (
    <s-text>{shippingMessage}</s-text>
  );
}