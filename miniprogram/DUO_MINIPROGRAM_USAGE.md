# iPhone Duo 微信小程序图片适配

将 [duo-images.js](./duo-images.js) 放入微信小程序的代码根目录，例如 `utils/duo-images.js`。模块根据微信上报的窗口宽高选择图片类型，业务页面负责提供图片地址。

## 单次判断

```js
const { getDuoImageType } = require('../../utils/duo-images');

const imageType = getDuoImageType(); // 'duo' 或 'cover'
```

窗口宽至少 `640px`、高至少 `500px` 时判为大屏。大屏且宽大于高时返回 `'duo'`，其他情况返回 `'cover'`。判断使用 `wx.getWindowInfo()` 的 `windowWidth` 和 `windowHeight`。较旧的基础库通过 `wx.getSystemInfoSync()` 读取同名字段。 [腾讯窗口信息文档](https://www-sg.tencentcloud.com/zh/document/product/1219/57697)

## 在页面中监听变化

在页面的 JSON 配置里启用手机横竖屏切换。旋转后，按微信小程序窗口变化更新布局。 [腾讯渲染层文档](https://www-sg.tencentcloud.com/zh/document/product/1219/61744)

```json
{
  "pageOrientation": "auto"
}
```

将下面的逻辑加入页面 JS，并把示例地址换成实际素材。`watchDuoLayout()` 订阅时立即报告一次状态。随后，只有布局或图片类型改变时才会再次报告。页面隐藏或卸载时，调用返回的函数取消监听。 [腾讯窗口事件文档](https://www-sg.tencentcloud.com/zh/document/product/1219/57756) · [腾讯页面生命周期文档](https://indonesia.tencentcloud.com/zh/document/product/1219/61713)

```js
const { watchDuoLayout } = require('../../utils/duo-images');

Page({
  data: {
    screenMode: 'compact',
    imageType: 'cover',
    coverUrl: '/assets/cover.jpg',
    duoLandscapeUrl: '/assets/duo-landscape.jpg',
    duoImageFailed: false,
  },

  onShow() {
    if (this.stopWatchingDuo) return;
    this.stopWatchingDuo = watchDuoLayout(layout => this.setData(layout));
  },

  onHide() {
    this.stopDuoLayout();
  },

  onUnload() {
    this.stopDuoLayout();
  },

  stopDuoLayout() {
    if (!this.stopWatchingDuo) return;
    this.stopWatchingDuo();
    this.stopWatchingDuo = null;
  },

  onDuoImageError() {
    this.setData({ duoImageFailed: true });
  },
});
```

页面 WXML 根据 `imageType` 选图。横图未配置或加载失败时显示封面。

```xml
<image
  wx:if="{{imageType === 'duo' && duoLandscapeUrl && !duoImageFailed}}"
  src="{{duoLandscapeUrl}}"
  mode="aspectFit"
  binderror="onDuoImageError"
/>
<image wx:else src="{{coverUrl}}" mode="aspectFit" />
```

## 验收用例

下表为模拟输入。微信真机窗口尺寸以 `wx.getWindowInfo()` 和窗口变化事件的上报值为准。

| 窗口宽 × 高 | `screenMode` | `imageType` |
| --- | --- | --- |
| `382 × 600` | `'compact'` | `'cover'` |
| `844 × 390` | `'compact'` | `'cover'` |
| `669 × 890` | `'large'` | `'cover'` |
| `951 × 610` | `'large'` | `'duo'` |
| `640 × 500` | `'large'` | `'duo'` |

真机测试时依次合盖、展开、旋转，再返回页面，确认微信上报新尺寸并触发更新。`screenMode` 表示窗口大小，真实铰链状态由宿主提供。若当前环境只有窗口信息接口，模块会在订阅时报告一次初始状态。
