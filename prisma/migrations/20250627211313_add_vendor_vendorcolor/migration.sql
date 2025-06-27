-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "VendorColor" (
    "vendorName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "groups" JSONB NOT NULL,
    "imageSrc" TEXT,
    "shopImageIds" JSONB,
    "altText" TEXT,
    "fileName" TEXT,

    CONSTRAINT "VendorColor_pkey" PRIMARY KEY ("vendorName","color")
);

-- AddForeignKey
ALTER TABLE "VendorColor" ADD CONSTRAINT "VendorColor_vendorName_fkey" FOREIGN KEY ("vendorName") REFERENCES "Vendor"("name") ON DELETE CASCADE ON UPDATE CASCADE;
