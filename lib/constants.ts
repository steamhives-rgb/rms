// ─────────────────────────────────────────────────────────────────
// STEAMhives RMS — Constants  (mirrors PHP constants.php)
// ─────────────────────────────────────────────────────────────────
import type { Plan, GradeScaleEntry } from './types';

// ── Plans ────────────────────────────────────────────────────────
export const PLANS: Record<string, Plan> = {
  '100-students': { limit: 100,  label: '100 Students' },
  '200-students': { limit: 200,  label: '200 Students' },
  'unlimited':    { limit: null, label: 'Unlimited' },
};

// ── Grade Scale ──────────────────────────────────────────────────
export const GRADE_SCALE: GradeScaleEntry[] = [
  { min: 75, grade: 'A1', remark: 'Excellent'  },
  { min: 70, grade: 'B2', remark: 'Very Good'  },
  { min: 65, grade: 'B3', remark: 'Good'       },
  { min: 60, grade: 'C4', remark: 'Credit'     },
  { min: 55, grade: 'C5', remark: 'Credit'     },
  { min: 50, grade: 'C6', remark: 'Credit'     },
  { min: 45, grade: 'D7', remark: 'Pass'       },
  { min: 40, grade: 'E8', remark: 'Pass'       },
  { min:  0, grade: 'F9', remark: 'Fail'       },
];

// ── Terms ────────────────────────────────────────────────────────
export const TERMS = ['1st Term', '2nd Term', '3rd Term'] as const;
export type Term = typeof TERMS[number];

// ── Class Map ────────────────────────────────────────────────────
export const CLASS_MAP: Record<string, string[]> = {
  'Pre-Basics':       ['Creche'],
  'Kindergarten':     ['Kindergarten', 'Kindergarten 1', 'Kindergarten 2'],
  'Nursery':          ['Nursery', 'Nursery 1', 'Nursery 2'],
  'Primary':          ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6'],
  'Grade':            ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'],
  'Basic':            ['Basic 1','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6','Basic 7','Basic 8','Basic 9'],
  'Junior Secondary': ['JSS 1','JSS 2','JSS 3'],
  'Senior Secondary': ['SS 1','SS 2','SS 3'],
};

// Flat list of all classes
export const ALL_CLASSES: string[] = Object.values(CLASS_MAP).flat();

// ── Promotion Map ────────────────────────────────────────────────
export const PROMOTION_MAP: Record<string, string> = {
  'Creche':         'Kindergarten 1',
  'Kindergarten 1': 'Kindergarten 2',
  'Kindergarten 2': 'Nursery 1',
  'Nursery 1':      'Nursery 2',
  'Nursery 2':      'Primary 1',
  'Primary 1':      'Primary 2',
  'Primary 2':      'Primary 3',
  'Primary 3':      'Primary 4',
  'Primary 4':      'Primary 5',
  'Primary 5':      'Primary 6',
  'Primary 6':      'JSS 1',
  'Basic 1':        'Basic 2',
  'Basic 2':        'Basic 3',
  'Basic 3':        'Basic 4',
  'Basic 4':        'Basic 5',
  'Basic 5':        'Basic 6',
  'Basic 6':        'Basic 7',
  'Basic 7':        'Basic 8',
  'Basic 8':        'Basic 9',
  'Basic 9':        'JSS 1',
  'Grade 1':        'Grade 2',
  'Grade 2':        'Grade 3',
  'Grade 3':        'Grade 4',
  'Grade 4':        'Grade 5',
  'Grade 5':        'Grade 6',
  'Grade 6':        'JSS 1',
  'JSS 1':          'JSS 2',
  'JSS 2':          'JSS 3',
  'JSS 3':          'SS 1',
  'SS 1':           'SS 2',
  'SS 2':           'SS 3',
};

// ── Session Config ───────────────────────────────────────────────
export const SESSION_TTL = parseInt(process.env.SESSION_TTL ?? '28800', 10); // 8 hours in seconds
export const LOG_ENABLED = process.env.NODE_ENV !== 'test';

// ── Teacher password charset ─────────────────────────────────────
export const TEACHER_PW_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
export const COUPON_CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PIN_CHARS         = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';