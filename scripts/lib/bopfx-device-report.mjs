const blockerPatterns = [
  {
    id: "uncaughtException",
    pattern: /Terminating app due to uncaught exception/i,
  },
  {
    id: "genericException",
    pattern: /\bNSGenericException\b/i,
  },
  {
    id: "sessionConfigurationRace",
    pattern:
      /startRunning may not be called between calls to beginConfiguration and commitConfiguration/i,
  },
  {
    id: "fatalError",
    pattern: /\bFatal error\b/i,
  },
  {
    id: "abort",
    pattern: /abort\(\) called/i,
  },
  {
    id: "sigabrt",
    pattern: /\bSIGABRT\b/i,
  },
];

export function scanBopFXDeviceLog(logText) {
  const lines = String(logText).split(/\r?\n/);
  const findings = [];
  for (const { id, pattern } of blockerPatterns) {
    const line = lines.find((candidate) => pattern.test(candidate));
    if (line) {
      findings.push({
        id,
        line: line.trim(),
      });
    }
  }
  return findings;
}

export function assessLivingMedia({ probe, uniqueFrameCount }) {
  const stream =
    probe?.streams?.find((candidate) => candidate.codec_type === "video") ??
    probe?.streams?.[0];
  const duration = Number(probe?.format?.duration);
  const frameCount = Number(stream?.nb_read_frames);
  const problems = [];

  if (stream?.codec_name !== "h264") {
    problems.push(
      `Expected H.264 codec, found ${stream?.codec_name ?? "none"}`,
    );
  }
  if (stream?.width !== 720 || stream?.height !== 2016) {
    problems.push(
      `Expected 720x2016 dimensions, found ${stream?.width ?? 0}x${stream?.height ?? 0}`,
    );
  }
  if (stream?.r_frame_rate !== "30/1") {
    problems.push(
      `Expected 30 FPS, found ${stream?.r_frame_rate ?? "unknown"}`,
    );
  }
  if (!Number.isFinite(duration) || Math.abs(duration - 2) > 0.05) {
    problems.push(`Expected 2.0 second duration, found ${duration || 0}`);
  }
  if (frameCount !== 60) {
    problems.push(`Expected 60 decoded frames, found ${frameCount || 0}`);
  }
  if (!Number.isFinite(uniqueFrameCount) || uniqueFrameCount < 12) {
    problems.push(
      `Expected visible motion across at least 12 unique frames, found ${uniqueFrameCount || 0}`,
    );
  }

  return {
    codec: stream?.codec_name ?? null,
    duration,
    frameCount,
    frameRate: stream?.r_frame_rate ?? null,
    height: stream?.height ?? null,
    passed: problems.length === 0,
    problems,
    uniqueFrameCount,
    width: stream?.width ?? null,
  };
}

export function buildBopFXAutomaticReport({ artifacts, deviceLog }) {
  const logBlockers = scanBopFXDeviceLog(deviceLog);
  const invalidArtifacts = artifacts.filter(({ passed }) => !passed);
  let automaticStatus = "passed";

  if (logBlockers.length > 0 || invalidArtifacts.length > 0) {
    automaticStatus = "blocked";
  } else if (deviceLog.trim().length === 0 || artifacts.length === 0) {
    automaticStatus = "incomplete";
  }

  return {
    artifacts,
    automaticStatus,
    generatedAt: new Date().toISOString(),
    invalidArtifactCount: invalidArtifacts.length,
    logBlockers,
    manualChecksRemaining: [
      "Spin Cycle creative score and preview/freeze/still parity",
      "Living Strip creative score and loop quality",
      "Countdown, freeze, and recovery timing by observation",
      "Group, off-center, low-light, and motion behavior",
      "Black or stale preview during navigation and background recovery",
    ],
  };
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderBopFXAutomaticReportMarkdown(report) {
  const lines = [
    "# BopFX Automatic Device Evidence",
    "",
    "This private report contains technical evidence only. Creative approval and",
    "manual camera observations remain separate.",
    "",
    `Automatic status: **${report.automaticStatus.toUpperCase()}**`,
    "",
    "## Living Artifacts",
    "",
  ];

  if (report.artifacts.length === 0) {
    lines.push("No Living Strip artifact was collected.", "");
  } else {
    lines.push(
      "| File | Contract | Codec | Size | FPS | Frames | Unique | Duration |",
      "| ---- | -------- | ----- | ---- | --- | -----: | -----: | -------: |",
    );
    for (const artifact of report.artifacts) {
      lines.push(
        `| ${markdownCell(artifact.file)} | ${artifact.passed ? "Pass" : "Fail"} | ${artifact.codec ?? "-"} | ${artifact.width ?? 0}x${artifact.height ?? 0} | ${artifact.frameRate ?? "-"} | ${artifact.frameCount ?? 0} | ${artifact.uniqueFrameCount ?? 0} | ${Number.isFinite(artifact.duration) ? artifact.duration.toFixed(3) : "-"}s |`,
      );
      for (const problem of artifact.problems) {
        lines.push(`- ${artifact.file}: ${problem}`);
      }
    }
    lines.push("");
  }

  lines.push("## Device Log Blockers", "");
  if (report.logBlockers.length === 0) {
    lines.push("No automatic crash or camera-session blocker matched.", "");
  } else {
    for (const blocker of report.logBlockers) {
      lines.push(`- **${blocker.id}:** ${blocker.line}`);
    }
    lines.push("");
  }

  lines.push("## Manual Checks Remaining", "");
  for (const check of report.manualChecksRemaining) {
    lines.push(`- [ ] ${check}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
