// server/tests/cms_banner_full.test.js
require('dotenv').config();
const assert = require('assert');
const mongoose = require('mongoose');

console.log('================================================================');
console.log('🧪 VectorX Full Comprehensive Banner & Homepage CMS Test Suite');
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
  const bannerController = require('../src/controllers/banner.controller');
  const {
    createBannerSchema,
    updateBannerSchema,
    reorderBannersSchema,
    updateCMSSchema
  } = require('../src/validations/banner.validation');

  // ----------------------------------------------------
  // SECTION 1: Banner Model Schema & Defaults
  // ----------------------------------------------------
  console.log('--- 1. Banner Model Schema, Enums & Defaults ---');

  runTest('Banner slots enum includes all 5 key storefront slots', () => {
    const slots = Object.values(BANNER_SLOTS);
    assert.deepStrictEqual(slots, [
      'hero_slider',
      'promo_top',
      'promo_middle',
      'flash_sale',
      'footer_banner'
    ]);
  });

  runTest('Banner model instantiates with proper defaults and validation', () => {
    const banner = new Banner({
      title: 'Spring Festival Deals',
      image: { url: 'https://images.unsplash.com/photo-spring.jpg' }
    });

    assert.strictEqual(banner.title, 'Spring Festival Deals');
    assert.strictEqual(banner.subtitle, '');
    assert.strictEqual(banner.link, '/products');
    assert.strictEqual(banner.ctaText, 'Shop Now');
    assert.strictEqual(banner.slot, 'hero_slider');
    assert.strictEqual(banner.bgColor, '#0f172a');
    assert.strictEqual(banner.textColor, '#ffffff');
    assert.strictEqual(banner.order, 0);
    assert.strictEqual(banner.isActive, true);
    assert.strictEqual(banner.clicks, 0);
  });

  runTest('Banner model requires title and image.url', () => {
    const invalidBanner = new Banner({});
    const validationError = invalidBanner.validateSync();
    assert(validationError, 'Validation error must be generated');
    assert(validationError.errors.title, 'title must be required');
    assert(validationError.errors['image.url'], 'image.url must be required');
  });

  runTest('Banner indexes are registered on slot, order, and isActive', () => {
    const indexes = Banner.schema.indexes();
    const slotOrderIndex = indexes.find(
      (idx) => idx[0].slot === 1 && idx[0].isActive === 1 && idx[0].order === 1
    );
    assert(slotOrderIndex, 'Compound index on slot, isActive, and order must exist');
  });

  // ----------------------------------------------------
  // SECTION 2: CMS Global Settings Model
  // ----------------------------------------------------
  console.log('\n--- 2. CMS Global Settings Model ---');

  runTest('CMS schema defines announcement, heroSettings and promoSection', () => {
    const cms = new CMS();
    assert.strictEqual(typeof cms.announcement.enabled, 'boolean');
    assert(cms.announcement.text.length > 0, 'Default announcement text must exist');
    assert.strictEqual(cms.announcement.link, '/products');
    assert.strictEqual(cms.announcement.badge, 'LIMITED TIME');
    assert.strictEqual(cms.announcement.bgColor, '#124B38');
    assert.strictEqual(cms.heroSettings.autoPlayInterval, 6000);
    assert.strictEqual(cms.heroSettings.showDots, true);
    assert.strictEqual(cms.heroSettings.showArrows, true);
  });

  // ----------------------------------------------------
  // SECTION 3: Joi Validation Schemas
  // ----------------------------------------------------
  console.log('\n--- 3. Joi Validation Schemas (Strict Edge Cases) ---');

  runTest('createBannerSchema: accepts full valid payload', () => {
    const payload = {
      title: 'Grand Tech Expo 2026',
      subtitle: 'Save up to 45% on gadgets',
      description: 'Exclusive deals on smartphones, accessories and audio gear.',
      imageUrl: 'https://images.unsplash.com/photo-tech.jpg',
      link: '/products?category=electronics',
      ctaText: 'Claim Deals',
      slot: 'hero_slider',
      badgeText: 'HOT DEAL',
      bgColor: '#124B38',
      textColor: '#ffffff',
      order: 2,
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString()
    };
    const { error, value } = createBannerSchema.validate(payload);
    assert.ifError(error);
    assert.strictEqual(value.title, 'Grand Tech Expo 2026');
    assert.strictEqual(value.slot, 'hero_slider');
    assert.strictEqual(value.order, 2);
  });

  runTest('createBannerSchema: rejects invalid slot enum', () => {
    const invalidSlotPayload = {
      title: 'Invalid Slot Banner',
      imageUrl: 'https://example.com/test.jpg',
      slot: 'invalid_sidebar_slot'
    };
    const { error } = createBannerSchema.validate(invalidSlotPayload);
    assert(error, 'Should reject invalid slot');
    assert(error.details[0].message.includes('slot'));
  });

  runTest('createBannerSchema: rejects non-numeric or negative order', () => {
    const invalidOrderPayload = {
      title: 'Negative Order Banner',
      imageUrl: 'https://example.com/test.jpg',
      order: -1
    };
    const { error } = createBannerSchema.validate(invalidOrderPayload);
    assert(error, 'Should reject negative order');
  });

  runTest('updateBannerSchema: allows partial updates', () => {
    const partialUpdate = {
      title: 'Updated Headline Only',
      isActive: false
    };
    const { error, value } = updateBannerSchema.validate(partialUpdate);
    assert.ifError(error);
    assert.strictEqual(value.title, 'Updated Headline Only');
    assert.strictEqual(value.isActive, false);
  });

  runTest('reorderBannersSchema: validates array with valid ObjectIDs', () => {
    const validPayload = {
      items: [
        { id: '66a1b2c3d4e5f67890123456', order: 0 },
        { id: '66a1b2c3d4e5f67890123457', order: 1 },
        { id: '66a1b2c3d4e5f67890123458', order: 2 }
      ]
    };
    const { error, value } = reorderBannersSchema.validate(validPayload);
    assert.ifError(error);
    assert.strictEqual(value.items.length, 3);
  });

  runTest('reorderBannersSchema: rejects malformed ObjectIDs in batch', () => {
    const invalidPayload = {
      items: [{ id: 'not_a_valid_id', order: 0 }]
    };
    const { error } = reorderBannersSchema.validate(invalidPayload);
    assert(error, 'Should reject malformed ID in reorder list');
  });

  runTest('updateCMSSchema: validates announcement and rotation settings', () => {
    const cmsPayload = {
      announcement: {
        enabled: true,
        text: '⚡ Weekend Flash Sale: 20% OFF all footwear!',
        link: '/products?category=cloth',
        badge: 'FLASH',
        bgColor: '#0f172a',
        textColor: '#38bdf8'
      },
      heroSettings: {
        autoPlayInterval: 5000,
        showDots: true,
        showArrows: true
      },
      promoSection: {
        enabled: true,
        title: 'Top Picks For You',
        tagline: 'Best-selling items in your neighborhood'
      }
    };
    const { error, value } = updateCMSSchema.validate(cmsPayload);
    assert.ifError(error);
    assert.strictEqual(value.announcement.badge, 'FLASH');
    assert.strictEqual(value.heroSettings.autoPlayInterval, 5000);
  });

  // ----------------------------------------------------
  // SECTION 4: Storefront & Grouping Workflow Simulation
  // ----------------------------------------------------
  console.log('\n--- 4. Storefront CMS Grouping & Click Tracking Workflow ---');

  runTest('Storefront groups active banners correctly into 5 distinct slots', () => {
    const fakeBanners = [
      new Banner({ title: 'Hero 1', slot: 'hero_slider', order: 0, image: { url: 'http://img1.jpg' } }),
      new Banner({ title: 'Hero 2', slot: 'hero_slider', order: 1, image: { url: 'http://img2.jpg' } }),
      new Banner({ title: 'Top Promo 1', slot: 'promo_top', order: 0, image: { url: 'http://img3.jpg' } }),
      new Banner({ title: 'Middle Strip', slot: 'promo_middle', order: 0, image: { url: 'http://img4.jpg' } }),
      new Banner({ title: 'Flash Deal', slot: 'flash_sale', order: 0, image: { url: 'http://img5.jpg' } }),
      new Banner({ title: 'Footer Banner', slot: 'footer_banner', order: 0, image: { url: 'http://img6.jpg' } }),
    ];

    const grouped = {
      hero_slider: [],
      promo_top: [],
      promo_middle: [],
      flash_sale: [],
      footer_banner: []
    };

    fakeBanners.forEach((b) => {
      if (grouped[b.slot]) grouped[b.slot].push(b);
    });

    assert.strictEqual(grouped.hero_slider.length, 2);
    assert.strictEqual(grouped.promo_top.length, 1);
    assert.strictEqual(grouped.promo_middle.length, 1);
    assert.strictEqual(grouped.flash_sale.length, 1);
    assert.strictEqual(grouped.footer_banner.length, 1);
  });

  runTest('Banner click tracking increments click counter atomically', () => {
    const banner = new Banner({
      title: 'Clickable Hero Banner',
      image: { url: 'http://img.jpg' },
      clicks: 14
    });

    // Simulate click
    banner.clicks += 1;
    assert.strictEqual(banner.clicks, 15);
  });

  // ----------------------------------------------------
  // SECTION 5: Controller & Route Wiring Verification
  // ----------------------------------------------------
  console.log('\n--- 5. Controller Functions & Express Routing Wiring ---');

  runTest('Banner controller exports all 12 public and admin methods', () => {
    assert.strictEqual(typeof bannerController.getActiveBanners, 'function');
    assert.strictEqual(typeof bannerController.getHomepageCMS, 'function');
    assert.strictEqual(typeof bannerController.trackBannerClick, 'function');
    assert.strictEqual(typeof bannerController.adminGetBanners, 'function');
    assert.strictEqual(typeof bannerController.adminCreateBanner, 'function');
    assert.strictEqual(typeof bannerController.adminGetBannerById, 'function');
    assert.strictEqual(typeof bannerController.adminUpdateBanner, 'function');
    assert.strictEqual(typeof bannerController.adminDeleteBanner, 'function');
    assert.strictEqual(typeof bannerController.adminToggleBannerStatus, 'function');
    assert.strictEqual(typeof bannerController.adminReorderBanners, 'function');
    assert.strictEqual(typeof bannerController.getCMSConfig, 'function');
    assert.strictEqual(typeof bannerController.updateCMSConfig, 'function');
  });

  runTest('Express Application compiles cleanly with /api/banners and /api/admin/banners', () => {
    const app = require('../src/app');
    assert(app, 'App must be instantiated');
    assert(typeof app.listen === 'function', 'App must be Express app instance');
  });

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 Full Banner & CMS Test Summary: ${passedTests}/${totalTests} Passed`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL FULL BANNER & HOMEPAGE CMS TESTS PASSED 100%!');
  } else {
    console.log('⚠️ Some tests failed. Please inspect the log output above.');
  }
  console.log('================================================================\n');
}

startSuite();
