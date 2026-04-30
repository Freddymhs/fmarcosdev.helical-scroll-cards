# @fmarcosdev/helical-scroll-cards

3D helix scroll component for React + Three.js.  
Virtualized, paginated, touch-ready, SSR-safe, fully typed.

## Install

```bash
npm install @fmarcosdev/helical-scroll-cards
```

## Peer dependencies

```bash
npm install three react react-dom
```

## Basic usage

```tsx
import { HelicalScrollCards } from "@fmarcosdev/helical-scroll-cards";

const items = [
  { id: 1, title: "My first article", publishedAt: "2024-01-15" },
  { id: 2, title: "Another post", publishedAt: "2024-02-20" },
];

export function MyPage() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <HelicalScrollCards items={items} />
    </div>
  );
}
```

## With pagination

```tsx
export function MyPageWithPagination() {
  const { articles, hasMore, loadingMore, loadMore } = useMyArticles();

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <HelicalScrollCards
        items={articles}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}
```

## TypeScript

```tsx
import { HelicalScrollCards } from "@fmarcosdev/helical-scroll-cards";
import type { CardItem, HelixTheme } from "@fmarcosdev/helical-scroll-cards";

interface MyArticle extends CardItem {
  id: number;
  title: string;
  publishedAt: string;
  category: string;
}
```

## Props

| Prop              | Type                                          | Default               | Description                        |
| ----------------- | --------------------------------------------- | --------------------- | ---------------------------------- |
| `items`           | `T[]`                                         | `[]`                  | Array of items to display          |
| `config`          | `HelixConfig`                                 | —                     | Helix configuration                |
| `theme`           | `Partial<HelixTheme>`                         | —                     | Color theme                        |
| `scrollSpeed`     | `number`                                      | `0.5`                 | Scroll velocity                    |
| `clockwise`       | `boolean`                                     | `false`               | Helix rotation direction           |
| `hasMore`         | `boolean`                                     | `false`               | Whether more items can be loaded   |
| `loadingMore`     | `boolean`                                     | `false`               | Loading state                      |
| `onLoadMore`      | `() => void`                                  | —                     | Callback to load more items        |
| `renderCardLabel` | `(item: T, index: number) => string`          | —                     | Custom badge label renderer        |
| `renderCardTitle` | `(item: T) => string`                         | —                     | Custom title renderer              |
| `renderCardDate`  | `(item: T) => { day, month, year } \| null`   | —                     | Custom date renderer               |
| `loadingText`     | `string`                                      | `"Loading more..."`   | Loading indicator text             |
| `emptyText`       | `string`                                      | `"No items to display"` | Empty state text                 |
| `debug`           | `boolean`                                     | `false`               | Show helix line and container border |

## Requirements

- React >= 18
- Three.js >= 0.150.0
- Browser with WebGL support
