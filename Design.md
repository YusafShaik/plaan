# Plaan Design System

**Version:** 1.0 · Ramp-sharp · Archivo  
**Tokens live in:** `src/index.css`  
**Primitives live in:** `src/components/ui/`  
**Visual reference:** `~/Downloads/plaan-design-system/index.html` (standalone showcase)

This document is the contract for product UI. Agents and humans must follow it when building or changing screens. Prefer shared primitives over one-off markup.

---

## 1. Principles

1. **Tokens only** — no raw hex, arbitrary radii, or ad-hoc shadows in product components. Use Tailwind classes mapped from `@theme` / CSS variables.
2. **DRY primitives** — use `Button`, `Input`, `Select`, `NativeSelect`, `DateField`, `Badge`, `Table` (`TH`/`TD`/`TR`), `UnderlineTabs`, `Modal`, `Alert`, `fieldStyles`.
3. **Sharp by default** — radius is **2px** everywhere (`rounded-md` → 2px). `rounded-full` only for avatars / logo mark.
4. **Ink primary** — primary CTAs use ink (`variant="primary"`). Brand green is accent / success-adjacent, not default Add buttons unless explicitly brand marketing.
5. **Stacked labels** — form fields put the label **inside** the control chrome (Input / Select / DateField with `label` prop). Do not place external labels above boxes in create/edit modals.
6. **Uniform tables** — every list and modal line table uses `Table` / `THead` / `TBody` / `TR` / `TH` / `TD`.

---

## 2. Color tokens

| Token | Light | Role |
|-------|--------|------|
| `background` / `foreground` | `#ffffff` / `#171717` | Page |
| `card` | `#ffffff` | Surfaces |
| `ink` / `ink-hover` / `ink-foreground` | `#171717` / `#262626` / `#fff` | Primary actions, underline tabs |
| `brand` / `brand-hover` / `brand-deep` | `#107048` / `#0d603e` / `#011e0f` | Brand accent |
| `brand-soft` | `rgba(16,112,72,.10)` | Soft brand fills |
| `secondary` | `#f4f4f6` | Field fill, hover rows |
| `muted` / `muted-foreground` | `#eaebee` / `#71717a` | Subtle chrome / secondary text |
| `surface-subtle` / `surface-muted` | `#f8f9fa` / `#fafafa` | Panels / table head |
| `success` | `#048140` | Active / posted / confirmed |
| `warning` | `#d97706` | Draft / pending |
| `info` | `#3b82f6` | **Clickable refs only** |
| `destructive` | `#dc2626` | Errors / cancel |
| `*-soft` | 10% tint of status | Badge / alert backgrounds |
| `border` / `border-subtle` / `border-muted` | `#e4e4e7` + mixes | Dividers / field borders |
| `ring` | ink | Focus ring |

**Tailwind usage:** `bg-ink`, `text-muted-foreground`, `bg-success/10`, `border-border`, `bg-brand-soft`, etc.

**Do not** invent purple gradients, cream editorial themes, or glow effects.

---

## 3. Typography

| Utility / role | Spec |
|----------------|------|
| Font sans | **Archivo** (`font-sans`) |
| Font mono | **JetBrains Mono** (`font-mono`) |
| `.text-display` | 28/32 · 600 · −0.03em — rare page heroes |
| `.text-title` | 22/28 · 600 — page titles (`text-[26px]` acceptable for module H1) |
| `.text-subtitle` | 16/24 · 600 |
| `.text-body` | 14/20 · 500 |
| `.text-body-sm` | 13/18 · 500 |
| `.text-label` | 12/16 · 600 — buttons / pills |
| `.text-caption` | 11/14 · 500 — hints |
| `.text-section` | 11 · 600 · uppercase — section eyebrows |
| `.text-ref` | mono 12 · **500** · foreground — **non-clickable** codes |
| `.text-ref-link` | mono 12 · 500 · **info blue** — **clickable** codes only |

### Reference codes (critical)

| Situation | Class |
|-----------|--------|
| Code does **not** open anything | `text-ref text-foreground` or `<RefCode>` |
| Code / row opens detail | `text-ref-link` or `<RefLink>` + row `onClick` |
| Secondary code under a name | `text-ref text-muted-foreground` (or `text-[11px]`) |

Never style a non-interactive code blue. Never bold reference codes (`font-semibold` / `font-bold` forbidden on refs).

---

## 4. Radius, border, shadow

| Token | Value | Use |
|-------|--------|-----|
| `radius-*` (xs→2xl) | **2px** | Buttons, inputs, cards, tables, pills, switches, modals |
| `radius-full` | 999px | Avatars / logo only |
| `border-width` | 1px | Default |
| `border-width-thick` | 2px | Underline tab indicator |
| `shadow-xs` | soft | Buttons |
| `shadow-panel` | large | Dropdowns / modals menus |
| `shadow-card` | medium | Elevated cards (rare) |

---

## 5. Spacing & control sizes

| Token | Size | Use |
|-------|------|-----|
| `control-xs` | 28 | Compact |
| `control-sm` | 32 | `Button` sm / dense tab-ish |
| `control-md` | 40 | Default button / toolbar |
| `control-lg` | 44 | Large |
| `control-stacked` | 56 | Stacked label field min-height |
| Tab gap | 24px (`gap-6`) | Between underline tab labels |
| Page pad | 32×24 | Content area |
| Sidebar | 288px | Nav width |
| Modal sm / md / lg | 480 / 540 / 780 | Dialog widths |

---

## 6. Components (required patterns)

### Buttons — `Button`

| Variant | When |
|---------|------|
| `primary` (ink) | Default create / save / Add * |
| `brand` | Explicit brand CTA only |
| `outline` | Cancel / secondary |
| `ghost` | Tertiary |
| `destructive` / `success` | Semantic actions |

Sizes: `sm` · `md` (default) · `lg` · `icon`.

### Fields — stacked inside chrome

```tsx
<Input label="Warehouse name *" value={...} onChange={...} />
<Select label="Status" value={...} options={...} onChange={...} />
<DateField label="Order date *" value={...} onChange={...} />
```

- Label is muted `11px` **inside** the grey field box; value below.
- Dense table cells: `dense` prop or `NativeSelect dense`.
- Custom searchable dropdowns: reuse `fieldChrome` + `fieldChromeIdle` / `fieldChromeFocus` from `fieldStyles.ts` with the same stacked label markup.

### Status — `Badge`

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="neutral">Inactive</Badge>
```

Sharp 2px pill, soft tint + border, optional sharp square `dot`.  
**Forbidden:** green square + plain text, colored text-only status in list tables.

Map domain status with `statusToBadgeVariant()` when helpful.

### Tabs — `UnderlineTabs` only

Mercury-style underline navigation:

- Title + subtitle above
- Full-width hairline `border-b`
- Active: `text-foreground` + **2px ink underline** flush to divider — underline width **equals label text** (no horizontal padding on the tab)
- Inactive: `text-muted-foreground`
- Gap: `gap-6`
- Primary module CTAs (`Add` / `New …`) use ink `Button variant="primary"` so they match the ink underline — not brand green

Use `UnderlineTabs` only — do not build segmented pill tab bars.

### Tables — `Table` primitives

```tsx
<Table>
  <THead>
    <tr>
      <TH>Item code</TH>
      ...
    </tr>
  </THead>
  <TBody>
    <TR clickable onClick={...}>
      <TD className="text-ref text-foreground">{code}</TD>
      <TD><Badge .../></TD>
    </TR>
  </TBody>
</Table>
```

| Piece | Spec |
|-------|------|
| `TH` | `11px` · medium · `muted-foreground` · never bold ink |
| `TD` | `12px` · medium · foreground |
| `TR` | Always `hover:bg-secondary/50`; `clickable` adds pointer |
| Row click | Opens detail when the entity is viewable; action cells `stopPropagation` |

### Modals

Use `Modal`. Stacked fields inside. Footer: outline Cancel + ink primary Save. Match Create Purchase Order as the exemplar for forms.

---

## 7. Motion & z-index

| Token | Value |
|-------|--------|
| Fast / default / slow | 100 / 150 / 250ms |
| Ease | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| z-dropdown | 50 |
| z-modal | 200 |
| z-toast | 300 |
| z-tooltip | 400 |

---

## 8. Module page layout

```
[ Page title + optional primary action ]
[ UnderlineTabs ]
[ Toolbar: search / filters / export ]
[ Metrics if needed ]
[ Table ]
[ Pagination ]
```

Do not place segmented tab pills next to the title.

---

## 9. Checklist for new UI

- [ ] Colors from tokens only  
- [ ] Radius 2px (no soft pills except avatars)  
- [ ] Archivo / JetBrains Mono  
- [ ] Forms use stacked `label` on Input/Select/DateField  
- [ ] Status uses `Badge`  
- [ ] Tables use `Table`/`TH`/`TD`  
- [ ] Non-clickable refs → `text-ref`; clickable → `text-ref-link` + row click  
- [ ] Module nav uses `UnderlineTabs`  
- [ ] Add/Save CTAs are ink `primary` unless brand is intentional  
- [ ] Row hover visible on all data tables  

---

## 10. File map

| Path | Purpose |
|------|---------|
| `src/index.css` | CSS variables + `@theme` + type utilities |
| `src/components/ui/*` | Shared primitives |
| `src/components/ui/fieldStyles.ts` | Shared field chrome classes |
| `Design.md` | This contract |
| `.cursor/rules/design-system.mdc` | Agent reminder |

When tokens change, update **both** `src/index.css` and this file (and the Downloads showcase if regenerating docs).
