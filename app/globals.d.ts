declare module "*.css";
declare namespace JSX {
  interface IntrinsicElements {
    "s-page": any;
    "s-section": any;
    "s-stack": any;
    "s-form-layout": any;
    "s-text-field": any;
    "s-button": any;
    "s-banner": any;
    "s-paragraph": any;
    "s-link": any;
    [key: string]: any;
  }
}