import { neonConfig } from "@neondatabase/serverless"

/**
 * Points the Neon driver at a local WebSocket proxy (`host:port`, from
 * `DATABASE_WS_PROXY`), so tests and local runs reach a plain Postgres through
 * the same driver as production. Does nothing without a proxy.
 *
 * Call it once before the first `Pool` connects.
 */
export function configureNeon(proxy: string | undefined): void {
  if (!proxy) return

  // A function, not a string: the string form appends `?address=host:port`
  // from the connection string, which names the host side of the container.
  // The proxy's APPEND_PORT gives the destination instead.
  neonConfig.wsProxy = () => `${proxy}/v1`
  neonConfig.useSecureWebSocket = false
  neonConfig.pipelineTLS = false
  neonConfig.pipelineConnect = false
}
