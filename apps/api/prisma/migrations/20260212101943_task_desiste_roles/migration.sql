-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'DESISTE';

-- AlterEnum
ALTER TYPE "WorkspaceRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assignee_id_old" TEXT,
ADD COLUMN     "desist_comment" TEXT,
ADD COLUMN     "desist_date" TIMESTAMP(3),
ADD COLUMN     "desist_reason" TEXT,
ADD COLUMN     "desistor_id" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "global_role" "UserRole" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "Task_assignee_id_old_idx" ON "Task"("assignee_id_old");

-- CreateIndex
CREATE INDEX "Task_desistor_id_idx" ON "Task"("desistor_id");

-- CreateIndex
CREATE INDEX "Task_deadline_idx" ON "Task"("deadline");

-- CreateIndex
CREATE INDEX "User_global_role_idx" ON "User"("global_role");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignee_id_old_fkey" FOREIGN KEY ("assignee_id_old") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_desistor_id_fkey" FOREIGN KEY ("desistor_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
