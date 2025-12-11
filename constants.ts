import { TeksTopic, User } from './types';

export const CURRICULUM: TeksTopic[] = [
  {
    id: 'topic-1',
    code: '5.2.B',
    title: 'Place Value & Decimals',
    description: 'Compare and order two decimals to thousandths and represent comparisons using >, <, or =.',
    category: 'Number',
  },
  {
    id: 'topic-2',
    code: '5.3.K',
    title: 'Adding & Subtracting Rational Numbers',
    description: 'Add and subtract positive rational numbers fluently.',
    category: 'Number',
  },
  {
    id: 'topic-3',
    code: '5.4.B',
    title: 'Algebraic Reasoning',
    description: 'Represent and solve multi-step problems involving the four operations with whole numbers.',
    category: 'Algebra',
  },
  {
    id: 'topic-4',
    code: '5.5.A',
    title: 'Geometry & 2D Figures',
    description: 'Classify two-dimensional figures in a hierarchy of sets and subsets using graphic organizers.',
    category: 'Geometry',
  },
  {
    id: 'topic-5',
    code: '5.9.C',
    title: 'Data Analysis',
    description: 'Solve one- and two-step problems using data from a frequency table, dot plot, bar graph, stem-and-leaf plot, or scatterplot.',
    category: 'Data',
  }
];

export const INITIAL_USER: User = {
  id: 'guest',
  username: 'Guest Learner',
  avatar: '🐿️',
  isGuest: true,
  progress: {},
  badges: [],
  settings: {
    soundEnabled: true,
    voiceEnabled: true,
    highContrast: false,
  }
};

export const BADGES = {
  FIRST_LESSON: '🌟 First Star',
  MATH_WIZARD: '🧙 Math Wizard',
  DECIMAL_DYNAMO: '💎 Decimal Dynamo',
  GEOMETRY_GENIUS: '📐 Geometry Genius'
};
