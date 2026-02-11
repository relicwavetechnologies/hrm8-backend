import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Country Pricing Map - Based on HRM8 Global Pricing Structure
 * Maps countries to their pricing peg and billing currency
 */
const countryPricingData = [
  // Australia & New Zealand - AUD Pricing
  { country_code: 'AU', country_name: 'Australia', pricing_peg: 'AUD', billing_currency: 'AUD' },
  { country_code: 'NZ', country_name: 'New Zealand', pricing_peg: 'AUD', billing_currency: 'AUD' },
  
  // United Kingdom - GBP Pricing
  { country_code: 'GB', country_name: 'United Kingdom', pricing_peg: 'GBP', billing_currency: 'GBP' },
  
  // European Union - EUR Pricing
  { country_code: 'IE', country_name: 'Ireland', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'DE', country_name: 'Germany', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'FR', country_name: 'France', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'NL', country_name: 'Netherlands', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'ES', country_name: 'Spain', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'IT', country_name: 'Italy', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'BE', country_name: 'Belgium', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'AT', country_name: 'Austria', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'FI', country_name: 'Finland', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'PT', country_name: 'Portugal', pricing_peg: 'EUR', billing_currency: 'EUR' },
  { country_code: 'LU', country_name: 'Luxembourg', pricing_peg: 'EUR', billing_currency: 'EUR' },
  
  // India & South Asia - INR Pricing (special billing rules)
  { country_code: 'IN', country_name: 'India', pricing_peg: 'INR', billing_currency: 'INR' },
  { country_code: 'PK', country_name: 'Pakistan', pricing_peg: 'INR', billing_currency: 'USD' }, // INR pricing, USD billing
  { country_code: 'LK', country_name: 'Sri Lanka', pricing_peg: 'INR', billing_currency: 'USD' }, // INR pricing, USD billing
  { country_code: 'BD', country_name: 'Bangladesh', pricing_peg: 'INR', billing_currency: 'USD' }, // INR pricing, USD billing
  
  // North America - USD Pricing
  { country_code: 'US', country_name: 'United States', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'CA', country_name: 'Canada', pricing_peg: 'USD', billing_currency: 'USD' },
  
  // Asia Pacific - USD Pricing
  { country_code: 'SG', country_name: 'Singapore', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'HK', country_name: 'Hong Kong', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'JP', country_name: 'Japan', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'KR', country_name: 'South Korea', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'MY', country_name: 'Malaysia', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'TH', country_name: 'Thailand', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'PH', country_name: 'Philippines', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'ID', country_name: 'Indonesia', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'VN', country_name: 'Vietnam', pricing_peg: 'USD', billing_currency: 'USD' },
  
  // Middle East - USD Pricing
  { country_code: 'AE', country_name: 'United Arab Emirates', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'SA', country_name: 'Saudi Arabia', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'QA', country_name: 'Qatar', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'KW', country_name: 'Kuwait', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'BH', country_name: 'Bahrain', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'OM', country_name: 'Oman', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'IL', country_name: 'Israel', pricing_peg: 'USD', billing_currency: 'USD' },
  
  // Latin America - USD Pricing
  { country_code: 'MX', country_name: 'Mexico', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'BR', country_name: 'Brazil', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'AR', country_name: 'Argentina', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'CL', country_name: 'Chile', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'CO', country_name: 'Colombia', pricing_peg: 'USD', billing_currency: 'USD' },
  
  // Africa - USD Pricing
  { country_code: 'ZA', country_name: 'South Africa', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'NG', country_name: 'Nigeria', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'KE', country_name: 'Kenya', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'EG', country_name: 'Egypt', pricing_peg: 'USD', billing_currency: 'USD' },
  
  // Other European (non-EU) - USD Pricing
  { country_code: 'CH', country_name: 'Switzerland', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'NO', country_name: 'Norway', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'SE', country_name: 'Sweden', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'DK', country_name: 'Denmark', pricing_peg: 'USD', billing_currency: 'USD' },
  { country_code: 'PL', country_name: 'Poland', pricing_peg: 'USD', billing_currency: 'USD' },
];

async function main() {
  console.log('🌍 Starting Country Pricing Map seed...');
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const country of countryPricingData) {
    const existing = await prisma.countryPricingMap.findUnique({
      where: { country_code: country.country_code }
    });
    
    if (existing) {
      // Update if data has changed
      if (
        existing.pricing_peg !== country.pricing_peg ||
        existing.billing_currency !== country.billing_currency ||
        existing.country_name !== country.country_name
      ) {
        await prisma.countryPricingMap.update({
          where: { country_code: country.country_code },
          data: {
            country_name: country.country_name,
            pricing_peg: country.pricing_peg,
            billing_currency: country.billing_currency,
            is_active: true
          }
        });
        updated++;
        console.log(`   Updated: ${country.country_code} - ${country.country_name}`);
      } else {
        skipped++;
      }
    } else {
      // Create new entry
      await prisma.countryPricingMap.create({
        data: country
      });
      created++;
      console.log(`✅ Created: ${country.country_code} - ${country.country_name} (${country.pricing_peg} pricing, ${country.billing_currency} billing)`);
    }
  }
  
  console.log('\n📊 Country Pricing Map Seed Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   📝 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📍 Total countries: ${countryPricingData.length}`);
  
  // Display pricing peg distribution
  const pegCounts = countryPricingData.reduce((acc, country) => {
    acc[country.pricing_peg] = (acc[country.pricing_peg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n💰 Pricing Peg Distribution:');
  Object.entries(pegCounts).forEach(([peg, count]) => {
    console.log(`   ${peg}: ${count} countries`);
  });
  
  console.log('\n✅ Country Pricing Map seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding country pricing map:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
