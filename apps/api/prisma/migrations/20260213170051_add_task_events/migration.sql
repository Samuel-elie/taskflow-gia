-- CreateEnum
CREATE TYPE "TaskEventType" AS ENUM ('CREATED', 'UPDATED', 'ASSIGNED', 'ACKNOWLEDGED', 'CLOSED', 'DESISTED', 'REASSIGNED', 'COMMENTED');

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_task_id_fkey";

-- CreateTable
CREATE TABLE "TaskEvent" (
    "task_event_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "type" "TaskEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("task_event_id")
);

-- CreateIndex
CREATE INDEX "TaskEvent_task_id_idx" ON "TaskEvent"("task_id");

-- CreateIndex
CREATE INDEX "TaskEvent_type_idx" ON "TaskEvent"("type");

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;
