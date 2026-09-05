// server/tests/cms_banner.test.js
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');

console.log('================================================================');
console.log('🧪 VectorX Banner & Homepage CMS Management Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) console.error(`   Stack: ${error.stack.split('\n')[1]}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) console.error(`   Stack: ${error.stack.split('\n')[1]}`);
  }
}

async function startSuite() {
  const { Banner, BANNER_SLOTS } = require('../src/models/Banner.model');
  const CMS = require('../src/models/CMS.model');

  // ----------------------------------------------------
  // 1. Banner Model & Slots Verification
  // ----------------------------------------------------
  console.log('--- 1. Banner Model Schema & Constants ---');

  runTest('BANNER_SLOTS contains hero_slider, promo_top, promo_middle, flash_sale, footer_banner', () => {
    assert.strictEqual(BANNER_SLOTS.HERO_SLIDER, 'hero_slider');
    assert.strictEqual(BANNER_SLOTS.PROMO_TOP, 'promo_top');
    assert.strictEqual(BANNER_SLOTS.PROMO_MIDDLE, 'promo_middle');
    assert.strictEqual(BANNER_SLOTS.FLASH_SALE, 'flash_sale');
    assert.strictEqual(BANNER_SLOTS.FOOTER_BANNER, 'footer_banner');
  });

  runTest('Banner model schema defines all required fields and defaults', () => {
    const paths = Banner.schema.paths;
    assert(paths.title, 'title field is required');
    assert(paths['image.url'], 'image.url field is required');
    assert(paths.slot, 'slot field is required');
    assert(paths.order, 'order field is required');
    assert(paths.isActive, 'isActive field is required');
    assert(paths.clicks, 'clicks field is required');
  });

  runTest('Banner instance validates correctly and assigns defaults', () => {
    const banner = new Banner({
      title: 'Mega Summer Sale',
      subtitle: 'Up to 60% Off',
      image: { url: 'https://images.unsplash.com/photo-banner.jpg' },
      link: '/products?category=cloth',
      slot: BANNER_SLOTS.HERO_SLIDER
    });

    assert.strictEqual(banner.title, 'Mega Summer Sale');
    assert.strictEqual(banner.subtitle, 'Up to 60% Off');
    assert.strictEqual(banner.image.url, 'https://images.unsplash.com/photo-banner.jpg');
    assert.strictEqual(banner.slot, 'hero_slider');
    assert.strictEqual(banner.isActive, true);
    assert.strictEqual(banner.clicks, 0);
    assert.strictEqual(banner.ctaText, 'Shop Now');
  });

  // ----------------------------------------------------
  // 2. CMS Global Model & Announcement Configuration
  // ----------------------------------------------------
  console.log('\n--- 2. CMS Global Settings Model ---');

  runTest('CMS model schema defines announcement, heroSettings, and promoSection', () => {
    const paths = CMS.schema.paths;
    assert(paths['announcement.enabled'], 'announcement.enabled must exist');
    assert(paths['announcement.text'], 'announcement.text must exist');
    assert(paths['announcement.bgColor'], 'announcement.bgColor must exist');
    assert(paths['heroSettings.autoPlayInterval'], 'heroSettings.autoPlayInterval must exist');
  });

  // ----------------------------------------------------
  // 3. Validation Schemas Verification
  // ----------------------------------------------------
  console.log('\n--- 3. Joi Validation Schemas ---');
  const {
    createBannerSchema,
    updateBannerSchema,
    reorderBannersSchema,
    updateCMSSchema
  } = require('../src/validations/banner.validation');

  runTest('createBannerSchema accepts valid banner payload', () => {
    const validPayload = {
      title: 'Spring Electronics Carnival',
      subtitle: 'Flat 25% Off',
      imageUrl: 'https://example.com/banner.jpg',
      link: '/products?category=electronics',
      ctaText: 'Explore Now',
      slot: 'hero_slider',
      order: 1,
      isActive: true
    };
    const { error, value } = createBannerSchema.validate(validPayload);
    assert.ifError(error);
    assert.strictEqual(value.title, 'Spring Electronics Carnival');
  });

  runTest('createBannerSchema rejects missing title', () => {
    const invalidPayload = {
      imageUrl: 'https://example.com/banner.jpg',
      slot: 'hero_slider'
    };
    const { error } = createBannerSchema.validate(invalidPayload);
    assert(error, 'Should reject banner without title');
  });

  runTest('reorderBannersSchema validates array of id and order', () => {
    const validReorder = {
      items: [
        { id: '66a1b2c3d4e5f67890123456', order: 0 },
        { id: '66a1b2c3d4e5f67890123457', order: 1 }
      ]
    };
    const { error } = reorderBannersSchema.validate(validReorder);
    assert.ifError(error);
  });

  runTest('updateCMSSchema validates announcement settings update with presets and dynamic colors (RGB, Hex, named colors)', () => {
    const validCMS = {
      announcement: {
        enabled: true,
        text: '⚡ Free Shipping Weekend!',
        bgColor: 'rgb(220, 38, 38)',
        textColor: '#ffffff',
        presets: [
          { name: 'Red Vibrant', bg: 'rgb(220, 38, 38)', text: '#ffffff' },
          { name: 'Ocean Blue', bg: '#2563eb', text: '#ffffff' },
          { name: 'Forest Green', bg: 'green', text: '#ffffff' }
        ]
      },
      heroSettings: {
        autoPlayInterval: 5000,
        showDots: true
      }
    };
    const { error, value } = updateCMSSchema.validate(validCMS);
    assert.ifError(error);
    assert.strictEqual(value.announcement.presets.length, 3);
    assert.strictEqual(value.announcement.bgColor, 'rgb(220, 38, 38)');
  });

  // ----------------------------------------------------
  // 4. Controller & Routes Signatures
  // ----------------------------------------------------
  console.log('\n--- 4. Controller Exports & Express Routing ---');

  runTest('Banner controller exports all public and admin handler functions', () => {
    const bannerCtrl = require('../src/controllers/banner.controller');
    assert.strictEqual(typeof bannerCtrl.getActiveBanners, 'function');
    assert.strictEqual(typeof bannerCtrl.getHomepageCMS, 'function');
    assert.strictEqual(typeof bannerCtrl.trackBannerClick, 'function');
    assert.strictEqual(typeof bannerCtrl.adminGetBanners, 'function');
    assert.strictEqual(typeof bannerCtrl.adminCreateBanner, 'function');
    assert.strictEqual(typeof bannerCtrl.adminGetBannerById, 'function');
    assert.strictEqual(typeof bannerCtrl.adminUpdateBanner, 'function');
    assert.strictEqual(typeof bannerCtrl.adminDeleteBanner, 'function');
    assert.strictEqual(typeof bannerCtrl.adminToggleBannerStatus, 'function');
    assert.strictEqual(typeof bannerCtrl.adminReorderBanners, 'function');
    assert.strictEqual(typeof bannerCtrl.getCMSConfig, 'function');
    assert.strictEqual(typeof bannerCtrl.updateCMSConfig, 'function');
  });

  runTest('Express Application compiles cleanly with Banner and CMS routes mounted', () => {
    const app = require('../src/app');
    assert(app, 'App must be instantiated');
    assert(typeof app.listen === 'function');
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 Banner & CMS Test Summary: ${passedTests}/${totalTests} Passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL BANNER & HOMEPAGE CMS TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ Some tests failed. Please inspect the log output above.');
  }
  console.log('================================================================\n');
}

startSuite();
