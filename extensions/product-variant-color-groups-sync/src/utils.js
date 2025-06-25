export async function updateVariantMetafields(producGid, updatedVariants) {
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
      "productId": producGid,
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
          product {
            vendor
          }
        }
      }
    }`
  );
}

export async function uploadVendorColorImages(vendorColors) {
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
      "files": vendorColors.map((vendorColor) => ({
        "alt": `Color ${vendorColor.color} Swatch`,
        "contentType": "IMAGE",
        "originalSource": vendorColor.imageSrc
      }))
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
