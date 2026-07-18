export type Period = {
  start: Date;
  end: Date;
};

export function createCalendarMonthPeriod(date = new Date()): Period {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  };
}
