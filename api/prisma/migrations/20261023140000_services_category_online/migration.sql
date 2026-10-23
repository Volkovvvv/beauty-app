-- AlterTable
ALTER TABLE "masters" ADD COLUMN     "address" TEXT,
ADD COLUMN     "instagram" TEXT;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "cost",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT true;

-- Брови и ресницы теперь одна сфера: «lashes» → «brows», без повторов,
-- порядок выбора сохраняется (первая — основная)
UPDATE "masters" m
SET "specialties" = (
  SELECT array_agg(t.id ORDER BY t.ord)
  FROM (
    SELECT CASE WHEN u.id = 'lashes' THEN 'brows' ELSE u.id END AS id, min(u.ord) AS ord
    FROM unnest(m."specialties") WITH ORDINALITY AS u(id, ord)
    GROUP BY 1
  ) t
)
WHERE 'lashes' = ANY(m."specialties");

-- Разделов у услуг раньше не было: ставим основную сферу мастера
UPDATE "services" s
SET "category" = COALESCE(m."specialties"[1], 'other')
FROM "masters" m
WHERE m."id" = s."masterId";
