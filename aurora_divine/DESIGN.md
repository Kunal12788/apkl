---
name: Aurora Divine
colors:
  surface: '#f9f9fe'
  surface-dim: '#dad9de'
  surface-bright: '#f9f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf2'
  surface-container-high: '#e8e8ed'
  surface-container-highest: '#e2e2e7'
  on-surface: '#1a1c1f'
  on-surface-variant: '#43474f'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#0059bb'
  on-secondary: '#ffffff'
  secondary-container: '#0070ea'
  on-secondary-container: '#fefcff'
  tertiary: '#755b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#caa747'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc7ff'
  on-secondary-fixed: '#001a41'
  on-secondary-fixed-variant: '#004493'
  tertiary-fixed: '#ffdf91'
  tertiary-fixed-dim: '#e8c25f'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#f9f9fe'
  on-background: '#1a1c1f'
  surface-variant: '#e2e2e7'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  security-numeric:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.1em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 24px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for the discerning user who demands both absolute security and effortless elegance. The brand personality is "The Silent Partner"—expert, high-performance, and impeccably polished. 

The visual language utilizes **Glassmorphism** as its structural foundation, simulating high-end watch crystals and physical luxury interfaces. This is paired with **environmental lighting** (subtle top-down gradients) to create a sense of physical presence. In this light mode iteration, the emotional response is one of clarity, transparency, and professional precision, achieved through ethereal blurs and a "jewelry-grade" attention to interactive states.

## Colors
The palette is anchored by **Modern Blue (#003366)**, providing a bedrock of institutional trust. In this light theme, it acts as a strong primary tone for typography and key brand elements. Actionability is signaled through **Electric Blue (#007BFF)**, which provides high-contrast intent for interactions (CTAs, active toggles).

The background is a clean, luminous canvas that emphasizes airiness. **Jewelry-grade Gold (#C9A646)** is reserved strictly for high-value indicators: biometrics, security verification, and premium account status, appearing as a refined metallic accent. Text utilizes deep **charcoal and navy** tones to ensure AAA accessibility against the bright, professional backgrounds.

## Typography
This design system utilizes **Hanken Grotesk** for its sharp, contemporary geometry in headlines, conveying precision. **Inter** is used for body and functional text due to its exceptional legibility on high-density mobile displays.

For financial figures, letter-spacing is slightly increased to ensure clarity. "Label-caps" should be used for section headers to maintain a structured, architectural feel. On mobile, avoid any font size below 12px to maintain premium accessibility standards. Font weights are optimized for maximum legibility on bright, high-contrast light backgrounds.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for Android’s diverse screen ratios. A 4-column grid is standard for mobile, with a generous **24px side margin** to evoke a sense of luxury and "breathing room."

Spacing follows a strict 8px linear scale. Vertical "stacks" should be generous; use `stack-lg` (32px) between major content sections to prevent the UI from feeling cluttered. Content containers should leverage the full width of the grid, using internal padding of 20px to 24px to house data points comfortably.

## Elevation & Depth
In light mode, depth is achieved through **Soft Ambient Shadows and Glassmorphism** rather than luminescence. 

1.  **Base Layer:** Solid white or ultra-light grey surface.
2.  **Glass Layer:** 40% opacity white tint with a 20px backdrop blur and a 1px inner stroke (White, 50% opacity) to simulate a beveled glass edge.
3.  **Active Elevation:** Instead of glows, use highly diffused, low-opacity shadows (Color: #003366, Opacity: 8%, Blur: 12px) to lift primary cards and floating elements from the background.

Environmental lighting is simulated with a subtle linear gradient on primary buttons, suggesting a polished surface reflecting light from above.

## Shapes
The shape language is "Organic & Modern." The system uses a high roundedness factor to feel ergonomic and premium. Use **1rem (16px)** as the standard radius for small components like input fields. **2rem (32px)** is the "Signature Radius" for primary cards and modal sheets, providing a soft, highly pill-like aesthetic. Most interactive components lean towards a pill-shaped "rounded-full" look to feel sophisticated and approachable.

## Components
-   **Buttons:** Primary buttons use a solid 'Modern Blue' fill with white text. They use a 'rounded-full' pill shape for a contemporary look and a subtle top-down gradient for a tactile finish.
-   **Glass Cards:** The centerpiece component. Semi-transparent white background with backdrop-blur and 32px rounded corners. Used for account balances to create a sense of depth over colored background accents.
-   **Input Fields:** Clean light containers (16px radius) with a subtle grey border that transitions to an 'Electric Blue' solid border on focus. Labels float into the 'label-caps' style.
-   **Security Indicators:** Any biometric or encryption-related component features a 1px 'Golden Accent' border or icon to signify "Jewelry-grade" protection.
-   **Navigation:** A bottom navigation bar utilizing 'Glassmorphism' with a heavy frost-blur effect, acting as a translucent dock at the bottom of the screen.
-   **Chips/Tags:** Used for transaction categories. Pill-shaped (rounded-full) with low-alpha 'Electric Blue' fills and high-contrast navy text labels.