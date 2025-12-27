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

    // Sort by creation date (newest first)
    allArticles.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      articles: allArticles,
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
      <s-page heading="Generated Articles">
        <Link to="/app" slot="breadcrumbAction" style={{ marginRight: "auto" }}>
          ← Back to Generator
        </Link>
      </s-page>

      {articles.length === 0 ? (
        <s-banner tone="info">
          <p><strong>No Articles Yet</strong></p>
          <p>No articles created yet. Go to the home page to generate your first blog post!</p>
        </s-banner>
      ) : (
        <div style={{ padding: "2rem" }}>
          <h2 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "600" }}>
            Articles ({articles.length})
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "1.4rem",
                border: "1px solid #e3e3e3",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderBottom: "2px solid #e3e3e3",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1rem",
                      fontWeight: "600",
                      color: "#595959",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1rem",
                      fontWeight: "600",
                      color: "#595959",
                      width: "100px",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "1rem",
                      fontWeight: "600",
                      color: "#595959",
                      width: "150px",
                    }}
                  >
                    Created
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      fontWeight: "600",
                      color: "#595959",
                      width: "150px",
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
                        borderBottom: "1px solid #e3e3e3",
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#fafafa",
                      }}
                    >
                      <td
                        style={{
                          padding: "1rem",
                          color: "#202223",
                        }}
                      >
                        {article.title}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "4px",
                            fontSize: "1.2rem",
                            fontWeight: "500",
                            backgroundColor: article.isPublished
                              ? "#d3f9d8"
                              : "#fff3bf",
                            color: article.isPublished
                              ? "#2b8a3e"
                              : "#9c6e00",
                          }}
                        >
                          {article.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          color: "#595959",
                        }}
                      >
                        {formattedDate}
                      </td>
                      <td
                        style={{
                          padding: "1rem",
                          textAlign: "center",
                        }}
                      >
                        <a
                          href={`https://admin.shopify.com/store/${shop}/content/articles/${article.id.split("/").pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "0.6rem 1.2rem",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontSize: "1.2rem",
                            fontWeight: "500",
                            transition:
                              "background-color 0.2s ease",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "#0056b3";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "#007bff";
                          }}
                        >
                          View
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
