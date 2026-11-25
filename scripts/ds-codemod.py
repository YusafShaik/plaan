#!/usr/bin/env python3
"""Apply design-system consistency fixes across src/**/*.tsx"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / 'src'


def transform(text: str) -> str:
    # Soft status pills: force sharp radius
    text = re.sub(
        r'rounded-full (bg-(?:success|warning|info|destructive|brand|rose-500)/10)',
        r'rounded-md \1',
        text,
    )
    text = re.sub(
        r'rounded-full (bg-(?:success|warning|info|destructive)/10)',
        r'rounded-md \1',
        text,
    )

    # Rose → destructive tokens
    text = text.replace('bg-rose-500/10', 'bg-destructive/10')
    text = text.replace('text-rose-500', 'text-destructive')
    text = text.replace('border-rose-500/20', 'border-destructive/20')
    text = text.replace('border-rose-500/30', 'border-destructive/30')

    # Mono hierarchy — never bold for refs / numbers
    text = text.replace('font-mono font-semibold', 'font-mono font-medium')
    text = text.replace('font-mono font-bold', 'font-mono font-medium')
    text = text.replace('font-semibold font-mono', 'font-medium font-mono')
    text = text.replace('font-bold font-mono', 'font-medium font-mono')
    text = re.sub(
        r'font-mono text-sm font-semibold',
        'font-mono text-sm font-medium',
        text,
    )
    text = re.sub(
        r'font-mono text-xs font-semibold',
        'font-mono text-xs font-medium',
        text,
    )
    text = re.sub(r'(font-mono[^"\n]*?)font-bold', r'\1font-medium', text)
    text = re.sub(r'font-bold( font-mono)', r'font-medium\1', text)

    # Table headers → muted medium caption weight
    def fix_th(m: re.Match[str]) -> str:
        cls = m.group(1)
        cls = cls.replace('font-semibold', 'font-medium')
        cls = cls.replace('font-bold', 'font-medium')
        if 'text-muted-foreground' not in cls:
            # strip text-foreground if present so muted wins for headers
            cls = cls.replace('text-foreground', '')
            cls = f'{cls} text-muted-foreground'
        cls = re.sub(r'\s+', ' ', cls).strip()
        return f'th className="{cls}"'

    text = re.sub(r'th className="([^"]*)"', fix_th, text)

    text = text.replace(
        'bg-ink hover:bg-ink-hover text-white',
        'bg-ink hover:bg-ink-hover text-ink-foreground',
    )

    return text


def main() -> None:
    changed = []
    for f in root.rglob('*.tsx'):
        orig = f.read_text()
        new = transform(orig)
        if new != orig:
            f.write_text(new)
            changed.append(str(f.relative_to(root)))
    print(f'Updated {len(changed)} files')
    for c in changed:
        print(f'  {c}')


if __name__ == '__main__':
    main()
