import { authenticate } from "../shopify.server";

import {
  updateVendorColorShopImageIds
} from "../models/VendorColor.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: LoaderFunctionArgs) => {
  console.log('***---', request);

  const { cors } = await authenticate.admin(request);
  const data: any = {
    ...Object.fromEntries(await request.formData()),
  };

  const url = new URL(request.url);
  const vendorName = url.searchParams.get("vendorName");

  console.log('***', request, data);
  
  if (vendorName && data.shopImageIdUpdates) {
    await updateVendorColorShopImageIds(vendorName, JSON.parse(data.shopImageIdUpdates));

    return cors(Response.json({success: true}));
  }

  return cors(Response.json({error: 'Vendor not found'}));
};
