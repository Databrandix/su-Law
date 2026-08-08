-- AlterTable
ALTER TABLE "legal_pages_content" ALTER COLUMN "privacySections" DROP DEFAULT,
ALTER COLUMN "termsSections" DROP DEFAULT;

-- AlterTable
ALTER TABLE "research_paper" ADD COLUMN     "link" TEXT;
