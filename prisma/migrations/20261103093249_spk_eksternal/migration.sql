-- CreateTable
CREATE TABLE `unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(8) NOT NULL,
    `nama` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `unit_kode_key`(`kode`),
    UNIQUE INDEX `unit_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `username` VARCHAR(20) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `peran` ENUM('admin', 'marketing', 'kadep_marketing', 'dps', 'kadep_dps', 'upt', 'pengajar') NOT NULL,
    `jabatan` VARCHAR(100) NOT NULL,
    `unitId` INTEGER NULL,
    `eksternal` BOOLEAN NOT NULL DEFAULT false,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(150) NOT NULL,
    `jenis` ENUM('SWASTA', 'BUMN', 'INSTITUSI') NOT NULL,
    `pic` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NULL,
    `telepon` VARCHAR(30) NULL,
    `alamat` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customer_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sla` (
    `status` ENUM('RFQ', 'SILABUS_RAK', 'QUOTATION', 'SPK_DRAF', 'APPROVAL_1', 'APPROVAL_2', 'PERSIAPAN', 'PELAKSANAAN', 'LAPORAN', 'SELESAI', 'DITOLAK', 'BATAL') NOT NULL,
    `hari` SMALLINT NOT NULL,

    PRIMARY KEY (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomorRfq` VARCHAR(30) NOT NULL,
    `customerId` INTEGER NOT NULL,
    `marketingId` INTEGER NOT NULL,
    `jenis` ENUM('TRAINING', 'SERTIFIKASI', 'KOMBINASI', 'KONSULTASI', 'SEWA_RUANG') NOT NULL,
    `judul` VARCHAR(150) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `tglMulai` DATE NOT NULL,
    `tglSelesai` DATE NOT NULL,
    `lokasi` VARCHAR(150) NOT NULL,
    `jumlahPeserta` SMALLINT NULL,
    `detail` JSON NOT NULL,
    `status` ENUM('RFQ', 'SILABUS_RAK', 'QUOTATION', 'SPK_DRAF', 'APPROVAL_1', 'APPROVAL_2', 'PERSIAPAN', 'PELAKSANAAN', 'LAPORAN', 'SELESAI', 'DITOLAK', 'BATAL') NOT NULL DEFAULT 'RFQ',
    `tahapMulai` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pengingatSla` ENUM('RFQ', 'SILABUS_RAK', 'QUOTATION', 'SPK_DRAF', 'APPROVAL_1', 'APPROVAL_2', 'PERSIAPAN', 'PELAKSANAAN', 'LAPORAN', 'SELESAI', 'DITOLAK', 'BATAL') NULL,
    `unitId` INTEGER NULL,
    `alasanTutup` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `order_nomorRfq_key`(`nomorRfq`),
    INDEX `order_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayat_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `olehId` INTEGER NOT NULL,
    `dari` ENUM('RFQ', 'SILABUS_RAK', 'QUOTATION', 'SPK_DRAF', 'APPROVAL_1', 'APPROVAL_2', 'PERSIAPAN', 'PELAKSANAAN', 'LAPORAN', 'SELESAI', 'DITOLAK', 'BATAL') NULL,
    `ke` ENUM('RFQ', 'SILABUS_RAK', 'QUOTATION', 'SPK_DRAF', 'APPROVAL_1', 'APPROVAL_2', 'PERSIAPAN', 'PELAKSANAAN', 'LAPORAN', 'SELESAI', 'DITOLAK', 'BATAL') NOT NULL,
    `catatan` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `silabus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `catatanMarketing` TEXT NULL,
    `tenggat` DATE NOT NULL,
    `diteruskanPada` DATETIME(3) NULL,
    `ringkasan` TEXT NULL,
    `berkas` VARCHAR(255) NULL,
    `dikirimPada` DATETIME(3) NULL,

    UNIQUE INDEX `silabus_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rak_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `uraian` VARCHAR(150) NOT NULL,
    `volume` SMALLINT NOT NULL,
    `satuan` VARCHAR(30) NOT NULL,
    `hargaSatuan` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `nomor` VARCHAR(40) NOT NULL,
    `versi` SMALLINT NOT NULL,
    `nilaiRak` DECIMAL(15, 2) NOT NULL,
    `marginPersen` DECIMAL(7, 2) NOT NULL,
    `nilaiPenawaran` DECIMAL(15, 2) NOT NULL,
    `berlakuSampai` DATE NOT NULL,
    `catatan` TEXT NULL,
    `status` ENUM('DIKIRIM', 'DISETUJUI', 'DITOLAK', 'DIGANTI') NOT NULL DEFAULT 'DIKIRIM',
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `quotation_nomor_key`(`nomor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `jenis` ENUM('PO', 'APPROVAL_QUOTATION') NOT NULL,
    `nomor` VARCHAR(60) NOT NULL,
    `tanggal` DATE NOT NULL,
    `nilai` DECIMAL(15, 2) NOT NULL,
    `lampiran` VARCHAR(255) NULL,

    UNIQUE INDEX `purchase_order_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spk` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `nomor` VARCHAR(40) NULL,
    `ruangLingkup` TEXT NOT NULL,
    `budgetRak` DECIMAL(15, 2) NOT NULL,
    `nilaiKontrak` DECIMAL(15, 2) NOT NULL,
    `catatan` TEXT NULL,
    `approval1Id` INTEGER NULL,
    `approval1Pada` DATETIME(3) NULL,
    `approval2Id` INTEGER NULL,
    `approval2Pada` DATETIME(3) NULL,
    `alasanTolak` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `spk_orderId_key`(`orderId`),
    UNIQUE INDEX `spk_nomor_key`(`nomor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `olehId` INTEGER NOT NULL,
    `mulaiLama` DATE NOT NULL,
    `selesaiLama` DATE NOT NULL,
    `mulaiBaru` DATE NOT NULL,
    `selesaiBaru` DATE NOT NULL,
    `alasan` TEXT NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `penugasan_pengajar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `pengajarId` INTEGER NOT NULL,
    `peran` VARCHAR(60) NOT NULL,
    `status` ENUM('USULAN', 'MENUNGGU', 'BERSEDIA', 'MENOLAK') NOT NULL DEFAULT 'USULAN',
    `alasan` TEXT NULL,
    `nomorSuratTugas` VARCHAR(40) NULL,
    `suratTugasPada` DATETIME(3) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `penugasan_pengajar_nomorSuratTugas_key`(`nomorSuratTugas`),
    UNIQUE INDEX `penugasan_pengajar_orderId_pengajarId_key`(`orderId`, `pengajarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `item` VARCHAR(150) NOT NULL,
    `jumlah` SMALLINT NOT NULL,
    `satuan` VARCHAR(30) NOT NULL,
    `estimasiHarga` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('DIAJUKAN', 'DIPROSES', 'DITERIMA') NOT NULL DEFAULT 'DIAJUKAN',
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fasilitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `jenis` ENUM('RUANG_KELAS', 'LABORATORIUM', 'AULA') NOT NULL,
    `kapasitas` SMALLINT NOT NULL,

    UNIQUE INDEX `fasilitas_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_fasilitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `fasilitasId` INTEGER NOT NULL,
    `mulai` DATE NOT NULL,
    `selesai` DATE NOT NULL,

    UNIQUE INDEX `booking_fasilitas_orderId_fasilitasId_key`(`orderId`, `fasilitasId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `laporan_kegiatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `ringkasan` TEXT NOT NULL,
    `jumlahHadir` SMALLINT NULL,
    `kendala` TEXT NULL,
    `lampiran` VARCHAR(255) NULL,
    `dikirimPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `laporan_kegiatan_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `nomor` VARCHAR(40) NOT NULL,
    `tanggal` DATE NOT NULL,
    `catatan` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bast_orderId_key`(`orderId`),
    UNIQUE INDEX `bast_nomor_key`(`nomor`),
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
ALTER TABLE `users` ADD CONSTRAINT `users_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_marketingId_fkey` FOREIGN KEY (`marketingId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `order_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_order` ADD CONSTRAINT `riwayat_order_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_order` ADD CONSTRAINT `riwayat_order_olehId_fkey` FOREIGN KEY (`olehId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `silabus` ADD CONSTRAINT `silabus_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rak_item` ADD CONSTRAINT `rak_item_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation` ADD CONSTRAINT `quotation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order` ADD CONSTRAINT `purchase_order_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spk` ADD CONSTRAINT `spk_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spk` ADD CONSTRAINT `spk_approval1Id_fkey` FOREIGN KEY (`approval1Id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spk` ADD CONSTRAINT `spk_approval2Id_fkey` FOREIGN KEY (`approval2Id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_log` ADD CONSTRAINT `jadwal_log_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jadwal_log` ADD CONSTRAINT `jadwal_log_olehId_fkey` FOREIGN KEY (`olehId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_pengajar` ADD CONSTRAINT `penugasan_pengajar_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `penugasan_pengajar` ADD CONSTRAINT `penugasan_pengajar_pengajarId_fkey` FOREIGN KEY (`pengajarId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_request` ADD CONSTRAINT `purchase_request_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_fasilitas` ADD CONSTRAINT `booking_fasilitas_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_fasilitas` ADD CONSTRAINT `booking_fasilitas_fasilitasId_fkey` FOREIGN KEY (`fasilitasId`) REFERENCES `fasilitas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `laporan_kegiatan` ADD CONSTRAINT `laporan_kegiatan_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bast` ADD CONSTRAINT `bast_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `notifikasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
