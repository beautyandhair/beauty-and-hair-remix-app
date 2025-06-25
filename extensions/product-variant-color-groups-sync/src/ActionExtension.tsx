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
  InlineStack,
  Text
} from '@shopify/ui-extensions-react/admin';

import { getVariants, updateVariantMetafields, updateVariantImages, uploadVendorColorImages } from "./utils";

export interface VendorColor {
  color: string,
  groups: string[],
  imageSrc?: string,
  shopImageIds?: {[key: string]: string}
}

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const { i18n, data, close } = useApi(TARGET);

  const productId = data.selected[0].id;
  const [loading, setLoading] = useState(true);
  const [syncLoadingMessage, setSyncLoadingMessage] = useState('');
  const [shop, setShop] = useState('');
  const [variants, setVariants] = useState([]);
  const [vendorColors, setVendorColors] = useState<VendorColor[]>([]);
  const [syncWarning, setSyncWarning] = useState<boolean>(false);

  const colorGroups: {[key: string]: string[]} = useMemo(() => vendorColors.reduce((obj, vendorColor) => {
      obj[vendorColor.color] = vendorColor.groups;

      return obj;
    }, ({}))
  , [vendorColors]);

  const colorImages: {[key: string]: {
    imageSrc?: string,
    imageId?: string
  }} = useMemo(() => vendorColors.reduce((obj, vendorColor) => {
      obj[vendorColor.color] = {
        imageSrc: vendorColor.imageSrc,
        imageId: vendorColor.shopImageIds?.[shop]
      };

      return obj;
    }, ({}))
  , [vendorColors]);

  const getSessionShop = useCallback(async () => {
    const res = await fetch(`api/getSessionShop`);

    if (!res.ok) {
      console.error("Network error");
      return;
    }

    const json = await res.json();

    if (json.shop) {
      setShop(json.shop);
    }
  }, []);

  const getVendorColors = useCallback(async (vendorName: string) => {
    const res = await fetch(`api/getVendor?vendorName=${vendorName}`);

    if (!res.ok) {
      console.error("Network error");
      return;
    }

    const json = await res.json();

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
    getSessionShop();
    getProductVariants();
  }, []);


  const updateProductVariantImages = async (updatedVariants: {id: any, mediaId: {imageId: string}}[]) => {
    const syncResult = await updateVariantImages(productId, updatedVariants);
  };

  const onSyncColorGroups = useCallback(async () => {
    setSyncLoadingMessage("Updating variant color groups...");

    const updatedVariants = variants.map((variant) => ({
      "id": variant.id,
      "metafields": [
        {
          "namespace": "custom",
          "key": "color_group",
          "value": JSON.stringify(colorGroups[variant.title] ?? []),
          "type": "list.single_line_text_field"
        }
      ]
    }));

    const syncResult = await updateVariantMetafields(productId, updatedVariants);

    setSyncLoadingMessage("");
  }, [variants, colorGroups]);

  const onSyncColorImages = useCallback(async () => {
    setSyncWarning(false);
    setSyncLoadingMessage("Checking variant images...");

    const variantsToUpdate = variants.reduce((obj, variant) => {
      obj[variant.title] = {
        variantId: variant.id,
        ...colorImages[variant.title]
      };

      return obj;
    }, ({}));
    
    const variantImageCategories = Object.keys(variantsToUpdate).reduce((obj, key) => {
      const variantUpdating = {...variantsToUpdate[key], color: key};

      if (variantUpdating.imageId) {
        obj.ready = [...obj.ready, variantUpdating];
      }
      else if (variantUpdating.imageSrc) {
        obj.uploadNeeded = [...obj.uploadNeeded, variantUpdating];
      }
      else {
        obj.noSrc = [...obj.noSrc, variantUpdating];
      }

      return obj;
    }, ({
      ready: [],
      uploadNeeded: [],
      noSrc: []
    }));

    const imagesToUpload = variantImageCategories.uploadNeeded.map((imageUpload) =>( {
      color: imageUpload.color,
      imageSrc: imageUpload.imageSrc
    }));

    if (imagesToUpload.length) {
      setSyncLoadingMessage("Uploading necessary variant images...");

      const imageUploadResult = await uploadVendorColorImages(imagesToUpload);
      const regex = new RegExp(/Color\s(.*)\sSwatch/);

      imageUploadResult.data.fileCreate.files.forEach((file: any) => {
        if (file.fileStatus != "FAILED") {
          let fileColor = regex.exec(file.alt)[1];

          variantImageCategories.ready = [...variantImageCategories.ready, {
            ...variantsToUpdate[fileColor],
            imageId: file.id
          }];

          variantImageCategories.uploadNeeded = variantImageCategories.uploadNeeded.filter((imageUpload) => imageUpload.color != fileColor);
        }
      });
    }

    setSyncLoadingMessage("Updating variant images...");

    const updatedVariants = variantImageCategories.ready.map((imageReady) => ({
      "id": imageReady.variantId,
      "mediaId": imageReady.imageId
    }));

    await updateProductVariantImages(updatedVariants);

    setSyncLoadingMessage("");
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
            Variant's color groups metafield will be updated and/or overridden to assigned groups in Color Groups Table
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
      {syncLoadingMessage && (
        <BlockStack inlineAlignment="center" blockAlignment="center">
          <ProgressIndicator size="large-300" />
          <Text>{syncLoadingMessage}</Text>
        </BlockStack>
      )
      }
    </AdminAction>
  );
}
