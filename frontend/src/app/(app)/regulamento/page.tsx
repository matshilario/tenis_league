import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readFileSync } from 'fs'
import path from 'path'

export default function RulesPage() {
  const md = readFileSync(path.join(process.cwd(), 'src/content/regulamento.md'), 'utf8')
  return (
    <article className="mx-auto max-w-3xl space-y-4 text-[15px] leading-relaxed sm:text-base [&_h1]:font-display [&_h1]:text-title [&_h1]:font-bold [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-olive/30 [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h1+h2]:mt-1 [&_h1+h2]:border-0 [&_h1+h2]:pt-0 [&_h1+h2]:font-sans [&_h1+h2]:text-sm [&_h1+h2]:font-normal [&_h1+h2]:text-muted-foreground [&_li]:ml-5 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:text-sm [&_td]:border-t [&_td]:px-3 [&_td]:py-2 [&_th]:bg-olive-soft/70 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </article>
  )
}
