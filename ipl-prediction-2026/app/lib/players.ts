// Key players per IPL team — used on match preview pages for SEO content.
// Update roster each season as squads change.

export interface TeamPlayers {
  bat: string[];   // top 3 batters to watch
  bowl: string[];  // top 3 bowlers to watch
}

export const TEAM_PLAYERS: Record<string, TeamPlayers> = {
  CSK: {
    bat:  ["Ruturaj Gaikwad", "Devon Conway", "MS Dhoni"],
    bowl: ["Ravindra Jadeja", "Matheesha Pathirana", "Tushar Deshpande"],
  },
  MI: {
    bat:  ["Rohit Sharma", "Suryakumar Yadav", "Tilak Varma"],
    bowl: ["Jasprit Bumrah", "Hardik Pandya", "Gerald Coetzee"],
  },
  RCB: {
    bat:  ["Virat Kohli", "Faf du Plessis", "Glenn Maxwell"],
    bowl: ["Mohammed Siraj", "Yuzvendra Chahal", "Alzarri Joseph"],
  },
  KKR: {
    bat:  ["Shreyas Iyer", "Rinku Singh", "Phil Salt"],
    bowl: ["Mitchell Starc", "Varun Chakravarthy", "Harshit Rana"],
  },
  DC: {
    bat:  ["David Warner", "Jake Fraser-McGurk", "Tristan Stubbs"],
    bowl: ["Axar Patel", "Kuldeep Yadav", "Anrich Nortje"],
  },
  SRH: {
    bat:  ["Heinrich Klaasen", "Travis Head", "Abhishek Sharma"],
    bowl: ["Pat Cummins", "Bhuvneshwar Kumar", "T Natarajan"],
  },
  PBKS: {
    bat:  ["Shikhar Dhawan", "Sam Curran", "Prabhsimran Singh"],
    bowl: ["Arshdeep Singh", "Kagiso Rabada", "Harshal Patel"],
  },
  RR: {
    bat:  ["Sanju Samson", "Jos Buttler", "Yashasvi Jaiswal"],
    bowl: ["Trent Boult", "Yuzvendra Chahal", "Ravichandran Ashwin"],
  },
  GT: {
    bat:  ["Shubman Gill", "David Miller", "B Sai Sudharsan"],
    bowl: ["Rashid Khan", "Mohammed Shami", "Noor Ahmad"],
  },
  LSG: {
    bat:  ["KL Rahul", "Quinton de Kock", "Nicholas Pooran"],
    bowl: ["Ravi Bishnoi", "Avesh Khan", "Mark Wood"],
  },
};

export function getTeamPlayers(team: string): TeamPlayers | null {
  return TEAM_PLAYERS[team] ?? null;
}
