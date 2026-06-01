/*
  Warnings:

  - The primary key for the `VendorColor` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "VendorColor" DROP CONSTRAINT "VendorColor_pkey",
ADD COLUMN     "colorDesc" TEXT,
ADD COLUMN     "colorName" TEXT,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "fiber" TEXT NOT NULL DEFAULT 'Synthetic',
ADD COLUMN     "highlighted" BOOLEAN,
ADD COLUMN     "rooted" BOOLEAN,
ADD COLUMN     "temp" TEXT,
ADD COLUMN     "trurColorSrc" TEXT,
ADD CONSTRAINT "VendorColor_pkey" PRIMARY KEY ("vendorName", "color", "fiber");
