// ============================================================
//  VisualTheme —— 视觉常量（颜色 / 流向视觉 / 标签配色 / 字体 / 行情）
//  纯表现层数据，无状态、无 ctx。
// ============================================================
import type { Tag } from '../../data/GameDataTypes';

export const COLORS = {
  desk: '#2A2017', stackBg: '#31271A', deskBg: '#2E2315', trackBg: '#251D10',
  divider: '#1A1208', paper: '#D4C5A9', paperBack: '#C8B89A',
  brandRed: '#D32F2F', brandRedDark: '#B71C1C', gold: '#F9A825',
  ledBg: '#080C08', ledUp: '#00E676', ledDown: '#FF4444'
} as const;

export const FLOW_VISUAL: Record<string, { color: string; type: string }> = {
  flow_big_company:       { color: '#1565C0', type: 'corp' },
  flow_startup:           { color: '#E64A19', type: 'startup' },
  flow_romance:           { color: '#AD1457', type: 'romance' },
  flow_traffic:           { color: '#6A1B9A', type: 'viral' },
  flow_system:            { color: '#2E7D32', type: 'system' },
  flow_academia:          { color: '#3949AB', type: 'academia' },
  flow_overseas:          { color: '#0097A7', type: 'overseas' },
  flow_downshift:         { color: '#6D4C41', type: 'downshift' },
  flow_self_employed:     { color: '#00897B', type: 'indie' },
  flow_knowledge_economy: { color: '#F57C00', type: 'knowledge' }
};

export const FLOW_ORDER = [
  'flow_big_company', 'flow_startup', 'flow_romance', 'flow_traffic',
  'flow_system', 'flow_academia', 'flow_overseas', 'flow_downshift',
  'flow_self_employed', 'flow_knowledge_economy'
];

export const LABEL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  temporal:   { bg: '#FBE9E7', border: '#F4511E', text: '#BF360C' },
  capability: { bg: '#E3F2FD', border: '#1E88E5', text: '#0D47A1' },
  trait:      { bg: '#E8F5E9', border: '#43A047', text: '#1B5E20' },
  social:     { bg: '#F3E5F5', border: '#8E24AA', text: '#4A148C' },
  risk:       { bg: '#FFEBEE', border: '#E53935', text: '#B71C1C' },
  viral:      { bg: '#FCE4EC', border: '#F06292', text: '#880E4F' },
  hidden:     { bg: '#EEEEEE', border: '#9E9E9E', text: '#757575' },
  revealed:   { bg: '#FFCDD2', border: '#E53935', text: '#B71C1C' },
  revealedGood:{ bg: '#E8F5E9', border: '#43A047', text: '#1B5E20' }
};

const TEMPORAL_TAGS = new Set(['tag_young', 'tag_35plus', 'tag_45plus', 'tag_gen_z', 'tag_gap_year']);
const SOCIAL_TAGS = new Set(['tag_presentable', 'tag_family_readable', 'tag_visible_assets', 'tag_local_hukou', 'tag_party_member', 'tag_stable', 'tag_system_exp']);

/** 标签 → 配色类别（决定卡面标签颜色） */
export function tagType(tagsById: Record<string, Tag>, tagId: string): string {
  if (TEMPORAL_TAGS.has(tagId)) return 'temporal';
  if (SOCIAL_TAGS.has(tagId)) return 'social';
  const t = tagsById[tagId];
  if (!t) return 'capability';
  switch (t.uiTone) {
    case 'valuable': return 'capability';
    case 'risk': return 'risk';
    case 'strange': return 'viral';
    case 'normal': return 'trait';
    default: return 'capability';
  }
}

/** 状态栏 LED 滚动行情（纯装饰，硬编码，与基线一致） */
export const TICKER_ITEMS = [
  { name: '名校', d: +15 }, { name: '35+', d: -8 }, { name: '情绪稳定', d: +6 },
  { name: '维权意识强', d: -12 }, { name: '海归背景', d: +9 }, { name: '履历注水', d: -20 },
  { name: '争议感', d: +18 }, { name: '稳定', d: +3 }, { name: '空心人设', d: -14 }
];
