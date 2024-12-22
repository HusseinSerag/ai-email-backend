import TurndownService from "turndown";

export const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  bulletListMarker: "-",
  linkStyle: "inlined",
});
turndown.addRule("linkRemover", {
  filter: "a",
  replacement: (content) => content,
});
// remove style tag
turndown.addRule("styleRemove", {
  filter: "style",
  replacement: () => "",
});
// remove scripts
turndown.addRule("scriptRemover", {
  filter: "script",
  replacement: () => "",
});
turndown.addRule("imageRemover", {
  filter: "img",
  replacement: (content) => content,
});
