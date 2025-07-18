import React from "react";
import "../styles/BlogPost.css";
import { Pencil, Clock, MessageSquare } from "lucide-react";

const BlogPost = () => {
  // Mock data similar to the original
  const featuredPost = {
    image: "/images/ski-goggles.png",
    category: "Blog",
    title: "Single Ranking Vertical Style",
    author: "JOHN MAXWELL",
    date: "04 DEC 2015",
    comments: 0,
    content:
      "Sed posuere consectetur est at lobortis. Cras justo odio, dapibus ac facilisis in, egestas eget quam. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  };

  const recentPosts = [
    {
      id: 1,
      image: "https://picsum.photos/60",
      title: "Magna Dapibus Sollicitudin Consectetur Lorem",
      author: "Paul Frank",
      date: "07 Dec 2015",
    },
    {
      id: 2,
      image: "https://picsum.photos/60",
      title: "Adipiscing Nibh Vulputate Tristique Tellus",
      author: "John Maxwell",
      date: "04 Dec 2015",
    },
    {
      id: 3,
      image: "https://picsum.photos/60",
      title: "Dolor Ligula Pharetra Commodo Porta",
      author: "John Maxwell",
      date: "04 Dec 2015",
    },
    {
      id: 4,
      image: "https://picsum.photos/60",
      title: "Malesuada Pellentesque Cras Purus Vehicula",
      author: "Paul Frank",
      date: "04 Dec 2015",
    },
    {
      id: 5,
      image: "https://picsum.photos/60",
      title: "Condimentum Sit Inceptos Fringilla Lorem",
      author: "John Maxwell",
      date: "04 Dec 2015",
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