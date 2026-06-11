"use client";

import { getDemoUser } from "@/lib/demo-session";

export type DemoAttendanceRecord = {
  id: string;
  fullName: string;
  email: string;
  selfieDataUrl: string;
  latitude: number;
  longitude: number;
  checkedInAt: string;
};

const demoAttendanceKey = "attendance_demo_records";

export function getDemoAttendanceRecords() {
  const raw = localStorage.getItem(demoAttendanceKey);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as DemoAttendanceRecord[];
  } catch {
    localStorage.removeItem(demoAttendanceKey);
    return [];
  }
}

export function saveDemoAttendanceRecord(record: {
  selfieDataUrl: string;
  latitude: number;
  longitude: number;
}) {
  const user = getDemoUser();
  const records = getDemoAttendanceRecords();
  const nextRecord: DemoAttendanceRecord = {
    id: crypto.randomUUID(),
    fullName: user?.fullName || "Demo User",
    email: user?.email || "demo@example.com",
    selfieDataUrl: record.selfieDataUrl,
    latitude: record.latitude,
    longitude: record.longitude,
    checkedInAt: new Date().toISOString(),
  };

  localStorage.setItem(demoAttendanceKey, JSON.stringify([nextRecord, ...records]));
  return nextRecord;
}

export function deleteDemoAttendanceRecord(id: string) {
  const records = getDemoAttendanceRecords().filter((record) => record.id !== id);
  localStorage.setItem(demoAttendanceKey, JSON.stringify(records));
  return records;
}

export function deleteDemoAttendanceOlderThan(days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = getDemoAttendanceRecords().filter(
    (record) => new Date(record.checkedInAt).getTime() >= cutoff,
  );
  localStorage.setItem(demoAttendanceKey, JSON.stringify(records));
  return records;
}
