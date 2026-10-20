import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  ArrowRight,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationSummary {
  _id: string;
  job_id: string;
  job_title: string;
  organization_name: string;
  application_status: string;
  current_round?: string;
  slot_date?: string;
  slot_start_time?: string;
  applied_at?: string;
}

interface InterviewCalendarCardProps {
  applications: ApplicationSummary[];
}

interface ScheduledEvent {
  applicationId: string;
  jobTitle: string;
  organization: string;
  round: string;
  date: Date;
  dateString: string;
  timeString: string;
  status: string;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) {
    return direct;
  }
  // Try DD-MM-YYYY or DD/MM/YYYY
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function isSameDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const InterviewCalendarCard: React.FC<InterviewCalendarCardProps> = ({ applications }) => {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Parse all scheduled events from applications
  const scheduledEvents: ScheduledEvent[] = useMemo(() => {
    return applications
      .filter((app) => Boolean(app.slot_date))
      .map((app) => {
        const parsed = parseDate(app.slot_date);
        return {
          applicationId: app._id,
          jobTitle: app.job_title,
          organization: app.organization_name || "Company",
          round: app.current_round || "Interview",
          date: parsed || new Date(),
          dateString: app.slot_date || "",
          timeString: app.slot_start_time || "Time not specified",
          status: app.application_status,
        };
      })
      .filter((event) => event.date !== null);
  }, [applications]);

  // Find the next upcoming interview anywhere in the future
  const nextUpcomingEvent = useMemo(() => {
    const futureEvents = scheduledEvents
      .filter((e) => e.date >= new Date(today.setHours(0, 0, 0, 0)))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return futureEvents[0] || null;
  }, [scheduledEvents, today]);

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-based index (0 = Monday, 6 = Sunday)

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  // Events on the currently selected date
  const selectedDateEvents = useMemo(() => {
    return scheduledEvents.filter((event) => isSameDate(event.date, selectedDate));
  }, [scheduledEvents, selectedDate]);

  return (
    <GlassCard variant="default" className="p-5 space-y-4">
      {/* Header with Title and Month Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Interview Schedule</h3>
            <p className="text-[11px] text-muted-foreground">
              {scheduledEvents.length > 0
                ? `${scheduledEvents.length} scheduled session${scheduledEvents.length > 1 ? "s" : ""}`
                : "Calendar & date planner"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleJumpToToday}
          className="text-xs px-2 py-1 rounded-md text-primary hover:bg-primary/10 border border-primary/20 transition-colors font-medium"
        >
          Today
        </button>
      </div>

      {/* Month Navigation Strip */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-sm font-medium text-foreground tracking-tight">
          {monthName} <span className="text-muted-foreground">{year}</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day of Week Labels */}
      <div className="grid grid-cols-7 text-center">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="text-[11px] font-medium text-muted-foreground py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty slots for days before the 1st of month */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dateForDay = new Date(year, month, dayNumber);
          const isToday = isSameDate(dateForDay, today);
          const isSelected = isSameDate(dateForDay, selectedDate);
          const hasInterview = scheduledEvents.some((event) => isSameDate(event.date, dateForDay));

          return (
            <button
              key={dayNumber}
              type="button"
              onClick={() => setSelectedDate(dateForDay)}
              className={cn(
                "h-8 rounded-lg text-xs font-medium transition-all relative flex flex-col items-center justify-center",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : isToday
                  ? "border border-primary/50 text-primary hover:bg-primary/10"
                  : "text-foreground hover:bg-muted/50"
              )}
            >
              <span>{dayNumber}</span>
              {/* Event Indicator Dot */}
              {hasInterview && (
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full absolute bottom-1",
                    isSelected ? "bg-primary-foreground" : "bg-primary animate-pulse"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda / Event List */}
      <div className="pt-3 border-t border-border/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {selectedDate.toLocaleDateString("default", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {selectedDateEvents.length > 0
              ? `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? "s" : ""}`
              : "No sessions"}
          </span>
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-2">
            {selectedDateEvents.map((event) => (
              <div
                key={event.applicationId}
                className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">{event.jobTitle}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 capitalize">
                    {event.round}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <span className="line-clamp-1">{event.organization}</span>
                  {event.timeString && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-foreground">
                        <Clock className="w-3 h-3 text-primary" />
                        {event.timeString}
                      </span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/candidate/interviews")}
                  className="w-full mt-1.5 py-1.5 px-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  Join / View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-border/40 bg-muted/10 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No interview sessions on this day.</p>
            {nextUpcomingEvent ? (
              <div className="pt-2 border-t border-border/30 text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Next Upcoming Session
                </p>
                <p className="text-xs font-medium text-foreground mt-0.5">
                  {nextUpcomingEvent.jobTitle} at {nextUpcomingEvent.organization}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextUpcomingEvent.dateString} {nextUpcomingEvent.timeString ? `• ${nextUpcomingEvent.timeString}` : ""}
                </p>
              </div>
            ) : (
              <Link
                to="/candidate/practice"
                className="inline-block text-xs text-primary hover:underline font-medium"
              >
                Use this free time for Practice →
              </Link>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default InterviewCalendarCard;
