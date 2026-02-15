-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "workspace_invite_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_by_user_id" TEXT,
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

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("workspace_invite_id")
);

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspace_id_idx" ON "WorkspaceInvite"("workspace_id");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_status_idx" ON "WorkspaceInvite"("status");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_expires_at_idx" ON "WorkspaceInvite"("expires_at");

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
