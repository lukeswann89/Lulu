// /components/editorData.js
export const defaultValue = [
  {
    type: "paragraph",
    children: [
      { text: '"Please speak to me," Sylvia begged Virginia the following day.' }
    ]
  },
  {
    type: "paragraph",
    children: [
      { text: "Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion." }
    ]
  },
  {
    type: "paragraph",
    children: [
      { text: "It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again." }
    ]
  }
];

export const initialSuggestions = [
  {
    id: 1,
    type: "Line",
    icon: "📜",
    color: "#fef3c7",
    original: '"Please speak to me,"',
    suggestion: '"Could you please speak to me?"',
    why: "Makes it more polite.",
    state: "pending"
  },
  {
    id: 2,
    type: "Line",
    icon: "📜",
    color: "#fef3c7",
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    why: "Places agency with Virginia.",
    state: "pending"
  }
];
