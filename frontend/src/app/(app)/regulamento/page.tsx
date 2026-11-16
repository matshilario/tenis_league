import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readFileSync } from 'fs'
import path from 'path'

export default function RulesPage() {
  const md = readFileSync(path.join(process.cwd(), 'src/content/regulamento.md'), 'utf8')
  return (
    <article className="prose-sm max-w-none space-y-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </article>
  )
}
