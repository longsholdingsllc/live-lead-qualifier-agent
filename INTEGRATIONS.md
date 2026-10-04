# Integrations Completed

The Live Lead Qualifier client has been added to the following repositories:

| Repository | Location |
|------------|----------|
| **Income-** | `frontend/src/lib/lead-qualifier.js` + `backend/lead_qualifier.py` |
| **Field-service-AI-** | `frontend/src/lib/lead-qualifier.js` + `backend/lead_qualifier.py` |
| **surplus-funds-recovery-os** | `lib/lead-qualifier.ts` + `app/api/qualify-lead/route.ts` |
| **lead-qualifier-client** (shared) | Full reusable package |

## How to use inside each app

### React / Frontend (Income- & Field-service-AI-)
```js
import { qualifyLead } from '../lib/lead-qualifier';

const result = await qualifyLead({ name, email, company, title, message, budget, timeline });
```

### Python Backend
```python
from lead_qualifier import qualify_lead

result = await qualify_lead(lead_dict)
```

### Next.js (surplus-funds-recovery-os)
```ts
import { qualifyLead } from '@/lib/lead-qualifier';
// or call the new API route: POST /api/qualify-lead
```
