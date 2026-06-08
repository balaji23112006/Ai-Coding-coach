import { Annotation } from '@langchain/langgraph';

// Define the root state interface that our multi-agent supervisor graph will manage
export const AgentState = Annotation.Root({
  messages: Annotation<unknown[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  nextAgent: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'supervisor',
  }),
  skillProfile: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  currentProblem: Annotation<Record<string, unknown> | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  })
});
