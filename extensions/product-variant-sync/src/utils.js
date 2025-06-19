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
