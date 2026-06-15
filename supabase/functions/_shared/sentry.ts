/**
 * Sentry Telemetry Logger com suporte a correlation IDs para rastreamento fim-a-fim.
 */
export class SentryLogger {
  static logError(error: Error, req?: Request, correlationId?: string, additionalData?: any) {
    const cid = correlationId || req?.headers.get("correlation-id") || req?.headers.get("x-correlation-id") || "N/A";
    
    const errorPayload = {
      event: "error",
      name: error.name,
      message: error.message,
      stack: error.stack,
      correlationId: cid,
      timestamp: new Date().toISOString(),
      url: req?.url,
      method: req?.method,
      userAgent: req?.headers.get("user-agent"),
      ...additionalData
    };

    // Imprime no console estruturado (Sentry integra diretamente com logs de console no Supabase Edge)
    console.error(`[SENTRY ERROR] [CID: ${cid}]`, JSON.stringify(errorPayload, null, 2));
  }

  static logInfo(message: string, correlationId?: string, additionalData?: any) {
    const cid = correlationId || "N/A";
    
    const infoPayload = {
      event: "info",
      message,
      correlationId: cid,
      timestamp: new Date().toISOString(),
      ...additionalData
    };

    console.log(`[SENTRY INFO] [CID: ${cid}]`, JSON.stringify(infoPayload, null, 2));
  }
}
