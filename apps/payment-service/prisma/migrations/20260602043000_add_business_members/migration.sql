CREATE TYPE "BusinessRole" AS ENUM (
  'OWNER',
  'ADMIN',
  'FINANCE_MANAGER',
  'ANALYST',
  'VIEWER'
);

CREATE TABLE "BusinessMember" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "BusinessRole" NOT NULL DEFAULT 'VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessMember_businessId_userId_key"
  ON "BusinessMember"("businessId", "userId");

CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");
CREATE INDEX "BusinessMember_userId_idx" ON "BusinessMember"("userId");
CREATE INDEX "BusinessMember_role_idx" ON "BusinessMember"("role");
CREATE INDEX "BusinessMember_createdAt_idx" ON "BusinessMember"("createdAt");

ALTER TABLE "BusinessMember"
  ADD CONSTRAINT "BusinessMember_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
