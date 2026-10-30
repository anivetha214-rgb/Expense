-- ===========================================================================
-- FarmPrice AI — MySQL 8 schema (production)
-- ---------------------------------------------------------------------------
-- 1:1 mirror of prisma/schema.mysql.prisma. Import with:
--     mysql -u root -p < database/mysql-schema.sql
--
-- Charset utf8mb4 is REQUIRED so Tamil (தமிழ்) crop/market names are stored
-- correctly. Requires MySQL 8.0+ (DATETIME(3), functional defaults).
-- ===========================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `farmprice`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `farmprice`;

-- ---------------------------------------------------------------------------
-- Market — 10 Tamil Nadu wholesale markets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Market` (
  `id`         VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `nameTa`     VARCHAR(191) NOT NULL,
  `district`   VARCHAR(191) NOT NULL,
  `districtTa` VARCHAR(191) NOT NULL,
  `lat`        DOUBLE       NOT NULL,
  `lng`        DOUBLE       NOT NULL,
  `factor`     DOUBLE       NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Market_district_idx` (`district`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Crop — 12 crops with base price, volatility and perishability
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Crop` (
  `id`         VARCHAR(64)  NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `nameTa`     VARCHAR(191) NOT NULL,
  `category`   VARCHAR(191) NOT NULL,
  `unit`       VARCHAR(191) NOT NULL DEFAULT 'quintal',
  `basePrice`  DOUBLE       NOT NULL,
  `volatility` DOUBLE       NOT NULL,
  `spoilage`   DOUBLE       NOT NULL,
  `months`     VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Crop_category_idx` (`category`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- PriceRecord — daily min / max / modal price (≈ 87,600 seeded rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `PriceRecord` (
  `id`         VARCHAR(191) NOT NULL,
  `cropId`     VARCHAR(64)  NOT NULL,
  `marketId`   VARCHAR(64)  NOT NULL,
  `date`       DATETIME(3)  NOT NULL,
  `minPrice`   DOUBLE       NOT NULL,
  `maxPrice`   DOUBLE       NOT NULL,
  `modalPrice` DOUBLE       NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PriceRecord_cropId_marketId_date_key` (`cropId`, `marketId`, `date`),
  KEY `PriceRecord_cropId_marketId_date_idx` (`cropId`, `marketId`, `date`),
  KEY `PriceRecord_date_idx` (`date`),
  CONSTRAINT `PriceRecord_cropId_fkey`   FOREIGN KEY (`cropId`)   REFERENCES `Crop` (`id`)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PriceRecord_marketId_fkey` FOREIGN KEY (`marketId`) REFERENCES `Market` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Profile — per-device farmer profile
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Profile` (
  `deviceId`  VARCHAR(191) NOT NULL,
  `name`      VARCHAR(191) NOT NULL,
  `phone`     VARCHAR(32)  NULL,
  `district`  VARCHAR(191) NULL,
  `language`  VARCHAR(8)   NOT NULL DEFAULT 'en',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`deviceId`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Alert — ABOVE / BELOW price alerts (evaluated on every live tick)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Alert` (
  `id`          VARCHAR(191) NOT NULL,
  `deviceId`    VARCHAR(191) NOT NULL,
  `cropId`      VARCHAR(64)  NOT NULL,
  `marketId`    VARCHAR(64)  NOT NULL,
  `targetPrice` DOUBLE       NOT NULL,
  `direction`   VARCHAR(8)   NOT NULL,
  `active`      BOOLEAN      NOT NULL DEFAULT TRUE,
  `triggeredAt` DATETIME(3)  NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Alert_deviceId_idx` (`deviceId`),
  KEY `Alert_active_idx` (`active`),
  CONSTRAINT `Alert_cropId_fkey`   FOREIGN KEY (`cropId`)   REFERENCES `Crop` (`id`)   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Alert_marketId_fkey` FOREIGN KEY (`marketId`) REFERENCES `Market` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Notification — bilingual bell inbox entries (ALERT | INFO)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Notification` (
  `id`        VARCHAR(191) NOT NULL,
  `deviceId`  VARCHAR(191) NOT NULL,
  `title`     VARCHAR(191) NOT NULL,
  `body`      TEXT         NOT NULL,
  `type`      VARCHAR(16)  NOT NULL DEFAULT 'ALERT',
  `cropId`    VARCHAR(64)  NULL,
  `marketId`  VARCHAR(64)  NULL,
  `price`     DOUBLE       NULL,
  `read`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_deviceId_createdAt_idx` (`deviceId`, `createdAt`),
  CONSTRAINT `Notification_cropId_fkey`   FOREIGN KEY (`cropId`)   REFERENCES `Crop` (`id`)   ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Notification_marketId_fkey` FOREIGN KEY (`marketId`) REFERENCES `Market` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
