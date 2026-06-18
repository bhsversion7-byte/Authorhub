const visualAssets = [
  { href: "/authorhub-logo.png", rel: "preload", as: "image" },
  { href: "/donation-wechat.png", rel: "prefetch", as: "image" },
  { href: "/donation-alipay.jpg", rel: "prefetch", as: "image" },
];

if (typeof document !== "undefined") {
  visualAssets.forEach((asset) => {
    const link = document.createElement("link");
    link.rel = asset.rel;
    link.as = asset.as;
    link.href = asset.href;
    document.head.appendChild(link);
  });
}
