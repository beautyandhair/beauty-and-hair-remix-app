export async function updateVariantMetafields(productGid, updatedVariants) {
  return await makeGraphQLQuery(
    `mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        product {
          id
        }
        productVariants {
          id
          metafields(first: 2) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      "productId": productGid,
      "variants": updatedVariants
    }
  );
}

export async function updateVariantImages(producGid, updatedVariants) {
  return await makeGraphQLQuery(
    `#graphql
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        product {
          id
        }
        productVariants {
          id
          image {
            url
          }
          metafield(namespace: "custom", key: "color_group") {
            value
            jsonValue
          }
        }
        userErrors {
          field
          message
        }
      }
    }
    `,
    {
      "productId": producGid,
      "variants": updatedVariants
    }
  );
}

export async function getVariants(productId) {
  return await makeGraphQLQuery(
    `query ProductVariantsList {
      productVariants(first: 100, query: "product_id:${productId}") {
        nodes {
          id
          title
          image {
            src
          }
          product {
            vendor
          }
        }
      }
    }`
  );
}

export async function uploadVendorColorImage(vendorColorImage) {
 return await makeGraphQLQuery(
    `mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          alt
          createdAt
        }
      }
    }`,
    {
      "files": {
        "alt": vendorColorImage.altText,
        "contentType": "IMAGE",
        "originalSource": vendorColorImage.imageSrc
      }
    }
  );
}

async function makeGraphQLQuery(query, variables) {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  return await res.json();
}
