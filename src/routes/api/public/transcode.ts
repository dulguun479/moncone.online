import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin } from "@/lib/admin.server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// In-memory state for the active transcoding job on the server
interface TranscodeJob {
  status: "idle" | "running" | "completed" | "failed";
  fileName: string;
  outputName: string;
  progressTime: string;
  speed: string;
  totalDuration: string;
  percent: number;
  logs: string[];
  error: string | null;
  encrypt?: boolean;
}

let activeJob: TranscodeJob = {
  status: "idle",
  fileName: "",
  outputName: "",
  progressTime: "00:00:00.00",
  speed: "0.0x",
  totalDuration: "00:00:00.00",
  percent: 0,
  logs: [],
  error: null,
  encrypt: false,
};

let activeProcess: any = null;

// Helper to convert HH:MM:SS.MS to seconds
function durationToSeconds(durationStr: string): number {
  const parts = durationStr.split(":");
  if (parts.length !== 3) return 0;
  const hrs = parseFloat(parts[0]);
  const mins = parseFloat(parts[1]);
  const secs = parseFloat(parts[2]);
  return hrs * 3600 + mins * 60 + secs;
}

export const Route = createFileRoute("/api/public/transcode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Authentication & Admin authorization
          const authHeader = request.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });
          }
          const token = authHeader.replace("Bearer ", "");
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            }
          );
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data?.user) {
            return Response.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
          }

          // Assert admin
          await assertAdmin(data.user.id);

          // Scan root directory for MP4 files
          const rootDir = process.cwd();
          const files = fs.readdirSync(rootDir);
          const mp4Files = files
            .filter((f) => f.endsWith(".mp4"))
            .map((f) => {
              const stats = fs.statSync(path.join(rootDir, f));
              return {
                name: f,
                sizeBytes: stats.size,
                sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
                createdAt: stats.birthtime,
              };
            });

          // Scan public/videos directory for completed HLS folders
          const videoDir = path.join(rootDir, "public", "videos");
          const keysDir = path.join(rootDir, "keys");
          let hlsOutputs: { name: string; isEncrypted: boolean }[] = [];
          if (fs.existsSync(videoDir)) {
            const dirs = fs.readdirSync(videoDir);
            hlsOutputs = dirs
              .filter((d) => {
                const masterPath = path.join(videoDir, d, "master.m3u8");
                return fs.existsSync(masterPath);
              })
              .map((d) => {
                const keyPath = path.join(keysDir, `${d}.key`);
                return {
                  name: d,
                  isEncrypted: fs.existsSync(keyPath),
                };
              });
          }

          // Return both files list and current job status
          return Response.json({
            job: {
              status: activeJob.status,
              fileName: activeJob.fileName,
              outputName: activeJob.outputName,
              progressTime: activeJob.progressTime,
              speed: activeJob.speed,
              totalDuration: activeJob.totalDuration,
              percent: activeJob.percent,
              logs: activeJob.logs.slice(-50), // Send last 50 lines of logs
              error: activeJob.error,
              encrypt: activeJob.encrypt,
            },
            mp4Files,
            hlsOutputs,
          });
        } catch (e: any) {
          console.error("[transcode.ts GET handler]", e);
          return Response.json({ error: e.message || "Internal Server Error" }, { status: 500 });
        }
      },

      POST: async ({ request }) => {
        try {
          // Authentication & Admin authorization
          const authHeader = request.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });
          }
          const token = authHeader.replace("Bearer ", "");
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            }
          );
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data?.user) {
            return Response.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
          }

          // Assert admin
          await assertAdmin(data.user.id);

          const { fileName, outputName, encrypt } = (await request.json()) as {
            fileName: string;
            outputName: string;
            encrypt?: boolean;
          };

          if (!fileName || !outputName) {
            return Response.json({ error: "Missing fileName or outputName" }, { status: 400 });
          }

          if (activeJob.status === "running") {
            return Response.json({ error: "Another transcoding job is currently running." }, { status: 400 });
          }

          const rootDir = process.cwd();
          const inputPath = path.join(rootDir, fileName);
          if (!fs.existsSync(inputPath)) {
            return Response.json({ error: `File not found: ${fileName}` }, { status: 404 });
          }

          // Reset status
          activeJob = {
            status: "running",
            fileName,
            outputName,
            progressTime: "00:00:00.00",
            speed: "0.0x",
            totalDuration: "00:00:00.00",
            percent: 0,
            logs: [`Starting transcoding pipeline for ${fileName}...`],
            error: null,
            encrypt: !!encrypt,
          };

          // Trigger transcoding in background
          const transcoderScript = path.join(rootDir, "transcode.mjs");
          
          // Spawn transcode.mjs as a child process
          const procArgs = [transcoderScript, inputPath, outputName];
          if (encrypt) {
            procArgs.push("--encrypt");
          }
          const proc = spawn("node", procArgs, {
            cwd: rootDir,
          });

          activeProcess = proc;

          proc.stdout.on("data", (data) => {
            const line = data.toString().trim();
            if (line) {
              activeJob.logs.push(line);
              if (activeJob.logs.length > 500) activeJob.logs.shift();
            }
          });

          proc.stderr.on("data", (data) => {
            const line = data.toString();
            activeJob.logs.push(line.trim());
            if (activeJob.logs.length > 500) activeJob.logs.shift();

            // Extract total duration if not already found (e.g. Duration: 00:03:45.12)
            if (activeJob.totalDuration === "00:00:00.00" || !activeJob.totalDuration) {
              const durationMatch = line.match(/Duration:\s*(\d{2}:\d{2}:\d{2}.\d{2})/);
              if (durationMatch) {
                activeJob.totalDuration = durationMatch[1];
                activeJob.logs.push(`🎥 Detected video total duration: ${activeJob.totalDuration}`);
              }
            }

            // Extract current progress time and speed
            const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2}.\d{2})/);
            const speedMatch = line.match(/speed=\s*(\d+\.?\d*x)/);

            if (timeMatch) {
              activeJob.progressTime = timeMatch[1];
              if (speedMatch) {
                activeJob.speed = speedMatch[1];
              }

              // Calculate percentage
              if (activeJob.totalDuration && activeJob.totalDuration !== "00:00:00.00") {
                const totalSec = durationToSeconds(activeJob.totalDuration);
                const currentSec = durationToSeconds(activeJob.progressTime);
                if (totalSec > 0) {
                  activeJob.percent = Math.min(Math.round((currentSec / totalSec) * 100), 99);
                }
              }
            }
          });

          proc.on("close", (code) => {
            activeProcess = null;
            if (code === 0) {
              activeJob.status = "completed";
              activeJob.percent = 100;
              activeJob.logs.push(`✅ Transcoding completed successfully for ${fileName}!`);
            } else {
              activeJob.status = "failed";
              activeJob.error = `Transcoding process exited with code ${code}`;
              activeJob.logs.push(`❌ Transcoding process failed with code ${code}.`);
            }
          });

          return Response.json({ ok: true, message: "Transcoding started in background" });
        } catch (e: any) {
          console.error("[transcode.ts POST handler]", e);
          return Response.json({ error: e.message || "Internal Server Error" }, { status: 500 });
        }
      },

      DELETE: async ({ request }) => {
        try {
          // Authentication & Admin authorization
          const authHeader = request.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });
          }
          const token = authHeader.replace("Bearer ", "");
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
            }
          );
          const { data, error } = await supabase.auth.getUser(token);
          if (error || !data?.user) {
            return Response.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
          }

          // Assert admin
          await assertAdmin(data.user.id);

          if (activeProcess) {
            activeProcess.kill("SIGTERM");
            activeProcess = null;
            activeJob.status = "failed";
            activeJob.error = "Transcoding was manually cancelled by the administrator.";
            activeJob.logs.push("⚠️ Transcoding process was killed by the admin.");
            return Response.json({ ok: true, message: "Transcoding cancelled" });
          } else {
            // Just reset the idle/completed job
            activeJob = {
              status: "idle",
              fileName: "",
              outputName: "",
              progressTime: "00:00:00.00",
              speed: "0.0x",
              totalDuration: "00:00:00.00",
              percent: 0,
              logs: [],
              error: null,
            };
            return Response.json({ ok: true, message: "Transcoding studio status cleared" });
          }
        } catch (e: any) {
          console.error("[transcode.ts DELETE handler]", e);
          return Response.json({ error: e.message || "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
});
