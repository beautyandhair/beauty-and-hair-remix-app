/*
  Warnings:

  - The `groups` column on the `VendorColor` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "VendorColor" DROP COLUMN "groups",
ADD COLUMN     "groups" TEXT[];
