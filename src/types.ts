export interface SurveyData {
  email: string;
  name: string;
  program: string;
  yearGrad: string;
  contact: string;
  address: string;
  fbName: string;
  employment?: string;
  consent: "I Agree" | "I Disagree" | null;
  ratings: Record<string, number | null>;
  appreciate: string;
  improve: string;
  suggestions: string;
  alumniId: "Yes" | "No" | null;
  dob?: string;
  citizenship?: string;
  homeAddress?: string;
  primaryContact?: string;
  emergencyPerson?: string;
  emergencyContact?: string;
  relationship?: string;
  emergencyAddress?: string;
  esig?: string;
  esigType?: string;
  photo?: string;
  photoType?: string;
}

export interface AnalyticsData {
  total: number;
  programs: Record<string, number>;
  consent: Record<string, number>;
  alumni: Record<string, number>;
  avgRatings: Record<string, number>;
  ratingDist: Record<string, number>;
  recentResponses: Array<{
    ts: string;
    name: string;
    program: string;
    year: string;
    consent: string;
    alumni: string;
    avg: string;
  }>;
  appreciation: Array<{
    name: string;
    text: string;
  }>;
}
