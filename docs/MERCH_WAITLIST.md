# Condor merch waitlist

The `/merch` page posts launch-interest emails to:

`POST /api/merch-waitlist`

The serverless function does not persist personal data locally. It forwards a
minimal payload to a configured HTTPS webhook.

## Required Vercel environment variable

- `MERCH_WAITLIST_WEBHOOK_URL` — HTTPS endpoint for the mailing-list, form,
  CRM, Make/Zapier flow, or other approved capture service.

Optional:

- `MERCH_WAITLIST_WEBHOOK_TOKEN` — sent as `Authorization: Bearer ...`.

Payload:

```json
{
  "email": "person@example.com",
  "source": "merch-hero",
  "createdAt": "2026-09-12T00:00:00.000Z"
}
```

Until `MERCH_WAITLIST_WEBHOOK_URL` is configured, the endpoint fails closed
with HTTP 503 and the page tells the visitor the waitlist is temporarily
unavailable. No email address is written to the repository, filesystem, or
application logs by this handler.
