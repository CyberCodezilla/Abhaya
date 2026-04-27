/**
 * Nearby Help Constants
 * Configuration for the nearest help detection system
 */

/**
 * NO API KEY NEEDED!
 * We use Google Maps deep linking instead of Places API
 * This avoids billing, quotas, and Play Store policy complications
 */

/**
 * Search radius for nearby help centers (in meters)
 * 5 km default — wide enough for urban/suburban India
 * WHY: Larger radius increases chance of finding help, but results are distance-sorted
 */
export const NEARBY_SEARCH_RADIUS = 5000; // 5 km

/**
 * Fallback search radius if initial search finds nothing
 * WHY: Rural areas may not have help within 5 km
 */
export const FALLBACK_SEARCH_RADIUS = 15000; // 15 km

/**
 * Maximum time to wait for nearby search API call (milliseconds)
 * WHY: SOS cannot wait forever; gracefully continue without results after timeout
 */
export const NEARBY_SEARCH_TIMEOUT = 6000; // 6 seconds

/**
 * Google Places API keywords for searching police stations in India
 * WHY: "police" keyword works globally; adding Hindi terms improves India coverage
 */
export const POLICE_SEARCH_KEYWORDS = ['police station', 'police'];

/**
 * Google Places API type for police stations
 */
export const POLICE_PLACE_TYPE = 'police';

/**
 * Google Places API keywords for women safety NGOs
 * WHY: No standard Google type for NGOs; keyword search is the best approach
 */
export const NGO_SEARCH_KEYWORDS = [
  'women helpline',
  'women safety',
  'women protection',
  'mahila suraksha',    // Hindi: women safety
  'one stop centre',    // Indian govt scheme for women
];

/**
 * India-wide emergency helpline numbers (always available, no API required)
 * These are hardcoded fallback contacts when dynamic search fails
 */
export const INDIA_EMERGENCY_NUMBERS = {
  POLICE: {
    name: 'Police Emergency',
    number: '100',
    description: 'All India Police Emergency',
  },
  WOMEN_HELPLINE: {
    name: 'Women Helpline',
    number: '1091',
    description: 'Women in Distress Helpline (India)',
  },
  WOMEN_HELPLINE_NCW: {
    name: 'NCW Helpline',
    number: '7827-170-170',
    description: 'National Commission for Women',
  },
  EMERGENCY_SOS: {
    name: 'Emergency SOS',
    number: '112',
    description: 'Unified Emergency Number (India)',
  },
  CHILD_HELPLINE: {
    name: 'Child Helpline',
    number: '1098',
    description: 'Childline India Foundation',
  },
} as const;

/**
 * Maximum number of nearby results to display
 */
export const MAX_NEARBY_RESULTS = 3;

/**
 * How long (ms) before the system proceeds without nearby help
 * Even if search is still running, SOS must not be blocked
 */
export const MAX_WAIT_FOR_NEARBY = 8000; // 8 seconds max
