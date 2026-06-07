/**
 * LeadHarvester — Lead Detector
 * Fast heuristic detection engine: regex + DOM selectors via Cheerio.
 * No AI calls — pure pattern matching for speed and zero cost.
 */

import * as cheerio from 'cheerio';

// ── Email Patterns ──────────────────────────────────────────────
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const IGNORE_EMAIL_PATTERNS = [
  /noreply@/i, /no-reply@/i, /donotreply@/i,
  /example\.(com|org|net)/i, /test@/i, /localhost/i,
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
  /sentry\./i, /webpack/i, /wixpress/i, /schema\.org/i,
];

// Common generic local-parts that often indicate routing or non-decision-maker addresses
const GENERIC_EMAIL_PREFIXES = [
  'info', 'support', 'contact', 'admin', 'hello', 'team', 'sales', 'office', 'marketing', 'jobs', 'careers', 'privacy', 'postmaster', 'webmaster'
];

// Sections we should ignore when an email appears inside them (footers, comments, share widgets)
const DISALLOWED_PARENT_SELECTORS = [
  'footer', '[class*="footer"]', '[id*="footer"]', '.comment', '.comments', '.author', '.byline', '.post-meta', '.site-info', 'nav', '.share', '.social-links', '.subscribe'
];

// ── Phone Patterns ──────────────────────────────────────────────
const PHONE_PATTERNS = [
  /\+?1?\s*\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g,       // US/CA
  /\+44\s?\d{4}\s?\d{6}/g,                                        // UK
  /\+971\s?\d{1,2}\s?\d{3}\s?\d{4}/g,                            // UAE
  /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{0,4}/g, // International
];

// ── CTA Keywords ────────────────────────────────────────────────
const CTA_KEYWORDS = [
  'request demo', 'request a demo', 'book a demo', 'schedule demo',
  'contact sales', 'contact us', 'get in touch', 'get started',
  'free trial', 'start free', 'try free', 'sign up free',
  'book a call', 'schedule a call', 'book meeting', 'schedule meeting',
  'request quote', 'get a quote', 'free consultation',
  'talk to sales', 'speak to sales', 'let\'s talk', 'reach out',
];

// ── Contact Form Selectors ──────────────────────────────────────
const FORM_INDICATORS = [
  'form[action*="contact"]', 'form[action*="inquiry"]',
  'form[action*="lead"]', 'form[action*="subscribe"]',
  'form[action*="demo"]', 'form[action*="quote"]',
  'form input[type="email"]', 'form input[name*="email"]',
  'form input[name*="phone"]', 'form textarea[name*="message"]',
  '#contact-form', '.contact-form', '#inquiry-form',
  '[data-form-type="contact"]', '[data-form-type="lead"]',
];

// ── Social Profile Patterns ─────────────────────────────────────
const SOCIAL_PATTERNS = {
  linkedin: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9\-_.]+/g,
  twitter: /https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+/g,
  facebook: /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.\-]+/g,
};

/**
 * Detect all lead signals from HTML content.
 * @param {string} html - Raw HTML string
 * @param {string} sourceUrl - URL of the page
 * @returns {{ candidates: Array, meta: Object }}
 */
export function detectLeads(html, sourceUrl = '') {
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const candidates = [];

  // ── 1. Email Detection ──────────────────────────────────────
  const emailMatches = text.match(EMAIL_REGEX) || [];
  // Also check href="mailto:" links
  $('a[href^="mailto:"]').each((_, el) => {
    const mailto = $(el).attr('href')?.replace('mailto:', '').split('?')[0];
    if (mailto && !emailMatches.includes(mailto)) emailMatches.push(mailto);
  });

  const seenEmails = new Set();
  for (const rawEmail of emailMatches) {
    const email = rawEmail.toLowerCase().trim();
    if (seenEmails.has(email)) continue;
    if (IGNORE_EMAIL_PATTERNS.some(p => p.test(email))) continue;

    // Skip emails that appear inside known footer/comment/share sections
    let inDisallowedSection = false;
    for (const sel of DISALLOWED_PARENT_SELECTORS) {
      try {
        const block = $(sel).text() || '';
        if (block && block.toLowerCase().includes(email)) {
          inDisallowedSection = true;
          break;
        }
      } catch (e) {
        // ignore selector errors
      }
    }
    if (inDisallowedSection) continue;

    seenEmails.add(email);

    // Get context — surrounding text
    const idx = text.toLowerCase().indexOf(email);
    const context = text.slice(Math.max(0, idx - 120), idx + email.length + 120).trim();

    // Generic local-part detection (info@, contact@, support@, etc.)
    const localPart = email.split('@')[0] || '';
    const genericLocal = GENERIC_EMAIL_PREFIXES.some(p => localPart === p || localPart.startsWith(p + '.') || localPart.startsWith(p + '-') || localPart.startsWith(p + '_'));

    // Base confidence: business domains > personal providers
    let confidence = (email.includes('@gmail.') || email.includes('@yahoo.') || email.includes('@hotmail.') || email.includes('@outlook.')) ? 0.5 : 0.85;
    if (genericLocal) confidence = Math.min(confidence, 0.55);

    // If there is a mailto link explicitly for this email, treat as higher-confidence
    const mailtoFound = $(`a[href*="mailto:${email}"]`).length > 0 || $(`a[href*="mailto:"]`).filter((_, el) => ($(el).attr('href')||'').toLowerCase().includes(email)).length > 0;
    if (mailtoFound) confidence = Math.max(confidence, 0.9);

    // Title / role hint detection around the context
    const TITLE_PATTERNS = /(ceo|founder|cto|cfo|coo|vp\b|vice president|director|head of|manager|owner|principal)/i;
    const titleMatch = context.match(TITLE_PATTERNS) || ($('body').text().slice(0, 500).match(TITLE_PATTERNS));
    const titleHints = titleMatch ? [titleMatch[0]] : [];
    if (titleHints.length > 0) confidence = Math.min(1, confidence + 0.07);

    candidates.push({
      type: 'email',
      value: email,
      context,
      confidence,
      generic: genericLocal,
      titleHints,
      sourceUrl,
    });
  }

  // ── 2. Phone Detection ────────────────────────────────────────
  const seenPhones = new Set();
  for (const pattern of PHONE_PATTERNS) {
    const phoneMatches = text.match(pattern) || [];
    for (const rawPhone of phoneMatches) {
      const phone = rawPhone.replace(/[\s.\-()]/g, '').trim();
      if (phone.length < 7 || phone.length > 15) continue;
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);

      const idx = text.indexOf(rawPhone);
      const context = text.slice(Math.max(0, idx - 60), idx + rawPhone.length + 60).trim();

      candidates.push({
        type: 'phone',
        value: rawPhone.trim(),
        context,
        confidence: phone.startsWith('+') ? 0.9 : 0.7,
        sourceUrl,
      });
    }
  }

  // Also check tel: links
  $('a[href^="tel:"]').each((_, el) => {
    const phone = $(el).attr('href')?.replace('tel:', '').trim();
    if (phone && !seenPhones.has(phone.replace(/[\s.\-()]/g, ''))) {
      seenPhones.add(phone.replace(/[\s.\-()]/g, ''));
      candidates.push({
        type: 'phone',
        value: phone,
        context: $(el).text().trim() || phone,
        confidence: 0.95,
        sourceUrl,
      });
    }
  });

  // ── 3. CTA Detection ─────────────────────────────────────────
  const ctaFound = new Set();
  $('a, button').each((_, el) => {
    const linkText = $(el).text().toLowerCase().trim();
    const href = $(el).attr('href') || '';

    for (const keyword of CTA_KEYWORDS) {
      if (linkText.includes(keyword) || href.toLowerCase().includes(keyword.replace(/\s+/g, '-'))) {
        const ctaKey = `${keyword}|${href}`;
        if (ctaFound.has(ctaKey)) continue;
        ctaFound.add(ctaKey);

        candidates.push({
          type: 'cta',
          value: linkText || keyword,
          href: href.startsWith('http') ? href : (href.startsWith('/') ? new URL(href, sourceUrl).href : href),
          context: `CTA: "${linkText}" → ${href}`,
          confidence: 0.8,
          sourceUrl,
        });
        break;
      }
    }
  });

  // ── 4. Contact Form Detection ─────────────────────────────────
  let hasContactForm = false;
  for (const selector of FORM_INDICATORS) {
    if ($(selector).length > 0) {
      hasContactForm = true;
      const form = $(selector).first();
      const action = form.attr('action') || 'inline';
      candidates.push({
        type: 'contact_form',
        value: `Contact form found (action: ${action})`,
        context: `Form with email/phone inputs detected on page`,
        confidence: 0.75,
        sourceUrl,
      });
      break;
    }
  }

  // ── 5. Social Profiles ────────────────────────────────────────
  const seenSocials = new Set();
  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    const matches = html.match(pattern) || [];
    for (const url of matches) {
      if (seenSocials.has(url)) continue;
      seenSocials.add(url);
      candidates.push({
        type: 'social',
        value: url,
        platform,
        context: `${platform} profile: ${url}`,
        confidence: 0.6,
        sourceUrl,
      });
    }
  }

  // ── 6. Company Name Detection (from meta/title) ────────────────
  const pageTitle = $('title').text().trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const metaDesc = $('meta[name="description"]').attr('content') || '';

  return {
    candidates,
    meta: {
      pageTitle,
      siteName: ogSiteName || pageTitle.split('|')[0]?.trim() || '',
      ogTitle,
      description: metaDesc,
      hasContactForm,
      emailCount: seenEmails.size,
      phoneCount: seenPhones.size,
      ctaCount: ctaFound.size,
      socialCount: seenSocials.size,
      sourceUrl,
    },
  };
}

/**
 * Quick check if a page likely has contact info (for crawl prioritization).
 */
export function hasContactSignals(html) {
  const lower = html.toLowerCase();
  return (
    EMAIL_REGEX.test(lower) ||
    lower.includes('mailto:') ||
    lower.includes('tel:') ||
    CTA_KEYWORDS.some(k => lower.includes(k)) ||
    lower.includes('contact-form') ||
    lower.includes('contact us')
  );
}
