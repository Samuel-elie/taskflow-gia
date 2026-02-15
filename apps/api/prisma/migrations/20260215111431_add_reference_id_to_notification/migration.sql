-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "reference_id" TEXT;

-- CreateIndex
CREATE INDEX "Notification_reference_id_idx" ON "Notification"("reference_id");
