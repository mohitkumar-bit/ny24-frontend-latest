import type { Post } from '@/components/home/FeedCard';

const POSTS_PER_PROMO_BLOCK = 3;

function isVideoAd(post: Post) {
  return !!(post.isVideoPost && post.videoUrl);
}

function isBannerAd(post: Post) {
  return !!(post.isBannerAd && post.bannerUrl);
}

function appendPromoPair(
  feed: Post[],
  videos: Post[],
  banners: Post[],
  counters: { video: number; banner: number }
) {
  if (videos.length > 0) {
    feed.push(videos[counters.video % videos.length]);
    counters.video += 1;
  }
  if (banners.length > 0) {
    feed.push(banners[counters.banner % banners.length]);
    counters.banner += 1;
  }
}

/** Match backend feed: 1 video + 1 banner after every 3 regular posts. */
export function buildInterleavedFeed(posts: Post[]): Post[] {
  const videos = posts.filter(isVideoAd);
  const banners = posts.filter(isBannerAd);
  const regularPosts = posts.filter((post) => !isVideoAd(post) && !isBannerAd(post));

  const feed: Post[] = [];
  const counters = { video: 0, banner: 0 };

  if (regularPosts.length === 0) {
    const rounds = Math.max(videos.length, banners.length);
    for (let i = 0; i < rounds; i += 1) {
      appendPromoPair(feed, videos, banners, counters);
    }
    return feed;
  }

  let postsSincePromo = 0;
  for (const post of regularPosts) {
    feed.push(post);
    postsSincePromo += 1;
    if (postsSincePromo === POSTS_PER_PROMO_BLOCK) {
      appendPromoPair(feed, videos, banners, counters);
      postsSincePromo = 0;
    }
  }

  return feed;
}
