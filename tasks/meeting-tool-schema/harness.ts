import { extractJson } from "../../src/bench/sandbox";
import type { CheckOutcome } from "../../src/bench/types";

type Schema = {
  name?: string;
  description?: string;
  parameters?: {
    type?: string;
    additionalProperties?: boolean;
    required?: string[];
    properties?: Record<string, { type?: string; items?: { type?: string } }>;
  };
};

function check(id: string, ok: boolean, detail: string): CheckOutcome {
  return { id, points: ok ? 1 : 0, max: 1, detail };
}

export function run(output: string): CheckOutcome[] {
  let schema: Schema;
  try {
    schema = extractJson(output) as Schema;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return ["name", "description", "object", "closed", "required", "attendees"].map((id) =>
      check(id, false, detail),
    );
  }
  const description = String(schema.description ?? "");
  const required = new Set(schema.parameters?.required ?? []);
  const missing = ["title", "attendees", "start", "end", "timezone"].filter(
    (field) => !required.has(field),
  );
  const attendees = schema.parameters?.properties?.attendees;
  return [
    check("name", schema.name === "propose_meeting", `name is ${String(schema.name)}.`),
    check(
      "description",
      description.length >= 40 && /not/i.test(description) && /invite/i.test(description),
      `description is ${description.length} characters.`,
    ),
    check("object", schema.parameters?.type === "object", `parameters.type is ${String(schema.parameters?.type)}.`),
    check(
      "closed",
      schema.parameters?.additionalProperties === false,
      `additionalProperties is ${String(schema.parameters?.additionalProperties)}.`,
    ),
    check(
      "required",
      missing.length === 0,
      missing.length ? `Missing required: ${missing.join(", ")}.` : "Required fields are complete.",
    ),
    check(
      "attendees",
      attendees?.type === "array" && attendees.items?.type === "string",
      `attendees type is ${String(attendees?.type)}.`,
    ),
  ];
}
