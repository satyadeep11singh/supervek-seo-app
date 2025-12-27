// Unified style constants for consistent typography throughout the app

export const TYPOGRAPHY_STYLES = {
  // Heading Styles
  headingPage: {
    fontSize: "1.875rem",
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: "1.25",
    margin: "0 0 1rem 0",
  },
  
  headingSection: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: "1.25",
    margin: "0 0 1rem 0",
  },
  
  headingSubsection: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: "1.25",
    margin: "0 0 0.5rem 0",
  },
  
  headingCard: {
    fontSize: "1rem",
    fontWeight: "700",
    color: "#1f2937",
    lineHeight: "1.25",
    margin: "0 0 0.75rem 0",
  },
  
  // Body Text Styles
  bodyLarge: {
    fontSize: "1rem",
    fontWeight: "400",
    color: "#1f2937",
    lineHeight: "1.5",
  },
  
  body: {
    fontSize: "0.875rem",
    fontWeight: "400",
    color: "#4b5563",
    lineHeight: "1.5",
  },
  
  bodySmall: {
    fontSize: "0.75rem",
    fontWeight: "400",
    color: "#6b7280",
    lineHeight: "1.5",
  },
  
  // Label Styles
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: "1.5",
  },
  
  labelSmall: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: "1.5",
  },
  
  // Button Styles
  buttonPrimary: {
    fontSize: "1rem",
    fontWeight: "600",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease",
  },
  
  buttonSecondary: {
    fontSize: "0.875rem",
    fontWeight: "600",
    padding: "0.625rem 1.25rem",
    borderRadius: "6px",
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease",
  },
  
  // Badge/Category Styles
  badge: {
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#6b7280",
    lineHeight: "1.25",
  },
  
  // Helper Text
  helper: {
    fontSize: "0.75rem",
    fontWeight: "400",
    color: "#9ca3af",
    lineHeight: "1.5",
  },
};

// Common button hover state helper
export const buttonHoverEffect = (currentColor: string, hoverColor: string) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = hoverColor;
    e.currentTarget.style.transform = "translateY(-2px)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = currentColor;
    e.currentTarget.style.transform = "translateY(0)";
  },
});

// Common card hover effect
export const cardHoverEffect = () => ({
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "#f3f4f6";
    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
  },
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "#f9fafb";
    e.currentTarget.style.boxShadow = "none";
  },
});
