import * as Sentry from '@sentry/nextjs'

type IntakeRoute = 'intake-form' | 'intake-response'

/**
 * Logs intake API failures: full details in development; Sentry + non-PII tags in production.
 */
export function logIntakeRouteError(
  route: IntakeRoute,
  phase: string,
  error: unknown,
  context?: Record<string, string | undefined>
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${route}:${phase}]`, error, context)
    return
  }

  const err = error instanceof Error ? error : new Error(String(error))
  Sentry.captureException(err, {
    tags: { 'intake.route': route, 'intake.phase': phase },
    extra: context ? Object.fromEntries(Object.entries(context).filter(([, v]) => v !== undefined)) : undefined,
  })
}
