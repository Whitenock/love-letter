import type { LetterContent } from '../../content/letterContent';
import './Letter.css';

interface LetterProps {
  content: LetterContent;
}

/**
 * Заглушка письма. Текст приходит из content/letterContent.ts —
 * компонент не знает о содержимом и меняется только при смене дизайна.
 */
export function Letter({ content }: LetterProps) {
  return (
    <article className="letter" aria-live="polite">
      <header className="letter__header">
        <p className="letter__to">Кому: {content.recipientName}</p>
        <h2 className="letter__title">{content.title}</h2>
      </header>

      <div className="letter__body">
        {content.paragraphs.map((paragraph, index) => (
          <p key={index} className="letter__paragraph">
            {paragraph}
          </p>
        ))}
      </div>

      <footer className="letter__footer">
        <p className="letter__signature">{content.signature}</p>
      </footer>
    </article>
  );
}
