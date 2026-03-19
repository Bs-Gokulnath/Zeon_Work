-- CreateTable
CREATE TABLE "item_updates" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_updates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "item_updates" ADD CONSTRAINT "item_updates_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
