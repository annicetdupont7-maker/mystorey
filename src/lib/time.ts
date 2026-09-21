/**
 * One time zone for every date shown in MYSTOREY: West Africa Time (UTC+1, no daylight
 * saving), where the sellers are. Servers run in UTC and browsers in their own zone; a
 * formatter without an explicit zone printed order times an hour off and made client
 * components render different text on the server and in the browser.
 */
export const APP_TIME_ZONE = "Africa/Lagos";
