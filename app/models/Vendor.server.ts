import prisma from "../db.server";
import { parseVendorColor, VendorColor } from "./VendorColor.server";


const DEFAULT_VENDOR = "Vendor";

export interface Vendor {
  name: string,
  colors?: VendorColor[]
}

export async function getVendor(vendorName: string): Promise<Vendor | null> {
  const vendor = await prisma.vendor.findFirst({
    where: { name: vendorName },
    include: {
      colors: true
    }
  });

  if (!vendor) {
    return null;
  }
  return ({...vendor, colors: vendor.colors.map((color) => parseVendorColor(color))});
}

export async function getVendors(): Promise<Vendor[]> {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" },
    include: {
      colors: true
    }
  });

  if (vendors.length === 0) {
    const defaultVendor = await createVendor(DEFAULT_VENDOR);

    return [defaultVendor];
  }

  return vendors.map((vendor) => ({
    ...vendor,
    colors: vendor.colors.map((color) => parseVendorColor(color))
  }));
}

export async function createVendor(vendorName: string): Promise<Vendor> {
  const vendor = await prisma.vendor.create({ data: { name: vendorName } })

  return vendor;
}

export async function updateVendor(vendorName: string, vendorUpdate: Vendor): Promise<Vendor> {
  const vendor = await prisma.vendor.update({ where: { name: vendorName }, data: { name: vendorUpdate.name } });

  return vendor;
}

export async function deleteVendor(vendorName: string) {
  return await prisma.vendor.delete({ where: { name: vendorName } });
}

export function validateVendor(data: Vendor) {
  const errors: string[] = [];

  if (!data.name) {
    errors.push('No vendor name');
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}
