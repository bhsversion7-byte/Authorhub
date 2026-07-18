export const ANNOUNCEMENTS = [
  {
    id: "2026-07-18-rich-text-scratchpad",
    date: "2026-07-18",
    summary: "富文本与草稿本更新：写作样式、思维导图和自动保存现已完善",
    title: "7.18 更新：让临时灵感与长篇正文都能被可靠整理",
    body: [
      "本次更新围绕两类真实创作场景展开：一类是长篇正文需要清楚的层级与重点标记；另一类是灵感出现时，需要一个不打断当前页面、且不容易丢失内容的记录空间。以下功能均可在电脑、平板与手机尺寸下使用。",
    ],
    sections: [
      {
        title: "富文本与专注编辑器",
        why: "纯文本适合快速输入，但在大纲、设定集和线索密集的内容中，重点、层级与状态需要被明确区分。",
        description: "大纲、设定集、人物背景、隐藏设定、时间线剧情与草稿本现在共用同一套安全富文本能力；专注编辑器保存后的排版会同步显示在原文本框中。",
        steps: [
          "点击文本框右上角的放大按钮进入专注编辑器，再使用顶部“Aa 文本样式”，可调整加粗、斜体、下划线、删除线、六种文字颜色、对齐、列表、缩进与字号；保存后原卡片会直接显示完整排版。",
          "在桌面端选中文字后右键，可直接打开快捷样式栏；也可使用 Ctrl+B / I / U 与 Alt+D / R / Y / G / B / P。",
          "退出专注编辑器时，选择“取消并退出”会丢弃本次全部更改；选择“保存并退出”会保存并同步全部更改。",
        ],
      },
      {
        title: "全局草稿本与思维导图",
        why: "零散句子、临时线索与结构想法不应被迫塞进某一本小说，也不应因为关闭面板或刷新页面而消失。",
        description: "右侧草稿本属于当前登录账号，不进入小说分享或导出。文本会先即时写入本地，再自动同步云端；思维导图与正文保存在同一份私人草稿中。",
        steps: [
          "点击右侧“草稿本”打开工作区；点击右上角“文本”或选中文字后右键即可打开完整样式，关闭、重新打开或刷新后仍会恢复内容。",
          "切换到“思维图”，可新增根主题、子主题、同级主题和大子集（重点分支），并拖动、连线、修改文字样式或删除节点及其子级。",
          "使用“横向重排”或“纵向重排”整理复杂结构；右侧音乐播放器与草稿入口均可拖动调整位置。",
        ],
      },
      {
        title: "阅读设置与低干扰工具",
        why: "不同作者对辅助工具的使用频率不同，页面应只保留当前创作所需的信息。",
        steps: [
          "在作者主页的“全站阅读设置”中，可分别开启或关闭音乐播放器与草稿本；关闭功能不会删除数据。",
          "时间线参考图片区在没有图片时默认收起，也可使用底部中央按钮手动展开或收起。",
        ],
      },
      {
        title: "星图、协作与交付稳定性",
        description: "星图现按单节点或关系双端点精确聚焦，双击节点可放大定位；共同编辑提醒会区分作者与协作者，并标明对应 ID。修复已知bug，增强保密强度并创建标准化CICD流程。",
      },
    ],
    images: [
      { src: "/announcement-focus-editor.svg", alt: "专注编辑器与富文本样式入口", caption: "进入专注编辑器后使用 Aa 排版，保存结果会同步显示在原卡片" },
      { src: "/announcement-area-lock.svg", alt: "人物星图选择与位置锁定", caption: "单节点聚焦、关系双端点与位置锁定继续保持" },
    ],
  },
  {
    id: "2026-07-08-area-lock",
    date: "2026-07-08",
    summary: "星图区域锁定功能上线，修复了几个操作细节的 bug",
    title: "2026-07-08 更新星图区域锁定功能，并修复已知bug，感谢uu们的打赏^^❤",
    body: [
      "人物关系星图新增了「区域锁定」，用来固定住已经排好的星球，用法就三步：",
      "1. 按住 Shift 键，鼠标左键拖出一个方框，圈住想固定的几颗星球。",
      "2. 松手后右键点一下，菜单里选「锁定位置」。",
      "3. 锁定的星球会显示一圈淡淡的方形虚线提醒你——之后不管怎么拖动其他星球、新增多少人物，它们都不会再被打乱位置。想解开就再框一次，右键选「取消锁定」。（平时不按 Shift 的正常拖拽、平移完全不受影响。）",
      "同时修了几个之前一直没发现的小问题：专注编辑器里上下滚动会有点卡顿，现在顺滑了很多；「重置视图」之前只会把星球位置摆正，缩放大小却没跟着重置，现在两个一起回到最佳视角；人物/时间点卡片切换时，没保存的修改以前会被悄悄丢掉，现在会先问一句要不要保存。",
      "此外还处理了一些边界情况的 bug，涉及焦点编辑器的保存逻辑、部分浏览器下的界面缩放适配，以及图片存储的空间优化，整体应该更稳更省心了。",
      "最后想跟大家说一声谢谢：这段时间收到的每一份打赏我都记在心里，真的很开心有人愿意支持这个小小的创作工具。会一直好好做下去的——有什么想法，欢迎随时跟我说 ^^",
    ],
    images: [{ src: "/announcement-area-lock.svg", alt: "按住 Shift 拖框选中星球，右键选择锁定位置", caption: "Shift + 拖框选中，右键「锁定位置」即可固定星球排布" }],
  },
  {
    id: "2026-07-07-july-roundup",
    date: "2026-07-07",
    summary: "共同编辑链接、专注编辑器上线，人物关系图和时间线也更顺手了",
    title: "7 月更新：共同编辑、专注编辑器与更多打磨",
    body: [
      "现在可以为每本小说生成专属链接：选「共同编辑」邀请朋友一起写，或选「只读查看」把大纲、设定集这些内容整理成一份安静的读物分享给读者。权限握在你手里，链接随时可以撤回，撤回后对方立刻失去访问权限；共同编辑时，谁保存了新内容，双方都会看到一句简短提示，不必担心被悄悄覆盖。",
      "大纲和设定集新增了「专注编辑器」——点开卡片右上角的放大图标，就能进入一整页的沉浸写作视图；内容长了还可以拆成多个小标题分页，配合搜索和字数统计，梳理多线索的故事会轻松不少。",
      "人物关系图和时间线这两处常用的地方也顺手打磨了一遍：关系图的排布更清楚，人物标签支持多选和拖拽整理，时间线可以直接拖动排序。",
      "另外修复了一些已知 bug，涉及分享链接细节、图片上传和账号安全的边界情况，持续让整体使用更稳。",
    ],
    images: [
      { src: "/announcement-share-link.svg", alt: "生成分享链接，邀请协作者共同编辑", caption: "生成链接，邀请他人共同编辑或只读查看" },
      { src: "/announcement-focus-editor.svg", alt: "点击放大图标进入专注编辑器", caption: "大纲/设定集一键放大，支持小标题分页" },
    ],
  },
];

export const ANNOUNCEMENT_PAGE_SIZE = 3;

export function getAnnouncementPage(announcements, requestedPage, pageSize = ANNOUNCEMENT_PAGE_SIZE) {
  const items = Array.isArray(announcements) ? announcements : [];
  const numericSize = Number(pageSize);
  const parsedSize = Number.isFinite(numericSize) ? Math.trunc(numericSize) : ANNOUNCEMENT_PAGE_SIZE;
  const size = Math.max(1, parsedSize);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const numericPage = Number(requestedPage);
  const parsedPage = Number.isFinite(numericPage) ? Math.trunc(numericPage) : 0;
  const page = Math.min(totalPages - 1, Math.max(0, parsedPage));
  const start = page * size;

  return { items: items.slice(start, start + size), page, totalPages };
}

export const LATEST_ANNOUNCEMENT = ANNOUNCEMENTS[0];
