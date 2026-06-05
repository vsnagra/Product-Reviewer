import fs from 'fs';

const state = {
  imageGenerationDelay: 2,
  imageModel: 'gemini',
  characters: [{id: '1', name: 'A'}],
  backgrounds: [{id: '1'}],
  pages: [{id: '1', text: "Hello\nWorld", "imageUrl": "data:image/png;base64,iVBORw0KGg=="}]
};

const rest = {
  imageGenerationDelay: state.imageGenerationDelay,
  imageModel: state.imageModel,
};

const parts = ["{\n"];
let isFirst = true;
for (const [key, value] of Object.entries(rest)) {
  if (value === undefined) continue;
  if (!isFirst) parts.push(",\n");
  parts.push(`  "${key}": ${JSON.stringify(value)}`);
  isFirst = false;
}

if (!isFirst) parts.push(",\n");
parts.push(`  "characters": [\n`);
const chars = state.characters || [];
for (let i = 0; i < chars.length; i++) {
  if (i > 0) parts.push(",\n");
  parts.push("    " + JSON.stringify(chars[i]));
}
parts.push("\n  ]");

parts.push(",\n  \"backgrounds\": [\n");
const bgs = state.backgrounds || [];
for (let i = 0; i < bgs.length; i++) {
  if (i > 0) parts.push(",\n");
  parts.push("    " + JSON.stringify(bgs[i]));
}
parts.push("\n  ]");

parts.push(",\n  \"pages\": [\n");
const pgs = state.pages || [];
for (let i = 0; i < pgs.length; i++) {
  if (i > 0) parts.push(",\n");
  parts.push("    " + JSON.stringify(pgs[i]));
}
parts.push("\n  ]\n}");

const jsonString = parts.join('');

try {
  JSON.parse(jsonString);
  console.log("VALID JSON");
} catch(e) {
  console.log("INVALID JSON", e);
  console.log(jsonString);
}
