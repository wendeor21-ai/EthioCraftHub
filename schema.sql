-- ==============================================================================
-- EthioCraft Global (EthioCraftHub) - Master MySQL Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, and cPanel phpMyAdmin
-- Character Set: utf8mb4 (Full Amharic / Ethiopic script & Emoji support)
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Table: users
-- Core accounts (Customers, Artisans, Admins, Support, Moderators)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(24) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `googleId` VARCHAR(191) NULL,
    `authProvider` VARCHAR(191) NOT NULL DEFAULT 'local',
    `role` VARCHAR(191) NOT NULL,
    `profile` JSON NOT NULL,
    `verification` JSON NULL,
    `preferences` JSON NOT NULL,
    `wishlist` JSON NOT NULL,
    `cart` JSON NOT NULL,
    `shippingAddresses` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `hasAcceptedGuidelines` BOOLEAN NOT NULL DEFAULT false,
    `tempPasswordExpiry` DATETIME(3) NULL,
    `flags` JSON NOT NULL,
    `alerts` JSON NOT NULL,
    `lastLogin` DATETIME(3) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockUntil` DATETIME(3) NULL,
    `bankDetails` JSON NULL,
    `notificationPreferences` JSON NULL,
    `storeSettings` JSON NULL,
    `shippingSettings` JSON NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lastPasswordChange` DATETIME(3) NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `passwordResetToken` VARCHAR(191) NULL,
    `passwordResetExpires` DATETIME(3) NULL,
    `unpaidCommission` DOUBLE NOT NULL DEFAULT 0,
    `paidCommission` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_googleId_key`(`googleId`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: products
-- Artisan handcrafted catalog with AI tags and embeddings
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
    `id` VARCHAR(24) NOT NULL,
    `brandName` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `shortDescription` TEXT NULL,
    `slug` VARCHAR(191) NULL,
    `originRegion` VARCHAR(191) NULL,
    `originZone` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `materials` TEXT NOT NULL DEFAULT '',
    `dimensions` TEXT NOT NULL DEFAULT '',
    `craftingTime` INTEGER NOT NULL DEFAULT 0,
    `story` TEXT NOT NULL DEFAULT '',
    `careInstructions` TEXT NOT NULL DEFAULT '',
    `weight` DOUBLE NOT NULL DEFAULT 0,
    `videoUrl` TEXT NULL,
    `subcategory` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'ETB',
    `artisanId` VARCHAR(191) NOT NULL,
    `images` JSON NOT NULL,
    `culturalStory` JSON NULL,
    `specifications` JSON NULL,
    `inventory` JSON NULL,
    `aiTags` JSON NOT NULL,
    `culturalTags` JSON NOT NULL,
    `variations` JSON NOT NULL,
    `options` JSON NOT NULL,
    `metrics` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NOT NULL,
    `reviews` JSON NOT NULL,
    `promotionActive` BOOLEAN NOT NULL DEFAULT false,
    `promotionId` VARCHAR(191) NULL,
    `discountPrice` DOUBLE NULL,
    `seo` JSON NULL,
    `shipping` JSON NULL,
    `imageFeatureVector` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_category_status_idx`(`category`, `status`),
    INDEX `products_artisanId_idx`(`artisanId`),
    INDEX `products_createdAt_idx`(`createdAt`),
    INDEX `products_status_idx`(`status`),
    INDEX `products_featured_status_idx`(`featured`, `status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: orders
-- Customer orders, Chapa & COD payments, shipping milestones
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
    `id` VARCHAR(24) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `artisanId` VARCHAR(191) NULL,
    `cartId` VARCHAR(191) NULL,
    `items` JSON NOT NULL,
    `totals` JSON NOT NULL,
    `shippingAddress` JSON NOT NULL,
    `payment` JSON NOT NULL,
    `shipping` JSON NULL,
    `communication` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `payoutStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `commissionStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `statusHistory` JSON NOT NULL,
    `notes` TEXT NULL,
    `cancelReason` TEXT NULL,
    `isDisputed` BOOLEAN NOT NULL DEFAULT false,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `photos` JSON NULL,
    `debtRecorded` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `orders_orderNumber_key`(`orderNumber`),
    INDEX `orders_customerId_createdAt_idx`(`customerId`, `createdAt`),
    INDEX `orders_artisanId_idx`(`artisanId`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: custom_orders
-- Bespoke craft inquiries, measurements, and milestone agreements
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `custom_orders`;
CREATE TABLE `custom_orders` (
    `id` VARCHAR(24) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `artisanId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NOT NULL,
    `itemType` VARCHAR(191) NOT NULL,
    `measurements` JSON NULL,
    `photos` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `commission` DOUBLE NOT NULL DEFAULT 0,
    `artisanEarning` DOUBLE NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'None',
    `transactionId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `adminNotes` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `custom_orders_customerId_idx`(`customerId`),
    INDEX `custom_orders_artisanId_idx`(`artisanId`),
    INDEX `custom_orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: promotions
-- Artisan discounts, flash sales, and coupon codes
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
    `id` VARCHAR(24) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `artisanId` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` DOUBLE NOT NULL,
    `couponCode` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL DEFAULT 'all',
    `urgencyBadge` BOOLEAN NOT NULL DEFAULT false,
    `badgeText` VARCHAR(191) NOT NULL DEFAULT 'Limited Time Offer',
    `minOrderValue` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `analytics` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `promotions_couponCode_key`(`couponCode`),
    INDEX `promotions_artisanId_status_idx`(`artisanId`, `status`),
    INDEX `promotions_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: promotion_products
-- Many-to-Many mapping between promotions and discounted products
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `promotion_products`;
CREATE TABLE `promotion_products` (
    `promotionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`promotionId`, `productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: messages
-- User support tickets, artisan inquiries, and admin replies
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
    `id` VARCHAR(24) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NULL,
    `senderRole` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'New',
    `adminResponse` TEXT NOT NULL DEFAULT '',
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: earnings
-- Artisan trade ledger, withdrawals, and fee calculations
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `earnings`;
CREATE TABLE `earnings` (
    `id` VARCHAR(24) NOT NULL,
    `artisanId` VARCHAR(191) NOT NULL,
    `transactionType` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `platformFee` DOUBLE NOT NULL DEFAULT 0,
    `netAmount` DOUBLE NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `withdrawalMethod` VARCHAR(191) NULL,
    `withdrawalStatus` VARCHAR(191) NULL,
    `withdrawalAccountDetails` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `description` TEXT NULL,
    `processedById` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `earnings_artisanId_createdAt_idx`(`artisanId`, `createdAt`),
    INDEX `earnings_transactionType_status_idx`(`transactionType`, `status`),
    INDEX `earnings_withdrawalStatus_idx`(`withdrawalStatus`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table: commission_payments
-- Artisan commission payoff receipts submitted for admin verification
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `commission_payments`;
CREATE TABLE `commission_payments` (
    `id` VARCHAR(24) NOT NULL,
    `artisanId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `receiptImage` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending admin approval',
    `orderIds` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Table: commission_payment_orders
-- Many-to-Many junction linking commission payments to settled orders
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `commission_payment_orders`;
CREATE TABLE `commission_payment_orders` (
    `commissionPaymentId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`commissionPaymentId`, `orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Table: withdrawal_audit_logs
-- Immutable audit trail for artisan bank withdrawal payouts
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `withdrawal_audit_logs`;
CREATE TABLE `withdrawal_audit_logs` (
    `id` VARCHAR(24) NOT NULL,
    `earningId` VARCHAR(191) NOT NULL,
    `artisanId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `previousStatus` VARCHAR(191) NULL,
    `newStatus` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `withdrawal_audit_logs_earningId_createdAt_idx`(`earningId`, `createdAt`),
    INDEX `withdrawal_audit_logs_artisanId_createdAt_idx`(`artisanId`, `createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Table: user_interactions
-- User behavioral interactions for AI recommendation engine
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_interactions`;
CREATE TABLE `user_interactions` (
    `id` VARCHAR(24) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `interactionType` VARCHAR(191) NOT NULL,
    `duration` DOUBLE NULL,
    `quantity` INTEGER NULL,
    `metadata` JSON NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `user_interactions_userId_idx`(`userId`),
    INDEX `user_interactions_productId_idx`(`productId`),
    INDEX `user_interactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Table: ai_chat_logs
-- Zema AI conversation logs, safety sanitization, and review flags
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `ai_chat_logs`;
CREATE TABLE `ai_chat_logs` (
    `id` VARCHAR(24) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userEmail` VARCHAR(191) NULL,
    `userRole` VARCHAR(191) NOT NULL DEFAULT 'anonymous',
    `userQuery` TEXT NOT NULL,
    `sanitizedQuery` TEXT NOT NULL,
    `aiResponse` TEXT NOT NULL DEFAULT '',
    `conversationContext` VARCHAR(191) NOT NULL DEFAULT 'general',
    `productId` VARCHAR(191) NULL,
    `containsSensitiveData` BOOLEAN NOT NULL DEFAULT false,
    `sanitizationApplied` BOOLEAN NOT NULL DEFAULT false,
    `flaggedForReview` BOOLEAN NOT NULL DEFAULT false,
    `responseTime` DOUBLE NULL,
    `tokenCount` INTEGER NULL,
    `sessionId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    INDEX `ai_chat_logs_createdAt_idx`(`createdAt`),
    INDEX `ai_chat_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ai_chat_logs_flaggedForReview_createdAt_idx`(`flaggedForReview`, `createdAt`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Table: alert_logs
-- System security, rate-limiting, and error alerts
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `alert_logs`;
CREATE TABLE `alert_logs` (
    `id` VARCHAR(24) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'info',
    `details` JSON NULL,
    `to` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 15. Table: site_configs
-- Multilingual homepage CMS, banner sliders, and commission rates
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `site_configs`;
CREATE TABLE `site_configs` (
    `id` VARCHAR(24) NOT NULL,
    `configType` VARCHAR(191) NOT NULL DEFAULT 'homepage',
    `heroSlides` JSON NOT NULL,
    `heritageTitle_en` VARCHAR(191) NULL,
    `heritageTitle_am` VARCHAR(191) NULL,
    `heritageTitle_or` VARCHAR(191) NULL,
    `heritageTitle_ti` VARCHAR(191) NULL,
    `heritageDescription_en` TEXT NULL,
    `heritageDescription_am` TEXT NULL,
    `heritageDescription_or` TEXT NULL,
    `heritageDescription_ti` TEXT NULL,
    `heritageImage` VARCHAR(191) NULL,
    `headerLogo` VARCHAR(191) NULL,
    `footerLogo` VARCHAR(191) NULL,
    `commissionRate` DOUBLE NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `site_configs_configType_key`(`configType`),
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Table: notification_settings
-- Admin email alert preferences and dispatch intervals
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `notification_settings`;
CREATE TABLE `notification_settings` (
    `id` VARCHAR(24) NOT NULL,
    `adminUserId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `enabledAlerts` JSON NULL,
    `lastNotifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Foreign Key Constraints
-- Enforces referential integrity across relational entities
-- ==============================================================================

-- Products
ALTER TABLE `products` 
    ADD CONSTRAINT `products_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `products_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Orders
ALTER TABLE `orders` 
    ADD CONSTRAINT `orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `orders_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom Orders
ALTER TABLE `custom_orders` 
    ADD CONSTRAINT `custom_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `custom_orders_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `custom_orders_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Promotions
ALTER TABLE `promotions` 
    ADD CONSTRAINT `promotions_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Promotion Products (Junction)
ALTER TABLE `promotion_products` 
    ADD CONSTRAINT `promotion_products_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `promotion_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Messages
ALTER TABLE `messages` 
    ADD CONSTRAINT `messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `messages_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Earnings
ALTER TABLE `earnings` 
    ADD CONSTRAINT `earnings_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `earnings_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `earnings_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `earnings_processedById_fkey` FOREIGN KEY (`processedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Commission Payments
ALTER TABLE `commission_payments` 
    ADD CONSTRAINT `commission_payments_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Commission Payment Orders (Junction)
ALTER TABLE `commission_payment_orders` 
    ADD CONSTRAINT `commission_payment_orders_commissionPaymentId_fkey` FOREIGN KEY (`commissionPaymentId`) REFERENCES `commission_payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `commission_payment_orders_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Withdrawal Audit Logs
ALTER TABLE `withdrawal_audit_logs` 
    ADD CONSTRAINT `withdrawal_audit_logs_earningId_fkey` FOREIGN KEY (`earningId`) REFERENCES `earnings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `withdrawal_audit_logs_artisanId_fkey` FOREIGN KEY (`artisanId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `withdrawal_audit_logs_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- User Interactions
ALTER TABLE `user_interactions` 
    ADD CONSTRAINT `user_interactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `user_interactions_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AI Chat Logs
ALTER TABLE `ai_chat_logs` 
    ADD CONSTRAINT `ai_chat_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `ai_chat_logs_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `ai_chat_logs_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification Settings
ALTER TABLE `notification_settings` 
    ADD CONSTRAINT `notification_settings_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ==============================================================================
-- Initial Seed Data: Master Admin, Sample Artisan, and Customer Credentials
-- ==============================================================================

-- 1. Master Administrator Account
-- Email: admin@ethiocraft.com
-- Password: Admin123!
INSERT INTO `users` (
    `id`,
    `email`,
    `password`,
    `authProvider`,
    `role`,
    `profile`,
    `preferences`,
    `wishlist`,
    `cart`,
    `shippingAddresses`,
    `isActive`,
    `isVerified`,
    `isFlagged`,
    `mustChangePassword`,
    `hasAcceptedGuidelines`,
    `flags`,
    `alerts`,
    `createdAt`,
    `updatedAt`
) VALUES (
    '000000000000000000000001',
    'admin@ethiocraft.com',
    '$2a$12$jGxNSSAV95FPZKkGROjxduPP.NqPfk9XM53Pa7m8PL6IqiZUFuYZm',
    'local',
    'admin',
    JSON_OBJECT(
        'firstName', 'EthioCraft',
        'lastName', 'Administrator',
        'displayName', 'EthioCraft Admin',
        'phone', '+251911234567',
        'bio', 'Platform Master Administrator for EthioCraft Global marketplace'
    ),
    JSON_OBJECT('theme', 'system', 'language', 'en'),
    JSON_ARRAY(),
    JSON_ARRAY(),
    JSON_ARRAY(),
    true,
    true,
    false,
    false,
    true,
    JSON_ARRAY(),
    JSON_ARRAY(),
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE 
    `password` = VALUES(`password`),
    `role` = 'admin',
    `isActive` = true,
    `isVerified` = true,
    `updatedAt` = NOW(3);

-- 2. Verified Master Artisan Account
-- Email: artisan@test.com
-- Password: Artisan123!
INSERT INTO `users` (
    `id`,
    `email`,
    `password`,
    `authProvider`,
    `role`,
    `profile`,
    `verification`,
    `preferences`,
    `wishlist`,
    `cart`,
    `shippingAddresses`,
    `isActive`,
    `isVerified`,
    `isFlagged`,
    `mustChangePassword`,
    `hasAcceptedGuidelines`,
    `flags`,
    `alerts`,
    `createdAt`,
    `updatedAt`
) VALUES (
    '000000000000000000000002',
    'artisan@test.com',
    '$2a$12$18pfnjEzDtl/KzBPAlJaPuH29knwPfW7LxO/lH2GLAbb.QSzmquCK',
    'local',
    'artisan',
    JSON_OBJECT(
        'firstName', 'Almaz',
        'lastName', 'Kebede',
        'displayName', 'Almaz Traditional Weaving',
        'phone', '+251922222222',
        'bio', 'Master traditional Habesha Tibeb weaver with over 15 years of experience in Addis Ababa and Gondar styles.',
        'culturalBackground', 'Traditional Ethiopian textile weaving from Addis Ababa and Gojjam',
        'specialties', JSON_ARRAY('Textiles', 'Traditional Weaving', 'Netela', 'Gabi', 'Tibeb')
    ),
    JSON_OBJECT(
        'status', 'approved',
        'submittedAt', NOW(3),
        'reviewedAt', NOW(3)
    ),
    JSON_OBJECT('theme', 'system', 'language', 'am'),
    JSON_ARRAY(),
    JSON_ARRAY(),
    JSON_ARRAY(),
    true,
    true,
    false,
    false,
    true,
    JSON_ARRAY(),
    JSON_ARRAY(),
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE 
    `password` = VALUES(`password`),
    `role` = 'artisan',
    `isActive` = true,
    `isVerified` = true,
    `updatedAt` = NOW(3);

-- 3. Sample Customer Account
-- Email: customer@test.com
-- Password: Customer123!
INSERT INTO `users` (
    `id`,
    `email`,
    `password`,
    `authProvider`,
    `role`,
    `profile`,
    `preferences`,
    `wishlist`,
    `cart`,
    `shippingAddresses`,
    `isActive`,
    `isVerified`,
    `isFlagged`,
    `mustChangePassword`,
    `hasAcceptedGuidelines`,
    `flags`,
    `alerts`,
    `createdAt`,
    `updatedAt`
) VALUES (
    '000000000000000000000003',
    'customer@test.com',
    '$2a$12$pvs5HSK/Vqg6jbKpt2DcEeocgp1r0/ku3dW8qM2.0w4W360l3Ds66',
    'local',
    'customer',
    JSON_OBJECT(
        'firstName', 'Yared',
        'lastName', 'Tesfaye',
        'displayName', 'Yared T.',
        'phone', '+251911111111',
        'bio', 'Passionate collector of authentic Ethiopian handicrafts and handmade jewelry.'
    ),
    JSON_OBJECT('theme', 'system', 'language', 'en'),
    JSON_ARRAY(),
    JSON_ARRAY(),
    JSON_ARRAY(),
    true,
    true,
    false,
    false,
    true,
    JSON_ARRAY(),
    JSON_ARRAY(),
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE 
    `password` = VALUES(`password`),
    `role` = 'customer',
    `isActive` = true,
    `updatedAt` = NOW(3);

-- 4. Default Homepage Site Configuration (CMS & Branding)
INSERT INTO `site_configs` (
    `id`,
    `configType`,
    `heroSlides`,
    `heritageTitle_en`,
    `heritageTitle_am`,
    `heritageDescription_en`,
    `heritageDescription_am`,
    `commissionRate`,
    `createdAt`,
    `updatedAt`
) VALUES (
    '000000000000000000000010',
    'homepage',
    JSON_ARRAY(
        JSON_OBJECT(
            'image', '/images/traditional_textiles.jpg',
            'title', 'Authentic Ethiopian Heritage Crafts',
            'subtitle', 'Handwoven textiles, pure leather, and traditional jewelry directly from verified Ethiopian artisans.',
            'buttonText', 'Explore Collection',
            'buttonLink', '/products'
        )
    ),
    'Preserving Ethiopian Cultural Heritage',
    'የኢትዮጵያን ባህላዊ ቅርሶች መጠበቅ እና ማስተዋወቅ',
    'Connecting master artisans from across Ethiopia with global markets, preserving centuries of cultural craftsmanship.',
    'የኢትዮጵያን ባህላዊ የእጅ ጥበብ ውጤቶች ከሀገር ውስጥ እና ከዓለም አቀፍ ገበያ ጋር በማገናኘት ባህላችንን እናስጠብቃለን።',
    5.0,
    NOW(3),
    NOW(3)
) ON DUPLICATE KEY UPDATE `updatedAt` = NOW(3);

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- End of EthioCraft Global Schema Definition
-- ==============================================================================

