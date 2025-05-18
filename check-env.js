require('dotenv').config({ path: '.env.local' });
const requiredKeys = ['GOOGLE_VISION_API_KEY', 'OPENAI_API_KEY'];
let allGood = true;
console.log('\n🔍 Checking .env.local values...\n');
requiredKeys.forEach((key) => {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing or empty: ${key}`);
    allGood = false;
  } else {
    console.log(`✅ ${key} is set (${value.slice(0, 10)}...)`);
  }
});
if (allGood) {
  console.log('\n✅ All required environment variables are correctly set in .env.local.\n');
  process.exit(0);
} else {
  console.warn('\n⚠️ Please fix the missing keys above and re-run this script.\n');
  process.exit(1);
}
