import '@shopify/ui-extensions/preact';
import {render} from 'preact';

import { useState, useEffect, useMemo } from "preact/hooks";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const {
    merchandise: {
      subtitle,
      product: {
        id: productId
      }
    },
    attributes
  } = shopify.target.value;
  const { query, i18n } = shopify;

  const linePreorderEta = useMemo(() => {
    let attributeEta = attributes.find((attribute) => attribute.key === "_preorder-eta");

    if (attributeEta){
      let date =  new Date(attributeEta.value);

      return {attribute: attributeEta.value, date};
    }

    return ({});
  }, [attributes]);

  const [shippingMessage, setShippingMessage] = useState<{
    tone?: "critical" | "success" | "custom",
    status?: string,
    text?: string
  }>({});

  const badgeSettings = useMemo<{
    icon?: 'truck',
    paddingBlock: 'none' | 'small-300',
    paddingInline: 'none' | 'small-300'
  }>(() => {
    if (shippingMessage.tone == "custom") {
      return ({
        icon: 'truck',
        paddingBlock: 'none',
        paddingInline: 'none'
      });
    }

    return ({
      paddingBlock: 'small-300',
      paddingInline: 'small-300'
    });
  }, [shippingMessage]);

  /* FUNCTIONS */

  const getShippingMessage = (variantPreorderMetafield: string | undefined) => {
    if (!variantPreorderMetafield) {
      return;
    }

    let variantPreorderEta = new Date(variantPreorderMetafield);
    let etaDay = variantPreorderEta.getDate();
    let etaMonth = variantPreorderEta.toLocaleDateString("en-US", {
      month: "long"
    });
    let etaDateMessage: string;

    if (etaDay < 11) {
      etaDateMessage = `${i18n.translate('early')} ${etaMonth}`;
    }
    else if (etaDay < 25) {
      etaDateMessage = `${i18n.translate('mid')} ${etaMonth}`;
    }
    else {
      etaDateMessage = `${i18n.translate('end')} ${etaMonth}`;
    }

    if (linePreorderEta.attribute == variantPreorderMetafield) {
      setShippingMessage({tone: 'custom', status: 'On Time'});
    }
    else if (linePreorderEta.date < variantPreorderEta) {
      setShippingMessage({tone: 'critical', status: 'Delayed', text: `Estimated Ship Date: ${etaDateMessage}`});
    }
    else {
      setShippingMessage({tone: 'success', status: 'Arriving Early', text: `Estimated Ship Date: ${etaDateMessage}`});
    }
  }

  const fetchProductVariant = async () => {
    try {
      const { data } = await query<{products: {nodes: {variantBySelectedOptions?: {metafield?: {value?: string}} | null}[]}}>(
        `query {
          products(first: 1, query: "id:'${productId.replace('gid://shopify/Product/', '')}'") {
            nodes {
              variantBySelectedOptions(
                selectedOptions: {
                  name: "Color",
                  value: "${subtitle}"
                }
              ){
                metafield(namespace: "global", key: "ETA") {
                  value
                }
              }
            }
          }
        }`
      );

      getShippingMessage(data.products?.nodes[0]?.variantBySelectedOptions?.metafield?.value);
    } catch (error) {
      console.error(error, 'Error fetching product variant');
    }
  }

  useEffect(() => {
    if (linePreorderEta) {
      fetchProductVariant();
    }
  }, [linePreorderEta]);

  if (!shippingMessage.status) {
    return null;
  }

  return (
    <s-grid gridTemplateColumns='auto 1fr' paddingBlockStart='small-200'>
      <s-box background='subdued' borderRadius='base' padding='none' inlineSize='auto' border='base'>
        <s-badge color='subdued' size='small-100' icon={badgeSettings.icon}>
          <s-stack paddingBlock={badgeSettings.paddingBlock} paddingInline={badgeSettings.paddingInline} gap='none'>
            <s-text tone={shippingMessage.tone}>{shippingMessage.status}</s-text>
            <s-text>{shippingMessage.text}</s-text>
          </s-stack>
        </s-badge>
      </s-box>
    </s-grid>
  );
}
