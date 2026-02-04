import { logger } from '@cuvera/commons'
import { getTenantDomainModel } from '../models/TenantDomain';

/**
 * Extracts the hostname from a URL string.
 * Returns null if the URL cannot be parsed.
 */
function extractHostname(url: string): string | null {
    try {
        // Handle URLs that may lack a protocol
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        return new URL(normalized).hostname;
    } catch {
        return null;
    }
}

/**
 * Resolves a tenantId by looking up the domain from a URL
 * in the TenantDomain collection.
 * Falls back to process.env.TENANT_ID or 'default'.
 */
export async function resolveTenantFromUrl(url: string): Promise<string> {
    const hostname = extractHostname(url);
    if (!hostname) {
        logger.warn(`No hostname found for url: ${url}`);
        return '';
    }

    try {
        const TenantDomain = await getTenantDomainModel();
        const mapping = await TenantDomain.findOne({ domain: hostname });
        logger.info(`Mapping found for domain: ${hostname}: ${mapping}`);
        return mapping?.tenantId || '';
    } catch (error) {
        logger.error(`Failed to resolve tenant from domain: ${hostname}`);
        return '';
    }
}
