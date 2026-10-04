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

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', details: String(err.message) });
  }
}
