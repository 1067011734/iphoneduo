# iPhone Duo React H5 图片模块使用指南

将 [duo-images.mjs](./duo-images.mjs) 放入 React 项目。`.mjs` 是普通 JavaScript 模块，页面组件使用 `.jsx`。`bindDuoImages()` 负责监听尺寸、选图和显示图片。已有图片组件可以只使用 `resolveDuoImage()` 获取列数和图片候选地址。

## 准备图片

| 字段 | 是否必填 | 用途 |
| --- | --- | --- |
| `coverUrl` | 是 | 普通手机、Duo 外屏和双图页使用封面。整屏专用图缺失或加载失败时也使用它。 |
| `duoLandscapeUrl` | 否 | 大屏整屏页的图片框宽大于高时优先使用。 |
| `duoPortraitUrl` | 否 | 大屏整屏页的图片框高大于或等于宽时优先使用。竖向展示效果合格的封面可以直接复用。 |

如果业务接口的字段名不同，在调用模块前映射为上表中的名称。选填字段可以省略，或传入 `null`、空字符串。

## 创建图片组件

在模块同目录下创建 `DuoImageViewer.jsx`。组件通过 `ref` 获取容器和图框，在 `useEffect` 中绑定模块。图片配置更新时，React 先清理上一次绑定，再按新配置绑定。组件卸载时也会调用模块返回的清理函数。图框在 JSX 中保持为空，子节点交给模块渲染。 [React useEffect](https://react.dev/reference/react/useEffect) · [React DOM refs](https://react.dev/learn/manipulating-the-dom-with-refs#best-practices-for-dom-manipulation-with-refs)

```jsx
import { useEffect, useRef } from 'react';
import { bindDuoImages } from './duo-images.mjs';
import './duo-image-viewer.css';

export default function DuoImageViewer({ photo, secondaryPhoto }) {
  const containerRef = useRef(null);
  const firstFrameRef = useRef(null);
  const secondFrameRef = useRef(null);

  const { coverUrl, duoLandscapeUrl, duoPortraitUrl, alt } = photo;
  const secondCoverUrl = secondaryPhoto?.coverUrl;
  const secondAlt = secondaryPhoto?.alt;
  const isPair = secondaryPhoto != null;

  useEffect(() => {
    const items = [{
      frame: firstFrameRef.current,
      coverUrl,
      duoLandscapeUrl,
      duoPortraitUrl,
      alt,
    }];

    if (isPair) {
      items.push({
        frame: secondFrameRef.current,
        coverUrl: secondCoverUrl,
        alt: secondAlt,
      });
    }

    return bindDuoImages({
      container: containerRef.current,
      view: isPair ? 'pair' : 'single',
      items,
    });
  }, [isPair, coverUrl, duoLandscapeUrl, duoPortraitUrl, alt, secondCoverUrl, secondAlt]);

  return (
    <div
      ref={containerRef}
      className={isPair ? 'duo-viewer duo-viewer--pair' : 'duo-viewer'}
    >
      <div ref={firstFrameRef} className="duo-frame" />
      {isPair && <div ref={secondFrameRef} className="duo-frame" />}
    </div>
  );
}
```

将下面的样式保存为 `duo-image-viewer.css`。示例使用整个可用视口作为内容区。如果页面还有固定导航栏，按项目布局给容器设置剩余高度。容器和图框在图片加载前都要有可测量的宽高。双图页通过 `--duo-columns` 切换宽屏两列和窄屏单列，窄屏下可以向下滚动查看第二张图。

```css
.duo-viewer {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  block-size: 100vh;
  block-size: 100dvh;
}

.duo-viewer--pair {
  grid-template-columns: repeat(var(--duo-columns, 1), minmax(0, 1fr));
  grid-auto-rows: minmax(min(360px, 75dvh), 1fr);
  gap: 8px;
  overflow-y: auto;
}

.duo-frame {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  background: #181818;
  color: #fff;
}
```

## 在单图页和双图页使用

接口数据准备好后，将图片配置传给组件。单图页传 `photo`，双图页再传 `secondaryPhoto`。换成实际的接口图片地址，然后通过 React 项目的开发服务器打开页面。移动端页面入口应包含 `width=device-width, initial-scale=1` 的 viewport 设置。

```jsx
import DuoImageViewer from './DuoImageViewer.jsx';

const photo = {
  alt: '清晨的山谷',
  coverUrl: '/images/valley-cover.jpg',
  duoLandscapeUrl: '/images/valley-landscape.jpg',
};

const coastPhoto = {
  alt: '海岸',
  coverUrl: '/images/coast-cover.jpg',
};

export function DetailPage() {
  return <DuoImageViewer photo={photo} />;
}

export function ComparePage() {
  return <DuoImageViewer photo={photo} secondaryPhoto={coastPhoto} />;
}
```

单图页按图片框方向优先加载对应的横图或竖图。示例省略了竖图字段，所以旋转到展开竖向时会显示封面。双图页分别显示两条数据的封面。图片默认等比完整显示，图框和图片比例不同时会留边。

## 参数与选图规则

| `bindDuoImages()` 参数 | 说明 |
| --- | --- |
| `container` | 承载图框的 DOM 元素。模块监听其内容区尺寸。 |
| `items` | 图片配置数组。每项包含专用 `frame`、`coverUrl`，可加 `alt` 和两个方向的图片字段。 |
| `view` | 默认 `single`，双图页传 `pair`。 |
| `minWidth`、`minHeight` | 自定义大屏布局门槛，默认分别为 `640` 和 `500`，单位为 CSS px。 |

内容区宽高都达到门槛才进入大屏布局。单图页进入大屏布局后，模块再按实际图片框的宽高选择横图或竖图。紧凑布局或双图页直接使用封面。专用图缺失、请求失败或解码失败时回退到封面，封面也加载失败时显示「图片暂不可用」。

## 在现有组件中只计算选图结果

```js
import { resolveDuoImage } from './duo-images.mjs';

const { columns, sources } = resolveDuoImage({
  width: 951,
  height: 610,
  imageWidth: 900,
  imageHeight: 560,
  images: {
    coverUrl: './images/cover.jpg',
    duoLandscapeUrl: './images/duo-landscape.jpg',
  },
});

// columns 为 1。
// sources 依次为横图地址、封面地址。
```

`imageWidth` 和 `imageHeight` 可省略，默认沿用内容区宽高。此函数也支持 `view`、`minWidth` 和 `minHeight`。返回的 `sources` 按尝试顺序排列且去重，调用方自行加载，失败时尝试下一个候选。没有有效图片地址时返回空数组。

## 验证接入

将内容区调整为以下宽高，检查显示结果。完整的设备场景见 [H5 适配需求和验收用例](./IPHONE_DUO_H5_PRD.md#验收用例)。

| 示例宽高（CSS px） | 单图页 | 双图页 |
| --- | --- | --- |
| `382 × 600`，Duo 外屏 | 封面 | 上下单列 |
| `844 × 390`，普通手机横置 | 封面 | 上下单列 |
| `669 × 890`，Duo 展开竖向 | 竖图或封面 | 左右两列 |
| `951 × 610`，Duo 展开横向 | 横图或封面 | 左右两列 |

再用失效的专用图地址检查封面回退。若页面一直显示「图片加载中…」，先检查 `container` 和 `frame` 的宽高是否都大于零。最后在实际 H5 入口上验证 Duo 开合、旋转和切回双图页时的表现。
