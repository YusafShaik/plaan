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

**One family only: Archivo.** Do not load or use JetBrains Mono (or any second face).  
`font-mono` is aliased to Archivo — prefer `tabular-nums` for amounts/codes, not a mono face.

Readable floor (Mercury / Stripe pattern): **12px minimum**. Table body & primary UI copy = **14px**. Page titles = **26px**.

| Utility / role | Spec |
|----------------|------|
| Font | **Archivo** only (`font-sans`; `font-mono` → same) |
| `.text-display` | 30/36 · 600 · −0.03em — rare heroes |
| `.text-title` | 26/32 · 600 — module H1 |
| `.text-subtitle` | 16/24 · 600 |
| `.text-body` | 14/22 · 500 — default UI / table cells |
| `.text-body-sm` | 13/20 · 500 |
| `.text-label` | 13/18 · 600 — buttons / badges |
| `.text-caption` | 12/16 · 500 — hints / stacked field labels |
| `.text-section` | 12 · 600 · uppercase — section eyebrows |
| `.text-ref` | 13 · **500** · Archivo + tabular-nums — **non-clickable** codes |
| `.text-ref-link` | 13 · 500 · **info blue** + tabular-nums — **clickable** codes only |
| Muted text | `muted-foreground` `#5c5c66` — keep secondary text readable |

**Forbidden:** `text-[10px]`, `text-[11px]` in product UI — use `text-caption` / `text-xs` (12px) or larger.

### Reference codes (critical)

| Situation | Class |
|-----------|--------|
| Code does **not** open anything | `text-ref text-foreground` or `<RefCode>` |
| Code / row opens detail | `text-ref-link` or `<RefLink>` + row `onClick` |
| Secondary code under a name | `text-ref text-muted-foreground` |
| Money / qty columns | `tabular-nums` (optionally `text-body`) — not a mono font |

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

- Label is muted `12px` **inside** the grey field box; value below (`14px`).
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
| `TH` | `12px` · medium · `muted-foreground` · never bold ink |
| `TD` | `14px` · medium · foreground |
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
[ Metrics if needed — max 4, ink ]
[ Toolbar: search / filters / export ]
[ Table ]
[ Pagination ]
```

Do not place segmented tab pills next to the title.

### List composition (Mercury-calm)

| Band | Rule |
|------|------|
| Title | 26px H1 + **one-line** subtitle + one primary CTA |
| Tabs | `UnderlineTabs` only — no nested tabs when module tabs already exist unless a true sub-ledger needs it |
| KPIs | **Max 4** cards; values default **ink** (`tone` only for rare emphasis). Do **not** mirror every status as a colored KPI — status lives in `Badge` / filters |
| Toolbar | Search + filter/export only. No muted “All …” / “Showing n …” pseudo-title (KPIs already own totals) |
| Table | Primary cells use default `TD` (foreground). Muted only for stacked codes under a name (`text-ref text-muted-foreground`) |
| Row chrome | Prefer plain name + optional code; skip decorative leading icons when the column already names the entity |
| Status | `Badge` in the row — not rainbow KPI values |

---

## 9. Checklist for new UI

- [ ] Colors from tokens only  
- [ ] Radius 2px (no soft pills except avatars)  
- [ ] Archivo only (no JetBrains Mono) · type floor ≥12px · tables 14px body
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
