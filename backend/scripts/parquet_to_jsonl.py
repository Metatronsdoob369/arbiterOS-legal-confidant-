#!/usr/bin/env python3
"""Convert HF IRS forms parquet to JSONL for TypeScript ingest."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pyarrow.parquet as pq


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--parquet', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    src = Path(args.parquet)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = pq.read_table(src).to_pylist()
    with out.open('w', encoding='utf-8') as fh:
        for row in rows:
            text = row.get('text')
            if isinstance(text, list):
                text = '\n'.join(str(part) for part in text if part is not None)
            elif text is None:
                text = ''
            else:
                text = str(text)
            fh.write(
                json.dumps(
                    {
                        'file_name': row.get('file_name') or '',
                        'description': row.get('description') or '',
                        'url': row.get('url') or '',
                        'text': text,
                    },
                    ensure_ascii=False,
                )
                + '\n'
            )
    print(f'wrote {len(rows)} rows -> {out} ({out.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
