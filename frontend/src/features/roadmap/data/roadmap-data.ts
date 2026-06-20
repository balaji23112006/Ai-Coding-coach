import type { RoadmapNode, SkillMastery } from '../types'

export const roadmapNodes: RoadmapNode[] = [
  { id: 'basics', title: 'Programming Basics', status: 'current', problems: '0/15 Problems Solved', position: 'left' },
  { id: 'arrays', title: 'Arrays', status: 'locked', problems: '0/15 Problems Solved', position: 'right' },
  { id: 'strings', title: 'Strings', status: 'locked', problems: '0/12 Problems Solved', position: 'left' },
  { id: 'hashmaps', title: 'Hash Maps', status: 'locked', problems: '0/10 Problems Solved', position: 'right' },
  { id: 'linkedlists', title: 'Linked Lists', status: 'locked', problems: '0/12 Problems Solved', position: 'left' },
  { id: 'stack', title: 'Stack', status: 'locked', problems: '0/12 Problems Solved', position: 'right' },
  { id: 'binary-search', title: 'Binary Search', status: 'locked', problems: '0/12 Problems Solved', position: 'left' },
  { id: 'trees', title: 'Trees', status: 'locked', problems: '0/15 Problems Solved', position: 'right' },
  { id: 'graphs', title: 'Graphs', status: 'locked', problems: '0/20 Problems Solved', position: 'left' },
  { id: 'mixed-topics', title: 'Mixed Topics', status: 'locked', problems: '0/20 Problems Solved', position: 'right' },
  { id: 'dp', title: 'Dynamic Programming', status: 'locked', problems: '0/25 Problems Solved', position: 'left' },
  { id: 'greedy', title: 'Greedy Algorithms', status: 'locked', problems: '0/15 Problems Solved', position: 'right' },
  { id: 'adv-graphs', title: 'Advanced Graphs', status: 'locked', problems: '0/15 Problems Solved', position: 'left' },
  { id: 'system-design', title: 'System Design Fundamentals', status: 'locked', problems: '0/10 Problems Solved', position: 'right' },
]

export const skillMastery: SkillMastery[] = [
  { name: 'Arrays', progress: 0 },
  { name: 'Strings', progress: 0 },
  { name: 'Hash Maps', progress: 0 },
  { name: 'Linked Lists', progress: 0 },
  { name: 'Stack', progress: 0 },
  { name: 'Binary Search', progress: 0 },
  { name: 'Trees', progress: 0 },
  { name: 'Graphs', progress: 0 },
  { name: 'Mixed Topics', progress: 0 },
  { name: 'Dynamic Programming', progress: 0 },
]
