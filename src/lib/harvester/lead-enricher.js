/**
 * LeadHarvester — Lead Enricher
 * Pluggable enrichment: local heuristics + third-party stubs.
 * Fails gracefully if no API keys are configured.
 */

/**
 * Enrich a lead with additional data from the domain.
 * @param {Object} lead - Lead to enrich
 * @returns {Object} Enriched lead with enrichment_data
 */
export async function enrichLead(lead) {
  const enrichment = {};
  let enriched = false;

  // ── 1. Local Domain Heuristics (always available) ─────────────
  if (lead.emails?.[0]) {
    const domain = lead.emails[0].split('@')[1];
    if (domain && !isPersonalEmail(domain)) {
      enrichment.domain = domain;
      enrichment.company_from_domain = domainToCompanyName(domain);
      enrichment.industry_guess = guessIndustry(domain, lead.page_title || '');
      enriched = true;
    }
  }

  if (lead.source_url) {
    try {
      const url = new URL(lead.source_url);
      enrichment.website = `${url.protocol}//${url.hostname}`;
      if (!enrichment.domain) {
        enrichment.domain = url.hostname.replace(/^www\./, '');
        enrichment.company_from_domain = domainToCompanyName(enrichment.domain);
      }
      enriched = true;
    } catch { /* invalid URL */ }
  }

  // ── 2. Clearbit Stub ──────────────────────────────────────────
  const clearbitKey = process.env.CLEARBIT_KEY;
  if (clearbitKey && enrichment.domain) {
    try {
      const clearbitData = await fetchClearbit(enrichment.domain, clearbitKey);
      if (clearbitData) {
        enrichment.clearbit = clearbitData;
        enriched = true;
      }
    } catch (err) {
      console.warn('[Enricher] Clearbit failed:', err.message);
    }
  }

  // ── 3. Hunter Stub ────────────────────────────────────────────
  const hunterKey = process.env.HUNTER_KEY;
  if (hunterKey && enrichment.domain) {
    try {
      const hunterData = await fetchHunter(enrichment.domain, hunterKey);
      if (hunterData) {
        enrichment.hunter = hunterData;
        enriched = true;
      }
    } catch (err) {
      console.warn('[Enricher] Hunter failed:', err.message);
    }
  }

  return {
    ...lead,
    enriched,
    enrichment_data: enrichment,
    company: enrichment.clearbit?.name || enrichment.company_from_domain || lead.company || '',
  };
}

// ── Helper Functions ────────────────────────────────────────────

function isPersonalEmail(domain) {
  const personal = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    'live.com', 'msn.com', 'ymail.com',
  ];
  return personal.includes(domain.toLowerCase());
}

function domainToCompanyName(domain) {
  // Remove TLD and www, capitalize
  const name = domain
    .replace(/^www\./, '')
    .split('.')[0]
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  return name;
}

function guessIndustry(domain, pageTitle) {
  const text = `${domain} ${pageTitle}`.toLowerCase();

  const industryMap = [
    { keywords: ['real estate', 'realtor', 'realty', 'property'], industry: 'Real Estate' },
    { keywords: ['tech', 'software', 'saas', 'app', 'digital'], industry: 'Technology' },
    { keywords: ['market', 'agency', 'advertis', 'media'], industry: 'Marketing & Advertising' },
    { keywords: ['law', 'legal', 'attorney', 'lawyer'], industry: 'Legal Services' },
    { keywords: ['health', 'medical', 'clinic', 'dental'], industry: 'Healthcare' },
    { keywords: ['consult', 'advisory'], industry: 'Consulting' },
    { keywords: ['financ', 'bank', 'invest', 'insur'], industry: 'Financial Services' },
    { keywords: ['construct', 'build', 'architect'], industry: 'Construction' },
    { keywords: ['food', 'restaurant', 'catering'], industry: 'Food & Beverage' },
    { keywords: ['education', 'school', 'training', 'academy'], industry: 'Education' },
    { keywords: ['design', 'creative', 'studio'], industry: 'Design & Creative' },
    { keywords: ['recruit', 'staffing', 'hr', 'talent'], industry: 'HR & Staffing' },
  ];

  for (const { keywords, industry } of industryMap) {
    if (keywords.some(k => text.includes(k))) return industry;
  }
  return 'General Business';
}

/**
 * Clearbit Company API stub.
 * Activated when CLEARBIT_KEY is set in .env.local
 */
async function fetchClearbit(domain, apiKey) {
  try {
    const response = await fetch(`https://company.clearbit.com/v2/companies/find?domain=${domain}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      name: data.name,
      industry: data.industry,
      employees: data.metrics?.employees,
      location: data.geo?.city ? `${data.geo.city}, ${data.geo.country}` : null,
      description: data.description,
      logo: data.logo,
    };
  } catch {
    return null;
  }
}

/**
 * Hunter.io Domain Search stub.
 * Activated when HUNTER_KEY is set in .env.local
 */
async function fetchHunter(domain, apiKey) {
  try {
    const response = await fetch(`https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      emailCount: data.data?.emails?.length || 0,
      pattern: data.data?.pattern,
      organization: data.data?.organization,
    };
  } catch {
    return null;
  }
}
