export const ANNOUNCEMENTS = [
  {
    id: "2026-07-07-share-and-focus-editor",
    date: "2026-07-07",
    summary: "共同编辑链接上线，大纲/设定集可以专注编辑了",
    title: "共同编辑链接 + 专注编辑器",
    body: [
      "现在可以为每本小说生成专属链接：邀请朋友共同编辑，或者只读分享给读者预览。权限随时可以撤回，撤回后对方立刻失去访问权限。",
      "大纲和设定集新增「专注编辑器」——点开卡片右上角的放大图标，就能进入沉浸式写作界面，长文还能拆成多个小标题分页，配合搜索和字数统计，梳理多线叙事更省力。",
      "人物关系图、时间线这些常用的地方也顺手打磨了一遍，用起来更顺滑。",
    ],
    images: [
      { src: "/announcement-share-link.svg", alt: "生成分享链接，邀请协作者共同编辑", caption: "生成链接，邀请他人共同编辑或只读查看" },
      { src: "/announcement-focus-editor.svg", alt: "点击放大图标进入专注编辑器", caption: "大纲/设定集一键放大，支持小标题分页" },
    ],
  },
];

export const LATEST_ANNOUNCEMENT = ANNOUNCEMENTS[0];
