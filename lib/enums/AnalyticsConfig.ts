import Origin from './Origin';

const ALLOWED_ORIGINS = Object.values(Origin) as string[];

const OFFICIAL_GTM_IDS = new Map<string, string>([
  [Origin.PROD, 'GTM-KWR4NW26'],
  [Origin.STAGING, 'GTM-MPNLC2PN'],
  [Origin.LOCAL, 'GTM-MPNLC2PN'],
]);

const AnalyticsConfig = {
  ALLOWED_ORIGINS,
  OFFICIAL_GTM_IDS,
} as const;

export default AnalyticsConfig;
