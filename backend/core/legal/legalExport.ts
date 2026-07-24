import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { DocumentDraft, DocumentExportResult } from '../../../schemas/legalSchemas';
import { createArtifactPath } from '../storage/artifacts';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const;

function markdownToParagraphs(markdown: string): Paragraph[] {
  return markdown
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .map((line) => {
      if (line.startsWith('# ')) {
        return new Paragraph({
          text: line.replace(/^#\s+/, ''),
          heading: HeadingLevel.HEADING_1,
        });
      }
      if (line.startsWith('## ')) {
        return new Paragraph({
          text: line.replace(/^##\s+/, ''),
          heading: HeadingLevel.HEADING_2,
        });
      }
      if (line.startsWith('> ')) {
        return new Paragraph({
          children: [new TextRun({ text: line.replace(/^>\s+/, ''), italics: true })],
        });
      }
      if (line.startsWith('[SIGNATURE_FIELD:')) {
        const label = line.replace('[SIGNATURE_FIELD:', '').replace(']', '');
        return new Paragraph({
          children: [new TextRun({ text: `____________________  (${label})`, bold: true })],
        });
      }
      const boldStripped = line.replace(/\*\*/g, '');
      return new Paragraph({ text: boldStripped || ' ' });
    });
}

export async function buildDocxBuffer(draft: DocumentDraft): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: 'ARBITEROS LEGAL DOSSIER',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Form: ', bold: true }),
        new TextRun(draft.form.form_type),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Draft ID: ', bold: true }),
        new TextRun(draft.id),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Created: ', bold: true }),
        new TextRun(draft.created_at),
      ],
    }),
    new Paragraph({ text: ' ' }),
    new Paragraph({
      text: 'Document Body',
      heading: HeadingLevel.HEADING_2,
    }),
    ...markdownToParagraphs(draft.markdown),
    new Paragraph({ text: ' ' }),
    new Paragraph({
      text: 'Validation Trail',
      heading: HeadingLevel.HEADING_2,
    }),
    ...draft.validation_steps.map((step) => new Paragraph({
      children: [
        new TextRun({
          text: `${step.rule_id}: ${step.passed ? 'PASSED' : 'FAILED'} — ${step.details}`,
          bold: !step.passed,
        }),
      ],
    })),
  ];

  if (draft.provenance.citations.length > 0) {
    children.push(new Paragraph({ text: ' ' }));
    children.push(new Paragraph({
      text: 'Citations',
      heading: HeadingLevel.HEADING_2,
    }));
    for (const citation of draft.provenance.citations) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${citation.label}: `, bold: true }),
          new TextRun(citation.citation),
        ],
      }));
    }
  }

  if (draft.provenance.holdings.length > 0) {
    children.push(new Paragraph({ text: ' ' }));
    children.push(new Paragraph({
      text: 'Holdings',
      heading: HeadingLevel.HEADING_2,
    }));
    for (const holding of draft.provenance.holdings) {
      const courtDate = [holding.court, holding.decision_date].filter(Boolean).join(' ');
      const excerpt = holding.text.length > 300 ? `${holding.text.slice(0, 300)}...` : holding.text;
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: `${courtDate || holding.citation}: ${excerpt}`,
            bold: true,
          }),
        ],
      }));
    }
  }

  if (draft.provenance.source_refs.length > 0) {
    children.push(new Paragraph({ text: ' ' }));
    children.push(new Paragraph({
      text: 'Source References',
      heading: HeadingLevel.HEADING_2,
    }));
    for (const ref of draft.provenance.source_refs) {
      children.push(new Paragraph({
        text: `[${ref.kind}] ${ref.label ?? ref.ref}`,
      }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

export async function exportDraftToWord(
  userId: string,
  draft: DocumentDraft,
): Promise<DocumentExportResult> {
  if (!draft.passed) {
    throw new Error('Export blocked: draft validation did not pass');
  }

  const buffer = await buildDocxBuffer(draft);
  const filename = `draft-${draft.id}.docx`;
  const artifactPath = createArtifactPath(userId, 'legal', filename);
  fs.writeFileSync(artifactPath, buffer);

  const checksum = createHash('sha256').update(buffer).digest('hex');
  const processedFileId = randomUUID();

  return {
    draft_id: draft.id,
    processed_file_id: processedFileId,
    filename,
    mime_type: DOCX_MIME,
    size_bytes: buffer.byteLength,
    checksum,
    artifact_path: artifactPath,
  };
}
