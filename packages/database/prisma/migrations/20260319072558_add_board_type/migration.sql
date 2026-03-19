-- CreateEnum
CREATE TYPE "BoardType" AS ENUM ('NORMAL', 'MULTI_LEVEL');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "type" "BoardType" NOT NULL DEFAULT 'NORMAL';
