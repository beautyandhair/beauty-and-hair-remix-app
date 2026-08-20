export async function getTags(id) {
  return await makeGraphQLQuery(
    `query getCustomer($id: ID!) {
      customer(id: $id) {
        tags
      }
    }`,
    {
      "id": id
    },
  );
}

export async function addTags(id) {
  const currentDate = new Date();

  return await makeGraphQLQuery(
    `mutation addTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          message
        }
      }
    }`,
    {
      "id": id,
      "tags": `Consultation: ${(currentDate.getMonth() + 1).toString().padStart(2, "0")}-${currentDate.getDate().toString().padStart(2, "0")}-${currentDate.getFullYear()}`
    },
  );
}

export async function removeTags(id, tag) {
  return await makeGraphQLQuery(
    `mutation removeTags($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          message
        }
      }
    }`,
    {
      "id": id,
      "tags": [tag]
    },
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