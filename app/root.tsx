import type { LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, redirect } from "react-router";
import "./styles/typography.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If this is an embedded request at root, redirect to /app
  const isEmbedded = Boolean(
    url.searchParams.get("embedded") ||
    url.searchParams.get("hmac") ||
    url.searchParams.get("host")
  );
  
  if (isEmbedded && url.pathname === "/") {
    throw redirect(`/app${url.search}`);
  }

  return null;
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="shopify-debug" content="web-vitals" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" async></script>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
