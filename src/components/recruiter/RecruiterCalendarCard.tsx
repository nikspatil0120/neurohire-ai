import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Users,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecruiterApplication {
  _id: string;
  candidate_id?: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id: string;
  job_title: string;
  organization_name?: string;
  slot_id?: string;
  slot_date?: string;
  slot_start_time?: string;
  slot_label?: string;
  application_status: string;
  current_round?: string;
}

export interface CalendarJob {
  _id: string;
  title: string;
  created_at: string;
  status?: string;
  experience?: string;
  organization_name?: string;
  is_active?: boolean;
}

interface RecruiterCalendarCardProps {
  applications: RecruiterApplication[];
  jobs?: CalendarJob[];
}

interface ScheduledEvent {
  applicationId: string;
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  round: string;
  date: Date;
  dateString: string;
  timeString: string;
  status: string;
}

interface JobCreatedEvent {
  jobId: string;
  title: string;
  experience: string;
  status: string;
  organizationName: string;
  date: Date;
  dateString: string;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  // Handle YYYY-MM-DD explicitly to prevent UTC timezone date-shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
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

const RecruiterCalendarCard: React.FC<RecruiterCalendarCardProps> = ({ applications, jobs = [] }) => {
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
          candidateName: app.candidate_name || app.candidate_email || "Candidate",
          candidateEmail: app.candidate_email,
          jobTitle: app.job_title,
          round: app.current_round || "Interview",
          date: parsed || new Date(),
          dateString: app.slot_date || "",
          timeString: app.slot_start_time || "Time TBD",
          status: app.application_status,
        };
      })
      .filter((event) => event.date !== null);
  }, [applications]);

  // Parse all job creation events
  const jobCreatedEvents: JobCreatedEvent[] = useMemo(() => {
    return jobs
      .filter((job) => Boolean(job.created_at))
      .map((job) => {
        const parsed = parseDate(job.created_at);
        return {
          jobId: job._id,
          title: job.title,
          experience: job.experience || "Any experience",
          status: job.status || "published",
          organizationName: job.organization_name || "",
          date: parsed || new Date(),
          dateString: job.created_at,
        };
      })
      .filter((event) => event.date !== null);
  }, [jobs]);

  // Find the next upcoming interview anywhere in the future
  const nextUpcomingEvent = useMemo(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const futureEvents = scheduledEvents
      .filter((e) => e.date >= todayMidnight)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return futureEvents[0] || null;
  }, [scheduledEvents]);

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-based index

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
  const selectedDateInterviews = useMemo(() => {
    return scheduledEvents.filter((event) => isSameDate(event.date, selectedDate));
  }, [scheduledEvents, selectedDate]);

  const selectedDateJobs = useMemo(() => {
    return jobCreatedEvents.filter((event) => isSameDate(event.date, selectedDate));
  }, [jobCreatedEvents, selectedDate]);

  return (
    <GlassCard variant="default" className="p-5 space-y-4 border-border/50">
      {/* Header with Title and Month Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Interview & Jobs Calendar</h3>
            <p className="text-[11px] text-muted-foreground">
              {jobCreatedEvents.length} roles opened • {scheduledEvents.length} interview slots
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleJumpToToday}
          className="text-xs px-2.5 py-1 rounded-md text-primary hover:bg-primary/10 border border-primary/20 transition-colors font-medium"
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

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1 pb-1 border-b border-border/30 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
          <span>Job Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
          <span>Interview Session</span>
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
          <div key={`empty-${idx}`} className="h-9" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dateForDay = new Date(year, month, dayNumber);
          const isToday = isSameDate(dateForDay, today);
          const isSelected = isSameDate(dateForDay, selectedDate);
          
          const dayJobs = jobCreatedEvents.filter((job) => isSameDate(job.date, dateForDay));
          const dayInterviews = scheduledEvents.filter((event) => isSameDate(event.date, dateForDay));
          const hasJobs = dayJobs.length > 0;
          const hasInterviews = dayInterviews.length > 0;

          // Compute column index for smart tooltip alignment (0 = Mo, 6 = Su)
          const colIndex = (firstDayIndex + idx) % 7;
          const tooltipAlignClass =
            colIndex <= 1
              ? "left-0 translate-x-0"
              : colIndex >= 5
              ? "right-0 left-auto translate-x-0"
              : "left-1/2 -translate-x-1/2";

          return (
            <div key={dayNumber} className="relative group">
              <button
                type="button"
                onClick={() => setSelectedDate(dateForDay)}
                className={cn(
                  "w-full h-9 rounded-lg text-xs font-medium transition-all relative flex flex-col items-center justify-center",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : isToday
                    ? "border border-primary/50 text-primary hover:bg-primary/10"
                    : hasJobs
                    ? "border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                    : "text-foreground hover:bg-muted/50"
                )}
              >
                <span>{dayNumber}</span>

                {/* Event Indicator Dots */}
                {(hasJobs || hasInterviews) && (
                  <div className="flex items-center gap-1 absolute bottom-1">
                    {hasJobs && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white" : "bg-purple-400"
                        )}
                        title={`${dayJobs.length} Job(s) Created`}
                      />
                    )}
                    {hasInterviews && (
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white" : "bg-primary animate-pulse"
                        )}
                        title={`${dayInterviews.length} Interview(s)`}
                      />
                    )}
                  </div>
                )}
              </button>

              {/* ── Hover Tooltip: Shows details of jobs created & interviews ── */}
              {(hasJobs || hasInterviews) && (
                <div
                  className={cn(
                    "absolute bottom-full mb-2 hidden group-hover:flex flex-col z-50 w-56 p-2.5 rounded-xl bg-card border border-border shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-150 animate-in fade-in-0 zoom-in-95",
                    tooltipAlignClass
                  )}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40 text-[11px] font-semibold text-foreground">
                    <span>
                      {dateForDay.toLocaleDateString("default", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {hasJobs ? `${dayJobs.length} Job${dayJobs.length > 1 ? "s" : ""}` : ""}
                      {hasJobs && hasInterviews ? " • " : ""}
                      {hasInterviews ? `${dayInterviews.length} Session${dayInterviews.length > 1 ? "s" : ""}` : ""}
                    </span>
                  </div>

                  {/* Jobs Created Preview */}
                  {hasJobs && (
                    <div className="mt-1.5 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Jobs Created
                      </p>
                      {dayJobs.slice(0, 2).map((job) => (
                        <div key={job.jobId} className="bg-purple-500/10 border border-purple-500/20 rounded p-1.5">
                          <p className="text-xs font-medium text-foreground line-clamp-1">{job.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{job.experience}</span>
                            <span>•</span>
                            <span className="capitalize text-purple-300">{job.status}</span>
                          </div>
                        </div>
                      ))}
                      {dayJobs.length > 2 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{dayJobs.length - 2} more job{dayJobs.length - 2 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Interviews Preview */}
                  {hasInterviews && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/30 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Interviews Scheduled
                      </p>
                      {dayInterviews.slice(0, 2).map((interview) => (
                        <div key={interview.applicationId} className="text-[11px] text-muted-foreground">
                          <span className="text-foreground font-medium">{interview.candidateName}</span>
                          <span className="text-[10px]"> — {interview.jobTitle}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground mt-2 pt-1 border-t border-border/20 text-center italic">
                    Click date to view details
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Agenda / Event List */}
      <div className="pt-3 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {selectedDate.toLocaleDateString("default", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {selectedDateJobs.length > 0 && `${selectedDateJobs.length} job${selectedDateJobs.length > 1 ? "s" : ""} opened`}
            {selectedDateJobs.length > 0 && selectedDateInterviews.length > 0 && " • "}
            {selectedDateInterviews.length > 0 && `${selectedDateInterviews.length} interview${selectedDateInterviews.length > 1 ? "s" : ""}`}
            {selectedDateJobs.length === 0 && selectedDateInterviews.length === 0 && "No events"}
          </span>
        </div>

        {/* 1. Jobs Created on this Date */}
        {selectedDateJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-400" />
              Jobs Opened on this Day
            </p>
            {selectedDateJobs.map((job) => (
              <div
                key={job.jobId}
                className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-1.5 hover:bg-purple-500/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">{job.title}</h4>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                      job.status === "published"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-muted-foreground" />
                  <span>{job.organizationName || "Company"}</span>
                  <span>•</span>
                  <span>{job.experience}</span>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/recruiter/applicants?jobId=${job.jobId}`)}
                    className="flex-1 py-1 px-2 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-xs font-medium transition-colors flex items-center justify-center gap-1 border border-purple-500/30"
                  >
                    <Users className="w-3 h-3" />
                    View Applicants
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/recruiter/edit-job/${job.jobId}`)}
                    className="py-1 px-2.5 rounded-md bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors border border-border/40"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Scheduled Interviews on this Date */}
        {selectedDateInterviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Scheduled Candidate Interviews
            </p>
            {selectedDateInterviews.map((event) => (
              <div
                key={event.applicationId}
                className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-1.5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-primary" />
                    {event.candidateName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 text-primary border border-primary/20 capitalize">
                    {event.round}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="line-clamp-1">{event.jobTitle}</span>
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
                  onClick={() => navigate(`/recruiter/applicants`)}
                  className="w-full mt-1.5 py-1 px-2 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1 border border-primary/20"
                >
                  Review Candidate
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. Empty State for Selected Date */}
        {selectedDateJobs.length === 0 && selectedDateInterviews.length === 0 && (
          <div className="p-3 rounded-lg border border-border/40 bg-muted/10 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No jobs created or interviews on this day.</p>
            {nextUpcomingEvent ? (
              <div className="pt-2 border-t border-border/30 text-left">
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Next Upcoming Interview
                </p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {nextUpcomingEvent.candidateName} — {nextUpcomingEvent.jobTitle}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextUpcomingEvent.dateString} {nextUpcomingEvent.timeString ? `• ${nextUpcomingEvent.timeString}` : ""}
                </p>
              </div>
            ) : (
              <Link
                to="/recruiter/create-job"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Briefcase className="w-3 h-3" />
                Create a new job posting →
              </Link>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default RecruiterCalendarCard;
