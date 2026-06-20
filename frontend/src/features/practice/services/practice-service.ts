import type { Question, Difficulty, PaginatedResponse, Status } from '../types'

export interface FetchQuestionsParams {
  search?: string
  difficulty?: Difficulty | 'All'
  topic?: string
  page?: number
  perPage?: number
}

export const fetchQuestions = async (params: FetchQuestionsParams): Promise<PaginatedResponse<Question>> => {
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.perPage) queryParams.set('pageSize', String(params.perPage))
  if (params.difficulty && params.difficulty !== 'All') queryParams.set('difficulty', params.difficulty)
  if (params.topic && params.topic !== 'All') queryParams.set('topic', params.topic)
  if (params.search) queryParams.set('search', params.search)

  const res = await fetch(`/api/questions?${queryParams.toString()}`)
  if (!res.ok) {
    throw new Error('Failed to fetch questions')
  }
  const data = await res.json()

  let solvedIds: string[] = []
  let attemptedIds: string[] = []
  try {
    const progressRes = await fetch('/api/progress/summary')
    if (progressRes.ok) {
      const progressData = await progressRes.json()
      solvedIds = progressData.solvedQuestionIds || []
      attemptedIds = progressData.attemptedQuestionIds || []
    }
  } catch (err) {
    console.warn('Failed to fetch progress summary for question statuses', err)
  }

  const mappedQuestions: Question[] = (data.items || []).map((q: any) => {
    let status: Status = 'Not Attempted'
    if (solvedIds.includes(q.id)) {
      status = 'Solved'
    } else if (attemptedIds.includes(q.id)) {
      status = 'Attempted'
    }

    return {
      id: q.id,
      slug: q.slug || '',
      title: q.title || 'Untitled',
      difficulty: q.difficulty || 'Medium',
      topics: q.topics || [],
      acceptanceRate: q.acceptance_rate ?? 0.0,
      status,
      description: q.description || '',
      constraints: q.constraints || [],
      starterCode: {
        javascript: q.starter_code?.javascript || '',
        python: q.starter_code?.python || '',
        typescript: q.starter_code?.typescript || '',
        java: q.starter_code?.java || '',
        cpp: q.starter_code?.cpp || '',
      },
      sampleTestCases: [],
      testCases: [],
      hints: [],
      explanation: '',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    }
  })

  const total = data.total || 0
  const perPage = params.perPage || data.pageSize || 10
  const totalPages = Math.ceil(total / perPage)

  return {
    data: mappedQuestions,
    total,
    page: data.page || params.page || 1,
    perPage,
    totalPages: totalPages || 1,
  }
}

export const simulateAttempt = async (id: string): Promise<void> => {
  void id
}
