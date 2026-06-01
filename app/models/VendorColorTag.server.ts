import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export interface VendorColorTag {
  name: string
}

export async function getVendorColorTags(): Promise<VendorColorTag[]> {
  const vendorColorTags = await prisma.vendorColorTag.findMany({
    orderBy: { name: "asc" }
  });

  return vendorColorTags;
}

export async function createVendorColorTag(tagName: string): Promise<VendorColorTag> {
  return await prisma.vendorColorTag.create({ data: { name: tagName } });
}

export async function createManyVendorColorTags(tagNames: string[]): Promise<Prisma.BatchPayload> {
  const vendorColorTags = tagNames.map((tagName) => ({name: tagName}));

  return await prisma.vendorColorTag.createMany({
    data: vendorColorTags
  });
}

export async function deleteVendorColorTag(tagName: string) {
  return await prisma.vendorColorTag.delete({ where: { name: tagName } });
}
