-- AlterEnum
ALTER TYPE "TargetType" ADD VALUE 'USER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
