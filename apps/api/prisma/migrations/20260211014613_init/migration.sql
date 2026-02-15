-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DOING', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspace_member_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspace_member_id")
);

-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workspace_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "Task" (
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "comment_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" SMALLINT NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "refresh_token_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "revoked" SMALLINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updator_id" TEXT,
    "updator_name" TEXT,
    "last_update_date" TIMESTAMP(3) NOT NULL,
    "deletor_id" TEXT,
    "deletor_name" TEXT,
    "deleted_date" TIMESTAMP(3),
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("refresh_token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Workspace_name_idx" ON "Workspace"("name");

-- CreateIndex
CREATE INDEX "WorkspaceMember_user_id_idx" ON "WorkspaceMember"("user_id");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspace_id_idx" ON "WorkspaceMember"("workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceMember_role_idx" ON "WorkspaceMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspace_id_user_id_key" ON "WorkspaceMember"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "Project_owner_id_idx" ON "Project"("owner_id");

-- CreateIndex
CREATE INDEX "Project_workspace_id_idx" ON "Project"("workspace_id");

-- CreateIndex
CREATE INDEX "Task_project_id_idx" ON "Task"("project_id");

-- CreateIndex
CREATE INDEX "Task_assignee_id_idx" ON "Task"("assignee_id");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Comment_task_id_idx" ON "Comment"("task_id");

-- CreateIndex
CREATE INDEX "Comment_user_id_idx" ON "Comment"("user_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
