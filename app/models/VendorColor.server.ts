import { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";

import prisma from "../db.server";
import { Vendor } from "./Vendor.server";

export interface VendorColor {
  vendor?: Vendor,
  vendorName: string,   
  color: string,
  groups: string[],
  imageSrc?: string,
  shopImageIds?: {[key: string]: string},
  altText?: string,
  fileName?: string
}

export interface VendorColorUpdate {
  color?: string,
  groups?: string[],
  imageSrc?: string | null,
  shopImageIds?: {[key: string]: string},
  altText?: string,
  fileName?: string
}

export function parseVendorColor(vendorColorData: any): VendorColor {
  return ({...vendorColorData, shopImageIds: vendorColorData.shopImageIds as VendorColor['shopImageIds']});
}

export async function getVendorColor(vendorName: string, color: string): Promise<VendorColor | null> {
  const vendorColor = await prisma.vendorColor.findFirst({ where: { vendorName, color } });

  if (!vendorColor) {
    return null;
  }

  return parseVendorColor(vendorColor);
}

export async function getVendorColors(): Promise<VendorColor[]> {
  const vendorColors = await prisma.vendorColor.findMany({
    orderBy: { color: "asc" }});

  return vendorColors.map((vendorColor) => parseVendorColor(vendorColor));
}

export async function createVendorColor(vendorName: string, color: string, groups: string[]): Promise<VendorColor> {
  const vendorColor = await prisma.vendorColor.create({ data: { vendorName, color, groups } });

  return parseVendorColor(vendorColor);
}

export async function updateVendorColor(vendorName: string, color: string, vendorColorUpdate: VendorColorUpdate): Promise<VendorColor> {
  const vendorColor = await prisma.vendorColor.update({ where: { colorId: { vendorName, color } }, data: {
      ...vendorColorUpdate
    } });

  return parseVendorColor(vendorColor);
}

export async function updateVendorColorShopImageIds(vendorName: string, shopImageIdUpdates: {color: string, shopImageIds: {[key: string]: string}}[]): Promise<Boolean> {
  shopImageIdUpdates.forEach(async (vendorColor) => {
    await updateVendorColor(vendorName, vendorColor.color, { shopImageIds: vendorColor.shopImageIds });
  });

  return true;
}

export async function deleteVendorColor(vendorName: string, color: string) {
  return await prisma.vendorColor.delete({ where: { colorId: { vendorName, color } } });
}

export function validateVendorColor(data: VendorColor) {
  const errors: {
    title?: string
  } = {};

  if (!data.vendorName) {
    errors.title = "Vendor name required";
  }

  if (!data.color) {
    errors.title = "Color required";
  }

  if (!data.groups) {
    errors.title = "Group(s) required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}

export async function stageColorImage(graphql: GraphQLClient<any>, file: {filename: string, mimeType: string, fileSize: string}) {
  const {filename, mimeType, fileSize} = file;

  const stagedResponse = await graphql(
  `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
            parameters {
            name
            value
          }
        }
      }
    }
  `,
    {
      variables: {
        "input": [
          {
            "filename": filename,
            "mimeType": mimeType,
            "fileSize": fileSize,
            "httpMethod": "POST",
            "resource": "IMAGE"
          }
        ]
      },
    }
  );

  const stagedResponsData = await stagedResponse.json();
  const stagedTarget = stagedResponsData.data.stagedUploadsCreate.stagedTargets[0];

  return ({stagedTarget});
}

export async function uploadColorImage(graphql: GraphQLClient<any>, resourceUrl: string, color: string, altText: string, shop: string) {

  const uploadResponse = await graphql(
  `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          alt
          createdAt
        }
      }
    }
  `,
    {
      variables: {
        "files": {
          "alt": altText,
          "contentType": "IMAGE",
          "originalSource": resourceUrl
        }
      },
    }
  );

  const uploadResponseData = await uploadResponse.json();
  const imageId: string = uploadResponseData.data.fileCreate.files[0].id;

  let statusReady = false;
  let imageSrc = "";

  while (!statusReady) {
    const mediaImageResponse = await graphql(
    `
      query {
        node(id: "${imageId}") {
          id
          ... on MediaImage {
            image {
              id
              url
            }
          }
        }
      }
    `
    );

    const mediaImageResponseData = await mediaImageResponse.json();

    if (mediaImageResponseData.data.node.image) {
      statusReady = true;
      imageSrc = mediaImageResponseData.data.node.image.url;
    }
  }

  return ({imageSrc, imageId, color, altText, shop});
}
