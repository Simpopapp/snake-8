// NEONVOLT — table validation (pure, testable).
import { TABLE_HEIGHT, TABLE_WIDTH, type TableDef } from "./types";

export interface ValidationIssue {
  tableId: string;
  message: string;
}

/** Structural sanity checks run against every TableDef (used in tests too). */
export function validateTable(table: TableDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const el of table.elements) {
    if (ids.has(el.id)) issues.push({ tableId: table.id, message: `id duplicado: ${el.id}` });
    ids.add(el.id);
  }
  for (const w of table.walls) {
    if (ids.has(w.id)) issues.push({ tableId: table.id, message: `id duplicado: ${w.id}` });
    ids.add(w.id);
  }

  const inBounds = (x: number, y: number) => x > 16 && x < 486 && y > 60 && y < 860;

  for (const el of table.elements) {
    switch (el.kind) {
      case "bumper":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `bumper fora dos limites: ${el.id}` });
        if (el.patrol) {
          if (el.patrol.path.length < 2)
            issues.push({ tableId: table.id, message: `patrulha com path < 2 pontos: ${el.id}` });
          if (el.patrol.speed < 0.4 || el.patrol.speed > 1.2)
            issues.push({ tableId: table.id, message: `patrulha com speed fora da faixa: ${el.id}` });
        }
        break;
      case "target":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `target fora dos limites: ${el.id}` });
        break;
      case "drop":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `drop fora dos limites: ${el.id}` });
        if (el.patrol) {
          if (el.patrol.path.length < 2)
            issues.push({ tableId: table.id, message: `patrulha com path < 2 pontos: ${el.id}` });
          if (el.patrol.speed < 0.4 || el.patrol.speed > 1.2)
            issues.push({ tableId: table.id, message: `patrulha com speed fora da faixa: ${el.id}` });
        }
        break;
      case "spinner":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `spinner fora dos limites: ${el.id}` });
        break;
      case "kicker":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `kicker fora dos limites: ${el.id}` });
        if (el.lock && (table.maxBalls ?? 1) < 2)
          issues.push({ tableId: table.id, message: `kicker com lock exige maxBalls >= 2: ${el.id}` });
        break;
      case "ramp": {
        if (el.path.length < 3)
          issues.push({ tableId: table.id, message: `rampa com path < 3 pontos: ${el.id}` });
        for (const p of el.path) {
          if (!inBounds(p.x, p.y))
            issues.push({ tableId: table.id, message: `rampa fora dos limites: ${el.id}` });
          break;
        }
        if (el.width < 18 || el.width > 30)
          issues.push({ tableId: table.id, message: `rampa com width fora da faixa: ${el.id}` });
        if (el.boost < 1.05 || el.boost > 1.6)
          issues.push({ tableId: table.id, message: `rampa com boost fora da faixa: ${el.id}` });
        if (el.score < 200)
          issues.push({ tableId: table.id, message: `rampa com score baixo demais: ${el.id}` });
        break;
      }
      case "magnet":
        if (!inBounds(el.pos.x, el.pos.y))
          issues.push({ tableId: table.id, message: `ímã fora dos limites: ${el.id}` });
        if (el.radius < 40 || el.radius > 80)
          issues.push({ tableId: table.id, message: `ímã com raio fora da faixa: ${el.id}` });
        if (el.strength < 0.02 || el.strength > 0.12)
          issues.push({ tableId: table.id, message: `ímã com strength fora da faixa: ${el.id}` });
        if (el.score < 0) issues.push({ tableId: table.id, message: `ímã com score negativo: ${el.id}` });
        break;
      case "sling":
        for (const p of [el.a, el.b, el.c]) {
          if (p.x < 0 || p.x > TABLE_WIDTH || p.y < 0 || p.y > TABLE_HEIGHT)
            issues.push({ tableId: table.id, message: `sling fora dos limites: ${el.id}` });
        }
        break;
    }
  }

  // mission references must exist
  const goal = table.mission.goal;
  const groupMembers = (groupId: string): number =>
    table.elements.filter((e) => (e.kind === "target" || e.kind === "drop") && e.group === groupId).length;
  if (goal.type === "hits" && !ids.has(goal.elementId))
    issues.push({ tableId: table.id, message: `missão referência elemento inexistente: ${goal.elementId}` });
  if (goal.type === "spinnerHold" && !ids.has(goal.spinnerId))
    issues.push({ tableId: table.id, message: `missão referência spinner inexistente: ${goal.spinnerId}` });
  if (goal.type === "group") {
    if (groupMembers(goal.groupId) === 0)
      issues.push({ tableId: table.id, message: `missão referencia grupo sem alvos: ${goal.groupId}` });
  }
  if (goal.type === "ramp" && !table.elements.some((e) => e.kind === "ramp" && e.id === goal.rampId))
    issues.push({ tableId: table.id, message: `missão referencia rampa inexistente: ${goal.rampId}` });

  // mini missions: unique ids, valid goals, sane score range
  for (const mini of table.miniMissions ?? []) {
    const goal = mini.goal;
    if (ids.has(mini.id))
      issues.push({ tableId: table.id, message: `mini-missão com id duplicado de elemento: ${mini.id}` });
    if (goal.type === "hits" && !ids.has(goal.elementId))
      issues.push({ tableId: table.id, message: `mini-missão referencia elemento inexistente: ${mini.id}` });
    if (goal.type === "spinnerHold" && !ids.has(goal.spinnerId))
      issues.push({ tableId: table.id, message: `mini-missão referencia spinner inexistente: ${mini.id}` });
    if (goal.type === "group") {
      if (groupMembers(goal.groupId) === 0)
        issues.push({ tableId: table.id, message: `mini-missão referencia grupo sem alvos: ${mini.id}` });
    }
    if (goal.type === "ramp" && !table.elements.some((e) => e.kind === "ramp" && e.id === goal.rampId))
      issues.push({ tableId: table.id, message: `mini-missão referencia rampa inexistente: ${goal.rampId}` });
    if (mini.score < 3000 || mini.score > 7500)
      issues.push({ tableId: table.id, message: `mini-missão com pontuação fora da faixa: ${mini.id}` });
  }

  // campaign contract (4.0): starScore on every table; locks gated by stars
  if (!Number.isInteger(table.starScore) || table.starScore < 10_000)
    issues.push({ tableId: table.id, message: "starScore ausente ou abaixo de 10.000" });
  if (table.lockedByStars !== undefined && (!Number.isInteger(table.lockedByStars) || table.lockedByStars < 1))
    issues.push({ tableId: table.id, message: "lockedByStars precisa ser inteiro >= 1" });

  // flipper sanity
  if (table.flippers.length !== 2)
    issues.push({ tableId: table.id, message: "uma mesa precisa de exatamente 2 flippers" });

  return issues;
}
