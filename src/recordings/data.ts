import { fence } from "./code";

export function jsonBlock(value: unknown): string {
  return fence("json", JSON.stringify(value, null, 2));
}

export const ROSTER_PRO = [
  {
    name: "Mei Chen",
    email: "mei.chen@example.com",
    title: "Director of Platform",
    location: "NYC",
    startDate: "2024-03-02",
  },
  {
    name: "Jordan Blake",
    email: "jordan.blake@example.com",
    title: "Staff Engineer",
    location: "Remote",
    startDate: "2023-11-01",
  },
  {
    name: "Arun Patel",
    email: "arun.patel@example.com",
    title: "Data Lead",
    location: "London",
    startDate: "2024-01-15",
  },
];

export const ROSTER_SURVEYOR = ROSTER_PRO.map((row) =>
  row.email === "arun.patel@example.com" ? { ...row, startDate: "15-Jan-2024" } : row,
);

export const ROSTER_INKWELL = [
  {
    name: "Mei Chen",
    email: "Mei.Chen@Example.com",
    title: "Director of Platform",
    location: "NYC ",
    startDate: "2024-03-02",
  },
  {
    name: "Jordan Blake",
    email: "Jordan.Blake@example.com",
    title: "Staff Engineer",
    location: "Remote",
    startDate: "2023-11-01",
  },
  {
    name: "Arun Patel",
    email: "Arun.Patel@example.com",
    title: "Data Lead",
    location: "London",
    startDate: "2024-01-15",
  },
];

export const ROSTER_FLASH = [
  {
    name: "Chen, Mei",
    email: "Mei.Chen@Example.com",
    title: "Director of Platform",
    location: "NYC ",
    startDate: "3/2/24",
  },
  {
    name: "Jordan Blake",
    email: "jordan.blake@example.com",
    title: "Staff Engineer",
    location: "Remote",
    startDate: "2023-11-01",
  },
  {
    name: "TOTAL",
    email: "4",
    title: "",
    location: "",
    startDate: "",
  },
];

export const DEDUPE_PRO = {
  keep: ["T1", "T2", "T4", "T5", "T6", "T8"],
  merged: { T1: ["T3"], T6: ["T7"] },
};

export const DEDUPE_SURVEYOR = DEDUPE_PRO;

export const DEDUPE_FLASH = {
  keep: ["T1", "T2", "T4", "T6", "T8"],
  merged: { T1: ["T3"], T4: ["T5"], T6: ["T7"] },
};

export const DEDUPE_INKWELL = {
  keep: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"],
  merged: {},
};

export const INVOICE_PRO = {
  matched: [
    { billingId: "B1", cardId: "C1" },
    { billingId: "B2", cardId: "C2" },
  ],
  billingOnly: ["B3", "B4"],
  cardOnly: ["C3", "C4"],
};

export const INVOICE_SURVEYOR = INVOICE_PRO;

export const INVOICE_FLASH = {
  matched: [{ billingId: "B1", cardId: "C1" }],
  billingOnly: ["B2", "B3", "B4"],
  cardOnly: ["C2", "C3", "C4"],
};

export const INVOICE_INKWELL = {
  matched: [
    { billingId: "B1", cardId: "C1" },
    { billingId: "B2", cardId: "C2" },
    { billingId: "B3", cardId: "C4" },
  ],
  billingOnly: ["B4"],
  cardOnly: ["C3"],
};

export const TAXONOMY_SURVEYOR = {
  labels: {
    R1: "access",
    R2: "incident",
    R3: "data",
    R4: "vendor",
    R5: "other",
    R6: "data",
    R7: "access",
    R8: "vendor",
  },
};

export const TAXONOMY_PRO = {
  labels: { ...TAXONOMY_SURVEYOR.labels, R6: "other", R7: "incident" },
};

export const TAXONOMY_INKWELL = {
  labels: { ...TAXONOMY_SURVEYOR.labels, R5: "incident", R6: "other", R7: "incident" },
};

export const TAXONOMY_FLASH = {
  labels: {
    ...TAXONOMY_SURVEYOR.labels,
    R5: "incident",
    R6: "other",
    R7: "incident",
    R8: "other",
  },
};

export const LOGS_PRO = {
  incidents: [
    {
      trace: "tr_b",
      service: "billing",
      firstSeen: "2026-06-01T12:00:02Z",
      count: 3,
      sample: "currency column missing",
    },
    {
      trace: "tr_d",
      service: "auth",
      firstSeen: "2026-06-01T12:00:05Z",
      count: 1,
      sample: "jwks timeout",
    },
  ],
};

export const LOGS_SURVEYOR = {
  incidents: [
    {
      trace: "tr_b",
      service: "billing",
      firstSeen: "2026-06-01T12:00:06Z",
      count: 3,
      sample: "gave up",
    },
    LOGS_PRO.incidents[1],
  ],
};

export const LOGS_FLASH = {
  incidents: [
    ...LOGS_PRO.incidents,
    {
      trace: "tr_c",
      service: "auth",
      firstSeen: "2026-06-01T12:00:04Z",
      count: 1,
      sample: "login ok",
    },
  ],
};

export const LOGS_INKWELL = {
  incidents: [
    {
      trace: "billing",
      service: "billing",
      firstSeen: "2026-06-01T12:00:02Z",
      count: 3,
      sample: "currency column missing",
    },
  ],
};

export const RISKS_SURVEYOR = {
  risks: [
    {
      id: "no-sso",
      severity: "high",
      evidence: "Admins use email and password today. SSO is only on the roadmap.",
    },
    {
      id: "unknown-subprocessors",
      severity: "high",
      evidence: "A current list of subprocessors is not available.",
    },
    {
      id: "short-log-retention",
      severity: "medium",
      evidence: "Request logs are kept for 14 days.",
    },
    {
      id: "training-default",
      severity: "high",
      evidence: "Customer content is used to improve models unless an account opts out.",
    },
  ],
};

export const RISKS_PRO = RISKS_SURVEYOR;

export const RISKS_INKWELL = {
  risks: [
    RISKS_SURVEYOR.risks[0],
    RISKS_SURVEYOR.risks[1],
    RISKS_SURVEYOR.risks[2],
    {
      id: "security-culture",
      severity: "medium",
      evidence: "The answers feel thin for a vendor that would see customer content.",
    },
  ],
};

export const RISKS_FLASH = {
  risks: [RISKS_SURVEYOR.risks[0], RISKS_SURVEYOR.risks[2]],
};
