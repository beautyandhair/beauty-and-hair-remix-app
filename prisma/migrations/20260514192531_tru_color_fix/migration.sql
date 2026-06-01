/*
  Warnings:

  - You are about to drop the column `trurColorSrc` on the `VendorColor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VendorColor" DROP COLUMN "trurColorSrc",
ADD COLUMN     "truColorSrc" TEXT;
