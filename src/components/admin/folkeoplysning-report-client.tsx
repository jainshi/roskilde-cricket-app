"use client";

import React, { useState, useTransition } from "react";
import { exportFolkeoplysningCsvAction } from "@/modules/teams-matches/actions/attendance.actions";
import { FolkeoplysningReportData } from "@/modules/teams-matches/services/folkeoplysning.service";

interface SquadOption {
  id: string;
  name: string;
}

interface FacilityOption {
  id: string;
  name: string;
}

interface FolkeoplysningReportClientProps {
  initialReport: FolkeoplysningReportData;
  squads: SquadOption[];
  facilities: FacilityOption[];
}

export function FolkeoplysningReportClient({
  initialReport,
  squads,
  facilities,
}: FolkeoplysningReportClientProps) {
  const [report, setReport] = useState<FolkeoplysningReportData>(initialReport);
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [squadId, setSquadId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleApplyFilter = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await exportFolkeoplysningCsvAction({
        startDate: startDate || null,
        endDate: endDate || null,
        squadId: squadId || null,
        facilityId: facilityId || null,
      });

      if (res.success && res.data) {
        setReport(res.data);
        setFeedback({
          type: "success",
          text: `Loaded ${res.data.rows.length} attendance records.`,
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to load report data.",
        });
      }
    });
  };

  const handleDownloadCsv = () => {
    if (!report.csv) return;
    const blob = new Blob(["\uFEFF" + report.csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `folkeoplysning-attendance-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Municipal Grant & Subsidy KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
            Attending Sessions
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {report.summary.attendingSessions}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {report.summary.uniqueParticipants} unique members
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
            Youth Grant (&lt;18)
          </span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {report.summary.under18Sessions}
          </span>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block font-medium">
            Roskilde Kommune Youth Subsidy
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">
            Young Adults (18-24)
          </span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">
            {report.summary.youngAdultSessions}
          </span>
          <span className="text-[11px] text-blue-600/80 mt-0.5 block font-medium">
            Folkeoplysning § Subsidy
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Adults (25+)
          </span>
          <span className="text-2xl font-bold text-slate-800 mt-1 block">
            {report.summary.adultSessions}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Club Senior Activities
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
            Total Records
          </span>
          <span className="text-2xl font-bold text-slate-800 mt-1 block">
            {report.summary.totalAttendanceRecords}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Includes excused & no-shows
          </span>
        </div>
      </div>

      {/* Filter Toolbar & CSV Export */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Municipal Audit Filters
            </h3>
            <p className="text-xs text-slate-500">
              Filter by date range, squad, or facility for municipal grant declarations.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={report.rows.length === 0}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            📥 Download Municipal CSV (UTF-8)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Squad
            </label>
            <select
              value={squadId}
              onChange={(e) => setSquadId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Squads</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Facility / Ground
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const year = new Date().getFullYear();
                setStartDate(`${year}-01-01`);
                setEndDate(`${year}-12-31`);
              }}
              className="text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-medium transition"
            >
              Current Year
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSquadId("");
                setFacilityId("");
              }}
              className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 transition"
            >
              Reset Filters
            </button>
          </div>

          <button
            type="button"
            onClick={handleApplyFilter}
            disabled={isPending}
            className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition active:scale-[0.98]"
          >
            {isPending ? "Filtering..." : "Apply Filters"}
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {/* Audit-Ready Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-sm">
            Attendance Log Preview ({report.rows.length} records)
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            UTF-8 Danish Municipal Subsidy Standard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Session Date</th>
                <th className="py-3 px-3">Squad</th>
                <th className="py-3 px-3">Session Type</th>
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3">Member Name</th>
                <th className="py-3 px-3 text-center">Age</th>
                <th className="py-3 px-3">Age Bracket</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Arrival</th>
                <th className="py-3 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row, idx) => {
                const dateStr = new Date(row.sessionDate).toISOString().split("T")[0];
                const age =
                  row.dateOfBirth
                    ? new Date(row.sessionDate).getFullYear() -
                      new Date(row.dateOfBirth).getFullYear()
                    : null;

                const isYouth = age !== null && age < 18;
                const isYoungAdult = age !== null && age >= 18 && age <= 24;

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                      {dateStr}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {row.squadName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.sessionType.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]">
                      {row.facilityName}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {row.memberName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {age !== null ? age : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      {isYouth ? (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          Youth (&lt;18)
                        </span>
                      ) : isYoungAdult ? (
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200">
                          18-24
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          25+
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          row.attendanceStatus === "PRESENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.attendanceStatus === "LATE"
                            ? "bg-amber-100 text-amber-800"
                            : row.attendanceStatus === "ABSENT_EXCUSED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {row.attendanceStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {row.arrivalTime
                        ? new Date(row.arrivalTime).toISOString().substring(11, 16)
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-[120px]">
                      {row.recordedByName}
                    </td>
                  </tr>
                );
              })}

              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No attendance records found matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
