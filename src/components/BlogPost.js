import React from "react";
import "../styles/BlogPost.css";
import { Pencil, Clock, MessageSquare } from "lucide-react";

const BlogPost = () => {
  // Mock data similar to the original
  const featuredPost = {
    image: "https://n7media.coolmate.me/uploads/June2025/mceclip9_63.jpg",
    category: "Style Guide",
    title: "How to Build a Timeless Wardrobe: Essentials for Every Season",
    author: "LINH NGUYEN",
    date: "12 JUN 2024",
    comments: 5,
    content:
      "Discover the must-have pieces that form the foundation of a versatile wardrobe. From classic white shirts to the perfect pair of jeans, we break down the essentials that never go out of style. Learn how to mix and match for any occasion, and get tips on caring for your favorite apparel so they last for years. Whether you're updating your closet or starting fresh, these timeless picks will keep you looking sharp all year round.",
  };

  const recentPosts = [
    {
      id: 1,
      image: "https://n7media.coolmate.me/uploads/June2025/quan-short-chino-nam-7inch-1-8-den_91.jpg?aio=w-585",
      title: "Top 5 Summer Shorts for Effortless Comfort",
      author: "Mai Tran",
      date: "10 Jun 2024",
    },
    {
      id: 2,
      image: "https://n7media.coolmate.me/uploads/June2025/quan-short-chino-nam-7inch-1-8-den_91.jpg?aio=w-585",
      title: "Mix & Match: Creating Outfits with Statement Tees",
      author: "Linh Nguyen",
      date: "08 Jun 2024",
    },
    {
      id: 3,
      image: "https://n7media.coolmate.me/uploads/June2025/ao-polo-premium-aircool-1167-trang_10.jpg?aio=w-585",
      title: "The Rise of Polo Shirts: From Sport to Street Style",
      author: "Huy Le",
      date: "05 Jun 2024",
    },
    {
      id: 4,
      image: "https://n7media.coolmate.me/uploads/March2025/ao-in-cotton-cs-nu-cuoi-2d-den_85.jpg?aio=w-355",
      title: "Graphic Tees: Express Yourself with Every Outfit",
      author: "Mai Tran",
      date: "03 Jun 2024",
    },
    {
      id: 5,
      image: "https://n7media.coolmate.me/uploads/June2024/24CMAW.AT025.26.jpg?aio=w-585",
      title: "How to Care for Your Favorite Denim Pieces",
      author: "Huy Le",
      date: "01 Jun 2024",
    },
  ];

  return (
    <div className="blog-post-container">
      <main className="blog-post-main-content" role="main">
        <article className="blog-post-featured">
          <div className="blog-post-image-container">
            <img
              src={featuredPost.image || "https://picsum.photos/1200"}
              alt={featuredPost.title || "Featured Post"}
              loading="lazy"
              onError={(e) => {
                e.target.src = "https://picsum.photos/1200";
                e.target.alt = `Image not available for ${featuredPost.title || "featured post"}`;
              }}
            />
            <span className="blog-post-category">{featuredPost.category}</span>
          </div>
          <div className="blog-post-content">
            <h1>{featuredPost.title}</h1>
            <div className="blog-post-meta">
              <span>
                <Pencil size={14} color="var(--blog-secondary-text)" /> {featuredPost.author}
              </span>
              <span>
                <Clock size={14} color="var(--blog-secondary-text)" /> {featuredPost.date}
              </span>
              <span>
                <MessageSquare size={14} color="var(--blog-secondary-text)" /> {featuredPost.comments}
              </span>
            </div>
            <p>{featuredPost.content}</p>
          </div>
        </article>
      </main>
      <aside className="blog-post-sidebar" role="complementary" aria-label="Recent posts">
        <h2>Recent Posts</h2>
        <ul>
          {recentPosts.map((post) => (
            <li key={post.id}>
              <div className="blog-post-recent-image">
                <img
                  src={post.image || "/placeholder.svg"}
                  alt={post.title}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = "/placeholder.svg";
                    e.target.alt = `Image not available for ${post.title}`;
                  }}
                />
              </div>
              <div className="blog-post-recent-content">
                <h3 title={post.title}>{post.title}</h3>
                <div className="blog-post-recent-meta">
                  <span>
                    <Pencil size={12} color="var(--blog-secondary-text)" /> {post.author}
                  </span>
                  <span>
                    <Clock size={12} color="var(--blog-secondary-text)" /> {post.date}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

export default BlogPost;