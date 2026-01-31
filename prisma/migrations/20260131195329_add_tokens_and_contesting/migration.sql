-- AlterEnum
ALTER TYPE "RoundStatus" ADD VALUE 'CONTESTING';

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "tokens" INTEGER NOT NULL DEFAULT 0;
