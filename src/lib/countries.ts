/**
 * ISO 3166-1 alpha-2 country codes validation
 */
export const VALID_COUNTRIES = [
    'US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'AU', 'NZ',
    'JP', 'KR', 'SG', 'HK', 'IN', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'PH', 'ID',
    'MY', 'TH', 'VN', 'AE', 'SA', 'ZA', 'NG', 'KE', 'EG', 'IL', 'TR', 'PL', 'SE',
    'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI',
    'LT', 'LV', 'EE', 'CY', 'MT', 'LU', 'IS', 'RU', 'UA', 'BY', 'KZ', 'PK', 'BD',
    'TW', 'CN', 'OTHER'
];

/**
 * EU countries for GDPR compliance
 */
export const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

/**
 * Check if a country is in the EU (for GDPR)
 */
export function isEUCountry(countryCode: string | null | undefined): boolean {
    if (!countryCode) return false;
    return EU_COUNTRIES.includes(countryCode);
}
