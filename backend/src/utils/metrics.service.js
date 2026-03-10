import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const BUSINESS_TZ = process.env.BUSINESS_TZ || "America/Argentina/Buenos_Aires";

export function getDateContext(referenceDate = new Date()) {
  const now = dayjs(referenceDate).tz(BUSINESS_TZ);
  const today = now.format("YYYY-MM-DD");
  const currentTime = now.format("HH:mm:ss");

  return { now, today, currentTime };
}

export function monthBoundaries(referenceDate = new Date()) {
  const now = dayjs(referenceDate).tz(BUSINESS_TZ);
  const currentStart = now.startOf("month");
  const currentEnd = now.endOf("month");
  const previousStart = currentStart.subtract(1, "month");
  const previousEnd = currentStart.subtract(1, "day").endOf("day");

  return {
    currentStart: currentStart.toDate(),
    currentEnd: currentEnd.toDate(),
    previousStart: previousStart.toDate(),
    previousEnd: previousEnd.toDate(),
  };
}

export function percentageChange(current, previous) {
  const safeCurrent = Number(current || 0);
  const safePrevious = Number(previous || 0);
  if (safePrevious === 0) {
    return safeCurrent === 0 ? 0 : 100;
  }
  return ((safeCurrent - safePrevious) / safePrevious) * 100;
}

export function pickNextAppointment({ overduePending, upcomingPending }) {
  // Critical rule: if an overdue pending appointment exists, it blocks progression.
  if (overduePending) {
    return {
      ...overduePending,
      blockedByOverdue: true,
    };
  }

  if (!upcomingPending) return null;
  return {
    ...upcomingPending,
    blockedByOverdue: false,
  };
}

export function parseCount(row, field = "count") {
  if (!row) return 0;
  return Number(row[field] ?? 0);
}
