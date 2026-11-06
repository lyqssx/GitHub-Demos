# iOS 已安装旧版 App：NFC 与 Universal Link 兼容性

## 当前结论

此前的二维码入口与本次 NFC 均使用 Universal Link 机制，但业务路径不同：原入口主要为 `/apps/`，NFC 为 `/clip/?v=1&type=nfc&model=...&mac=...`。

**旧版能被唤起，不等于旧版能够处理 NFC 设备路由；也不能据此判断一定进入 download 页面。**

| 系统将链接交给谁 | 之后由谁决定页面 | 当前可确认的去向 |
| --- | --- | --- |
| 支持 NFC 路由的完整 App | 新版链接解析、登录及账号绑定判断 | 按已确认方案进入控制页或对应型号配网准备页 |
| 尚未接入 NFC 路由的旧版 App | 旧版的 Universal Link 回调与未知路径兜底代码 | 旧版 App 已唤起；实际落点待验证，不预设首页或 download |
| 浏览器／网页 | `/clip/` 的 HTTPS 返回内容及网页脚本 | 按网页配置展示兜底／下载落地页；与 App 内兜底区分 |

用户提供的真机截图显示“在 Momcozy 中打开”，支持该设备当时把入口指向完整 App。截图未展示点按后的页面，不能据此确认 download、首页或其他结果。

## 原技术方案的证据

用户提供的接入技术文档 §3.4 记录：

- 冷启动和热启动的 Universal Link 入口当时默认按 `.apps` 分发。
- `.apps` 入口只识别原 `/apps/` 业务，主 App 的 `/clip/` 直接唤起尚未完整接入。
- 应在入口层按域名及路径区分 `/clip/` 与 `/apps/`，将 NFC URL 交给相应解析器。

该记录能证明存在“系统可唤起，但业务入口尚未接线”的风险。它不是某个已发布旧版本的完整源码／真机验收记录，不能据此断言所有旧版本最终停在哪一页。

## Apple 规则与边界

- Universal Link 的域名关联与 App 内 URL 处理是两件事。Apple 文档要求应用接收 `NSUserActivity.webpageURL` 后，自行解析链接并决定动作。
- AASA 新增 `/clip/` 匹配规则，可以改变符合条件的关联分发；不会替已发布的旧版补写参数解析、页面路由或升级弹窗。
- 还需核对旧安装包签名中的 Associated Domains 是否已包含对应域名，以及设备实际关联是否生效。仅服务端 AASA 已更新，不等于所有旧安装都已验证通过。
- AASA 的路径规则不能直接以“App 版本是否支持 NFC”作为业务分流条件。
- Apple 明确完整 App 已安装后会接收 App Clip 调用，App 需要自行处理该链接。不能期待系统因为完整 App 较旧就自动回退运行 App Clip。
- 官方论坛也说明：某些 Clip 调用仍可能展示卡片，但卡片的打开动作会打开完整 App。因此卡片／通知的外观不能用来判断安装版本是否支持 NFC。本 Demo 的普通 NFC 通知路径与用户实测示例分别保留，不把单一样式写成所有调用的唯一形式。
- 没有依据证明“完整 App 已打开但不认识 `/clip/`，iOS 就必定替它跳转 download”。若存在该行为，应确认是旧版代码、内置 WebView、浏览器跳转还是网站重定向实现。

## Demo 展示与产品方案

- 按本次产品反馈，旧版场景默认展示 **NFC 通知 → 原有下载落地页 → 点击原按钮尝试打开已安装 App**，移除“旧版 App 页面占位”。
- 这是一条有条件的网页兼容方案，**不是经真机证实的全部旧版本默认行为**。必须确认入口能进入网页；若旧安装包的关联已匹配并直接接收 URL，网页脚本不会先执行，不能靠网页代码强制保证旧版经过此页。
- 用户此前真机截图的“在 Momcozy 中打开”提示指向 App 分发。因此该截图对应情形不能直接当成“默认会进 Safari 下载页”的证据；网页方案需单独验证。
- 网页复用“落地页新增 SN”原型。该原型只提供视觉及 SN 逻辑，原下载／唤起代码不在其中；不能由它证明线上按钮如何判断或打开旧版。
- 本地预设旧版已安装，按钮通过消息桥接模拟发起唤起请求，不读取真实安装列表、不执行 Scheme／外部 App 打开、不伪造已打开成功或后续页面。请求后保留落地页，右侧说明实际唤起需真机验证。
- Safari 内点击同域 Universal Link 可能继续留在 Safari。需核对原网页采用的链接、域名、Scheme 和旧版支持范围；不能简单把相同 `/clip/` 地址再点击一次视为必定唤起成功。
- 已有登录／绑定分流只针对支持 NFC 业务路由的版本；旧版不能直接套用。完整流程图同时保留系统 App 直达与网页处理的条件分支。

## 需要研发确认的三项信息

1. **旧版具体版本及签名关联**：版本号／build、Associated Domains，确认是否已包含 `applinks:qr.momcozy.com`；给出首个完整支持 NFC 路由的版本。
2. **旧版 URL 兜底代码与实测**：`AppDelegate` 的冷／热启动处理、`universalURLHandle` 与 `.apps` 对未知路径的处理；若使用 Scene，同时检查对应回调。用同一条真实 `/clip/` 链接分别测冷启动、前台及后台状态，记录实际页面。
3. **download 的具体归属**：它是原生页面、App 内 WebView，还是 Safari 的网页；同时确认 `/clip/` 实际 HTTPS 页面及脚本是否会导向该页面。需要对应 URL 或路由代码，不能仅凭页面名称判断。

如果旧版没有既有兼容／版本提示能力，本期不能承诺为存量二进制补上新弹窗。兼容方案须在上述结果明确后确定；更新后是否需要再次碰 NFC，也要按实际参数接续能力验证，不默认自动恢复目标。

## 官方依据

核对日期：2026-11-05。

- [Apple：Universal Link 直接打开 App 与未安装时网页承接](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Apple：Supporting universal links in your app](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Apple 官方人员：完整 App 已安装时接收 App Clip 调用](https://developer.apple.com/forums/thread/704913)
