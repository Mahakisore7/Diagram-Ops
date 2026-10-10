import {
  GitBranch,
  ArrowLeftRight,
  Boxes,
  Database,
  Workflow,
  CalendarRange,
  Network,
} from 'lucide-react';

// Single source of truth for how each diagram type is presented. The keys
// must match DIAGRAM_TYPES in the backend's models/Diagram.js.
export const DIAGRAM_TYPES = {
  flowchart: {
    label: 'Flowchart',
    icon: GitBranch,
    description: 'Processes, decisions and branching logic',
    code: 'FC',
  },
  sequence: {
    label: 'Sequence',
    icon: ArrowLeftRight,
    description: 'Messages between services over time',
    code: 'SQ',
  },
  class: {
    label: 'Class',
    icon: Boxes,
    description: 'Objects, attributes and relationships',
    code: 'CL',
  },
  er: {
    label: 'Entity-Relationship',
    icon: Database,
    description: 'Tables, keys and cardinality',
    code: 'ER',
  },
  state: {
    label: 'State',
    icon: Workflow,
    description: 'Lifecycle states and transitions',
    code: 'ST',
  },
  gantt: {
    label: 'Gantt',
    icon: CalendarRange,
    description: 'Timelines, phases and milestones',
    code: 'GT',
  },
  mindmap: {
    label: 'Mind map',
    icon: Network,
    description: 'Ideas branching from a central topic',
    code: 'MM',
  },
};

export const TYPE_KEYS = Object.keys(DIAGRAM_TYPES);

export function typeMeta(type) {
  return DIAGRAM_TYPES[type] || { label: type, icon: GitBranch, description: '', code: '??' };
}

// Starter prompts for the Studio. Each is a realistic engineering request,
// not lorem ipsum, so a new user's first diagram is immediately useful.
export const TEMPLATES = [
  {
    title: 'CI/CD pipeline',
    type: 'flowchart',
    prompt:
      'A developer pushes code to GitHub, Jenkins runs unit tests, then a SonarQube scan, then OWASP dependency check. If any gate fails, notify the developer. Otherwise build a Docker image, scan it with Trivy, and push it to Amazon ECR.',
  },
  {
    title: 'OAuth login',
    type: 'sequence',
    prompt:
      'The browser asks the frontend to log in, the frontend redirects to the identity provider, the user signs in, the provider returns an authorization code, the backend exchanges the code for tokens and creates a session.',
  },
  {
    title: 'E-commerce schema',
    type: 'er',
    prompt:
      'Customers place many orders. Each order has many order items. Each order item references one product. Products belong to one category. Each order has one payment.',
  },
  {
    title: 'Order lifecycle',
    type: 'state',
    prompt:
      'An order starts as pending, becomes paid after payment succeeds, then shipped, then delivered. A pending or paid order can be cancelled. A delivered order can be returned.',
  },
  {
    title: 'Microservice domain',
    type: 'class',
    prompt:
      'A User has an id, email and name and can own many Projects. A Project has a name and many Diagrams. A Diagram has a title, a type and Mermaid source, and keeps many Versions.',
  },
  {
    title: 'Product launch plan',
    type: 'gantt',
    prompt:
      'Plan a six-week launch: two weeks of design, three weeks of development overlapping design by one week, one week of QA after development, and a launch day at the end.',
  },
];
