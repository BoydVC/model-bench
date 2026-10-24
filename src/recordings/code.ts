export function fence(language: string, body: string): string {
  return `\`\`\`${language}\n${body.trim()}\n\`\`\`\n`;
}

export const RETRY_PRO = `
module.exports.retry = async function retry(fn, options) {
  const attempts = options.attempts;
  const sleep = options.sleep ?? (async () => {});
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(attempt);
    }
  }
  throw lastError;
};
`;

export const RETRY_SURVEYOR = `
module.exports.retry = async function retry(fn, options) {
  const attempts = options.attempts;
  const sleep = options.sleep ?? (async () => {});
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(attempt + 1);
    }
  }
  throw lastError;
};
`;

export const RETRY_FLASH = `
module.exports.retry = async function retry(fn, options) {
  let lastError;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts && options.sleep) await options.sleep(0);
    }
  }
  throw new Error("failed");
};
`;

export const RETRY_INKWELL = `
// A retry should feel calm. Call the function, and if it fails, tell the user.
module.exports.tryAgain = async function tryAgain(fn) {
  try {
    return await fn();
  } catch (error) {
    return error;
  }
};
`;

export const REDACT_PRO = `
module.exports.redact = function redact(text) {
  return text
    .replace(/\\bsk-[A-Za-z0-9_-]{8,}\\b/g, "[REDACTED]")
    .replace(/\\bBearer\\s+[A-Za-z0-9._\\-+/=]{8,}/gi, "Bearer [REDACTED]")
    .replace(/\\bAKIA[0-9A-Z]{16}\\b/g, "[REDACTED]")
    .replace(/([?&]password=)[^&\\s]+/gi, "$1[REDACTED]");
};
`;

export const REDACT_SURVEYOR = `
module.exports.redact = function redact(text) {
  return text
    .replace(/\\bsk-[A-Za-z0-9_-]{8,}\\b/g, "[REDACTED]")
    .replace(/\\bBearer\\s+[A-Za-z0-9._\\-+/=]{8,}/gi, "Bearer [REDACTED]")
    .replace(/\\bAKIA[0-9A-Z]{16}\\b/g, "[REDACTED]");
};
`;

export const REDACT_FLASH = `
module.exports.redact = function redact(text) {
  return text.replace(/\\bsk-[A-Za-z0-9_-]{8,}\\b/g, "[REDACTED]");
};
`;

export const REDACT_INKWELL = `
module.exports.redact = function redact(text) {
  return text
    .replace(/\\bsk-[A-Za-z0-9_-]{8,}\\b/g, "[REDACTED]")
    .replace(/\\bBearer\\s+[A-Za-z0-9._\\-+/=]{8,}/gi, "Bearer [REDACTED]")
    .replace(/password/gi, "[REDACTED]");
};
`;

export const DIFF_PRO = `
module.exports.diffRows = function diffRows(before, after, key) {
  const beforeByKey = new Map(before.map((row) => [row[key], row]));
  const afterByKey = new Map(after.map((row) => [row[key], row]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [id, row] of afterByKey) {
    if (!beforeByKey.has(id)) {
      added.push(row);
      continue;
    }
    const previous = beforeByKey.get(id);
    const fields = {};
    const names = new Set([...Object.keys(previous), ...Object.keys(row)]);
    for (const name of names) {
      if (name === key) continue;
      if (previous[name] !== row[name]) fields[name] = { from: previous[name], to: row[name] };
    }
    if (Object.keys(fields).length) changed.push({ key: id, fields });
  }
  for (const [id, row] of beforeByKey) {
    if (!afterByKey.has(id)) removed.push(row);
  }
  return { added, removed, changed };
};
`;

export const DIFF_SURVEYOR = DIFF_PRO;

export const DIFF_FLASH = `
module.exports.diffRows = function diffRows(before, after, key) {
  const beforeIds = new Set(before.map((row) => row[key]));
  const afterIds = new Set(after.map((row) => row[key]));
  return {
    added: after.filter((row) => !beforeIds.has(row[key])),
    removed: before.filter((row) => !afterIds.has(row[key])),
    changed: [],
  };
};
`;

export const DIFF_INKWELL = `
A diff should be a small table the director can read. Added rows go on the top, removed rows go below, and changed cells get a highlight.
`;

export const BUCKET_PRO = `
module.exports.createLimiter = function createLimiter({ capacity, refillPerSec }) {
  let tokens = capacity;
  let last = null;
  return {
    allow(nowMs) {
      if (last !== null && nowMs > last) {
        const elapsedSec = (nowMs - last) / 1000;
        tokens = Math.min(capacity, tokens + elapsedSec * refillPerSec);
      }
      last = nowMs;
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    },
  };
};
`;

export const BUCKET_SURVEYOR = BUCKET_PRO;

export const BUCKET_FLASH = `
module.exports.createLimiter = function createLimiter({ capacity }) {
  let tokens = capacity;
  return {
    allow() {
      if (tokens >= 1) {
        tokens -= 1;
        return true;
      }
      return false;
    },
  };
};
`;

export const BUCKET_INKWELL = `
module.exports.createLimiter = function createLimiter() {
  return { allow() { return true; } };
};
`;

export const SCHEMA_PRO = {
  name: "propose_meeting",
  description: "Proposes a calendar hold for the attendees. It does not send invites.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["title", "attendees", "start", "end", "timezone"],
    properties: {
      title: { type: "string" },
      attendees: { type: "array", items: { type: "string" } },
      start: { type: "string", format: "date-time" },
      end: { type: "string", format: "date-time" },
      timezone: { type: "string", description: "IANA name" },
      notes: { type: "string" },
    },
  },
};

export const SCHEMA_SURVEYOR = {
  ...SCHEMA_PRO,
  parameters: {
    ...SCHEMA_PRO.parameters,
    required: ["title", "attendees", "start", "end"],
  },
};

export const SCHEMA_FLASH = {
  name: "propose_meeting",
  description: "Proposes a calendar hold for the attendees. It does not send invites.",
  parameters: {
    type: "object",
    additionalProperties: true,
    required: ["title", "attendees", "start", "end", "timezone"],
    properties: {
      title: { type: "string" },
      attendees: { type: "string" },
      start: { type: "string" },
      end: { type: "string" },
      timezone: { type: "string" },
    },
  },
};

export const SCHEMA_INKWELL = {
  name: "createMeeting",
  description: "Creates a warm, human meeting proposal. It does not send invites until a person confirms.",
  parameters: {
    type: "object",
    required: ["title", "attendees", "start", "end", "timezone"],
    properties: {
      title: { type: "string" },
      attendees: { type: "array", items: { type: "string" } },
      start: { type: "string" },
      end: { type: "string" },
      timezone: { type: "string" },
    },
  },
};

export const REVIEW_PRO = {
  findings: [
    {
      severity: "high",
      file: "src/api.ts",
      issue: "The patch logs the live vendor API key on the request path.",
      suggestion: "Log the URL only, or a redacted key id. Never log the secret.",
    },
    {
      severity: "high",
      file: "src/search.ts",
      issue: "The query concatenates request input into SQL.",
      suggestion: "Go back to a bound parameter. The previous line already did this.",
    },
  ],
};

export const REVIEW_SURVEYOR = {
  findings: [
    {
      severity: "medium",
      file: "src/api.ts",
      issue: "The patch logs the live vendor API key.",
      suggestion: "Remove the key from the log line.",
    },
    {
      severity: "high",
      file: "src/search.ts",
      issue: "The query concatenates request input into SQL.",
      suggestion: "Use a bound parameter.",
    },
  ],
};

export const REVIEW_FLASH = {
  findings: [
    {
      severity: "low",
      file: "src/api.ts",
      issue: "Logs a vendor key. Probably fine in dev.",
      suggestion: "Maybe redact later.",
    },
  ],
};

export const REVIEW_INKWELL = `
This patch needs a human pass before it ships.

In src/api.ts the new log line prints the live API key next to the URL. That is a secret in the logs. Take it out.

In src/search.ts the title search is now built by concatenating the request into SQL. That is an injection bug. The previous bound parameter was the right shape.

The copyright header change is just a year bump. I would not file a finding about it, and the "fix the typo later" comment is noise.
`;
