# iPhone Duo H5 选图方案评估

## 结论

**继续使用封面和 Duo 横图。** 按浏览器视口横竖方向选图是成熟的响应式做法。现有实现适用于 Duo 展开横屏时优先使用横图、合盖或展开竖屏时使用封面的需求。上线前以实际 App 入口的 Duo 真机结果为准。 [CSSOM 视口变化规范](https://drafts.csswg.org/cssom-view/#resizing-viewports) · [WebKit 的 Duo 适配说明](https://webkit.org/blog/18486/#viewport-sizes)

## 当前选图规则

`getDuoImageType()` 无需传入图片或宽高，每次调用读取 `window.innerWidth` 和 `window.innerHeight`。当视口宽至少 **640 CSS px**、高至少 **500 CSS px**，且宽大于高时返回 `duo`。其他情况返回 `cover`。需要随开合或旋转变化时，使用 `watchDuoLayout()` 订阅窗口变化。 [选图代码](./duo-images.mjs) · [React H5 接入指南](./DUO_H5_USAGE.md)

下表以 WebKit 公布的 Safari 27.1 视口尺寸为例。 [WebKit 视口尺寸表](https://webkit.org/blog/18486/#viewport-sizes)

| 场景 | 视口宽 × 高（CSS px） | 选图结果 |
| --- | --- | --- |
| 合盖竖屏 | 382 × 580–618 | 封面 |
| 合盖横屏 | 594 × 368–406 | 封面 |
| 展开竖屏，单窗口 | 669 × 867–902 | 封面 |
| 展开横屏，单窗口 | 951 × 585–620 | Duo 横图 |
| 展开横屏，系统并排的单个窗口 | 385 × 571–609 | 封面 |

## 风险和适用边界

- **App 内 WebView 的实际尺寸可能与 Safari 不同。** 例如，较早 SDK 构建的 App 在展开后可能只占内屏中间区域。实际窗口低于宽或高的任一门槛时，会选封面。 [Apple 的 App 适配说明](https://developer.apple.com/iphone-duo/prepare/)
- **尺寸规则会应用到其他设备。** 达到同样门槛的横屏平板或宽窗口也会选横图。Duo 的内屏分屏窗口仍可能选封面。 [WebKit 的响应式布局说明](https://webkit.org/blog/18486/#viewport-sizes)
- **真实开合状态需要 App 宿主提供。** Safari 27.1 的 Device Posture API 会把完全合上和完全展开都报告为 `continuous`。如果业务需要准确读取合上、半开或完全打开，由 iOS 原生层读取铰链状态并传给 H5。 [WebKit 折叠姿态说明](https://webkit.org/blog/18486/#creating-webpage-layouts-for-a-folding-screen) · [Apple 铰链 API](https://developer.apple.com/videos/play/tech-talks/111464/?time=57)

## 验证进度和真机验收

现有选图函数已通过 **8 组尺寸与断点模拟**，覆盖 Safari 的内外屏和分屏示例、普通手机横屏及门槛边界。Duo 真机上的实际 App 入口仍待验收。

1. 在真实 App 入口依次验证合盖、展开横屏、转为展开竖屏、进入系统分屏、恢复展开横屏。
2. 每次切换记录 `window.innerWidth`、`window.innerHeight`、是否收到 `resize` 和选图结果。重点确认展开横屏能命中横图，转回竖屏能恢复封面。
3. 验证横图缺失或加载失败时的封面回退。配套 React 组件会自动回退，业务页直接调用选图函数时由页面处理图片加载失败。 [接入指南](./DUO_H5_USAGE.md)
