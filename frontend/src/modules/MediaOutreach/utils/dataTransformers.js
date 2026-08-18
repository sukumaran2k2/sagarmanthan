import { SOCIAL_CHANNELS_KEYS } from './constants';

/**
  Aggregates monthly records by Financial Year + Organisation ID for Year-Wise summary view
 */
export function aggregateYearWiseData(rowData) {
  if (!Array.isArray(rowData)) return [];

  const groups = {};
  rowData.forEach(row => {
    const orgId = row.organisation_id ?? row.organisation;
    const key = `${row.financial_year}_${orgId}`;
    if (!groups[key]) {
      groups[key] = {
        financial_year: row.financial_year,
        organisation_id: orgId,
        organisation_category_name: row.organisation_category_name,
        broadcast_national: 0,
        broadcast_regional: 0,
        broadcast_overall: 0,
        print_media_national: 0,
        print_media_regional: 0,
        print_media_overall: 0,
        online_english: 0,
        online_vernacular: 0,
        online_overall: 0,
        // Social media post, engagement, impression counts
        twitter_posts: 0, twitter_impression: 0, twitter_engagement: 0,
        instagram_posts: 0, instagram_impression: 0, instagram_engagement: 0,
        facebook_posts: 0, facebook_impression: 0, facebook_engagement: 0,
        linkedIn_posts: 0, linkedIn_impression: 0, linkedIn_engagement: 0,
        youTube_posts: 0, youTube_impression: 0, youTube_engagement: 0,
        media_outreach_id: `yearwise_${row.financial_year}_${orgId}`
      };
    }

    groups[key].broadcast_national += row.broadcast_national || 0;
    groups[key].broadcast_regional += row.broadcast_regional || 0;
    groups[key].broadcast_overall += row.broadcast_overall || 0;

    groups[key].print_media_national += row.print_media_national || 0;
    groups[key].print_media_regional += row.print_media_regional || 0;
    groups[key].print_media_overall += row.print_media_overall || 0;

    groups[key].online_english += row.online_english || 0;
    groups[key].online_vernacular += row.online_vernacular || 0;
    groups[key].online_overall += row.online_overall || 0;

    SOCIAL_CHANNELS_KEYS.forEach(ch => {
      groups[key][`${ch}_posts`] += row[`${ch}_posts`] || 0;
      groups[key][`${ch}_impression`] += row[`${ch}_impression`] || 0;
      groups[key][`${ch}_engagement`] += row[`${ch}_engagement`] || 0;
    });
  });

  return Object.values(groups);
}
