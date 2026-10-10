import mermaid from 'mermaid';

const FONT = "'Geist Variable', ui-sans-serif, system-ui, sans-serif";

// Drafting themes. Light = ink line work on drafting paper; dark =
// pale line work on a cyanotype blueprint. securityLevel 'strict'
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
      fontSize: '14px',
      background: 'transparent',
      primaryColor: '#fdfcf8',
      primaryBorderColor: '#1c1b17',
      primaryTextColor: '#1c1b17',
      secondaryColor: '#f6f3ec',
      secondaryBorderColor: '#403c33',
      tertiaryColor: '#eeeae0',
      tertiaryBorderColor: '#776f62',
      lineColor: '#403c33',
      textColor: '#1c1b17',
      mainBkg: '#fdfcf8',
      nodeBorder: '#1c1b17',
      clusterBkg: '#f6f3ec',
      clusterBorder: '#a1988a',
      edgeLabelBackground: '#f6f3ec',
      noteBkgColor: '#fbe0d4',
      noteBorderColor: '#c63f19',
      noteTextColor: '#1c1b17',
      actorBkg: '#fdfcf8',
      actorBorder: '#1c1b17',
      actorTextColor: '#1c1b17',
      signalColor: '#1c1b17',
      signalTextColor: '#1c1b17',
      labelBoxBkgColor: '#fdfcf8',
      labelBoxBorderColor: '#1c1b17',
      activationBkgColor: '#eeeae0',
      activationBorderColor: '#1c1b17',
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
      fontSize: '14px',
      background: 'transparent',
      primaryColor: '#152b42',
      primaryBorderColor: '#d8e4ee',
      primaryTextColor: '#eef4f9',
      secondaryColor: '#1e3650',
      secondaryBorderColor: '#b6c9da',
      tertiaryColor: '#2b4661',
      tertiaryBorderColor: '#8fa9c1',
      lineColor: '#b6c9da',
      textColor: '#eef4f9',
      mainBkg: '#152b42',
      nodeBorder: '#d8e4ee',
      clusterBkg: '#0e2236',
      clusterBorder: '#52708c',
      edgeLabelBackground: '#0e2236',
      noteBkgColor: '#3a2016',
      noteBorderColor: '#ff7f55',
      noteTextColor: '#fbe0d4',
      actorBkg: '#152b42',
      actorBorder: '#d8e4ee',
      actorTextColor: '#eef4f9',
      signalColor: '#d8e4ee',
      signalTextColor: '#eef4f9',
      labelTextColor: '#eef4f9',
      labelBoxBkgColor: '#152b42',
      labelBoxBorderColor: '#d8e4ee',
      activationBkgColor: '#1e3650',
      activationBorderColor: '#d8e4ee',
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
