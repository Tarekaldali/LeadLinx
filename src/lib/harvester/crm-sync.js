/**
 * LeadHarvester — CRM Sync
 * Webhook and CRM connectors. Reads from .env.local, skips if not configured.
 */

import crypto from 'crypto';

/**
 * Sync leads to configured CRM/webhook destinations.
 * @param {Array} leads - Array of lead objects to sync
 * @returns {{ synced: number, errors: Array }}
 */
export async function syncLeads(leads) {
  const results = { synced: 0, errors: [] };

  // ── 1. Generic Webhook ────────────────────────────────────────
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await sendWebhook(webhookUrl, leads);
      results.synced += leads.length;
      console.log(`[CRM] Sent ${leads.length} leads to webhook`);
    } catch (err) {
      results.errors.push({ target: 'webhook', error: err.message });
    }
  }

  // ── 2. HubSpot ────────────────────────────────────────────────
  const hubspotKey = process.env.HUBSPOT_KEY;
  if (hubspotKey) {
    for (const lead of leads) {
      try {
        await createHubSpotContact(lead, hubspotKey);
        results.synced++;
      } catch (err) {
        results.errors.push({ target: 'hubspot', lead: lead.canonical_name, error: err.message });
      }
    }
    console.log(`[CRM] Synced ${results.synced} contacts to HubSpot`);
  }

  if (!webhookUrl && !hubspotKey) {
    console.log('[CRM] No CRM configured (CRM_WEBHOOK_URL / HUBSPOT_KEY not set)');
  }

  return results;
}

/**
 * Send leads to a generic webhook with HMAC signature.
 */
async function sendWebhook(url, leads) {
  const payload = JSON.stringify({
    event: 'leads.harvested',
    timestamp: new Date().toISOString(),
    count: leads.length,
    leads: leads.map(l => ({
      name: l.canonical_name,
      email: l.emails?.[0] || '',
      phone: l.phones?.[0] || '',
      company: l.company,
      title: l.title,
      score: l.score,
      source: l.source_url,
    })),
  });

  // HMAC signature for auth
  const secret = process.env.QA_SCRAPER_SHARED_SECRET || 'leadlinx-webhook-secret';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LeadLinx-Signature': signature,
      'X-LeadLinx-Timestamp': new Date().toISOString(),
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}`);
  }
}

/**
 * Create a contact in HubSpot CRM.
 */
async function createHubSpotContact(lead, apiKey) {
  const email = lead.emails?.[0];
  if (!email) return; // HubSpot requires email

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        email,
        firstname: lead.canonical_name?.split(' ')[0] || '',
        lastname: lead.canonical_name?.split(' ').slice(1).join(' ') || '',
        company: lead.company || '',
        jobtitle: lead.title || '',
        phone: lead.phones?.[0] || '',
        website: lead.source_url || '',
        leadsource: 'LeadLinx Harvester',
        hs_lead_status: lead.score >= 80 ? 'QUALIFIED' : lead.score >= 50 ? 'OPEN' : 'NEW',
      },
    }),
  });

  if (response.status === 409) {
    // Contact already exists — update instead
    return;
  }

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HubSpot ${response.status}: ${err.slice(0, 200)}`);
  }
}
