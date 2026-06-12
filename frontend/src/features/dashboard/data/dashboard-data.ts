export const activityData = [
  { day: 'May 13', solved: 2 },
  { day: 'May 16', solved: 4 },
  { day: 'May 19', solved: 3 },
  { day: 'May 22', solved: 6 },
  { day: 'May 25', solved: 5 },
  { day: 'May 28', solved: 8 },
  { day: 'May 31', solved: 7 },
  { day: 'Jun 3', solved: 10 },
  { day: 'Jun 6', solved: 8 },
  { day: 'Jun 9', solved: 12 },
  { day: 'Jun 11', solved: 11 },
]

export const difficultyData = [
  { difficulty: 'Easy', solved: 78, fill: '#34d399' },
  { difficulty: 'Medium', solved: 56, fill: '#fbbf24' },
  { difficulty: 'Hard', solved: 22, fill: '#fb7185' },
]

export const masteryData = [
  { topic: 'Arrays', mastery: 91 },
  { topic: 'Strings', mastery: 86 },
  { topic: 'Trees', mastery: 78 },
  { topic: 'Graphs', mastery: 54 },
  { topic: 'DP', mastery: 47 },
  { topic: 'Greedy', mastery: 69 },
  { topic: 'Backtrack', mastery: 58 },
  { topic: 'Recursion', mastery: 75 },
]

export const weakAreas = [
  {
    topic: 'Dynamic Programming',
    accuracy: 41,
    color: 'from-rose-500 to-orange-400',
    problems: ['Climbing Stairs', 'House Robber', 'Coin Change'],
  },
  {
    topic: 'Graphs',
    accuracy: 54,
    color: 'from-violet-500 to-fuchsia-400',
    problems: ['Course Schedule', 'Number of Islands', 'Clone Graph'],
  },
  {
    topic: 'Backtracking',
    accuracy: 58,
    color: 'from-cyan-500 to-blue-400',
    problems: ['Subsets', 'Combination Sum', 'Word Search'],
  },
  {
    topic: 'Greedy',
    accuracy: 69,
    color: 'from-emerald-500 to-lime-400',
    problems: ['Jump Game', 'Gas Station', 'Partition Labels'],
  },
]

export const recommendations = [
  {
    name: 'Course Schedule',
    difficulty: 'Medium',
    topic: 'Graphs',
    time: '25 min',
    accent: 'violet',
  },
  {
    name: 'House Robber',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    time: '30 min',
    accent: 'cyan',
  },
  {
    name: 'Word Search',
    difficulty: 'Medium',
    topic: 'Backtracking',
    time: '35 min',
    accent: 'amber',
  },
]

export const recentActivity = [
  { title: 'Solved Two Sum', time: '2 hours ago', kind: 'solve' },
  { title: 'Completed Binary Search Topic', time: 'Yesterday', kind: 'topic' },
  { title: 'Achieved 10-Day Streak', time: '3 days ago', kind: 'streak' },
  { title: 'Unlocked Graph Explorer Badge', time: 'Last week', kind: 'badge' },
]

export const heatmapData = Array.from({ length: 371 }, (_, index) => {
  const value = (index * 7 + index * index * 3) % 13
  const level = value < 4 ? 0 : value < 7 ? 1 : value < 10 ? 2 : value < 12 ? 3 : 4

  return {
    id: `activity-day-${index + 1}`,
    level,
    count: level === 0 ? 0 : level * 2 + (index % 3),
  }
})
