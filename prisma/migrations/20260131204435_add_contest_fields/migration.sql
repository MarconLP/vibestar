-- AlterTable
ALTER TABLE "GameRound" ADD COLUMN     "contestDeadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RoundGuess" ADD COLUMN     "isContest" BOOLEAN NOT NULL DEFAULT false;
