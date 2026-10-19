-- AlterTable
ALTER TABLE "masters" ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Кабинеты, созданные до выбора специализаций, получали маникюрный прайс:
-- считаем их мастерами ногтей и не показываем им выбор заново.
UPDATE "masters" m
SET "specialties" = ARRAY['nails'], "onboardedAt" = m."createdAt"
WHERE EXISTS (SELECT 1 FROM "services" s WHERE s."masterId" = m."id");
