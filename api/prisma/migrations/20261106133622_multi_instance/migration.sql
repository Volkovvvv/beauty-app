-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "story_images" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_images_masterId_createdAt_idx" ON "story_images"("masterId", "createdAt");

-- CreateIndex
CREATE INDEX "story_images_expiresAt_idx" ON "story_images"("expiresAt");

-- AddForeignKey
ALTER TABLE "story_images" ADD CONSTRAINT "story_images_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
