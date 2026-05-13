import '@shopify/ui-extensions/preact';
import {render} from "preact";
import { useState, useMemo, useCallback } from "preact/hooks";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const { applyCartLinesChange, i18n, lines, shippingAddress } = shopify;

  const [cartLines, setCartLines] = useState(lines.value);
  const [shippingCountry, setShippingCountry] = useState(shippingAddress.value?.countryCode);

  lines.subscribe(setCartLines);
  shippingAddress.subscribe((address) => setShippingCountry(address?.countryCode));

  const showWarning = useMemo(() => shippingCountry && shippingCountry != "US" &&
    cartLines.some((line) => line.attributes.some((attribute) => attribute.key === "_preorder-eta" && attribute.value.includes("-"))) &&
    cartLines.some((line) => line.attributes.some((attribute) => attribute.key === "_preorder-eta" && !attribute.value.includes("-")))
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
    <s-banner heading={i18n.translate("banner_heading")} tone="warning">
      <s-stack gap="base">
        <s-text>
          {i18n.translate("notice")}
        </s-text>
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-link href="https://www.wigs.com/apps/help-center#hc-pre-orders" target="_blank">{i18n.translate("learn_more")}</s-link>
          <s-button tone="neutral" variant="secondary" onClick={removePreorders}>{i18n.translate("remove_button")}</s-button>
        </s-stack>
      </s-stack>
    </s-banner>
  );
}