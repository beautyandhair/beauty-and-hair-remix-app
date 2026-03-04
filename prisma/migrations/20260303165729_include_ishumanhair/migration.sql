/*
  Warnings:

  - The primary key for the `VendorColor` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "public"."VendorColor" DROP CONSTRAINT "VendorColor_pkey",
ADD COLUMN     "isHumanHair" BOOLEAN NOT NULL DEFAULT false,
ADD CONSTRAINT "VendorColor_pkey" PRIMARY KEY ("vendorName", "color", "isHumanHair");
