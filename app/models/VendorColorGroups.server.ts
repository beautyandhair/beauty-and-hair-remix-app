import prisma from "../db.server";

const DEFAULT_VENDOR = "Vendor";

export interface VendorColorGroupData {
  vendor: string,
  colors?: unknown,
}

export interface VendorColorGroup {
  vendor: string,
  colors?: {[key: string]: string},
}

export function parseVendorColorGroup(vendorColorGroupData: VendorColorGroupData): VendorColorGroup {
  return ({ vendor: vendorColorGroupData.vendor, colors: vendorColorGroupData.colors as VendorColorGroup['colors'] });
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

  if (vendorColorGroups.length === 0) {
    const defaultVendorGroup = await createUpdateVendorColorGroup('POST', DEFAULT_VENDOR, { vendor: DEFAULT_VENDOR, colors: {} });

    return [defaultVendorGroup];
  }

  return vendorColorGroups.map((vendorColorGroup) => parseVendorColorGroup(vendorColorGroup));
}

export async function deleteVendorColorGroup(vendor: string) {
  return await prisma.vendorColorGroup.delete({ where: { vendor } });
}

export async function createUpdateVendorColorGroup(type: string, vendorId: string, data: VendorColorGroup): Promise<VendorColorGroup> {
  const vendorColorGroup = type === "POST"
    ? await prisma.vendorColorGroup.create({ data })
    : await prisma.vendorColorGroup.update({ where: { vendor: vendorId }, data });

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
