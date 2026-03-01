export const NICHES = [
  'Fashion',
  'Beauty/Cosmetics',
  'Fitness/Health',
  'Food',
  'Tech',
  'Travel',
  'Education',
  'Comedy/Entertainment',
  'Lifestyle',
  'Parenting',
] as const;

export const FOLLOWER_BUCKETS = [
  { min: 5000, max: 10000, label: '5K-10K' },
  { min: 10000, max: 25000, label: '10K-25K' },
  { min: 25000, max: 50000, label: '25K-50K' },
  { min: 50000, max: 100000, label: '50K-100K' },
] as const;

export function getFollowerBucket(count: number): string {
  for (const b of FOLLOWER_BUCKETS) {
    if (count >= b.min && count < b.max) return b.label;
  }
  return count >= 100000 ? '50K-100K' : '5K-10K';
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const INDUSTRIES = [
  'Beauty & Wellness',
  'Fashion & Apparel',
  'Electronics & Tech',
  'Food & Beverage',
  'Health & Fitness',
  'Travel & Hospitality',
  'Education & EdTech',
  'Entertainment & Media',
  'Finance & Fintech',
  'E-commerce & Retail',
  'Gaming',
  'Automotive',
] as const;
