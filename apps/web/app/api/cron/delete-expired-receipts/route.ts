import { runAuthority } from "@/lib/runs/binder"

// deleteExpiredReceipts deletes at most this many receipts per call.
const BATCH_SIZE = 1000

/**
 * Deletes the receipts of Run changes older than the delivery window, in
 * batches until a batch is not full. Vercel Cron calls it daily with
 * `Authorization: Bearer $CRON_SECRET`; any other request gets 401.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  let deleted = 0
  let batch: number

  do {
    batch = await runAuthority.deleteExpiredReceipts({ limit: BATCH_SIZE })
    deleted += batch
  } while (batch === BATCH_SIZE)

  return Response.json({ deleted })
}
