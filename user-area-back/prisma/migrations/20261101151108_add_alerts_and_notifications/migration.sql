-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertAudience" AS ENUM ('USERS', 'ALL', 'STUDENTS', 'STAFF');

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "audience" "AlertAudience" NOT NULL DEFAULT 'USERS',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_recipients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alertId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_createdById_idx" ON "alerts"("createdById");

-- CreateIndex
CREATE INDEX "alert_recipients_userId_readAt_idx" ON "alert_recipients"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "alert_recipients_alertId_userId_key" ON "alert_recipients"("alertId", "userId");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_recipients" ADD CONSTRAINT "alert_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
