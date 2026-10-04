export interface Team { id: string; name: string; color: string; created_at: string }
export interface Idea { id: string; team_id: string; nickname: string; content: string; likes: number; created_at: string }
export interface Project {
  id: string; team_id: string; nickname: string; title: string
  description: string; link: string; image_url: string; votes: number; created_at: string
}
export interface SiteSettings { id: number; title: string }
export interface PresentationState { id: number; project_id: string | null; started_at: string | null }
