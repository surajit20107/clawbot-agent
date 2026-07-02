import "server-only";
import { CronExpressionParser } from "cron-parser";

export function computeNextRunAt(
  expression: string,
  timezone: string,
  from: Date = new Date()
): Date {
  const interval = CronExpressionParser.parse(expression, {
    currentDate: from,
    tz: timezone,
  });
  return interval.next().toDate();
}

export function validateCronExpression(
  expression: string,
  timezone = "UTC"
): { valid: true } | { valid: false; error: string } {
  try {
    CronExpressionParser.parse(expression, { tz: timezone });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid cron expression",
    };
  }
}
