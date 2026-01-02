import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

   // Set CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": '*',
    "Access-Control-Allow-Methods": 'GET, POST, OPTIONS, PUT',
    "Access-Control-Allow-Headers": 'Content-Type, Authorization, Content-Type, Accept, Authorization, X-Requested-With, Application, ip',
    "Content-Type": "application/json"
  });
  

  // Handle OPTIONS method for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: headers
    });
  }



  return null;
};
