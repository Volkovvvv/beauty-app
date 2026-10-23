-- AlterTable
ALTER TABLE "masters" ADD COLUMN     "workDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5]::INTEGER[];

-- CreateTable
CREATE TABLE "window_edits" (
    "id" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "add" INTEGER[],
    "rem" INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "window_edits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "window_edits_masterId_date_key" ON "window_edits"("masterId", "date");

-- AddForeignKey
ALTER TABLE "window_edits" ADD CONSTRAINT "window_edits_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "masters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- До этой миграции окна и слоты считались по всем дням недели. Уже заведённым
-- кабинетам оставляем так же, чтобы у мастера молча не пропали воскресенья;
-- Пн–Сб — умолчание для новых.
UPDATE "masters" SET "workDays" = ARRAY[0, 1, 2, 3, 4, 5, 6];
