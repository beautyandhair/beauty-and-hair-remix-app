import prisma from "../db.server";

export interface VendorColorGroupData {
  vendor: string,
  colors?: unknown,
}

export interface VendorColorGroup {
  vendor: string,
  colors?: { color: string, group: string }[],
}

export function validColorGroup(colorGroup: any): boolean {
  return colorGroup && typeof colorGroup === 'object' && 'color' in colorGroup && typeof colorGroup.color === 'string' && 'group' in colorGroup && typeof colorGroup.group === 'string'
}

export function parseVendorColorGroup(vendorColorGroupData: VendorColorGroupData): VendorColorGroup {
  const validColors = Array.isArray(vendorColorGroupData.colors) ? vendorColorGroupData.colors.filter((colorGroup) => validColorGroup(colorGroup)) : [];

  return ({ vendor: vendorColorGroupData.vendor, colors: validColors as VendorColorGroup['colors'] });
}

export async function getVendorColorGroup(vendor: string): Promise<VendorColorGroup | null> {
  const vendorColorGroup = await prisma.vendorColorGroup.findFirst({ where: { vendor } });

  if (!vendorColorGroup) {
    return null;
  }

  return parseVendorColorGroup(vendorColorGroup);
}

export async function getVendorColorGroups(): Promise<VendorColorGroup[]> {
  const vendorColorGroups = await prisma.vendorColorGroup.findMany({
    orderBy: { vendor: "desc" },
  });

  if (vendorColorGroups.length === 0) return [];

  return vendorColorGroups.map((vendorColorGroup) => parseVendorColorGroup(vendorColorGroup));
}

export async function deleteVendorColorGroup(vendor: string) {
  return await prisma.vendorColorGroup.delete({ where: { vendor } });
}

export async function createUpdateVendorColorGroup(type: string, data: VendorColorGroup): Promise<VendorColorGroup> {
  const vendorColorGroup = type === "POST"
    ? await prisma.vendorColorGroup.create({ data })
    : await prisma.vendorColorGroup.update({ where: { vendor: data.vendor }, data });

  return parseVendorColorGroup(vendorColorGroup);
}

export function validateVendorColorGroup(data: VendorColorGroup) {
  const errors: {
    title?: string
  } = {};

  if (!data.vendor) {
    errors.title = "Vendor is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
