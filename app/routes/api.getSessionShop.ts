import { authenticate } from "../shopify.server";
import { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { cors, session } = await authenticate.admin(request);

  return cors(Response.json({shop: session.shop}));
};
