import { PlusCircle, Tv, Newspaper, Globe, Share2 } from 'lucide-react';

export const MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September', 
  'October', 'November', 'December', 'January', 'February', 'March'
];

export const FINANCIAL_YEARS = (() => {
  const years = [];
  for (let y = 2020; y <= 2028; y++) years.push(`${y}-${y + 1}`);
  return years;
})();

export const SOCIAL_CHANNELS = [
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedIn', label: 'LinkedIn' },
  { key: 'youTube', label: 'YouTube' },
];

export const SOCIAL_CHANNELS_KEYS = ['facebook', 'instagram', 'linkedIn', 'twitter', 'youTube'];

export const SOCIAL_METRICS = ['posts', 'engagement', 'impression'];

export const STEPS = [
  { id: 0, key: 'broadcast', label: 'Broadcast TV Media' },
  { id: 1, key: 'print_media', label: 'Print Media' },
  { id: 2, key: 'online', label: 'Online' },
  { id: 3, key: 'social_media', label: 'Social Media' },
];

export const MEDIA_TABS_ALL = [
  { id: 'add_details', label: 'Input Form', icon: PlusCircle },
  { id: 'broadcast', label: 'Broadcast / TV Media', icon: Tv },
  { id: 'print_media', label: 'Print Media', icon: Newspaper },
  { id: 'online', label: 'Online', icon: Globe },
  { id: 'social_media', label: 'Social Media', icon: Share2 },
];
