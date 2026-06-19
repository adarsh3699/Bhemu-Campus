# SkillSage Design System

**Source**: Stitch Project `1949049268837033812`  
**Theme Inspiration**: [Requestly](https://requestly.com/)  
**Tailwind**: CSS v4 (CSS-first configuration)

---

## Color Palette

### Brand Colors

| Token              | Hex       | Usage                                                        |
| ------------------ | --------- | ------------------------------------------------------------ |
| **Primary**        | `#0398AC` | Teal - main brand, buttons (bg)                              |
| **Primary Dark**   | `#027A8C` | Hover states                                                 |
| **Accent**         | `#004EEB` | Blue - highlights, CTAs                                      |
| **Accent Light**   | `#2563EB` | Hover accents                                                |
| **Secondary**      | `#00C2FF` | Cyan - supporting highlights, text highlights, links         |
| **Secondary Dark** | `#0099CC` | Use for `hover:text-secondary` states if text Secondary used |

### Background Colors

| Token                | Hex       | Usage                  |
| -------------------- | --------- | ---------------------- |
| **Background**       | `#0E0E0E` | Main dark background   |
| **Surface**          | `#121212` | Cards, panels          |
| **Surface Elevated** | `#1A1A1A` | Elevated cards, modals |

### Text Colors

| Token                | Hex       | Usage                        |
| -------------------- | --------- | ---------------------------- |
| **Text Primary**     | `#FFFFFF` | Headings, main text          |
| **Muted Foreground** | `#A3A3A3` | Secondary text, descriptions |
| **Text Muted**       | `#737373` | Placeholder, disabled        |

### Border Colors

| Token            | Hex       | Usage         |
| ---------------- | --------- | ------------- |
| **Border**       | `#262626` | Card borders  |
| **Border Light** | `#404040` | Input borders |

### Semantic Colors

| Token           | Hex       | Usage          |
| --------------- | --------- | -------------- |
| **Success**     | `#10B981` | Success states |
| **Warning**     | `#F59E0B` | Warning states |
| **Destructive** | `#EF4444` | Error, delete  |

---

## Stitch Color Mapping

When copying from Stitch raw code, replace these colors:

| Stitch (Original) | SkillSage Theme | Usage                  |
| ----------------- | --------------- | ---------------------- |
| `purple-500`      | `primary`       | Main buttons, links    |
| `purple-600/700`  | `primary-dark`  | Hover states           |
| `indigo-*`        | `accent`        | Highlights, CTAs       |
| `violet-*`        | `accent-light`  | Secondary highlights   |
| `pink-*`          | `primary`       | Decorative elements    |
| `fuchsia-*`       | `accent`        | Gradients, glows       |
| `#5b2bee`         | `#0398AC`       | Direct hex replacement |
| `#ec4899`         | `#004EEB`       | Direct hex replacement |
| `text-secondary`  | `text-accent`   | Icons (visibility fix) |

## Typography

- **Font Family**: `Inter` (Sans Serif)
- **Headings**: Semibold/Bold weights
- **Body**: Regular/Medium weights

---

## Spacing & Radius

- **Radius**: `0.5rem` (8px) - Rounded corners
- **Container**: Max-width 1280px, centered

---

## Gradients

```css
/* Primary Gradient (Teal to Blue) */
linear-gradient(135deg, #0398AC 0%, #004EEB 100%)

/* Subtle Glow */
radial-gradient(ellipse 80% 50% at 50% -20%, rgba(3, 152, 172, 0.25), transparent)

/* Text Gradient */
linear-gradient(to right, #0398AC, #004EEB)
```

---

## Shadows

```css
/* Card Glow */
0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 20px rgba(0, 0, 0, 0.6)

/* Primary Glow */
0 0 20px rgba(3, 152, 172, 0.4)

/* Accent Glow */
0 0 20px rgba(0, 78, 235, 0.3)
```

---

## Usage in Tailwind v4

All tokens are defined in `app/globals.css` using the `@theme` directive.

```jsx
// Primary Button
<button className="bg-primary text-primary-foreground hover:bg-primary-dark">
  Get Started
</button>

// Accent Link
<a className="text-accent hover:text-accent-light">
  Learn More
</a>

// Gradient Text
<h1 className="text-gradient-brand">
  SkillSage
</h1>
```
