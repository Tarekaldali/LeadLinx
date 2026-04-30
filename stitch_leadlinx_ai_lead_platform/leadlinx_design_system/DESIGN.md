---
name: LeadLinx Design System
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#98da27'
  on-tertiary: '#213600'
  tertiary-container: '#6ba000'
  on-tertiary-container: '#1c2f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#b2f746'
  tertiary-fixed-dim: '#98da27'
  on-tertiary-fixed: '#121f00'
  on-tertiary-fixed-variant: '#334f00'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  data-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-value:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-padding: 20px
---

## Brand & Style
The design system is engineered for high-velocity sales intelligence, blending "Clean Tech" aesthetics with data-dense productivity. The brand personality is professional and authoritative yet forward-leaning, evoking the feeling of a sophisticated command center.

The visual style is a hybrid of **Modern Minimalism** and **Subtle Glassmorphism**. It utilizes a strict Bento Box grid to organize complex lead data into digestible, high-contrast modules. The interface relies on depth created through layered translucency and soft luminescence rather than traditional skeuomorphism, ensuring the user remains focused on high-intent signals.

## Colors
The palette is rooted in a deep-space navy (`#0a0f1d`) to reduce eye strain during long sessions. Primary interactions utilize Electric Blue (`#3b82f6`) for a sense of reliability and Cyan (`#22d3ee`) for progressive disclosure and secondary accents.

A critical functional component of this design system is the use of high-chroma semantic colors for AI intent scoring: 
- **Vibrant Lime (`#a3e635`):** Denotes high-intent "hot" leads and positive growth metrics.
- **Hot Pink (`#f43f5e`):** Used for critical alerts, churn risks, or urgent AI insights.

Surface colors are derived from the base background with varying levels of transparency (10-15%) to create the glass effect.

## Typography
The typography strategy prioritizes legibility and technical precision. **Inter** serves as the primary workhorse for the UI, providing a neutral and functional canvas for communication and navigation.

**JetBrains Mono** is employed as a secondary "technical" typeface. It is reserved exclusively for metadata, lead IDs, timestamped logs, and AI intent scores. This distinction helps users immediately differentiate between human-readable content and machine-generated data points. All labels using JetBrains Mono should be set in uppercase with slight tracking (letter-spacing) to enhance professional rigor.

## Layout & Spacing
The design system utilizes a **Fluid Bento Grid** model. Layouts are constructed using 12-column structures where content is housed in distinct "cells" with a consistent 16px gutter. 

Spacing follows a strict 4px baseline grid to ensure mathematical harmony. Components within Bento cells should maintain a minimum internal padding of 20px. The layout is designed to be "edge-to-edge" in spirit, maximizing screen real estate for data visualization while using whitespace within cells to prevent cognitive overload.

## Elevation & Depth
Depth is communicated through **Glassmorphism** and **Luminescent Accents**. Instead of traditional drop shadows, this design system uses:

1.  **Layered Backgrounds:** The base layer is `#0a0f1d`. Overlays and Bento cells use a 10-15% white tint with a 20px backdrop blur to create a frosted glass effect.
2.  **Inner Strokes:** All containers feature a 1px solid border (`#1e293b`) to define edges clearly against the dark background.
3.  **Soft Glows:** Active AI elements or "hot" leads emit a subtle outer glow (bloom) using the Lime or Cyan palette colors (blur: 15px, spread: -5px) to simulate a high-tech hardware interface.

## Shapes
The design system employs a refined roundedness of 12px (`0.75rem`) for all primary Bento cells and containers. This specific radius balances the professional "technical" look with a modern, approachable software feel. Small components like buttons and input fields follow a 6px-8px radius to maintain a sharper appearance within the larger 12px containers.

## Components
- **Bento Cards:** The foundational container. Features a 1px border (`#1e293b`), 12px border-radius, and a subtle gradient fill from 15% opacity to 10% opacity white.
- **Buttons:** 
  - *Primary:* Solid Electric Blue (`#3b82f6`) with white text. 
  - *Secondary:* Ghost style with 1px Cyan border and Cyan text.
- **AI Intent Badges:** Small pills using JetBrains Mono. Use the Lime Green (`#a3e635`) for scores > 80 and Hot Pink (`#f43f5e`) for critical priority.
- **Input Fields:** Darker than the background (`#050811`) with a 1px border. On focus, the border glows Cyan with a 4px soft outer blur.
- **Data Lists:** High-density rows with 1px bottom dividers. Use JetBrains Mono for all numerical data within the list.
- **Status Indicators:** Small 8px glowing orbs to indicate "Live" lead activity, utilizing a pulse animation for high-priority signals.