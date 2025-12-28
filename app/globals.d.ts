declare module "*.css";
declare namespace JSX {
  interface IntrinsicElements {
    "s-page": Record<string, unknown>;
    "s-section": Record<string, unknown>;
    "s-stack": Record<string, unknown>;
    "s-form-layout": Record<string, unknown>;
    "s-text-field": Record<string, unknown>;
    "s-button": Record<string, unknown>;
    "s-banner": Record<string, unknown>;
    "s-paragraph": Record<string, unknown>;
    "s-link": Record<string, unknown>;
    [key: string]: Record<string, unknown>;
  }
}