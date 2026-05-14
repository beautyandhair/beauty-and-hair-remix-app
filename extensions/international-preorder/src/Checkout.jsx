import '@shopify/ui-extensions/preact';
import {render} from "preact";
import { useState, useMemo, useCallback } from "preact/hooks";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const { applyCartLinesChange, i18n, lines, shippingAddress } = shopify;

  const [settings, setSettings] = useState(shopify.settings.value);
  const {
    content
  } = useMemo(() => settings, [settings]);

  const [cartLines, setCartLines] = useState(lines.value);
  const [shippingCountry, setShippingCountry] = useState(shippingAddress.value?.countryCode);

  shopify.settings.subscribe(setSettings);
  lines.subscribe(setCartLines);
  shippingAddress.subscribe((address) => setShippingCountry(address?.countryCode));

  const showWarning = useMemo(() => shippingCountry && shippingCountry != "US" &&
    cartLines.some((line) => line.attributes.some((attribute) => attribute.key === "_preorder-eta" && attribute.value)) &&
    cartLines.some((line) => line.attributes.every((attribute) => (attribute.key === "_preorder-eta" && !attribute.value) || attribute.key != "_preorder-eta") && line.cost.totalAmount.amount > 1.00)
  , [shippingCountry, cartLines])

  const removePreorders = useCallback(async () => {
    const preorderLines = cartLines.filter((line) => 
      line.attributes.some((attribute) => attribute.key === "_preorder-eta" && attribute.value.includes("-"))
    );

    for (const line of preorderLines) {
      await applyCartLinesChange({
        type: 'removeCartLine',
        id: line.id,
        quantity: line.quantity,
      });
    }
  }, [cartLines, applyCartLinesChange]);

  if (!showWarning) {
    return null;
  }

  return (
    <s-stack background="subdued" padding="base" borderRadius="base" border="base" gap="base">
      <s-heading>Shipping Notice</s-heading>
      <s-stack gap="base">
        <s-stack gap="base">
          {typeof content === "string" && content?.split(/\n+/g)?.map((text, index) => (
            <s-paragraph key={`text-${index}`}>
              {text}
            </s-paragraph>
          ))}
        </s-stack>
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-button href="https://www.wigs.com/apps/help-center#hc-pre-orders" target="_blank">{i18n.translate("learn_more")}</s-button>
          <s-button tone="neutral" variant="primary" onClick={removePreorders}>{i18n.translate("remove_button")}</s-button>
        </s-stack>
      </s-stack>
    </s-stack>
  );
}