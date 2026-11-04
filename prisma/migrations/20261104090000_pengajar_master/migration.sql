-- DropForeignKey
ALTER TABLE `penugasan_pengajar` DROP FOREIGN KEY `penugasan_pengajar_pengajarId_fkey`;

-- DropIndex
DROP INDEX `penugasan_pengajar_pengajarId_fkey` ON `penugasan_pengajar`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `eksternal`,
    MODIFY `peran` ENUM('admin', 'marketing', 'kadep_marketing', 'dps', 'kadep_dps', 'upt') NOT NULL;

-- CreateTable
CREATE TABLE `pengajar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `jabatan` VARCHAR(100) NOT NULL,
    `unitId` INTEGER NULL,
    `eksternal` BOOLEAN NOT NULL DEFAULT false,
    `telepon` VARCHAR(30) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengajar` ADD CONSTRAINT `pengajar_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_pengajar` ADD CONSTRAINT `penugasan_pengajar_pengajarId_fkey` FOREIGN KEY (`pengajarId`) REFERENCES `pengajar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

