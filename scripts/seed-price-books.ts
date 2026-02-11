import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Official HRM8 Global Pricing Structure
 * Creates 6 regional price books with all pricing tiers
 */

interface PriceBookData {
  code: string;
  name: string;
  pricing_peg: string;
  billing_currency: string;
  products: ProductPricing[];
}

interface ProductPricing {
  code: string;
  name: string;
  category: string;
  price: number;
  salary_band_min?: number;
  salary_band_max?: number;
  band_name?: string;
}

// Official Pricing Data from HRM8 Global Pricing Structure
const priceBooks: PriceBookData[] = [
  // USD Global Pricing
  {
    code: 'PRICE_USD_GLOBAL_2026Q1',
    name: 'USD Global Pricing - 2026 Q1',
    pricing_peg: 'USD',
    billing_currency: 'USD',
    products: [
      // Subscriptions
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 195 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 295 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 495 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 695 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 995 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 1990 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 5990 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 9990, salary_band_min: 100000, salary_band_max: 150000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 14990, salary_band_min: 150000, salary_band_max: 250000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 24990, salary_band_min: 250000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
  
  // AUD Pricing
  {
    code: 'PRICE_AUD_2026Q1',
    name: 'AUD Pricing - 2026 Q1',
    pricing_peg: 'AUD',
    billing_currency: 'AUD',
    products: [
      // Subscriptions
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 275 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 425 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 695 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 995 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 1395 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 2990 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 8990 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 14990, salary_band_min: 150000, salary_band_max: 200000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 19990, salary_band_min: 200000, salary_band_max: 300000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 29990, salary_band_min: 300000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
  
  // GBP Pricing
  {
    code: 'PRICE_GBP_2026Q1',
    name: 'GBP Pricing - 2026 Q1',
    pricing_peg: 'GBP',
    billing_currency: 'GBP',
    products: [
      // Subscriptions
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 145 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 245 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 395 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 545 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 795 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 1790 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 4990 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 8990, salary_band_min: 90000, salary_band_max: 130000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 12990, salary_band_min: 130000, salary_band_max: 200000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 19990, salary_band_min: 200000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
  
  // EUR Pricing
  {
    code: 'PRICE_EUR_2026Q1',
    name: 'EUR Pricing - 2026 Q1',
    pricing_peg: 'EUR',
    billing_currency: 'EUR',
    products: [
      // Subscriptions
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 175 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 275 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 445 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 635 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 895 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 1990 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 5990 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 9990, salary_band_min: 90000, salary_band_max: 130000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 14990, salary_band_min: 130000, salary_band_max: 220000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 22990, salary_band_min: 220000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
  
  // INR Pricing
  {
    code: 'PRICE_INR_2026Q1',
    name: 'INR Pricing - 2026 Q1',
    pricing_peg: 'INR',
    billing_currency: 'INR',
    products: [
      // Subscriptions
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 4999 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 7999 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 13999 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 19999 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 29999 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 49000 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 149000 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 300000, salary_band_min: 2500000, salary_band_max: 4000000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 500000, salary_band_min: 4000000, salary_band_max: 7500000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 800000, salary_band_min: 7500000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
  
  // INR Pricing with USD Billing (Pakistan, Bangladesh, Sri Lanka)
  {
    code: 'PRICE_INR_USD_2026Q1',
    name: 'INR Pricing USD Billing - 2026 Q1',
    pricing_peg: 'INR',
    billing_currency: 'USD',
    products: [
      // Same INR pricing structure, billed in USD equivalent
      { code: 'SUB_PAYG', name: 'Pay As You Go', category: 'SUBSCRIPTION', price: 60 },
      { code: 'SUB_SMALL', name: 'Small Business', category: 'SUBSCRIPTION', price: 95 },
      { code: 'SUB_MEDIUM', name: 'Medium Business', category: 'SUBSCRIPTION', price: 170 },
      { code: 'SUB_LARGE', name: 'Large Enterprise', category: 'SUBSCRIPTION', price: 240 },
      { code: 'SUB_ENTERPRISE', name: 'Enterprise', category: 'SUBSCRIPTION', price: 360 },
      { code: 'SUB_RPO', name: 'RPO Custom', category: 'SUBSCRIPTION', price: 0 },
      // Recruitment Services
      { code: 'RECRUIT_SHORTLISTING', name: 'Shortlisting', category: 'JOB_POSTING', price: 590 },
      { code: 'RECRUIT_FULL', name: 'Full Recruitment', category: 'JOB_POSTING', price: 1790 },
      { code: 'RECRUIT_EXEC_BAND_1', name: 'Executive Search - Band 1', category: 'JOB_POSTING', price: 3600, salary_band_min: 30000, salary_band_max: 48000, band_name: 'Band 1' },
      { code: 'RECRUIT_EXEC_BAND_2', name: 'Executive Search - Band 2', category: 'JOB_POSTING', price: 6000, salary_band_min: 48000, salary_band_max: 90000, band_name: 'Band 2' },
      { code: 'RECRUIT_EXEC_BAND_3', name: 'Executive Search - Band 3', category: 'JOB_POSTING', price: 9600, salary_band_min: 90000, salary_band_max: null, band_name: 'Band 3' },
      { code: 'RECRUIT_RPO', name: 'RPO Custom', category: 'JOB_POSTING', price: 0 },
    ]
  },
];

async function main() {
  console.log('💰 Starting Price Books seed...\n');
  
  const version = '2026-Q1';
  const effectiveFrom = new Date('2026-01-01');
  
  let priceBookCount = 0;
  let productCount = 0;
  let tierCount = 0;
  
  for (const bookData of priceBooks) {
    console.log(`📘 Processing: ${bookData.name}`);
    
    // Check if price book already exists
    const existing = await prisma.priceBook.findFirst({
      where: { name: bookData.name }
    });
    
    let priceBook;
    if (existing) {
      console.log(`   ⚠️  Price book already exists, updating...`);
      priceBook = await prisma.priceBook.update({
        where: { id: existing.id },
        data: {
          pricing_peg: bookData.pricing_peg,
          billing_currency: bookData.billing_currency,
          version,
          effective_from: effectiveFrom,
          is_approved: true,
          is_active: true,
          is_global: bookData.pricing_peg === 'USD'
        }
      });
    } else {
      priceBook = await prisma.priceBook.create({
        data: {
          name: bookData.name,
          description: `Official HRM8 pricing for ${bookData.pricing_peg} markets - ${version}`,
          pricing_peg: bookData.pricing_peg,
          billing_currency: bookData.billing_currency,
          currency: bookData.billing_currency,
          version,
          effective_from: effectiveFrom,
          is_approved: true,
          is_active: true,
          is_global: bookData.pricing_peg === 'USD'
        }
      });
      priceBookCount++;
      console.log(`   ✅ Created price book: ${priceBook.id}`);
    }
    
    // Create or update products and tiers
    for (const productData of bookData.products) {
      // Find or create product
      let product = await prisma.product.findFirst({
        where: { code: productData.code }
      });
      
      if (!product) {
        product = await prisma.product.create({
          data: {
            code: productData.code,
            name: productData.name,
            category: productData.category as any,
            is_active: true
          }
        });
        productCount++;
        console.log(`      ✅ Created product: ${product.code}`);
      }
      
      // Check if tier already exists
      const existingTier = await prisma.priceTier.findFirst({
        where: {
          price_book_id: priceBook.id,
          product_id: product.id
        }
      });
      
      if (existingTier) {
        // Update existing tier
        await prisma.priceTier.update({
          where: { id: existingTier.id },
          data: {
            name: productData.band_name || `${productData.name} - Standard`,
            unit_price: productData.price,
            min_quantity: 1,
            max_quantity: null,
            period: productData.category === 'SUBSCRIPTION' ? 'MONTHLY' : 'ONE_TIME',
            salary_band_min: productData.salary_band_min,
            salary_band_max: productData.salary_band_max,
            band_name: productData.band_name
          }
        });
        console.log(`      📝 Updated tier: ${productData.code} = ${bookData.billing_currency} ${productData.price}`);
      } else {
        // Create new tier
        await prisma.priceTier.create({
          data: {
            price_book_id: priceBook.id,
            product_id: product.id,
            name: productData.band_name || `${productData.name} - Standard`,
            unit_price: productData.price,
            min_quantity: 1,
            max_quantity: null,
            period: productData.category === 'SUBSCRIPTION' ? 'MONTHLY' : 'ONE_TIME',
            salary_band_min: productData.salary_band_min,
            salary_band_max: productData.salary_band_max,
            band_name: productData.band_name
          }
        });
        tierCount++;
        console.log(`      ✅ Created tier: ${productData.code} = ${bookData.billing_currency} ${productData.price}`);
      }
    }
    
    console.log(`   ✅ Completed ${bookData.name}\n`);
  }
  
  console.log('📊 Price Books Seed Summary:');
  console.log(`   📘 Price Books: ${priceBookCount} created`);
  console.log(`   📦 Products: ${productCount} created`);
  console.log(`   💵 Price Tiers: ${tierCount} created`);
  console.log(`   📍 Total Books: ${priceBooks.length}`);
  console.log(`   💰 Total Tiers Expected: ${priceBooks.length * 12} (${priceBooks.length} books × 12 products)`);
  
  console.log('\n✅ Price Books seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding price books:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
