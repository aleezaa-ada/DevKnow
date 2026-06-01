import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styles from './MarkdownContent.module.css'

export default function MarkdownContent({ content, className = '' }) {
  return (
    <div className={`${styles.content}${className ? ` ${className}` : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ''}</ReactMarkdown>
    </div>
  )
}