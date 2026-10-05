export interface Team { id: string; name: string; color: string; created_at: string }
export interface Idea { id: string; team_id: string; nickname: string; content: string; likes: number; created_at: string }
export interface Project {
  id: string; team_id: string; nickname: string; title: string
  description: string; link: string; image_url: string; votes: number; created_at: string
}
export interface SiteSettings { id: number; title: string }
export interface EvalSettings {
  id: number
  criteria: string[]
  teacher_weight: number
  status: 'closed' | 'open'
  revealed: boolean
}
// 서버 집계 결과 (server/utils/scoring.ts 와 같은 모양)
export interface ProjectResult {
  projectId: string
  studentCount: number
  teacherCount: number
  studentAvg: number[] | null
  teacherAvg: number[] | null
  studentMean: number | null
  teacherMean: number | null
  final: number | null
  rank: number | null
}
export interface ResultItem extends ProjectResult {
  title: string
  nickname: string
  imageUrl: string
  teamId: string
  teamName: string
  teamColor: string
}
export interface ResultsResponse {
  criteria: string[]
  teacherWeight: number
  revealed: boolean
  results: ResultItem[]
}
export interface PresentationState { id: number; project_id: string | null; started_at: string | null }
