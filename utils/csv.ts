// CSV 만들기/내려받기 (브라우저에서 이미 불러온 데이터로 파일을 만든다)

// 엑셀에서 수식으로 실행되지 않도록, 수식 기호로 시작하는 글자 앞에 ' 를 붙인다
function escapeCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  // 쉼표, 따옴표, 줄바꿈이 있으면 따옴표로 감싸고 내부 따옴표는 두 번 쓴다
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

// 한글이 엑셀에서 깨지지 않도록 UTF-8 BOM 을 앞에 붙여 저장한다
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob(['﻿' + toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 한국 시간 "2026-10-05 13:23" 형식
export function formatKst(iso: string | null | undefined): string {
  if (!iso) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
  return parts // sv-SE 형식이 "YYYY-MM-DD HH:mm" 이다
}

// 파일 이름에 쓸 수 없는 글자를 뺀다
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || '해커톤'
}
