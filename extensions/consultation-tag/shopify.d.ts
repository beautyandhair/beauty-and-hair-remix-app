import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/BlockExtension.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.customer-details.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/utils.js' {
  const shopify: import('@shopify/ui-extensions/admin.customer-details.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}
