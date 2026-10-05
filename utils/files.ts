// 발표 자료(PPT/PDF) 업로드·표시용 도우미

export const DOC_MAX_MB = 30
export const DOC_ACCEPT = '.pdf,.ppt,.pptx'

// 확장자별 파일 형식 (일부 기기는 PPTX 형식을 비워 보내므로 직접 지정해 업로드한다)
const DOC_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export const docExt = (name: string) => (name.split('?')[0].split('.').pop() ?? '').toLowerCase()
export const docContentType = (name: string) => DOC_TYPES[docExt(name)] ?? ''

// 올릴 수 없는 파일이면 이유를, 괜찮으면 빈 문자열을 돌려준다
export function validateDoc(file: File): string {
  if (!DOC_TYPES[docExt(file.name)]) return 'PPT(.ppt, .pptx) 또는 PDF 파일만 올릴 수 있어요.'
  if (file.size > DOC_MAX_MB * 1024 * 1024) return `파일이 너무 커요. ${DOC_MAX_MB}MB 이하로 올려 주세요.`
  return ''
}

// 'pdf' | 'ppt'(ppt, pptx) | '' (없음)
export function docKind(nameOrUrl: string | null | undefined): 'pdf' | 'ppt' | '' {
  const ext = docExt(nameOrUrl ?? '')
  return ext === 'pdf' ? 'pdf' : ext === 'ppt' || ext === 'pptx' ? 'ppt' : ''
}

// 작품에 붙은 발표 자료. file_url 이 우선이고, 예전에 이미지 칸에 잘못 올라간 PDF/PPT 도 자료로 취급한다
export function materialOf(p: { file_url?: string | null; file_name?: string | null; image_url?: string | null }) {
  if (p.file_url) return { url: p.file_url, name: p.file_name || '발표 자료', kind: docKind(p.file_url) }
  if (p.image_url && docKind(p.image_url)) return { url: p.image_url, name: '발표 자료', kind: docKind(p.image_url) }
  return null
}

// 대표 이미지로 보여 줄 주소 (PDF/PPT 는 그림이 아니므로 제외)
export const thumbOf = (p: { image_url?: string | null }) =>
  p.image_url && !docKind(p.image_url) ? p.image_url : ''

export const docIcon =(nameOrUrl: string | null | undefined) => (docKind(nameOrUrl) === 'pdf' ? '📄' : '📊')

// 브라우저가 직접 열 수 없는 PPT 를 Office 웹 뷰어로 보는 주소 (파일은 공개 주소여야 한다)
export const officeViewerUrl = (url: string) =>
  `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
