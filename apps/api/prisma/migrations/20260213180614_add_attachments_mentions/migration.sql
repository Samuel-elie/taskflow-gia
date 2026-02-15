-- CreateTable
CREATE TABLE "Attachment" (
    "attachment_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT,
    "file_size" INTEGER,
    "url" TEXT NOT NULL,
    "storage_key" TEXT,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" SMALLINT NOT NULL DEFAULT 1,
    "deleted" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "CommentMention" (
    "comment_mention_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "mentioned_user_id" TEXT NOT NULL,
    "creation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMention_pkey" PRIMARY KEY ("comment_mention_id")
);

-- CreateIndex
CREATE INDEX "Attachment_task_id_idx" ON "Attachment"("task_id");

-- CreateIndex
CREATE INDEX "Attachment_uploader_id_idx" ON "Attachment"("uploader_id");

-- CreateIndex
CREATE INDEX "CommentMention_mentioned_user_id_idx" ON "CommentMention"("mentioned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CommentMention_comment_id_mentioned_user_id_key" ON "CommentMention"("comment_id", "mentioned_user_id");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
