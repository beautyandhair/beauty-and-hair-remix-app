import {
  reactExtension,
  useApi,
  AdminBlock,
  InlineStack,
  Text,
  Button,
  Icon
} from '@shopify/ui-extensions-react/admin';

import { getVariants, updateVariantMetafields } from "./utils";
import { useCallback, useEffect, useState } from 'react';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.block.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const {i18n, data} = useApi(TARGET);

  const productId = data.selected[0].id;
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [colors, setColors] = useState([]);

  const getVendorColorGroup = useCallback(async (vendor: string) => {
    const res = await fetch(`api/vendorColorGroup?vendor=${vendor}`);

    if (!res.ok) {
      console.error("Network error");
      return;
    }

    const json = await res.json();

    if (json.colors) {
      setColors(json.colors);
    }
  }, []);

  const getProductVariants = useCallback(async () => {
    const variantData = await getVariants(productId.split('/').at(-1));
    
    if (variantData.data.productVariants.nodes.length) {
      const variants = variantData.data.productVariants.nodes;

      setVariants(variants);
      getVendorColorGroup(variants[0].product.vendor);
    }
  }, [productId]);

  useEffect(() => {
    getProductVariants();
  }, []);

  const onSync = useCallback(async () => {
    const updatedVariants = variants.map((variant) => ({
      "id": variant.id,
      "metafields": [
        {
          "namespace": "custom",
          "key": "color_group",
          "value": '["' + colors[variant.title] + '"]',
          "type": "list.single_line_text_field"
        }
      ]
    }))

    const updateResult = await updateVariantMetafields(productId, updatedVariants);
  }, [variants, colors]);

  return (
    // The AdminBlock component provides an API for setting the title of the Block extension wrapper.
    <AdminBlock title="Product Variant Color Groups">
      <InlineStack blockAlignment="center" gap="base large">
        <Text>Assign color groups to product variants</Text>
        <Button onClick={onSync}>
          <Icon name="RefreshMinor" />
        </Button>
      </InlineStack>
    </AdminBlock>
  );
}