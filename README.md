# Live Lead Qualification Agent

**Public production endpoint** that scores inbound leads in real time.

## Live Endpoint

After Vercel deployment the URL will be:
`https://live-lead-qualifier-agent.vercel.app/api/qualify`

(Exact URL appears in the Vercel dashboard after first deploy.)

## How to call it

```bash
curl -X POST https://YOUR-DEPLOYMENT.vercel.app/api/qualify \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Rivera",
    "email": "alex@growthco.io",
    "company": "GrowthCo",
    "title": "Head of Revenue Operations",
    "message": "We process 200+ inbound leads per week manually. Looking for an AI system that can score and enrich them automatically before they hit our CRM.",
    "budget": "5k-15k",
    "timeline": "this quarter"
  }'
```

## Response example
```json
{
  "success": true,
  "score": 100,
  "recommended_action": "qualify",
  "summary": "Lead scored 100/100 → QUALIFY",
  ...
}
```

## Monetization
- Sell access to this endpoint as a micro-SaaS
- Use it as the backend for client projects
- Embed it in your own lead forms

MIT License – ready for commercial use.
