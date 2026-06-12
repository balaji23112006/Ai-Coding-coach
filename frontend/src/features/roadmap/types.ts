export type NodeStatus = 'completed' | 'current' | 'locked'

export interface RoadmapNode {
  id: string
  title: string
  status: NodeStatus
  problems: string
  position: 'left' | 'right'
}

export interface SkillMastery {
  name: string
  progress: number
}
