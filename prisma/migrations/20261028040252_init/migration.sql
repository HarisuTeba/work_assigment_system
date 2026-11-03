-- CreateTable
CREATE TABLE `divisi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(6) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `divisi_kode_key`(`kode`),
    UNIQUE INDEX `divisi_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `username` VARCHAR(20) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `peran` ENUM('admin', 'manager', 'spv', 'staff') NOT NULL,
    `jabatan` VARCHAR(100) NOT NULL,
    `divisiId` INTEGER NULL,
    `batasTugasAktif` TINYINT NOT NULL DEFAULT 3,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perintah_kerja` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jenis` ENUM('ISPK', 'SPK') NOT NULL,
    `nomor` VARCHAR(40) NULL,
    `judul` VARCHAR(120) NOT NULL,
    `apa` TEXT NOT NULL,
    `mengapa` TEXT NOT NULL,
    `diMana` TEXT NOT NULL,
    `bagaimana` TEXT NOT NULL,
    `prioritas` ENUM('RENDAH', 'SEDANG', 'TINGGI') NOT NULL,
    `tenggat` DATETIME(3) NOT NULL,
    `status` ENUM('DRAF', 'MENUNGGU_PENGESAHAN', 'DITOLAK', 'DISAHKAN', 'DITURUNKAN') NOT NULL DEFAULT 'DRAF',
    `spvId` INTEGER NOT NULL,
    `divisiId` INTEGER NOT NULL,
    `managerId` INTEGER NULL,
    `diajukanPada` DATETIME(3) NULL,
    `disahkanPada` DATETIME(3) NULL,
    `alasanTolak` TEXT NULL,
    `noPo` VARCHAR(60) NULL,
    `tglPo` DATE NULL,
    `klien` VARCHAR(120) NULL,
    `nilaiPo` DECIMAL(15, 2) NULL,
    `lampiranPo` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `perintah_kerja_nomor_key`(`nomor`),
    INDEX `perintah_kerja_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayat_pengesahan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `perintahId` INTEGER NOT NULL,
    `olehId` INTEGER NOT NULL,
    `aksi` ENUM('DIAJUKAN', 'DISAHKAN', 'DITOLAK', 'DITURUNKAN') NOT NULL,
    `catatan` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `langkah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `perintahId` INTEGER NOT NULL,
    `urutan` SMALLINT NOT NULL,
    `deskripsi` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penugasan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `perintahId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `status` ENUM('MENUNGGU_RESPON', 'MENUNGGU_JAWABAN', 'DITOLAK_STAFF', 'DITERIMA', 'DIKERJAKAN', 'DILAPORKAN', 'REVISI', 'DISETUJUI') NOT NULL DEFAULT 'MENUNGGU_RESPON',
    `terlambat` BOOLEAN NOT NULL DEFAULT false,
    `diAtasKpi` BOOLEAN NOT NULL DEFAULT false,
    `alasanTolak` TEXT NULL,
    `diterimaPada` DATETIME(3) NULL,
    `dilaporkanPada` DATETIME(3) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `penugasan_perintahId_staffId_key`(`perintahId`, `staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pertanyaan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `isi` TEXT NOT NULL,
    `jawaban` TEXT NULL,
    `ditanyaPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dijawabPada` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `action_plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `urutan` SMALLINT NOT NULL,
    `kegiatan` VARCHAR(255) NOT NULL,
    `targetTanggal` DATE NOT NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `selesaiPada` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan_harian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `actionPlanId` INTEGER NULL,
    `kegiatan` TEXT NOT NULL,
    `progres` TINYINT NOT NULL,
    `lampiran` VARCHAR(255) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `laporan_harian_penugasanId_tanggal_key`(`penugasanId`, `tanggal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan_mingguan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `minggu` VARCHAR(8) NOT NULL,
    `ringkasan` TEXT NOT NULL,
    `adaKendala` BOOLEAN NOT NULL,
    `tanggapanSpv` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `laporan_mingguan_penugasanId_minggu_key`(`penugasanId`, `minggu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `laporanMingguanId` INTEGER NOT NULL,
    `problem` TEXT NOT NULL,
    `identifikasi` TEXT NOT NULL,
    `correctiveAction` TEXT NOT NULL,
    `pic` VARCHAR(100) NOT NULL,
    `dueDate` DATE NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `ditutupPada` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan_akhir` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `hasil` TEXT NOT NULL,
    `kendala` TEXT NULL,
    `lampiran` VARCHAR(255) NULL,
    `dikirimPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penugasanId` INTEGER NOT NULL,
    `skorWaktu` TINYINT NOT NULL,
    `skorKualitas` TINYINT NOT NULL,
    `skorKesesuaian` TINYINT NOT NULL,
    `umpanBalik` TEXT NULL,
    `keputusan` ENUM('setujui', 'revisi') NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reward` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penerimaId` INTEGER NOT NULL,
    `pemberiId` INTEGER NOT NULL,
    `penugasanId` INTEGER NULL,
    `jenis` ENUM('otomatis', 'pujian', 'sertifikat') NOT NULL,
    `poin` SMALLINT NOT NULL,
    `pesan` VARCHAR(255) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teguran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penerimaId` INTEGER NOT NULL,
    `pemberiId` INTEGER NOT NULL,
    `tingkat` ENUM('Lisan', 'SP1', 'SP2') NOT NULL,
    `alasan` TEXT NOT NULL,
    `catatanPembinaan` TEXT NOT NULL,
    `dibacaPada` DATETIME(3) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifikasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `pesan` VARCHAR(255) NOT NULL,
    `tautan` VARCHAR(255) NOT NULL,
    `dibaca` BOOLEAN NOT NULL DEFAULT false,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifikasi_userId_dibaca_idx`(`userId`, `dibaca`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_divisiId_fkey` FOREIGN KEY (`divisiId`) REFERENCES `divisi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perintah_kerja` ADD CONSTRAINT `perintah_kerja_spvId_fkey` FOREIGN KEY (`spvId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perintah_kerja` ADD CONSTRAINT `perintah_kerja_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perintah_kerja` ADD CONSTRAINT `perintah_kerja_divisiId_fkey` FOREIGN KEY (`divisiId`) REFERENCES `divisi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_pengesahan` ADD CONSTRAINT `riwayat_pengesahan_perintahId_fkey` FOREIGN KEY (`perintahId`) REFERENCES `perintah_kerja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_pengesahan` ADD CONSTRAINT `riwayat_pengesahan_olehId_fkey` FOREIGN KEY (`olehId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `langkah` ADD CONSTRAINT `langkah_perintahId_fkey` FOREIGN KEY (`perintahId`) REFERENCES `perintah_kerja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan` ADD CONSTRAINT `penugasan_perintahId_fkey` FOREIGN KEY (`perintahId`) REFERENCES `perintah_kerja`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan` ADD CONSTRAINT `penugasan_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `action_plan` ADD CONSTRAINT `action_plan_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_harian` ADD CONSTRAINT `laporan_harian_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_harian` ADD CONSTRAINT `laporan_harian_actionPlanId_fkey` FOREIGN KEY (`actionPlanId`) REFERENCES `action_plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_mingguan` ADD CONSTRAINT `laporan_mingguan_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pica` ADD CONSTRAINT `pica_laporanMingguanId_fkey` FOREIGN KEY (`laporanMingguanId`) REFERENCES `laporan_mingguan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_akhir` ADD CONSTRAINT `laporan_akhir_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluasi` ADD CONSTRAINT `evaluasi_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reward` ADD CONSTRAINT `reward_penerimaId_fkey` FOREIGN KEY (`penerimaId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reward` ADD CONSTRAINT `reward_pemberiId_fkey` FOREIGN KEY (`pemberiId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reward` ADD CONSTRAINT `reward_penugasanId_fkey` FOREIGN KEY (`penugasanId`) REFERENCES `penugasan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teguran` ADD CONSTRAINT `teguran_penerimaId_fkey` FOREIGN KEY (`penerimaId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teguran` ADD CONSTRAINT `teguran_pemberiId_fkey` FOREIGN KEY (`pemberiId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `notifikasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
