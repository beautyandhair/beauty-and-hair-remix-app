import '@shopify/ui-extensions/preact';
import {render} from "preact";

import { useState, useEffect, useCallback, useMemo } from "preact/hooks";
import { getVariants, updateVariantMetafields, updateVariantImages, uploadVendorColorImage } from "./utils";

export interface VendorColor {
  color: string,
  groups: string[],
  imageSrc?: string,
  shopImageIds?: {[key: string]: string},
  altText?: string,
  fileName?: string,
  isHumanHair?: boolean
}

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const { data, close } = shopify;

  const productId = data.selected[0].id;
  const [loading, setLoading] = useState(true);
  const [syncLoadingMessage, setSyncLoadingMessage] = useState('');
  const [shop, setShop] = useState('');
  const [variants, setVariants] = useState([]);
  const [vendorColors, setVendorColors] = useState<VendorColor[]>([]);
  const [syncWarning, setSyncWarning] = useState<boolean>(false);
  const [isHumanHair, setIsHumanHair] = useState<boolean>(false);

  const colorGroups: {[key: string]: string[]} = useMemo(() => vendorColors.reduce((obj, vendorColor) => {
      obj[vendorColor.color] = vendorColor.groups;

      return obj;
    }, ({}))
  , [vendorColors]);

  const colorImages: {[key: string]: {
    imageSrc?: string,
    imageId?: string,
    altText?: string,
    fileName?: string,
    shopImageIds: {[key: string]: string},
    isHumanHair?: boolean
  }} = useMemo(() => vendorColors.filter((vendorColor) => vendorColor.isHumanHair === isHumanHair).reduce((obj, vendorColor) => {
      obj[vendorColor.color] = {
        imageSrc: vendorColor.imageSrc,
        imageId: vendorColor.shopImageIds?.[shop],
        altText: vendorColor.altText,
        fileName: vendorColor.fileName,
        shopImageIds: vendorColor.shopImageIds,
        isHumanHair: vendorColor.isHumanHair
      };

      return obj;
    }, ({}))
  , [vendorColors, shop, isHumanHair]);

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
      setIsHumanHair(variants[0].product.title?.includes("Human Hair") ?? false);
    }
  }, [productId, getVendorColors]);

  useEffect(() => {
    getSessionShop();
    getProductVariants();
  }, [getSessionShop, getProductVariants]);

  const handleUploadVendorColorImages = useCallback(async (
    variantsToUpdate: any,
    variantImageCategories: {
      ready: any[],
      uploadNeeded: any[],
      noSrc: any[]
    }
  ) => {
    setSyncLoadingMessage("Uploading necessary variant images...");

    const shopImageIdUpdates = [];

    for (const variantImage of variantImageCategories.uploadNeeded) {
      const imageUploadResult = await uploadVendorColorImage(variantImage);

      const file = imageUploadResult.data.fileCreate.files[0];

      if (file.fileStatus != "FAILED") {        
        variantImageCategories.ready = [...variantImageCategories.ready, {
          ...variantsToUpdate[variantImage.color],
          imageId: file.id
        }];

        variantImageCategories.uploadNeeded = variantImageCategories.uploadNeeded.filter((imageUpload) => imageUpload.color != variantImage.color);

        shopImageIdUpdates.push({color: variantImage.color, isHumanHair: variantImage.isHumanHair ?? isHumanHair, shopImageIds: {...variantImage.shopImageIds, [shop]: file.id}});
      }
    }

    const formData = new FormData();

    formData.append('shopImageIdUpdates', JSON.stringify(shopImageIdUpdates));

    const res = await fetch(`api/updateVendorColorShopImageIds?vendorName=${variants[0].product.vendor}`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      console.error("Network error");
      return;
    }
  }, [shop, variants]);

  const updateProductVariantImages = useCallback(async (updatedVariants: {id: any, mediaId: {imageId: string}}[]) => {
    await updateVariantImages(productId, updatedVariants);
  }, [productId]);

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

    await updateVariantMetafields(productId, updatedVariants);

    setSyncLoadingMessage("");
  }, [variants, colorGroups, productId]);

  const syncVariantColorImages = useCallback(async (variantsToUpdate: any) => {
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

    if (variantImageCategories.uploadNeeded.length) {
      await handleUploadVendorColorImages(variantsToUpdate, variantImageCategories);
    }

    setSyncLoadingMessage("Updating variant images...");

    const updatedVariants = variantImageCategories.ready.map((imageReady) => ({
      "id": imageReady.variantId,
      "mediaId": imageReady.imageId,
    }));

    await updateProductVariantImages(updatedVariants);

    setSyncLoadingMessage("");
  }, [handleUploadVendorColorImages, updateProductVariantImages]);

  const onSyncAllColorImages = useCallback(async () => {
    setSyncWarning(false);
    setSyncLoadingMessage("Checking variant images...");

    const variantsToUpdate = variants.reduce((obj, variant) => {
      obj[variant.title] = {
        variantId: variant.id,
        ...colorImages[variant.title]
      };

      return obj;
    }, ({}));
    
    syncVariantColorImages(variantsToUpdate);
  }, [variants, colorImages, syncVariantColorImages]);

  const onSyncMissingColorImages = useCallback(async () => {
    setSyncWarning(false);
    setSyncLoadingMessage("Checking variants...");

    const variantsToUpdate = variants.filter((variant) => !variant.image?.src).reduce((obj, variant) => {
      obj[variant.title] = {
        variantId: variant.id,
        ...colorImages[variant.title]
      };

      return obj;
    }, ({}));
    
    syncVariantColorImages(variantsToUpdate);
  }, [variants, colorImages, syncVariantColorImages]);

  return (
    // The s-admin-action component provides an API for setting the title and actions of the Action extension wrapper.
    <s-admin-action
      primary-action={
        <s-button onClick={close}>
          Done
        </s-button>
      }
      secondary-action={
        <s-button onClick={close}>
          Close
        </s-button>
      }
    >
      {loading ? (
        <s-stack direction="inline" alignItems="center">
          <s-spinner size="large-100" />
        </s-stack>
      ) : (
        <s-stack alignItems="start" gap="small-300">
          <s-paragraph>
            Variant's color groups metafield will be updated to assigned groups in Color Groups Table
          </s-paragraph>
          <s-button onClick={onSyncColorGroups}>
            Assign Color Groups
          </s-button>

          <s-paragraph>
            Variant's with a missing image will be updated to default image set in Color Groups Table
          </s-paragraph>
          <s-button onClick={onSyncMissingColorImages}>
            Assign Color Images
          </s-button>

          <s-box paddingBlockStart="large">
            <s-badge tone="warning" icon="alert-triangle">ATTENTION</s-badge>
          </s-box>

          <s-paragraph>
            Variant's image will be updated and/or <s-text type="strong">OVERRIDDEN</s-text> to default image set in Color Groups Table
          </s-paragraph>
          <s-button onClick={() => setSyncWarning(true)}>
            Assign Color Images
          </s-button>
          
          {syncWarning && (
            <s-banner
              heading="Confirm Action"
              tone="warning"
            >
              <s-stack gap="small-300">
                Are you sure you want to override variant images?
                <s-stack direction="inline" gap="small-300">
                  <s-button onClick={() => setSyncWarning(false)}>Cancel</s-button>
                  <s-button onClick={onSyncAllColorImages}>Confirm</s-button>
                </s-stack>
              </s-stack>
            </s-banner>
          )}
        </s-stack>
      )}
      {syncLoadingMessage && (
        <s-stack alignItems="center" justifyContent="center">
          <s-spinner size="large-100" />
          <s-text>{syncLoadingMessage}</s-text>
        </s-stack>
      )
      }
    </s-admin-action>
  );
}
