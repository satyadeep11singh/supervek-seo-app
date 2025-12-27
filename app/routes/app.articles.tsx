import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "react-router";

interface Article {
  id: string;
  title: string;
  handle: string;
  isPublished: boolean;
  createdAt: string;
}

interface BlogData {
  blogs: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        articles: {
          edges: Array<{
            node: Article;
          }>;
        };
      };
    }>;
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `query {
        blogs(first: 10) {
          edges {
            node {
              id
              title
              articles(first: 50) {
                edges {
                  node {
                    id
                    title
                    handle
                    isPublished
                    createdAt
                  }
                }
              }
            }
          }
        }
      }`
    );

    const data = (await response.json()) as { data: BlogData };
    const blogs = data.data.blogs.edges;

    // Flatten all articles from all blogs
    const allArticles: Article[] = [];
    blogs.forEach((blog) => {
      blog.node.articles.edges.forEach((article) => {
        allArticles.push(article.node);
      });
    });

    // Filter to show only Draft articles (isPublished === false)
    const draftArticles = allArticles.filter((article) => !article.isPublished);

    // Sort by creation date (newest first)
    draftArticles.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      articles: draftArticles,
      shop: session?.shop.replace(".myshopify.com", ""),
    };
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return {
      articles: [],
      shop: session?.shop.replace(".myshopify.com", ""),
    };
  }
};

export default function ArticlesPage() {
  const { articles, shop } = useLoaderData<typeof loader>();

  return (
    <>
      <s-page heading="Generated Articles" />

      {articles.length === 0 ? (
        <div style={{ padding: "2rem" }}>
          <s-banner tone="info">
            <p><strong>No Draft Articles Yet</strong></p>
            <p>No draft articles created yet. Go to the home page to generate your first blog post!</p>
          </s-banner>
        </div>
      ) : (
        <div style={{ padding: "2rem" }}>
          <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.875rem", fontWeight: "700", color: "#1f2937", margin: "0 0 0.5rem 0" }}>
                Your Draft Articles
              </h2>
              <p style={{ color: "#6b7280", margin: "0", fontSize: "1rem" }}>
                {articles.length} {articles.length === 1 ? "article" : "articles"} ready to be edited or published
              </p>
            </div>
            <Link
              to="/app"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.95rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4b5563";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6b7280";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ← Back to Generator
            </Link>
          </div>

          <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "#fff",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1.25rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "1.25rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: "120px",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1.25rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: "140px",
                    }}
                  >
                    Created
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "1.25rem",
                      fontWeight: "600",
                      color: "#374151",
                      fontSize: "0.875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      width: "100px",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, index) => {
                  const createdDate = new Date(article.createdAt);
                  const formattedDate = createdDate.toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }
                  );

                  return (
                    <tr
                      key={article.id}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                        transition: "background-color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f9fafb";
                      }}
                    >
                      <td
                        style={{
                          padding: "1.25rem",
                          color: "#1f2937",
                          fontWeight: "500",
                        }}
                      >
                        {article.title}
                      </td>
                      <td
                        style={{
                          padding: "1.25rem",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.5rem 1rem",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                          }}
                        >
                          Draft
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1.25rem",
                          color: "#6b7280",
                          fontSize: "0.95rem",
                        }}
                      >
                        {formattedDate}
                      </td>
                      <td
                        style={{
                          padding: "1.25rem",
                          textAlign: "center",
                        }}
                      >
                        <a
                          href={`https://admin.shopify.com/store/${shop}/content/articles/${article.id.split("/").pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "0.625rem 1rem",
                            backgroundColor: "#3b82f6",
                            color: "#fff",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                            border: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#1d4ed8";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 6px rgba(59, 130, 246, 0.3)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#3b82f6";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
