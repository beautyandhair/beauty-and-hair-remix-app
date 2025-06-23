-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "Vendor" (
    "name" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "VendorColor" (
    "vendorName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "imageSrc" TEXT,
    "shopImageIds" JSONB,

    PRIMARY KEY ("vendorName", "color"),
    CONSTRAINT "VendorColor_vendorName_fkey" FOREIGN KEY ("vendorName") REFERENCES "Vendor" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);
