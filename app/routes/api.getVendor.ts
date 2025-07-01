import { authenticate } from "../shopify.server";

import {
  getVendor
} from "../models/Vendor.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors } = await authenticate.admin(request);

  const url = new URL(request.url);
  const vendorName = url.searchParams.get("vendorName");

  if (vendorName) {
    const vendor = await getVendor(vendorName);

    return cors(Response.json(vendor));
  }

  return cors(Response.json({error: 'Vendor not found'}));
};
