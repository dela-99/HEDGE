CREATE TYPE "PaymentProvider" AS ENUM (
  'MTN_MOMO',
  'AIRTEL',
  'VODAFONE',
  'ORANGE',
  'BANK_API'
);

CREATE TYPE "LinkedAccountStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED'
);

CREATE TABLE "LinkedAccount" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "status" "LinkedAccountStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LinkedAccount_provider_providerAccountId_key"
  ON "LinkedAccount"("provider", "providerAccountId");

CREATE INDEX "LinkedAccount_merchantId_idx" ON "LinkedAccount"("merchantId");
CREATE INDEX "LinkedAccount_businessId_idx" ON "LinkedAccount"("businessId");
CREATE INDEX "LinkedAccount_provider_idx" ON "LinkedAccount"("provider");
CREATE INDEX "LinkedAccount_status_idx" ON "LinkedAccount"("status");
CREATE INDEX "LinkedAccount_createdAt_idx" ON "LinkedAccount"("createdAt");

ALTER TABLE "LinkedAccount"
  ADD CONSTRAINT "LinkedAccount_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LinkedAccount"
  ADD CONSTRAINT "LinkedAccount_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
