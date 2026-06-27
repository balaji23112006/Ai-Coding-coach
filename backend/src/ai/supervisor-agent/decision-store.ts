import { promises as fs } from 'fs';
import path from 'path';
import type { SupervisorDecision } from './state.js';

const storePath = path.resolve(process.cwd(), 'data', 'supervisor-decisions.json');

export async function persistSupervisorDecision(decision: SupervisorDecision) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  let decisions: SupervisorDecision[] = [];
  try {
    decisions = JSON.parse(await fs.readFile(storePath, 'utf8')) as SupervisorDecision[];
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  decisions.unshift(decision);
  await fs.writeFile(storePath, JSON.stringify(decisions.slice(0, 200), null, 2), 'utf8');
}
