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
  fiber: string,
  colorName?: string,
  colorDesc?: string,
  temp?: string,
  rooted?: boolean,
  highlighted?: boolean,
  features: string[],
  truColorSrc?: string
}

interface ColorImage {
  imageSrc?: string,
  imageId?: string,
  altText?: string,
  fileName?: string,
  shopImageIds?: {[key: string]: string},
  fiber: string
}

interface Product {
  vendor: string,
  tags: string[]
}

interface Variant {
  id: string,
  title: string,
  product: Product,
  image?: {
    src?: string
  }
}

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body);
};

const FIBER_SYNTHETIC = "Synthetic";

function Extension() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const { data, close } = shopify;

  const productId = data.selected[0].id;
  const [loading, setLoading] = useState(true);
  const [syncLoadingMessage, setSyncLoadingMessage] = useState('');
  const [shop, setShop] = useState('');
  const [vendor, setVendor] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vendorColors, setVendorColors] = useState<VendorColor[]>([]);
  const [syncWarning, setSyncWarning] = useState<boolean>(false);
  const [fiber, setFiber] = useState<string>("");
  const [vendorError, setVendorError] = useState<string>();
  const [fiberWarning, setFiberWarning] = useState<string>();
  const [forceSynthetic, setForceSynthetic] = useState<boolean>(false);

  const colorGroups: {[key: string]: string[]} = useMemo(() => vendorColors.reduce((obj: {[key: string]: string[]}, vendorColor) => {
      obj[vendorColor.color] = vendorColor.groups;

      return obj;
    }, ({}))
  , [vendorColors]);

  const colorImages: {[key: string]: ColorImage} = useMemo(() => vendorColors.filter((vendorColor) => vendorColor.fiber === (forceSynthetic ? FIBER_SYNTHETIC : fiber)).reduce((obj: {[key: string]: ColorImage}, vendorColor) => {
      obj[vendorColor.color] = {
        imageSrc: vendorColor.imageSrc,
        imageId: vendorColor.shopImageIds?.[shop],
        altText: vendorColor.altText,
        fileName: vendorColor.fileName,
        shopImageIds: vendorColor.shopImageIds,
        fiber: forceSynthetic ? FIBER_SYNTHETIC : vendorColor.fiber
      };

      return obj;
    }, ({}))
  , [vendorColors, shop, fiber, forceSynthetic]);

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

    if (!json) {
      setVendorError("Vendor Does Not Exist in Color Groups");
    }
    else if (json.colors) {
      setVendorColors(json.colors);
      setLoading(false);
    }
  }, []);

  const getProductVariants = useCallback(async () => {
    const variantData = await getVariants(productId.split('/').pop());
    
    if (variantData.data.productVariants.nodes.length) {
      const variants = variantData.data.productVariants.nodes;
      const vendorValue = variantData.data.product.vendor;
      const fiberValue = variantData.data.product.tags.find((tag: string) => tag.includes("Hair Fiber"))?.split('_')[1];

      setVariants(variants);

      if (vendorValue) {
        getVendorColors(vendorValue);
        setVendor(vendorValue);
      }
      else {
        setVendorError("Vendor Not Assigned");
      }

      if (fiberValue) {
        setFiber(fiberValue);
      }
      else {
        setFiber("Synthetic");
        setFiberWarning("No 'Hair Fiber_' Tag Found, Defaulted to 'Synthetic' Fiber");
      }
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

        shopImageIdUpdates.push({color: variantImage.color, fiber: variantImage.fiber && !forceSynthetic ? fiber : FIBER_SYNTHETIC, shopImageIds: {...variantImage.shopImageIds, [shop]: file.id}});
      }
    }

    const formData = new FormData();

    formData.append('shopImageIdUpdates', JSON.stringify(shopImageIdUpdates));

    const res = await fetch(`api/updateVendorColorShopImageIds?vendorName=${vendor}`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      console.error("Network error");

      return;
    }
  }, [shop, vendor, fiber, forceSynthetic]);

  const updateProductVariantImages = useCallback(async (updatedVariants: {id: any, mediaId: {imageId: string}}[]) => {
    await updateVariantImages(productId, updatedVariants);
  }, [productId]);

  const onSyncColorGroups = useCallback(async () => {
    setSyncLoadingMessage("Updating variant color groups...");

    const updatedVariants = variants.map((variant: Variant) => ({
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
    const variantImageCategories = Object.keys(variantsToUpdate).reduce((obj: any, key) => {
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

    const updatedVariants = variantImageCategories.ready.map((imageReady: any) => ({
      "id": imageReady.variantId,
      "mediaId": imageReady.imageId,
    }));

    await updateProductVariantImages(updatedVariants);

    setSyncLoadingMessage("");
  }, [handleUploadVendorColorImages, updateProductVariantImages]);

  const onSyncAllColorImages = useCallback(async () => {
    setSyncWarning(false);
    setSyncLoadingMessage("Checking variant images...");

    const variantsToUpdate = variants.reduce((obj: any, variant) => {
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

    const variantsToUpdate = variants.filter((variant) => !variant.image?.src).reduce((obj: any, variant) => {
      obj[variant.title] = {
        variantId: variant.id,
        ...colorImages[variant.title]
      };

      return obj;
    }, ({}));
    
    syncVariantColorImages(variantsToUpdate);
  }, [variants, colorImages, syncVariantColorImages]);

  const onToggleSynthetic = useCallback(() => {
    setForceSynthetic(!forceSynthetic);
  }, [forceSynthetic]);

  if (vendorError) {
    return (
      <s-banner tone="critical">
        {vendorError}
      </s-banner>
    )
  }

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
      {fiberWarning && (
        <s-stack gap="base" direction="block" paddingBlockEnd="base">
          <s-banner tone="warning">
            {fiberWarning}
          </s-banner>
        </s-stack>
      )}
      {loading ? (
        <s-stack direction="inline" alignItems="center" justifyContent="center" minInlineSize="100%">
          <s-spinner size="large-100" />
        </s-stack>
      ) : (
        <s-stack alignItems="start" gap="small-300">
          <s-stack direction="inline" gap="base" justifyContent="space-between" paddingBlockEnd="base" inlineSize="100%">
            <s-stack direction="inline" gap="small-300" paddingBlockStart="small-400">
              <s-badge>{vendor}</s-badge>
              <s-badge>{fiber}</s-badge>
            </s-stack>

            <s-switch
              label="Force Synthetic Fiber"
              details="Use synthetic swatches, instead of product fiber"
              checked={forceSynthetic}
              onChange={onToggleSynthetic}
            />
          </s-stack>

          <s-divider></s-divider>

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
