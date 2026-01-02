import { authenticate } from "../shopify.server";

import {
  updateVendorColorShopImageIds
} from "../models/VendorColor.server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  
  
  

  // Handle OPTIONS method for CORS preflight
  if (request.method === 'OPTIONS') {

     // Set CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": '*',
    "Access-Control-Allow-Methods": 'GET, POST, OPTIONS, PUT',
    "Access-Control-Allow-Headers": 'Content-Type, Authorization, Content-Type, Accept, Authorization, X-Requested-With, Application, ip',
    "Content-Type": "application/json"
  });
    
    return new Response('', {
      status: 204,
      headers: headers
    });
  }
  
  
  const { cors } = await authenticate.admin(request);

  return cors(Response.json({success: true}));
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { cors } = await authenticate.admin(request);
  
  const data: any = {
    ...Object.fromEntries(await request.formData()),
  };

  const url = new URL(request.url);
  const vendorName = url.searchParams.get("vendorName");
  
  if (vendorName && data.shopImageIdUpdates) {
    await updateVendorColorShopImageIds(vendorName, JSON.parse(data.shopImageIdUpdates));

    return cors(Response.json({success: true}));
  }

  return cors(Response.json({error: 'Vendor not found'}));
};
