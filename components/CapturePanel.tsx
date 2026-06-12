"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, MapPin, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { env } from "@/lib/env";
import { saveDemoAttendanceRecord } from "@/lib/demo-attendance";

type Position = {
  latitude: number;
  longitude: number;
  label?: string;
  coordinates: string;
};

type CheckInState = "idle" | "ready" | "submitting" | "success" | "error";

export function CapturePanel() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [state, setState] = useState<CheckInState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function enableCamera() {
    setMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState("ready");
    } catch {
      setState("error");
      setMessage("Camera permission was blocked or no camera was found.");
    }
  }

  async function getLocation() {
    setMessage(null);

    if (!navigator.geolocation) {
      setState("error");
      setMessage("This browser does not support location access.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (result) => {
        const latitude = result.coords.latitude;
        const longitude = result.coords.longitude;
        const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        setPosition({ latitude, longitude, coordinates });
        setIsResolvingLocation(true);

        try {
          const response = await fetch(
            `/api/location/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
          );

          if (response.ok) {
            const payload = (await response.json()) as {
              label?: string;
              coordinates?: string;
            };

            setPosition({
              latitude,
              longitude,
              coordinates: payload.coordinates ?? coordinates,
              label: payload.label,
            });
          }
        } finally {
          setIsResolvingLocation(false);
        }
      },
      () => {
        setState("error");
        setMessage("Location permission was blocked.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function submitCheckIn() {
    setMessage(null);

    if (!videoRef.current || !canvasRef.current || !position) {
      setState("error");
      setMessage("Allow camera and location before checking in.");
      return;
    }

    setState("submitting");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setState("error");
      setMessage("Could not capture the selfie.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.88);
    });

    if (!blob) {
      setState("error");
      setMessage("Could not prepare the selfie image.");
      return;
    }

    const selfieDataUrl = canvas.toDataURL("image/jpeg", 0.74);

    const formData = new FormData();
    formData.append("selfie", blob, "selfie.jpg");
    formData.append("latitude", String(position.latitude));
    formData.append("longitude", String(position.longitude));
    if (position.label) {
      formData.append("locationName", position.label);
    }

    const response = await fetch("/api/attendance/check-in", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setState("error");
      setMessage(payload.message ?? "Check-in failed.");
      return;
    }

    if (env.isDemoMode) {
      saveDemoAttendanceRecord({
        selfieDataUrl,
        latitude: position.latitude,
        longitude: position.longitude,
        locationName: position.label,
      });
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState("success");
    setMessage("Check in successful");
    router.push("/capture/success");
  }

  const hasCamera = state === "ready" || state === "submitting" || state === "success";
  const canSubmit = hasCamera && Boolean(position) && state !== "submitting";

  return (
    <div style={{ marginTop: 26 }}>
      <div className="camera-box">
        <video
          aria-label="Live camera preview"
          muted
          playsInline
          ref={videoRef}
          style={{ display: hasCamera ? "block" : "none" }}
        />
        {!hasCamera ? (
          <div className="empty-camera">
            <span>Camera preview will appear here after permission is allowed.</span>
          </div>
        ) : null}
        <canvas hidden ref={canvasRef} />
      </div>

      <div className="capture-actions">
        <button className="ghost-button" onClick={enableCamera} type="button">
          <Camera size={18} aria-hidden="true" />
          Enable camera
        </button>
        <button className="ghost-button" onClick={getLocation} type="button">
          <MapPin size={18} aria-hidden="true" />
          {isResolvingLocation
            ? "Finding address..."
            : position
              ? "Location ready"
              : "Allow location"}
        </button>
        <button
          className="button"
          disabled={!canSubmit}
          onClick={submitCheckIn}
          type="button"
        >
          <Send size={18} aria-hidden="true" />
          {state === "submitting" ? "Checking in..." : "Check in"}
        </button>
      </div>

      {position ? (
        <div className="location-preview">
          <MapPin size={18} aria-hidden="true" />
          <div>
            <strong>{position.label ?? "Location captured"}</strong>
            <span>{position.coordinates}</span>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className={`notice ${state === "success" ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
