import { authenticate } from "../shopify.server";

import {
  getVendorColorGroup
} from "../models/VendorColorGroups.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors } = await authenticate.admin(request);

   const url = new URL(request.url);
  const vendor = url.searchParams.get("vendor");

  if (vendor) {
    const vendorColorGroup = await getVendorColorGroup(vendor);

    return cors(Response.json(vendorColorGroup));
  }

  return cors(Response.json({error: 'Vendor not found'}));
};
