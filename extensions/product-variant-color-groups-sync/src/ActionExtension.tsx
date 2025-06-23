import {useCallback, useEffect, useState, useMemo} from 'react';
import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  Paragraph,
  Banner,
  ProgressIndicator,
  InlineStack
} from '@shopify/ui-extensions-react/admin';

import { getVariants, updateVariantMetafields, updateVariantImages } from "./utils";

export interface VendorColor {
  color: string,
  group: string,
  imageSrc?: string,
  shopImageIds: {[key: string]: string}
}

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const {i18n, data} = useApi(TARGET);

  const productId = data.selected[0].id;
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [vendorColors, setVendorColors] = useState<VendorColor[]>([]);
  const [syncWarning, setSyncWarning] = useState<boolean>(false);

  const colorGroups: {[key: string]: string} = useMemo(() => vendorColors.reduce((obj, vendorColor) => {
      obj[vendorColor.color] = vendorColor.group;

      return obj;
    }, ({}))
  , [vendorColors]);

  const colorImages: {[key: string]: string} = useMemo(() => vendorColors.reduce((obj, vendorColor) => {
      obj[vendorColor.color] = vendorColor.shopImageIds['kats-dev-store'];

      return obj;
    }, ({}))
  , [vendorColors]);

  const getVendorColors = useCallback(async (vendorName: string) => {
    const res = await fetch(`api/vendorColorGroup?vendorName=${vendorName}`);

    if (!res.ok) {
      console.error("Network error");
      return;
    }

    const json = await res.json();

    console.log('****', json);
    if (json.colors) {
      setVendorColors(json.colors);
      setLoading(false);
    }
  }, []);

  const getProductVariants = useCallback(async () => {
    const variantData = await getVariants(productId.split('/').at(-1));
    
    if (variantData.data.productVariants.nodes.length) {
      const variants = variantData.data.productVariants.nodes;

      setVariants(variants);
      getVendorColors(variants[0].product.vendor);
    }
  }, [productId]);

  useEffect(() => {
    getProductVariants();
  }, []);

  const onSyncColorGroups = useCallback(async () => {
    const updatedVariants = variants.map((variant) => ({
      "id": variant.id,
      "metafields": [
        {
          "namespace": "custom",
          "key": "color_group",
          "value": '["' + colorGroups[variant.title] + '"]',
          "type": "list.single_line_text_field"
        }
      ]
    }));

    const syncResult = await updateVariantMetafields(productId, updatedVariants);
  }, [variants, colorGroups]);

  const onSyncColorImages = useCallback(async () => {
    const updatedVariants = variants.map((variant) => ({
      "id": variant.id,
      "mediaSrc": colorImages[variant.title]
    })).filter((variant) => variant.mediaSrc != undefined);

    const syncResult = await updateVariantImages(productId, updatedVariants);
  }, [variants, colorImages]);

  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminAction
      primaryAction={
        <Button onPress={close}>
          Done
        </Button>
      }
      secondaryAction={
        <Button onPress={close}>
          Close
        </Button>
      }
    >
      {loading ? (
        <InlineStack inlineAlignment="center">
          <ProgressIndicator size="large-300" />
        </InlineStack>
      ) : (
        <BlockStack blockAlignment="center" gap="base large">
          <Paragraph>
            Variant's color group metafield will be updated and/or overridden to assigned group in Color Groups Table
          </Paragraph>
          <Button onClick={onSyncColorGroups}>
            Assign Color Groups
          </Button>

          <Paragraph>
            Variant's image will be updated and/or overridden to default image set in Color Groups Table
          </Paragraph>
          <Button onClick={() => setSyncWarning(true)}>
            Assign Color Images
          </Button>
          
          {syncWarning && (
            <Banner
              title="Confirm Action"
              tone="warning"
              primaryAction={<Button onClick={() => setSyncWarning(false)}>Cancel</Button>}
              secondaryAction={<Button onClick={onSyncColorImages}>Confirm</Button>}
            >
              Are you sure you want to override variant images?
            </Banner>
          )}
        </BlockStack>
      )}
    </AdminAction>
  );
}
