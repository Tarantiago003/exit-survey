export const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyps9DMk56mrKiFyRvFoJ2fzip0eaC3njV_8F4pN58rPxl6y6vjLcJ3Q8FnYOkBiLNi/exec';
export const ADMIN_PASS = 'mvgfcES123';

export const PROGRAMS = [
  'BSN', 'BSCRIM', 'BSED-ENGLISH', 'BSED-FILIPINO', 
  'BSED-MATH', 'BSED-SCIENCE', 'BEED', 'BSIS', 
  'BSCS', 'BSBA-MM', 'BSBA-FM', 'Other'
];

export const RATING_QUESTIONS = [
  { id: 'r1', num: '1', text: 'Finance Office services and payment processing' },
  { id: 'r2', num: '2', text: "Registrar's Office assistance and graduation requirements" },
  { id: 'r3', num: '3', text: 'Clarity of graduation fees and procedures' },
  { id: 'r4', num: '4', text: 'Efficiency of clearance signing and requirement completion' },
  { id: 'r5', num: '5', text: 'Graduation photoshoot and attire arrangements' },
  { id: 'r6', num: '6', text: 'Venue comfort and event setup' },
  { id: 'r7', num: '7', text: 'Organization and flow of the graduation ceremony' },
  { id: 'r8', num: '8', text: 'Overall graduation experience at MVGFC' },
  { id: 'r9', num: '15', text: 'Overall flow and organization of the graduation program' },
];

export const SATISFACTION_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  "4": { emoji: '😄', label: 'Strongly Satisfied', color: 'bg-green-600' },
  "3": { emoji: '🙂', label: 'Satisfied', color: 'bg-green-500' },
  "2": { emoji: '😕', label: 'Dissatisfied', color: 'bg-amber-500' },
  "1": { emoji: '😞', label: 'Strongly Dissatisfied', color: 'bg-red-500' },
};
