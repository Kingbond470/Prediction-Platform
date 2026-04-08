// Static venue context — used to generate unique SEO content on each match preview page.
// Each venue entry produces a distinct paragraph so Google treats match pages as unique content.

export interface VenueInfo {
  capacity: string;
  pitchType: "batting" | "balanced" | "bowling" | "spin";
  pitchNote: string;       // one sentence describing pitch behaviour
  conditionsNote: string;  // weather/dew/time-of-day note relevant to IPL evening games
  avgFirstInningsScore: string;
}

export const VENUE_INFO: Record<string, VenueInfo> = {
  "Wankhede Stadium": {
    capacity: "33,000",
    pitchType: "batting",
    pitchNote:
      "Wankhede's surface is a batting paradise — the short square boundaries and flat pitch regularly produce totals above 180.",
    conditionsNote:
      "Sea breeze at the Marine Drive end offers pace bowlers some movement in the powerplay, but conditions ease as the evening progresses.",
    avgFirstInningsScore: "~175",
  },
  "MA Chidambaram Stadium": {
    capacity: "38,000",
    pitchType: "spin",
    pitchNote:
      "Chepauk is one of the most spin-friendly venues in the IPL — slow, low pitches that grip and turn from the first over.",
    conditionsNote:
      "High humidity and a slow outfield dampen the scoring rate; chasing teams often find the pitch tougher in the second innings.",
    avgFirstInningsScore: "~155",
  },
  "Eden Gardens": {
    capacity: "66,000",
    pitchType: "balanced",
    pitchNote:
      "Eden Gardens offers a balanced contest — pacers get help with the new ball while spinners come into play in the middle overs.",
    conditionsNote:
      "Heavy dew in the evening session is a major factor; chasing teams have a significant advantage as grip improves for batters.",
    avgFirstInningsScore: "~165",
  },
  "M Chinnaswamy Stadium": {
    capacity: "35,000",
    pitchType: "batting",
    pitchNote:
      "Chinnaswamy is the highest-scoring venue in the IPL — its small boundaries and true pitch have produced some of the biggest totals in T20 history.",
    conditionsNote:
      "The thin air at 920 m altitude makes the ball travel further; expect big shots and totals regularly crossing 200.",
    avgFirstInningsScore: "~185",
  },
  "Arun Jaitley Stadium": {
    capacity: "41,820",
    pitchType: "balanced",
    pitchNote:
      "Feroz Shah Kotla plays as a moderate batting surface early but slows down in the second innings, giving spinners more purchase.",
    conditionsNote:
      "Evening dew is common, aiding batters in the chase. Toss is often a key factor at this venue.",
    avgFirstInningsScore: "~165",
  },
  "Rajiv Gandhi Intl Cricket Stadium": {
    capacity: "55,000",
    pitchType: "batting",
    pitchNote:
      "Uppal's surface is generally good for batting with a true bounce, though seamers can extract movement with the new ball.",
    conditionsNote:
      "Conditions are usually comfortable for evening matches; dew rarely affects games significantly here.",
    avgFirstInningsScore: "~170",
  },
  "Narendra Modi Stadium": {
    capacity: "132,000",
    pitchType: "balanced",
    pitchNote:
      "The world's largest cricket stadium plays true — the pitch rewards good cricket from both departments but can assist spinners as the game progresses.",
    conditionsNote:
      "The vast outfield means boundaries require proper timing; expect slightly lower scores compared to smaller venues.",
    avgFirstInningsScore: "~163",
  },
  "Sawai Mansingh Stadium": {
    capacity: "30,000",
    pitchType: "batting",
    pitchNote:
      "Jaipur's pitch is generally batting-friendly with quick outfield, though it can offer some turn for spinners later in the match.",
    conditionsNote:
      "The dry desert air minimises dew, making this a more level playing field for both innings.",
    avgFirstInningsScore: "~168",
  },
  "BRSABV Ekana Cricket Stadium": {
    capacity: "50,000",
    pitchType: "balanced",
    pitchNote:
      "Ekana offers a fair contest between bat and ball — pacers get assistance early and spinners are effective in the middle overs.",
    conditionsNote:
      "Moderate dew in evening games; the toss can have a slight influence on the result.",
    avgFirstInningsScore: "~162",
  },
  "PCA Stadium": {
    capacity: "26,000",
    pitchType: "batting",
    pitchNote:
      "Mohali's surface is typically a good batting strip with enough pace in the pitch for strokeplay to flourish.",
    conditionsNote:
      "Cooler northern conditions reduce dew; both innings tend to play similarly making toss less influential.",
    avgFirstInningsScore: "~170",
  },
  "Himachal Pradesh Cricket Association Stadium": {
    capacity: "23,000",
    pitchType: "bowling",
    pitchNote:
      "Dharamsala's mountain setting offers pace and bounce — the ball swings in the cool Himalayan air and seamers dominate early overs.",
    conditionsNote:
      "The scenic venue plays at high altitude where the ball moves appreciably; lower scores than most IPL venues are common.",
    avgFirstInningsScore: "~155",
  },
  "Brabourne Stadium": {
    capacity: "20,000",
    pitchType: "batting",
    pitchNote:
      "Brabourne is a compact, batsman-friendly ground — its shorter boundaries and true pitch consistently produce high-scoring contests.",
    conditionsNote:
      "Sea breeze from Marine Lines provides some seam movement in the first few overs before conditions flatten out.",
    avgFirstInningsScore: "~172",
  },
};

export function getVenueInfo(venue: string): VenueInfo | null {
  return VENUE_INFO[venue] ?? null;
}
