# iPhone Duo React H5 图片模块使用指南

## 判断用横图还是封面

页面自行显示图片时，只需要从 [duo-images.mjs](./duo-images.mjs) 导入 `getDuoImageType()`。函数无需参数，每次调用时读取窗口宽高。

```js
import { getDuoImageType } from './duo-images.mjs';

const imageType = getDuoImageType(); // 'duo' 或 'cover'
```

视口宽至少 `640px`、高至少 `500px` 且宽大于高时返回 `'duo'`，其余情况返回 `'cover'`。服务端渲染也返回 `'cover'`。

## 监听开合和旋转引起的布局变化

`watchDuoLayout(onChange)` 在绑定时报告一次结果，之后在布局或选图类型改变时再报告。React 组件可把返回的清理函数交给 `useEffect`。

```js
import { useEffect, useState } from 'react';
import { watchDuoLayout } from './duo-images.mjs';

export function useDuoLayout() {
  const [layout, setLayout] = useState({ screenMode: 'compact', imageType: 'cover' });
  useEffect(() => watchDuoLayout(setLayout), []);
  return layout;
}
```

| 视口示例 | `screenMode` | `imageType` |
| --- | --- | --- |
| `382 × 600`，Duo 外屏 | `'compact'` | `'cover'` |
| `669 × 890`，Duo 展开竖屏 | `'large'` | `'cover'` |
| `951 × 610`，Duo 展开横屏 | `'large'` | `'duo'` |
| `385 × 600`，Duo 系统分屏中的窄窗口 | `'compact'` | `'cover'` |

`screenMode` 依据浏览器窗口的可用尺寸。需要区分真实的合上、半开、完全打开时，由 App 原生层提供铰链状态。配套 `DuoImageViewer` 组件已监听窗口尺寸，可以直接按选图规则显示图片。

## 准备图片

| 字段 | 是否必填 | 用途 |
| --- | --- | --- |
| `coverUrl` | 是 | 普通手机、Duo 外屏、展开竖屏和双图页使用封面。横图缺失或加载失败时也使用它。 |
| `duoLandscapeUrl` | 否 | 单图页的浏览器窗口同时达到大屏门槛且宽大于高时优先使用。 |

如果业务接口的字段名不同，在调用模块前映射为上表中的名称。选填字段可以省略，或传入 `null`、空字符串。

## 导入图片组件

使用配套组件时，将 [DuoImageViewer.jsx](./DuoImageViewer.jsx)、[duo-image-viewer.css](./duo-image-viewer.css) 和 [duo-images.mjs](./duo-images.mjs) 放入 React 项目的同一目录，然后导入 `DuoImageViewer`。

组件通过 `ref` 获取容器和图框，在 `useEffect` 中绑定模块。绑定后会自动随窗口尺寸变化重新选图。图片配置更新时，React 先清理上一次绑定，再按新配置绑定。组件卸载时也会调用模块返回的清理函数。图框在 JSX 中保持为空，子节点交给模块渲染。 [React useEffect](https://react.dev/reference/react/useEffect) · [React DOM refs](https://react.dev/learn/manipulating-the-dom-with-refs#best-practices-for-dom-manipulation-with-refs)

| 组件参数 | 说明 |
| --- | --- |
| `photo` | 主图数据，包含 `coverUrl`，可加 `alt` 和 `duoLandscapeUrl`。接口数据加载期间可传空值，组件会等有主图数据再渲染。 |
| `secondaryPhoto` | 可选。传入第二张图的数据后，组件展示双图，两张图各自使用封面。 |
| `minWidth`、`minHeight` | 可选。大屏布局门槛，默认分别为 `640` 和 `500`，单位为 CSS px。 |
| `className` | 可选。添加到外层容器的样式类，可通过 `--duo-viewer-height` 指定可用高度。 |

组件默认占用整个可用视口高度。如果页面还有固定导航栏，可用 `className` 应用项目样式，并将 `--duo-viewer-height` 设为剩余高度。双图页在宽屏并排，窄屏下可以向下滚动查看第二张图。

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

单图页在大屏横向窗口优先加载横图，旋转到竖向后显示封面。双图页分别显示两条数据的封面。图片默认等比完整显示，图框和图片比例不同时会留边。

## 参数与选图规则

| `bindDuoImages()` 参数 | 说明 |
| --- | --- |
| `container` | 承载图框的 DOM 元素。模块从元素所在的浏览器窗口读取视口宽高，并监听窗口尺寸变化。 |
| `items` | 图片配置数组。每项包含专用 `frame`、`coverUrl`，可加 `alt` 和 `duoLandscapeUrl`。 |
| `view` | 默认 `single`，双图页传 `pair`。 |
| `minWidth`、`minHeight` | 自定义大屏布局门槛，默认分别为 `640` 和 `500`，单位为 CSS px。 |

模块读取 `window.innerWidth` 和 `window.innerHeight`。两者都达到门槛时进入大屏布局。单图页还要求视口宽大于高才优先使用横图。其他单图场景使用封面，双图页始终使用各自封面。横图缺失、请求失败或解码失败时回退到封面，封面也加载失败时显示「图片暂不可用」。

## 在现有组件中只计算选图结果

```js
import { resolveDuoImage } from './duo-images.mjs';

const { sources } = resolveDuoImage({
  coverUrl: '/images/cover.jpg',
  duoLandscapeUrl: '/images/duo-landscape.jpg',
});

const imageUrl = sources[0];
```

函数读取调用时的窗口宽高，服务端渲染时优先使用封面。返回的 `sources` 按尝试顺序排列且去重，调用方自行加载，失败时尝试下一个候选。没有有效图片地址时返回空数组。需要在旋转时更新图片的页面，可在窗口 `resize` 事件中重新调用，或直接使用自动更新的 `DuoImageViewer`。

## 验证接入

将浏览器视口调整为以下宽高，检查显示结果。完整的设备场景见 [H5 适配需求和验收用例](./IPHONE_DUO_H5_PRD.md#验收用例)。

| 示例宽高（CSS px） | 单图页 | 双图页 |
| --- | --- | --- |
| `382 × 600`，Duo 外屏 | 封面 | 上下单列 |
| `844 × 390`，普通手机横置 | 封面 | 上下单列 |
| `669 × 890`，Duo 展开竖向 | 封面 | 左右两列 |
| `951 × 610`，Duo 展开横向 | 横图或封面 | 左右两列 |

再用失效的专用图地址检查封面回退。若页面一直显示「图片加载中…」，先检查 `container` 和 `frame` 的宽高是否都大于零。最后在实际 H5 入口上验证 Duo 开合、旋转和切回双图页时的表现。
