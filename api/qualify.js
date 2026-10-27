// --- Qualified-lead forwarding --------------------------------------------
// When a lead's recommended_action is "qualify", forward the lead + score to
// Long's Holdings by email so it is never thrown away.
//
// Default route (zero-key, no paid service): the FormSubmit AJAX endpoint for
// longsholdingsllc@gmail.com. Set the LEAD_FORWARD_WEBHOOK_URL env var to
// POST the JSON payload ({ event, lead, result }) to a different webhook
// instead.
//
// NOTE: FormSubmit needs a one-time activation — the first submission sends
// an "Activate Form" email to the inbox, and forwards are delivered after
// that link is clicked.
const FORWARD_EMAIL = 'longsholdingsllc@gmail.com';
const FORMSUBMIT_URL = `https://formsubmit.co/ajax/${FORWARD_EMAIL}`;
const SITE_ORIGIN = 'https://live-lead-qualifier-agent.vercel.app';

// Fire-and-forget: this never throws and never changes the API response.
// The handler returns this promise after the response has been sent so the
// platform lets the forward finish; a 5s cap keeps it from hanging.
async function forwardQualifiedLead(lead, result) {
  const webhookUrl = process.env.LEAD_FORWARD_WEBHOOK_URL;
  const url = webhookUrl || FORMSUBMIT_URL;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const payload = webhookUrl
      ? { event: 'qualified_lead', lead, result }
      : {
          _subject: `Qualified lead (${result.score}/100): ${lead.name || 'Unknown'} — ${lead.company || 'no company'}`,
          name: lead.name || '',
          email: lead.email || '',
          company: lead.company || '',
          title: lead.title || '',
          message: lead.message || '',
          budget: lead.budget || '',
          timeline: lead.timeline || '',
          score: `${result.score}/100`,
          recommended_action: result.recommended_action,
          reason: result.reason,
          summary: result.summary,
          scored_at: result.timestamp
        };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // FormSubmit rejects requests that carry no web origin/referer.
        Origin: SITE_ORIGIN,
        Referer: `${SITE_ORIGIN}/`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await resp.text().catch(() => '');
    console.log(
      `[lead-forward] qualified lead forwarded via ${webhookUrl ? 'LEAD_FORWARD_WEBHOOK_URL' : 'formsubmit'} -> HTTP ${resp.status} ${text.slice(0, 200)}`
    );
  } catch (err) {
    console.error(
      `[lead-forward] forwarding failed (API response unaffected): ${err && err.message ? err.message : err}`
    );
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Friendly response for browser visits (GET)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Live',
      agent: 'Live Lead Qualification Agent v1.0',
      message: 'This endpoint is ready. Send a POST request with a JSON body to qualify a lead.',
      usage: {
        method: 'POST',
        url: 'https://live-lead-qualifier-agent.vercel.app/api/qualify',
        headers: { 'Content-Type': 'application/json' },
        example_body: {
          name: 'Alex Rivera',
          email: 'alex@growthco.io',
          company: 'GrowthCo',
          title: 'Head of Revenue Operations',
          message: 'We process 200+ inbound leads per week manually. Looking for an AI system that can score and enrich them automatically before they hit our CRM.',
          budget: '5k-15k',
          timeline: 'this quarter'
        }
      },
      curl_example: `curl -X POST https://live-lead-qualifier-agent.vercel.app/api/qualify -H "Content-Type: application/json" -d '{"name":"Alex Rivera","title":"Head of Revenue Operations","message":"Looking for AI automation","budget":"10k","timeline":"this month"}'`
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST', 'OPTIONS'],
      message: 'Use POST with a JSON lead object to qualify. Visit the URL in a browser (GET) for usage instructions.'
    });
  }

  try {
    const lead = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    let score = 0;
    const reasons = [];

    if (lead.title && /revenue|ops|operations|growth|automation|ai|founder|ceo|cto|head|director|vp/i.test(lead.title)) {
      score += 30;
      reasons.push('Title indicates decision-maker in relevant function (+30)');
    }
    if (lead.message && /automation|ai|manual|leads|crm|workflow|agent|n8n|zapier|make/i.test(lead.message)) {
      score += 35;
      reasons.push('Message describes clear automation / AI pain point (+35)');
    }
    if (lead.budget && /\d{3,}|k|thousand|budget/i.test(String(lead.budget))) {
      score += 20;
      reasons.push('Budget signal present (+20)');
    }
    if (lead.timeline && /quarter|month|asap|soon|this|next|urgent|immediate/i.test(String(lead.timeline))) {
      score += 15;
      reasons.push('Near-term timeline (+15)');
    }
    if (lead.company && String(lead.company).length > 2) {
      score += 5;
      reasons.push('Company identified (+5)');
    }

    // Cap at 100 for clean reporting
    if (score > 100) score = 100;

    const action = score >= 70 ? 'qualify' : score >= 40 ? 'nurture' : 'disqualify';

    const result = {
      success: true,
      score,
      max_score: 100,
      recommended_action: action,
      reason: reasons.join('; ') || 'Insufficient data for strong score',
      summary: `Lead scored ${score}/100 → ${action.toUpperCase()}`,
      lead_received: {
        name: lead.name || null,
        email: lead.email || null,
        company: lead.company || null,
        title: lead.title || null
      },
      timestamp: new Date().toISOString(),
      agent: 'Live Lead Qualification Agent v1.0'
    };

    res.status(200).json(result);

    // Deliver qualifying leads to Long's Holdings by email (fire-and-forget;
    // the response above is already sent and never depends on this).
    if (action === 'qualify') {
      return forwardQualifiedLead(lead, result);
    }
    return;
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', details: String(err.message) });
  }
}
