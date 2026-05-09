/**
 * Omni-Extractor — Aggressive Contact Detection
 * Extracts emails, phone numbers, and social handles, overcoming common obfuscation.
 */

import * as cheerio from 'cheerio';

const PATTERNS = {
  // Matches normal and obfuscated: test@gmail.com, test [at] gmail [dot] com, test(at)gmail.com
  email: /([a-zA-Z0-9._-]+)\s*(?:@|\[at\]|\(at\)|\[@\])\s*([a-zA-Z0-9.-]+)\s*(?:\.|\[dot\]|\(dot\)|\[\.\])\s*([a-zA-Z]{2,6})/gi,
  
  // Aggressive phone matching
  phone: /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/gi,

  // Social handles
  instagram: /(?:instagram\.com\/|ig:\s*@|insta:\s*@|@)([a-zA-Z0-9_.]+)/gi,
  twitter: /(?:twitter\.com\/|x\.com\/|x:\s*@|twitter:\s*@)([a-zA-Z0-9_]+)/gi,
};

export function detectContactsAggressively(text) {
  const contacts = {
    emails: new Set(),
    phones: new Set(),
    socials: new Set()
  };

  // Clean text slightly without removing important obfuscated chars
  const cleanText = text.replace(/\n+/g, ' ');

  // 1. Emails
  let match;
  while ((match = PATTERNS.email.exec(cleanText)) !== null) {
    const email = `${match[1]}@${match[2]}.${match[3]}`.toLowerCase();
    // Exclude common false positives
    if (!email.match(/^(example|test|noreply|no-reply|donotreply)@/)) {
      contacts.emails.add(email);
    }
  }

  // 2. Phones
  while ((match = PATTERNS.phone.exec(cleanText)) !== null) {
    const raw = match[0].trim();
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      contacts.phones.add(raw);
    }
  }

  // 3. Socials
  while ((match = PATTERNS.instagram.exec(cleanText)) !== null) {
    const handle = match[1].toLowerCase();
    if (handle.length > 2 && !handle.match(/^(p|p\/|reel|explore|about)$/)) {
      contacts.socials.add(`ig:@${handle}`);
    }
  }
  
  while ((match = PATTERNS.twitter.exec(cleanText)) !== null) {
    const handle = match[1].toLowerCase();
    if (handle.length > 2 && !handle.match(/^(home|explore|notifications|messages)$/)) {
      contacts.socials.add(`x:@${handle}`);
    }
  }

  return {
    emails: Array.from(contacts.emails),
    phones: Array.from(contacts.phones),
    socials: Array.from(contacts.socials)
  };
}

export function extractFromHtml(html) {
  const $ = cheerio.load(html);
  // Get text from body, removing scripts/styles
  $('script, style, nav, footer').remove();
  const text = $('body').text();
  return detectContactsAggressively(text);
}
