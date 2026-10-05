import mermaid from 'mermaid';

const FONT = "'Inter Variable', ui-sans-serif, system-ui, sans-serif";

// Brand-matched 'base' theme for each colour mode. securityLevel 'strict'
// sanitizes the SVG (strips <script>, disables click bindings, escapes
// injected HTML in labels) - mermaidSyntax ultimately comes from an LLM,
// which is not trusted input, so this is not optional.
const CONFIGS = {
  light: {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: FONT,
    themeVariables: {
      fontFamily: FONT,
      primaryColor: '#eef2ff',
      primaryBorderColor: '#6366f1',
      primaryTextColor: '#1e1b4b',
      secondaryColor: '#fdf4ff',
      tertiaryColor: '#f0fdfa',
      lineColor: '#64748b',
      textColor: '#27272a',
      mainBkg: '#eef2ff',
      nodeBorder: '#6366f1',
      clusterBkg: '#f8fafc',
      clusterBorder: '#cbd5e1',
      noteBkgColor: '#fef9c3',
      noteBorderColor: '#eab308',
      actorBkg: '#eef2ff',
      actorBorder: '#6366f1',
    },
  },
  dark: {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: FONT,
    themeVariables: {
      darkMode: true,
      fontFamily: FONT,
      background: '#18181b',
      primaryColor: '#312e81',
      primaryBorderColor: '#818cf8',
      primaryTextColor: '#e0e7ff',
      secondaryColor: '#3b0764',
      tertiaryColor: '#134e4a',
      lineColor: '#a1a1aa',
      textColor: '#e4e4e7',
      mainBkg: '#312e81',
      nodeBorder: '#818cf8',
      clusterBkg: '#27272a',
      clusterBorder: '#52525b',
      noteBkgColor: '#422006',
      noteBorderColor: '#ca8a04',
      noteTextColor: '#fef3c7',
      actorBkg: '#312e81',
      actorBorder: '#818cf8',
      actorTextColor: '#e0e7ff',
      signalColor: '#e4e4e7',
      signalTextColor: '#e4e4e7',
      labelTextColor: '#e4e4e7',
    },
  },
};

let current = null;
let counter = 0;

// mermaid holds one global config, so re-initialise only when the theme
// actually changes. Renders are serialised by mermaid's own queue.
export async function renderMermaid(syntax, theme = 'light') {
  if (current !== theme) {
    mermaid.initialize(CONFIGS[theme] || CONFIGS.light);
    current = theme;
  }
  counter += 1;
  const { svg } = await mermaid.render(`df-mermaid-${counter}`, syntax);
  return svg;
}
