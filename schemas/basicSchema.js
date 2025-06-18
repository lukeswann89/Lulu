import { Schema } from "prosemirror-model"

// Basic schema for Lulu editor - supports rich text editing
export const basicSchema = new Schema({
  nodes: {
    doc: {
      content: "block+"
    },
    
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() { return ["p", 0] }
    },
    
    text: {
      group: "inline"
    },
    
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() { return ["br"] }
    },
    
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } }
      ],
      toDOM(node) { return ["h" + node.attrs.level, 0] }
    },
    
    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [{ tag: "blockquote" }],
      toDOM() { return ["blockquote", 0] }
    },
    
    code_block: {
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM() { return ["pre", ["code", 0]] }
    },
    
    list_item: {
      content: "paragraph block*",
      parseDOM: [{ tag: "li" }],
      toDOM() { return ["li", 0] }
    },
    
    bullet_list: {
      content: "list_item+",
      group: "block",
      parseDOM: [{ tag: "ul" }],
      toDOM() { return ["ul", 0] }
    },
    
    ordered_list: {
      attrs: { order: { default: 1 } },
      content: "list_item+",
      group: "block",
      parseDOM: [{ 
        tag: "ol", 
        getAttrs(dom) {
          return { order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1 }
        } 
      }],
      toDOM(node) { 
        return node.attrs.order == 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0] 
      }
    }
  },
  
  marks: {
    strong: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b", getAttrs: node => node.style.fontWeight != "normal" && null },
        { style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }
      ],
      toDOM() { return ["strong", 0] }
    },
    
    em: {
      parseDOM: [
        { tag: "i" }, 
        { tag: "em" },
        { style: "font-style=italic" }
      ],
      toDOM() { return ["em", 0] }
    },
    
    code: {
      parseDOM: [{ tag: "code" }],
      toDOM() { return ["code", 0] }
    },
    
    link: {
      attrs: {
        href: {},
        title: { default: null }
      },
      inclusive: false,
      parseDOM: [{
        tag: "a[href]",
        getAttrs(dom) {
          return { href: dom.getAttribute("href"), title: dom.getAttribute("title") }
        }
      }],
      toDOM(node) { 
        let { href, title } = node.attrs
        return ["a", { href, title }, 0]
      }
    }
  }
})