"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CalendarClock, MapPin, Trash2 } from "lucide-react";
import {
  deleteDemoAttendanceOlderThan,
  deleteDemoAttendanceRecord,
  getDemoAttendanceRecords,
  type DemoAttendanceRecord,
} from "@/lib/demo-attendance";

export type AdminAttendanceRecord = {
  id: string;
  fullName: string;
  email: string;
  selfieUrl: string;
  selfiePath: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  checkedInAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type AdminBoardProps = {
  mode?: "demo" | "live";
  initialRecords?: AdminAttendanceRecord[];
};

export function AdminBoard({
  mode = "demo",
  initialRecords = [],
}: AdminBoardProps) {
  const [records, setRecords] = useState<AdminAttendanceRecord[]>(() => {
    if (mode === "live") {
      return initialRecords;
    }

    if (typeof window === "undefined") {
      return [];
    }

    return getDemoAttendanceRecords().map((record) => ({
      id: record.id,
      fullName: record.fullName,
      email: record.email,
      selfieUrl: record.selfieDataUrl,
      selfiePath: record.id,
      latitude: record.latitude,
      longitude: record.longitude,
      locationName: record.locationName,
      checkedInAt: record.checkedInAt,
    }));
  });
  const [retentionDays, setRetentionDays] = useState(7);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = records.filter(
      (record) => new Date(record.checkedInAt).toDateString() === today,
    ).length;
    const uniqueUsers = new Set(records.map((record) => record.email)).size;

    return { todayCount, uniqueUsers };
  }, [records]);

  async function deleteRecord(record: AdminAttendanceRecord) {
    setActionMessage(null);

    if (mode === "demo") {
      const updatedRecords = deleteDemoAttendanceRecord(record.id).map((item) => ({
        id: item.id,
        fullName: item.fullName,
        email: item.email,
        selfieUrl: item.selfieDataUrl,
        selfiePath: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        locationName: item.locationName,
        checkedInAt: item.checkedInAt,
      }));
      setRecords(updatedRecords);
      return;
    }

    const response = await fetch("/api/admin/attendance", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: record.id }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setActionMessage(payload.message ?? "Could not delete this record.");
      return;
    }

    setRecords((current) => current.filter((item) => item.id !== record.id));
  }

  async function cleanupOldRecords() {
    setActionMessage(null);

    if (mode === "demo") {
      const updatedRecords = deleteDemoAttendanceOlderThan(retentionDays).map(
        (record: DemoAttendanceRecord) => ({
          id: record.id,
          fullName: record.fullName,
          email: record.email,
          selfieUrl: record.selfieDataUrl,
          selfiePath: record.id,
          latitude: record.latitude,
          longitude: record.longitude,
          locationName: record.locationName,
          checkedInAt: record.checkedInAt,
        }),
      );
      setRecords(updatedRecords);
      return;
    }

    const response = await fetch("/api/admin/attendance/cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ retentionDays }),
    });

    const payload = (await response.json()) as {
      deletedIds?: string[];
      message?: string;
    };

    if (!response.ok) {
      setActionMessage(payload.message ?? "Could not delete old records.");
      return;
    }

    setRecords((current) =>
      current.filter((record) => !payload.deletedIds?.includes(record.id)),
    );
  }

  return (
    <section className="admin-grid" aria-label="Attendance admin tools">
      <div className="panel admin-tools">
        <h2>Overview</h2>
        <div className="admin-metrics">
          <div className="metric">
            <span>Today</span>
            <strong>{stats.todayCount}</strong>
          </div>
          <div className="metric">
            <span>Total records</span>
            <strong>{records.length}</strong>
          </div>
          <div className="metric">
            <span>People</span>
            <strong>{stats.uniqueUsers}</strong>
          </div>
        </div>

        <div className="cleanup-box">
          <h3>Picture cleanup</h3>
          <p>
            Delete check-in pictures older than your selected retention window.
          </p>
          <div className="cleanup-row">
            <label htmlFor="retentionDays">Keep last</label>
            <input
              id="retentionDays"
              min={1}
              onChange={(event) => setRetentionDays(Number(event.target.value))}
              type="number"
              value={retentionDays}
            />
            <span>days</span>
          </div>
          <button className="button" onClick={cleanupOldRecords} type="button">
            <Trash2 size={18} aria-hidden="true" />
            Delete old pictures
          </button>
          {actionMessage ? <div className="notice error">{actionMessage}</div> : null}
        </div>
      </div>

      <div className="panel records-panel">
        <div className="records-heading">
          <div>
            <h2>Check-in records</h2>
            <p className="panel-subtitle">
              {mode === "live"
                ? "Live check-ins from Supabase, newest first."
                : "Demo records are saved in this browser."}
            </p>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            No check-ins yet. Go to the capture page and submit one record.
          </div>
        ) : (
          <div className="record-list">
            {records.map((record) => (
              <article className="record-card" key={record.id}>
                <Image
                  alt={`${record.fullName} selfie`}
                  height={96}
                  src={record.selfieUrl}
                  unoptimized
                  width={96}
                />
                <div className="record-body">
                  <div>
                    <h3>{record.fullName}</h3>
                    <p>{record.email}</p>
                  </div>
                  <div className="record-meta">
                    <span>
                      <CalendarClock size={16} aria-hidden="true" />
                      {formatDate(record.checkedInAt)}
                    </span>
                    <span>
                      <MapPin size={16} aria-hidden="true" />
                      {record.locationName ??
                        `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`}
                    </span>
                  </div>
                </div>
                <button
                  aria-label={`Delete ${record.fullName} picture`}
                  className="ghost-button danger-button"
                  onClick={() => deleteRecord(record)}
                  type="button"
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
